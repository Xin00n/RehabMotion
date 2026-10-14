from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models import PatientProfile, User, UserRole
from app.schemas import AdminUserCreate, UserActiveUpdate, UserOut
from app.security import hash_password

router = APIRouter(prefix="/admin", tags=["Administration"])


@router.get("/users", response_model=list[UserOut])
def list_users(
    role: UserRole | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
):
    query = select(User).order_by(User.created_at.desc()).offset(offset).limit(limit)
    if role:
        query = query.where(User.role == role)
    return list(db.scalars(query).all())


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_staff_account(payload: AdminUserCreate, db: Session = Depends(get_db), admin: User = Depends(require_role(UserRole.ADMIN))):
    email = str(payload.email).lower().strip()
    if db.scalar(select(User.id).where(User.email == email)):
        raise HTTPException(status_code=409, detail="Email sudah terdaftar")
    user = User(email=email, full_name=payload.full_name.strip(), password_hash=hash_password(payload.password), role=UserRole(payload.role))
    db.add(user)
    try:
        db.flush()
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email sudah terdaftar")
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/active", response_model=UserOut)
def set_user_active(user_id: int, payload: UserActiveUpdate, db: Session = Depends(get_db), admin: User = Depends(require_role(UserRole.ADMIN))):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Akun tidak ditemukan")
    if user.id == admin.id and not payload.is_active:
        raise HTTPException(status_code=400, detail="Admin tidak dapat menonaktifkan akunnya sendiri")
    if user.is_active != payload.is_active:
        user.is_active = payload.is_active
        user.token_version += 1
    db.commit()
    db.refresh(user)
    return user
