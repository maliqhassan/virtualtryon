# syntax=docker/dockerfile:1
#
# Build context is the repo root (see docker-compose.yml's `backend`/
# `worker` services: context: ., dockerfile: backend/Dockerfile) — needed
# so this Dockerfile can reach root ai/ alongside backend/, to install it
# as a real package rather than resolve it via a runtime sys.path hack or
# a volume mount (see PROJECT_STATUS.md, Sprint 4 Stage 6).

FROM python:3.11-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1
WORKDIR /app

FROM base AS builder
RUN apt-get update && apt-get install -y --no-install-recommends build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*
COPY backend/requirements.txt .
RUN pip install --user -r requirements.txt
# The shared ai/ package ("virtualtryon-ai", exposing the `src` top-level
# module) — installed the same way in both the backend and worker images,
# so AIInferenceClient resolves identically in either (app/worker/
# inference_client_provider.py just does `from src.models... import`,
# no path manipulation). Copied in explicitly (not the whole ai/ tree —
# ai/models, ai/notebooks etc. aren't needed here and would bloat the
# build) before backend/'s own code, so this layer only rebuilds when
# ai/'s package contents actually change.
COPY ai/pyproject.toml ai/pyproject.toml
COPY ai/src ai/src
RUN pip install --user ./ai

FROM base AS runtime
# libgl1/libglib2.0-0: native libs OpenCV/MediaPipe need at import time even
# in "headless" mode (mirrors ai/Dockerfile's own apt-get line — see ADR 0007).
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 1000 appuser
COPY --from=builder /root/.local /home/appuser/.local
COPY backend/alembic ./alembic
COPY backend/alembic.ini .
COPY backend/app ./app
COPY backend/ai ./ai
# storage/uploads must exist (owned by appuser) before docker-compose's
# storage_uploads volume is first mounted here — Docker copies a fresh
# named volume's initial content/ownership from whatever the image
# already has at that path, so creating it after chown, not relying on
# app/main.py's own runtime mkdir, is what makes a brand-new volume
# writable by appuser instead of defaulting to root (found for real: the
# `backend`/`worker` services both got PermissionError on first boot
# before this line existed).
RUN mkdir -p /app/storage/uploads && chown -R appuser:appuser /app
USER appuser
ENV PATH=/home/appuser/.local/bin:$PATH

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
