from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user, require_patient_access
from app.models import AccessRole, PatientAccess, PatientProfile, User, UserRole
from app.schemas import AccessCreate, AccessOut, PatientProfileOut, PatientProfileUpdate, PatientSummary

router = APIRouter(prefix="/patients", tags=["Patients & Access"])


@router.get("", response_model=list[PatientSummary])
def list_accessible_patients(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role == UserRole.PATIENT:
        profile = db.get(PatientProfile, user.id)
        return [PatientSummary(id=user.id, full_name=user.full_name, email=user.email, role=user.role,
                               default_affected_side=profile.default_affected_side if profile else None)]
    if user.role == UserRole.ADMIN:
        patients = db.scalars(select(User).where(User.role == UserRole.PATIENT).order_by(User.full_name)).all()
        return [PatientSummary(id=p.id, full_name=p.full_name, email=p.email, role=p.role,
                               default_affected_side=(db.get(PatientProfile, p.id).default_affected_side if db.get(PatientProfile, p.id) else None)) for p in patients]
    rows = db.execute(
        select(User, PatientAccess.access_role, PatientProfile.default_affected_side)
        .join(PatientAccess, PatientAccess.patient_id == User.id)
        .outerjoin(PatientProfile, PatientProfile.user_id == User.id)
        .where(PatientAccess.accessor_id == user.id, User.role == UserRole.PATIENT)
        .order_by(User.full_name)
    ).all()
    return [PatientSummary(id=p.id, full_name=p.full_name, email=p.email, role=p.role,
                           access_role=access_role, default_affected_side=side) for p, access_role, side in rows]


@router.get("/me/profile", response_model=PatientProfileOut)
def get_my_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Profil ini hanya tersedia untuk akun pasien")
    profile = db.get(PatientProfile, user.id)
    if not profile:
        profile = PatientProfile(user_id=user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.patch("/me/profile", response_model=PatientProfileOut)
def update_my_profile(payload: PatientProfileUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Profil ini hanya tersedia untuk akun pasien")
    profile = db.get(PatientProfile, user.id)
    if not profile:
        profile = PatientProfile(user_id=user.id)
        db.add(profile)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    return profile


@router.post("/{patient_id}/access", response_model=AccessOut, status_code=status.HTTP_201_CREATED)
def grant_access(patient_id: int, payload: AccessCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != UserRole.ADMIN and not (user.role == UserRole.PATIENT and user.id == patient_id):
        raise HTTPException(status_code=403, detail="Hanya pasien yang bersangkutan yang dapat memberikan akses")
    patient = db.get(User, patient_id)
    if not patient or patient.role != UserRole.PATIENT:
        raise HTTPException(status_code=404, detail="Pasien tidak ditemukan")
    accessor = db.scalar(select(User).where(User.email == str(payload.email).lower().strip()))
    if not accessor:
        raise HTTPException(status_code=404, detail="Akun caregiver/dokter belum terdaftar")
    if accessor.id == patient.id:
        raise HTTPException(status_code=400, detail="Pasien tidak dapat memberikan akses ke dirinya sendiri")
    expected_role = UserRole.CAREGIVER if payload.access_role == AccessRole.CAREGIVER else UserRole.CLINICIAN
    if accessor.role != expected_role:
        raise HTTPException(status_code=400, detail=f"Akun tujuan harus memiliki role '{expected_role.value}'")
    record = PatientAccess(patient_id=patient_id, accessor_id=accessor.id, access_role=payload.access_role)
    db.add(record)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Akses untuk akun tersebut sudah diberikan")
    db.refresh(record)
    return AccessOut(id=record.id, accessor_id=accessor.id, email=accessor.email,
                     full_name=accessor.full_name, access_role=record.access_role, created_at=record.created_at)


@router.get("/{patient_id}/access", response_model=list[AccessOut])
def list_access(patient_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != UserRole.ADMIN and not (user.role == UserRole.PATIENT and user.id == patient_id):
        raise HTTPException(status_code=403, detail="Hanya pasien yang bersangkutan dapat mengelola daftar akses")
    require_patient_access(db, user, patient_id)
    rows = db.execute(
        select(PatientAccess, User).join(User, User.id == PatientAccess.accessor_id)
        .where(PatientAccess.patient_id == patient_id).order_by(User.full_name)
    ).all()
    return [AccessOut(id=access.id, accessor_id=person.id, email=person.email, full_name=person.full_name,
                      access_role=access.access_role, created_at=access.created_at) for access, person in rows]


@router.delete("/{patient_id}/access/{access_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_access(patient_id: int, access_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != UserRole.ADMIN and not (user.role == UserRole.PATIENT and user.id == patient_id):
        raise HTTPException(status_code=403, detail="Hanya pasien yang bersangkutan dapat mencabut akses")
    record = db.scalar(select(PatientAccess).where(PatientAccess.id == access_id, PatientAccess.patient_id == patient_id))
    if not record:
        raise HTTPException(status_code=404, detail="Relasi akses tidak ditemukan")
    db.delete(record)
    db.commit()
    return None
