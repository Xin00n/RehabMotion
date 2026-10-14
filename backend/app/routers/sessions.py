from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.dependencies import get_current_user, require_patient_access
from app.models import Exercise, Prescription, RehabSession, ROMMeasurement, SessionStatus, User, UserRole
from app.schemas import ROMMeasurementBatch, ROMMeasurementOut, SessionCreate, SessionFinish, SessionOut

router = APIRouter(tags=["Rehabilitation Sessions"])


def _load_session(db: Session, session_id: int) -> RehabSession | None:
    return db.scalar(select(RehabSession).options(joinedload(RehabSession.exercise)).where(RehabSession.id == session_id))


def _require_session_write_role(user: User) -> None:
    # Clinicians review sessions and prescribe exercises; patients/caregivers record the home session.
    if user.role == UserRole.CLINICIAN:
        raise HTTPException(status_code=403, detail="Akun klinisi hanya memiliki akses baca untuk sesi latihan")


@router.post("/sessions", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
def start_session(payload: SessionCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_session_write_role(user)
    patient_id = payload.patient_id or user.id
    if user.role == UserRole.PATIENT and patient_id != user.id:
        raise HTTPException(status_code=403, detail="Pasien hanya dapat memulai sesi untuk dirinya sendiri")
    require_patient_access(db, user, patient_id)
    exercise = db.get(Exercise, payload.exercise_id)
    if not exercise or not exercise.is_active:
        raise HTTPException(status_code=404, detail="Latihan tidak ditemukan")
    prescription = None
    if payload.prescription_id is not None:
        prescription = db.get(Prescription, payload.prescription_id)
        if not prescription or prescription.patient_id != patient_id:
            raise HTTPException(status_code=404, detail="Resep tidak ditemukan untuk pasien ini")
        if not prescription.is_active:
            raise HTTPException(status_code=422, detail="Resep latihan sudah tidak aktif")
        if prescription.exercise_id != payload.exercise_id:
            raise HTTPException(status_code=422, detail="Latihan tidak sesuai dengan resep")
        if prescription.affected_side.value != "both" and payload.affected_side != prescription.affected_side:
            raise HTTPException(status_code=422, detail="Sisi latihan tidak sesuai dengan resep")
    session = RehabSession(
        patient_id=patient_id,
        prescription_id=payload.prescription_id,
        exercise_id=payload.exercise_id,
        affected_side=payload.affected_side,
        notes=payload.notes,
    )
    db.add(session)
    db.commit()
    return _load_session(db, session.id)


@router.get("/patients/{patient_id}/sessions", response_model=list[SessionOut])
def list_sessions(
    patient_id: int,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    status_filter: SessionStatus | None = Query(default=None, alias="status"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_patient_access(db, user, patient_id)
    query = select(RehabSession).options(joinedload(RehabSession.exercise)).where(RehabSession.patient_id == patient_id)
    if status_filter:
        query = query.where(RehabSession.status == status_filter)
    query = query.order_by(RehabSession.started_at.desc()).offset(offset).limit(limit)
    return list(db.scalars(query).all())


@router.get("/sessions/{session_id}", response_model=SessionOut)
def get_session(session_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = _load_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesi latihan tidak ditemukan")
    require_patient_access(db, user, session.patient_id)
    return session


@router.post("/sessions/{session_id}/rom-measurements", response_model=list[ROMMeasurementOut], status_code=status.HTTP_201_CREATED)
def add_rom_measurements(session_id: int, payload: ROMMeasurementBatch, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_session_write_role(user)
    session = db.get(RehabSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesi latihan tidak ditemukan")
    require_patient_access(db, user, session.patient_id)
    if session.status != SessionStatus.IN_PROGRESS:
        raise HTTPException(status_code=409, detail="Metrik hanya dapat ditambahkan saat sesi masih berlangsung")
    now = datetime.now(timezone.utc)
    records = []
    for item in payload.measurements:
        measured_at = item.measured_at or now
        if measured_at.tzinfo is None:
            measured_at = measured_at.replace(tzinfo=timezone.utc)
        if session.affected_side.value != "both" and item.affected_side.value != session.affected_side.value:
            raise HTTPException(status_code=422, detail="Sisi metrik tidak sesuai dengan sesi")
        if measured_at > now and (measured_at - now).total_seconds() > 60:
            raise HTTPException(status_code=422, detail="Waktu pengukuran terlalu jauh di masa depan")
        records.append(ROMMeasurement(
            session_id=session_id,
            measured_at=measured_at,
            angle_deg=item.angle_deg,
            affected_side=item.affected_side,
            phase=item.phase,
            target_reached=item.target_reached,
        ))
    db.add_all(records)
    db.commit()
    for item in records:
        db.refresh(item)
    return records


@router.get("/sessions/{session_id}/rom-measurements", response_model=list[ROMMeasurementOut])
def get_rom_measurements(
    session_id: int,
    limit: int = Query(default=500, ge=1, le=2000),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.get(RehabSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesi latihan tidak ditemukan")
    require_patient_access(db, user, session.patient_id)
    return list(db.scalars(select(ROMMeasurement).where(ROMMeasurement.session_id == session_id)
                           .order_by(ROMMeasurement.measured_at).limit(limit)).all())


@router.post("/sessions/{session_id}/finish", response_model=SessionOut)
def finish_session(session_id: int, payload: SessionFinish, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_session_write_role(user)
    session = db.get(RehabSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesi latihan tidak ditemukan")
    require_patient_access(db, user, session.patient_id)
    if session.status != SessionStatus.IN_PROGRESS:
        raise HTTPException(status_code=409, detail="Sesi sudah selesai sebelumnya")
    ended_at = datetime.now(timezone.utc)
    started_at = session.started_at
    if started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=timezone.utc)
    session.ended_at = ended_at
    session.duration_seconds = max(0, int((ended_at - started_at).total_seconds()))
    session.status = payload.status
    session.total_repetitions = payload.total_repetitions
    session.successful_repetitions = payload.successful_repetitions
    session.average_peak_rom_deg = payload.average_peak_rom_deg
    session.maximum_peak_rom_deg = payload.maximum_peak_rom_deg
    session.stop_reason = payload.stop_reason
    if payload.notes is not None:
        session.notes = payload.notes
    db.commit()
    return _load_session(db, session.id)
