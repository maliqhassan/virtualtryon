# Architecture Overview

## System shape

VirtualTryOn is three independently-deployable services sharing one repo:

```
┌─────────────────┐      HTTPS/JSON       ┌──────────────────┐
│  frontend/       │ ─────────────────────▶│  backend/         │
│  Expo / RN app   │◀───────────────────── │  FastAPI          │
└─────────────────┘                        └─────────┬─────────┘
                                                       │
                                     ┌─────────────────┼─────────────────┐
                                     ▼                 ▼                 ▼
                              ┌───────────┐     ┌────────────┐    ┌────────────┐
                              │ PostgreSQL │     │   Redis    │    │  ai/        │
                              │ (state)    │     │ (cache/    │    │  inference  │
                              │            │     │  queue)    │    │  service    │
                              └───────────┘     └────────────┘    └────────────┘
```

- **frontend/** never talks to Postgres/Redis/the AI service directly — everything
  goes through the backend's REST API. This keeps data-access policy, auth, and
  rate limiting in one place.
- **backend/** is the only service with DB/Redis credentials. It calls into
  `ai/` for inference work (garment segmentation, diffusion-based try-on
  generation) rather than embedding ML code in the API process, so the GPU
  workload can scale, deploy, and fail independently of request handling.
  This call happens through `backend/ai/` — an orchestration module inside
  the backend that owns job lifecycle and data contracts but never loads a
  model itself (`docs/decisions/0004-ai-orchestration-vs-execution-boundary.md`).
  See `docs/architecture/ai-backend.md` for the full design.
- **ai/** is framework-agnostic Python today (no HTTP surface yet — see
  `ai/src/inference/`). `backend/ai/services/ai_client.py` will call it over
  plain HTTP; a future NVIDIA NIM-hosted endpoint is a config swap at that
  call site, not a redesign.

## Why this split

- **Independent scaling.** Try-on generation is GPU-bound and bursty; API
  request handling is not. Coupling them into one process would force scaling
  one to scale the other.
- **Independent deploy cadence.** Model updates (new checkpoint, new
  pipeline) shouldn't require redeploying the API, and vice versa.
- **Blast radius.** A crash or OOM in a diffusion pipeline shouldn't take
  down user-facing API traffic.

## Data flow (once implemented)

1. App captures/selects a photo (`expo-camera` / `expo-image-picker`) client-side.
2. App uploads the photo + selected garment reference to the backend.
3. Backend persists the request in Postgres, enqueues/calls the AI service.
4. AI service runs preprocessing (pose/segmentation) → pipeline inference →
   postprocessing, returns a result image.
5. Backend stores the result and returns it to the app; Redis caches
   frequently-read data (e.g. garment catalog) and/or backs a job queue for
   long-running inference requests.

## Cross-cutting concerns not yet decided

Tracked as open questions rather than guessed at, since guessing here would
be scope creep for a foundation-only phase:

- Auth strategy (session vs. JWT vs. third-party).
- ~~Sync vs. async (queued) inference request handling~~ — resolved:
  Redis-backed queue via `arq`, see `docs/decisions/0005-async-job-processing-via-redis.md`
  and `docs/architecture/ai-backend.md`.
- Object storage for uploaded/generated images (local disk is fine for dev;
  production needs S3-compatible storage — not configured yet).
- CI/CD pipeline.

See `docs/decisions/` for architecture decision records as these are settled.
