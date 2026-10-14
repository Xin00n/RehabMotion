from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Exercise
from app.schemas import ExerciseOut

router = APIRouter(prefix="/exercises", tags=["Exercise Library"])


@router.get("", response_model=list[ExerciseOut])
def list_exercises(db: Session = Depends(get_db)):
    return list(db.scalars(select(Exercise).where(Exercise.is_active.is_(True)).order_by(Exercise.id)).all())


@router.get("/{exercise_id}", response_model=ExerciseOut)
def get_exercise(exercise_id: int, db: Session = Depends(get_db)):
    exercise = db.get(Exercise, exercise_id)
    if not exercise or not exercise.is_active:
        raise HTTPException(status_code=404, detail="Latihan tidak ditemukan")
    return exercise
