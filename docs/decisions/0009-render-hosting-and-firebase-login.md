# 9. Backend hosted on Render; login through Firebase Authentication

Date: 2026-10-23

Status: Accepted (Firebase part: decided, not built yet)

## Context

The app needs a backend a phone can reach outside the dev machine's Wi-Fi,
and real accounts before paid plans can exist. The dev machine has no
Docker, so "run docker-compose locally" isn't a way to test on a phone
either.

## Decision

**Hosting: Render.** One Docker web service built from `backend/Dockerfile`
(repo root as context, so `ai/` installs as a package) plus a Render
Postgres database, described in `render.yaml` as a Blueprint.

- `backend/start.sh` runs migrations, seeds the sample catalog, runs the
  try-on worker in the background and the API in the foreground. The worker
  lives in the API's container because a Render disk attaches to a single
  service, and both processes read and write the same upload files.
- Uploads (user photos, cut-outs, results) live on a Render persistent disk
  mounted at `/app/storage/uploads`. This needs a paid instance (free web
  services have no disk). Moving files to object storage later is a new
  `StorageService` implementation, not a change to callers.
- `DATABASE_URL` from Render (`postgres://…`) is rewritten to
  `postgresql+asyncpg://…` in `Settings`. `REDIS_URL` now has a default,
  since nothing uses Redis yet (ADR 0005's queue isn't built; the worker
  polls Postgres).

**Login: Firebase Authentication, sign-in only.** Google and Apple sign-in
(Apple is required by App Store guideline 4.8 when Google is offered).
Firebase only proves who the user is; the backend verifies the Firebase ID
token and keeps all app data in Postgres. Until it's built, the guest
`X-Device-Id` identity stays.

## Consequences

- Running the API and worker in one container means they scale together;
  fine for now, revisit when try-on volume needs more than one worker.
- A disk pins the service to one instance and means no zero-downtime
  deploys. Acceptable at this stage; object storage removes the limit.
- Firebase sign-in on native needs a development build, not Expo Go.
