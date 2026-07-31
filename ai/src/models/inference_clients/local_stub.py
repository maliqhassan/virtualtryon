"""Deterministic development stub for `AIInferenceClient` — lets every layer
above it (`VirtualTryOnEngine`, the registry, and eventually whatever calls
into generation) be built and exercised end-to-end without any real model
downloaded or loaded. See `catvton_inference_client.py` for where a real
CatVTON implementation connects instead.
"""

from PIL import Image

from ..inference_client import AIInferenceClient, AIInferenceRequest, AIInferenceResponse


class LocalStubInferenceClient(AIInferenceClient):
    """Returns a solid-fill placeholder image sized to match the input user
    image — deterministic (same input size -> same output), and tagged
    `model_name="local-stub"` so a caller can tell from the response alone
    that this isn't a real generation result.
    """

    _FILL_COLOR = (128, 128, 128)  # mid-gray — unambiguously a placeholder, not a photo

    def infer(self, request: AIInferenceRequest) -> AIInferenceResponse:
        placeholder = Image.new("RGB", request.user_image.size, color=self._FILL_COLOR)
        return AIInferenceResponse(
            generated_image=placeholder,
            model_name="local-stub",
            inference_time_seconds=0.0,
        )
