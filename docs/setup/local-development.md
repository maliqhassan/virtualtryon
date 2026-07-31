# Local Development Setup

## Prerequisites

| Tool | Used for | Verified on this machine? |
|---|---|---|
| Node.js 24.x + npm | frontend | ✅ (v24.14.1) |
| Python 3.11+ | backend, ai | ❌ not installed — see below |
| Docker Desktop (with Compose v2) | postgres, redis, backend, ai | ❌ not installed — see below |
| Git | version control | ✅ (2.53.0) |

This foundation was scaffolded on a machine without Python or Docker CLIs
available, so the backend/ai setup below is written and configured but
**not yet executed or verified**. Run it once those tools are installed and
report back if anything doesn't match.

## Frontend

```sh
cd frontend
cp .env.example .env
npm install        # already done during scaffolding; re-run after pulling changes
npm start           # then press i / a / w, or scan the QR code with Expo Go
```

## Backend

```sh
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
cp .env.example .env            # then fill in DATABASE_URL/REDIS_URL if not using Docker for them
alembic upgrade head              # applies migrations (none exist yet — this is a no-op until the first model)
uvicorn app.main:app --reload
```

Visit `http://localhost:8000/health` and `http://localhost:8000/api/v1/docs`.

**MediaPipe analysis endpoint** (`POST /api/v1/ai/mediapipe/analyze`, ADR
0007): on first use, `MediaPipeService` downloads ~30MB of `.task` model
bundles from `storage.googleapis.com` into `MEDIAPIPE_MODEL_DIR`
(`backend/.mediapipe_models/` by default, gitignored) — needs outbound
internet access once; cached after that. No `HF_TOKEN` or other credential
needed, unlike `ai/`'s Hugging Face model weights.

## AI service

```sh
cd ai
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements-dev.txt   # CPU wheels; see requirements.txt header for GPU builds
cp .env.example .env
```

No runnable entrypoint yet (`src/inference/` is a placeholder) — this
installs dependencies and validates the environment only.

## Everything via Docker Compose

```sh
cp .env.example .env
docker compose up postgres redis backend     # everyday backend dev
docker compose --profile ai up                # add the GPU inference service (requires NVIDIA Container Toolkit)
```

Frontend still runs on the host (`cd frontend && npm start`) — see
`docs/architecture/frontend.md` for why it isn't containerized.

## Convenience scripts

`scripts/setup/bootstrap` and `scripts/dev/start-all` wrap the steps above —
see `scripts/README.md`.
