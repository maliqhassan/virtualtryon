# 17. Continuous integration with GitHub Actions

Date: 2026-11-19

Status: Accepted. Settles the CI half of the "CI/CD" question CLAUDE.md
listed as undecided; deployment stays as ADR 0009 set it up (Render, from
`render.yaml`).

## Context

Nothing checked a push before Render deployed it: `autoDeploy` builds every
commit to `main`. Tests and lint ran only on the developer's machine, and
the backend tests there run on SQLite (no Postgres installed), so the
hand-written Alembic migrations had never been applied to real Postgres
outside production.

## Decision

- One workflow, `.github/workflows/ci.yml`, on every push to `main` and
  every pull request into it.
- **Backend job**: Python 3.11 (the production image's version), the
  system libraries OpenCV needs, a Postgres 16 service container, `ruff`
  and `black --check` on `app` and `tests` (pinned versions), `alembic
  upgrade head`, then `pytest`. Running the migrations and the tests on Postgres is
  the point: it checks what SQLite can't (enum types, constraints,
  `FOR UPDATE`, timezone-aware comparisons, migration order).
- **App job**: Node from `frontend/.nvmrc`, `npm ci`, `typecheck`, `lint`,
  `format:check`.
- GitHub Actions over other CI services: the repository is already on
  GitHub, it needs no new account or secret, and service containers give a
  real Postgres for free.
- `mypy` isn't a step yet: four errors predate this and should be fixed
  first, then the step added. Likewise `backend/ai` and `alembic` aren't
  linted yet (about ten existing issues). `test_mediapipe_analyze.py` is left out
  because it downloads a model from Google on first use.
- CI needs no secrets. The database and `SECRET_KEY` are throwaway values
  inside the job.

## Consequences

- A red check shows on the commit and the pull request, but doesn't stop
  Render: deploys only wait for CI once Render's auto-deploy is set to
  "After CI checks pass" (a dashboard setting, not in this repository).
- No end-to-end or app UI tests yet; the app job checks types, lint and
  formatting only.
