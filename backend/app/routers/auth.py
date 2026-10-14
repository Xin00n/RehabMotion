from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models import PatientProfile, User, UserRole
from app.schemas import LoginRequest, RegisterRequest, TokenResponse, UserOut
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    email = str(payload.email).lower().strip()
    if db.scalar(select(User.id).where(User.email == email)):
        raise HTTPException(status_code=409, detail="Email sudah terdaftar")
    user = User(
        email=email,
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
        role=UserRole(payload.role),
    )
    db.add(user)
    db.flush()
    if user.role == UserRole.PATIENT:
        db.add(PatientProfile(user_id=user.id))
    db.commit()
    db.refresh(user)
    return TokenResponse(access_token=create_access_token(str(user.id), user.token_version), user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    email = str(payload.email).lower().strip()
    user = db.scalar(select(User).where(User.email == email))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email atau password salah", headers={"WWW-Authenticate": "Bearer"})
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Akun dinonaktifkan")
    return TokenResponse(access_token=create_access_token(str(user.id), user.token_version), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
