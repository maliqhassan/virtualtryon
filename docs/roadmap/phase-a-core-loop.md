# Phase A — Prove the core loop

Goal of this phase: get from an empty app to "a user can upload their photo, upload a garment, generate a try-on, and see a result" as fast as honestly possible, so the product's core bet gets tested before anything else is built around it. The AI in this phase is a mock — the point is to validate the *loop*, not the model.

---

## Milestone 0 — Foundation

**Status: done.** Included for traceability; see `PROJECT_STATUS.md` Phase 0 and `docs/architecture/`.

### Objective
Stand up the three-service repo structure, tooling, and configuration with zero feature code.

### Features
None — infrastructure only.

### Files created
See `PROJECT_STATUS.md` Phase 0 section for the full list (`frontend/`, `backend/`, `ai/`, `docs/`, `docker-compose.yml`, etc.).

### Dependencies
See `frontend/package.json`, `backend/requirements.txt`, `ai/requirements.txt` for the installed baseline every later milestone builds on.

### Backend requirements
FastAPI app skeleton, async SQLAlchemy + Alembic wiring, Redis client, `/health` endpoint. No domain models yet.

### Frontend requirements
Expo Router shell, NativeWind configured, placeholder home screen.

### Testing strategy
`tsc --noEmit` + `expo lint` (both verified clean). Backend/AI/Docker unexecuted on the scaffolding machine — flagged as a gap to close at the start of Milestone 1, not carried silently into later milestones.

### Risks
Backend/Docker never having been run is the standing risk carried out of Phase 0 — first item in Milestone 1's Definition of Done is closing it.

### Definition of Done
✅ Already met — see `PROJECT_STATUS.md`.

---

## Milestone 1 — Shared UI Components

### Objective
Turn `design/react-native/01-design-tokens.md` and `02-component-inventory.md` from specification into working code — the token layer plus the specific component subset Milestones 2–5 actually need. Not the full 40-component inventory; the rest get built just-in-time alongside the features that need them (Wardrobe's `ClosetItemCard`, Subscription's `PriceCard`, etc.), so nothing is built speculatively ahead of a screen that uses it.

### Features
Not user-facing — this milestone has no screens of its own, only the primitives later milestones render.

### Files to create
```
frontend/src/global.css                 — add the CSS custom properties from 01-design-tokens.md §1
frontend/tailwind.config.js              — theme.extend.colors/fontFamily/spacing/borderRadius/boxShadow
frontend/src/constants/tokens.ts         — AppIconSize, AppDurations (non-className tokens, per §6-7)
frontend/src/components/app-text.tsx
frontend/src/components/app-icon.tsx
frontend/src/components/app-button.tsx
frontend/src/components/app-icon-button.tsx
frontend/src/components/app-card.tsx
frontend/src/components/app-scaffold.tsx
frontend/src/components/app-image.tsx
frontend/src/components/app-progress-bar.tsx
frontend/src/components/thinking-indicator.tsx
frontend/src/components/app-skeleton.tsx
frontend/src/components/app-empty-state.tsx
frontend/src/components/app-error-view.tsx
frontend/src/components/app-callout.tsx
frontend/src/hooks/use-reduced-motion.ts
frontend/assets/fonts/                    — or rely on @expo-google-fonts/* packages directly (no local font files needed)
```

### Dependencies
```
@expo-google-fonts/manrope
@expo-google-fonts/instrument-serif
@expo-google-fonts/ibm-plex-mono
expo-image
```
(`@expo-google-fonts/noto-nastaliq-urdu` deferred — no Urdu screens until that's picked up per `design/react-native/04-inconsistencies-and-recommendations.md` §C. `expo-blur`, `expo-linear-gradient`, `@gorhom/bottom-sheet` deferred to the milestones that actually use them — `AppGlassPanel`, avatars/gradients, and sheets aren't needed until Phase B.)

### Backend requirements
None. Good checkpoint to close Phase 0's standing gap instead: install Python 3.11+ and Docker Desktop, run `docs/setup/local-development.md`'s backend steps, confirm `pytest` and `alembic upgrade head` (no-op) both actually run. Cheap to do now, expensive to keep deferring once real backend work starts in Milestone 2.

### Frontend requirements
- Font loading via `useFonts()` in `app/_layout.tsx`, gated behind `SplashScreen.preventAutoHideAsync()` — the hook-up point flagged as missing in `design/react-native/01-design-tokens.md` §2.
- `AppIcon`'s Material Symbols Rounded static font, loaded the same way (see `design/react-native/01-design-tokens.md` §6 for the exact constraint on variable-font axes).
- Root `colorScheme` forced to `'light'` on boot per `design/react-native/01-design-tokens.md` §1 (no global dark toggle yet).

### Testing strategy
- Component-level snapshot/render tests (`@testing-library/react-native` — new dev dependency) for each component's variant × state matrix, e.g. `AppButton` renders correctly for all 3 variants × 4 states.
- A throwaway "kitchen sink" screen (not a real route, or a route only reachable in `__DEV__`) rendering every component/variant side by side — the RN equivalent of the source design's own "1b design system board," used to visually diff against `design/figma/screenshots/02-design-system.png`.
- `tsc --noEmit` and `expo lint` stay green after every component lands (already the working pattern from Phase 0).

### Risks
- **Material Symbols static font may not have every glyph the per-screen inventory needs at the exact optical weight** — verify the glyph set against `design/figma/01-foundation.md` §8's full list before assuming `AppIcon` is complete, not after building 10 screens against it.
- **NativeWind CSS-variable dark-mode mechanism (`design/react-native/01-design-tokens.md` §1) is unverified against the installed NativeWind 4.2.6** — confirm the exact API (`colorScheme.set()` vs. an alternative) works as designed before other milestones depend on it.
- Building more components than the next 4 milestones actually need is wasted work if requirements shift — resist the temptation to "finish the whole inventory while we're in here."

### Definition of Done
- [ ] Phase 0's backend/Docker gap closed (Python + Docker installed, `pytest`/`alembic upgrade head` run successfully at least once)
- [ ] All 12 listed components implemented, typed, and rendering correctly in the kitchen-sink screen
- [ ] Visual diff against `design/figma/screenshots/02-design-system.png` for the components it covers shows no unintended deviation
- [ ] `tsc --noEmit`, `expo lint`, and the new component tests all pass
- [ ] Reduced-motion respected (`useReducedMotion()` used by `ThinkingIndicator` and `AppSkeleton`)

---

## Milestone 2 — User Image Upload

### Objective
A user (no account required yet) can capture or select their body photo(s) and have them durably stored and associated with their (guest) identity.

### Features
- Camera capture and photo-library selection for the body-scan flow (face / full body / optional side — matches `design/figma/03-screens.md` screen 06)
- Per-photo capture-state feedback (captured-sharp / needs-retake / optional-empty), per the source screen breakdown
- Upload with progress, and a durable server-side record of what was uploaded

### Files to create
```
frontend/src/features/onboarding/screens/upload-photos-screen.tsx
frontend/src/features/onboarding/components/capture-row.tsx     — single-use per design/react-native §3, not promoted to shared components
frontend/src/features/onboarding/hooks/use-image-capture.ts     — wraps expo-camera / expo-image-picker
frontend/src/services/api/uploads.ts                             — POST helpers, multipart body construction
frontend/src/store/upload-session.ts                              — Zustand: in-progress capture state (not server state)
frontend/src/lib/device-id.ts                                     — generates/persists a guest device id (expo-secure-store)

backend/app/models/user.py                — see "Guest identity" decision in docs/roadmap/README.md
backend/app/models/user_photo.py
backend/app/schemas/user_photo.py
backend/app/services/uploads.py           — validation, storage-interface calls
backend/app/services/storage/__init__.py  — narrow storage interface (local disk now, S3-shaped later)
backend/app/services/storage/local.py
backend/app/api/v1/endpoints/uploads.py
backend/app/core/deps.py                  — get_current_user_or_guest() dependency, reads/creates User by device id
```

### Dependencies
```
frontend: expo-image-manipulator (client-side resize/compress before upload)
backend:  pillow (server-side validation/re-encode), python-magic or filetype (MIME sniffing, don't trust the client's declared content-type)
```
(`expo-camera`, `expo-image-picker`, `python-multipart` already installed from Phase 0.)

### Backend requirements
- **`User` model**: `id`, `device_id` (unique, nullable), `email` (unique, nullable), `auth_provider` (`guest|email|google|apple`), timestamps. Guest rows have `device_id` set, everything else null, per the cross-cutting decision.
- **`UserPhoto` model**: `id`, `user_id` (FK), `slot` (`face|body_front|body_side`), `storage_path`, `status` (`uploaded|processing|ready|failed`), timestamps.
- First real Alembic migration: `alembic revision --autogenerate -m "add user and user_photo"`, reviewed by hand before applying (autogenerate is a draft, not a commit).
- `POST /api/v1/uploads/user-photo` (multipart, `slot` field + file) → creates/updates the `UserPhoto` row, stores via the storage interface, returns the record.
- `GET /api/v1/users/me/photos` → list current (guest) user's photos.
- `get_current_user_or_guest()` dependency: reads a `X-Device-Id` header, finds-or-creates the `User` row. This dependency is what every later authenticated endpoint eventually replaces with real session auth (Milestone 6) — built once, reused, not re-derived per endpoint.
- Local-disk storage behind the narrow interface from the cross-cutting decision — `save(file) -> path`, `read(path) -> bytes`, `delete(path) -> None`. S3-compatible swap in Deployment touches only `storage/` implementations, not callers.

### Frontend requirements
- Capture/selection UI matching the design's three-photo scan flow, wired to `expo-camera` and `expo-image-picker` (already installed).
- Client-side resize/compress before upload (avoid shipping a 12MP photo over a slow connection for no reason).
- Upload progress UI using `AppProgressBar` (Milestone 1).
- Device id generated once and persisted (`expo-secure-store`), sent as `X-Device-Id` on every request — the client-side half of the guest-identity decision.
- TanStack Query mutation for the upload, cache invalidation on success.

### Testing strategy
- Backend: `pytest` cases for the upload endpoint — valid image accepted, oversized file rejected, wrong MIME rejected (even with a spoofed extension — this is a real security check, not a formality, since it's a public-facing upload endpoint with no auth gate yet), guest user created on first request and reused on the second.
- Frontend: mock the upload service in a component test; verify capture-state UI (captured/retake/optional) reflects mock responses correctly.
- Manual: full capture → upload → confirm-in-DB flow on a physical device (camera behavior doesn't fully emulate in a simulator).

### Risks
- **This is the first public, unauthenticated write endpoint in the system.** No login gate means it needs its own abuse controls (file-size cap, rate limiting per device id, MIME/content sniffing) from day one, not "add auth later and call it secured" — Milestone 6 adding real accounts doesn't retroactively fix an abusable endpoint that shipped in Milestone 2.
- Body-scan photos are explicitly privacy-sensitive (per `assets/README.md`'s existing note from Phase 0) — confirm the local-disk storage path isn't inside anything that could end up in a build artifact or a committed directory.
- Client-side image compression quality/size tradeoffs need real-device tuning, not just simulator testing.

### Definition of Done
- [ ] User can capture/select all 3 photo slots and see per-slot status update after upload
- [ ] `User` and `UserPhoto` migrations applied cleanly against a real Postgres (via `docker compose up postgres`)
- [ ] Guest identity persists across app restarts (same device id → same `User` row)
- [ ] Upload endpoint rejects oversized/wrong-type files with a clear error, verified by a passing test, not just manual inspection
- [ ] Files land in and are readable back from the local-disk storage path

---

## Milestone 3 — Clothing Image Upload

### Objective
A user can add a garment image (their own clothing, for now — not yet a shop product) that becomes available to select in the try-on flow.

### Features
- Single-image capture/selection for a garment (simpler than the 3-photo body scan)
- Basic categorisation at upload time (top/bottom/eastern/shoes/accessories, matching the Closet chip categories already defined in the design system)

### Files to create
```
frontend/src/features/closet/screens/add-garment-screen.tsx   — minimal version; the full add-to-closet sheet (camera roll / shoot / receipt / link) is Milestone 7 (Wardrobe) — this milestone only needs "add one garment photo" to unblock Milestone 4
frontend/src/services/api/garments.ts

backend/app/models/garment.py
backend/app/schemas/garment.py
backend/app/services/garments.py
backend/app/api/v1/endpoints/garments.py
```

### Dependencies
None new — reuses Milestone 2's upload/storage plumbing directly.

### Backend requirements
- **`Garment` model**: `id`, `user_id` (FK), `storage_path`, `category`, `created_at`. (Fields like `worn_count`, `tag`, `slot` from the design's richer Closet model are added in Milestone 7 — this migration only needs what Milestone 4/5 require: an image to try on.)
- `POST /api/v1/garments` (multipart + category) → reuses `uploads.py`'s storage/validation logic rather than duplicating it (same abuse-control requirements as Milestone 2's endpoint apply here — same person, same unauthenticated-write risk).
- `GET /api/v1/garments` → list current user's garments.
- Second Alembic migration, reviewed the same way as the first.

### Frontend requirements
- Minimal capture/select + category-picker screen. Full Closet UI (grid, filters, favourites) is explicitly out of scope here — see Milestone 7.
- Reuse Milestone 2's upload hook/progress UI rather than re-implementing upload handling.

### Testing strategy
- Backend: same validation test pattern as Milestone 2 (reuse test fixtures rather than duplicating).
- Frontend: category selection persists correctly; uploaded garment appears in a subsequent `GET /garments` call in an integration test.

### Risks
- Tempting to over-build the Closet UI here since it's adjacent — resist; the full Wardrobe experience is Milestone 7 and pulling it forward delays reaching Milestone 5 (the actual validation point).
- Shares the same unauthenticated-endpoint abuse-control risk as Milestone 2 — same mitigations, not a new problem to re-solve.

### Definition of Done
- [ ] User can upload a garment photo with a category and see it persisted
- [ ] `GET /api/v1/garments` returns it
- [ ] At least one garment exists for the current guest user by the end of this milestone (needed as input to Milestone 4)

---

## Milestone 4 — AI API Integration (mock responses first)

**This is the milestone the whole phase exists to reach.** Everything before it was necessary plumbing; this is where the core product question — "does generating a try-on and showing a result work end to end" — becomes testable, even with a fake model behind it.

### Objective
Define and build the real request/response contract for try-on generation between `frontend` → `backend` → `ai`, fulfilled by a mock in `ai/` that returns *something* (e.g. the garment image composited or simply echoed back with a label) fast enough to validate the interaction pattern, without needing a working diffusion pipeline yet.

### Features
- "Generate try-on" action taking a body photo + a garment
- Async job lifecycle with visible progress (not a blocking spinner — see `ThinkingIndicator` from Milestone 1)
- Job status polling

### Files to create
```
frontend/src/features/tryon/hooks/use-tryon-job.ts        — TanStack Query mutation (create) + polling query (status)
frontend/src/services/api/tryon.ts

backend/app/models/tryon_job.py
backend/app/schemas/tryon_job.py
backend/app/services/tryon.py               — orchestrates: validate inputs exist → call ai/ → persist result
backend/app/api/v1/endpoints/tryon.py
backend/app/services/ai_client.py            — HTTP client wrapping calls to the ai/ service

ai/src/inference/mock_tryon.py               — the mock fulfilment logic
ai/src/api/                                   — minimal HTTP surface for the ai/ service (see note below)
ai/src/api/main.py
ai/src/api/routes.py
```

**Note on `ai/`'s HTTP surface:** Phase 0 deliberately left `ai/src/inference/` as a placeholder with no framework choice made (`docs/architecture/ai-pipeline.md`: *"How it's invoked... is an open decision, deferred until the first pipeline exists"*). This milestone is that first pipeline (even if fake) — it needs *a* decision now, not a further deferral, since Milestone 4 can't be built without `backend` having something to call. Recommendation: a minimal FastAPI app in `ai/` (same framework as `backend`, so `ai/requirements.txt` gains `fastapi`+`uvicorn` — small, justified addition) exposing one internal endpoint (`POST /generate`). A queue-based worker is very possibly the right answer once the *real* pipeline exists and generation takes real time under real load — revisit then, don't over-build a queue for a mock that returns instantly.

### Dependencies
```
ai:  fastapi, uvicorn (new — see note above)
```

### Backend requirements
- **`TryOnJob` model**: `id`, `user_id`, `user_photo_id` (FK), `garment_id` (FK), `status` (`pending|processing|completed|failed`), `result_storage_path`, `error_message`, timestamps.
- `POST /api/v1/tryon` — validates the referenced photo/garment belong to the requesting user, creates a `pending` job, calls `ai_client` (async), updates to `processing`/`completed`/`failed` based on the result, returns the job id immediately (client polls — see the cross-cutting async-job decision).
- `GET /api/v1/tryon/:id` — returns current status + `result_storage_path` when `completed`.
- `ai_client.py`: HTTP call to the `ai` service's `/generate`, with a timeout and a defined failure mode (job → `failed`, `error_message` set) — the contract this milestone exists to prove out, unchanged when the mock is later replaced by the real pipeline.
- Third Alembic migration.

### Frontend requirements
- Try-on trigger action (from wherever it's reachable at this point in the build — a simple screen is fine; the full Try-On studio UI is Milestone 5).
- Polling hook (`useTryOnJob`) using TanStack Query's `refetchInterval`, stopping once `status` is terminal.
- `ThinkingIndicator` wired to the job's status, not a generic spinner — enforces the no-spinner rule from `design/react-native/02-component-inventory.md` at the first point in the app where it actually matters.

### Testing strategy
- Backend: `pytest` — job creation with valid/invalid photo+garment references, status transitions, `ai_client` failure handling (mock the HTTP call, assert the job lands in `failed` with a message, not silently stuck in `processing`).
- `ai/`: a test hitting the mock `/generate` endpoint directly, independent of `backend` — the two services should each be testable in isolation, that's the point of the split.
- End-to-end (manual at this stage — Milestone 12 formalises this): full loop from Milestone 2's upload through this milestone's generate, on a physical device.

### Risks
- **Building the mock too convincingly** (e.g. actually blending images well) risks the team anchoring on it as "good enough" and deprioritising the Real AI Pipeline milestone — the mock's job is to prove the *loop*, not to look finished. Keep it obviously a placeholder (e.g. the label overlay `AppImage` already supports per `design/react-native/02-component-inventory.md`).
- Polling is simple but not efficient at scale — fine for validating the loop now, worth revisiting (webhook/push-based completion, tied into the Notifications milestone's "outfit ready" trigger) once this is more than a handful of concurrent users.
- The `ai_client` timeout value chosen now for a fast mock will be wrong for the real pipeline (seconds vs. potentially tens of seconds) — flagged so it's revisited in the Real AI Pipeline milestone, not left as a stale assumption.

### Definition of Done
- [ ] `POST /api/v1/tryon` → job created → polling shows `pending → processing → completed` → result path populated
- [ ] Failure path tested and handled (`ai` service down → job `failed`, not stuck)
- [ ] `ai/` service runs and is testable independently of `backend`
- [ ] No blocking spinner anywhere in the flow — `ThinkingIndicator` used throughout

---

## Milestone 5 — Try-On Results Screen

**Completing this milestone is the actual validation point for the product's core bet.** After this, there's a real (if AI-faked) end-to-end experience to react to, demo, and get feedback on before investing in Phase B.

### Objective
Build the actual Try-On studio screen from the design (`design/figma/03-screens.md` §12.3, `design/react-native/03-screen-component-map.md`), wired to Milestone 4's real job lifecycle instead of a placeholder.

### Features
- Canvas with idle / busy / done states (per the design's exact state machine)
- Result caption with the AI's "reasoning" line (mocked for now — real reasoning generation is out of scope until the Real AI Pipeline milestone, or possibly the AI Stylist milestone if reasoning generation piggybacks on that LLM integration)
- Save/share affordances (stubbed — Sharing itself isn't built until later; the buttons exist and are wired to a no-op or a "coming soon" state, not left entirely absent, so the screen matches the approved design)

### Files to create
```
frontend/src/features/tryon/screens/tryon-studio-screen.tsx
frontend/src/features/tryon/components/tryon-canvas.tsx
frontend/src/features/tryon/components/garment-rail.tsx        — GarmentRail from design/react-native/02-component-inventory.md
frontend/src/app/(tabs)/tryon/index.tsx                         — Expo Router route per design/react-native/03-screen-component-map.md
```

### Dependencies
None new.

### Backend requirements
None beyond Milestone 4 — this milestone is frontend-only, consuming the existing job API.

### Frontend requirements
- `AppGlassPanel` (Milestone 1 deferred this — build it now, this is its first real use) for the result caption, per the design's "glass only over imagery, 3 permitted uses" rule.
- Full canvas state machine (idle/busy/done/error) matching `design/figma/03-screens.md` §12.3 exactly, using `ThinkingIndicator` for busy.
- `GarmentRail` for garment selection, feeding Milestone 4's job creation.
- Dark-surface tokens applied directly (not via the `dark:` variant) per the forced-dark-screen pattern from `design/react-native/01-design-tokens.md` §1 — this is the screen that pattern was designed for.

### Testing strategy
- Component tests for each canvas state rendering correctly given a mocked job status.
- The `expo-blur` Android-fidelity risk flagged in `design/react-native/04-inconsistencies-and-recommendations.md` §B.2 gets its first real check here — test `AppGlassPanel` on an actual Android device, not just iOS/simulator, before calling this done.
- Manual end-to-end run of the full Phase A loop (Milestones 2–5) start to finish, on both iOS and Android physical devices.

### Risks
- First real use of `AppGlassPanel` and dark-forced-screen tokens — if either has a gap, it surfaces here, not earlier. Budget review time accordingly rather than assuming Milestone 1's implementation was already fully proven.
- "Reasoning" text being mocked risks looking uncannily specific/finished for something not yet real — keep it visibly generic or explicitly labelled as a placeholder internally, consistent with the mock-honesty concern raised in Milestone 4.

### Definition of Done
- [ ] Full Phase A loop runs start to finish on a physical iOS and a physical Android device: capture body photo → upload garment → generate → see result
- [ ] Screen visually matches `design/figma/screenshots/03c-prototype-tryon.png` for the states it's possible to compare (idle/done at minimum)
- [ ] No spinner, no layout shift on state transitions beyond what the design specifies
- [ ] **Phase A checkpoint:** this is a natural point to demo the app and decide whether to proceed to Phase B as planned or adjust based on what using the real (if AI-mocked) loop reveals
