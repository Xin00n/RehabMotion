from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator
from app.models import AccessRole, AffectedSide, SessionStatus, UserRole


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=10, max_length=128)
    role: Literal[UserRole.PATIENT, UserRole.CAREGIVER] = UserRole.PATIENT


class AdminUserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=10, max_length=128)
    role: Literal[UserRole.CAREGIVER, UserRole.CLINICIAN]


class UserProfileUpdate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=10, max_length=128)

    @model_validator(mode="before")
    @classmethod
    def handle_old_password_alias(cls, data):
        if isinstance(data, dict):
            if "current_password" not in data and "old_password" in data:
                data["current_password"] = data["old_password"]
        return data


class UserActiveUpdate(BaseModel):
    is_active: bool


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserOut(ORMModel):
    id: int
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class PatientProfileOut(ORMModel):
    id: int | None = None
    user_id: int
    full_name: str | None = None
    email: EmailStr | None = None
    default_affected_side: AffectedSide
    caregiver_notes: str | None = None
    updated_at: datetime

    @model_validator(mode="before")
    @classmethod
    def populate_patient_info(cls, data):
        if hasattr(data, "user_id"):
            res = {
                "id": getattr(data, "user_id"),
                "user_id": getattr(data, "user_id"),
                "default_affected_side": getattr(data, "default_affected_side", AffectedSide.BOTH),
                "caregiver_notes": getattr(data, "caregiver_notes", None),
                "updated_at": getattr(data, "updated_at", datetime.now()),
            }
            if hasattr(data, "user") and data.user:
                res["full_name"] = getattr(data.user, "full_name", None)
                res["email"] = getattr(data.user, "email", None)
            return res
        return data


class PatientProfileUpdate(BaseModel):
    default_affected_side: AffectedSide | None = None
    caregiver_notes: str | None = Field(default=None, max_length=2000)


class PatientSummary(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: UserRole
    access_role: AccessRole | None = None
    default_affected_side: AffectedSide | None = None


class AccessCreate(BaseModel):
    email: EmailStr
    access_role: AccessRole


class AccessOut(BaseModel):
    id: int
    accessor_id: int
    email: EmailStr
    full_name: str
    access_role: AccessRole
    created_at: datetime


class ExerciseOut(ORMModel):
    id: int
    code: str
    name: str
    primary_joint: str
    landmarks: dict[str, list[int]]
    rom_min_deg: float
    rom_max_deg: float
    description: str


class PrescriptionCreate(BaseModel):
    exercise_id: int | None = None
    exercise_name: str | None = None
    affected_side: AffectedSide
    target_rom_deg: float | None = Field(default=None, ge=0, le=180)
    target_rom: float | None = Field(default=None, ge=0, le=180)
    rom_margin_deg: float = Field(default=5, ge=0, le=30)
    hold_seconds: float = Field(default=0, ge=0, le=60)
    target_repetitions: int = Field(default=10, ge=1, le=200)
    starts_on: date = Field(default_factory=date.today)
    ends_on: date | None = None
    notes: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="before")
    @classmethod
    def handle_prescription_aliases(cls, data):
        if isinstance(data, dict):
            if "target_rom_deg" not in data or data.get("target_rom_deg") is None:
                if "target_rom" in data and data.get("target_rom") is not None:
                    data["target_rom_deg"] = data["target_rom"]
            # Map exercise_name to exercise_id if exercise_id is missing
            if ("exercise_id" not in data or not data.get("exercise_id")) and "exercise_name" in data:
                name = str(data.get("exercise_name", "")).lower()
                if "elbow" in name or "siku" in name:
                    data["exercise_id"] = 1
                elif "shoulder" in name or "bahu" in name:
                    data["exercise_id"] = 2
                elif "knee" in name or "lutut" in name:
                    data["exercise_id"] = 3
                else:
                    data["exercise_id"] = 1
        return data

    @model_validator(mode="after")
    def validate_dates(self):
        if self.exercise_id is None:
            raise ValueError("exercise_id wajib diisi")
        if self.target_rom_deg is None:
            raise ValueError("target_rom_deg wajib diisi")
        if self.ends_on and self.ends_on < self.starts_on:
            raise ValueError("ends_on tidak boleh sebelum starts_on")
        return self


class PrescriptionUpdate(BaseModel):
    affected_side: AffectedSide | None = None
    target_rom_deg: float | None = Field(default=None, ge=0, le=180)
    rom_margin_deg: float | None = Field(default=None, ge=0, le=30)
    hold_seconds: float | None = Field(default=None, ge=0, le=60)
    target_repetitions: int | None = Field(default=None, ge=1, le=200)
    starts_on: date | None = None
    ends_on: date | None = None
    notes: str | None = Field(default=None, max_length=2000)
    is_active: bool | None = None


class PrescriptionOut(ORMModel):
    id: int
    patient_id: int
    clinician_id: int
    exercise_id: int
    affected_side: AffectedSide
    target_rom_deg: float
    target_rom: float | None = None
    rom_margin_deg: float
    hold_seconds: float
    target_repetitions: int
    starts_on: date
    ends_on: date | None
    notes: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    exercise: ExerciseOut

    @model_validator(mode="after")
    def populate_target_rom(self):
        if self.target_rom is None and self.target_rom_deg is not None:
            self.target_rom = self.target_rom_deg
        return self


class SessionCreate(BaseModel):
    patient_id: int | None = None
    exercise_id: int
    prescription_id: int | None = None
    affected_side: AffectedSide
    notes: str | None = Field(default=None, max_length=2000)


class SessionFinish(BaseModel):
    status: Literal[SessionStatus.COMPLETED, SessionStatus.STOPPED] = SessionStatus.COMPLETED
    total_repetitions: int = Field(ge=0, le=2000)
    successful_repetitions: int = Field(ge=0, le=2000)
    average_peak_rom_deg: float | None = Field(default=None, ge=0, le=180)
    maximum_peak_rom_deg: float | None = Field(default=None, ge=0, le=180)
    stop_reason: str | None = Field(default=None, max_length=80)
    notes: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def validate_counts(self):
        if self.successful_repetitions > self.total_repetitions:
            raise ValueError("successful_repetitions tidak boleh lebih besar dari total_repetitions")
        if self.average_peak_rom_deg is not None and self.maximum_peak_rom_deg is not None:
            if self.average_peak_rom_deg > self.maximum_peak_rom_deg:
                raise ValueError("average_peak_rom_deg tidak boleh lebih besar dari maximum_peak_rom_deg")
        return self


class SessionOut(ORMModel):
    id: int
    patient_id: int
    prescription_id: int | None
    exercise_id: int
    affected_side: AffectedSide
    status: SessionStatus
    started_at: datetime
    ended_at: datetime | None
    duration_seconds: int | None
    total_repetitions: int
    successful_repetitions: int
    average_peak_rom_deg: float | None
    maximum_peak_rom_deg: float | None
    stop_reason: str | None
    notes: str | None
    exercise: ExerciseOut


class ROMMeasurementCreate(BaseModel):
    measured_at: datetime | None = None
    angle_deg: float = Field(ge=0, le=180)
    affected_side: AffectedSide
    phase: str = Field(default="moving", min_length=1, max_length=32)
    target_reached: bool = False


class ROMMeasurementBatch(BaseModel):
    measurements: list[ROMMeasurementCreate] = Field(min_length=1, max_length=500)


class ROMMeasurementOut(ORMModel):
    id: int
    session_id: int
    measured_at: datetime
    angle_deg: float
    affected_side: AffectedSide
    phase: str
    target_reached: bool


class AnalyticsSummary(BaseModel):
    patient_id: int
    period_days: int
    total_sessions: int
    completed_sessions: int
    stopped_sessions: int
    total_duration_seconds: int
    total_repetitions: int
    successful_repetitions: int
    adherence_percent: float
    average_peak_rom_deg: float | None
    best_peak_rom_deg: float | None


class ROMTrendPoint(BaseModel):
    date: date
    sessions_count: int
    average_peak_rom_deg: float | None
    best_peak_rom_deg: float | None
    successful_repetitions: int
