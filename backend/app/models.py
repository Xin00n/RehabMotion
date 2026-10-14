from datetime import date, datetime, timezone
from enum import Enum
from sqlalchemy import (
    Boolean, Date, DateTime, Enum as SAEnum, Float, ForeignKey, Index, Integer,
    JSON, String, Text, UniqueConstraint, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UserRole(str, Enum):
    PATIENT = "patient"
    CAREGIVER = "caregiver"
    CLINICIAN = "clinician"
    ADMIN = "admin"


class AffectedSide(str, Enum):
    LEFT = "left"
    RIGHT = "right"
    BOTH = "both"


class SessionStatus(str, Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    STOPPED = "stopped"


class AccessRole(str, Enum):
    CAREGIVER = "caregiver"
    CLINICIAN = "clinician"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole, native_enum=False, length=20), nullable=False, default=UserRole.PATIENT)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    token_version: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False)

    patient_profile: Mapped["PatientProfile | None"] = relationship(back_populates="user", cascade="all, delete-orphan", uselist=False)


class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    default_affected_side: Mapped[AffectedSide] = mapped_column(SAEnum(AffectedSide, native_enum=False, length=12), default=AffectedSide.BOTH, nullable=False)
    caregiver_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    user: Mapped[User] = relationship(back_populates="patient_profile")


class PatientAccess(Base):
    __tablename__ = "patient_access"
    __table_args__ = (UniqueConstraint("patient_id", "accessor_id", name="uq_patient_access_pair"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    accessor_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    access_role: Mapped[AccessRole] = mapped_column(SAEnum(AccessRole, native_enum=False, length=12), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)


class Exercise(Base):
    __tablename__ = "exercises"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    primary_joint: Mapped[str] = mapped_column(String(60), nullable=False)
    landmarks: Mapped[dict[str, list[int]]] = mapped_column(JSON, nullable=False)
    rom_min_deg: Mapped[float] = mapped_column(Float, nullable=False)
    rom_max_deg: Mapped[float] = mapped_column(Float, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Prescription(Base):
    __tablename__ = "prescriptions"
    __table_args__ = (Index("ix_prescription_patient_active", "patient_id", "is_active"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    clinician_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercises.id", ondelete="RESTRICT"), nullable=False)
    affected_side: Mapped[AffectedSide] = mapped_column(SAEnum(AffectedSide, native_enum=False, length=12), nullable=False)
    target_rom_deg: Mapped[float] = mapped_column(Float, nullable=False)
    rom_margin_deg: Mapped[float] = mapped_column(Float, default=5.0, nullable=False)
    hold_seconds: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    target_repetitions: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    starts_on: Mapped[date] = mapped_column(Date, nullable=False)
    ends_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    exercise: Mapped[Exercise] = relationship()


class RehabSession(Base):
    __tablename__ = "rehab_sessions"
    __table_args__ = (
        Index("ix_session_patient_started", "patient_id", "started_at"),
        Index("ix_session_patient_status", "patient_id", "status"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    prescription_id: Mapped[int | None] = mapped_column(ForeignKey("prescriptions.id", ondelete="SET NULL"), nullable=True)
    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercises.id", ondelete="RESTRICT"), nullable=False)
    affected_side: Mapped[AffectedSide] = mapped_column(SAEnum(AffectedSide, native_enum=False, length=12), nullable=False)
    status: Mapped[SessionStatus] = mapped_column(SAEnum(SessionStatus, native_enum=False, length=20), default=SessionStatus.IN_PROGRESS, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_repetitions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    successful_repetitions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    average_peak_rom_deg: Mapped[float | None] = mapped_column(Float, nullable=True)
    maximum_peak_rom_deg: Mapped[float | None] = mapped_column(Float, nullable=True)
    stop_reason: Mapped[str | None] = mapped_column(String(80), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    exercise: Mapped[Exercise] = relationship()
    measurements: Mapped[list["ROMMeasurement"]] = relationship(back_populates="session", cascade="all, delete-orphan")


class ROMMeasurement(Base):
    __tablename__ = "rom_measurements"
    __table_args__ = (Index("ix_rom_session_time", "session_id", "measured_at"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("rehab_sessions.id", ondelete="CASCADE"), nullable=False)
    measured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    angle_deg: Mapped[float] = mapped_column(Float, nullable=False)
    affected_side: Mapped[AffectedSide] = mapped_column(SAEnum(AffectedSide, native_enum=False, length=12), nullable=False)
    phase: Mapped[str] = mapped_column(String(32), default="moving", nullable=False)
    target_reached: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    session: Mapped[RehabSession] = relationship(back_populates="measurements")
