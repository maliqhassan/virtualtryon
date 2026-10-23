# Project Status

Last updated: 2026-10-23

## Phase: 26 — Tab bar fix, photo views & background removal, Shop search, wardrobe filters

**Tab bar on Android**: items were bunched at the edges because NativeWind
classes on animated views aren't applied reliably on native.
`PressableScale` now puts layout classes on a plain View (animated view only
scales); tab items also get an inline `flex: 1`. Measured evenly spaced on web.
`FadeInView` rebuilt from opacity/translate (Reanimated `entering` positions
the view absolutely on web, which collapsed its container and made the Shop
search bar overlap the header).

**My photo**: front / side / back views (`user_photos.angle`); try-ons always
use front; replacing a view deletes only that view's old files. Every upload
gets a plain-background cut-out (`cutout_storage_key`) made with MediaPipe's
selfie multiclass segmenter (`MediaPipeService.person_mask`,
`services/photo_background.py`); failures fall back to the original photo.
Real model download + inference verified; the cut-out quality on real
people **not verified** (no real photo available; the cartoon test figure
isn't detected as a person, as expected). Home "You" card shows the cut-out
with a Front/Side/Back switcher; a true 360° view needs 3D/AI and is not built.
New endpoint GET /user-photos (all views); POST takes an `angle` form field.
Migration d5e6f7a8b9c0 (hand-written).

**Shop search**: `q` on GET /products and /stores/{id}/products (title,
category, store name; LIKE wildcards escaped); debounced search bar.
**Wardrobe**: Bags category, category chips with counts. Adding a piece from
Try On returns there with it selected.

**Verified**: 84/84 backend tests (SQLite harness); frontend typecheck/lint
clean; full web click-through incl. side view and search, no errors.

## Phase: 25 — Design refresh, floating tab bar, Shop (sample stores)

**Design**: Instrument Serif display titles (`@expo-google-fonts/instrument-serif`,
loaded before the splash hides), shared `ScreenHeader`, `FadeInView`
(staggered entrance, honours reduce motion), `PressableScale` (spring
press feedback), `Skeleton` loaders, pill buttons with a `dark` variant,
light haptics (`expo-haptics`) on main actions and tab presses, back
buttons on stack screens. Same colour palette. App name/splash rebranded.

**Bottom nav**: custom `FloatingTabBar` (`src/components/floating-tab-bar.tsx`):
floating pill, animated active highlight, raised centre Try On button,
5 tabs (Wardrobe, Shop, Try On, Looks, Account). Lifted by the real
`insets.bottom`, so it sits above gesture, 3-button and no-bar Android
navigation (SDK 55+ is edge-to-edge). Tab screens use `AppScaffold inTabs`
so the bottom inset isn't applied twice. Verified on web only (insets are 0
there); **check on a real Android phone**.

**Shop**: `stores`/`products` tables (migration c4d1e2f3a7b8, hand-written),
public read-only endpoints GET /stores, /stores/{id}/products,
/products, /products/{id}; sample catalogue of 3 fictional stores × 6
drawn products via `python -m app.seed_catalog` (labelled "Sample stores"
in the app; buying disabled). Try-on jobs take `garment_id` **or**
`product_id`; shared `services/clothing.py` resolves either for the worker
and Save to Looks. Shop tab (store rail, category chips, product grid) and
product page with Try it on.

**Review fixes**: each try-on keeps its own copy of the user photo
(replacing the photo no longer breaks queued/saveable try-ons); deleting the
photo removes every copy and unsaved result image; stale queued jobs (>30
min) are cancelled by the worker instead of run uncounted; job completion is
one conditional UPDATE so a concurrent data deletion always wins; "Delete all
my data" is one transaction, files removed after commit; Save to Looks copies
off the event loop and never deletes files of a look that did get saved;
NativeWind classes moved off animated views so changing styles re-apply.

**Verified**: 80/80 backend tests on SQLite harness; ruff/black clean, mypy
only the pre-existing redis error. Frontend typecheck, lint, prettier clean;
full web click-through incl. Shop → product → try-on → save, no browser
errors.

**Known gaps**: free try-on can be re-obtained by dropping X-Device-Id
(needs Firebase sign-in); full-body check fails open if MediaPipe can't
run; both new migrations unverified against Postgres; no payments yet.

## Phase: 24b — Upgraded Expo SDK 54 → 57

So the app opens in the store version of Expo Go (SDK 57) on Android.
`npx expo install expo@^57 --fix`: React Native 0.81 → 0.86.3, React 19.1 →
19.2.3, expo-router 6 → 57, Reanimated 4.1 → 4.5, worklets 0.5 → 0.10,
TypeScript 5.9 → 6.0. `expo-doctor`: 21/21 checks pass. Two code fixes:
tab icon `color` typed as `ColorValue` (tab bar API changed), and
`use-tryon-job-query.ts` no longer resets state inside an effect (new
`react-hooks/set-state-in-effect` lint rule). Verified: typecheck, lint,
prettier clean; full web click-through passes with no browser errors.
Not yet run on a physical device. `npm audit` reports 35 advisories in
transitive dependencies; not auto-fixed (`--force` would break SDK pins).

## Phase: 24 — Simplified app: tabs, My Photo, one-tap try-on, plans & limits (demo AI)

Rebuilt the app around one simple flow: upload one full-body photo once,
add clothes, tap "Try it on". No AI API connected yet: a clearly labelled
demo provider stands in until FASHN is integrated (the chosen provider; see
the conversation's pricing comparison with Google Vertex AI Virtual Try-On).
The user granted full control for this build and approved deleting the old
screens.

**Frontend**: 4 tabs (Try On, Wardrobe, Looks, Account) under
`src/app/(tabs)/`; stack screens onboarding, my-photo, garment/add,
garment/[garmentId], look/[lookId], tryon/[jobId] (processing + result in one
screen), upgrade (plans shown, payments "coming soon"). New features:
my-photo, usage, account, onboarding; features expose small index.ts public
APIs for cross-feature imports. Removed: dev home, old garment-upload flow
(duplicated Wardrobe's add), old photo upload, profile/measurements screens,
old processing/results screens, mock-network fallback. Client image formats
now match the server (JPEG/PNG). Fixed: ThinkingIndicator orb invisible on
web, wardrobe grid's last odd item stretching, tab labels clipped on web.

**Backend**: `users.plan` (free/pro/pro_plus) and
`saved_looks.inference_job_id` (migration b3c9d2e4f5a6, **hand-written —
no DB was reachable; run `alembic upgrade head` then
`alembic revision --autogenerate` to confirm an empty diff**). Allowance
(services/plans.py): Free 1 try-on total, Pro 2/day, Pro Plus 3/day (UTC
reset); counted from jobs (completed, or in-flight < 30 min), enforced with a
row lock, 402 when exhausted. POST /inference-jobs takes only garment_id; the
server uses the caller's current photo (409 if none). New: GET /usage,
GET/DELETE /user-photos/current (upload runs a MediaPipe full-body check;
replacing a photo deletes the old one), POST /saved-looks/from-job (copies
images so deleting a look can't delete wardrobe/photo files; idempotent),
DELETE /account/data (keeps redacted job rows so the free try-on can't be
reset). Worker now stores the generated image and completes jobs; provider
chosen by TRYON_PROVIDER (demo | catvton).

**Verified**: 72/72 backend tests passing on a SQLite copy of the suite
(Postgres/Docker unavailable on this machine — **re-run `pytest` against
Postgres**); MediaPipe analyze test not run (needs model download);
ruff/black clean, mypy clean except pre-existing app/redis/client.py error.
Frontend typecheck, lint, prettier clean. Full click-through in Expo web
(headless Chrome, mocked API): onboarding → photo → 3 garments → try-on →
result → save → limit → upgrade → looks → wardrobe → account → delete data,
no browser errors.

**Known gaps**: payments (Apple IAP via RevenueCat) not built; FASHN not
connected; guest identity means a reinstall/new device gets a new free
try-on until real sign-in exists; /uploads is served without auth
(unguessable UUID names, pre-existing); delete-all-data runs as several
commits, not one transaction; onboarding flag is in-memory on web.

## Phase: 23 — Worker runner infrastructure (Sprint 4 Stage 6)

Gives `WorkerService.run_once()` (Stage 5) somewhere to actually execute
continuously: `WorkerRunner` (new, `app/worker/worker_runner.py`) loops
it on a configurable interval, `app/worker/__main__.py` is the CLI
entrypoint (`python -m app.worker`), and a new `worker` service in
`docker-compose.yml` runs it as its own container — genuinely separate
from `backend`, per ADR 0005's already-stated model, not wired into
FastAPI's own process (that was explicitly ruled out by ADR 0005: "not
FastAPI's `BackgroundTasks`... which is exactly what ADR 0002 already said
not to couple"). No `CatVTON`, no model download, `AIInferenceClient`
untouched, `MediaPipe` untouched — confirmed by scope.

**The approved alternative to volume-mounting root `ai/`, done properly**:
`ai/pyproject.toml` gained real packaging metadata (`[build-system]`,
`[project]` name `virtualtryon-ai`, `[tool.setuptools.packages.find]`),
making its existing `src` package (already the name `ai/`'s own tooling
config treated it as) a genuine installable distribution. `backend/Dockerfile`
now `pip install`s it during the image build (both `backend` and `worker`
share the same Dockerfile/image), and it's `pip install -e`'d into the
local `.venv` too — so `from src.models.inference_client import ...`
resolves identically everywhere (local dev, `backend` container, `worker`
container) via a real installed package, no runtime `sys.path` hack
(removed entirely from `inference_client_provider.py`) and no volume
mount. This also required changing `backend`'s own `docker-compose.yml`
build context from `./backend` to the repo root (`context: ., dockerfile:
backend/Dockerfile`) so the build can reach root `ai/` at all — a new root
`.dockerignore` was added alongside this (previously only `backend/.dockerignore`
existed, scoped to the old, narrower context).

**Structured iteration logging required extending Stage 5's own return
values, not just adding logging** — `WorkerService.run_once()` returned a
bare `int` (jobs attempted); logging "found/processed/failed" as distinct
numbers needed a richer result. `JobProcessor.process_single_job()` now
returns the job's resulting `InferenceJobStatus | None` (`None` = nothing
to do — job not found), and `WorkerService.run_once()` aggregates these
into a new `WorkerRunResult` dataclass (`jobs_found`/`jobs_processed`/
`jobs_failed`/`jobs_completed`). This changes those two files' return
*types*, not their responsibilities or their dependencies — `WorkerService`
still has zero knowledge of `WorkerRunner`, satisfying "keep `WorkerService`
completely independent from the runner" as a one-way dependency, not as
"never touch this file again."

**Two real infrastructure bugs found only by actually building and running
the containers, not by writing config and assuming it would work:**

1. **A fresh named Docker volume defaults to root ownership.** The new
   `storage_uploads` volume (shared between `backend` and `worker`, so the
   worker can read files `backend` wrote — see below) was mounted at
   `/app/storage/uploads`, but that directory never existed in the image
   at build time (only created at runtime, by `app/main.py`'s own
   `mkdir`) — so Docker initialized the volume owned by `root`, and the
   container (running as `appuser`) got `PermissionError` on every upload,
   discovered directly (a real `500` with a full traceback), not
   hypothesized. Fixed: `backend/Dockerfile` now creates
   `storage/uploads` (owned by `appuser`, via the existing `chown -R`)
   *before* the volume is ever first mounted there — Docker copies a new
   volume's initial ownership from whatever the image already has at that
   path, so this makes a brand-new volume writable from the first boot.
2. **`backend` and `worker` are genuinely separate container filesystems**
   — obvious in hindsight, found by watching a real job fail with the
   *wrong* reason (`FileNotFoundError` instead of the real CatVTON
   message) the first time the new `worker` container tried to read a
   file `backend` had written. `backend` never had persistent/shared
   storage before this stage (its uploads lived only in its own
   container's ephemeral layer) — this was never a problem while only one
   container ever touched those files. Fixed with a new shared named
   volume (`storage_uploads:/app/storage/uploads`), mounted into both
   `backend` and `worker`.

**A real, if minor, side effect of fixing #2 above — disclosed directly,
not smoothed over**: adding the shared volume to `backend` required
rebuilding and recreating its container. `backend` had never had
persistent storage before, so its previously-uploaded files existed only
in the old container's now-discarded writable layer — recreating it lost
them. Three pre-existing garment rows (`Flowral double shirt`, `Garment
grey shirt`, `Sirt floweral` — generic-looking manual test data, not
anything this session created) now have `image_url` values pointing at
files that no longer exist anywhere; confirmed unrecoverable (the old
container is gone, no dangling volume or layer holds them). Their DB rows
are intact, only the underlying image files are gone — Wardrobe would now
show a broken image for those three specifically. This is exactly the
kind of consequence worth flagging plainly rather than folding into "test
data cleanup," since it isn't test data.

**New**: `app/worker/worker_runner.py` (`WorkerRunner` — `run()`'s
loop, `_run_iteration()` for one pass with broad exception recovery,
interruptible sleep via `contextlib.suppress(TimeoutError)` around
`asyncio.wait_for` on a shutdown `asyncio.Event`), `app/worker/__main__.py`
(registers `SIGINT`/`SIGTERM` handlers calling `request_shutdown()`;
degrades gracefully — a logged warning, not a crash — on platforms where
`asyncio`'s signal handling isn't supported, i.e. local Windows dev;
Linux, the real deployment target, supports both). **Modified**:
`app/core/config.py` (+`WORKER_POLL_INTERVAL_SECONDS: float = 5.0`),
`app/worker/job_processor.py`/`worker_service.py` (richer return types,
above), `app/worker/inference_client_provider.py` (dropped the `sys.path`
hack), `backend/Dockerfile`, `docker-compose.yml` (root build context,
new `worker` service, new `storage_uploads` volume shared with `backend`),
`ai/pyproject.toml` (packaging metadata). New: root `.dockerignore`.
`tests/test_worker_runner.py` (4 cases: a real queued job processed via
`_run_iteration()`; exception recovery via a patched `WorkerService`
raising; `request_shutdown()` stopping the loop promptly against a
deliberately long poll interval; the same for a shutdown requested mid-sleep).

**Verified for real, twice — as a directly-callable class, and as an
actual separate running container:**
- 52/52 backend `pytest` (48 pre-existing + 4 new), `black`/`ruff`/`mypy`
  clean.
- Built and ran the real `worker` Docker image (`docker compose build
  worker` → `up -d worker`), confirmed it logs a real structured
  iteration on its own schedule with zero jobs queued
  (`jobs_found=0 jobs_processed=0 jobs_failed=0 jobs_completed=0`).
- Created a real job via `curl` against the live `backend` and, without
  running any script or touching the worker at all, watched it get
  picked up automatically within one poll interval and transition to
  `failed` with the genuine `CatVTONInferenceClient` message and both
  timestamps set — the first time this project's AI job pipeline has run
  fully unattended, end to end, from HTTP request to worker completion.
- `docker stop` (a real `SIGTERM`) against the running `worker` container:
  logs show `"worker runner stopped"` within ~1.2 seconds — the
  interruptible sleep working for real, not just in a unit test, well
  under the 5-second poll interval it would otherwise have waited out.
- All test-created rows/files (across `garments`/`user_photos`/
  `inference_jobs` and two orphaned files in the shared volume) cleaned up
  directly; the three real, pre-existing garments' now-broken image
  references were identified and left as-is (nothing to clean up — the
  rows are real, only their files are gone, per the disclosure above).

### Reviews

**Code review**: `WorkerRunner`'s split between `_run_iteration()` (one
pass, broad exception recovery) and `run()` (the loop, checking shutdown
both between iterations and during the sleep) makes both independently
testable without an actual multi-second wait in the test suite.

**Architecture review**: dependency direction confirmed one-way —
`WorkerRunner` imports `WorkerService`; nothing under `worker_service.py`/
`job_processor.py`/`inference_worker.py` imports or knows about
`worker_runner.py` at all. The runner contains zero job-processing logic
of its own (no repository, no DB query, no `InferenceWorker` reference),
satisfying "the runner must only orchestrate execution." `backend` and
`worker` sharing one Dockerfile/image (different `command:` only) means
there's exactly one place that installs dependencies or builds the `ai/`
package — no drift possible between what each container can import.

**Security review**: no HTTP surface for this layer, same trusted-
infrastructure posture as Stage 5. The `worker` service has no exposed
port in `docker-compose.yml` (unlike `backend`'s `8000:8000`) — it isn't
reachable from outside the compose network at all. Signal handlers only
ever call `request_shutdown()` (a no-argument, idempotent method) — no
signal-driven code path takes external input or does anything a
compromised signal sender could turn into more than "stop a bit early."

**Known gaps and technical debt, stated honestly**:
- **The three real garments' broken image files, disclosed above** — not
  fixed (unrecoverable), but not hidden either.
- **No real scheduling/locking still** — `WorkerRunner` is one process
  polling alone; running two `worker` replicas would double-process
  queued jobs, same gap Stage 5 already named, now inherited unchanged.
- **`storage_uploads` is a local named volume** — fine for one Docker
  host, not a real multi-host storage story; matches this project's
  already-repo-wide "local disk now, S3-compatible deferred on purpose"
  decision (`docs/roadmap/README.md`'s cross-cutting decision #3), not a
  new gap.
- **No health check on the `worker` service** in `docker-compose.yml`
  (unlike `postgres`/`redis`, which have one) — `restart: unless-stopped`
  means Docker restarts it if the process exits, but nothing actively
  probes "is it actually still polling." Not built, since nothing asked
  for it and the runner's own exception-recovery already covers the more
  likely failure mode (a bad iteration, not a hung process).
- No rate limiting (repo-wide gap, restated — still no HTTP surface for
  it to apply to here).

## Phase: 22 — AI inference worker layer (Sprint 4 Stage 4, backend only)

Implements the layer ADR 0008 deferred: something that actually reads a
`queued` `InferenceJob` and advances it, replacing "jobs remain queued
forever" with a real (if currently-always-failing) attempt. Three classes
under a new `backend/app/worker/` package: `InferenceWorker` (low-level
adapter — job's stored images → `AIInferenceRequest` → `AIInferenceClient.infer()`
→ result/failure, no DB knowledge at all), `JobProcessor` (one job's full
lifecycle: fetch → `mark_processing` → attempt → `mark_failed`, calling
only the existing, unchanged `app/services/inference_jobs.py` functions —
never mutates a row itself), `WorkerService` (the outer entrypoint —
`run_once()` processes every currently-queued job; `process_single_job(job_id)`
processes one, added specifically so a future real queue consumer can
dispatch by id without this layer being redesigned around it). No
inference, no `CatVTON` implementation, no model download, `MediaPipe`
untouched — confirmed by diff.

**A real conflict between the requirements and the existing default
wiring, found before writing code, not after**: `VirtualTryOnEngineRegistry.create()`
(Phase 12) defaults every engine to `LocalStubInferenceClient`, which does
*not* raise — it returns a real (if solid-gray placeholder) image. Routing
the worker through that existing registry would have made every job
"succeed" with fake content, directly violating "never fake a completed
image, never generate placeholder images." The worker bypasses
`VirtualTryOnEngineRegistry` entirely and is wired to `CatVTONInferenceClient`
instead — the one `AIInferenceClient` implementation that actually raises
`NotImplementedError` today, which is the honest behavior this layer
exists to handle.

**Approved deviation from my own proposed design, applied as directed**:
I originally proposed a new ADR (0009) recording a narrow exception to
ADR 0004 (root `ai/`'s `AIInferenceClient` is documented as "entirely
internal to `ai/`"; the worker needs it directly, crossing that boundary).
Per explicit instruction, no ADR was added — this section *is* that
documentation instead, kept lighter-weight on purpose:

- **`app/worker/inference_client_provider.py` is the only file in this
  package that names `CatVTONInferenceClient` or reaches into root `ai/`
  at all.** `InferenceWorker`/`JobProcessor`/`WorkerService` depend only
  on the injected `AIInferenceClient` abstraction — swapping which
  concrete client is active means changing this one function's body,
  nothing that calls it.
- **This is a temporary development arrangement, not a settled boundary.**
  Root `ai/` has no database access of its own and was never meant to be
  imported directly by `backend/` (ADR 0004: "always over HTTP, never a
  direct Python import"). This import exists so the worker has something
  real to call today, ahead of resolving that properly — e.g., a real
  HTTP call into `ai/` once it has an inference endpoint of its own.
- **A real, non-obvious import-path bug found and fixed while building
  this**: root `ai/` has no top-level `__init__.py` of its own (only
  `ai/src/__init__.py` does), so the bare name `ai` *always* resolves to
  `backend/ai/` (Phase 8's orchestration package, which does have one) —
  confirmed directly (`import ai; ai.__file__` → `backend/ai/__init__.py`,
  regardless of `sys.path` order). `inference_client_provider.py` instead
  adds `ai/`'s own directory to `sys.path` and imports `src.models...`
  directly — matching how `ai/`'s own tooling already treats itself
  (`ai/pyproject.toml`'s `known_first_party = ["src"]`), and confirmed
  working via a standalone script before it was relied on anywhere real.
- **This import path only resolves in local dev today, not inside the
  running Docker container** — found while verifying, not assumed. Root
  `ai/` isn't volume-mounted into the `backend` container at all (only
  `backend/ai/`, the orchestration package, is), and `backend/app/storage/uploads`
  isn't shared between the container and a locally-run script either
  (confirmed directly: 11 files in the container's `/app/storage/uploads`
  vs. 104 on the host filesystem at the time — two genuinely separate
  directories). The worker is real and fully tested via `pytest` and a
  standalone local script (both run entirely in one consistent local
  process), but running it *inside* the deployed container as it exists
  today would fail to import `ai/` at all. Making that resolve for real
  (mounting root `ai/` into the container, or an equivalent fix) is
  necessary infrastructure work this stage didn't include, not something
  papered over.

**A real bug found via actual execution, not hypothesized**: the first
`pytest` run crashed outright — `InferenceWorker.attempt()` only wrapped
the `AIInferenceClient.infer()` call in a try/except, not the image-load/
decode step before it. A job whose `user_image_storage_key` doesn't
resolve to a real file (a stale mock-fallback value, or — as actually
happened, a pre-existing test fixture in `test_inference_jobs.py` that
uses a literal placeholder string, never a real file) raised an uncaught
`FileNotFoundError` that propagated straight out of `run_once()`'s loop,
crashing the whole batch and leaving one earlier job stranded in
`processing` forever (found afterward, cleaned up directly). Fixed by
moving the image-load/decode inside the same try/except as the inference
call — any failure in this method now cleanly fails just that one job.
Re-verified: `run_once()` no longer crashes given a mixed batch of
good and bad jobs.

**New**: `app/worker/{__init__,inference_client_provider,inference_worker,job_processor,worker_service}.py`.
**Modified**: `app/db/repositories/garment_repository.py` (+`get_by_id`,
unscoped — same "for the worker's internal use" reasoning as `InferenceJobRepository.get_by_id`,
Sprint 4 Stage 1), `app/db/repositories/inference_job_repository.py`
(+`list_queued`, unscoped across every guest). `tests/test_worker.py` (5
cases: a real queued→processing→failed transition with the real
`CatVTONInferenceClient` message and both timestamps set; a missing-job-id
no-op; the garment-deleted-after-job-created failure path; the generic-
error-message security fix below; `run_once()` processing more than one
queued job).

**Verified for real**: 48/48 backend `pytest` (43 pre-existing + 5 new),
`black`/`ruff`/`mypy` clean. A clean standalone local script (not just
`pytest`'s assertions) created a real user, garment, and queued job with
real stored image files, ran `WorkerService.process_single_job()` against
it, and printed the real before/after state: `queued` (no timestamps, no
error) → `failed` (both timestamps set, the genuine `CatVTONInferenceClient`
message) — then cleaned up the user/garment/job rows and both stored
files itself. All test data created via `curl`/`pytest` during this
phase's verification (27 jobs, 13 user photos, 31 garments, cross-checked
by title/timestamp against 3 rows of real, unrelated user data) removed
directly from the dev database afterward.

### Reviews

**Code review**: `InferenceWorker`/`JobProcessor`/`WorkerService`'s
three-way split matches the three names requested exactly, with a clean
dependency direction (`WorkerService` → `JobProcessor` → `InferenceWorker`
→ `AIInferenceClient`). The image-load bug (above) was a real gap this
review process caught by actually running the suite, not by inspection.

**Architecture review**: the worker depends on `AIInferenceClient` only,
never `CatVTONEngine`/`CatVTONInferenceClient` outside the one factory
function, satisfying "isolated so another inference engine can replace
CatVTON later" concretely — replacing it means editing
`get_inference_client()`'s single return statement. `CatVTONEngine`
itself (root `ai/`'s `VirtualTryOnEngine` implementation) is untouched;
this worker doesn't go through it at all, on purpose (that's the "which
model" pluggability axis, ADR 0006 — a different concern from "how does
the worker get *an* `AIInferenceClient` today").

**Security review**: no HTTP surface, no new authz boundary — this layer
runs as trusted internal infrastructure, deliberately unscoped across
users (a worker processes whatever is queued, not "the current guest's").
Confirmed the same for the two new repository methods (`get_by_id`,
`list_queued`) — both plain, parameterized SQLAlchemy queries, no raw
SQL, no client input reaches them at all (they take a `UUID`/nothing,
never a request body). Grep-confirmed `app/worker/` is never imported
from `app/api/` at all, so the unscoped queries genuinely have no
HTTP-reachable path today.

**One real finding, fixed**: a dedicated security-review pass caught that
`InferenceWorker.attempt()` stored the *raw* exception text from a failed
image load (`str(exc)`, e.g. `FileNotFoundError`'s message) directly into
`InferenceJob.error_message` — which the job's own owning guest can read
back verbatim via the existing, unchanged `GET /api/v1/inference-jobs/{id}`.
A missing/unreadable stored file would have leaked the server's storage
directory layout to that guest. Fixed by splitting the image-load and the
inference-call into separate try/except blocks: load failures now log the
full exception server-side (`logger.exception`) but return a fixed,
generic message (`GENERIC_LOAD_FAILURE_MESSAGE`) to the job; the inference
client's own exception text (e.g. `CatVTONInferenceClient`'s) is kept
verbatim, since that message is authored and deliberately safe to show,
unlike a raw filesystem error. New test
(`test_missing_stored_file_gets_a_generic_error_message`) creates a real
job, deletes its underlying stored file via `StorageService.delete()`,
processes it, and asserts the returned error message is the generic one
and contains neither "storage" nor "uploads".

**Known gaps and technical debt, stated honestly**:
- **No real scheduling or locking.** `run_once()`/`process_single_job()`
  are directly callable Python, not wired to `arq`/Redis (ADR 0005's own
  still-separately-scoped future work) or any process/container of their
  own. Nothing prevents two concurrent invocations from double-processing
  the same job — real production locking (`SELECT ... FOR UPDATE SKIP LOCKED`
  or equivalent) is unbuilt, by explicit scope, not forgotten.
- **The `ai/` import doesn't resolve inside the actual deployed container**
  — see above. Needs real infrastructure work (a volume mount at minimum)
  before this worker could run as part of the normal `docker compose`
  stack rather than a local script.
- **The success path is unbuilt.** `JobProcessor` logs (not crashes, not
  silently drops) if `AIInferenceClient.infer()` ever returns a real
  response, but doesn't persist a generated image or call `mark_completed`
  — building that is real image-generation-pipeline territory this stage
  was explicitly told not to implement. Unreachable today regardless,
  since `CatVTONInferenceClient` always raises.
- **No automated test exercises `run_once()` racing itself or a truly
  concurrent invocation** — the "no locking" gap above is stated, not
  separately proven to be safe or unsafe under real concurrency.
- No rate limiting (repo-wide gap, restated — though this layer has no
  HTTP surface for that to apply to).

## Phase: 21 — UserPhoto upload (Sprint 4 Stage 3, backend + frontend)

Closes the one remaining mock input in the real try-on flow: `preparePhoto()`
was still always falling back to a fake storage-key string (no real
endpoint existed — Phase 5's original gap, restated as a known limitation
in every prior phase since). `POST /api/v1/user-photos` now exists, and a
real job's `user_image_storage_key` is a genuine, backend-stored file
reference end to end — confirmed directly in the database, not just
inferred from a 201.

**Backend**: `app/models/user_photo.py` (`UserPhoto` — `id`, `user_id` FK,
`storage_key`, `created_at`; deliberately minimal, matching Profile's own
precedent of building only the CRUD surface actually requested — no
rename/list/delete operation exists here, only `create`, since nothing
asked for more), `app/db/repositories/user_photo_repository.py` (`create`
only, same reasoning), `app/schemas/user_photo.py` (`UserPhotoResponse`:
`id`/`storage_key`/`image_url`/`created_at`), `app/services/user_photos.py`
(reuses `image_validation.validate_image`/`ImageUpload` and
`storage.get_storage_service()` completely unchanged — no duplicated
upload/validation logic, per the explicit requirement), `app/api/v1/endpoints/user_photos.py`
(`POST` only, mirroring Garment's exact create-endpoint shape minus the
title/category form fields it has no use for), new Alembic migration (no
enum this time, nothing to fix on downgrade). **Modified**:
`app/models/__init__.py`, `app/api/v1/router.py` (mounts `/user-photos`).
`tests/test_user_photos.py` (4 cases: success — asserting `image_url ===
storage_key` and a real `/uploads/` prefix — bad content type, oversized
upload, device-id issuance).

**One naming design worth explaining, not just declaring**:
`UserPhotoResponse` exposes both `storage_key` and `image_url` as
requested, but the model stores only one column. `image_url` is a plain
Python `@property` on the ORM model returning `self.storage_key` — the
same underlying value under two names for two different consumers
(`storage_key` for whatever references this photo when creating an
`InferenceJob`; `image_url` for whatever eventually displays it), not two
columns that could drift out of sync. `UserPhotoResponse.model_validate()`
reads both correctly via `from_attributes=True` since a property is just
as readable as a mapped column to Pydantic.

**Frontend**: `features/user-photo/services/prepare-photo.ts` rewritten to
mirror `prepare-garment.ts`'s exact structure — real upload attempt first,
`BackendUnavailableError` still falls back to the same mock as before (not
removed; the demo flow shouldn't hard-depend on backend availability any
more than the garment flow does). `features/user-photo/types.ts`'s
`PreparePhotoResponse` doc comment updated to state plainly that `photoId`
now holds the backend's `storage_key`, not the `UserPhoto` row's own `id`
— `InferenceJob.user_image_storage_key` was never given a foreign key to
this table (`docs/decisions/0008`), so the storage key itself, not a row
id, is the value that has to flow through. **Zero other frontend files
touched** — traced the existing `usePreparePhoto()` hook's
`setPreparedResult({ id: data.photoId, ... })` mapping and confirmed the
real storage key already flows automatically through the upload-session
store into `useTryOnJob`'s `userPhotoId` input and then into
`createTryOnJob`'s `user_image_storage_key` field, with no code path left
assuming the old mock shape.

**Verified for real, against the live backend**: `curl` — real upload,
`storage_key`/`image_url` identical, both real `/uploads/` paths; bad
content-type and oversized-upload rejections still 422. Playwright, full
client-side-navigation flow (learned from Stage 2's own navigation
mistake, not repeated here): real photo upload (`201`, no longer the mock
fallback) → real garment upload (`201`) → processing screen auto-starts a
real job (`201`) → **the created `InferenceJob` row's
`user_image_storage_key` column queried directly and confirmed to be the
real stored path** (`/uploads/<uuid>.png`), not a `mock-<timestamp>`
string — the actual end-to-end proof this feature exists to deliver, not
just a passing HTTP status. 43/43 backend `pytest` (39 pre-existing + 4
new), `black`/`ruff`/`mypy` clean. `tsc`/`expo lint`/`prettier` clean on
the frontend. All test-created rows across three tables (12 garments, 3
user photos, 10 inference jobs — accumulated across both the backend
`pytest` run and the Playwright pass) cleaned up directly against the dev
database, cross-referenced by title/timestamp against known real user
data first.

### Reviews

**Code review**: the `image_url` property-not-column design is the one
piece of new reasoning this feature needed; everything else is a close
mirror of Garment's existing upload path. Frontend change is a single
rewritten service function plus a doc-comment update — traced, not
assumed, that nothing else needed touching.

**Architecture review**: layering matches Garment/Saved Looks/Profile
exactly. `UserPhoto` and `InferenceJob` remain genuinely decoupled — no
FK between them, matching the InferenceJob design's own original
reasoning (a plain storage-key string, specifically so it wouldn't need a
`UserPhoto` table to exist yet). Now that one does exist, that decoupling
is a deliberate carry-over, not an oversight — revisited below.

**Security review**: dedicated sub-agent trace, no high-confidence
findings. Filename handling confirmed safe (client-supplied filename is
read into `ImageUpload.filename` but never used to construct a path;
`LocalStorageProvider` always mints its own `uuid4()` filename). No SQL
injection surface (ORM-only). No IDOR surface (confirmed by reading the
router directly: no GET/list/update/delete route exists for this
resource, so nothing can read a photo back across users). No mass
assignment (`repo.create()` called with exactly two hardcoded,
server-resolved kwargs, never a spread request payload).

**The sub-agent surfaced, unprompted, the same gap flagged in scoping this
feature — restated here plainly, not buried**: `InferenceJob` creation
still accepts `user_image_storage_key` as an unvalidated free-form string
— it does not check that the given key corresponds to a `UserPhoto` row
actually owned by the calling guest (unlike `garment_id`, which *is*
ownership-checked against the caller). A guest could submit an arbitrary
or another guest's storage_key string and create a job referencing it.
This was a deliberate scoping decision, not an oversight: requirement #8
said not to modify the `InferenceJob` schema, and adding this check would
mean modifying `app/services/inference_jobs.py`'s creation logic — beyond
what Sprint 4 Stage 3 asked for. Flagging it explicitly rather than
letting it look resolved just because a real `UserPhoto` table now
exists.

**Known gaps and technical debt, stated honestly**:
- The IDOR-style gap above — `InferenceJob` doesn't cross-check
  `user_image_storage_key` against an owned `UserPhoto` row. Worth a
  dedicated follow-up if this feature line continues.
- `UserPhotoRepository` has only `create` — no way to list, inspect, or
  delete a user's uploaded photos via the API. Not requested; consistent
  with Profile's own "build only what's asked" precedent, not an
  inconsistency.
- No automated frontend test coverage was added (standing gap since
  Phase 4/5, not new here).
- Uploaded photo files have no retention/cleanup policy — same
  repo-wide gap already named for Saved Looks/Garment images.
- No rate limiting (repo-wide gap, restated again).

## Phase: 20 — AI inference job pipeline, Stage 2 (frontend wired to the real job API)

Replaces the frontend-only mock try-on job (Phase 6's in-memory `Map`,
`runJobProgression`'s fake 3-step timer) with real calls to Phase 19's
backend: `POST`/`GET /api/v1/inference-jobs`. No backend, schema, or
endpoint changes — confirmed by diff, not just by not opening those files.
No inference, no CatVTON, no MediaPipe changes, exactly as scoped.

**The mock and real contracts didn't overlap as cleanly as "swap the
service file" implies — surfaced in the design brief, handled here as
planned.** The mock had `status: pending|processing|completed|failed`
plus fake `stepId`/`stepIndex`/`stepCount`/`progress` and a `result`
object (`imageUri`/`isMock`/`mockCaption`/`reasoning`). The real backend
has `status: queued|processing|completed|failed` (note: `queued`, matching
Phase 19's real vocabulary, not the mock's `pending`) and none of the
fine-grained fields — Stage 1 never built per-stage tracking. Dropped all
of them from `features/tryon/types.ts` rather than inventing values to
fill the old shape: `TryOnJobStatus`, `TryOnJob` (now just
`id`/`garmentId`/`generatedImageUrl`/`status`/`errorMessage`/`startedAt`/
`completedAt`). `TryOnStepId`/`TryOnResult` deleted outright, not
deprecated-and-ignored.

**New, bounded polling — the one behavior change beyond a straight
swap**: `hooks/use-tryon-job-query.ts` still shares one polling query
between the processing and results screens (Phase 7's extraction,
unchanged in shape), but `refetchInterval` now stops after a real 10-second
window (1 poll/second) tracked via a plain timestamp ref, not a fake
progress simulation — with no worker to ever advance a `queued` job, the
old unbounded interval would have polled forever for no reason. A second
`useEffect` with its own `setTimeout` flips a `pollingTimedOut` flag at
that same 10-second mark, purely to trigger a re-render at the right
moment (TanStack Query's own scheduler doesn't otherwise notify anyone
when it decides to *stop* polling) — the underlying poll itself is
otherwise untouched and keeps running if a worker ever does start
advancing the job mid-session. `refetch` is exposed alongside it for a
real manual "try asking again" action, not a status simulation.

**`tryon-processing-screen.tsx`**: same three-branch shape (not-ready /
working / failed) preserved exactly, per the requirement to keep existing
structure. Inside "working," dropped `AppProgressBar` and the fake
percentage/step-label entirely — replaced by a bare `ThinkingIndicator`
showing "Queued…"/"Processing…"/"Starting…" (matching how Wardrobe/Saved
Looks/Profile already show loading state elsewhere in this app, no
numbers anywhere) — and, once `pollingTimedOut`, the exact required
message plus a Refresh button calling the exposed `refetch`. `processing`/
`completed` branches (including the existing `router.replace` to Results
on `completed`) are kept structurally present even though unreachable
today with no worker — forward-compatible, not dead code to be removed.

**`tryon-results-screen.tsx`**: minimal fix-up only, as scoped — swapped
`job.result.imageUri`/`.reasoning`/`.mockCaption` for `job.generatedImageUrl`
directly (no fake reasoning caption; the real backend has no such field).
Loading/error/failed/still-processing/completed branches and the Save/
Share/Retry buttons are otherwise untouched.

**Modified**: `features/tryon/{types.ts,services/tryon-job.ts,hooks/use-tryon-job.ts,hooks/use-tryon-job-query.ts,screens/tryon-processing-screen.tsx,screens/tryon-results-screen.tsx,components/result-canvas.tsx}`
(the last one only a stale comment referencing the deleted `TryOnResult`
type, corrected for accuracy). Navigation (`app/tryon-processing.tsx`,
`app/tryon-results/[jobId].tsx`, both existing `Link`s into this flow) is
untouched, since nothing about the routes themselves changed.

**Verified for real, against the live backend, with a real navigation
mistake caught before drawing conclusions**: the first two Playwright
passes used `page.goto()` between the photo-upload, garment-upload, and
processing screens — each one a full page reload, which silently wiped
the in-memory Zustand session stores (`preparedResult` for both photo and
garment) between steps, exactly the same class of issue as this session's
own in-memory web device-identity resets. The processing screen correctly
showed "Almost there" (not enough inputs ready) both times — correct
behavior given what actually happened, not a bug, but not what was being
tested either. Corrected by driving the entire flow through in-app
client-side navigation (clicking through, one initial page load only),
after which the real flow worked end to end: real photo prepare (still
mock-fallback — `POST /api/v1/uploads/user-photo` still doesn't exist, a
pre-existing Phase 5 gap untouched by this feature) → real garment prepare
(`POST /api/v1/garments`, `201`) → processing screen auto-starts a real
job (`POST /api/v1/inference-jobs`, `201`) → `GET .../{id}` polls exactly
once per second → shows "Queued…" with no fake numbers → at the 10-second
mark, switches to the exact required message and a working Refresh button
that re-fetches for real (confirmed via one additional live `GET`, still
`queued`, message persists correctly rather than breaking). Zero console
errors beyond the expected, pre-existing `404` from the still-unbuilt
user-photo endpoint. `tsc --noEmit`, `expo lint`, `prettier --check` all
clean. Test-created rows (1 job, 3 garments) cleaned up directly against
the dev database afterward — cross-referenced against real user data
found mixed in (one garment had even been renamed by real use between
sessions) and left untouched, same discipline as every prior cleanup this
sprint.

### Reviews

**Code review**: the bounded-polling implementation is the one genuinely
new piece of logic this stage (everything else is closer to a type/shape
swap) — it's covered by the manual verification above (real 1s cadence,
real 10s cutoff, real Refresh) rather than an automated test, since this
feature has no frontend test suite to add to (consistent with this app's
standing gap, restated below, not new here).

**Architecture review**: networking stayed entirely inside the existing
services/hooks structure — no new API client, no new store, no new
polling mechanism invented (the bounded window reuses `refetchInterval`,
just with a real stop condition instead of none). `useTryOnJobQuery`
remains the single shared source of truth for both screens that read a
job, matching Phase 7's own reason for extracting it in the first place.

**Security review**: no new attack surface — same `apiClient`/device-
identity interceptor as every other feature, no new endpoint, no new
input accepted from the user beyond what `use-tryon-job.ts` already
passed through (`userPhotoId`/`garmentId`, unchanged shape). Worth
restating plainly, not hiding: a real job's `user_image_storage_key` is
still always a client-side mock string today, since no real user-photo
upload endpoint exists — Phase 19's own already-documented gap, not
introduced or worsened here.

**Known gaps and technical debt, stated honestly**:
- No real inference worker exists, so every real job created today stays
  `queued` forever — this stage makes that fact visible and honest
  instead of hiding it behind fake progress, but doesn't change the
  underlying reality that nothing generates a try-on yet.
- User-photo upload is still 100% mock (Phase 5's original gap) — the
  "user photo" side of a real job is not actually backed by real stored
  data, only the "garment" side is. Building a real upload endpoint is
  outside this stage's scope and is a backend change this stage was
  explicitly told not to make.
- The Results screen's `completed`/non-`completed` branches, and the
  processing screen's `completed`-triggered redirect, are currently
  unreachable by any real flow — correct as written, unverifiable end to
  end until a worker exists to actually complete a job.
- No automated test coverage was added for the bounded-polling hook or
  either screen — this app has no frontend test suite yet at all
  (standing gap since Phase 4/5), not a regression introduced by this
  feature.
- `AppProgressBar` (Phase 5's shared component) has no remaining
  consumer after this change — left in place rather than deleted, since
  removing a shared component isn't this feature's call to make
  unilaterally and nothing asked for it.

## Phase: 19 — AI inference job pipeline, Stage 1 (persisted job CRUD, no inference)

`InferenceJob` model, migration, repository, service, schemas, and three
REST endpoints (`GET`/`POST /api/v1/inference-jobs`, `GET /api/v1/inference-jobs/{id}`)
— replaces nothing yet (the frontend's mock try-on job, Phase 6, is
untouched), but is the real, persisted, guest-scoped job entity that will
eventually back it. No inference, no `CatVTON`, no model download, no
change to MediaPipe or the `AIInferenceClient` abstraction (Phase 12) —
all confirmed by scope, not just assumed.

**Three overlapping, never-reconciled designs found and reconciled by
documentation, not by picking one silently**: `docs/roadmap/phase-a-core-loop.md`
Milestone 4 (never built) planned a `TryOnJob` model with a `user_photo_id`
FK to a `UserPhoto` table that itself was never built (user-photo upload
has been frontend-mock-only since Phase 3/5). `backend/ai/models/job.py`
(Phase 8, built) is an in-memory-only `TryOnJob`/`TryOnJobStatus.PENDING`/
`WorkflowStage` contract whose own docstring called "where job state lives"
an open question — even though `docs/decisions/0005-async-job-processing-via-redis.md`'s
Consequences section had already asserted the answer ("status lives in
Postgres") without ever implementing it. **New**:
`docs/decisions/0008-inference-job-persistence.md` records this feature as
that deferred implementation: `InferenceJob`/`queued` (this feature's
vocabulary) is deliberately distinct from `TryOnJob`/`pending`/`WorkflowStage`
(Phase 8's future-worker vocabulary) — not a rename, not a merge, two
different layers documented as such so nobody rediscovers this as
confusion later. `docs/roadmap/phase-b-platform.md`'s Milestone 12 ADR
earmarks bumped again (0008/0009 → 0009/0010 — the fourth time, per that
file's own running note).

**The one approved change from the original design brief, applied before
writing any code**: `user_image_storage_key` (not `user_image_url`) —
a backend-controlled storage reference, never an arbitrary client-supplied
URL. Enforced two ways, not just by naming: (1) the column itself, and
(2) `CreateInferenceJobRequest`'s Pydantic `field_validator` rejects any
value containing `"://"`, so no absolute URL (`http://`, `https://`,
`file://`, ...) can ever be stored, verified with a real request against
the live backend (`422`, not silently accepted). "storage_key" over
"path" specifically because `docs/roadmap/README.md`'s planned
S3-compatible storage swap addresses objects by key, not path — the name
should already read naturally once that swap happens, not need renaming
again. `garment_id`, unlike `SavedLook`'s original image-URL-only design
(built before `Garment` existed to FK against), **is** a real FK to
`garments.id` — ownership re-validated at creation (404 if the referenced
garment doesn't belong to the resolved guest), the one place this feature
could otherwise leak whether another guest's garment id exists.
`profile_id` is auto-attached server-side if one exists (never a
client-supplied field — no reason a client would ever pick a *different*
profile than its own). `started_at`/`completed_at` (both nullable) added
per the approved brief, to support real processing-time metrics once a
worker exists — currently only ever set by the internal
`mark_processing`/`mark_completed`/`mark_failed` service functions, never
by any HTTP endpoint.

**New**: `app/models/inference_job.py` (`InferenceJobStatus` — a real
Postgres enum via `StrEnum`, matching `User.auth_provider`'s precedent, not
`Garment.category`'s open-string one, since `queued|processing|completed|failed`
is a genuinely closed set), `app/db/repositories/inference_job_repository.py`
(`get_by_id_for_user` for HTTP endpoints vs. `get_by_id` — unscoped, for
the future worker's internal transition calls; documented why both exist
rather than picking one), `app/services/inference_jobs.py`
(`InvalidGarmentReferenceError`/`InferenceJobNotFoundError` → `404`;
`mark_processing`/`mark_completed`/`mark_failed` take a bare `job_id`, no
`user_id` — a trusted-infrastructure caller, not a guest request, so the
IDOR-scoping every other lookup here uses doesn't apply to them),
`app/schemas/inference_job.py`, `app/api/v1/endpoints/inference_jobs.py`
(**deliberately only `GET`/`POST`** — no `PATCH`/`DELETE` exist for this
resource at all, confirmed live against the running server: both return
`405`, not just assumed from the missing route registration),
`tests/test_inference_jobs.py` (12 cases — creation, the external-URL
rejection, both IDOR checks (wrong-device create *and* wrong-device get),
profile auto-attach with and without an existing profile, list/get
scoping, the four-way `405` check, and the three internal transition
functions exercised directly since they have no HTTP surface to test
through). **Modified**: `app/models/__init__.py`, `app/api/v1/router.py`
(mounts `/inference-jobs`).

**A migration risk specifically re-verified, not just written**: this is
the second-ever enum column in this backend (after `User.auth_provider`,
Phase 13) — autogenerate's `downgrade()` doesn't drop the Postgres enum
type it creates, which collided as "type already exists" on re-upgrade the
first time this was hit (Phase 13). Added the explicit `sa.Enum(...).drop()`
call to this migration's `downgrade()` *before* it could be hit again, then
proved it actually works rather than assuming: ran `alembic downgrade -1`,
confirmed the enum type was actually gone (`pg_type` query, zero rows),
then `alembic upgrade head` again — clean, no collision.

**Verified for real, against the live backend**: full flow via `curl` with
a correctly-captured server-issued device id — external-URL storage key →
`422`; valid create → `201`, `status=queued`, all nullable fields
genuinely null; `GET` by id and list both return it; `PATCH`/`DELETE`
against both the collection and the item routes → `405`; a different
device's `GET` by id → `404`. Swagger UI confirmed loading with exactly
three operations (`GET`/`POST`/`GET /{job_id}`) in the live OpenAPI schema
— no fourth or fifth operation leaked in by accident. 39/39 `pytest` (27
pre-existing + 12 new), `black`, `ruff`, `mypy` clean. All test-created
rows (10 jobs, 12 garments, 8 profiles) deleted directly against the dev
database afterward — cross-referenced against real, non-test data found
mixed in (two profiles, two garments genuinely unrelated to any test
fixture or script this session used) and left those untouched rather than
assuming everything in the table was safe to wipe.

**Known gaps, stated not hidden**: `backend/ai/`'s Phase 8 stubs
(`job.py`/`job_queue.py`/`workflow.py`/`ai_client.py`) remain completely
unimplemented and unconnected to `InferenceJob` — this stage doesn't wire
them together, only documents where the connection will happen (ADR
0008). No rate limiting (repo-wide gap, restated). No way to explicitly
clear an optional field back to `null` via the internal transition
methods — same inherited repository `update()` convention as every other
feature. No `UserPhoto` model exists, so nothing yet produces a real
`user_image_storage_key` for a live client to send — Stage 1 accepts
whatever backend-shaped string it's given; a real user-photo upload
endpoint is a separate, not-yet-scoped prerequisite for this to be
genuinely end-to-end.

## Phase: 18 — Profile & Measurements frontend (Sprint 3 Stage 2)

Profile Screen (read-only display + entry point) and a single Edit Profile
screen that deliberately handles both create and update — the form is
identical either way (same seven fields), so a separate "Create Profile"
screen would have been a near-duplicate of "Edit Profile" for no real
benefit; `isCreating = !profile` picks the right mutation
(`useCreateProfile`/`useUpdateProfile`) and copy ("Create Profile" vs.
"Edit Profile", "Save" either way) at submit time. Reused unchanged:
`apiClient`, TanStack Query, the device-identity interceptor — no new
networking layer, no Zustand store (local `useState` for the seven form
fields, matching the explicit instruction).

**A design call made and stated, not silently guessed**: `gender`,
`body_type`, and `preferred_fit` are plain `TextInput` fields, not fixed
pickers like Wardrobe's `CategoryPickerModal`. This matches the backend's
own Stage 1 decision (Phase 17: these are plain strings, no enum, because
no authoritative options list exists in the design docs) — inventing a
fixed picker list on the frontend would have quietly re-introduced the
taxonomy the backend deliberately chose not to guess at.

**New**: `src/features/profile/` (`types.ts` — `Profile`,
`CreateProfileInput` (`heightCm`/`weightKg` required, matching the
backend's own creation rule), `UpdateProfileInput` (`Partial<CreateProfileInput>`);
`services/profile-api.ts` — snake_case DTO mapping, matching this
codebase's established convention; `hooks/{use-profile-query,use-create-profile,use-update-profile}.ts`
— the update hook's optimistic-update-with-rollback merges a partial
object into the cached `Profile` directly (not a list `.map()` like
Wardrobe/Saved Looks, since the cache here holds one object or `null`,
never an array); `screens/{profile-screen,edit-profile-screen}.tsx`;
`routes.ts` — no nested-index-vs-dynamic-route ambiguity to design around
here, unlike Saved Looks/Wardrobe, since Profile is a singleton resource
with no per-item id). New routes `src/app/profile/{index,edit}.tsx`,
linked from home.

**Verified for real, against the live backend** (Docker running; frontend
dev server restarted fresh — `CI=1` disables Metro's watch mode, same
restart discipline as Phase 16): headless Chromium via Playwright drove
the complete flow on web. Empty state (fresh guest, no profile yet) →
Create Profile (all seven fields filled, submitted, `201`) → Profile
screen shows every field correctly → Edit (pre-filled form, two fields
changed, submitted, `200`) → Profile screen reflects the changes →
re-opening Edit and entering an out-of-range height (`10`) shows the
inline "Height must be between 80 and 250 cm." error and correctly
disables Save, without a round-trip to the backend (client-side mirror of
the backend's own `Field(ge=80, le=250)` constraint) → forced network
failure → error state → unblocked → Retry → real data loads (a genuinely
new guest on this pass, since the reload reset the web in-memory device
id — same expected behavior as Phase 16/14, not a bug). Zero console
errors throughout. `tsc --noEmit`, `expo lint`, `prettier --check` all
clean.

**A real user's own test data found mixed in with mine, not deleted
by mistake**: cleaning up test-created profile rows afterward (no
`DELETE /api/v1/profile` endpoint exists, so this can't go through the
API — same situation as Phase 17), one row (`display_name="Malik"`,
created mid-session, matching none of this session's own test data) was
almost swept up by an initial blanket `DELETE FROM profiles`. Caught
before running it: cross-referenced every row's `display_name` against
this session's own pytest fixture names and Playwright script strings,
found seven pytest rows and one Playwright row that matched exactly, and
one that didn't — left that one row untouched and flagged it directly
rather than silently deleting real data on the assumption that
"everything in the test database must be test data."

**Known gap, inherited not new**: pull-to-refresh is a no-op on web —
same `react-native-web` `RefreshControl` stub already confirmed by reading
its source directly in Phase 16 (renders a bare `View`, discards
`onRefresh`/`refreshing`); not re-verified here since the root cause is
in the shared library, not this feature's code, and applies identically.
Native platforms are unaffected.

## Phase: 17 — Profile & Measurements backend (Sprint 3 Stage 1, backend only)

`Profile` model, migration, repository, service, schemas, and three REST
endpoints (`GET`/`POST`/`PATCH /api/v1/profile`) — physical measurements
for future virtual try-on fit/sizing accuracy. Built entirely by reusing
Garment/Saved Looks' established layering (model → repository → service →
schemas → endpoint), the existing guest identity dependency unchanged, no
frontend, as scoped.

**A real discrepancy flagged before building, not silently resolved**:
`docs/roadmap/phase-b-platform.md`'s Milestone 8 ("User Profile") already
names a *different* model, `StyleProfile` — aesthetic preferences (face
shape, skin tone, undertone, palette) for outfit recommendations, gated
behind real Authentication (Milestone 6). This request's `Profile` is a
distinct, narrower concept — physical measurements for try-on fit — scoped
to the existing guest identity now, the same precedent Wardrobe already
set (built ahead of Auth rather than blocking on it). The two models are
kept deliberately separate, per the requester's own explicit instruction,
and `profile.py`'s docstring states the distinction directly so it isn't
rediscovered as confusion later.

**One modification to the approved design brief, applied before
building**: `height_cm`/`weight_kg` are required at creation
(`CreateProfileRequest`) — every other field (`display_name`, `age`,
`gender`, `body_type`, `preferred_fit`) stays optional, matching the
model's own nullability. Reflected at the DB layer too: `height_cm`/
`weight_kg` are `NOT NULL` columns (not just a request-schema check) —
since no row can ever be created without them, and the existing
repository `update()` convention (`if value is not None: setattr(...)`)
can never null them back out via `PATCH` either, `NOT NULL` correctly
states a permanent invariant, not just a creation-time rule. Same
defense-in-depth reasoning as `Garment.title`/`category`.

**New**: `app/models/profile.py` (`user_id` unique — enforces one-profile-
per-guest at the DB level, not just an app-layer check),
`app/db/repositories/profile_repository.py` (singular `get_by_user_id`,
no `list_for_user` — a user has at most one profile, never many, unlike
Garment/SavedLook), `app/services/profiles.py` (`ProfileAlreadyExistsError`
→ `409`, `ProfileNotFoundError` → `404`), `app/schemas/profile.py`
(`ProfileResponse`, `CreateProfileRequest`, `UpdateProfileRequest` — the
first schemas in this codebase to use Pydantic `Field(ge=, le=)` range
constraints, a new pattern here, not a new dependency: height 80–250cm,
weight 20–300kg, age 0–120, all producing automatic `422`s),
`app/api/v1/endpoints/profile.py` (`GET`/`POST`/`PATCH /api/v1/profile` —
deliberately no `DELETE`, matching exactly what was requested and nothing
more), `tests/test_profile.py` (10 cases, including the one-profile-
per-guest `409`, the not-yet-created `404`, both required-fields-missing
and out-of-range `422`s, and an IDOR check confirming a different device
gets `null`/`404` rather than another guest's data). **Modified**:
`app/models/__init__.py`, `app/api/v1/router.py` (mounts `/profile`).

**A stale Docker image discovered, not papered over**: generating the
migration via `docker exec virtualtryon-backend-1 alembic revision
--autogenerate` failed outright (`Can't locate revision identified by
'0f4fb8807ebc'`) — the running container's baked-in `/app/alembic/`
doesn't match the host source tree at all (missing the Garment migration
entirely, and a *different* revision id for the Saved Looks migration
than the actual file on disk). The container's live FastAPI code hot-
reloads correctly via a volume mount (confirmed repeatedly this session),
but `alembic/` specifically isn't part of that mount — every migration in
this project, including this one, has actually been generated/applied via
`backend/.venv` connecting directly to Postgres's exposed port, never via
`docker exec`. Confirmed the local `.venv` and the live app share the same
database (`alembic current` matched the DB's real head; the resulting
table was verified directly in `virtualtryon-postgres-1`). Worth fixing
properly (rebuilding the backend image, or bind-mounting `alembic/`) at
some point, but out of scope for this feature — noted as a known gap
below, not silently worked around.

**A testing-methodology mistake caught and corrected, not just its
symptom**: the first curl verification pass invented its own
`X-Device-Id` value (`profile-verify-<timestamp>`) and expected the
server to remember it across requests — it didn't, and every call minted
a *new* guest, making `POST` "always succeed" and `PATCH` "always 404,"
which briefly looked like a real bug. It wasn't: guest device ids are
server-generated only (`app/services/guest_identity.py`, unchanged) and
correctly ignore any client-invented value, exactly as designed — the
identical mistake (and identical false alarm) already made once earlier
this session debugging Wardrobe on web. Corrected by capturing the
server-issued `X-Device-Id` response header from the first request and
resending that exact value, after which every scenario passed as
specified.

**Security review found one real bug, fixed immediately rather than left
as a known gap**: `/security-review` was runnable this time (the repo is
now a real git repository — see Sprint 2's closing session — whereas the
earlier Wardrobe frontend review had to be done by hand for lack of one).
A dedicated sub-agent traced GET/POST/PATCH end to end and found the IDOR/
injection surface genuinely clean (every repository query scoped by a
server-derived `user_id`, never client-supplied; parameterized SQLAlchemy
`select()` throughout, no raw SQL; `create()`/`update()` take explicit
named kwargs, never a raw `payload.model_dump()`, so mass-assignment
through `id`/`user_id` isn't possible even without `extra="forbid"` on the
schemas) — but did surface one concrete correctness bug: `create_profile`'s
existence check is check-then-insert, not atomic. Two near-simultaneous
`POST`s from the same guest could both pass the "does a profile already
exist" check before either commits, and the DB's own unique constraint on
`user_id` would then reject the second `INSERT` as an unhandled
`IntegrityError` → `500`, instead of the clean `409` a non-racing second
request gets. Fixed by catching `IntegrityError` around the insert and
converting it to the same `ProfileAlreadyExistsError` → `409`. Verified
twice: a new `pytest` case firing two real concurrent `POST`s via
`asyncio.gather` (`[201, 409]`, never a 500), and again directly against
the live server with two backgrounded `curl` processes hitting the same
endpoint simultaneously — identical result.

**Verified for real, against the live backend**: migration applied
cleanly (`timezone=True` on both timestamps, no enum columns, `unique=True`
on `user_id` — confirmed directly via `\d profiles` against the running
Postgres container). Full manual flow via `curl`, device id handled
correctly this time: `GET` with no profile → `200 null`; `POST` missing
`weight_kg`/`height_cm` → `422`; `POST` with `height_cm=60` → `422`
(range); `POST` valid → `201` with all fields; `POST` again same device →
`409`; `GET` → the created profile; `PATCH` a subset of fields → `200`,
`updated_at` changed, untouched fields intact; `PATCH` from a device with
no profile → `404`; two concurrent `POST`s from the same new guest →
exactly one `201`, one `409`, never a `500`. Swagger UI (`/api/v1/docs`)
confirmed loading with all three operations registered in the live
OpenAPI schema. 27/27 `pytest` (16 pre-existing + 11 new), `black`, `ruff`
clean; `mypy` clean on every new/
modified file. All test-created rows deleted directly against the dev
Postgres database afterward (no `DELETE` endpoint exists for Profile by
design, so cleanup couldn't go through the API the way Garment/Saved
Looks' own tests do).

**Known gaps, stated not hidden**: no rate limiting (repo-wide gap, named
again). No way to explicitly clear an optional field back to `null` via
`PATCH` — inherited from the same repository `update()` convention as
Garment, not a new limitation. No `DELETE /api/v1/profile` — not
requested, so not built ahead of a real need; also means no fully
self-cleaning test suite is possible for this feature the way Garment/
Saved Looks' tests are (each test here leaves its row in the dev database
rather than removing it via the API, same "real local dev Postgres, no
isolated test DB" tradeoff already named in Phase 13, just with no
DELETE-based mitigation available this time). The running
`virtualtryon-backend-1` Docker image's `alembic/` folder is stale
relative to the host source tree (see above) — doesn't affect the running
app or this feature's correctness, but should be fixed (image rebuild or
a proper bind mount) before it causes real confusion for a future
migration.

## Phase: 16 — Wardrobe frontend (Sprint 2 Stage 2)

Wardrobe Screen (2-column grid), Add Garment screen, and Garment Details
screen, against Phase 15's already-verified backend. Reused, not
duplicated: `apiClient`/`uploadImage()` (`services/api/`), TanStack Query,
the device-identity interceptor, `ImageSourcePicker`/`useImagePicker`/
`CameraCaptureView`/`validateImage` (all unchanged from the garment/
user-photo upload flows), and — genuinely promoted, not copy-pasted —
Saved Looks' `RenameLookModal` moved to `src/components/rename-modal.tsx`
now that Wardrobe is a real second consumer; Saved Looks' Details screen
switched to import the shared version, its own file deleted.

**New**: `src/features/wardrobe/` (`types.ts` — `Garment`, the fixed
`GARMENT_CATEGORIES` list; `services/garments-api.ts` — snake_case DTO
mapping, matching this project's established translation convention;
`hooks/{use-garments-query,use-create-garment,use-update-garment,use-delete-garment}.ts`
— the update hook covers both rename and category-change through the same
optimistic-update-with-rollback pattern as `use-update-saved-look.ts`;
`components/{garment-card,category-picker-modal}.tsx`;
`screens/{wardrobe-screen,add-garment-screen,garment-details-screen}.tsx`;
`routes.ts`). New routes `src/app/wardrobe/{index,add,detail/[garmentId]}.tsx`
(the `detail/` subfolder convention adopted proactively — the same nested-
index/sibling-dynamic-route ambiguity Saved Looks hit and fixed in Phase
14 never occurred here at all, since the fix was applied before writing
any route file rather than rediscovered). `CategoryPickerModal` built with
a plain-`View` backdrop + explicit Cancel button from the start, avoiding
Phase 14's nested-`<button>` react-native-web bug by construction rather
than fixing it after the fact. Linked from home (`src/app/index.tsx`).

**A collision found and flagged mid-build, not silently patched**:
building Phase 15's real `/api/v1/garments` endpoint broke the *existing*
Phase 4 garment-upload flow's mock-fallback — `prepare-garment.ts` now hit
a real `422` (wrong field name, missing required `title`/`category`)
instead of gracefully falling back to a mock. Flagged before touching
anything; fix approved and scoped exactly: real endpoint, `image` field
name, default `title`/`category`, `uploadImage()` reused unchanged, no
duplicate upload path. Verified directly via `curl` against the live
backend.

**Two more real bugs found only by actually running the app against the
live backend on web — neither was Wardrobe-specific, both pre-existing
and invisible until this feature was the first to exercise a full
create-then-mutate flow on web against a real backend:**

1. **`buildFormData()` (`services/api/upload-image.ts`) never worked on
   web.** It appended React Native's `{ uri, name, type }` object
   convention for a file part — meaningful to RN's native networking
   layer, but a browser's real `FormData` just stringifies a plain object,
   producing a literal `"[object Object]"` body part. Invisible until now
   because every prior web test of an upload flow either used the mock
   fallback (no real endpoint existed to validate the body) or was never
   run on web with a real backend at all. Surfaced as a `422` ("Expected
   UploadFile, received: <class 'str'>") the moment Wardrobe's create flow
   ran against the real endpoint on web. Fixed by branching on
   `Platform.OS === 'web'`: fetch the picked image's `uri` (a `data:`/
   `blob:` URL from `expo-image-picker`'s web implementation) back into a
   real `Blob` and append that; the native branch is untouched. Shared
   file — this also fixes the identical latent bug in the photo-upload and
   original garment-upload flows, not just Wardrobe's.
2. **Backend CORS never exposed `X-Device-Id` to browser JavaScript.**
   `app/main.py`'s `CORSMiddleware` set `allow_headers=["*"]` (which
   response headers may be *sent*) but never `expose_headers` (which
   response headers browser JS is *allowed to read back*, default empty).
   The header was genuinely on the wire — visible to `curl`/Playwright's
   network inspection — but `axios`'s response interceptor read `undefined`
   every time, so the client could never persist a server-issued device
   id: every single web request looked like a brand-new anonymous guest,
   not just across page loads but between one request and the very next.
   Any action referencing a previously-created row by id (`PATCH` rename,
   `PATCH` category, `DELETE`) 404'd against a different guest than the one
   that owned it. This equally broke Saved Looks' rename/favourite/delete
   on web — Phase 14's web verification only ever exercised the read-only
   empty-list `GET` path, never a mutating multi-request flow, so it was
   never caught. Confirmed root cause with a `curl` preflight check
   (`access-control-expose-headers` absent) before touching anything; this
   task's own instruction was "do not modify backend code," so the fix was
   flagged and explicitly approved before applying. One line:
   `expose_headers=[DEVICE_ID_HEADER]` in `app/main.py`, importing the
   existing constant from `app/services/guest_identity.py` rather than
   restating the literal string. Backend's 16/16 `pytest` re-run clean
   after the change.

**Verified for real, against the live backend** (Docker restarted for
this backend change; frontend dev server restarted fresh — `CI=1` disables
Metro's watch mode, so earlier fix attempts silently kept serving stale
bundles until this was caught): headless Chromium via Playwright drove the
complete flow end-to-end on web. Empty state (fresh guest) → Add Garment
(real gallery file picked via a real OS file-chooser intercepted by
Playwright, title + category filled, submitted, `201`) → grid shows the
new card → Rename (`PATCH 200`, confirmed by re-reading the Details
screen's body text, not just the response status) → Change Category
(`PATCH 200`, same double-check) → back to the grid (browser back — no
in-app back button on this screen, matching Saved Looks' Details screen's
existing convention) shows the updated title/category → Delete (`204`,
confirms both the DB row and the wardrobe returning to the empty state) →
forced network failure via Playwright request interception → error state
→ unblocked → Retry → real data loads. The 2-column grid layout itself was
specifically re-verified with two real garments present (a single-item
test can't distinguish "2 columns" from "1 column," since a lone `flex-1`
card in either layout fills the full row width) — confirmed side-by-side
via screenshot. All test rows/files created during this verification
(6 orphaned garments + their stored images from earlier debugging runs,
created before the CORS fix landed) cleaned up directly against the dev
Postgres/storage volume afterward. `tsc --noEmit`, `expo lint`,
`prettier --check` all clean.

**Known gap, stated not hidden, confirmed by reading the library's own
source rather than guessed**: pull-to-refresh is a no-op on web.
`react-native-web`'s `RefreshControl` (`node_modules/react-native-web/src/exports/RefreshControl/index.js`)
renders a bare `View` and discards `onRefresh`/`refreshing` entirely — no
gesture, synthetic or real, can trigger it in a browser. This is the exact
same component, same props, same usage pattern as Saved Looks'
`saved-looks-history-screen.tsx` (Phase 14) — an inherited, pre-existing
platform gap, not a Wardrobe-specific regression, in the same category as
Phase 14's `Alert.alert`-on-web finding. Native platforms (iOS/Android) use
the real native `RefreshControl` and are unaffected; the underlying
`.refetch()` call itself is proven correct (identical call site to the
already-verified Retry button).

## Phase: 15 — Wardrobe backend (Garment CRUD, Sprint 2 Stage 1, backend only)

`Garment` model, migration, repository, service, schemas, and four REST
endpoints — built entirely by reusing Saved Looks' established patterns
rather than reinventing them. No frontend, as scoped.

**A real discrepancy flagged, not silently resolved**: `docs/roadmap/phase-a-core-loop.md`'s
original Milestone 3 sketch specified a thinner `Garment` (`id`, `user_id`,
`storage_path`, `category`, `created_at` only) — written before Saved
Looks (and its naming/storage conventions) existed. The requester's
current spec (`title`, `color`, `season`, `image_url`, `updated_at`) is
more detailed and more current; treated as authoritative, per that
call-out, rather than silently matching the older doc or silently
diverging without saying so. This is also the actual model
`docs/roadmap/phase-b-platform.md`'s Milestone 7 (Wardrobe) is meant to
extend later — confirmed via `CLAUDE.md`'s own direct reference to this
exact pattern — not a parallel structure.

**New**: `app/models/garment.py` (adds `updated_at` with SQLAlchemy's
`onupdate`, which `SavedLook` doesn't have — verified it actually refreshes
on every `PATCH`, not just asserted), `app/db/repositories/garment_repository.py`,
`app/services/garments.py`, `app/schemas/garment.py`,
`app/api/v1/endpoints/garments.py` (`GET`/`POST /api/v1/garments`,
`PATCH`/`DELETE /api/v1/garments/{id}`), `tests/test_garments.py` (6 cases,
mirroring `test_saved_looks.py`'s structure exactly, including the two
IDOR checks). **New, shared**: `app/services/image_validation.py` —
extracted from `app/services/saved_looks.py` now that Garments is a
genuine second consumer of the same three checks (content-type allowlist,
size cap, Pillow decode-verify), matching this project's own established
DRY precedent (Phase 4's refactor) rather than duplicating them.
**Modified**: `app/services/saved_looks.py` and
`app/api/v1/endpoints/saved_looks.py` (now import validation from the
shared module — re-verified all 10 pre-existing Saved Looks tests still
pass after this refactor, not just the 6 new ones), `app/models/__init__.py`,
`app/api/v1/router.py` (the commented-out example line from Saved Looks'
own scaffolding became the real wiring). Reused unchanged: `get_current_user`
(`app/api/deps.py`), `StorageService`/`get_storage_service()`
(`app/services/storage/`) — no auth/storage duplication, as required.

**`category` is a plain string, not an enum** — no authoritative category
taxonomy was found in the design docs; Milestone 7 is where the real
Closet category system gets defined. Forcing a guessed enum now would
have been exactly the kind of premature decision this project's own
conventions warn against.

**Verified for real, against the live backend** (Docker/Postgres already
running): migration generated and applied cleanly (timezone-aware
timestamps and no enum type this time — both mistakes from Phase 13's
first migration, deliberately avoided here); full manual flow via `curl`
matching Swagger's own request shape — create (issues a device id), list,
rename, update-category (confirmed `updated_at` actually changes both
times, not just once), IDOR-protected `PATCH`/`DELETE` from a different
device (`404`), delete (`204`, confirmed both the row and the stored file
are gone). Swagger UI (`/api/v1/docs`) confirmed loading with both new
routes registered in the live OpenAPI schema. 16/16 `pytest` (10
pre-existing + 6 new), `black`, `ruff` clean; `mypy` clean except the same
pre-existing, out-of-scope `app/redis/client.py` finding noted in Phases
11 and 14 — still not this feature's file to fix.

**Known gaps, stated not hidden**: no rate limiting (repo-wide gap, named
again — this is now the third unauthenticated write endpoint carrying it).
`PATCH` can't explicitly clear `color`/`season` back to null (only
overwrite with a new value) — inherited from `SavedLookRepository`'s
existing `update()` pattern (`None` means "don't touch this field"), not a
new limitation introduced here; nothing in this feature's scope needed
explicit-null support. No image-replacement on `PATCH` — not requested
(only rename/recategorise were named as the test scenarios), so not built
ahead of a real need.

## Phase: 14b — Dynamic API host resolution (three-round debugging saga, resolved)

Sprint 2 was blocked three times in a row by the same surface symptom
("empty response shown as error") with three genuinely different root
causes each time — worth recording precisely, since the pattern (not just
the final fix) is the actual lesson.

**Round 1**: `EXPO_PUBLIC_API_URL=http://localhost:8000` — correct for web
and iOS Simulator, meaningless from a physical phone (`localhost` resolves
to the phone itself). Fixed by setting `.env` to the dev machine's LAN IP.
**Round 2**: that fix never took effect — Expo inlines `EXPO_PUBLIC_*` vars
at bundler *startup*, not read live from disk; the dev server had never
been restarted. Separately, the LAN IP itself had already gone stale
(DHCP renewed it between sessions) — confirmed by re-running `ipconfig`
and finding a different address than the one just fixed. **Round 3**:
everything re-verified clean (current IP, correctly baked into the
current bundle, backend healthy) yet the symptom persisted — ruled out a
Windows Firewall profile mismatch by checking the actual network category
(`Public`, which the existing Docker Desktop Backend rule already covers)
before concluding firewall wasn't it either.

**The actual fix**: stopped treating this as a chase-the-current-IP
problem and instead removed the class of bug — `frontend/src/constants/api-host.ts`
(new) derives the backend host from whichever connection the app is
*actually* using right now, instead of a static `.env` value: `expo-constants`'s
`Constants.expoConfig.hostUri` on native (Metro's own address, as seen by
the client already connected to it — same host, different port than the
dev server) and `window.location.hostname` on web (the page is already
served by the same dev server). `EXPO_PUBLIC_API_URL` remains as the
fallback for whichever case has no dev server to detect at all (a
production build). `apiClient`, `uploadClient` (`services/api/*.ts`), and
`resolveMediaUrl` (`lib/media-url.ts`) all switched from `env.EXPO_PUBLIC_API_URL`
directly to `resolveApiBaseUrl()`.

**Verified for real**, all three required scenarios, against the actual
running app (not simulated): empty array → empty state; a genuinely
aborted request → error state; existing saved looks (created via the
backend API, same pattern as every prior verification) → correct list
rendering with the right title. Also specifically verified the *dynamic
resolution* itself, not just the end state: served the app from a second
address (`192.168.1.2:8081`, not just `localhost:8081`) and confirmed via
network log that `resolveApiBaseUrl()` correctly derived `192.168.1.2:8000`
from it, not a hardcoded fallback — the one failure at that address was a
separate, expected, native-irrelevant restriction (CORS, browser-only;
confirmed via the exact console error), not a flaw in the host-detection
logic.

**Known gap, stated not hidden**: the native (`hostUri`) branch could only
be verified by this reasoning and the equivalent web-path test above — no
physical device or simulator is available in this environment to run the
actual native code path. If a phone still can't reach the backend after
this fix with a correct, current network setup, the next things to check
are outside this feature's code entirely: whether Windows actually forwards
LAN-originated (not just same-host) traffic into the WSL2/Docker Desktop
container network for this specific setup, since that layer's behavior
couldn't be fully verified from a single machine either.

## Phase: 14 — Saved Looks History + Details (frontend, Cycle 1 of 2)

The first real screen in this app backed by a genuine, non-mocked backend
call — every prior frontend feature (Phases 3-7) either mocked the network
entirely or fell back to a mock on any failure. Two identical "the backend
is already complete/exists" premises from the requester were checked
against the actual repo state (`Glob`/`Grep`, not assumed) and found false
both times before any code was written — the second time, confirmed by
re-verifying rather than trusting the first check's memory. Split into two
cycles on the requester's own instruction: this phase is History + Details
only; the auto-save-after-tryon retrofit (Cycle 2) is explicitly deferred,
gated on resolving what a real "generated image" placeholder should be.

**New**: `src/features/saved-looks/` (types, `services/saved-looks-api.ts`
— snake_case-to-camelCase DTO mapping, matching this project's established
translation convention — `hooks/{use-saved-looks-query,use-update-saved-look,use-delete-saved-look}.ts`,
`components/{saved-look-card,rename-look-modal}.tsx`, `screens/{saved-looks-history-screen,saved-look-details-screen}.tsx`,
`routes.ts`), `src/components/app-image.tsx` (the shared image-or-placeholder
primitive `source-images-row.tsx` itself named as a candidate "next time
this pattern recurs" — this was that next time; the three pre-existing
occurrences were deliberately left alone, not retrofitted), `src/lib/secure-token-store.ts`
(generic `expo-secure-store` wrapper, reusable later for JWT tokens per
the requester's requirement), `src/lib/confirm.ts`, `src/lib/media-url.ts`,
`src/services/api/device-identity.ts` (device-id request/response
interceptor, attached to both `apiClient` and `uploadClient`). New routes
`src/app/saved-looks/{index,detail/[lookId]}.tsx`, linked from home.
**Modified**: `src/services/api/{client,upload-client}.ts` (interceptor
wiring), `src/app/index.tsx`. New dependency: `expo-secure-store`.

**Real bugs found through actually running the app — not type-checking,
not code review — that no amount of `tsc`/lint would have caught:**

1. **A pre-existing backend CORS bug, live since Phase 0.** Pydantic's
   `AnyHttpUrl` normalizes `"http://localhost:8081"` to
   `"http://localhost:8081/"` (trailing slash); `app/main.py`'s
   `CORSMiddleware` did an exact string match against that against a real
   browser's `Origin` header, which never has a trailing slash — every
   real cross-origin request was silently rejected, unconditionally, since
   this backend has existed. Invisible until now because nothing had ever
   made a genuine browser request against it before. Fixed with
   `.rstrip("/")` in `backend/app/main.py` — the one backend change in
   this cycle, squarely inside "unless a real integration issue is
   discovered."
2. **Expo Router's typed-routes generator is simply wrong for a nested
   `index.tsx`.** It only ever lists `/saved-looks/index` as a valid
   literal, never the clean `/saved-looks` — but verified directly
   (headless browser, both paths hit for real): `/saved-looks/index`
   404s, `/saved-looks` is what actually renders the screen. Resolved with
   a documented, narrow `as Href` cast (`routes.ts`) rather than shipping
   the type-satisfying-but-broken path. A related, now-fixed routing
   ambiguity: `saved-looks/index.tsx` and a direct sibling
   `saved-looks/[lookId].tsx` meant `/saved-looks/index` briefly resolved
   to the *dynamic* route with `lookId="index"` instead of the index
   screen — restructured the detail route to `saved-looks/detail/[lookId].tsx`
   to remove the sibling ambiguity entirely, rather than papering over it.
3. **Nested `<button>` elements — invalid HTML, web-only.** `SavedLookCard`
   nested a favourite-toggle `Pressable` inside the card's own "open
   details" `Pressable`; react-native-web renders `accessibilityRole="button"`
   as a real `<button>`, and a `<button>` cannot contain another per the
   HTML spec. Native RN has no such constraint, which is exactly why
   reasoning about it in the abstract missed it — only running it on web
   surfaced the hydration warning. Restructured to sibling `Pressable`s.
4. **`Alert.alert`'s confirm callback is a silent no-op on web.** Clicking
   Delete produced no dialog, no error, and no callback — verified
   directly, the entire destructive-action flow was dead on web. New
   `src/lib/confirm.ts` branches on `Platform.OS`: `window.confirm()` on
   web, `Alert.alert` (which works fine and looks native) elsewhere.
5. **`expo-secure-store` throws on web** (undocumented; its docs simply
   don't list web as a supported platform). Without a fallback, every
   single request — not just every page load — would look like a brand
   new anonymous guest, since nothing could ever persist. `secure-token-store.ts`
   now branches on `Platform.OS`: an in-memory `Map` for web (stable for a
   tab's lifetime, lost on refresh — strictly better than never persisting
   at all), real `SecureStore` elsewhere.
6. **Layout, not just logic**: the hero image was `aspectRatio={1}` at
   `width: '100%'`, rendering as a full-viewport square on a wide screen —
   changed to `16/9`. Separately, the loading/empty/error states used
   `flex-1 items-center justify-center` inside `AppScaffold`'s default
   `ScrollView`, which doesn't propagate `flexGrow`, so centering silently
   did nothing — fixed by using `AppScaffold scroll={false}` for these
   single-state screens. Both were only caught by looking at an actual
   screenshot at a realistic phone viewport, not by reading the JSX or
   trusting a desktop-width screenshot (which looked "big" for an
   unrelated reason — a short viewport, not a wrong aspect ratio — and
   would have led to the wrong fix if trusted at face value).

**Verified for real**: `tsc --noEmit`, `expo lint`, `prettier --check` all
clean. Ran the actual app — Metro/Expo web dev server, headless Chromium
via Playwright (installed for this session; `chromium-cli` wasn't
available) — and drove the complete flow against the real backend with
real test data created via the API (mirroring how the backend itself was
verified in Phase 13): History list renders real looks with correct
images/thumbnails/title/date/favourite state; tapping a card opens the
correct look's Details screen; rename, favourite-toggle, and delete each
confirmed via the UI *and* independently against the backend (a direct
`curl` after each action); deleting also removed the stored image files
(404 after, confirmed); loading, empty, and error+retry states all
screenshotted at a realistic mobile viewport (390×844) and confirmed
correctly rendered/centered; zero console errors after the fixes above.

**Known gaps, stated not hidden**: pull-to-refresh uses the platform's
native `RefreshControl` chrome, not `ThinkingIndicator` — a deliberate
read of "never a bare spinner" as targeting custom in-app loading UI, not
native OS pull-to-refresh affordances, not verified against the original
design intent. The Details screen's normal (found-look) path has no
in-app "back" link, only the not-found branch does — matches this app's
existing convention elsewhere (e.g. `tryon-results-screen.tsx`) of relying
on the system/browser back gesture, not a gap introduced here. No
client-side `maxLength` enforcement on rename is mirrored server-side as a
hard Pydantic constraint (only the DB column is capped at 200 chars) — a
title over that length would 500 rather than 422; noted, not fixed, since
it's a pre-existing backend gap unrelated to this feature and the frontend
already prevents it from being hit in practice. Cycle 2 (auto-save after
try-on) remains fully unbuilt, per the agreed split.

## Phase: 13 — Saved Looks backend (first domain models, first migration, guest identity, storage)

The first real domain feature in this backend: `User`/`SavedLook` models,
the first-ever Alembic migration, guest identity, a real object-storage
implementation, and four REST endpoints. Built under `CLAUDE.md`'s Feature
Implementation Protocol; frontend explicitly deferred to its own cycle
(confirmed backend-first after two premature "the backend/APIs already
exist" requests that didn't match the actual repo state — verified via
`Glob`/`Grep` both times before responding, not assumed).

**New**: `app/models/{user,saved_look}.py` (`User.auth_provider` models all
four eventual values — `guest|email|google|apple` — from day one per
`docs/roadmap/README.md`'s guest-identity decision, even though only
`guest` is used here), `app/db/repositories/{user_repository,saved_look_repository}.py`
(DB access, no business logic — nested under `db/`, the existing
infrastructure layer, not a new top-level folder), `app/services/storage/{base,local_storage,__init__}.py`
(`StorageService` interface — `save`/`read`/`delete`, `LocalStorageProvider`,
`get_storage_service()` factory — fulfilling `docs/roadmap/README.md`'s
storage cross-cutting decision #3, planned since Phase 2, never built until
now), `app/services/guest_identity.py` (server-generated device ids only —
see Security below), `app/services/saved_looks.py` (validation via content-type
allowlist + `Pillow` decode-verify, matching the MediaPipe endpoint's
rigor), `app/schemas/saved_look.py`, `app/api/deps.py`
(`get_current_user` — the one seam that changes when real auth lands),
`app/api/v1/endpoints/saved_looks.py` (`GET`/`POST`/`PATCH`/`DELETE
/api/v1/saved-looks`), `alembic/versions/..._add_users_and_saved_looks_tables.py`
(first-ever migration). **Modified**: `app/main.py` (`/uploads` static
mount), `app/core/config.py` (`STORAGE_UPLOADS_DIR`), `app/api/v1/router.py`,
`requirements.txt` (`pillow`, previously only a transitive `mediapipe`
dependency, now direct), `.gitignore`, `docker-compose.yml`.

**A real security correction made before building, not after**: the
original ask described a client-supplied `X-Device-Id`. Implemented
instead as server-generated only (`secrets.token_urlsafe(32)`,
`app/services/guest_identity.py`) — a client-chosen id would let one guest
read/rename/delete another guest's rows (IDOR). Every `SavedLook` query is
additionally scoped by the resolved `user_id` in the repository layer
itself, not just at the endpoint — confirmed for real (not just reasoned
about) via live HTTP calls against the running container: a wrong/unknown
device id gets `404` on `PATCH`/`DELETE` and an empty list on `GET`, never
another guest's data or a different error shape that would leak existence.

**Verified — the most real verification this repo has had.** Docker was
actually running (`docker ps`: backend, Postgres, Redis, all healthy for
hours) — a first-time opportunity, since the MediaPipe phase only ever
verified through `backend/.venv` directly. Found and fixed three real bugs
that only surfaced through this: (1) the running container's image
predated the MediaPipe-phase dependency additions — `import cv2` crashed
it on reload the moment this feature's code touched the same import chain;
rebuilt via `docker compose build backend`. (2) `created_at` columns
declared as timezone-aware Python `datetime` but migrated as `TIMESTAMP
WITHOUT TIME ZONE` (SQLAlchemy's default for a bare `Mapped[datetime]`) —
asyncpg rejected the mismatch on the very first real insert; fixed to
`DateTime(timezone=True)` and the migration regenerated cleanly (the flawed
one was downgraded and deleted rather than patched over, since it had just
applied to a table with zero real data). Alembic's autogenerated
`downgrade()` also doesn't drop the Postgres ENUM type it implicitly
creates for `auth_provider` — hit this directly when reapplying after the
downgrade ("type already exists"); the migration's `downgrade()` now drops
it explicitly. (3) `pytest` failed everywhere past the first DB-touching
test with `"another operation is in progress"` — the classic
SQLAlchemy-async-engine-plus-pytest-asyncio pooling gotcha (a connection
pooled by one test's event loop reused in the next test's different loop);
fixed via a session-scoped event loop
(`asyncio_default_fixture_loop_scope = "session"`) plus a `NullPool` test
engine — invisible until now because Saved Looks is the first test suite
in this repo to touch the database at all. Every real HTTP scenario was
exercised directly against the live container with `curl` before any
automated test was written: create (issues a device id), list scoped
correctly, cross-device `PATCH`/`DELETE` correctly `404`, delete removes
both the row and the stored files, and the static mount correctly 404s
after deletion. 10/10 `pytest` (4 pre-existing + 6 new) pass; `ruff`,
`black`, `mypy` clean on every new/modified file.

**Newly-surfaced, out-of-scope findings, left alone**: none new this
phase beyond the pre-existing `app/redis/client.py` `no-any-return` mypy
finding already noted in Phase 11 — still untouched, still not this
feature's file to fix.

**Known gaps, stated not hidden**: no rate limiting exists anywhere in this
backend yet (repo-wide gap, named again) — this write endpoint is as
exposed to repeated-upload abuse as the MediaPipe endpoint already is. No
retention/cleanup policy for old saved looks. Tests run against the real
local dev Postgres database rather than an isolated test database
(pragmatic simplification for "basic tests where appropriate," stated
plainly rather than silently building test-DB-isolation infrastructure
nobody asked for) — each test cleans up its own created rows via the
DELETE endpoint itself. `alembic downgrade` was exercised directly (not
just `upgrade`) as a side effect of fixing the timestamp bug, which is more
real verification than most migrations in most projects ever get before
first use.

## Phase: 12 — AIInferenceClient abstraction (no model, architecture only)

A CatVTON integration was proposed, then explicitly withdrawn before Stage 1
approval — "do NOT implement CatVTON itself; instead, prepare the backend
so any future AI model... can be plugged in." This phase is that narrower
replacement: a second pluggability layer underneath ADR 0006's existing
`VirtualTryOnEngine`/engine-registry design, with no model downloaded, no
GPU work, and no endpoint/frontend/DB changes.

**New**, all under `ai/src/models/`: `inference_client.py`
(`AIInferenceClient` ABC — one method, `infer()`, mirroring
`VirtualTryOnEngine`'s own single-method minimalism; `AIInferenceRequest`/
`AIInferenceResponse`, kept out of `dto.py` since that file's own docstring
scopes itself to just `VirtualTryOnResult`), `inference_clients/local_stub.py`
(`LocalStubInferenceClient` — deterministic solid-fill placeholder sized to
the input, tagged `model_name="local-stub"`), `inference_clients/catvton_inference_client.py`
(`CatVTONInferenceClient` — the documented, not-wired-in-by-default
connection point for a real implementation, with the three requested TODOs:
model weight loading, GPU inference, external inference server).
**Modified**: `engines/catvton_engine.py` and `engines/idm_vton_engine.py`
(both refactored to take an injected `AIInferenceClient` rather than
implementing/stubbing model logic directly — both engines refactored for
consistency, not just the one named in the request, flagged and accepted
before building), `engine_registry.py` (`create()` now defaults to
`LocalStubInferenceClient`, so every registered engine returns a real
`VirtualTryOnResult` today instead of raising `NotImplementedError`),
`docs/architecture/ai-tryon-engine.md` (new section documenting the layer —
that doc's own "Relationship to other in-progress designs" section had
already anticipated exactly this kind of constructor-injected dependency).

**Naming note, stated to avoid future confusion**: this `AIInferenceClient`
(root `ai/`, model-to-inference-backend abstraction) is unrelated to
`backend/ai/services/ai_client.py`'s `AIServiceClient` (`backend/`'s HTTP
client for calling *out* to this `ai/` service) — similar names, different
layers, noted directly in `inference_client.py`'s own docstring.

**A real type-checking finding, fixed properly rather than suppressed**:
typing `_ENGINES` as `dict[str, type[VirtualTryOnEngine]]` broke under
`mypy` once engine constructors took a parameter the abstract base class
doesn't declare (deliberately — a future engine might not need an
`AIInferenceClient` at all). Retyped as
`dict[str, Callable[[AIInferenceClient], VirtualTryOnEngine]]`, which
correctly describes "every engine registered here happens to take one
today" without over-committing the base class's own constructor shape.

**Verified**: `ruff`, `black --check`, and `mypy` all pass against
`ai/src/models/` using `ai/pyproject.toml`'s own config. Functionally
executed (not just hand-reviewed) via a script importing `engine_registry.py`
directly: both `catvton` and `idm-vton` return a real `VirtualTryOnResult`
from `LocalStubInferenceClient`, output is deterministic for same-size
input, `CatVTONInferenceClient` correctly raises `NotImplementedError` when
explicitly injected, and an unknown engine name still raises
`UnknownEngineError`. Run using `backend/.venv` (already has `pydantic`/
`Pillow` from the MediaPipe phase) — `ai/` still has no venv of its own in
this environment, and nothing in this phase needed `ai/requirements.txt`'s
heavier entries (torch, diffusers, mediapipe).

**Known gaps, stated not hidden**: `CatVTONEngine.generate()` and
`IDMVTONEngine.generate()` are currently identical — expected, since
neither engine has real per-model logic yet; not collapsed into one shared
class, since that would fight the registry's actual pluggability axis
(which model, not which inference mechanism) once either engine grows real
model-specific pre/post-processing. `TRYON_ENGINE` in `ai/src/core/config.py`
still isn't read by anything — nothing yet resolves it through
`VirtualTryOnEngineRegistry.create()`, since nothing calls generation at all
in this pass, same standing gap Phase 9 already named.

## Phase: 11 — MediaPipe integration (first real inference, first executed AI code)

Implements model 1 of `docs/roadmap/ai-model-integration-roadmap.md`'s
six-model sequence: real MediaPipe pose + face landmark detection, behind a
standalone diagnostic endpoint, `POST /api/v1/ai/mediapipe/analyze`. Built
under `CLAUDE.md`'s Feature Implementation Protocol (design brief → build →
five reviews).

**Two decisions flagged, not silently resolved, before building anything**:
1. Where the real MediaPipe code lives. The task requested
   `backend/ai/services/mediapipe_service.py`, which contradicts
   `docs/decisions/0004-ai-orchestration-vs-execution-boundary.md`
   ("`backend/ai/` never loads a model"). Resolved by choice, not
   default: `docs/decisions/0007-mediapipe-inference-in-backend.md` (new)
   records this as a **narrow, named exception** — MediaPipe is CPU-only
   and a zero-new-dependency install, unlike every other named future model
   (SCHP, IDM-VTON/CatVTON, InstantID, Real-ESRGAN), which still belong in
   root `ai/` per ADR 0004, untouched.
2. Sync vs. the project's async-job convention. `docs/roadmap/README.md`'s
   cross-cutting decision #2 established an async job pattern for every AI
   call, even instant mocks. This endpoint is a deliberate, scoped
   exception: a synchronous diagnostic/dev-tool endpoint, not wired to a
   `TryOnJob`, chosen because the full job-queue stack (persisted job model
   + migration, a real `arq` worker process, Redis producer/consumer) isn't
   built yet and building it now would be several features, not one.

**New**: `backend/ai/models/mediapipe_analysis.py` (internal DTO —
deliberately separate from `pose.py`'s `PoseDetectionResult`, which stays
reserved for the future job-pipeline `POSE_DETECTION` stage),
`backend/ai/services/mediapipe_service.py` (loads MediaPipe's Pose
Landmarker + Face Landmarker once, lazily, thread-safe; downloads their
`.task` model bundles from Google's public model zoo on first use, cached
in `MEDIAPIPE_MODEL_DIR`), `backend/app/schemas/ai.py` (public response
contract), `backend/app/services/mediapipe_analysis.py` (validation, timing,
logging, error mapping — no FastAPI import), `backend/app/api/v1/endpoints/ai.py`
(HTTP layer), `backend/tests/test_mediapipe_analyze.py`. **Modified**:
`backend/app/api/v1/router.py` (mounts the new router — `api_router` was
empty until now), `backend/app/core/config.py` (`MEDIAPIPE_MODEL_DIR`
setting), `backend/requirements.txt` (`mediapipe`, `opencv-python-headless`,
`numpy`), `backend/Dockerfile` (adds `libgl1`/`libglib2.0-0` for OpenCV/
MediaPipe's native deps; now actually `COPY`s `ai/` into the image — a real
latent gap, since nothing under `app/` had ever imported from `backend/ai/`
before this feature), `docker-compose.yml` (mounts `backend/ai/` for
hot-reload parity with `backend/app/`, adds a `mediapipe_models` volume),
`backend/.gitignore`, `docs/setup/local-development.md`,
`docs/decisions/0007-...` (new), `docs/roadmap/phase-b-platform.md`
(Milestone 12's earmarked ADR numbers bumped 0007/0008 → 0008/0009 — the
third time this has moved; same renumbering convention Phases 8 and 9 used).

**Verified — a first for this repo.** Every previous AI-related phase
(8, 9, 10) was explicitly hand-reviewed only, with "no Python interpreter in
this environment" a standing gap since Phase 0. That gap is closed: this
pass actually ran `pip install`, `pytest`, `ruff`, `black`, and `mypy`
against real code, and separately drove `MediaPipeService.analyze()`
directly with a synthetic image outside the test suite — confirming the
real download-then-load-then-infer path executes correctly (~30MB model
download + load on first call, ~20ms on a warm second call, correctly
reporting `body_detected`/`face_detected` as `False` against a subject-less
image). The four `pytest` cases (health check + three validation-path cases
for this feature: bad content-type, oversized upload, undecodable bytes) all
pass for real, not just by inspection.

**Self-review caught one real defect, fixed**: the endpoint originally
called the sync, CPU-bound (and, on a cold cache, network-bound)
`analyze_image()` directly inside `async def`, which would block the entire
event loop for the full inference duration — every other concurrent request
on the process would stall. Fixed by wrapping the call in FastAPI's
`run_in_threadpool` in `app/api/v1/endpoints/ai.py`; the existing
`threading.Lock` in `MediaPipeService._ensure_loaded()` was already correct
for this (it exists specifically so concurrent threadpool requests don't
each trigger their own model load), it just wasn't being exercised from a
real thread until this fix.

**Running the linters for the first time also surfaced pre-existing,
unrelated latent issues**, since `backend/ai/` had never been in ruff's or
mypy's scope before this feature added it (`pyproject.toml`'s `known_first_party`/
`src` never listed `ai`): `ai/models/job.py` has two `str, Enum` classes ruff
would modernize to `StrEnum` (left as-is — a behavior-relevant enough change
that it deserves its own look, not a drive-by fix in a file this feature had
no other reason to touch), and `app/redis/client.py` has a pre-existing
`no-any-return` mypy finding (same reasoning, left as-is). One pre-existing
issue *was* fixed, because it was on a line this feature's own edit already
touched: `app/core/config.py`'s `# type: ignore[call-arg]` had gone stale
(the current pydantic/mypy versions no longer need it) and was removed.

**Known gaps, stated not hidden**: no automated test exercises a real
photo with an actually-detectable body/face — the fourth test only confirms
the pipeline runs correctly and reports "not detected" against a blank
image; a real photo pass is manual-verification-only (see this feature's
Testing Instructions in conversation). Face-landmark detection isn't wired
to any consumer yet (no `WorkflowStage`, no `StyleProfile` field) — it's
new scope beyond what `docs/roadmap/ai-model-integration-roadmap.md`
documents for MediaPipe's role (body pose only), included because the task
explicitly requested it. This endpoint has no auth, no guest-identity
association, and no rate limiting — consistent with the rest of the
backend's current no-auth state, not a regression specific to this feature,
but worth revisiting once Milestone 6 (Authentication) exists. `ai/`'s own
HTTP surface (`ai/src/inference/`) remains exactly as unbuilt as before —
correctly out of scope, since this feature's chosen architecture (ADR 0007)
never calls it.

## Phase: 10 — Real AI model integration roadmap (planning only, no code)

`docs/roadmap/ai-model-integration-roadmap.md` (new): per-model detail
(why/input/output/dependencies/expected GPU usage/integration order/
alternatives) for the six named future models — MediaPipe, DWPose, SCHP,
IDM-VTON, InstantID, Real-ESRGAN — plus a recommended implementation
sequence (MediaPipe → SCHP → IDM-VTON-or-CatVTON → InstantID →
Real-ESRGAN, with DWPose as a conditional swap rather than its own step)
and a named, per-model licensing-risk gate ahead of any commercial
shipping. Elaborates `docs/roadmap/phase-b-platform.md`'s Milestone 12 —
doesn't replace or duplicate it.

**Architecture review across Phases 8-9-10, findings**: every one of the
six models maps cleanly onto a `WorkflowStage` value and an existing DTO
fixed back in Phase 8, before any model was discussed individually — zero
contract changes required, the strongest evidence yet that ADR 0004's
orchestration boundary and ADR 0006's engine pluggability were shaped
correctly. Dependency gap itemized precisely: only MediaPipe (and IDM-VTON's
*generic* diffusion stack, not its specific checkpoint) has dependencies
already installed from Phase 0 — DWPose, SCHP, InstantID, and Real-ESRGAN
all still need `ai/requirements.txt` entries, deferred to whichever PR
first implements each, per convention. No new ADR warranted (the sequence
confirms Phase 8's existing stage order, it doesn't introduce a new
decision). No stale cross-references found this pass — unlike Phases 8
and 9, nothing needed correcting.

**Still outstanding, unaffected by this phase**: the preprocessing
pipeline and AI Service Layer design briefs (posted earlier, both
unapproved) remain unbuilt; this roadmap's pose/parsing sections describe
what those stages will do once approved, without building anything
against them.

## Phase: 9 — Virtual Try-On Engine architecture (pluggable model boundary, design only)

Design for the model-swapping boundary in root `ai/` — a `VirtualTryOnEngine`
interface plus stub candidates, so IDM-VTON, CatVTON, or any future model
can be swapped in without changing any code that calls into generation.
Explicitly bounded: no model downloaded, no model loaded, no inference
implemented. Confirmed scope: a single 2D user photo + a single 2D
clothing photo in, a single realistic 2D generated image out — not a 3D
avatar, not a digital human, consistent with (not a revision of) every
prior phase's assumptions.

**New**, all under `ai/src/models/`: `virtual_tryon_engine.py`
(`VirtualTryOnEngine`, one abstract method — `generate(user_image,
clothing_image) -> VirtualTryOnResult`, deliberately minimal so pose/
parsing needs stay each engine's own constructor-injected concern, not
part of the shared contract), `dto.py` (`VirtualTryOnResult`, the one
DTO in this codebase carrying actual image data rather than metadata —
`arbitrary_types_allowed=True` used deliberately), `engines/`
(`IDMVTONEngine`, `CatVTONEngine` — both stubs, `generate()` raises
`NotImplementedError`, each docstring naming a real published difference
between the two models), `engine_registry.py`
(`VirtualTryOnEngineRegistry.create(name)` — the one place a new engine
gets registered). `ai/src/core/config.py` gained `TRYON_ENGINE: str =
"idm-vton"` — config-driven selection, not read by anything yet.
`docs/decisions/0006-pluggable-virtual-tryon-engine.md` (new) and
`docs/architecture/ai-tryon-engine.md` (new — folder/interface/scalability/
swap-mechanism explanation) record the design; `ai-pipeline.md`
cross-references it.

**Review caught the same class of drift as Phase 8, fixed again**:
`docs/roadmap/phase-b-platform.md`'s Milestone 12 had already re-earmarked
ADR numbers `0006`/`0007` for its own future "ai-model-selection"/
"gpu-infrastructure" decisions (set during Phase 8's review) — this
phase's ADR took `0006` instead, so those got bumped again to `0007`/
`0008`, this time with an explicit note to verify the actual next-free
number at implementation time rather than trust a hardcoded one (since
this has now moved twice). Milestone 12's "Files to create" list also
named a `ai/src/models/tryon_pipeline.py` that no longer matches reality
— corrected to point at `engines/idm_vton_engine.py`'s real body instead.

**Verified**: hand-reviewed all 7 new/changed Python files for import
correctness (relative-import depth in `engines/` — two levels up to
reach `dto.py`/`virtual_tryon_engine.py`) and Pydantic v2 syntax.
Confirmed via grep: no `from_pretrained`/model-download calls, no route
decorators, no import of `backend/ai/` from `ai/` (cross-service import
rule held), both engines' `generate()` bodies are `NotImplementedError`.
**Not verified**: no Python interpreter/pip/Docker in this environment
(standing gap since Phase 0) — hand-reviewed only, not executed.

**Known gaps, stated not hidden**: `TRYON_ENGINE` isn't read by anything
yet — no code resolves it through `VirtualTryOnEngineRegistry.create()`,
since nothing calls generation at all in this pass; the registry has no
"active engine" convenience accessor (a `get_active_engine()` reading
`Settings.TRYON_ENGINE` and calling `.create()` was considered and left
out — nothing needs it until something actually calls generation, and
adding it now would be built for a caller that doesn't exist yet); this
design still depends on the preprocessing pipeline and AI Service Layer
briefs from earlier this same work session, both of which remain
unapproved and unbuilt — a real `IDMVTONEngine`/`CatVTONEngine` will need
whichever of those actually gets approved to supply pose/parsing data.

## Phase: 8 — AI backend architecture (design only — no inference, no endpoints, no models)

Design, not build, of the orchestration layer connecting the frontend's
already-built try-on flow (Phases 5–7, still running on mocked responses)
to real inference in `ai/` (project root). Explicitly bounded per the
task: no model downloaded, no inference implemented, no endpoint
implemented — every function that will eventually do real work raises
`NotImplementedError` with a stated reason instead of a body.

**Two ADRs resolve real tensions, not rubber-stamped**:
- `docs/decisions/0004-ai-orchestration-vs-execution-boundary.md` — the
  requested `backend/ai/` folder structure, read literally, could be
  mistaken for moving AI processing into the FastAPI process, undoing
  ADR 0002's "separate `ai/` service for independent GPU scaling"
  decision. Resolved: `backend/ai/` never loads a model or imports
  PyTorch; it owns job lifecycle, data contracts, stage order, and cheap
  CPU-only pre/post work. `ai/` (root) remains the only place inference
  runs, called over HTTP.
- `docs/decisions/0005-async-job-processing-via-redis.md` — resolves
  `overview.md`'s long-open "sync vs. async inference handling"
  question. Chose `arq` (async-native, matches the backend's existing
  async SQLAlchemy/Redis client) over Celery (too heavy for current
  scale) or RQ (sync-only, fights the async-first codebase). The queue
  producer lives in `backend/ai/services/job_queue.py`; the consumer is
  a new deployable unit — a separate worker process — not implemented
  yet.

**New**: 25 files under `backend/ai/` (`api/`, `models/`, `services/`,
`preprocess/`, `pipelines/`, `postprocess/`, `storage/`, `utils/`) —
Pydantic data contracts for every workflow stage (`job.py`,
`validation.py`, `pose.py`, `parsing.py`, `tryon.py`, `identity.py`,
`enhancement.py`), and structural stubs (every function raises
`NotImplementedError`, stating why) fixing the call shape for
`services/ai_client.py` (HTTP to root `ai/`), `services/job_queue.py`
(Redis producer), `services/workflow.py` (the orchestration loop), and
the declarative stage order in `pipelines/tryon_pipeline.py`. Full
write-up: `docs/architecture/ai-backend.md` — folder-by-folder and
file-by-file explanation, the 10-requirement-to-file mapping, the full
data flow (upload → validate → enqueue → worker dequeues → sequential
stage execution → store → client polls), and a future-scalability
section (horizontal worker scaling, per-stage queues, NVIDIA NIM
migration path, model swaps contained to `ai_client.py`, storage backend
swap). `docs/architecture/overview.md` and `ai-pipeline.md` updated to
resolve their previously-open "how does the backend talk to `ai/`" and
"sync vs. async" questions rather than left stale.

**Review caught two real issues in earlier work this same phase, both
fixed rather than left**:
- ADR 0005's dependency-addition rule cited `docs/roadmap/README.md`
  with an exact quote that doesn't actually appear there — the real
  source is `design/react-native/04-inconsistencies-and-recommendations.md`
  (written for frontend deps). Citation corrected in the ADR and in
  `job_queue.py`'s docstring.
- ADR numbers 0004/0005 collided with `docs/roadmap/phase-b-platform.md`'s
  Milestone 12 plan, which had already earmarked
  `docs/decisions/0005-ai-model-selection.md` and
  `0006-gpu-infrastructure.md` for future decisions. Renumbered to
  0006/0007 in that file, with a note explaining why, so that plan
  doesn't quietly go stale. Also corrected Milestone 12's assumption
  that `ai_client.py` first appears in Milestone 4 — Milestone 4 (Phase
  6) only ever built a frontend-only mock; the real
  `backend/ai/services/ai_client.py` didn't exist until this phase.

**Verified**: hand-reviewed every one of the 25 new Python files for
import correctness (relative-import depth, no circular imports),
Pydantic v2 syntax, and cross-file reference consistency (e.g.,
`pipelines/tryon_pipeline.py`'s stage tuple matches `models/job.py`'s
`WorkflowStage` enum exactly, field-for-field). Confirmed via grep: no
`torch`/`huggingface`/`from_pretrained` anywhere in `backend/ai/`, no
`@router` route decorators, `ai_router` is never mounted in
`app/main.py`, and `arq` was not added to `backend/requirements.txt` —
all three explicit prohibitions (no models downloaded, no inference, no
endpoints) held. **Not verified**: no Python interpreter, pip, or Docker
in this environment (standing gap since Phase 0) — none of this has been
executed, imported, or type-checked by a tool, only hand-reviewed.

**Known gaps, stated not hidden**: where job status actually persists
(Redis hash vs. a Postgres row) is unresolved; whether
`backend/ai/api/router.py` gets used at all vs. status polling living
directly in `app/api/v1/` is unresolved; whether "is a person
detectable" validation stays separate from, or folds into, the
pose-detection stage is unresolved; model choice within each stage
(MediaPipe vs. DWPose, IDM-VTON vs. CatVTON, InstantID vs. PuLID) is
untouched by design, as scoped. The frontend's mocked 3-step flavor-text
(`reading_measurements`/`draping_fabric`/`matching_light`) doesn't map
1:1 to the real 7-stage `WorkflowStage` enum, so wiring this up later
will change the frontend's step-label mapping, not just its data source
— not a fully seamless swap, unlike the result-image field itself.
`backend/ai/models/`'s snake_case field names (`image_uri`) don't
wire-match the frontend's camelCase (`imageUri`) — that translation is
`app/schemas/`'s job (not yet built), not this module's.

## Phase: 7 — Try-On Results screen (closes the core loop)

`docs/roadmap/phase-a-core-loop.md` Milestone 5, replacing the deliberate
stub from Phase 6. This closes the full core loop end to end: photo →
garment → generate → **see result** — the point the whole roadmap was
sequenced to reach as early as possible.

**The architectural bet**: `TryOnJob` gained a `result: TryOnResult | null`
field (`{ imageUri: string | null; isMock: boolean; mockCaption: string |
null; reasoning: string }`). The results screen's image display branches
on `imageUri` being present — null renders a labeled placeholder, a real
URL would render the real image. Nothing about the screen needs to change
when Milestone 12 (Real AI Pipeline) replaces the mock service with one
that populates a genuine `imageUri` — this is the "future AI integration"
architecture the task asked for, made concrete as a type-level branch
rather than a promise.

**Retrofit**: `use-tryon-job.ts` (the processing screen's create+poll
hook) was split — the read+poll query logic moved into a new
`use-tryon-job-query.ts`, now shared by both the processing hook and the
results screen, which only ever reads an existing job by id and never
creates one. Validated by two real consumers, same bar as every prior
extraction.

**New**: `components/result-canvas.tsx` (image-or-placeholder + caption —
serves both the "before" and "after" views), `compare-toggle.tsx`,
`source-images-row.tsx` (a deliberately separate, third occurrence of
"image or placeholder" logic — not unified with `ProcessingImagesRow` or
`ImagePreviewFrame` this time; named as a real candidate for a shared
`AppImage` primitive next time this pattern recurs). Save is an honestly
unpersisted local toggle (no storage — Wardrobe/Milestone 7 is where real
saving belongs). Share uses React Native's core `Share` API — genuinely
functional, zero new dependencies, text-only since there's no real
generated image to attach yet. Retry routes back through the processing
screen rather than duplicating job-creation logic on this screen.

**Verified**: `tsc --noEmit`, `expo lint`, `prettier --check` clean; a full
`expo export --platform web --clear` bundled 1285 modules across all 7
routes. **Not verified**: no device/simulator here — same standing caveat
as every prior UI feature.

**Known gaps, stated not hidden**: three of the screen's states (missing
job id, job not found, job still processing) are unreachable through the
app's own navigation right now and have zero click-through coverage — only
a direct/bookmarked URL exercises them; `TryOnResult` has no numeric score
field alongside its reasoning text, even though the original design shows
one (trivial to add later, not built now); Save's state change has no
screen-reader live-region announcement; still no automated tests
(`ResultCanvas`'s render branches are a presentational-testing gap,
distinct in kind from the five pure-function targets already named in
prior phases).

## Phase: 6 — AI Processing screen (mock async job, first Reanimated use)

The culmination of the core loop so far: `docs/roadmap/phase-a-core-loop.md`
Milestone 4, built as a genuine create-then-poll async job (mocked, but the
real shape), plus a minimal, explicitly-scoped results stub to make
"navigate to results when complete" actually functional without
scope-creeping into the full Milestone 5 build.

**Retrofit, not just new code**: the shared image-session store (from
Phase 4) gained a `preparedResult` field — neither prior upload screen's
own rendering logic needed to change, only their two hooks, which now
persist their mutation's success into the store so it survives navigation
away. This was the actual gap blocking this screen: the two previous
features' "is this ready" state died the moment you left their screens.

**New, shared:**
- `src/hooks/use-reduced-motion.ts` — `AccessibilityInfo`-backed, reflects
  the OS setting changing at runtime
- `src/components/thinking-indicator.tsx` — first real use of
  `react-native-reanimated` (installed since Phase 0, unused until now); a
  pulsing orb, always paired with a named step, never a bare spinner;
  becomes a static dot under reduced motion. Built shared *before* a second
  consumer exists — justified by `design/react-native/02-component-inventory.md`
  already naming it as reused by onboarding, chat, and pull-to-refresh, not
  by guessing ahead of the codebase's own established pattern

**New, `tryon` feature**: `services/tryon-job.ts` (an in-memory mock job —
`createTryOnJob` returns immediately and kicks off a background
progression through 3 named steps that `getTryOnJob` polls, an ~8% chance
of a simulated mid-generation failure), `hooks/use-tryon-job.ts` (mutation
+ `refetchInterval`-polling query, stopping itself on a terminal status),
`components/processing-images-row.tsx`, `screens/tryon-processing-screen.tsx`
(the actual requested screen), `screens/tryon-results-screen.tsx`
(**deliberately a stub** — confirms the handoff works, states plainly that
the real Results screen is unbuilt). Routes: `/tryon-processing`,
`/tryon-results/[jobId]` (first dynamic route in the app).

**Verified**: `tsc --noEmit`, `expo lint`, `prettier --check` clean; a full
`expo export --platform web --clear` bundled 1281 modules across all 7
routes — this specifically caught a real error `tsc` alone wouldn't have:
`app.json`'s `typedRoutes` experiment rejects a template-literal string for
a dynamic route, requiring the typed `{ pathname, params }` object form
instead, now used in `tryon-processing-screen.tsx`. **Not verified**: no
device/simulator here — the reduced-motion behavior, the animation itself,
and the "navigating away mid-job and back starts fresh" assumption are all
implemented but runtime-unverified.

**Known gaps, stated not hidden**: the mock job `Map` never gets cleaned up
(harmless at this scale); poll interval (600ms) is tuned for a responsive
mock, not validated as a production-appropriate value; the results screen
has no authorization check on `jobId` (irrelevant until real auth exists,
same category of gap as the upload layer's missing auth headers); still no
automated tests (`runJobProgression`'s step transitions and
`useTryOnJob`'s terminal-status detection are now the 4th and 5th named
targets, still deferred to `docs/roadmap` Phase C).

## Phase: 5 — Upload API layer (real multipart client, mock-fallback)

Replaces the pure-mock "prepare" services from Phases 3–4 with a real
upload client that attempts an actual multipart request and falls back to
a mock **only when the backend is genuinely unreachable** — not on any
failure. This distinction is the core of the design: a real backend error
(a validation failure, a broken server) is surfaced, never silently masked
behind a fake success.

**New, shared** (`frontend/src/services/api/`, `frontend/src/lib/`):
- `upload-client.ts` — a second axios instance, deliberately separate from
  the existing `apiClient` (Phase 0): no default `Content-Type`, so
  `FormData`'s multipart boundary can be auto-generated per-request instead
  of clobbered by a fixed JSON default; a longer (60s) timeout than typical
  JSON calls
- `upload-image.ts` — builds multipart `FormData` from a `PickedImage`,
  tracks progress via `onUploadProgress`, retries transient failures
  (network errors, 5xx) with backoff, and classifies the final outcome:
  `BackendUnavailableError` (no response, or 404 — today's actual reality,
  since the real endpoints aren't built) triggers the caller's mock
  fallback; anything else (a real 4xx, a persisting 5xx) is thrown as-is
- `with-retry.ts` — generic retry-with-backoff, not upload-specific
- `src/components/app-progress-bar.tsx` — new shared component (`primary`/
  `neutral` fills only; the fuller spec's gold/green variants are reserved
  for scores and celebratory moments, not general progress, per the
  original design bundle)

**Modified**: both features' `prepare-photo.ts`/`prepare-garment.ts` now
attempt the real call first, falling back to the existing mock-building
logic (`simulateNetworkCall`, unchanged) only on `BackendUnavailableError`;
both mutation hooks expose upload `progress` (0-100); both screens render
`AppProgressBar` during the pending state. `tailwind.config.js` gained
`neutral-200` (the progress bar's track color); `.env.example` documents
that `localhost` doesn't reach a dev-machine backend from a physical phone
or Android emulator — a LAN IP is needed instead, and getting this wrong
looks identical to "the backend is down" from the app's perspective.

**Verified**: `tsc --noEmit`, `expo lint`, `prettier --check` clean; a full
`expo export --platform web --clear` bundled 957 modules across all 5
routes with no errors. **Not verified**: no device/simulator available
here — actual multipart upload behavior, real progress-event timing, and
the retry path (needs a flaky real backend to exercise, which doesn't
exist) are all implemented but runtime-unverified.

**Known gaps, stated not hidden**: no runtime schema validation on the
backend response (`response.data` is trusted via a TypeScript generic, not
checked — `env.ts`'s Zod pattern should extend here once a real endpoint
exists to validate against); neither axios client attaches an auth header
yet (both will need it together once Milestone 6/Authentication lands);
the 404-means-unavailable rule is only unambiguous while no real endpoint
exists — a genuine business-logic 404 from the future real route would
need a different signal to distinguish from "route missing"; still no
automated tests (`classifyUploadError`/`isRetriableAxiosError`/`withRetry`
are now the highest-value targets, deferred to `docs/roadmap` Phase C).

## Phase: 4 — Second feature: Clothing Image Upload (+ shared-code refactor)

Built under the same Feature Implementation Protocol as Phase 3. Scope:
gallery pick, in-app camera capture (`expo-camera`, not the native picker's
built-in camera used previously — see below), preview, delete/replace, and
a **mocked** "prepare for AI" call — a frontend-only slice of
`docs/roadmap/phase-a-core-loop.md` Milestone 3, with more scope than that
milestone's original sketch (delete/replace; no category/tagging, deferred
to Wardrobe/Milestone 7).

**This feature triggered a refactor of Phase 3's code, not just new code.**
Building a second, structurally-identical upload flow was the real second
consumer that justified promoting genuinely-shared logic out of
`user-photo/` — per the DRY guidance in `CLAUDE.md`, this is "the standard
to match," not optional cleanup. Moved to shared locations:
- `src/lib/images/validate-image.ts` (was `user-photo/lib/`)
- `src/hooks/use-image-picker.ts` (was `user-photo/hooks/`; narrowed to
  gallery-only now that camera capture is a real in-app screen, not an
  imperative picker call)
- `src/types/index.ts` +`PickedImage`, +`ImageValidationErrorCode`
- `src/components/image-source-picker.tsx` (was feature-local, zero
  feature-specific content to begin with)
- `src/components/image-preview-frame.tsx` (new) — image + validation text,
  shared; the action buttons below it stay feature-specific
- `src/lib/images/create-image-session-store.ts` (new) — a Zustand store
  *factory*: both features get an identically-shaped but **separate**
  store instance (not one shared store — a user photo and a garment photo
  must coexist once Milestone 4 needs both at once)
- `src/lib/mock-network.ts` (new) — shared simulated latency/fault helper
  for both mocked "prepare" services
- `src/components/app-button.tsx` extended with an optional
  `tone?: 'destructive'` (for the Delete action) — additive, verified no
  existing call sites needed changes

**New**: `src/components/camera-capture-view.tsx` — a real in-app camera
screen (`expo-camera`'s `CameraView` + a shutter), replacing the previous
feature's use of `expo-image-picker`'s built-in native camera launcher.
Retrofitted into User Image Upload too, so both features now share the same
camera mechanism rather than diverging. `src/features/garment/` follows the
same internal shape as `user-photo/` (types/store/services/hooks/components/
screens) file-for-file.

**Navigation**: new route `/garment-upload`, linked from home, and linked
*from* User Image Upload's success state ("Next: add a garment →") — the
core-loop screens are now connected in sequence, not just independently
reachable from home.

**Verified**: `tsc --noEmit`, `expo lint`, `prettier --check` all pass
clean; a full `expo export --platform web` bundled all 821 modules across
all 5 routes with no errors — this specifically exercises whether
`expo-camera`'s APIs resolve correctly, which type-checking alone wouldn't
fully cover. **Not verified**: no device/simulator available in this
environment — camera permission flows, live preview rendering, and actual
capture have not been runtime-tested. See Testing Instructions (in
conversation) before trusting the camera path fully.

**Known gaps, stated not hidden**: a failed camera capture is a silent
no-op (no dedicated error UI for that specific path yet); no automated
tests exist for either upload feature (`validateImage()` — now shared by
two features — remains the natural first target); `CameraCaptureView`'s
placement in `src/components/` alongside much simpler primitives is a
judgment call worth revisiting if a third component of similar weight
appears.

## Environment note: downgraded from Expo SDK 57 → SDK 54

Phase 0 scaffolded on SDK 57. The public Expo Go app (App Store/Play Store)
turned out to be capped at SDK 54 — Expo has an active app-store approval
backlog (SDK 55 pending Apple review with no confirmed date, SDK 56/57 only
available via TestFlight/simulator as of this writing), so a physical phone
running the normal Expo Go app couldn't open this project at all
("incompatible" error). Fixed via `npx expo install expo@^54.0.0` +
`npx expo install --fix` + a clean `node_modules` reinstall (the in-place
`--fix` hit an `ERESOLVE` conflict from stale packages; a full reinstall
resolved it cleanly). All 27 Expo/React Native packages are now aligned to
SDK 54; `tsc --noEmit`, `expo lint`, and `prettier --check` all pass clean,
and the User Image Upload feature's `expo-image-picker` usage needed zero
code changes across the 3-version downgrade.

**This is a pragmatic, not permanent, choice.** SDK 57 wasn't wrong — it was
ahead of what Expo Go's public release supports. Worth upgrading back once
Expo Go's app-store release catches up, or once the project moves to a
[development build](https://docs.expo.dev/develop/development-builds/expo-go-to-dev-build/)
(installs like a normal app, not gated by Expo Go's release cadence at all).
All "SDK 57" references elsewhere in the repo (`README.md`, `CLAUDE.md`,
`docs/architecture/frontend.md`, `frontend/README.md`,
`design/react-native/03-screen-component-map.md`) were updated to SDK 54 to
match; `PROJECT_STATUS.md`'s Phase 0 entry below is left as SDK 57 on
purpose — it's an accurate historical record of what was true then.

## Phase: 3 — First feature: User Image Upload (capture/select/preview/validate, mocked backend)

The first real feature code in the repo, built under `CLAUDE.md`'s Feature
Implementation Protocol (explain → implement → five reviews → stop). A
deliberately narrowed frontend-only slice of `docs/roadmap/phase-a-core-loop.md`
Milestone 2: capture or select a photo, preview it, validate format/size
client-side, and call a **mocked** "prepare for AI" service. The real backend
(`User`/`UserPhoto` models, storage, the actual endpoint, guest device
identity) is explicitly deferred to its own later feature cycle, not built
here — see the roadmap's Milestone 2 for that scope.

**Built** (`frontend/src/features/user-photo/` — 12 new files, plus 2 new
shared components and 1 modified route):
- `hooks/use-image-picker.ts` — wraps `expo-image-picker`'s gallery/camera
  launchers with explicit permission handling
- `lib/validate-image.ts` — pure format/size validation (client-side UX
  fast-fail; real enforcement stays server-side per the roadmap's plan)
- `store/upload-session.ts` (Zustand) — in-progress selection state
- `services/prepare-photo.ts` + `hooks/use-prepare-photo.ts` (TanStack Query)
  — the mocked "prepare for AI" call, typed to the real endpoint's planned
  contract so only this one function's body changes when that endpoint exists
- `components/image-source-picker.tsx`, `components/image-preview.tsx`,
  `screens/user-photo-upload-screen.tsx` — the screen itself
- `src/components/app-button.tsx`, `src/components/app-scaffold.tsx` — the
  first two real components from the (previously spec-only) design system,
  scoped to just what this screen needs, not the full Phase 1 inventory
- `tailwind.config.js` / `src/global.css` — the design tokens this screen
  actually uses (colors, spacing, radius), added incrementally rather than
  the full `design/react-native/01-design-tokens.md` palette at once
- New route `/upload-photo`, linked from the placeholder home screen

**Verified**: `tsc --noEmit`, `expo lint`, and `prettier --check` all pass
clean. **Not verified**: never run on a device or simulator (none available
in this environment) — the `expo-image-picker` API surface, NativeWind
`className` support on `SafeAreaView`/`expo-image`, and actual on-screen
behavior are all written to best current knowledge and type-checked, but not
runtime-tested. See the feature's Testing Instructions (in conversation) for
the manual verification steps to run before trusting this fully.

**Explicitly deferred, not gaps**: automated tests (none written this pass —
`validateImage()` flagged as the natural first unit-test target), the real
backend endpoint, `AppCallout` (would absorb 4 near-identical inline error
`Text` blocks currently duplicated in the screen), camera capture uses the
native OS picker rather than a custom branded camera UI, no custom
typography/icon system yet (system font, no `AppText`/`AppIcon`).

## Phase: 2 — Development roadmap (planning only, no code)

A full development roadmap now exists in `docs/roadmap/` — 14 milestones
across three phases, sequenced so the core Virtual Try-On loop (upload photo
→ upload garment → generate → see result, with a mocked AI) is validated
before any platform features (auth, wardrobe, shopping, etc.) are built
around it:

| File | Covers |
|---|---|
| `docs/roadmap/README.md` | Methodology, phase summary, one flagged addition to the given milestone list (a "Real AI Pipeline Integration" milestone — the given list mocks AI but never explicitly un-mocks it), and 3 cross-cutting decisions made once and referenced everywhere (guest identity instead of a separate anonymous-session table, async job pattern from the first AI call even though the mock is instant, local-disk storage now behind an interface narrow enough to swap to S3 later) |
| `docs/roadmap/phase-a-core-loop.md` | Foundation (done) → Shared UI Components → User Image Upload → Clothing Image Upload → AI API Integration (mock) → Try-On Results |
| `docs/roadmap/phase-b-platform.md` | Authentication → Wardrobe → User Profile → Shopping Integration → AI Stylist → Notifications → Real AI Pipeline Integration (flagged addition) |
| `docs/roadmap/phase-c-launch.md` | Testing → Deployment |

Every milestone specifies Objective, Features, Files to create, Dependencies,
Backend requirements, Frontend requirements, Testing strategy, Risks, and
Definition of Done. **No code was written producing this roadmap** — it
supersedes the old informal "Next" list below, which is kept only as a
historical record of Phase 0's own forward-looking notes.

## Phase: 1 — Design system & component architecture (spec only, no code)

The user supplied a complete approved UI/UX design bundle in `design/figma/`
(originally a Flutter handoff). It was read recursively and translated into
a React Native/Expo/NativeWind/Expo Router design system specification in
`design/react-native/` — design tokens, a full component inventory (purpose/
props/variants/states/reusability per component), a 26-screen → component
map with the navigation graph translated to Expo Router, and a findings doc
covering the Flutter/RN mismatch, RN-specific technical risks (Material
Symbols icon font, `expo-blur` Android fidelity, RN's platform-forked shadow
model), and the product open-items the source design itself hadn't settled
(checkout, resale, global dark mode, free-tier limits, notification
triggers) — carried forward rather than silently decided.

**Nothing from this phase has been written into `frontend/` yet** — no
tokens pasted into `tailwind.config.js`, no components created, no screens
built. See `design/react-native/README.md` for the full document map.

## Phase: 0 — Foundation

Project architecture initialized. No features, auth, or domain API endpoints
implemented yet — this phase was scoped to scaffolding only.

## Done

- [x] Repo layout: `frontend/`, `backend/`, `ai/`, `docs/`, `design/`, `assets/`, `scripts/`
- [x] Frontend: Expo SDK 57 + TypeScript + Expo Router scaffolded, trimmed to a
      minimal placeholder screen (demo tab/tutorial UI removed)
- [x] Frontend libraries installed & wired: NativeWind, React Hook Form, Zod,
      TanStack Query (client instantiated), Zustand (folder ready, no store yet),
      Axios (client instantiated), Reanimated (via Expo default), Expo Camera,
      Expo Image Picker
- [x] Frontend tooling: TypeScript strict mode + `@/*` alias, ESLint
      (`eslint-config-expo` + Prettier compat), Prettier — verified clean
      (`tsc --noEmit`, `expo lint` both pass with zero errors/warnings)
- [x] Backend: FastAPI app skeleton (`app/main.py`), layered structure
      (`api/`, `services/`, `models/`, `schemas/`, `db/`, `redis/`, `core/`,
      `middleware/`), async SQLAlchemy 2.0 session setup, async Redis client,
      Pydantic Settings config, `/health` liveness endpoint, one passing test
      (`tests/test_health.py`, unexecuted — see Known gaps)
- [x] Backend tooling: Black/Ruff/isort/mypy configured in `pyproject.toml`,
      `requirements.txt` + `requirements-dev.txt`
- [x] Alembic configured for async migrations, wired to app config for DB URL
      (no migrations generated yet — no models exist)
- [x] AI service: folder structure (`pipelines/`, `models/`, `preprocessing/`,
      `postprocessing/`, `inference/`, `core/`), config skeleton, requirements
      files (CPU by default, GPU install path documented); no pipeline code
- [x] Docker: `Dockerfile` for backend and ai, root `docker-compose.yml`
      (postgres, redis, backend; ai service behind an opt-in `ai` profile)
- [x] PostgreSQL + Redis: configured via `docker-compose.yml` + `.env`
      variables; not started/verified against a running container (no Docker
      on this machine — see Known gaps)
- [x] `.env.example` for root, frontend, backend, ai
- [x] Docs: architecture overview + one doc per service, 3 ADRs
      (`docs/decisions/`), local dev setup guide
- [x] `README.md`, `CLAUDE.md`, this file

## Known gaps / not verified

The machine this was scaffolded on has Node.js and Git, but **not Python or
Docker CLIs**. Consequently:

- Backend and AI service code has never been executed, imported, or
  type-checked against real dependencies — only hand-reviewed.
- `docker compose up` has never been run — service definitions,
  healthchecks, and networking are unverified.
- Alembic has never generated or applied a migration.
- Backend/AI test suites have never been run (`pytest` not available).

**Action before trusting backend/ai/Docker work:** install Python 3.11+ and
Docker Desktop, then run `docs/setup/local-development.md`'s backend/ai/
Docker steps and this repo's test suites.

## Next (superseded — see `docs/roadmap/` for the actual plan)

Phase 0's original forward-looking notes, kept for history. Each now maps to
a specific roadmap milestone rather than a flat list:

- Auth strategy decision (ADR) + implementation → Phase B, Milestone 6
- First domain model + Alembic migration → Phase A, Milestone 2 (`User`, `UserPhoto`)
- First API endpoint(s) → Phase A, Milestone 2
- First real screen (replace the placeholder home screen) → Phase A, Milestone 1 (components) then Milestone 5 (first full screen)
- First AI pipeline (preprocessing → model → postprocessing) end-to-end → Phase B, Milestone 12 ("Real AI Pipeline Integration") — Phase A, Milestone 4 ships a mock first, deliberately
- CI pipeline → Phase C, Milestone 13
- Object storage decision for uploaded/generated images → decided as "local disk now, behind an interface, S3-compatible later" in `docs/roadmap/README.md`'s cross-cutting decisions; the S3 swap itself lands in Phase C, Milestone 14
