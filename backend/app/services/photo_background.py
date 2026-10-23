"""Makes a plain-background version of the user's photo: the person is cut
out with MediaPipe segmentation and placed on the app's light background,
cropped to the person. Shown in the app wherever the user's photo appears.

Injected into user_photos.py as a `BackgroundRemover` (same pattern as the
full-body check), so tests swap it out and a failure never blocks an upload:
without a cut-out the app simply shows the original photo.
"""

import io
import logging
from typing import Any, Protocol

import numpy as np
from PIL import Image, ImageFilter

from app.core.config import get_settings
from app.services.mediapipe_analysis import get_mediapipe_service

logger = logging.getLogger(__name__)

BACKGROUND = (240, 236, 229)  # warm, plain studio tone from the app's palette
_MIN_PERSON_FRACTION = 0.03  # less than this and there's no usable person
_MARGIN = 0.08  # padding around the person, as a share of their size


class BackgroundRemover(Protocol):
    def remove(self, image_bytes: bytes) -> bytes | None:
        """PNG bytes of the cut-out, or None if it couldn't be made."""


def composite_on_plain_background(
    image: Image.Image, mask: "np.ndarray[Any, np.dtype[np.bool_]]"
) -> Image.Image:
    """Places the masked person on BACKGROUND and crops to them with a margin."""
    rgb = image.convert("RGB")
    alpha = Image.fromarray((mask * 255).astype(np.uint8), mode="L").resize(rgb.size)
    alpha = alpha.filter(ImageFilter.GaussianBlur(radius=max(rgb.width // 300, 1)))
    plain = Image.new("RGB", rgb.size, BACKGROUND)
    plain.paste(rgb, (0, 0), alpha)

    ys, xs = np.nonzero(np.asarray(alpha) > 32)
    if len(xs) == 0:
        return plain
    margin_x = int((xs.max() - xs.min()) * _MARGIN)
    margin_y = int((ys.max() - ys.min()) * _MARGIN)
    box = (
        max(int(xs.min()) - margin_x, 0),
        max(int(ys.min()) - margin_y, 0),
        min(int(xs.max()) + margin_x, rgb.width),
        min(int(ys.max()) + margin_y, rgb.height),
    )
    return plain.crop(box)


class MediaPipeBackgroundRemover:
    def remove(self, image_bytes: bytes) -> bytes | None:
        try:
            mask = get_mediapipe_service().person_mask(image_bytes)
            if mask.mean() < _MIN_PERSON_FRACTION:
                return None
            image = Image.open(io.BytesIO(image_bytes))
            cutout = composite_on_plain_background(image, mask)
            buffer = io.BytesIO()
            cutout.save(buffer, format="PNG", optimize=True)
            return buffer.getvalue()
        except Exception:
            # Never block an upload over the cut-out; the original photo is used.
            logger.exception("background removal failed; keeping the original photo only")
            return None


class NoBackgroundRemoval:
    """Used by tests."""

    def remove(self, image_bytes: bytes) -> bytes | None:
        return None


def get_background_remover() -> BackgroundRemover:
    if get_settings().BACKGROUND_REMOVAL_ENABLED:
        return MediaPipeBackgroundRemover()
    return NoBackgroundRemoval()
