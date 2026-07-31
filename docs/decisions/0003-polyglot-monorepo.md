# 3. One repository, three runtimes

Date: 2026-07-29
Status: Accepted

## Context

`frontend/` (Node/TypeScript), `backend/` (Python), and `ai/` (Python, but a
different dependency set and deploy target than `backend/`) need to live
somewhere. Options were one repo per service, or one repo for all three.

## Decision

Single repository, top-level folders per service (`frontend/`, `backend/`,
`ai/`), each independently buildable/deployable (own dependency manifest, own
Dockerfile, own `.env`). No shared package/workspace tooling across the
JS/Python boundary — there's nothing to share at that boundary; the API
contract between frontend and backend is HTTP/JSON, not a shared import.

`docs/`, `design/`, `assets/`, and `scripts/` sit alongside the three
services for project-wide documentation, design references, shared
non-bundled media, and cross-service dev/ops scripts, respectively.

## Consequences

- One PR can span frontend + backend + docs for a single feature, reviewed
  and merged atomically instead of coordinated across repos.
- Git history is shared; a `frontend/`-only contributor still clones
  `ai/`'s (large) dependency footprint conceptually, though not its
  installed `node_modules`/venv.
- No cross-repo version-pinning problem (e.g. "which backend commit does
  this frontend commit expect") since they move together.
- If `ai/` ever needs an independent release cadence with heavier CI
  (GPU runners, large model artifacts) that meaningfully diverges from
  `backend/`'s, splitting it into its own repo is a reasonable future
  reversal of this decision — not a one-way door.
