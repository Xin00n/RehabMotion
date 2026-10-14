from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core import settings
from app.database import get_db
from app.routers import admin, analytics, auth, exercises, patients, prescriptions, reports, sessions, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Database schema is created by `alembic upgrade head`; do not mutate schema on app startup.
    yield


app = FastAPI(
    title=settings.app_name,
    description=(
        "Backend API untuk RehabMotion. Pose estimation dan kalkulasi sudut dilakukan di browser. "
        "API ini hanya menyimpan profil, resep, serta metrik latihan terstruktur; tidak menyediakan endpoint unggah video/frame."
    ),
    version="1.0.0",
    lifespan=lifespan,
    openapi_url=f"{settings.api_v1_prefix}/openapi.json",
    docs_url=f"{settings.api_v1_prefix}/docs",
    redoc_url=f"{settings.api_v1_prefix}/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

for route in (auth.router, users.router, admin.router, exercises.router, patients.router, prescriptions.router,
              sessions.router, analytics.router, reports.router):
    app.include_router(route, prefix=settings.api_v1_prefix)


@app.get("/healthz", tags=["System"])
def health_check():
    return {"status": "ok", "service": "rehabmotion-api"}


@app.get("/readyz", tags=["System"])
def readiness_check(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ready", "database": "connected"}
