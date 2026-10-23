"""Business logic for POST /api/v1/ai/mediapipe/analyze.

No FastAPI import here — this repo's layering rule (app/api/ calls
app/services/; services stay framework-agnostic) so this stays testable
without spinning up the app. The endpoint layer translates whatever this
raises into an HTTP status code.

This is the first place `app/` imports from `backend/ai/` — `ai` is a
sibling top-level package to `app` (both live directly under `backend/`,
each with their own `__init__.py`), the same layout `backend/ai/services/
ai_client.py`'s own relative imports already assume.
"""

import logging
import time
from functools import lru_cache

from ai.services.mediapipe_service import ImageDecodeError, MediaPipeService
from app.core.config import get_settings
from app.schemas.ai import LandmarkPoint, MediaPipeAnalyzeResponse, MediaPipeLandmarks

logger = logging.getLogger(__name__)

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10MB — comfortably above a typical mobile photo
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png"}


class UnsupportedImageError(ValueError):
    """Raised for a request that fails validation before it reaches MediaPipe."""


@lru_cache
def get_mediapipe_service() -> MediaPipeService:
    """One MediaPipeService per process, matching get_settings()'s own
    zero-arg lru_cache pattern — the landmarker models load once, lazily,
    on the first real analyze() call, not at import time.
    """
    return MediaPipeService(model_dir=get_settings().MEDIAPIPE_MODEL_DIR)


def analyze_image(content_type: str | None, image_bytes: bytes) -> MediaPipeAnalyzeResponse:
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise UnsupportedImageError(f"Unsupported content type: {content_type!r}")
    if len(image_bytes) > MAX_UPLOAD_BYTES:
        raise UnsupportedImageError(f"Image exceeds {MAX_UPLOAD_BYTES}-byte limit")

    service = get_mediapipe_service()
    started = time.perf_counter()
    try:
        result = service.analyze(image_bytes)
    except ImageDecodeError:
        logger.warning("MediaPipe analyze: undecodable image (%d bytes)", len(image_bytes))
        raise
    except Exception:
        logger.exception("MediaPipe analyze: unexpected failure")
        raise
    elapsed_ms = (time.perf_counter() - started) * 1000

    logger.info(
        "MediaPipe analyze: body_detected=%s face_detected=%s elapsed_ms=%.1f",
        result.body_detected,
        result.face_detected,
        elapsed_ms,
    )

    return MediaPipeAnalyzeResponse(
        success=True,
        body_detected=result.body_detected,
        face_detected=result.face_detected,
        landmarks=MediaPipeLandmarks(
            body=[
                LandmarkPoint(x=p.x, y=p.y, z=p.z, visibility=p.visibility)
                for p in result.body_landmarks
            ],
            face=[LandmarkPoint(x=p.x, y=p.y, z=p.z) for p in result.face_landmarks],
        ),
        processing_time_ms=round(elapsed_ms, 2),
    )
