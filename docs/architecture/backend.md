# Backend Architecture

FastAPI, async end-to-end (async SQLAlchemy 2.0 + asyncpg, async Redis client).

## Layering

```
app/api/v1/          → HTTP layer: routing, request/response schemas, status codes
app/services/         → business logic / use cases, framework-agnostic
app/models/            → SQLAlchemy ORM models
app/schemas/            → Pydantic request/response models (distinct from ORM models)
app/db/, app/redis/      → infrastructure clients
app/db/repositories/       → DB access per model (query logic only, no business rules)
app/core/                 → config, logging, security utilities
```

Routers depend on services; services depend on repositories/models/db, not
the other way around. This keeps business logic testable without spinning
up FastAPI. `app/db/repositories/` sits inside the `db/` infrastructure
layer (not a new top-level layer) — repositories are DB-access
infrastructure, the same category as the session/engine setup already
there; business rules (validation, orchestration, what to do when a row
isn't found) stay in `app/services/`, which calls repositories rather than
querying the DB directly. First introduced by the Saved Looks feature
(`app/db/repositories/{user_repository,saved_look_repository}.py`).

## Guest identity

Implements `docs/roadmap/README.md`'s guest-identity decision: `User`
exists from the first persisted feature onward (`auth_provider` models all
four eventual values — `guest|email|google|apple` — even though only
`guest` is used today), so real authentication later means "attach
credentials to an existing row," not "migrate data between tables."

`app/services/guest_identity.py` resolves a caller's `User` from a device
id, or issues a new one — **always server-generated
(`secrets.token_urlsafe`), never a client-supplied value**, since accepting
a client-chosen id would let one guest simply claim another's data.
`app/api/deps.py`'s `get_current_user` wires this into a FastAPI dependency
and is the one seam that changes when real authentication lands — every
endpoint depending on it (via `Depends(get_current_user)`) stays unchanged.

## Object storage

`app/services/storage/` implements the interface `docs/roadmap/README.md`'s
cross-cutting decision #3 planned since Phase 2 ("local disk now,
S3-compatible deferred... behind an interface narrow enough that swapping
touches one module, not every caller") — built for real by the Saved Looks
feature. `StorageService` (`save`/`read`/`delete`, per `CLAUDE.md`'s own
Interface Segregation example for this exact interface) has one
implementation today, `LocalStorageProvider`, writing to
`STORAGE_UPLOADS_DIR` and serving files back via `app/main.py`'s
`StaticFiles` mount at `/uploads`. `get_storage_service()`
(`app/services/storage/__init__.py`) is the one swap point for a future
S3/Cloudinary/Firebase provider — no caller imports `LocalStorageProvider`
directly.

## Why Pydantic schemas are separate from SQLAlchemy models

Returning ORM models directly from endpoints couples the API's public
contract to the DB schema — a column rename becomes a breaking API change.
`schemas/` defines what the API actually promises to clients; `models/`
defines what's persisted. They'll often look similar but are allowed to
diverge.

## Config

`app/core/config.py` uses `pydantic-settings` to load from `.env`/environment
variables into a validated `Settings` object. Required fields (DB URL, Redis
URL, secret key) have no defaults — a missing `.env` fails at import time
with a clear Pydantic validation error instead of failing mysteriously later.

## Migrations

Alembic, configured for async SQLAlchemy (`alembic/env.py` uses
`async_engine_from_config` + `connection.run_sync`). The DB URL comes from
`app.core.config.get_settings()`, not duplicated in `alembic.ini`, so there's
one source of truth.

## What's intentionally not here yet

Real authentication (still guest-only identity) — see `PROJECT_STATUS.md`.
`app/main.py` wires up CORS, the v1 router (`/ai`, `/saved-looks`), a
`/health` liveness endpoint, and a `/uploads` static file mount.
