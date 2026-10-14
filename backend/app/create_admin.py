"""Create or update an admin account from environment variables.
Required: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FULL_NAME.
"""
import os
from sqlalchemy import select
from app.database import SessionLocal
from app.models import User, UserRole
from app.security import hash_password


def main() -> None:
    email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    password = os.environ.get("ADMIN_PASSWORD", "")
    full_name = os.environ.get("ADMIN_FULL_NAME", "RehabMotion Admin").strip()
    if not email or len(password) < 10:
        raise SystemExit("Set ADMIN_EMAIL and ADMIN_PASSWORD (minimum 10 characters) first.")
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        if user:
            user.role = UserRole.ADMIN
            user.password_hash = hash_password(password)
            user.full_name = full_name
            user.is_active = True
        else:
            user = User(email=email, full_name=full_name, password_hash=hash_password(password), role=UserRole.ADMIN)
            db.add(user)
        db.commit()
    print(f"Admin account ready: {email}")


if __name__ == "__main__":
    main()
