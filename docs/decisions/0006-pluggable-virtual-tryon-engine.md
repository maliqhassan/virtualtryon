# 6. Virtual try-on generation is pluggable behind a `VirtualTryOnEngine` interface

Date: 2026-07-30
Status: Accepted

## Context

`docs/decisions/0004-ai-orchestration-vs-execution-boundary.md` already
established that model choice is deliberately not made at the
orchestration level, and `backend/ai/models/tryon.py`'s
`TryOnGenerationResult.model_name` field already anticipated that more
than one candidate model might eventually produce a result. Two concrete
candidates are now named — IDM-VTON and CatVTON — with an explicit
requirement that switching between them (or adding a future third) must
not require changing any code that calls into generation. Confirmed
scope: a single 2D user photo and a single 2D clothing photo in, a single
realistic 2D generated image out — not a 3D avatar, not a digital human,
matching what ADR 0004 and `docs/architecture/ai-backend.md` already
assumed (`PoseKeypoint` is 2D-only, etc.), so this doesn't revise any
earlier contract, only confirms it.

## Decision

A single abstract interface, `VirtualTryOnEngine`
(`ai/src/models/virtual_tryon_engine.py`), with one method:
`generate(user_image, clothing_image) -> VirtualTryOnResult`. Every
concrete engine (`ai/src/models/engines/idm_vton_engine.py`'s
`IDMVTONEngine`, `catvton_engine.py`'s `CatVTONEngine`, and whatever comes
after) implements only this interface — no shared base beyond it, so one
engine's internals can't leak into another's.

`ai/src/models/engine_registry.py`'s `VirtualTryOnEngineRegistry.create(name)`
is the **only** place that maps a name to a concrete class. Adding a new
model means: write `engines/<name>.py` implementing `VirtualTryOnEngine`,
add one entry to the registry's `_ENGINES` dict. Nothing that already
calls `VirtualTryOnEngineRegistry.create(...).generate(...)` changes,
because it was never written against a concrete engine class — only
against the `VirtualTryOnEngine` abstraction (Dependency Inversion). Which
engine is active is a config value (`ai/src/core/config.py`'s new
`TRYON_ENGINE` field, defaulting to `"idm-vton"`) — swapping models in
production is a config change, not a code change.

Kept deliberately minimal: `generate()` is the only method on the
interface. Real engines will likely need pose keypoints and a
human-parsing mask internally (IDM-VTON's published pipeline uses both;
CatVTON's does not, by design — a real difference between the two
candidates) — those are each concrete engine's own constructor-injected
dependency, not part of the shared public contract, so an engine that
computes them differently (or not at all) is still a valid
implementation. No lifecycle methods (`warmup`/`unload` for GPU memory
management) are added speculatively; a real implementation can extend the
interface when it actually needs one.

Synchronous, not async: matches
`docs/decisions/0005-async-job-processing-via-redis.md`'s existing point
that GPU inference is blocking regardless of what invokes it — the async
orchestration in `backend/ai/` is a separate, higher layer.

## Consequences

- No model is downloaded, loaded, or run by this decision — both
  `IDMVTONEngine` and `CatVTONEngine` are stubs whose `generate()` raises
  `NotImplementedError`. Model integration remains Milestone 12's job.
- This is the same Strategy/plugin shape `docs/roadmap/README.md`'s
  cross-cutting decision #3 already used for the storage interface (swap
  the implementation, not the caller) — applied here to generation models
  instead of storage backends.
- A future NVIDIA NIM-hosted engine (`NIM_ENDPOINT_URL`, placeholder since
  Phase 0) is just another `VirtualTryOnEngine` implementation under this
  same registry — not a special case requiring its own integration path.
- `ai/src/models/dto.py`'s `VirtualTryOnResult` is deliberately NOT
  imported from or into `backend/ai/models/tryon.py` — the two are
  independently-defined, intentionally similar-shaped contracts, per the
  repo-wide rule against cross-service imports (`ai/` and `backend/` stay
  independently deployable).
