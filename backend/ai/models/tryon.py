"""Contract for the virtual try-on generation stage (requirement 7) —
IDM-VTON/CatVTON's eventual input/output (the specific choice between them
is deliberately not made here; see "Future models" in
docs/architecture/ai-backend.md). Takes the pose and parsing stages'
outputs as input rather than raw images again, since those are
already-computed and shouldn't be redone per generation model.
"""

from pydantic import BaseModel

from .parsing import HumanParsingResult
from .pose import PoseDetectionResult


class TryOnGenerationInput(BaseModel):
    user_photo_uri: str
    garment_photo_uri: str
    pose: PoseDetectionResult
    parsing: HumanParsingResult


class TryOnGenerationResult(BaseModel):
    generated_image_uri: str
    model_name: str  # e.g. "idm-vton" — which candidate model actually ran
