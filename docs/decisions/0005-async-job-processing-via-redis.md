# 5. Async AI job processing via a Redis-backed task queue (arq)

Date: 2026-07-30
Status: Accepted

## Context

`docs/architecture/overview.md` listed "Sync vs. async (queued) inference
request handling" as an explicitly undecided cross-cutting concern, to be
revisited once the first real pipeline's latency profile was known. It
isn't known yet — no real model is integrated — but a request to prepare
the architecture for asynchronous Redis-backed processing forces the
decision now, at the architecture level, ahead of the latency data. That's
acceptable here specifically because the mechanism (a queue) is the right
shape regardless of the eventual numbers — real generation across pose
detection, human parsing, try-on synthesis, identity preservation, and
enhancement is a multi-model pipeline that will not complete inside a
single HTTP request/response cycle under any realistic latency, matching
the same reasoning `docs/roadmap/README.md`'s cross-cutting decision #2
already used for the *mocked* version of this job.

## Decision

Real AI job processing runs as a **Redis-backed task queue**, consumed by
one or more **separate worker processes** — not FastAPI's `BackgroundTasks`
(runs in the same process/event loop as request handling, which is exactly
what ADR 0002 already said not to couple), and not a synchronous
request/response.

**Library: [`arq`](https://arq-docs.helpmanual.io/)**, not Celery or RQ.
Reasoning:

- The backend is async-first throughout (async SQLAlchemy per ADR 0002,
  an async Redis client already in `app/redis/client.py`). `arq` is
  built on `asyncio` and integrates with that directly — job enqueueing
  and status-checking are `async def` calls using the same Redis
  connection pattern already established, not a second, sync-flavored
  client library bolted on.
- Celery is more mature and more commonly paired with GPU workloads in
  practice, but brings real operational weight (a broker abstraction
  layer, typically its own worker-management conventions) that isn't
  justified yet for one job type with no production traffic. Worth
  reconsidering if operational needs (multiple queues, complex retry/
  routing policies, broader task ecosystem) outgrow `arq`.
- RQ is simpler than Celery but is synchronous — it would sit awkwardly
  against an otherwise async-first codebase and duplicate connection
  handling `app/redis/client.py` already solved.

**Queue producer, not consumer, lives in `backend/`.** `backend/ai/services/job_queue.py`
enqueues jobs (called from the future API endpoint) and reads job status
(for the polling endpoint) — both using the existing async Redis client.
The **worker** that actually consumes the queue and drives the workflow
(calling `ai_client` for each GPU-bound stage) is a separate process,
started independently (its own container/entrypoint, not `uvicorn`'s
process) — this is what "independent scaling" from ADR 0002 concretely
means: the worker count can scale with queue depth, independent of how
many API request-handling replicas exist.

**GPU-bound work inside a worker task is not itself async.** Model
inference blocks the thread/process running it — that's inherent to how
PyTorch inference works, not something `arq`'s async task runner changes.
This is fine: `arq`'s async model governs how the *worker* picks up and
sequences jobs and talks to Redis/Postgres between stages, not how the
GPU call itself executes once dispatched to `ai/`.

## Consequences

- A new deployable unit exists once this is implemented: the AI worker,
  separate from both `backend`'s API process and `ai/`'s own process (the
  worker orchestrates; `ai/` executes; they remain distinct even though
  both are "backend-side" of the frontend).
- `arq` becomes a new `backend/requirements.txt` dependency — **not added
  in this pass**, consistent with the same add-it-when-first-used
  principle already applied to frontend dependencies
  (`design/react-native/04-inconsistencies-and-recommendations.md`) and
  with `docs/roadmap/README.md`'s own "Dependencies" convention (each
  milestone lists only the *new* packages it needs, not a batch reserved
  upfront) — named here as the chosen library, added when `job_queue.py`
  is actually implemented.
- Job status becomes queryable independent of whether a worker is
  currently processing it (status lives in Postgres, updated at each
  stage transition) — matching exactly the polling contract the frontend
  already mocks (`TryOnJob.status`/`stepId`/`progress` from Phase 6/7).
  The real backend, once built, needs to satisfy a contract the frontend
  was already built against — not the other way around.
- Redis here serves two roles that must stay conceptually distinct:
  queue transport (`arq`'s job list) and general cache (existing role from
  ADR 0002). Using the same Redis instance for both is fine at this scale;
  worth splitting into separate Redis instances/logical DBs only if queue
  load and cache load start contending for the same resource in practice —
  not a decision to make ahead of that evidence.
