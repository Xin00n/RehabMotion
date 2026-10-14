import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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
    expose_headers=["Content-Disposition"],
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


# Single-Page Application (SPA) Static Files Serving
_default_static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
STATIC_DIR = os.getenv("STATIC_DIR", _default_static_dir)

if os.path.isdir(STATIC_DIR) and os.path.isfile(os.path.join(STATIC_DIR, "index.html")):
    assets_dir = os.path.join(STATIC_DIR, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/", include_in_schema=False)
    async def serve_index():
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path == "healthz" or full_path == "readyz":
            raise HTTPException(status_code=404, detail="Not Found")
        candidate_file = os.path.join(STATIC_DIR, full_path)
        if full_path and os.path.isfile(candidate_file):
            return FileResponse(candidate_file)
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))

