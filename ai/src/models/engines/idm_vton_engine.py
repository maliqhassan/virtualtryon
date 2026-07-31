"""IDM-VTON-backed VirtualTryOnEngine.

IDM-VTON (Improving Diffusion Models for Authentic Virtual Try-on in the
Wild) is a diffusion-based garment-compositing model — one of the two
candidates named for this engine (see
docs/decisions/0006-pluggable-virtual-tryon-engine.md).

Refactored alongside `CatVTONEngine` to depend on an injected
`AIInferenceClient` rather than raising `NotImplementedError` directly —
kept both engines on the same pattern rather than leaving one behind on
the old shape (see `docs/architecture/ai-tryon-engine.md`). A real
implementation will likely need pose keypoints and a human-parsing mask
internally (IDM-VTON's published pipeline uses both) — those remain this
engine's own concern, resolved inside whichever `AIInferenceClient`
implementation eventually backs it, not part of the shared
`VirtualTryOnEngine` contract.
"""

from PIL import Image

from ..dto import VirtualTryOnResult
from ..inference_client import AIInferenceClient, AIInferenceRequest
from ..virtual_tryon_engine import VirtualTryOnEngine


class IDMVTONEngine(VirtualTryOnEngine):
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
