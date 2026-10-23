"""Checks that a user photo shows a full body before it's accepted.

A try-on generated from a cropped or unclear photo looks bad and still
costs a paid API call, so this runs at upload time using the MediaPipe
pose model the backend already has. Injected into user_photos.py as a
`FullBodyChecker`, so tests (and FULL_BODY_CHECK_ENABLED=false) can swap
it without touching the upload logic.
"""

import logging
from typing import Protocol

from ai.models.mediapipe_analysis import Landmark
from ai.services.mediapipe_service import ImageDecodeError
from app.core.config import get_settings
from app.services.mediapipe_analysis import get_mediapipe_service

logger = logging.getLogger(__name__)

# MediaPipe Pose landmark indices that must all be visible for a full body.
_REQUIRED_LANDMARKS = {
    "head": [0],  # nose
    "shoulders": [11, 12],
    "hips": [23, 24],
    "feet": [27, 28],  # ankles
}
_MIN_VISIBILITY = 0.5

NO_PERSON_MESSAGE = "We couldn't find a person in this photo. Please use a clear photo of yourself."
NOT_FULL_BODY_MESSAGE = (
    "Please use a full-body photo. We need to see you from head to feet, "
    "standing straight and facing the camera."
)


class PhotoRejectedError(ValueError):
    """The photo is a valid image but not usable for a try-on. The message
    is written for the end user and is safe to show as-is."""


class FullBodyChecker(Protocol):
    def check(self, image_bytes: bytes) -> None:
        """Returns normally if the photo is usable, raises PhotoRejectedError if not."""


class MediaPipeFullBodyChecker:
    def check(self, image_bytes: bytes) -> None:
        try:
            result = get_mediapipe_service().analyze(image_bytes)
        except ImageDecodeError as exc:
            raise PhotoRejectedError(NO_PERSON_MESSAGE) from exc
        except Exception:
            # The model couldn't run (e.g. its first-use download failed).
            # Accept the photo rather than block every upload; logged so
            # the outage is visible.
            logger.exception("full-body check unavailable; accepting photo unchecked")
            return

        if not result.body_detected:
            raise PhotoRejectedError(NO_PERSON_MESSAGE)

        landmarks = result.body_landmarks
        missing = [
            part
            for part, indices in _REQUIRED_LANDMARKS.items()
            if not all(_is_visible(landmarks, i) for i in indices)
        ]
        if missing:
            logger.info("full-body check rejected photo: missing=%s", missing)
            raise PhotoRejectedError(NOT_FULL_BODY_MESSAGE)


class AcceptAllChecker:
    """Used when FULL_BODY_CHECK_ENABLED is false, and by tests."""

    def check(self, image_bytes: bytes) -> None:
        return None


def _is_visible(landmarks: list[Landmark], index: int) -> bool:
    if index >= len(landmarks):
        return False
    point = landmarks[index]
    in_frame = 0.0 <= point.x <= 1.0 and 0.0 <= point.y <= 1.0
    return in_frame and (point.visibility or 0.0) >= _MIN_VISIBILITY


def get_full_body_checker() -> FullBodyChecker:
    if get_settings().FULL_BODY_CHECK_ENABLED:
        return MediaPipeFullBodyChecker()
    return AcceptAllChecker()
