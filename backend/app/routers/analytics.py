from datetime import date, datetime, time, timedelta, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.dependencies import get_current_user, require_patient_access
from app.models import Prescription, RehabSession, SessionStatus, User
from app.schemas import AnalyticsSummary, ROMTrendPoint

router = APIRouter(tags=["Analytics"])


def _aware_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


@router.get("/patients/{patient_id}/analytics/summary", response_model=AnalyticsSummary)
def get_summary(
    patient_id: int,
    days: int = Query(default=30, ge=1, le=365),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_patient_access(db, user, patient_id)
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    sessions = db.scalars(select(RehabSession).where(
        RehabSession.patient_id == patient_id,
        RehabSession.started_at >= cutoff,
    )).all()
    completed = [s for s in sessions if s.status == SessionStatus.COMPLETED]
    stopped = [s for s in sessions if s.status == SessionStatus.STOPPED]
    total_reps = sum(s.total_repetitions for s in sessions)
    successful = sum(s.successful_repetitions for s in sessions)
    peak_values = [s.average_peak_rom_deg for s in completed if s.average_peak_rom_deg is not None]
    max_values = [s.maximum_peak_rom_deg for s in completed if s.maximum_peak_rom_deg is not None]
    adherence = round(successful / total_reps * 100, 2) if total_reps else 0.0
    return AnalyticsSummary(
        patient_id=patient_id,
        period_days=days,
        total_sessions=len(sessions),
        completed_sessions=len(completed),
        stopped_sessions=len(stopped),
        total_duration_seconds=sum(s.duration_seconds or 0 for s in sessions),
        total_repetitions=total_reps,
        successful_repetitions=successful,
        adherence_percent=adherence,
        average_peak_rom_deg=round(sum(peak_values) / len(peak_values), 2) if peak_values else None,
        best_peak_rom_deg=max(max_values) if max_values else None,
    )


@router.get("/patients/{patient_id}/analytics/rom-trend", response_model=list[ROMTrendPoint])
def get_rom_trend(
    patient_id: int,
    start_date: date | None = None,
    end_date: date | None = None,
    exercise_id: int | None = Query(default=None, ge=1),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_patient_access(db, user, patient_id)
    query = select(RehabSession).options(joinedload(RehabSession.exercise)).where(
        RehabSession.patient_id == patient_id,
        RehabSession.status != SessionStatus.IN_PROGRESS,
    )
    if start_date:
        query = query.where(RehabSession.started_at >= datetime.combine(start_date, time.min, tzinfo=timezone.utc))
    if end_date:
        query = query.where(RehabSession.started_at < datetime.combine(end_date + timedelta(days=1), time.min, tzinfo=timezone.utc))
    if exercise_id:
        query = query.where(RehabSession.exercise_id == exercise_id)
    sessions = db.scalars(query.order_by(RehabSession.started_at.asc()).limit(5000)).all()

    target_rom = None
    if exercise_id:
        rx = db.scalar(select(Prescription).where(Prescription.patient_id == patient_id, Prescription.exercise_id == exercise_id, Prescription.is_active == True))
        if rx:
            target_rom = rx.target_rom_deg
    if target_rom is None:
        rx = db.scalar(select(Prescription).where(Prescription.patient_id == patient_id, Prescription.is_active == True).order_by(Prescription.created_at.desc()))
        if rx:
            target_rom = rx.target_rom_deg

    grouped: dict[date, list[RehabSession]] = {}
    for s in sessions:
        grouped.setdefault(_aware_utc(s.started_at).date(), []).append(s)
    response = []
    for day, day_sessions in sorted(grouped.items()):
        average_peaks = [s.average_peak_rom_deg for s in day_sessions if s.average_peak_rom_deg is not None]
        max_peaks = [s.maximum_peak_rom_deg for s in day_sessions if s.maximum_peak_rom_deg is not None]
        avg_rom_val = round(sum(average_peaks) / len(average_peaks), 2) if average_peaks else 0.0
        best_peak = max(max_peaks) if max_peaks else None
        ex_name = day_sessions[0].exercise.name if day_sessions[0].exercise else None
        response.append(ROMTrendPoint(
            date=day,
            sessions_count=len(day_sessions),
            average_peak_rom_deg=avg_rom_val,
            avg_rom=avg_rom_val,
            best_peak_rom_deg=best_peak,
            max_rom=best_peak,
            target_rom=target_rom,
            successful_repetitions=sum(s.successful_repetitions for s in day_sessions),
            exercise_name=ex_name,
        ))
    return response
