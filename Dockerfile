# ==========================================
# Stage 1: Build Frontend (React + Vite + Tailwind)
# ==========================================
FROM node:22-bookworm-slim AS frontend-builder
WORKDIR /build

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Runtime Backend & Static Serving
# ==========================================
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    STATIC_DIR=/app/frontend_dist \
    DATABASE_URL=sqlite:////data/rehabmotion.db \
    APP_ENV=production \
    PORT=8080

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY backend/ /app/

# Copy compiled frontend from Stage 1
COPY --from=frontend-builder /build/dist /app/frontend_dist

# Copy startup entrypoint
COPY entrypoint.sh /app/entrypoint.sh

# Create /data directory for persistent SQLite database and set permissions
RUN mkdir -p /data \
    && useradd --create-home --uid 10001 appuser \
    && chmod +x /app/entrypoint.sh \
    && chown -R appuser:appuser /app /data

USER appuser

EXPOSE 8080

ENTRYPOINT ["/app/entrypoint.sh"]
