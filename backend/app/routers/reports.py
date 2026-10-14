from datetime import date, datetime, time, timedelta, timezone
from io import BytesIO
from xml.sax.saxutils import escape
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.dependencies import get_current_user, require_patient_access
from app.models import RehabSession, User

router = APIRouter(tags=["Reports"])


@router.get("/patients/{patient_id}/reports/sessions.pdf")
def export_sessions_pdf(
    patient_id: int,
    start_date: date | None = None,
    end_date: date | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_patient_access(db, user, patient_id)
    patient = db.get(User, patient_id)
    query = select(RehabSession).options(joinedload(RehabSession.exercise)).where(RehabSession.patient_id == patient_id)
    if start_date:
        query = query.where(RehabSession.started_at >= datetime.combine(start_date, time.min, tzinfo=timezone.utc))
    if end_date:
        query = query.where(RehabSession.started_at < datetime.combine(end_date + timedelta(days=1), time.min, tzinfo=timezone.utc))
    sessions = db.scalars(query.order_by(RehabSession.started_at.desc()).limit(2000)).all()

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4), rightMargin=14*mm, leftMargin=14*mm,
                            topMargin=14*mm, bottomMargin=14*mm, title="RehabMotion - Laporan Latihan")
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="ReportTitle", parent=styles["Title"], alignment=TA_CENTER, fontSize=18, leading=22))
    styles.add(ParagraphStyle(name="SmallCell", parent=styles["BodyText"], fontSize=7, leading=8))
    story = [
        Paragraph("RehabMotion — Laporan Riwayat Latihan", styles["ReportTitle"]),
        Spacer(1, 5*mm),
        Paragraph(f"Pasien: {escape(patient.full_name)} ({escape(patient.email)})", styles["Normal"]),
        Paragraph(f"Periode: {start_date or 'awal riwayat'} sampai {end_date or 'hari ini'}", styles["Normal"]),
        Paragraph(f"Dibuat: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}", styles["Normal"]),
        Spacer(1, 4*mm),
    ]
    headers = ["ID", "Tanggal", "Latihan", "Sisi", "Status", "Durasi (detik)", "Repetisi sukses/total", "Rata-rata ROM", "ROM puncak", "Alasan berhenti"]
    data = [headers]
    for s in sessions:
        started = s.started_at
        if started.tzinfo is None:
            started = started.replace(tzinfo=timezone.utc)
        data.append([
            str(s.id), started.strftime("%Y-%m-%d %H:%M"), s.exercise.name, s.affected_side.value,
            s.status.value, str(s.duration_seconds or 0), f"{s.successful_repetitions}/{s.total_repetitions}",
            f"{s.average_peak_rom_deg:.1f}°" if s.average_peak_rom_deg is not None else "—",
            f"{s.maximum_peak_rom_deg:.1f}°" if s.maximum_peak_rom_deg is not None else "—",
            s.stop_reason or "—",
        ])
    if len(data) == 1:
        data.append(["—", "—", "Belum ada sesi latihan pada periode ini", "—", "—", "—", "—", "—", "—", "—"])
    table = Table(data, repeatRows=1, colWidths=[12*mm, 27*mm, 38*mm, 15*mm, 22*mm, 23*mm, 30*mm, 22*mm, 22*mm, 32*mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E3A5F")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 7),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#CBD5E1")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F4F7FB")]),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.extend([table, Spacer(1, 5*mm), Paragraph(
        "Catatan: Laporan ini merangkum metrik latihan yang dicatat oleh aplikasi dan bukan alat diagnosis atau pengganti penilaian dokter/fisioterapis.",
        styles["Italic"],
    )])
    doc.build(story)
    buffer.seek(0)
    filename = f"rehabmotion-pasien-{patient_id}-{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{filename}"'})
