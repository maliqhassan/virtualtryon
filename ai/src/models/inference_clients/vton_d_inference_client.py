"""Real try-ons through VTON-D (Virtual Try-On Diffusion, by Texel.Moda),
called over RapidAPI. The testing provider until FASHN replaces it (ADR
0013); FASHN will be another AIInferenceClient next to this one.

One request per try-on: the person photo and the clothing photo go up as
JPEG files, and the try-on comes back as a JPEG (at most 768x1024) in the
response body. VTON-D dresses the person in the whole look of the clothing
photo, so a photo of someone wearing the outfit works best.

The user's body photo leaves our server here. Nothing else about the user
(id, email, names) is sent. Errors and photo preparation are shared with
the other providers (tryon_service.py).
"""

import io
import logging
import time

import httpx
from PIL import Image, UnidentifiedImageError

from ..inference_client import (
    AIInferenceClient,
    AIInferenceRequest,
    AIInferenceResponse,
)
from .tryon_service import (
    BUSY,
    NOT_SET_UP,
    REJECTED,
    UNAVAILABLE,
    UNREADABLE,
    TryOnServiceError,
    to_jpeg,
)

__all__ = [
    "BUSY",
    "NOT_SET_UP",
    "REJECTED",
    "UNAVAILABLE",
    "UNREADABLE",
    "TryOnServiceError",
    "VtonDInferenceClient",
]

logger = logging.getLogger(__name__)

_HOST = "try-on-diffusion.p.rapidapi.com"
_URL = f"https://{_HOST}/try-on-file"
# VTON-D recommends 768x1024 or more and returns at most 768x1024, so
# anything larger only slows the upload.
_UPLOAD_MAX_SIDE = 1280
# It usually answers in 5-10 s but queues requests when busy.
_TIMEOUT = httpx.Timeout(90.0, connect=10.0)
_MAX_RESULT_BYTES = 20 * 1024 * 1024


class VtonDInferenceClient(AIInferenceClient):
    def __init__(self, api_key: str, transport: httpx.BaseTransport | None = None) -> None:
        """`transport` is for tests (httpx.MockTransport), so they never
        spend a real API call."""
        self._api_key = api_key
        self._transport = transport

    def infer(self, request: AIInferenceRequest) -> AIInferenceResponse:
        if not self._api_key:
            raise TryOnServiceError(NOT_SET_UP)
        # Stored images are opened lazily, so a damaged file first fails
        # here; its raw error text isn't for the user.
        try:
            avatar = to_jpeg(request.user_image, _UPLOAD_MAX_SIDE)
            clothing = to_jpeg(request.clothing_image, _UPLOAD_MAX_SIDE)
        except (OSError, ValueError, Image.DecompressionBombError):
            logger.warning("Could not prepare the photos for VTON-D", exc_info=True)
            raise TryOnServiceError(UNREADABLE) from None
        files = {
            "avatar_image": ("avatar.jpg", avatar, "image/jpeg"),
            "clothing_image": ("clothing.jpg", clothing, "image/jpeg"),
        }
        headers = {"x-rapidapi-key": self._api_key, "x-rapidapi-host": _HOST}
        started = time.monotonic()
        try:
            with httpx.Client(timeout=_TIMEOUT, transport=self._transport) as client:
                response = client.post(_URL, files=files, headers=headers)
        except httpx.HTTPError as exc:
            logger.warning("VTON-D request failed: %s", type(exc).__name__)
            raise TryOnServiceError(UNAVAILABLE) from None
        elapsed = time.monotonic() - started

        status = response.status_code
        if status == 429:
            logger.warning("VTON-D refused: rate or monthly limit reached")
            raise TryOnServiceError(BUSY)
        if status in (400, 422):
            # Unusable photos, or the result was flagged by its safety check.
            logger.info("VTON-D rejected the photos: %s %s", status, response.text[:300])
            raise TryOnServiceError(REJECTED)
        if status in (401, 403):
            logger.error("VTON-D refused the API key (%s): check TRYON_API_KEY", status)
            raise TryOnServiceError(NOT_SET_UP)
        content_type = response.headers.get("content-type", "")
        if (
            status != 200
            or not content_type.startswith("image/")
            or len(response.content) > _MAX_RESULT_BYTES
        ):
            logger.warning("VTON-D unexpected response: %s %s", status, content_type)
            raise TryOnServiceError(UNAVAILABLE)

        try:
            image = Image.open(io.BytesIO(response.content))
            image.load()
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
            logger.warning("VTON-D returned an unreadable image")
            raise TryOnServiceError(UNAVAILABLE) from None

        logger.info("VTON-D try-on done in %.1fs", elapsed)
        return AIInferenceResponse(
            generated_image=image.convert("RGB"),
            model_name="vton-d",
            inference_time_seconds=elapsed,
        )
