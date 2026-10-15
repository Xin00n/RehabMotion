from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user, require_patient_access
from app.models import AccessRole, AffectedSide, PatientAccess, PatientProfile, Prescription, RehabSession, SessionStatus, User, UserRole
from app.schemas import AccessCreate, AccessOut, PatientProfileOut, PatientProfileUpdate, PatientSummary

router = APIRouter(prefix="/patients", tags=["Patients & Access"])


def _build_patient_summary(
    db: Session,
    patient: User,
    access_role: AccessRole | None = None,
    side: AffectedSide | None = None,
    profile: PatientProfile | None = None,
) -> PatientSummary:
    if profile is None:
        profile = db.get(PatientProfile, patient.id)
    affected_side = side or (profile.default_affected_side if profile else None)

    rx_count = db.scalar(
        select(func.count(Prescription.id))
        .where(Prescription.patient_id == patient.id, Prescription.is_active == True)
    ) or 0

    last_session = db.scalar(
        select(RehabSession.started_at)
        .where(RehabSession.patient_id == patient.id)
        .order_by(RehabSession.started_at.desc())
        .limit(1)
    )

    total_sessions = db.scalar(
        select(func.count(RehabSession.id))
        .where(RehabSession.patient_id == patient.id)
    ) or 0

    completed_sessions = db.scalar(
        select(func.count(RehabSession.id))
        .where(RehabSession.patient_id == patient.id, RehabSession.status == SessionStatus.COMPLETED)
    ) or 0

    compliance_rate = round((completed_sessions / total_sessions * 100), 1) if total_sessions > 0 else None
    compliance_status = "good" if (compliance_rate is not None and compliance_rate >= 80) else (
        "moderate" if (compliance_rate is not None and compliance_rate >= 50) else "poor"
    )

    return PatientSummary(
        id=patient.id,
        full_name=patient.full_name,
        email=patient.email,
        role=patient.role,
        access_role=access_role,
        default_affected_side=affected_side,
        active_prescriptions_count=rx_count,
        last_session_at=last_session,
        compliance_rate=compliance_rate,
        compliance_status=compliance_status,
        notes=profile.caregiver_notes if profile else None,
    )


@router.get("", response_model=list[PatientSummary])
def list_accessible_patients(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role == UserRole.PATIENT:
        return [_build_patient_summary(db, user)]
    if user.role == UserRole.ADMIN:
        patients = db.scalars(select(User).where(User.role == UserRole.PATIENT).order_by(User.full_name)).all()
        return [_build_patient_summary(db, p) for p in patients]
    rows = db.execute(
        select(User, PatientAccess.access_role, PatientProfile.default_affected_side)
        .join(PatientAccess, PatientAccess.patient_id == User.id)
        .outerjoin(PatientProfile, PatientProfile.user_id == User.id)
        .where(PatientAccess.accessor_id == user.id, User.role == UserRole.PATIENT)
        .order_by(User.full_name)
    ).all()
    return [_build_patient_summary(db, p, access_role=access_role, side=side) for p, access_role, side in rows]


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
    data = payload.model_dump(exclude_unset=True)
    if "full_name" in data and data["full_name"]:
        user.full_name = data.pop("full_name").strip()
    if "notes" in data:
        notes_val = data.pop("notes")
        if "caregiver_notes" not in data or not data["caregiver_notes"]:
            profile.caregiver_notes = notes_val
    for key, value in data.items():
        if hasattr(profile, key):
            setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/{patient_id}", response_model=PatientSummary)
def get_patient_summary(patient_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_patient_access(db, user, patient_id)
    patient = db.get(User, patient_id)
    if not patient or patient.role != UserRole.PATIENT:
        raise HTTPException(status_code=404, detail="Pasien tidak ditemukan")
    return _build_patient_summary(db, patient)


@router.get("/{patient_id}/profile", response_model=PatientProfileOut)
def get_patient_profile(patient_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_patient_access(db, user, patient_id)
    patient = db.get(User, patient_id)
    if not patient or patient.role != UserRole.PATIENT:
        raise HTTPException(status_code=404, detail="Pasien tidak ditemukan")
    profile = db.get(PatientProfile, patient_id)
    if not profile:
        profile = PatientProfile(user_id=patient_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.patch("/{patient_id}/profile", response_model=PatientProfileOut)
def update_patient_profile(patient_id: int, payload: PatientProfileUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_patient_access(db, user, patient_id)
    patient = db.get(User, patient_id)
    if not patient or patient.role != UserRole.PATIENT:
        raise HTTPException(status_code=404, detail="Pasien tidak ditemukan")
    profile = db.get(PatientProfile, patient_id)
    if not profile:
        profile = PatientProfile(user_id=patient_id)
        db.add(profile)
    data = payload.model_dump(exclude_unset=True)
    if "full_name" in data and data["full_name"]:
        patient.full_name = data.pop("full_name").strip()
    if "notes" in data:
        notes_val = data.pop("notes")
        if "caregiver_notes" not in data or not data["caregiver_notes"]:
            profile.caregiver_notes = notes_val
    for key, value in data.items():
        if hasattr(profile, key):
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
        raise HTTPException(status_code=404, detail="Akun fisioterapis/dokter belum terdaftar")
    if accessor.id == patient.id:
        raise HTTPException(status_code=400, detail="Pasien tidak dapat memberikan akses ke dirinya sendiri")
    expected_role = UserRole.CLINICIAN
    if accessor.role != expected_role:
        raise HTTPException(status_code=400, detail="Akun tujuan harus merupakan akun fisioterapis / dokter ('clinician')")
    record = PatientAccess(patient_id=patient_id, accessor_id=accessor.id, access_role=AccessRole.CLINICIAN)
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
