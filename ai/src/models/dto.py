"""Data contracts for the Virtual Try-On Engine (see virtual_tryon_engine.py).

`VirtualTryOnResult` is the one non-metadata-only DTO in this module — it
carries the actual generated image, not just a report about one. Pydantic's
`arbitrary_types_allowed` is enabled deliberately for this reason (a
`PIL.Image.Image` isn't natively a Pydantic type).

Self-contained on purpose: this does NOT import backend/ai/models/tryon.py's
`TryOnGenerationInput`/`TryOnGenerationResult`, even though the shapes are
closely related. `ai/` and `backend/` must stay independently deployable
(see CLAUDE.md's repo-wide rules) — the contract between them is HTTP/JSON,
never a shared Python import. The similarity is deliberate mirroring, not
duplication to fix.
"""

from PIL import Image
from pydantic import BaseModel, ConfigDict


class VirtualTryOnResult(BaseModel):
    """Output of a VirtualTryOnEngine.generate() call.

    `model_name` records which concrete engine actually produced the image
    (e.g. "idm-vton") — mirrors backend/ai/models/tryon.py's
    `TryOnGenerationResult.model_name`, which already anticipated this
    pluggability back in Phase 8, before this engine existed.
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    generated_image: Image.Image
    model_name: str
    generation_time_seconds: float | None = None
