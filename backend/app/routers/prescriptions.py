from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.dependencies import get_current_user, require_patient_access
from app.models import Exercise, Prescription, User, UserRole
from app.schemas import PrescriptionCreate, PrescriptionOut, PrescriptionUpdate

router = APIRouter(tags=["Prescriptions"])


@router.post("/patients/{patient_id}/prescriptions", response_model=PrescriptionOut, status_code=status.HTTP_201_CREATED)
def create_prescription(patient_id: int, payload: PrescriptionCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != UserRole.CLINICIAN and user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Hanya dokter/fisioterapis yang dapat membuat resep latihan")
    require_patient_access(db, user, patient_id)
    exercise = db.get(Exercise, payload.exercise_id)
    if not exercise or not exercise.is_active:
        raise HTTPException(status_code=404, detail="Latihan tidak ditemukan")
    if not exercise.rom_min_deg <= payload.target_rom_deg <= exercise.rom_max_deg:
        # Custom target can be used by a clinician, but flag out-of-library-range values to prevent typos.
        raise HTTPException(status_code=422, detail=f"Target ROM harus berada pada rentang latihan {exercise.rom_min_deg:g}°–{exercise.rom_max_deg:g}°")
    prescription = Prescription(
        patient_id=patient_id,
        clinician_id=user.id,
        exercise_id=payload.exercise_id,
        affected_side=payload.affected_side,
        target_rom_deg=payload.target_rom_deg,
        rom_margin_deg=payload.rom_margin_deg,
        hold_seconds=payload.hold_seconds,
        target_repetitions=payload.target_repetitions,
        starts_on=payload.starts_on,
        ends_on=payload.ends_on,
        notes=payload.notes,
    )
    db.add(prescription)
    db.commit()
    return db.scalar(select(Prescription).options(joinedload(Prescription.exercise)).where(Prescription.id == prescription.id))


@router.get("/patients/{patient_id}/prescriptions", response_model=list[PrescriptionOut])
def list_prescriptions(patient_id: int, active_only: bool = False, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_patient_access(db, user, patient_id)
    query = select(Prescription).options(joinedload(Prescription.exercise)).where(Prescription.patient_id == patient_id)
    if active_only:
        query = query.where(Prescription.is_active.is_(True))
    return list(db.scalars(query.order_by(Prescription.created_at.desc())).all())


@router.get("/prescriptions/{prescription_id}", response_model=PrescriptionOut)
def get_prescription(prescription_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.scalar(select(Prescription).options(joinedload(Prescription.exercise)).where(Prescription.id == prescription_id))
    if not item:
        raise HTTPException(status_code=404, detail="Resep tidak ditemukan")
    require_patient_access(db, user, item.patient_id)
    return item


@router.patch("/prescriptions/{prescription_id}", response_model=PrescriptionOut)
def update_prescription(prescription_id: int, payload: PrescriptionUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.get(Prescription, prescription_id)
    if not item:
        raise HTTPException(status_code=404, detail="Resep tidak ditemukan")
    if user.role not in (UserRole.CLINICIAN, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Hanya dokter/fisioterapis yang dapat mengubah resep")
    require_patient_access(db, user, item.patient_id)
    if user.role == UserRole.CLINICIAN and item.clinician_id != user.id:
        raise HTTPException(status_code=403, detail="Dokter hanya dapat mengubah resep yang dibuatnya")
    changes = payload.model_dump(exclude_unset=True)
    next_start = changes.get("starts_on", item.starts_on)
    next_end = changes.get("ends_on", item.ends_on)
    if next_end is not None and next_end < next_start:
        raise HTTPException(status_code=422, detail="ends_on tidak boleh sebelum starts_on")
    for key, value in changes.items():
        setattr(item, key, value)
    db.commit()
    return db.scalar(select(Prescription).options(joinedload(Prescription.exercise)).where(Prescription.id == item.id))
