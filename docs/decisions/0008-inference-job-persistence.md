# 8. Inference job lifecycle persists in Postgres via `app/models/inference_job.py`

Date: 2026-07-31

Status: Accepted

## Context

Three places already described a version of "a try-on job," none of them a
real, persisted, queryable entity:

- `docs/roadmap/phase-a-core-loop.md` Milestone 4 (never built) planned
  `backend/app/models/tryon_job.py` — a `TryOnJob` model with a
  `user_photo_id` FK to a `UserPhoto` table that itself was never built
  (user-photo upload has been frontend-mock-only since Phase 3/5).
- `backend/ai/models/job.py` (Phase 8, built) — an in-memory-only Pydantic
  `TryOnJob`/`TryOnJobStatus`/`WorkflowStage` contract, plus a stub Redis
  producer (`job_queue.py`) and orchestrator (`workflow.py`), all
  `NotImplementedError`. Its own docstring called "where job state
  actually lives" an open question.
- `docs/decisions/0005-async-job-processing-via-redis.md`'s Consequences
  section already asserted the answer to that open question — "status
  lives in Postgres, updated at each stage transition" — without ever
  implementing it.

A request to build the AI inference job pipeline's Stage 1 (persisted job
CRUD, no inference, no worker) forces resolving this now.

## Decision

Job lifecycle state persists in Postgres, as `app/models/inference_job.py`'s
`InferenceJob` — a new model in the same domain layer as `Garment`,
`SavedLook`, and `Profile` (repository → service → schemas → endpoints),
guest-identity-scoped like all three.

**`InferenceJob` is deliberately not `TryOnJob`, and its status vocabulary
(`queued|processing|completed|failed`) is deliberately not
`backend/ai/models/job.py`'s (`TryOnJobStatus.PENDING`, plus the 7-value
`WorkflowStage`).** These are different layers, not competing names for the
same thing:

- `InferenceJob` (this ADR) is the **persisted record** a guest's job
  exists as — created when a job is requested, read by polling, eventually
  updated by a worker. It has no notion of fine-grained pipeline stages.
- `backend/ai/models/job.py`'s `TryOnJob`/`WorkflowStage` remain the
  **future worker's internal execution contract** — once
  `docs/decisions/0005`'s `arq` worker exists, it will read/write
  `InferenceJob` rows as it walks `WorkflowStage`-by-`WorkflowStage
  internally. That worker is not built by this ADR.

**No `UserPhoto` model is introduced.** `InferenceJob.user_image_storage_key`
is a backend-controlled storage reference (matching
`app/services/storage/`'s `save`/`read`/`delete` interface's own "path" —
returned by that service, never an arbitrary client-supplied URL), the same
shape `SavedLook.user_image_url`/`clothing_image_url` already used before
`Garment` existed to FK against. `InferenceJob.garment_id` **is** a real FK
to `garments.id` (`ON DELETE SET NULL`) — unlike `SavedLook`, this feature
is built after `Garment` exists, so a structured reference (enabling
ownership validation at creation) is possible and used instead.

**Status transitions (`queued → processing → completed/failed`) are
service-layer methods only** (`mark_processing`/`mark_completed`/
`mark_failed`, callable by a future worker) — **no public `PATCH`/`DELETE`
endpoint exists**. A guest-facing status-mutation endpoint would let any
guest fake their own job as `completed` with an arbitrary
`generated_image_url`, and nothing calls one yet (no worker exists).

## Consequences

- A future worker (once `docs/decisions/0005`'s `arq` integration is
  actually built) updates `InferenceJob` rows directly via these
  service-layer methods — it does not need a new HTTP endpoint to do so,
  since it runs as trusted backend infrastructure, not an untrusted guest
  request.
- `backend/ai/models/job.py`'s `TryOnJob`/`WorkflowStage`/`job_queue.py`/
  `workflow.py` are unchanged by this ADR and remain exactly as
  unimplemented as Phase 8 left them — this ADR does not wire them to
  anything. Whoever implements the real worker will need to reconcile
  `WorkflowStage`'s 7 stages with `InferenceJob`'s single `status` column
  (likely: `status` stays coarse-grained for guest-facing polling, while a
  finer stage/progress value could be added to `InferenceJob` later, or
  kept ephemeral in Redis — left open, not decided here).
- `docs/roadmap/phase-a-core-loop.md` Milestone 4's `TryOnJob`/
  `tryon_job.py`/`user_photo_id` plan is now superseded in *this* respect
  by `InferenceJob` — that milestone document is not edited to match (per
  `CLAUDE.md`'s own rule: superseded by a new ADR, not silently rewritten),
  but any future reader implementing Milestone 4 should read this ADR
  first.
- Real `AIInferenceClient`-based generation (root `ai/`, Phase 12) is not
  called by anything yet. This ADR only establishes where a job's state
  lives; a future stage connects `mark_processing`/`mark_completed` to an
  actual worker calling `AIInferenceClient.infer()`.

## Numbering note

`docs/roadmap/phase-b-platform.md`'s Milestone 12 had already earmarked
`0008-ai-model-selection.md`/`0009-gpu-infrastructure.md` (itself the third
renumbering, per ADR 0007's own note). This ADR takes `0008` instead — that
file is updated to bump its earmarks to `0009`/`0010`, a fourth move, with
the same "verify the actual next-free number at implementation time" caveat
carried forward.
