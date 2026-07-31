# AI Backend Architecture (`backend/ai/`)

Design for the orchestration layer that will connect the frontend's
already-built try-on flow (Phases 5-7, currently running on mocked
responses) to real inference in `ai/` (project root). This document
describes structure only.

**Scope of this pass, explicitly:** no model is downloaded, no inference
is implemented, no HTTP endpoint is implemented. Every function body in
`backend/ai/` that would eventually do real work instead raises
`NotImplementedError` with a message stating why. What exists is the
package layout, the Pydantic data contracts flowing between stages, and
the call shape connecting them — enough for implementation work to start
directly against a settled interface, per `docs/decisions/0004-ai-orchestration-vs-execution-boundary.md`
and `docs/decisions/0005-async-job-processing-via-redis.md`.

## Where this fits

`docs/architecture/overview.md` already established three services:
`frontend/`, `backend/` (FastAPI), and `ai/` (inference). This phase adds
detail *inside* `backend/`, plus one new deployable unit — the queue
worker:

```
┌──────────┐  HTTPS/JSON  ┌───────────────────────────────┐
│ frontend/│─────────────▶│ backend/ (FastAPI, uvicorn)    │
└──────────┘◀─────────────│                                │
                           │  app/api/v1/  ── HTTP layer    │
                           │  backend/ai/  ── orchestration │──┐
                           └───────────────────────────────┘  │
                                    │              │           │ enqueue/
                                    ▼              ▼           │ status
                              ┌──────────┐  ┌────────────┐     │
                              │PostgreSQL│  │   Redis    │◀────┘
                              │ (job     │  │ (queue     │◀───────┐
                              │  status) │  │  transport)│         │
                              └──────────┘  └────────────┘         │
                                                   ▲                │
                                                   │ dequeue        │
                                            ┌──────────────────────┴──┐
                                            │ AI worker (new process, │
                                            │ separate container —    │
                                            │ runs backend/ai/services│
                                            │ /workflow.py)           │
                                            └──────────────┬───────────┘
                                                            │ HTTP
                                                            ▼
                                                     ┌────────────┐
                                                     │ ai/ (root) │
                                                     │ inference  │
                                                     └────────────┘
```

- `app/api/v1/` (existing, empty) is where the future `POST /tryon` and
  `GET /tryon/{id}` endpoints will live — **not implemented in this
  pass**. They will call into `backend/ai/services/job_queue.py`.
- `backend/ai/` runs *inside* the FastAPI process for the enqueue/status
  calls (fast, no GPU), but the actual workflow execution
  (`services/workflow.py`) runs inside the **AI worker**, a separate
  process consuming the same Redis queue — never inside a `uvicorn`
  request handler. This is the concrete meaning of "async processing
  using Redis": the API responds immediately with a job id; the worker
  does the multi-minute work later.
- `ai/` (root) is unchanged from `docs/architecture/ai-pipeline.md` — it
  remains the only place a model is loaded or a GPU is touched. The
  worker talks to it over HTTP through `backend/ai/services/ai_client.py`,
  never a direct Python import (they're separate processes with separate
  dependency sets, by design — ADR 0002).

## Folder-by-folder

```
backend/ai/
├── api/          HTTP surface reserved for backend/ai/'s own routes, if any prove necessary
├── models/       Pydantic contracts for data moving between workflow stages
├── services/     Job lifecycle: enqueue, status, HTTP calls to ai/, orchestration loop
├── preprocess/   Cheap CPU-only work before a job reaches ai/ (validation, normalization)
├── pipelines/    Declarative stage order for a workflow
├── postprocess/  Cheap CPU-only work after ai/'s stages finish (result assembly)
├── storage/      Persists the final result image, via a storage interface (not yet built)
└── utils/        Small shared helpers with no business logic of their own
```

Each folder maps to one job in the pipeline: `models/` says what data
looks like, `pipelines/` says what order stages run in, `services/` says
how a job actually moves through that order, `preprocess/`/`postprocess/`
do the cheap surrounding work, `storage/` persists the outcome, `api/`
and `utils/` are supporting surface. No folder here loads a model —
that boundary is the subject of ADR 0004.

## File-by-file

### `models/` — data contracts

| File | Purpose |
|---|---|
| `job.py` | `TryOnJob`, `TryOnJobStatus`, `WorkflowStage`, `TryOnJobCreate`, `TryOnResult` — the top-level job record and its status/stage enums. `WorkflowStage`'s 7 values map to requirements 3, 5-10 (see mapping table below). Mirrors `frontend/src/features/tryon/types.ts`'s existing `TryOnJob`/`TryOnResult` shape, since the frontend was already built against this contract using mocked data. |
| `validation.py` | `ImageValidationResult` — requirement 3's output shape (is the image AI-ready: person detectable, resolution sufficient). Distinct from Milestone 2's basic upload validation (file type/size/MIME). |
| `pose.py` | `PoseKeypoint`, `PoseDetectionResult` — requirement 5's output. Generic named-keypoint structure so MediaPipe's and DWPose's differing schemas are a mapping concern inside `ai/`, not a contract change here. |
| `parsing.py` | `HumanParsingResult` — requirement 6's output (SCHP). Segmentation mask is stored as an artifact via `storage/`; this contract only carries a reference to it. |
| `tryon.py` | `TryOnGenerationInput`, `TryOnGenerationResult` — requirement 7's input/output (IDM-VTON/CatVTON). Takes the already-computed pose and parsing results as input rather than raw images again. |
| `identity.py` | `IdentityPreservationResult` — requirement 8's output (InstantID/PuLID). Corrects face drift the generation stage may introduce. |
| `enhancement.py` | `EnhancementResult` — requirement 9's output (Real-ESRGAN). Its `enhanced_image_uri` is what `postprocess/result_packaging.py` turns into `TryOnResult.image_uri`. |

None of these files name a specific model as *the* choice where the
requirements named multiple candidates (pose: MediaPipe vs. DWPose;
try-on: IDM-VTON vs. CatVTON; identity: InstantID vs. PuLID) — that
choice is inference work, out of scope here.

### `services/` — job lifecycle

| File | Purpose |
|---|---|
| `ai_client.py` | `AIServiceClient` — HTTP client to root `ai/`. One `async def` per GPU-bound stage (`detect_pose`, `parse_human`, `generate_tryon`, `preserve_identity`, `enhance_image`), each currently raising `NotImplementedError`. The single point of contact with `ai/`; if `ai/`'s transport changes (e.g. adopting NVIDIA NIM via the existing `NIM_ENDPOINT_URL` placeholder in `ai/src/core/config.py`), only this file's `base_url` changes. |
| `job_queue.py` | `JobQueue` — the Redis queue's producer/status-reader side (`enqueue`, `get_status`), built on `arq` per ADR 0005. Does **not** consume the queue; that's the worker's job (`workflow.py`, run by a separate process). `arq` itself is not yet added to `backend/requirements.txt` — added when this file gets a real body, per the project's own dependency-addition rule. |
| `workflow.py` | `run_tryon_workflow()` — the imperative orchestration loop the AI worker process calls per job: walk `pipelines/tryon_pipeline.py`'s stage order, call the matching `ai_client` method per stage, update status via `job_queue` between stages. Not implemented; a structural stub. |

### `preprocess/` — cheap pre-work

| File | Purpose |
|---|---|
| `validation.py` | `validate_image()` — requirement 3's actual check, producing `models.validation.ImageValidationResult`. Runs before a job is enqueued, so a malformed upload never occupies a worker slot. |
| `normalization.py` | `normalize_image()` — resize/format-normalize an upload before it's sent to `ai/`, so every model downstream gets consistent input regardless of source resolution/format. |

### `pipelines/`

| File | Purpose |
|---|---|
| `tryon_pipeline.py` | `TRYON_PIPELINE_STAGES` — the **only** place the 7 `WorkflowStage` values are given an order. `models/job.py` deliberately only knows the stage *set* (the enum) and *count* (`len(WorkflowStage)`), not the order, so the two can't drift apart. |

### `postprocess/`

| File | Purpose |
|---|---|
| `result_packaging.py` | `package_result()` — turns the enhancement stage's `EnhancementResult` into the job's final `TryOnResult`, right before `storage/` persists it. |

### `storage/`

| File | Purpose |
|---|---|
| `result_storage.py` | `store_result()` — requirement 10. Persists the final image and returns a `TryOnResult` with `image_uri` pointing at permanent storage. Depends on the generic storage interface planned in `docs/roadmap` Milestone 2 (`app/services/storage/`, not yet built) rather than implementing its own. |

### `api/`

| File | Purpose |
|---|---|
| `router.py` | `ai_router = APIRouter()` — an empty router reserved for `backend/ai/`'s own endpoints (e.g. job-status polling), mirroring `app/api/v1/router.py`'s style. Whether status polling belongs here or directly in `app/api/v1/` is an open question (see below) — not implemented either way in this pass. |

### `utils/`

Empty except for `__init__.py`. Reserved for small shared helpers (URI
handling, logging setup) used across `services/`/`preprocess/`/`postprocess/`.
Nothing is here yet because nothing has needed it yet — added when a real
implementation finds actual duplication to extract, not speculatively.

## Requirement-to-file mapping

| # | Requirement | Where it lives |
|---|---|---|
| 1 | Upload user image | Frontend (built, Phase 5) + future `app/api/v1` upload endpoint — not part of `backend/ai/`, happens before a job exists |
| 2 | Upload clothing image | Same as above |
| 3 | Image validation | `preprocess/validation.py` → `models/validation.py`, run before enqueue |
| 4 | Background processing | Not a stage — this *is* the async mechanism: `services/job_queue.py` (enqueue) + the AI worker process (consume), per ADR 0005 |
| 5 | Pose detection | `WorkflowStage.POSE_DETECTION` → `ai_client.detect_pose()` → `models/pose.py` |
| 6 | Human parsing | `WorkflowStage.HUMAN_PARSING` → `ai_client.parse_human()` → `models/parsing.py` |
| 7 | Virtual try-on | `WorkflowStage.VIRTUAL_TRYON` → `ai_client.generate_tryon()` → `models/tryon.py` |
| 8 | Identity preservation | `WorkflowStage.IDENTITY_PRESERVATION` → `ai_client.preserve_identity()` → `models/identity.py` |
| 9 | Image enhancement | `WorkflowStage.ENHANCEMENT` → `ai_client.enhance_image()` → `models/enhancement.py` |
| 10 | Store generated result | `WorkflowStage.STORING` → `postprocess/result_packaging.py` → `storage/result_storage.py` |

`WorkflowStage.VALIDATING` (requirement 3) is included as a stage even
though the check itself runs pre-enqueue, so a job's status can reflect
"still validating" if that check is later moved to run as part of the
job rather than as an API-layer precondition — a decision this phase
leaves open (see below).

## Data flow

**A. Upload & pre-flight (synchronous, inside the FastAPI request)**
1. Frontend uploads the user photo and garment photo (requirements 1-2)
   to a future `app/api/v1` endpoint — not implemented in this pass.
2. That endpoint calls `preprocess/validation.py::validate_image()` and
   `preprocess/normalization.py::normalize_image()` on both images
   before anything is queued. A failed validation returns an error to
   the client immediately — no job, no worker time spent.

**B. Job creation & enqueue**
3. The endpoint builds a `models.job.TryOnJobCreate` and calls
   `services/job_queue.py::JobQueue.enqueue()`, which (once implemented)
   creates a job record and pushes work onto the `arq` Redis queue, then
   returns a job id to the client immediately — the HTTP request ends
   here. This is the "Background Processing" requirement (4): the API
   never blocks on inference.

**C. Worker consumption & stage execution**
4. The AI worker process (a separate container, not `uvicorn`) dequeues
   the job and calls `services/workflow.py::run_tryon_workflow()`.
5. `run_tryon_workflow()` walks `pipelines/tryon_pipeline.py::TRYON_PIPELINE_STAGES`
   in order. For each stage it calls the matching `services/ai_client.py`
   method, which makes an HTTP call to `ai/` (root) to actually run the
   model, and updates the job's status/stage/progress after each step.
6. After the last GPU-bound stage (`ENHANCEMENT`), `postprocess/result_packaging.py`
   assembles a `models.job.TryOnResult`, and `storage/result_storage.py`
   persists the final image and returns a `TryOnResult` with a permanent
   `image_uri` (`STORING` stage, requirement 10).

**D. Client polling / result delivery**
7. Meanwhile, the frontend polls a future status endpoint (job id from
   step 3), which calls `services/job_queue.py::JobQueue.get_status()`
   and returns the current `TryOnJob` — matching the polling shape
   (`status`/`stepId`/`progress`) the frontend's mocked flow (Phases 6-7)
   already implements, so wiring this up later changes the frontend's
   data *source*, not its polling logic.
8. Once `status == COMPLETED`, `TryOnJob.result.image_uri` is a real
   stored image URL, filling the same field Phase 7's UI already reads
   from mocked data — the "seam" `docs/architecture` established earlier
   in the frontend phases.

## Async processing model (recap)

Full reasoning in `docs/decisions/0005-async-job-processing-via-redis.md`.
Summary: `arq` (async, Redis-backed), producer (`job_queue.py`) inside
the FastAPI process, consumer (the worker, running `workflow.py`) as an
independent process/container. GPU inference itself is still a blocking
call once dispatched — `arq`'s async model governs orchestration and I/O
between stages, not the inference call itself.

## Future scalability

- **Horizontal worker scaling.** The worker is stateless per job (all
  state lives in Postgres/Redis) — running N worker replicas behind the
  same queue is a deployment change, not a code change. Worker count can
  scale independently of API replica count (ADR 0002's "independent
  scaling" made concrete).
- **Per-stage queues.** If one stage (e.g. try-on generation) turns out
  far slower than others, splitting `TRYON_PIPELINE_STAGES` into
  per-stage queues would let that stage scale its own worker pool
  without over-provisioning workers for cheap stages. Not needed until
  a real latency profile shows the imbalance — premature now.
- **GPU batching.** `ai_client.py`'s one-call-per-stage shape doesn't
  preclude `ai/` batching multiple concurrent requests on its side
  before this call ever changes.
- **NVIDIA NIM migration.** `ai_client.py`'s `base_url` is the single
  swap point if/when `ai/`'s locally-loaded models are replaced by
  NIM-hosted endpoints (`NIM_ENDPOINT_URL` placeholder already exists in
  `ai/src/core/config.py`).
- **Model swaps within a stage.** Because contracts (`models/pose.py`,
  `models/tryon.py`, etc.) are generic rather than tied to one model's
  native schema, swapping MediaPipe→DWPose or IDM-VTON→CatVTON is
  contained to `ai/` and the relevant `ai_client.py` method — nothing
  in `services/workflow.py` or `pipelines/` needs to change.
- **Storage backend swap.** `storage/result_storage.py` depends on a
  generic storage interface (planned, not yet built) rather than a
  concrete backend, so moving from local disk (dev) to S3-compatible
  object storage (prod) is a swap below that interface.
- **Caching intermediate results.** Pose/parsing results could be cached
  per source photo (Redis, keyed by image hash) if users commonly retry
  generation against the same photo with different garments — not
  implemented, noted as a viable future optimization given `services/ai_client.py`'s
  per-stage call shape already separates these concerns.

## Explicitly open questions (not decided in this pass)

Carried forward honestly rather than guessed at, matching this project's
established practice of tracking open questions instead of silently
picking an answer:

- **Where does job status actually live?** A Redis hash (fast, matches
  queue locality) vs. a Postgres row (durable, matches the rest of the
  app's persistence model, easier to query historically). `job_queue.py`'s
  interface works either way; the choice is deferred to implementation.
- **Does `backend/ai/api/router.py` get used at all?** Job-status polling
  could live there, or directly in `app/api/v1/` alongside the rest of
  the public API. `router.py` exists as a placeholder for the former;
  the latter is equally plausible and arguably more consistent with
  "one public API surface."
- **Does image validation's "is a person detectable" check stay in
  `preprocess/validation.py`, or fold into the pose detection stage?**
  Both need roughly the same detection work; duplicating it would be
  wasteful. Left open pending the real pose model's actual behavior.
- **Model choice within each stage** (MediaPipe vs. DWPose, IDM-VTON vs.
  CatVTON, InstantID vs. PuLID) — explicitly out of scope; this is
  inference work.
- **camelCase ↔ snake_case translation.** `backend/ai/models/` contracts
  are Python/snake_case (`image_uri`); the frontend's existing types
  (`frontend/src/features/tryon/types.ts`) are TypeScript/camelCase
  (`imageUri`). They match in *shape*, not in wire-format field names.
  No translation layer exists anywhere in this project yet — that's
  `app/schemas/`'s responsibility (e.g. a Pydantic `alias_generator`) at
  the `app/api/v1/` HTTP boundary, once it's built. `backend/ai/` never
  serializes directly to a client, so this doesn't block it — flagged
  here so it isn't assumed solved when `app/schemas/` gets implemented.

## Verification note

No Python interpreter, `pip`, or Docker is available in this environment
(consistent since the project's Phase 0 setup). Every file under
`backend/ai/` was hand-reviewed for syntax correctness — import paths,
type hints, Pydantic v2 usage — but none of it has been executed, type
checked, or import-tested by any tool. This should be verified with
`python -m py_compile` / `mypy` / `pytest` collection at minimum before
any real implementation work begins on top of it.
