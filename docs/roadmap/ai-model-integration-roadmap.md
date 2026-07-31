# Real AI Model Integration Roadmap

Per-model technical detail for `docs/roadmap/phase-b-platform.md`'s
Milestone 12 ("Real AI Pipeline Integration"). That milestone already
covers *when* this work happens and *why* it's a flagged addition; this
document covers *which models, in what order, and why each one specifically*
— the level of detail Milestone 12 deliberately left for later ("model
selection... need selection as an explicit sub-task").

**Design only. Nothing in this document is implemented.** No model is
downloaded, installed, or run. Every model discussed here maps onto an
interface already designed and stubbed in a prior phase — this roadmap
sequences filling those stubs in, it doesn't introduce new architecture.

## Where each model plugs in (confirmed, not new)

Phase 8 (`backend/ai/models/job.py`'s `WorkflowStage` enum) fixed the
pipeline's stage order *before* any of these six models were discussed
individually. Every one of them lands on a stage that already exists:

| WorkflowStage | Model(s) | Stub already exists at |
|---|---|---|
| `POSE_DETECTION` | MediaPipe *or* DWPose | `backend/ai/models/pose.py`, `ai/src/preprocessing/` (proposed) |
| `HUMAN_PARSING` | SCHP | `backend/ai/models/parsing.py` |
| `VIRTUAL_TRYON` | IDM-VTON *or* CatVTON | `ai/src/models/virtual_tryon_engine.py` + `engines/` (Phase 9) |
| `IDENTITY_PRESERVATION` | InstantID *or* PuLID | `backend/ai/models/identity.py` |
| `ENHANCEMENT` | Real-ESRGAN | `backend/ai/models/enhancement.py` |

No new stage, no renamed stage, no model that doesn't fit an existing
slot. That's a genuine consistency check, not a formality — see the
review at the end of this document.

---

## 1. MediaPipe

- **Why needed**: produces the 2D pose keypoints later stages (garment
  warping/draping guidance inside `VIRTUAL_TRYON`) need. Already the
  Phase 0 default — `docs/decisions/0002-tech-stack-rationale.md`
  specifically chose it for being "mature, CPU-runnable (no GPU
  dependency for this stage)."
- **Input**: the validated, decoded user photo.
- **Output**: 2D body keypoints (name, x, y, confidence) — matches
  `backend/ai/models/pose.py`'s `PoseDetectionResult` shape exactly.
- **Dependencies**: `mediapipe` — **already in `ai/requirements.txt`**
  since Phase 0. Zero new dependencies to integrate this one.
- **Expected GPU usage**: **Low.** MediaPipe's pose models are
  mobile-optimized and run acceptably on CPU; GPU acceleration is
  optional, not required. By far the cheapest model in this list.
- **Integration order (pipeline position)**: First real model to touch —
  `POSE_DETECTION` is the first model-driven stage after validation.
- **Alternatives**: DWPose (below — richer keypoints, heavier).
  OpenPose (older, heavier, less actively maintained than either;
  not recommended as a first choice today).

## 2. DWPose

- **Why needed**: denser whole-body keypoints (body + hands + face) than
  MediaPipe's default output. Matters specifically **if IDM-VTON is the
  chosen `VIRTUAL_TRYON` engine** — IDM-VTON's published reference
  pipeline was built and conditioned against DWPose-format keypoints, so
  using it reduces domain mismatch between preprocessing output and what
  the pretrained IDM-VTON checkpoint expects.
- **Input**: the same validated user photo MediaPipe would receive.
- **Output**: COCO-WholeBody-format keypoints — a strict superset of what
  `PoseDetectionResult` already models (the contract's generic
  `PoseKeypoint(name, x, y, confidence)` shape absorbs this without
  changes, per `backend/ai/models/pose.py`'s own docstring).
- **Dependencies**: **not currently in `ai/requirements.txt`.** Needs
  either the `mmpose`/`mmcv` stack or the standalone DWPose repo + ONNX
  weights — a real, flaggable gap versus MediaPipe's zero-new-dependency
  path.
- **Expected GPU usage**: **Low-moderate.** Heavier than MediaPipe's
  mobile-optimized models (a full detector network, not a mobile-tuned
  one), still far cheaper than any diffusion stage.
- **Integration order (pipeline position)**: Same slot as MediaPipe
  (`POSE_DETECTION`) — a swap, not an addition. Only worth the extra
  dependency weight once IDM-VTON is confirmed as the active engine and
  pose-fidelity issues are actually observed with MediaPipe's output.
- **Alternatives**: MediaPipe (simpler, already installed — the
  pragmatic default). OpenPose.

## 3. SCHP (Self-Correction Human Parsing)

- **Why needed**: segments the person into body-part regions (torso,
  arms, hair, etc.) so `VIRTUAL_TRYON` knows which pixels are the body
  being dressed versus background or other body parts. Refines Phase 0's
  original, coarser plan — ADR 0002 named "MediaPipe... for... segmentation
  masks" generically; Phase 8 (`backend/ai/models/parsing.py`) already
  narrowed that specifically to SCHP for fine-grained, body-part-level
  parsing, distinct from MediaPipe's coarse foreground/background
  "selfie segmentation." This document confirms that narrowing rather
  than reopening it.
- **Input**: the validated user photo (SCHP's LIP/ATR-trained variants
  work directly on the raw image; pose input is not a hard requirement,
  though pose-guided parsing is a viable future refinement).
- **Output**: a per-pixel segmentation mask plus body-part labels —
  matches `backend/ai/models/parsing.py`'s `HumanParsingResult`
  (`segmentation_mask_uri`, `detected_body_parts`) exactly.
- **Dependencies**: **not currently in `ai/requirements.txt`.** Needs its
  own repo/pretrained checkpoint (LIP or ATR weights); mask
  post-processing can lean on the already-installed `opencv-python-headless`.
- **Expected GPU usage**: **Moderate.** A full-image segmentation CNN —
  heavier than pose estimation, considerably lighter than diffusion
  generation.
- **Integration order (pipeline position)**: `HUMAN_PARSING`, after pose,
  before `VIRTUAL_TRYON` — IDM-VTON's reference pipeline explicitly takes
  a parsing mask as one of its conditioning inputs.
- **Alternatives**: SCHP's own ATR vs. LIP checkpoint variants (different
  label granularity). CIHP-PGN or SAM-based segmentation as more modern
  alternatives, at the cost of losing SCHP's specific alignment with
  IDM-VTON's reference implementation.

## 4. IDM-VTON

- **Why needed**: the actual garment-compositing generation model — the
  centerpiece. Already scoped as a candidate `VirtualTryOnEngine`
  implementation in Phase 9 (`ai/src/models/engines/idm_vton_engine.py`,
  currently a stub).
- **Input**: user photo + garment photo + pose keypoints (model 1 or 2) +
  parsing mask (model 3) — exactly `backend/ai/models/tryon.py`'s
  `TryOnGenerationInput` shape, which Phase 8 defined *before* this
  roadmap, anticipating this exact input set.
- **Output**: the composited "person wearing the garment" image, pre
  identity-correction and pre-enhancement — matches
  `TryOnGenerationResult.generated_image_uri` / Phase 9's
  `VirtualTryOnResult.generated_image`.
- **Dependencies**: its core stack (`torch`, `torchvision`, `diffusers`,
  `transformers`, `accelerate`, `safetensors`, `huggingface-hub`) is
  **already in `ai/requirements.txt`** since Phase 0. What's *not*
  present is IDM-VTON's own model code/checkpoint — a multi-gigabyte
  Hugging Face Hub download requiring `HF_TOKEN` (already a config
  placeholder in `ai/src/core/config.py`), and a license review before
  any production use (see risks below).
- **Expected GPU usage**: **High.** A full diffusion pipeline — multiple
  UNet forward passes across typically 20-50 denoising steps. Commonly
  reported in the 8-16GB+ VRAM range depending on resolution and
  precision (fp16/bf16 vs. fp32); by far the most expensive stage in the
  entire pipeline. Treat these figures as an approximate starting point
  to validate empirically once integration begins, not a commitment.
- **Integration order (pipeline position)**: `VIRTUAL_TRYON`, after pose
  and parsing are both available.
- **Alternatives**: CatVTON (Phase 9's second stub engine — lighter
  weight, its design skips the explicit pose/warping step IDM-VTON
  relies on). OOTDiffusion, StableVITON — other diffusion-based try-on
  models in the same research family, not currently scoped as
  `VirtualTryOnEngine` candidates.

## 5. InstantID

- **Why needed**: diffusion-based generation can subtly drift the
  generated person's face away from the source photo — a well-documented
  failure mode of diffusion-based person editing. InstantID re-anchors
  facial identity to the original user photo after generation. Already
  named as a candidate in Phase 8 (`backend/ai/models/identity.py`).
- **Input**: IDM-VTON's (or CatVTON's) generated image + the original
  user photo as the identity reference.
- **Output**: an identity-corrected image — matches
  `IdentityPreservationResult.corrected_image_uri`
  (`similarity_score` for how closely it now matches the source).
- **Dependencies**: layers on the already-installed diffusion stack via
  IP-Adapter-style face-embedding conditioning, but needs `insightface`
  for face-embedding extraction — **not currently in
  `ai/requirements.txt`**, a real gap to add when this stage is built.
- **Expected GPU usage**: **Moderate-high.** A conditioning/refinement
  pass rather than a full from-scratch generation, so typically lighter
  than the `VIRTUAL_TRYON` stage itself, plus a comparatively cheap
  face-embedding extraction step.
- **Integration order (pipeline position)**: `IDENTITY_PRESERVATION`,
  immediately after `VIRTUAL_TRYON` — it operates specifically on that
  stage's output, so it can't be built or meaningfully tested before
  generation produces real images.
- **Alternatives**: PuLID — already named as InstantID's alternative in
  Phase 8's own `identity.py` docstring; often cited as more efficient.
  IP-Adapter-FaceID as a simpler, lighter baseline.

## 6. Real-ESRGAN

- **Why needed**: diffusion outputs are typically generated at a fixed,
  moderate resolution; Real-ESRGAN upscales the final image and cleans up
  minor generation artifacts. Already named in Phase 8
  (`backend/ai/models/enhancement.py`).
- **Input**: the identity-corrected image (model 5's output), or the raw
  `VIRTUAL_TRYON` output directly if identity correction is skipped for
  a given request.
- **Output**: the final enhanced image — matches
  `EnhancementResult.enhanced_image_uri` / `upscale_factor`, which
  `postprocess/result_packaging.py` (Phase 8, stub) turns into
  `TryOnResult.image_uri`.
- **Dependencies**: `realesrgan`/`basicsr` — **not currently in
  `ai/requirements.txt`**, but comparatively lightweight and
  pip-installable versus the research-repo-style dependencies SCHP/DWPose/
  InstantID need.
- **Expected GPU usage**: **Low-moderate.** A single feed-forward
  super-resolution CNN pass — cheap relative to every stage before it;
  can run on CPU for smaller images if latency budget allows, though GPU
  is preferable for production throughput.
- **Integration order (pipeline position)**: `ENHANCEMENT`, last — purely
  additive polish after every other stage's output is final.
- **Alternatives**: GFPGAN (more face-restoration-focused — real overlap
  with InstantID's identity work worth being aware of, not necessarily
  worth running both). Plain bicubic/Lanczos upscaling as a near-zero-cost
  fallback if a full super-resolution model turns out not to be worth its
  weight for MVP. SwinIR as another modern alternative.

---

## Recommended implementation sequence

**1. MediaPipe → 2. SCHP → 3. IDM-VTON (or CatVTON) → 4. InstantID → 5. Real-ESRGAN**,
with DWPose as a conditional swap-in rather than a separate sequence step.

Reasoning:

1. **MediaPipe first.** Zero new dependencies, low GPU cost, and it
   validates the entire plumbing built in Phases 8-9 (job queue → worker
   → `ai_client` call → real result flowing back) at the lowest possible
   risk before committing to anything expensive. A working pose stage is
   also the first genuinely visible progress against Milestone 12.
2. **SCHP second.** Moderate cost, no hard dependency on pose output, and
   `VIRTUAL_TRYON` needs both pose and parsing before it can be
   meaningfully tested against real (not mocked) inputs.
3. **IDM-VTON (or CatVTON) third — the centerpiece, and the highest-risk
   step.** Only worth attempting once its real inputs (pose, parsing)
   exist, so its integration risk is isolated to the model itself, not
   confused with upstream stages still being wrong. **This is also where
   the core-engine choice actually gets made** (Phase 9's
   `VirtualTryOnEngineRegistry` already supports either) — if CatVTON is
   chosen instead of IDM-VTON, step 3 changes but step 1-2's work is not
   wasted (CatVTON's design reduces but doesn't eliminate the value of
   having real pose/parsing available), and DWPose's specific rationale
   (matching IDM-VTON's reference pipeline) becomes moot.
4. **InstantID fourth.** Cannot be meaningfully built or tested before
   step 3 produces real generated images to correct — identity drift is
   only observable once there's a real output to inspect.
5. **Real-ESRGAN fifth.** Purely additive, lowest integration risk of any
   model here, safe to defer to last or even ship without initially if
   time-constrained — the pipeline is functionally complete without it,
   just lower-resolution.

**DWPose is a conditional swap, not a sequence step.** Start with
MediaPipe (already installed, zero risk); revisit DWPose specifically if
IDM-VTON is the chosen engine and real output quality shows pose-fidelity
issues traceable to keypoint density — evaluate with evidence, not
speculatively ahead of it (matching this project's established KISS
discipline elsewhere).

**Parallelization is possible, not just sequential.** Because every stage
sits behind an interface already (Phase 8's `WorkflowStage`/`ai_client.py`
methods, Phase 9's `VirtualTryOnEngine`), a team isn't strictly forced
into single-threaded integration — one engineer could integrate IDM-VTON
against mocked pose/parsing inputs while another builds MediaPipe/SCHP for
real, converging later. The sequence above is the recommended *default*
for a small team optimizing for early, low-risk validation, not a hard
technical constraint.

## Licensing risk, named per model, not generically

`docs/roadmap/phase-b-platform.md`'s Milestone 12 already flags "licensing
checks" generically. Concretely: IDM-VTON, SCHP, and InstantID are
academic/research releases — several models in this space are published
under non-commercial-only licenses (e.g. CC-BY-NC variants). **Before any
of these ship in a product with commercial intent, each model's actual
license file must be checked individually** — a permissive license for
one (e.g. MediaPipe, Apache 2.0) says nothing about another's terms.
Not resolved here; flagged as a concrete pre-integration gate, not a
box to check after the fact.

---

## Architecture review: the entire AI system, across Phases 8-9-10

Reviewing everything built so far that this roadmap now sits on top of —
`backend/ai/` (Phase 8), `ai/src/models/` (Phase 9), and this document
(Phase 10) — plus the two still-unapproved briefs (preprocessing pipeline,
AI service layer) that remain outside this review's scope since nothing
was built against them.

**Consistency, confirmed rather than assumed**: every one of the six
models named in this task maps cleanly onto a `WorkflowStage` value and an
existing DTO/docstring from Phase 8, with zero contradictions found — see
the mapping table at the top of this document. Phase 8's stage design,
written before any of these models were discussed individually, correctly
anticipated all of them (including naming DWPose, CatVTON, and PuLID as
alternatives, which this document now confirms rather than introduces).
This is the strongest evidence so far that the boundary drawn in ADR 0004
(orchestration vs. execution) and the pluggability drawn in ADR 0006
(engine registry) were the right shapes — six real, independently-sourced
models fit without forcing a single contract change.

**Dependency gap, now itemized precisely**: of the six models, only
MediaPipe (and IDM-VTON's *generic* diffusion stack — not its specific
checkpoint/code) has its dependencies already installed from Phase 0.
DWPose, SCHP, InstantID, and Real-ESRGAN all need new entries in
`ai/requirements.txt`, to be added in the same PR that first uses each
one, per this project's established convention — not batched now, since
nothing is being implemented in this pass.

**No new ADR needed.** This document's recommended sequence confirms the
stage order Phase 8 already fixed (`models/job.py`'s `WorkflowStage`
values, `pipelines/tryon_pipeline.py`'s `TRYON_PIPELINE_STAGES` tuple) —
it doesn't introduce a new architectural commitment, so it doesn't warrant
its own ADR the way the orchestration boundary (0004) or engine
pluggability (0006) did.

**Outstanding, not forgotten**: the preprocessing pipeline and AI Service
Layer briefs (posted earlier this session) remain unapproved. This
roadmap's "Input"/"Output" columns for MediaPipe, DWPose, and SCHP
describe what those stages *will* consume/produce once that work is
approved and built — this document doesn't change their status or build
anything against them.

**No inconsistency required fixing this pass** — unlike Phases 8 and 9,
this review found no stale cross-references to correct (the ADR-numbering
and stale-filename issues caught in those reviews were both already fixed
by Phase 9; nothing new drifted since).
