from sqlalchemy import select
from app.database import SessionLocal
from app.models import Exercise

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


if __name__ == "__main__":
    seed_exercises()
    print("Exercise library seeded.")
