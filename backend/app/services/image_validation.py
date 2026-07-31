"""Shared image-upload validation, extracted from app/services/saved_looks.py
once Garments became a second real consumer of the exact same checks
(content-type allowlist, size cap, real Pillow decode-verify) — the
project's own established DRY precedent (Phase 4's refactor) for promoting
logic once a genuine second caller exists, not duplicating it.
"""

import io
from dataclasses import dataclass

from PIL import Image

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10MB, matching the MediaPipe endpoint's cap
ALLOWED_CONTENT_TYPES = {"image/jpeg": "jpg", "image/png": "png"}


class UnsupportedImageError(ValueError):
    """Raised for an upload that fails validation before it's persisted."""


@dataclass
class ImageUpload:
    content: bytes
    content_type: str | None
    filename: str | None


def validate_image(image: ImageUpload) -> str:
    """Returns the file extension to store this image under. Raises
    UnsupportedImageError for anything that fails validation.
    """
    extension = ALLOWED_CONTENT_TYPES.get(image.content_type or "")
    if extension is None:
        raise UnsupportedImageError(f"Unsupported content type: {image.content_type!r}")
    if len(image.content) > MAX_UPLOAD_BYTES:
        raise UnsupportedImageError(f"Image exceeds {MAX_UPLOAD_BYTES}-byte limit")
    try:
        Image.open(io.BytesIO(image.content)).verify()
    except Exception as exc:
        raise UnsupportedImageError("Uploaded file is not a decodable image") from exc
    return extension
