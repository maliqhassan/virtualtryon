# Virtual Try-On Engine (`ai/src/models/`)

Design for the pluggable model boundary that will eventually run real
try-on generation. This document describes structure only — see
`docs/decisions/0006-pluggable-virtual-tryon-engine.md` for the decision
record.

**Scope, explicitly**: no model is downloaded, no model is loaded, no
inference is implemented. Both concrete engines' `generate()` methods
raise `NotImplementedError`. What exists is the interface, two named
stubs, and a registry — enough for Milestone 12 to fill in real bodies
against a settled contract.

**Confirmed product shape**: a single full-body user photo and a single
clothing photo in; a single realistic 2D generated image out. Not a 3D
avatar, not a digital human — no mesh, no body model, no 3D
reconstruction anywhere in this design.

## Folder-by-folder

```
ai/src/models/
├── dto.py              Data contracts (VirtualTryOnResult)
├── virtual_tryon_engine.py   The interface every engine implements
├── engines/             One file per candidate model, each a stub
└── engine_registry.py   Maps a config name to a concrete engine class
```

- **`dto.py`** — the shape of what a generation call returns. Kept to one
  model (`VirtualTryOnResult`) since there's only one meaningful output
  shape here (an image plus which model produced it), unlike the
  preprocessing pipeline's several distinct stage-report DTOs.
- **`virtual_tryon_engine.py`** — the interface itself, and the only file
  every other piece of this system should ever import when it wants to
  *use* try-on generation. Explained in full below.
- **`engines/`** — implementations. Each file is independent; none import
  from each other. Two exist now (IDM-VTON, CatVTON); a third is a new
  file here plus one registry line, nothing else.
- **`engine_registry.py`** — the swap point. Explained in full below.

## Every interface, explained

### `VirtualTryOnEngine` (`virtual_tryon_engine.py`)

```python
class VirtualTryOnEngine(ABC):
    @abstractmethod
    def generate(self, user_image: Image.Image, clothing_image: Image.Image) -> VirtualTryOnResult:
        ...
```

One method, two inputs, one output — deliberately as narrow as the actual
product requirement ("Input: user photo + clothing photo. Output:
generated image"). Nothing about pose data, segmentation masks, or model
configuration appears in this signature, on purpose: those are real
implementation needs for *some* engines (IDM-VTON's published pipeline
uses pose + parsing; CatVTON's doesn't, by design), but they're each
engine's own business, wired up via that engine's own constructor, not
exposed on the shared contract. Any code holding a `VirtualTryOnEngine`
reference can call `.generate(user_image, clothing_image)` without caring
which concrete engine it is or what that engine needed internally to get
there — that's Liskov Substitution in practice, not just in principle.

### `IDMVTONEngine` / `CatVTONEngine` (`engines/`)

Both implement `VirtualTryOnEngine` and nothing else. Both `generate()`
bodies are a single `raise NotImplementedError(...)` naming which model
is missing and why. Their docstrings record one real, substantive
difference between the two candidates (IDM-VTON's pose/parsing dependency
vs. CatVTON's concatenation-based approach that skips it) — worth keeping
visible even in stub form, since it's exactly the kind of detail that
will matter when Milestone 12 picks one to implement first.

### `VirtualTryOnEngineRegistry` (`engine_registry.py`)

```python
class VirtualTryOnEngineRegistry:
    @staticmethod
    def create(engine_name: str) -> VirtualTryOnEngine: ...
```

A name-to-class lookup, nothing more. `create("idm-vton")` returns an
`IDMVTONEngine` instance typed as `VirtualTryOnEngine` — the caller never
sees the concrete type. An unknown name raises `UnknownEngineError` rather
than silently returning `None` or defaulting to something unexpected —
fail loud on a config typo, not quietly on the first `.generate()` call
three layers away.

## How a future model gets swapped without touching the application

1. Write `ai/src/models/engines/<new_model>.py` with a class implementing
   `VirtualTryOnEngine`.
2. Add one line to `engine_registry.py`'s `_ENGINES` dict.
3. Change `ai/src/core/config.py`'s `TRYON_ENGINE` value (or the `.env`
   variable backing it) to the new name.

Nothing else changes. Whatever eventually calls generation — the AI
Service Layer design, `backend/ai/services/ai_client.py`'s real body once
written — is written against `VirtualTryOnEngineRegistry.create(configured_name)`
returning a `VirtualTryOnEngine`, never against `IDMVTONEngine` or
`CatVTONEngine` by name. That's the Open/Closed Principle made concrete:
open for a new engine, closed against needing to modify the registry's
callers to get one.

## Scalability

- **Model swap is a config change**, not a redeploy of different
  application code — the same binary/container can run either engine
  depending on `TRYON_ENGINE`.
- **Different resource footprints, same interface.** IDM-VTON and CatVTON
  plausibly have different VRAM/latency profiles; nothing about this
  design assumes they're interchangeable at the hardware level, only at
  the code level — a real deployment could route to different GPU pools
  per engine while both remain `VirtualTryOnEngine`s to every caller.
- **A/B testing / gradual rollout** (run engine A for some requests,
  engine B for others) becomes possible on top of this registry later —
  noted as a natural extension, not built now (KISS: nothing in this
  phase's scope needs it yet).
- **NVIDIA NIM migration** (`NIM_ENDPOINT_URL`, a config placeholder since
  Phase 0) is not a special case — a NIM-hosted engine is just another
  class implementing `VirtualTryOnEngine`, registered the same way as a
  locally-loaded one.
- **Independent of `backend/ai/`'s scaling story.** ADR 0005's worker
  scaling (more worker processes as queue depth grows) and this registry
  (which model a worker calls) are orthogonal — a worker fleet can scale
  in count while every worker independently resolves whichever engine
  `TRYON_ENGINE` names.

## Relationship to other in-progress designs

`ai/src/preprocessing/`'s pluggable interfaces (pose estimation, human
parsing, background removal — proposed, not yet approved) are the natural
constructor-injected dependencies a real `IDMVTONEngine` would take. Not
wired up in this pass since that module doesn't exist as code yet — noted
here so the connection isn't lost, not built ahead of that approval.

## The `AIInferenceClient` layer (built)

The constructor-injected dependency anticipated above, generalized: both
`CatVTONEngine` and `IDMVTONEngine` now take an `AIInferenceClient`
(`inference_client.py`) rather than implementing — or, previously, stubbing
— model logic directly.

```
ai/src/models/
├── inference_client.py         AIInferenceClient (ABC), AIInferenceRequest, AIInferenceResponse
└── inference_clients/
    ├── local_stub.py            LocalStubInferenceClient — deterministic placeholder, wired in by default
    └── catvton_inference_client.py   CatVTONInferenceClient — real integration's connection point, not wired in
```

**Why a second abstraction layer, not just one.** `VirtualTryOnEngine`
answers *which model* runs (IDM-VTON vs. CatVTON — ADR 0006, a business/
product-level choice). `AIInferenceClient` answers a different question
underneath that: *how* the active engine's inference actually happens — a
locally-loaded model, a call to an external GPU inference server, or (today)
a deterministic stub. Collapsing these into one layer would mean "which
model" and "local vs. remote vs. stub" could never vary independently; kept
separate, `CatVTONEngine` stays the same class whether it's backed by a
stub during development or a real GPU-backed client in production — only
which `AIInferenceClient` gets injected changes.

**Every engine is real and callable today** — `engine_registry.py`'s
`create()` defaults to `LocalStubInferenceClient` when no client is passed,
so both `CatVTONEngine` and `IDMVTONEngine` return a real (placeholder)
`VirtualTryOnResult` instead of raising `NotImplementedError`. This is a
genuine behavior change from the original stubs: the whole pipeline above
this point (whatever eventually calls `VirtualTryOnEngineRegistry.create()`)
can now be built and tested end-to-end against a real return value, without
waiting on a real model.

**Where a real CatVTON implementation connects**: `catvton_inference_client.py`'s
`CatVTONInferenceClient` — its `infer()` raises `NotImplementedError` today,
with its docstring's TODOs marking the three things a real implementation
needs (loading `zhengchong/CatVTON`'s weights — CC-BY-NC-SA 4.0, non-commercial,
license fit must be verified before commercial use — and its vendored model
code; GPU device/precision selection, ~8GB VRAM at 1024x768 per CatVTON's
own published figures; or, as an alternative to loading the model in-process,
calling an external inference server, mirroring the already-existing
`NIM_ENDPOINT_URL` placeholder). Implementing it and passing an instance to
`VirtualTryOnEngineRegistry.create("catvton", inference_client=...)` is the
entire integration step — `CatVTONEngine` itself does not change.

**Known duplication, acknowledged not hidden**: `CatVTONEngine.generate()`
and `IDMVTONEngine.generate()` are currently identical (both just build an
`AIInferenceRequest`, call their injected client, and wrap the response) —
expected, since neither has any real per-model pre/post-processing yet. Not
collapsed into one shared class: `VirtualTryOnEngineRegistry`'s pluggability
axis is "which model" (ADR 0006), and once either engine gains real
model-specific logic around its inference call, the two will naturally
diverge again — collapsing them now would be a premature abstraction in the
other direction.

## Verification note

The original engine/registry/DTO stub files (this doc's earlier sections)
were hand-reviewed only, per the standing limitation at the time: no Python
interpreter, pip, or Docker available. That gap has since closed (see
`PROJECT_STATUS.md`'s MediaPipe phase). The `AIInferenceClient` layer above
was genuinely executed — `ruff`/`black`/`mypy` all pass against
`ai/src/models/` (using `ai/pyproject.toml`'s own config), and a script
imported `engine_registry.py` and confirmed: both engines return a real
`VirtualTryOnResult` from `LocalStubInferenceClient`, output is deterministic
for same-size input, `CatVTONInferenceClient` correctly raises
`NotImplementedError`, and an unknown engine name still raises
`UnknownEngineError`. Run via `ai/`'s own dependencies (`pydantic`, `Pillow`)
happening to already be installed in `backend/.venv` from the MediaPipe
work — `ai/` has no venv of its own in this environment, and nothing here
needed `ai/requirements.txt`'s heavier (torch/diffusers/mediapipe) entries.
