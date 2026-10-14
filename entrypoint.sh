#!/bin/sh
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Seeding initial exercises..."
python -m app.seed

if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
    echo "Configuring admin account..."
    python -m app.create_admin || true
fi

echo "Starting RehabMotion unified server on port ${PORT:-8080}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8080}" --workers 1
