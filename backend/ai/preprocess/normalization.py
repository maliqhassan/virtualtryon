"""Resize/format-normalize an uploaded image before it's sent to ai/, so
every model downstream receives consistent input regardless of what the
user uploaded (arbitrary phone-camera resolutions, HEIC vs. JPEG, etc.).
CPU-only (e.g. Pillow/OpenCV resize) — no model involved.
"""


def normalize_image(image_uri: str) -> str:
    """Return the URI of a normalized copy of the image at `image_uri`."""
    raise NotImplementedError(
        "normalization logic not implemented — scope of this phase excludes inference/endpoints"
    )
