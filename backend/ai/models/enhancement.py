"""Contract for the image enhancement (upscaling/quality) stage
(requirement 9) — Real-ESRGAN's eventual output. The final GPU-bound
stage before storage; its output becomes `TryOnResult.image_uri`.
"""

from pydantic import BaseModel


class EnhancementResult(BaseModel):
    enhanced_image_uri: str
    upscale_factor: float = 1.0
