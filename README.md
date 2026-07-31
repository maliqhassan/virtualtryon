# VirtualTryOn

AI-powered virtual clothing try-on. Mobile client (Expo/React Native) +
FastAPI backend + a separate Python AI service for pose/segmentation
preprocessing and diffusion-based garment try-on generation.

**Status:** core loop (photo upload → garment upload → mocked AI generation
→ results) is built end-to-end on the frontend, backed by a real FastAPI +
PostgreSQL backend for two domain features so far — Saved Looks (history,
rename, favourite, delete) and Wardrobe (garment CRUD: upload, rename,
change category, delete) — both scoped to a server-issued guest identity
(no real user accounts yet). Real AI generation is not wired in: the try-on
pipeline runs on a deterministic local stub, and MediaPipe pose/face
detection exists only as a standalone diagnostic endpoint, not part of the
generation flow yet. Full phase-by-phase detail:
[PROJECT_STATUS.md](./PROJECT_STATUS.md).

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | React Native, Expo (SDK 54), TypeScript, Expo Router, NativeWind, React Hook Form + Zod, TanStack Query, Zustand, Axios, Reanimated, Expo Camera / Image Picker |
| Backend | FastAPI (async), PostgreSQL, Redis, SQLAlchemy 2.0 (async), Alembic, Docker |
| AI | PyTorch, Diffusers, OpenCV, MediaPipe, Hugging Face; NVIDIA NIMs planned |

## Repository layout

```
virtualtryon/
├── frontend/    Expo React Native app
├── backend/     FastAPI service (the only thing with DB/Redis credentials)
├── ai/          Python inference service (pose, segmentation, try-on generation)
├── docs/        Architecture, ADRs, local dev setup
├── design/      Design references (tokens, Figma exports, wireframes) — not bundled
├── assets/      Shared non-bundled media (brand, sample garments/models for dev)
├── scripts/     Cross-service dev/ops scripts
└── docker-compose.yml   Local dev orchestration (postgres, redis, backend, ai)
```

Each of `frontend/`, `backend/`, `ai/` is independently buildable/deployable
with its own dependency manifest, `Dockerfile`, and `.env`. Why this
particular split — see
[docs/decisions/0003-polyglot-monorepo.md](./docs/decisions/0003-polyglot-monorepo.md).

## Getting started

```sh
./scripts/setup/bootstrap.sh      # or .\scripts\setup\bootstrap.ps1 on Windows
```

Full manual steps, prerequisites, and what's verified-vs-not on the current
dev machine: [docs/setup/local-development.md](./docs/setup/local-development.md).

## Architecture

- [docs/architecture/overview.md](./docs/architecture/overview.md) — system shape, why frontend/backend/ai are separate services, data flow
- [docs/architecture/frontend.md](./docs/architecture/frontend.md)
- [docs/architecture/backend.md](./docs/architecture/backend.md)
- [docs/architecture/ai-pipeline.md](./docs/architecture/ai-pipeline.md)
- [docs/decisions/](./docs/decisions/) — ADRs (architecture decision records)

## Conventions

- **Frontend**: ESLint (`eslint-config-expo`) + Prettier, TypeScript strict
  mode, path alias `@/*` → `src/*`. NativeWind (`className`) for styling.
- **Backend / AI**: Black + Ruff + isort + mypy, configured per-service in
  each `pyproject.toml`.
- **Commits/PRs**: not yet defined — add here once agreed.

For AI coding agents working in this repo, see [CLAUDE.md](./CLAUDE.md).
