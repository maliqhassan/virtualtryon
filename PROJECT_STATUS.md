# Project Status

Last updated: 2026-07-31

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
