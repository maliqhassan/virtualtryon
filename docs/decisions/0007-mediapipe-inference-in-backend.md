# 7. MediaPipe inference runs in `backend/ai/`, as a narrow exception to ADR 0004

Date: 2026-07-30
Status: Accepted

## Context

`docs/decisions/0004-ai-orchestration-vs-execution-boundary.md` established that
`backend/ai/` never loads a model, never imports an inference library, and never
touches a GPU — all real inference stays in root `ai/`, called over HTTP, so the
two services can scale and deploy independently.

The MediaPipe integration task explicitly requested `backend/ai/services/mediapipe_service.py`
loading MediaPipe and running pose/face landmark detection directly inside the
FastAPI backend process — read literally, a direct contradiction of ADR 0004.
Presented as a flagged conflict; the requester chose to proceed with MediaPipe
inside `backend/ai/` rather than routing it through root `ai/`.

## Decision

For MediaPipe specifically, inference runs in-process inside `backend/ai/services/mediapipe_service.py`,
loaded once at process start and called directly (a Python function call, not
an HTTP round trip) from `backend/app/services/mediapipe_analysis.py`.

This is a **narrow, named exception**, not a reversal of ADR 0004's general
boundary:

- MediaPipe's pose/face landmark models are CPU-only, mobile-optimized, and
  already a zero-new-dependency install (`ai/requirements.txt` since Phase 0;
  `docs/roadmap/ai-model-integration-roadmap.md` names it "by far the cheapest
  model in this list"). The GPU-isolation/independent-scaling reasoning ADR
  0004 and ADR 0002 built the two-service split around does not apply to it.
- Every other named future model (SCHP, IDM-VTON/CatVTON, InstantID,
  Real-ESRGAN) is GPU-bound and **still belongs in root `ai/`**, called over
  HTTP from `backend/ai/services/ai_client.py`, exactly as ADR 0004 describes.
  This ADR does not change that for any of them.
- `backend/ai/services/ai_client.py`'s existing stub methods (`detect_pose`,
  `parse_human`, `generate_tryon`, `preserve_identity`, `enhance_image`) are
  untouched. `detect_pose()` in particular is reserved for the future,
  job-pipeline-integrated `POSE_DETECTION` stage — a different consumer, on a
  different contract (`backend/ai/models/pose.py`'s `PoseDetectionResult`),
  than the diagnostic endpoint this ADR concerns.

## Consequences

- `backend/`'s dependency footprint and container image now include
  `mediapipe`/`opencv-python-headless`/`numpy` and their native library
  requirements (`libgl1`, `libglib2.0-0`) — previously only `ai/`'s image
  carried these.
- `backend/` and root `ai/` both now know how to run MediaPipe. If a later
  phase wires MediaPipe into the real job pipeline (`POSE_DETECTION` stage),
  that work should decide explicitly whether it reuses this in-backend
  service or moves to root `ai/` for consistency with the other four models —
  left as an open question for that future work, not resolved here.
- If MediaPipe's CPU cost or model count grows enough that it stops being
  "the cheap one," this exception should be revisited — nothing here commits
  future CPU-only models to also living in `backend/ai/` by default.
- Reverses no other part of ADR 0004; that ADR remains the governing rule for
  every other model.

## Numbering note

`docs/roadmap/phase-b-platform.md`'s Milestone 12 had already earmarked
`0007-ai-model-selection.md` and `0008-gpu-infrastructure.md` for its own
future decisions (itself a second earmarking, per that file's own note, after
an earlier collision with ADR 0004/0005). This ADR takes `0007` instead — that
file is updated to bump its earmarks to `0008`/`0009`, with the same
"verify the actual next-free number at implementation time" caveat carried
forward, since this is now the third time these placeholder numbers have
moved.
