# VirtualTryOn — Development Roadmap

This is the implementation plan for everything after the foundation (`docs/roadmap/`) and design system (`design/react-native/`) phases already completed. **Planning only — no code was written as part of producing this roadmap.**

## Methodology

The user-supplied milestone order already does the important thing right: it puts `Foundation → Shared UI → User Image Upload → Clothing Image Upload → AI API Integration (mock) → Try-On Results` *before* Authentication, Wardrobe, Profile, Shopping, AI Stylist, and Notifications. That's a deliberate, correct sequencing — it validates the single riskiest, most novel part of this product (does the try-on generation loop actually feel good, end to end) before spending time on scaffolding every product builds the same way regardless of what makes VirtualTryOn different. This roadmap keeps that order and makes the reasoning explicit by grouping milestones into three named phases instead of a flat list of 14:

| Phase | Milestones | Question it answers |
|---|---|---|
| **A — Prove the core loop** | Foundation → Shared UI Components → User Image Upload → Clothing Image Upload → AI API Integration (mock) → Try-On Results | Does upload-photo → upload-garment → generate → see-result work end to end, and is it worth building the rest of the app around? |
| **B — Build the platform** | Authentication → Wardrobe → User Profile → Shopping Integration → AI Stylist → Notifications *(+ Real AI Pipeline, flagged addition — see below)* | Everything the core loop needs to become a real, retainable product |
| **C — Harden & ship** | Testing → Deployment | Everything needed to put it in front of real users safely |

Each phase has its own file: `phase-a-core-loop.md`, `phase-b-platform.md`, `phase-c-launch.md`. Every milestone in every phase covers exactly the 9 fields requested: Objective, Features, Files to create, Dependencies, Backend requirements, Frontend requirements, Testing strategy, Risks, Definition of Done.

## One addition to the given milestone order, flagged rather than silently inserted

The given list mocks AI in "AI API Integration (mock responses first)" but has no later milestone that says "now replace the mock with a real model." Given the project goal is explicitly an *AI-powered* app, shipping past Deployment on a mock would be an obviously wrong reading of the list — but the list also doesn't say where the real thing goes. Rather than guess a slot, **`phase-b-platform.md` adds "Real AI Pipeline Integration" as its own milestone**, positioned as a track that starts as soon as Phase A defines the mock's contract (§AI API Integration's request/response shape) and should land before Deployment. It's placed in Phase B, not Phase A, because it's genuinely independent GPU/ML work (model selection, `ai/` pipeline build, licensing checks) that doesn't block the other Phase B feature work and can run in parallel with it if resourced separately — not because it's lower priority than Wardrobe or Shopping. See that file's milestone for the full reasoning.

## Cross-cutting decisions made once here, referenced everywhere

Three decisions recur across multiple milestones. Documenting each once here avoids either repeating the reasoning nine times or letting later milestones quietly contradict earlier ones.

### 1. Guest identity, not a separate anonymous-session table

Phase A's core loop (upload → generate → see result) has to work *before* Authentication (Phase B) exists. Rather than building a throwaway `GuestSession` concept and migrating its data into a real `User` row later, **`User` exists from Phase A onward** with an `auth_provider` of `guest | email | google | apple` and a `device_id` for guest rows. A guest is a `User` row with no credentials attached yet. Authentication (Phase B) becomes "attach credentials to an existing `User` row," not "migrate data from one table to another" — the harder, riskier version of that problem. This is why `User` appears as a backend requirement starting in the User Image Upload milestone, well before the Authentication milestone.

### 2. Async job pattern from the first AI call, even though the mock is instant

The mock in "AI API Integration" could trivially be a synchronous request/response — it's fake, it returns immediately. It's built as an async job (`POST /tryon` creates a job and returns an id; `GET /tryon/:id` polls status) anyway, because the real pipeline (Real AI Pipeline milestone) will not be instant, and the source design's own `ThinkingIndicator` component and its named-step UX (`"step 2 of 3 · draping fabric"`) already assume a multi-second generation with visible progress — that's not incidental, it's the design already anticipating this. Building the real interaction pattern against a fake-but-honest async job now means the Real AI Pipeline milestone is a swap behind an existing seam, not a rearchitecture. It also means the "outfit ready" notification trigger the source design lists (`Notifications` milestone) already has the job-completion event it needs to hook into.

### 3. Object storage: local disk now, S3-compatible deferred on purpose

`backend/docs/architecture/overview.md`'s open-questions list (from Phase 0) already flagged object storage as undecided. Phase A's upload milestones need *somewhere* to put images now — the decision here is to use a local disk volume (already how `docker-compose.yml`'s Postgres/Redis data persists) behind a storage interface narrow enough that swapping in S3-compatible storage later (Deployment milestone) touches one module, not every caller. Not deferring the interface, only the backing implementation.

## How to read a milestone

Every milestone assumes everything in earlier milestones (including earlier phases) is done. "Dependencies" lists only *new* packages beyond what Phase 0 already installed (see `frontend/package.json`, `backend/requirements.txt`, `ai/requirements.txt`) or what an earlier milestone in this roadmap added. "Files to create" gives paths consistent with the conventions Phase 0 already established (`frontend/src/features/*`, `backend/app/api/v1/endpoints/*`, etc.) — it's a plan for what will exist, not a list of files this pass created.
