# 2. Tech stack rationale

Date: 2026-07-29
Status: Accepted

## Context

The stack was specified upfront rather than chosen through this ADR's usual
comparison process. Recording the *why* behind each piece anyway so future
changes are deliberate substitutions, not drift.

## Decision

- **React Native + Expo (managed) + Expo Router** for the client: one
  codebase for iOS/Android, Expo's managed workflow avoids owning native
  build config until there's a concrete reason to eject/prebuild (a native
  module with no Expo config plugin), and Expo Router gives file-based
  navigation instead of hand-rolled React Navigation wiring.
- **NativeWind** over `StyleSheet`: utility classes keep styling colocated
  with markup and match the Tailwind conventions common in the design
  tooling ecosystem, at the cost of a Babel/Metro transform step.
- **TanStack Query for server state, Zustand for client state** — deliberately
  not one library for both. Conflating "data the server owns" with "data the
  client owns" is a common source of stale-cache bugs; splitting them makes
  the boundary a type-level/module-level decision, not a discipline problem.
- **FastAPI** over Django/Flask: native async support (matters once the API
  is calling out to the AI service or an external NIM endpoint mid-request),
  Pydantic-based validation shared conceptually with the frontend's Zod
  validation, and OpenAPI generation for free.
- **PostgreSQL**: relational integrity for user/garment/try-on-session data
  with clear foreign-key relationships; no current requirement points at a
  document or graph model.
- **Redis**: cache + (likely) job queue backing for async inference requests.
  Not used as a system of record.
- **SQLAlchemy 2.0 (async) + Alembic**: async ORM to match FastAPI's async
  handlers end-to-end rather than blocking the event loop on sync DB calls;
  Alembic for reviewable, versioned schema migrations instead of
  auto-migrate-on-boot.
- **Separate `ai/` service** rather than importing PyTorch into the API
  process: see `docs/architecture/overview.md` — independent scaling and
  deploy cadence for GPU-bound work.
- **Diffusers + Transformers + Hugging Face Hub** for model loading:
  the de facto standard for diffusion-based image generation, with
  first-class support for the checkpoint formats try-on models are
  typically distributed in.
- **OpenCV + MediaPipe** for preprocessing: pose landmarks and segmentation
  masks are inputs the try-on pipeline needs before any generation step;
  both are mature, CPU-runnable (no GPU dependency for this stage).
- **NVIDIA NIMs**: explicitly deferred (config placeholder only, see
  `docs/architecture/ai-pipeline.md`). Adopting it now, before a pipeline
  exists to benchmark against self-hosted inference, would be optimizing
  before there's anything to measure.

## Consequences

- Two Python services (`backend/`, `ai/`) means two dependency sets, two
  Dockerfiles, two places `pydantic-settings` config lives. Accepted as the
  cost of the scaling/deploy independence above.
- Async SQLAlchemy has a smaller pool of contributor familiarity than sync;
  worth flagging in onboarding.
- No object storage, auth, or CI/CD decision made yet — those get their own
  ADRs when they're actually decided, not guessed at here.
