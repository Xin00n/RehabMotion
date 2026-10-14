from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas import PasswordChange, UserOut, UserProfileUpdate
from app.security import hash_password, verify_password

router = APIRouter(prefix="/users", tags=["User Management"])


@router.patch("/me", response_model=UserOut)
def update_my_account(payload: UserProfileUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user.full_name = payload.full_name.strip()
    if not user.full_name:
        raise HTTPException(status_code=422, detail="Nama lengkap wajib diisi")
    db.commit()
    db.refresh(user)
    return user


@router.post("/me/password", status_code=204)
def change_my_password(payload: PasswordChange, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Password saat ini salah")
    user.password_hash = hash_password(payload.new_password)
    user.token_version += 1  # invalidate all existing access tokens; log in again after changing password
    db.commit()
    return None
