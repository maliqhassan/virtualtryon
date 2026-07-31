# CLAUDE.md

Guidance for Claude Code (and other AI agents) working in this repository.

## What this project is

VirtualTryOn: AI-powered virtual clothing try-on. Three independently
deployable services in one repo — see
[docs/architecture/overview.md](./docs/architecture/overview.md) for why.

**Current phase:** planning complete, no features implemented yet. Foundation
(scaffolding), the design system (`design/react-native/`), and a full
development roadmap (`docs/roadmap/`) all exist; no auth, no domain API
endpoints, no screens beyond a placeholder home screen. Check
[PROJECT_STATUS.md](./PROJECT_STATUS.md) before assuming something exists —
folder structure often anticipates features that aren't built yet (most
`components/`, `features/`, `services/`, `models/`, `schemas/` folders are
intentionally near-empty with a `README.md` explaining what belongs there).
**All feature work starts at [docs/roadmap/phase-a-core-loop.md](./docs/roadmap/phase-a-core-loop.md)
Milestone 1**, and every feature — from here on, no exceptions — goes
through the protocol immediately below.

## Feature Implementation Protocol

This is the required workflow for implementing *any* feature in this repo —
a `docs/roadmap/` milestone, a slice of one, or anything else. It's not
background guidance to weigh against convenience; it's the sequence to
follow every time, until the user says otherwise. Three stages: explain and
get approval, implement one feature under the project's architectural
rules, then close it out with five reviews and stop.

### Stage 1 — Before writing any code: present a design brief, then wait

For the feature about to be built, write up and post all nine of the
following, then **stop and wait for explicit approval before creating or
editing a single file.** An unanswered brief is not a green light — this
mirrors how the foundation, design-system, and roadmap phases already
worked in this project; feature work doesn't get a lighter gate than
planning did.

1. **Why the feature exists** — which roadmap milestone/objective it serves, or the product reasoning if it's not roadmap-derived.
2. **User value** — concretely, not "improves UX." What can a user do after this that they couldn't before.
3. **Technical approach** — the shape of the solution before the detail: which services/screens/models are involved and how they connect.
4. **Data flow** — trace a request end to end through the layers that touch it (e.g. capture → client compression → multipart upload → validation → storage → DB row → response).
5. **Frontend architecture** — which `src/features/*` module it lives in, which components from `design/react-native/02-component-inventory.md` it reuses vs. what's genuinely new, where state lives (TanStack Query vs. Zustand vs. local — see the frontend conventions below).
6. **Backend architecture** — which layers are touched (`api/` → `services/` → `models`/`schemas`/`db`) and why nothing skips a layer.
7. **API endpoints** — exact method + path + request/response shape, and which existing endpoint (if any) it extends rather than duplicates.
8. **Database changes** — new tables/columns, and whether they extend an existing model (per `docs/roadmap/`'s own guidance — e.g. Milestone 7 extends `Garment` rather than creating a parallel table) or genuinely need a new one.
9. **Security considerations** — auth/authz requirements, input validation, abuse controls if the endpoint is reachable pre-auth (see the guest-identity pattern in `docs/roadmap/README.md`), and anything touching sensitive data (body photos, credentials, payment-adjacent data get named explicitly, not folded into a generic "be careful" note).

### Stage 2 — While implementing: one feature, explained as it's built, under the project's architecture rules

**One feature at a time.** Don't start a second feature, or a second unrelated slice of the same milestone, until the current one has finished Stage 3 and been approved. A `docs/roadmap/` milestone with several screens (Wardrobe's five, for instance) isn't one feature — break it at its natural seams and run the full three-stage cycle per seam, not once for the whole milestone. When a milestone's scope is ambiguous as a single "feature," say so and propose a split before starting, rather than guessing at the grain size.

**Explain every file before creating it.** State the path, its purpose, and which layer/feature it belongs to — the standard already set in Phase 0 (every scaffolded file was explained) and Phase 1 (every component's purpose stated before being specified) continues into real feature code, not just scaffolding.

**Explain every dependency before adding it.** Why it's needed, and — when relevant — what was considered and rejected. `docs/roadmap/`'s own per-milestone "Dependencies" sections already model the expected depth (e.g. why `@gorhom/bottom-sheet` over a hand-rolled sheet, why `argon2` over `bcrypt`) — match that, don't just name a package.

**Architectural principles, grounded in what this repo already does, not restated as abstract theory:**

- **Clean Architecture** — dependencies point inward. Backend: `api/` → `services/` → `models`/`db`; services never import FastAPI (already a repo-wide rule below). Frontend: `src/app/` routes stay thin and delegate to `src/features/*`; a feature never imports from `src/app/` or from another feature's internals.
- **SOLID:**
  - *Single responsibility* — a service function does one thing (`uploads.py` validates and stores; it doesn't also authorize or notify).
  - *Open/closed* — extend via a new implementation, don't branch an existing one. The storage interface (`docs/roadmap/README.md`'s cross-cutting decision #3) is the model: adding S3 support means a new `storage/s3.py` implementing the same interface as `storage/local.py`, never an `if provider == 's3'` inside `local.py`.
  - *Liskov substitution* — anything implementing that storage interface (or any other interface in the codebase) must be a true drop-in; if swapping the implementation would require the caller to change, the interface was wrong.
  - *Interface segregation* — interfaces stay narrow (the storage interface exposes `save`/`read`/`delete`, nothing else "while we're in there").
  - *Dependency inversion* — services depend on the abstraction (the storage interface) via injection, not on a concrete implementation imported directly.
- **DRY** — check for something reusable before writing new logic: `design/react-native/02-component-inventory.md` on the frontend, existing `services/`/`schemas/` on the backend. `docs/roadmap/`'s Milestone 3 explicitly reusing Milestone 2's upload/validation logic instead of duplicating it is the standard to match.
- **KISS** — don't build for scale or flexibility the current milestone doesn't need. `docs/roadmap/` makes this call repeatedly and on purpose (no charting library where a progress bar suffices, `APScheduler` instead of `Celery` until scale demands it, a seeded product catalog instead of a live retailer integration) — match that judgment instead of defaulting to the more "enterprise" option.
- **Feature-first** — applies most directly to `frontend/src/features/*` (already the convention). `backend/` is layered by deliberate design (see `docs/architecture/backend.md`) — feature-first there means one file per feature *within* each layer (`app/api/v1/endpoints/garments.py`, `app/services/garments.py`), not flattening the layering itself. The layering is Clean Architecture; feature-first governs how files are named and grouped inside it, not a reason to abandon it.

### Stage 3 — After implementing: five reviews, then stop

Every feature closes with all five, presented together, before it's considered done:

1. **Code Review** — correctness, readability, adherence to the conventions above. Invoke the `/code-review` skill against the changes rather than relying on narrative self-assessment alone.
2. **Architecture Review** — did it honor Clean Architecture/SOLID/DRY/KISS/feature-first, and does it fit where `docs/roadmap/` intended it to land.
3. **Performance Review** — N+1 queries or missing indexes on the backend, unnecessary re-renders or unbounded list rendering on the frontend, bundle-size impact of any new dependency.
4. **Security Review** — input validation, authz correctness, injection surface, secrets handling; invoke the `/security-review` skill. Name explicitly whether this feature touches sensitive data (body photos, credentials, payment-adjacent data) and what protects it.
5. **Testing Instructions** — concrete manual verification steps a human can follow, plus what automated coverage exists and what (if anything) is intentionally deferred and why.

**Then stop and wait for explicit approval before starting the next feature.** Don't chain into the next item on the roadmap on the strength of the current one passing review — this is the same checkpoint discipline the foundation, design-system, and roadmap phases already used, now formalized as permanent, not phase-specific.

## Repo-wide rules

- Don't guess at undecided architecture (auth strategy, object storage,
  sync-vs-queued inference, CI/CD). If it's not in `docs/decisions/`, it
  hasn't been decided — ask, or flag it as an open question, rather than
  picking one silently.
- Record genuinely architectural decisions as a new ADR in
  `docs/decisions/`, numbered sequentially. Don't edit past ADRs to reflect
  a new decision — supersede them with a new one that references the old.
- Keep `frontend/`, `backend/`, `ai/` deployable independently. Don't add
  cross-imports between them (e.g. backend importing frontend types) — the
  contract between services is HTTP/JSON, not shared code.
- `frontend/` never talks to Postgres/Redis/`ai/` directly — always through
  `backend/`'s API.

## Per-service conventions

### frontend/ (Expo / React Native / TypeScript)

- Also has its own [frontend/CLAUDE.md](./frontend/CLAUDE.md) →
  [frontend/AGENTS.md](./frontend/AGENTS.md): **read that before writing
  Expo/React Native code** — Expo's APIs have changed significantly across
  recent SDKs (this project is on SDK 54) and training data is likely stale.
- Routes live in `src/app/` and stay thin — logic goes in `src/features/`.
- Style with NativeWind (`className`), not `StyleSheet.create`, unless a
  value is genuinely runtime-computed.
- Server state → TanStack Query. Global client state → Zustand. Local UI
  state → `useState`. Don't mirror server data into Zustand.
- Path alias `@/*` → `src/*`. Full conventions:
  [docs/architecture/frontend.md](./docs/architecture/frontend.md).
- Before marking frontend work done: `npm run typecheck && npm run lint`.

### backend/ (FastAPI, async)

- Routers (`app/api/`) call services (`app/services/`); services own
  business logic and don't import FastAPI. Keeps logic testable without
  spinning up the app.
- `app/schemas/` (Pydantic, API contract) is deliberately separate from
  `app/models/` (SQLAlchemy, persistence) — don't return ORM models
  directly from endpoints.
- New DB fields/tables → SQLAlchemy model change + `alembic revision
  --autogenerate`. Never hand-edit the DB schema outside a migration.
- Full conventions: [docs/architecture/backend.md](./docs/architecture/backend.md).

### ai/ (PyTorch / Diffusers / OpenCV / MediaPipe)

- `pipelines/` composes `preprocessing/` → `models/` → `postprocessing/` —
  reusable steps, not one monolithic function per pipeline.
- No HTTP surface built yet (`src/inference/` is still a placeholder), but
  this is no longer an open question — `docs/roadmap/phase-a-core-loop.md`
  Milestone 4 decided it: a minimal FastAPI app in `ai/` (`POST /generate`),
  built as part of that milestone's implementation, not before.
- `NIM_ENDPOINT_URL` in `src/core/config.py` is a placeholder for future
  NVIDIA NIM integration — don't wire it up speculatively.
- Full conventions: [docs/architecture/ai-pipeline.md](./docs/architecture/ai-pipeline.md).

## Local dev

`docs/setup/local-development.md` has full instructions and a table of
what's actually been verified on the machine this was scaffolded on
(Python and Docker were not installed there — backend/ai steps are
configured but unexecuted; verify before trusting them blindly).
