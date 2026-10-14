from datetime import date
from sqlalchemy import select
from app.database import SessionLocal
from app.models import AccessRole, AffectedSide, Exercise, PatientAccess, PatientProfile, Prescription, User, UserRole
from app.security import hash_password

EXERCISES = [
    {
        "code": "elbow-flexion",
        "name": "Elbow Flexion",
        "primary_joint": "Elbow",
        "landmarks": {"left": [11, 13, 15], "right": [12, 14, 16]},
        "rom_min_deg": 40.0,
        "rom_max_deg": 135.0,
        "description": "Latihan fleksi siku menggunakan titik bahu, siku, dan pergelangan tangan. Nilai ROM target untuk pasien harus ditentukan tenaga kesehatan.",
    },
    {
        "code": "shoulder-abduction",
        "name": "Shoulder Abduction",
        "primary_joint": "Shoulder",
        "landmarks": {"left": [23, 11, 13], "right": [24, 12, 14]},
        "rom_min_deg": 0.0,
        "rom_max_deg": 90.0,
        "description": "Latihan abduksi bahu menggunakan titik pinggul, bahu, dan siku. Target awal mengikuti PRD dan perlu disesuaikan resep klinis.",
    },
    {
        "code": "seated-knee-extension",
        "name": "Seated Knee Extension",
        "primary_joint": "Knee",
        "landmarks": {"left": [23, 25, 27], "right": [24, 26, 28]},
        "rom_min_deg": 90.0,
        "rom_max_deg": 160.0,
        "description": "Latihan ekstensi lutut sambil duduk menggunakan titik pinggul, lutut, dan pergelangan kaki. Target ROM mengikuti resep klinis.",
    },
]


def seed_exercises() -> None:
    with SessionLocal() as db:
        for item in EXERCISES:
            existing = db.scalar(select(Exercise).where(Exercise.code == item["code"]))
            if existing:
                for key, value in item.items():
                    setattr(existing, key, value)
            else:
                db.add(Exercise(**item))
        db.commit()


def seed_demo_users() -> None:
    demo_users = [
        {
            "email": "pasien@rehabmotion.id",
            "full_name": "Budi Santoso (Pasien)",
            "role": UserRole.PATIENT,
            "password": "password123",
        },
        {
            "email": "caregiver@rehabmotion.id",
            "full_name": "Siti Rahma (Caregiver)",
            "role": UserRole.CAREGIVER,
            "password": "password123",
        },
        {
            "email": "dokter@rehabmotion.id",
            "full_name": "dr. Andi Pratama, Sp.KFR",
            "role": UserRole.CLINICIAN,
            "password": "password123",
        },
        {
            "email": "jarjit@gmail.com",
            "full_name": "Jarjit Singh",
            "role": UserRole.PATIENT,
            "password": "password123",
        },
    ]

    with SessionLocal() as db:
        user_map = {}
        for item in demo_users:
            user = db.scalar(select(User).where(User.email == item["email"]))
            if user:
                user.password_hash = hash_password(item["password"])
                user.is_active = True
                user.token_version = 0
            else:
                user = User(
                    email=item["email"],
                    full_name=item["full_name"],
                    password_hash=hash_password(item["password"]),
                    role=item["role"],
                    is_active=True,
                    token_version=0,
                )
                db.add(user)
                db.flush()
            user_map[item["email"]] = user

            if user.role == UserRole.PATIENT:
                profile = db.get(PatientProfile, user.id)
                if not profile:
                    db.add(PatientProfile(user_id=user.id, default_affected_side=AffectedSide.RIGHT))

        db.commit()

        pasien = user_map.get("pasien@rehabmotion.id")
        jarjit = user_map.get("jarjit@gmail.com")
        caregiver = user_map.get("caregiver@rehabmotion.id")
        dokter = user_map.get("dokter@rehabmotion.id")

        for patient_obj in [pasien, jarjit]:
            if not patient_obj:
                continue
            if caregiver:
                has_access = db.scalar(
                    select(PatientAccess).where(
                        PatientAccess.patient_id == patient_obj.id,
                        PatientAccess.accessor_id == caregiver.id,
                    )
                )
                if not has_access:
                    db.add(PatientAccess(patient_id=patient_obj.id, accessor_id=caregiver.id, access_role=AccessRole.CAREGIVER))

            if dokter:
                has_access = db.scalar(
                    select(PatientAccess).where(
                        PatientAccess.patient_id == patient_obj.id,
                        PatientAccess.accessor_id == dokter.id,
                    )
                )
                if not has_access:
                    db.add(PatientAccess(patient_id=patient_obj.id, accessor_id=dokter.id, access_role=AccessRole.CLINICIAN))

        exercise = db.scalar(select(Exercise).where(Exercise.code == "elbow-flexion"))
        if exercise and dokter:
            for patient_obj in [pasien, jarjit]:
                if not patient_obj:
                    continue
                rx = db.scalar(select(Prescription).where(Prescription.patient_id == patient_obj.id, Prescription.is_active == True))
                if not rx:
                    db.add(
                        Prescription(
                            patient_id=patient_obj.id,
                            clinician_id=dokter.id,
                            exercise_id=exercise.id,
                            affected_side=AffectedSide.RIGHT,
                            target_rom_deg=90.0,
                            rom_margin_deg=10.0,
                            hold_seconds=2.0,
                            target_repetitions=10,
                            starts_on=date.today(),
                            notes="Latihan fleksi siku mandiri teratur.",
                            is_active=True,
                        )
                    )
        db.commit()


if __name__ == "__main__":
    seed_exercises()
    seed_demo_users()
    print("Exercise library and demo users seeded.")

