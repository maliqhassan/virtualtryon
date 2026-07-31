# 4. AI orchestration lives in `backend/ai/`; AI execution stays in `ai/`

Date: 2026-07-30
Status: Accepted

## Context

`docs/decisions/0002-tech-stack-rationale.md` decided AI inference gets its
own service (`ai/`, project root), separate from `backend/`, specifically
for independent scaling, independent deploy cadence, and blast-radius
isolation of GPU-bound work. `docs/architecture/overview.md` left *how*
`backend/` and `ai/` talk to each other as an explicit open question
("Sync vs. async (queued) inference request handling... deferred until the
first pipeline exists").

A request to design the AI backend architecture specified a folder
structure (`api/`, `models/`, `services/`, `preprocess/`, `pipelines/`,
`postprocess/`, `storage/`, `utils/`) living at `backend/ai/` — inside the
FastAPI service, alongside `backend/app/`. Taken at face value, this could
be read as moving AI processing *into* the backend process, which would
undo the reasoning in ADR 0002. It could also be read as something that
doesn't touch that reasoning at all. Worth resolving explicitly rather than
guessing silently in either direction.

## Decision

`backend/ai/` is an **orchestration** module. It never loads a model, never
imports PyTorch, never touches a GPU. Its job:

- Define the workflow's data contracts (`models/`) — the shape of a pose
  result, a parsing result, a generation request, distinct from `app/schemas/`'s
  public API contracts, because these describe data moving *between
  internal pipeline stages*, not what a client sends over HTTP.
- Manage the job lifecycle (`services/`) — create a job record, enqueue it
  on Redis, track status transitions, call out to whichever service
  actually does the work.
- Define the stage sequence (`pipelines/`) — what order the workflow's
  steps run in, as an orchestration-level concern, not the actual model
  composition (that composition — pose model feeding into the generation
  model, in-process, on one GPU — is what `ai/src/pipelines/` already means
  and continues to mean).
- Handle backend-side pre/post work (`preprocess/`, `postprocess/`) that's
  cheap enough to run without a GPU — format validation, resizing before
  handoff, thumbnail generation after a result comes back — distinct from
  the GPU-bound preprocessing (pose estimation, segmentation) that stays in
  `ai/src/preprocessing/`.
- Apply storage *policy* (`storage/`) — where results live, naming,
  retention — built on top of the generic storage interface `docs/roadmap`
  Milestone 2 already planned (`app/services/storage/`), not a second
  competing implementation of it.

`ai/` (project root) remains exactly what ADR 0002 already decided: the
only place that loads a model or runs inference. `backend/ai/services/`
talks to it over HTTP (today) or a future NVIDIA NIM endpoint (config
swap, no call-site change) — never a direct Python import, since they're
separate processes/containers with separate dependency sets by design.

## Consequences

- Two Python codebases remain necessary for AI-related work — unchanged
  from ADR 0002, now with an explicit boundary instead of an open question.
- `backend/ai/`'s "pipeline" and `ai/`'s "pipeline" are deliberately
  same-named, different-level concepts (orchestration sequence vs. model
  composition) — worth remembering when reading either, so the names
  aren't mistaken for duplication.
- This module's design references entities (a persisted `TryOnJob`, a
  storage interface, uploaded-image records) that `docs/roadmap` Milestone
  2/3's backend work hasn't built yet — those remain a separate,
  not-yet-started prerequisite. `backend/ai/` is designed *against* that
  eventual contract, not built assuming it already exists.
- If `ai/`'s HTTP surface (`ai/src/inference/`, still a placeholder per
  Phase 0) turns out to need a different transport than plain HTTP once it
  actually exists, `backend/ai/services/ai_client.py` is the one place
  that changes.
