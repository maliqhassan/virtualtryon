"""Contract for the human parsing (body/garment segmentation) stage
(requirement 6) — SCHP's eventual output. A parsing result is a per-pixel
label mask; that mask is stored as an image artifact (via `storage/`), not
embedded in this contract — this model only carries a reference to it plus
the summary a caller actually needs, without re-reading the mask itself.
"""

from pydantic import BaseModel


class HumanParsingResult(BaseModel):
    segmentation_mask_uri: str
    detected_body_parts: list[str]  # e.g. ["torso", "left_arm", "right_arm", "hair"]
