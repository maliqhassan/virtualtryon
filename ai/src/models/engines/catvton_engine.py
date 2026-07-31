"""CatVTON-backed VirtualTryOnEngine.

CatVTON (Concatenation Is All You Need for Virtual Try-On) is a lighter-
weight diffusion-based alternative to IDM-VTON — notably, its published
design avoids a separate pose-estimation/warping step, relying on simple
concatenation of the garment and person latents instead. That's a real
architectural difference between the two candidates, worth naming since
it's exactly the kind of thing this engine's pluggability is meant to
absorb without any caller caring which one is active.

This engine does not implement model logic itself — it depends on an
injected `AIInferenceClient` (Dependency Inversion, the same pattern as
`AIServiceClient`/`JobQueue`/`MediaPipeService` elsewhere in this codebase)
for the actual inference work. Today that's `LocalStubInferenceClient`
(`engine_registry.py`'s default); a real integration means writing
`CatVTONInferenceClient`'s real body and changing which client gets
injected — nothing about this class changes. See
`docs/architecture/ai-tryon-engine.md` for the full picture.
"""

from PIL import Image

from ..dto import VirtualTryOnResult
from ..inference_client import AIInferenceClient, AIInferenceRequest
from ..virtual_tryon_engine import VirtualTryOnEngine


class CatVTONEngine(VirtualTryOnEngine):
    def __init__(self, inference_client: AIInferenceClient) -> None:
        self._inference_client = inference_client

    def generate(self, user_image: Image.Image, clothing_image: Image.Image) -> VirtualTryOnResult:
        response = self._inference_client.infer(
            AIInferenceRequest(user_image=user_image, clothing_image=clothing_image)
        )
        return VirtualTryOnResult(
            generated_image=response.generated_image,
            model_name=response.model_name,
            generation_time_seconds=response.inference_time_seconds,
        )
