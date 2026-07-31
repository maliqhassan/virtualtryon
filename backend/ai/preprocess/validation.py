"""Requirement 3 (Image Validation) — the actual check, producing an
..models.validation.ImageValidationResult. Runs before a job is
enqueued, so a malformed upload never occupies a worker slot.

Deliberately CPU-only (image dimensions, file integrity). Checks that
arguably need a model (e.g. "is a person actually in this photo") are
noted in models/validation.py's docstring as a candidate to fold into
the pose detection stage instead, rather than duplicating that work
here.
"""

from ..models.validation import ImageValidationResult


def validate_image(image_uri: str) -> ImageValidationResult:
    raise NotImplementedError(
        "validation logic not implemented — scope of this phase excludes inference/endpoints"
    )
