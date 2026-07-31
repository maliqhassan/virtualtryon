# Phase B — Build the platform

Phase A proved the core loop with a mocked AI. Phase B builds everything a real, retainable product needs around that loop — including, as a flagged addition to the given milestone list, replacing the mock with a real model.

---

## Milestone 6 — Authentication

### Objective
Replace guest-only identity with real accounts (email/password + Google + Apple), without losing any data a guest already created in Phase A.

### Features
Login, Signup, Forgot password, Verify code (`design/figma/03-screens.md` screens 03/04/21/22), Google Sign-In, Sign in with Apple, session refresh, logout, guest-to-account claiming.

### Files to create
```
frontend/src/features/auth/screens/{login,signup,forgot-password,verify-code}-screen.tsx
frontend/src/features/auth/hooks/use-auth.ts
frontend/src/store/session.ts                      — Zustand: tokens + auth state (client-owned, not server-cached)
frontend/src/services/api/auth.ts
frontend/src/app/(auth)/_layout.tsx                 — guard per design/react-native/03-screen-component-map.md §1
frontend/src/app/(auth)/{login,signup,forgot,forgot-verify}.tsx
frontend/src/components/app-otp-field.tsx            — deferred from Milestone 1, built now

backend/app/core/security.py                        — password hashing (argon2), JWT encode/decode
backend/app/schemas/auth.py
backend/app/services/auth.py                        — signup/login/refresh/claim-guest logic
backend/app/services/oauth/{google,apple}.py
backend/app/api/v1/endpoints/auth.py
backend/app/core/deps.py                              — replace get_current_user_or_guest with real session-based auth

docs/decisions/0004-authentication-strategy.md        — Phase 0 left this as an explicit open ADR item; write it here
```

### Dependencies
```
backend:  argon2-cffi (password hashing — argon2 over bcrypt: current OWASP recommendation), 
          pyjwt (or python-jose), authlib (Google/Apple OAuth token verification)
frontend: expo-secure-store, expo-auth-session + expo-crypto (Google), expo-apple-authentication (Apple —
          must render the official button asset per design/figma/README.md's explicit note, not a styled AppButton)
```

### Backend requirements
- Extend `User` (from Milestone 2) with `password_hash` (nullable — OAuth-only users have none), OAuth identity fields.
- `POST /api/v1/auth/signup`, `/login`, `/refresh`, `/logout`, `/forgot-password`, `/verify-code`, `/oauth/{google,apple}/callback`.
- **Guest claim**: signup/OAuth-login, when called with the existing `X-Device-Id` header, attaches credentials to the *existing* guest `User` row (matching the device id) instead of creating a new one — this is the entire payoff of the cross-cutting decision made in Phase A. Test this explicitly: a guest's uploaded photos, garments, and try-on jobs must all still belong to the same `user_id` after claiming.
- Forgot-password codes: 6-digit, stored hashed in Redis with a TTL (matches Redis's role per `docs/decisions/0002-tech-stack-rationale.md`) rather than a DB table — self-expiring by design.
- Email delivery for the verification code needs an external provider (SendGrid/SES/Resend/etc.) — a new external dependency requiring its own account and API key, which becomes a deploy-time secret (Milestone 13), not something to hardcode now.
- Rate limiting on `/login` and `/signup` (Redis-backed, e.g. a sliding window per IP + per device id) — brute-force protection needed from the day these endpoints exist, not added later.

### Frontend requirements
- Tokens stored via `expo-secure-store`, never `AsyncStorage` (unencrypted) — this is a real security requirement, not a style choice.
- `AppOtpField` (built now, was deferred in Milestone 1) for the verify-code screen.
- Session state in Zustand; the *current user profile* fetched via TanStack Query using the session token — keeps the split from `docs/decisions/0002-tech-stack-rationale.md` intact (client-owned auth state vs. server-owned profile data) rather than conflating them.
- Route guards per `design/react-native/03-screen-component-map.md` §1 — verify whichever Expo Router guard API (declarative `Stack.Protected` or the imperative `<Redirect>` fallback) is actually stable on the installed version before committing to one.

### Testing strategy
- Backend: signup, login with wrong password, expired/invalid token rejected, refresh flow, **guest-claim preserves all existing data** (the single most important test in this milestone), rate limiting actually triggers under repeated failed attempts.
- Frontend: mocked auth flow through each screen; secure-storage read/write tested; route guards tested (unauthenticated user can't reach `(tabs)`, authenticated user can't reach `(auth)`).
- OAuth: can't be fully automated — manual test on real iOS and Android devices with real Google/Apple accounts, every time this milestone's auth code changes.

### Risks
- **Google/Apple developer-console configuration is frequently a bigger time sink than the code** (bundle ID / OAuth client setup, Apple's stricter Sign-in-with-Apple requirements) — budget for this explicitly, it's an external dependency on account setup, not engineering effort alone.
- **Guest-claim edge case**: a device with existing guest data where the user then logs into a *different*, pre-existing account (e.g. reinstall, or a second family member on a shared device) — should the guest data merge, get abandoned, or block the login? This is a product decision, not resolved here; flag it before this milestone is considered complete rather than discovering it in production.
- Storing tokens insecurely is the single most common mobile-auth mistake — the `expo-secure-store` requirement above exists specifically to prevent it.

### Definition of Done
- [ ] Email/password and both OAuth providers work end-to-end on real devices
- [ ] Guest-claim test passes: a guest's photos/garments/try-on jobs survive account creation, verified in an automated test, not just manually
- [ ] Rate limiting verified to actually trigger, not just configured
- [ ] `docs/decisions/0004-authentication-strategy.md` written, closing Phase 0's open item
- [ ] Tokens confirmed stored via `expo-secure-store`, not `AsyncStorage`

---

## Milestone 7 — Wardrobe

### Objective
The full Closet experience: browse, filter, favourite, inspect, and manage the garments a user owns — the largest single milestone in Phase B by screen count.

### Features
Closet grid with category filters and favouriting, clothing details (pairings, wear history), the full add-to-closet sheet (camera roll / shoot now / receipt / paste-a-link — only a minimal single-photo version existed after Milestone 3), wardrobe stats (most-worn, dead stock, colour balance), laundry tracking, packing planner.

### Files to create
```
frontend/src/features/closet/screens/{closet,clothing-details,wardrobe-stats,laundry,packing-planner}-screen.tsx
frontend/src/features/closet/components/{closet-item-card,add-to-closet-sheet}.tsx
frontend/src/app/(tabs)/closet/{index,[id],stats,laundry,packing}.tsx
frontend/src/components/app-bottom-sheet.tsx        — deferred from Milestone 1, needed for the add-to-closet sheet

backend/app/models/wear_log.py                       — one row per "worn today" event, feeds stats
backend/app/models/packing_trip.py
backend/app/services/wardrobe_stats.py                — most-worn / dead-stock / colour-balance aggregation
backend/app/api/v1/endpoints/wardrobe.py
```

Extend (not recreate) `Garment` (Milestone 3) with `worn_count`, `is_favorite`, `tag`, `last_worn_at`, `laundry_status` — an Alembic migration adding columns, not a new table.

### Dependencies
```
@gorhom/bottom-sheet   — flagged back in design/react-native/04-inconsistencies-and-recommendations.md §E, used for real here
```
No charting library needed — the design's stats visuals (bars, counts) are plain progress bars and text, not charts; adding one would be over-engineering for what's actually specified.

### Backend requirements
- `wardrobe_stats.py`: aggregation queries for most-worn, dead-stock (unworn > N months), and colour balance. Index `garment.user_id` and `wear_log.garment_id` before this ships — an unindexed aggregation over a growing wardrobe is a predictable slow-query bug, not a hypothetical one.
- Favourite toggle, wear logging, and laundry-status endpoints on `garments.py`.
- `packing_trip.py` + day-assignment logic for the packing planner.

### Frontend requirements
- 2-column `FlatList` grid, tested with realistic volume (the design's own mock data uses 128 items — performance at that scale, not just with 5 seed items, is part of this milestone, not deferred to Milestone 12).
- `AppBottomSheet` (now built) for the add-to-closet flow.
- Optimistic updates for favourite-toggle (instant UI feedback, reconciled against the server response).

### Testing strategy
- Backend: aggregation-query correctness (known input → known most-worn/dead-stock output) and a basic query-performance check against a seeded 100+ item wardrobe.
- Frontend: grid scroll performance profiling at realistic item counts; favourite-toggle optimistic-update rollback tested (server rejects → UI reverts).

### Risks
- Stats aggregation is the first place in the backend doing non-trivial SQL — worth a deliberate query-plan review, not just "it returned the right number in dev with 5 rows."
- Packing planner is the lowest-value, highest-complexity screen in this set (trip/day modeling for a feature most users may rarely touch) — a reasonable candidate to cut or defer if this milestone is running long; flagged explicitly as a scope-reduction option rather than something to silently cut without noting it.

### Definition of Done
- [ ] Closet grid renders real (uploaded + seeded) garments with working filter/favourite
- [ ] Clothing details shows wear history and pairing suggestions
- [ ] Add-to-closet sheet fully replaces Milestone 3's minimal version
- [ ] Stats screen shows real aggregated numbers from real data, verified against a known seeded dataset
- [ ] Laundry status persists and affects Today's outfit suggestions (per the design's laundry-callout behaviour) once Today exists to check against — cross-reference when the Today screen itself is built, since it wasn't a named milestone on its own (its core hero-card content was built in Phase A's Milestone 5's neighbourhood conceptually, but the full Today tab with week rail/calendar wiring should be confirmed complete by this point — flag if it isn't)

---

## Milestone 8 — User Profile

### Objective
The "You" tab: style profile display, stats summary, settings (including the appearance toggle flagged as ambiguous in `design/react-native/04-inconsistencies-and-recommendations.md` §C), notification preferences shell, help centre.

### Features
Style profile card (face/body shape, skin tone, undertone, palette), stat cards (reusing Milestone 7's aggregation), Settings (appearance, region/units, privacy), Notifications preference list (wiring to real push is Milestone 11), Help centre with search.

### Files to create
```
frontend/src/features/profile/screens/{you,settings,help}-screen.tsx
frontend/src/app/(tabs)/you/{index,settings,help}.tsx

backend/app/models/style_profile.py
backend/app/schemas/style_profile.py
backend/app/api/v1/endpoints/profile.py
```

### Dependencies
None new.

### Backend requirements
- `StyleProfile` model: `user_id`, `face_shape`, `body_shape`, `skin_tone`, `undertone`, `height`, `best_neutrals`, palette swatches, `completed_at`.
- **This milestone populates `StyleProfile` via manual/placeholder values, not real computer-vision analysis.** Real analysis (pose landmarks, skin-tone extraction, body-shape classification from the onboarding photos) is genuinely the same class of work as try-on generation — both are `ai/` pipeline work — and is scoped into this phase's **Real AI Pipeline Integration** milestone below, not duplicated here. The "rescan" action on this screen is the UI hook that milestone eventually wires up for real.
- `GET/PATCH /api/v1/users/me/profile` (style profile + settings).
- Account/data deletion: **more than a DB delete.** Body-scan photos and garment images live in the storage layer (Milestone 2's interface) — deletion must cascade to stored files, not just rows. Given how sensitive body photos are (already flagged in `assets/README.md` since Phase 0), treat this as a real compliance requirement, not a nice-to-have.

### Frontend requirements
- Settings' Appearance control (Light/Dark/System) is where the forced-light decision from `design/react-native/01-design-tokens.md` §1 gets revisited for real — this is the first point in the roadmap where a user-driven `colorScheme.set()` call is wired to anything.
- Style profile display reusing `AppCard.dark` per the design.

### Testing strategy
- Backend: profile CRUD tests; **account-deletion test that verifies stored image files are actually removed from disk, not just the DB rows** — the kind of test that's easy to skip and exactly the kind that matters here.
- Frontend: settings persistence across app restarts; appearance toggle actually changes rendered theme (manual visual check plus a component test asserting the token values swap).

### Risks
- Shipping "Delete my account" without actually deleting stored photos is a real privacy/compliance gap, not just a bug — call this out specifically in review, don't let it slip through as "looks done" because the row disappeared from a database browser.
- The appearance toggle reintroduces the global-dark-mode question `design/react-native/04-inconsistencies-and-recommendations.md` §C flagged as unconfirmed — if product hasn't actually decided the full-app dark mode scope by this point, this is the milestone where that decision can no longer be deferred.

### Definition of Done
- [ ] Style profile displays correctly (with placeholder/manual data — real analysis is a later milestone)
- [ ] Settings changes persist and the appearance toggle visibly changes the app's theme
- [ ] Account deletion verified to remove stored files, not just database rows
- [ ] Help centre search works against a real (even if small) content set

---

## Milestone 9 — Shopping Integration

### Objective
The Shop tab: a ranked match feed, product details, wishlist, and editorial lookbooks — **explicitly scoped to a seeded product catalog for this milestone, not a live retailer integration.**

### Features
Match feed ranked by score (poor matches stay visible with their reason, per the design's explicit rule — not filtered out), product details with match breakdown and sizing, wishlist with budget tracking, Eid/wedding lookbook.

### Files to create
```
frontend/src/features/shop/screens/{shop,product-details,wishlist,lookbook}-screen.tsx
frontend/src/app/(tabs)/shop/{index,[id],wishlist,lookbook/[id]}.tsx

backend/app/models/{product,wishlist_item,lookbook,look}.py
backend/app/services/match_scoring.py
backend/app/api/v1/endpoints/shop.py
scripts/db/seed-products.py                          — new: scripts/db/ existed since Phase 0 as a reserved, empty folder; this is its first real script
```

### Dependencies
None new.

### Backend requirements
- **Product catalog is seeded, not live**, per the scope note above — a real retailer integration is a partnership/business-development dependency outside engineering's control, and blocking this milestone on it would stall the roadmap indefinitely. `scripts/db/seed-products.py` populates a `Product` table with representative data (matching the shape already visible in the design's own mock data — brand, name, price, imagery).
- `match_scoring.py`: **a rule-based scoring function comparing product attributes to the user's `StyleProfile` (Milestone 8) — not a machine-learning model.** This is a meaningfully smaller task than try-on generation (no GPU, no image generation) and shouldn't be conflated with the Real AI Pipeline milestone's scope. Score breakdown (colour/fit/wardrobe grades) is computed the same way.
- Wishlist CRUD + a simple budget-tracking calculation (sum of wishlist prices vs. a user-set budget).

### Frontend requirements
- `ProductMatchCard` (already specified in `design/react-native/02-component-inventory.md`) — first real use.
- Match feed explicitly does **not** filter out low scores — render them with their reasoning, matching the source's stated product rule; this is easy to "fix" by accident (e.g. adding a score threshold filter) and worth calling out in review.

### Testing strategy
- Backend: `match_scoring.py` unit tests against known profile/product pairs with expected scores — the scoring *logic* is exactly the kind of thing that should be tested in isolation, independent of the UI.
- Frontend: feed ordering test (descending by score, low scores present not hidden).

### Risks
- **This milestone's real-world value is capped by the seeded-catalog scope** — worth being explicit with stakeholders that "Shopping Integration" here means a working feature against placeholder inventory, not a live commerce integration; a real retailer API is a distinct, business-dependent follow-on, not part of this milestone's Definition of Done.
- Match-scoring thresholds/weights are a product/design decision as much as an engineering one — build the mechanism configurably (weights as data, not hardcoded constants) so it can be tuned without a code change once there's real usage data to tune against.

### Definition of Done
- [ ] Seeded catalog renders in the match feed, ranked correctly, low-score items visible with reasoning
- [ ] Product details, wishlist add/remove, and budget tracking work against seeded data
- [ ] Lookbook renders the editorial screens per the design
- [ ] `match_scoring.py` has unit-test coverage independent of the UI

---

## Milestone 10 — AI Stylist

### Objective
Noor: the conversational styling surface. **A genuinely different AI capability from try-on generation** — this is a text/LLM problem, not a vision/diffusion one, and doesn't depend on the Real AI Pipeline milestone below.

### Features
Chat UI with typing state, prompt chips, inline product/outfit suggestion cards, conversation history, LLM responses grounded in the user's actual wardrobe/profile data rather than generic advice.

### Files to create
```
frontend/src/features/chat/screens/chat-screen.tsx
frontend/src/features/chat/components/chat-bubble.tsx   — from design/react-native/02-component-inventory.md
frontend/src/app/(tabs)/today/chat.tsx                    — fullScreenModal, per design/react-native/03-screen-component-map.md

backend/app/models/{chat_conversation,chat_message}.py
backend/app/services/noor_chat.py                          — LLM orchestration + tool definitions
backend/app/api/v1/endpoints/chat.py                        — streaming endpoint
```

### Dependencies
```
backend: anthropic (Claude API — Messages API with tool use; a natural fit given this codebase already works
         within Claude Code, and grounding Noor's answers in real data via tool calls rather than free-floating
         generation matches the design's own philosophy: "the app makes decisions... every AI answer has an
         escape hatch," not an unconstrained chatbot)
```

### Backend requirements
- `noor_chat.py` defines a small set of **read-only tools** the model can call — query the user's closet (Milestone 7), style profile (Milestone 8), wear history, calendar — so responses like "you haven't worn it since March" are grounded in real data, not hallucinated. No destructive or write-capable tools are exposed to the model; a prompt-injection reaching a tool call should never be able to modify user data, only read it.
- Streaming response endpoint (SSE or WebSocket) so the UI can show tokens arriving, matching the typing-indicator UX already specified. **Verify SSE support in RN's `fetch`/networking stack before committing to it** — React Native's streaming-response support has historically been more limited than a browser's; WebSocket is the safer fallback if SSE proves unreliable.
- Conversation history persisted per user, with a reasonable retention/context-window strategy (not the entire history resent on every turn indefinitely).

### Frontend requirements
- `ChatBubble`, prompt chips (`AppChip` row), inline suggestion cards (a condensed `ProductMatchCard`) — all already specified.
- Streaming text rendering, typing state via `ThinkingIndicator` + "reading your closet…" per the design.

### Testing strategy
- Backend: tool-calling tests with a mocked LLM response (does the orchestration correctly call the closet/profile tools and pass results back); a prompt-injection test asserting no tool call can mutate data.
- Frontend: streaming UI tested against a mocked SSE/WebSocket stream; conversation history persists across app restarts.
- Manual: real conversations checked for tone/groundedness against the design's stated AI philosophy — this is a qualitative check, not just a pass/fail test.

### Risks
- **LLM cost and latency** scale with usage in a way image-gen doesn't quite the same way — budget for API costs and set sensible context-window/history limits from the start.
- Streaming-response support in RN is the biggest unverified technical assumption in this milestone — confirm early, not after the UI is built around an assumption that doesn't hold.
- Tool-scoped, read-only access is the main defence against prompt injection turning into a real security issue — don't relax it for convenience later without re-reviewing.

### Definition of Done
- [ ] Noor answers reference real closet/profile data via tool calls, verified against a seeded account
- [ ] Streaming responses render token-by-token in the UI
- [ ] No tool exposed to the model can write/delete user data
- [ ] Conversation history persists and is scoped per user

---

## Milestone 11 — Notifications

### Objective
Push notifications for the trigger set the design implies (outfit-ready, price drop, dry-clean reminder) — infrastructure built generically, specific triggers wired as they're confirmed, since the full trigger set is still an open product question carried forward from Phase 1.

### Features
Push registration, in-app notification feed (today/earlier), preferences (Milestone 8's shell wired for real), scheduled and event-driven server-side triggers.

### Files to create
```
frontend/src/features/notifications/screens/notifications-screen.tsx
frontend/src/app/notifications.tsx
frontend/src/lib/push.ts                                     — expo-notifications registration + token sync

backend/app/models/{notification,push_token}.py
backend/app/services/notifications/{scheduler,triggers}.py
backend/app/api/v1/endpoints/notifications.py
```

### Dependencies
```
frontend: expo-notifications
backend:  apscheduler — a lightweight in-process scheduler, sufficient for this scale without introducing
          Celery + a broker; Redis (already in the stack) is the natural upgrade path if/when trigger volume
          outgrows an in-process scheduler
```

### Backend requirements
- Push-token registration/storage per user/device.
- **Event-driven trigger**: try-on job completion (Milestone 4's `TryOnJob.status → completed`) fires an "outfit ready" notification — this is the exact connection the cross-cutting async-job decision in `docs/roadmap/README.md` was made to enable; wiring it here should be close to trivial if that decision held.
- **Scheduled triggers**: outfit-ready-at-06:00 (if not already event-driven from an overnight generation job), dry-clean reminders based on `Garment.laundry_status` age.
- **Don't invent the full trigger set.** Build the trigger-registration mechanism generically (a trigger is: condition → notification template → target user), and only wire the specific triggers the design/product side has actually confirmed — per the open item carried forward since Phase 1.

### Frontend requirements
- Registration flow (permission prompt, token sync to backend).
- Notification feed screen (already specified), preferences wired to real backend state instead of Milestone 8's placeholder shell.

### Testing strategy
- Backend: trigger-condition tests (e.g. a garment crossing the dry-clean-reminder age threshold produces exactly one notification, not zero or a duplicate on every check).
- **Push cannot be fully tested in a simulator** — real-device testing against Expo's push service (or native FCM/APNs directly) is required, budgeted as manual verification, not assumed to be covered by automated tests.

### Risks
- Push setup (Expo push service config, or native FCM/APNs credentials) is another external-account dependency like Milestone 6's OAuth — budget setup time, not just code time.
- Notification fatigue is a real product risk if triggers fire too often — this is exactly why the trigger set staying unconfirmed until product signs off matters; shipping guessed triggers risks training users to ignore or disable notifications entirely.

### Definition of Done
- [ ] Push registration works on real iOS and Android devices
- [ ] Try-on completion reliably triggers an "outfit ready" notification (event-driven, tested against Milestone 4's job lifecycle)
- [ ] At least one scheduled trigger (dry-clean reminder) works correctly against seeded data with a known-age garment
- [ ] No trigger ships that wasn't explicitly confirmed by product — anything without confirmation stays unimplemented, not guessed

---

## Milestone 12 (flagged addition) — Real AI Pipeline Integration

**Not in the user-supplied milestone list — added here because the project's stated goal is an *AI-powered* app, and nothing in the given list explicitly replaces Milestone 4's mock. See `docs/roadmap/README.md`'s "one addition" section for the full reasoning on why it's flagged rather than silently inserted, and why it lives in Phase B rather than blocking Phase A.**

### Objective
Replace the mock try-on fulfilment (Milestone 4) and the placeholder style-profile analysis (Milestone 8) with real models: pose/segmentation preprocessing, diffusion-based garment compositing, and skin-tone/body-shape classification.

### Features
Real pose-landmark detection and garment/body segmentation (preprocessing, shared by both the analysis and try-on use cases — this is exactly why `ai/src/preprocessing/` was scoped as its own layer back in Phase 0, not duplicated per pipeline), diffusion-based try-on generation, postprocessing (blending, colour correction), skin-tone/body-shape classification feeding `StyleProfile`.

### Files to create
```
ai/src/preprocessing/{pose,segmentation}.py
ai/src/models/engines/idm_vton_engine.py (or catvton_engine.py)
    — fills in the real generate() body behind the VirtualTryOnEngine interface
      (docs/decisions/0006-pluggable-virtual-tryon-engine.md) rather than a new
      standalone "tryon_pipeline.py" — that file and its registry already exist
      as stubs from the Virtual Try-On Engine architecture pass
ai/src/models/style_classifier.py                     — skin tone / body shape / face shape classification
ai/src/postprocessing/blend.py
ai/src/inference/generate.py                            — replaces Milestone 4's mock_tryon.py behind the same API contract

docs/decisions/0008-ai-model-selection.md               — which pretrained model(s), why, licensing review
docs/decisions/0009-gpu-infrastructure.md                 — dev + production GPU hosting decision
```
(Renumbered three times now — 0004/0005 were taken by
`docs/decisions/0004-ai-orchestration-vs-execution-boundary.md` and
`docs/decisions/0005-async-job-processing-via-redis.md` (the AI backend
architecture pass), then 0006 by
`docs/decisions/0006-pluggable-virtual-tryon-engine.md` (the Virtual
Try-On Engine pass), then 0007 by
`docs/decisions/0007-mediapipe-inference-in-backend.md` (the MediaPipe
integration pass — a narrow, named exception to ADR 0004 for MediaPipe
specifically, not a reversal of it) — all three preceded this milestone.
See `docs/architecture/ai-backend.md`, `docs/architecture/ai-tryon-engine.md`,
and ADR 0007. Given this has now moved three times, "ai-model-selection" is
likely to actually land as whatever the next free number is *at
implementation time*, not necessarily 0008 — check `docs/decisions/` before
naming the file, don't trust this number blindly.)

### Dependencies
`torch`, `torchvision`, `diffusers`, `mediapipe`, `opencv-python-headless` are already in `ai/requirements.txt` from Phase 0 — this milestone is largely about model selection and pipeline-building against dependencies already installed, not new packages. Specific pretrained model weights (from Hugging Face) need selection as an explicit sub-task.

### Backend requirements
- `backend/ai/services/ai_client.py` keeps its existing contract (its methods
  currently raise `NotImplementedError` — see `docs/architecture/ai-backend.md`;
  Milestone 4 itself only reached a frontend-only mock, per Phase 6's
  `PROJECT_STATUS.md` entry, so this file didn't exist until the AI backend
  architecture pass) — this milestone fills in that seam's real bodies, not a
  `backend` rearchitecture, which is the entire point of building the
  async-job pattern early.
- **Timeout and polling-interval assumptions from Milestone 4 need revisiting.** A mock returns in milliseconds; real diffusion generation is plausibly 5–60+ seconds depending on hardware. This likely shifts the primary completion UX from in-app polling toward the push-notification path (Milestone 11's event-driven trigger) as the expected path, with polling as a fallback for users still in the app.

### Frontend requirements
Largely unaffected — Milestone 5's Try-On studio and Milestone 8's style-profile display already consume these results through the existing API contracts. The main frontend-visible change is generation taking meaningfully longer, which is a UX question (is the `ThinkingIndicator` experience still good at 30 seconds vs. 2 seconds?) worth a deliberate check, not an assumption that what worked for the instant mock still works unchanged.

### Testing strategy
- **Model quality needs a human evaluation rubric, not just "the pipeline runs without erroring."** Define what "good enough" try-on quality means (a scored rubric against a test set of photo/garment pairs) before calling this milestone done — a pipeline that runs cleanly but produces unconvincing results hasn't actually met the objective.
- Latency benchmarking across representative hardware (whatever the actual GPU infra decision lands on).
- Regression tests for the preprocessing steps (pose/segmentation) independent of the generation step, so a generation-quality issue can be isolated from a preprocessing bug.

### Risks
- **Model/output quality is the single biggest product risk in the entire project.** Garment try-on diffusion is an active research area; results can look uncanny or fail on non-ideal photos. This deserves real iteration time on the roadmap, not a fixed sprint treated the same as, say, the Settings screen.
- **Licensing**: some pretrained try-on models are distributed under research-only licenses that don't permit commercial use. This must be verified *before* a model choice ships to production, not discovered after — a real legal risk, not a formality.
- **GPU cost**, both for development iteration and production inference — the NVIDIA NIM placeholder from Phase 0/1 (`ai/src/core/config.py`'s `NIM_ENDPOINT_URL`) becomes relevant here as one option among several (self-hosted GPU, cloud GPU rental, NIM-hosted inference) — this milestone is where that comparison actually needs to happen, not before.
- Latency change may require rethinking the completion UX (see Backend requirements above) — a real product-experience risk, not just an engineering detail.

### Definition of Done
- [ ] Real pipeline meets an agreed quality bar on a defined evaluation set (not just "doesn't crash")
- [ ] Licensing on every model/weight in use verified clear for commercial use, documented in the ADR
- [ ] Latency measured and the completion UX (polling vs. push) adjusted accordingly
- [ ] GPU infrastructure decision made and costed, documented in the ADR
- [ ] Milestone 4's `ai_client` contract unchanged from `backend`'s perspective — confirms the async-job seam was built correctly the first time
