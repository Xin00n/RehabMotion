from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session
import jwt
from app.database import get_db
from app.models import PatientAccess, User, UserRole
from app.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    token: str | None = Query(None),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token tidak valid atau belum diberikan",
        headers={"WWW-Authenticate": "Bearer"},
    )
    raw_token = credentials.credentials if credentials else token
    if not raw_token:
        raise unauthorized
    try:
        payload = decode_access_token(raw_token)
        user_id = int(payload.get("sub", ""))
        token_version = int(payload.get("ver", 0))
    except (jwt.PyJWTError, TypeError, ValueError):
        raise unauthorized
    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise unauthorized
    if token_version != user.token_version:
        raise unauthorized
    return user


def require_role(*roles: UserRole):
    def role_dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Role tidak memiliki izin untuk tindakan ini")
        return user
    return role_dependency


def can_access_patient(db: Session, user: User, patient_id: int) -> bool:
    if user.role == UserRole.ADMIN or (user.role == UserRole.PATIENT and user.id == patient_id):
        return True
    access = db.scalar(
        select(PatientAccess.id).where(
            PatientAccess.patient_id == patient_id,
            PatientAccess.accessor_id == user.id,
        )
    )
    return access is not None


def require_patient_access(db: Session, user: User, patient_id: int) -> None:
    patient = db.get(User, patient_id)
    if not patient or patient.role != UserRole.PATIENT:
        raise HTTPException(status_code=404, detail="Pasien tidak ditemukan")
    if not can_access_patient(db, user, patient_id):
        raise HTTPException(status_code=403, detail="Anda tidak memiliki akses ke data pasien ini")
