"""What every real try-on provider client shares: the user-facing error, its
messages, and preparing a photo for upload. Used by the VTON-D client (ADR
0013) and the Genlook client (ADR 0018), so both fail with the same plain
sentences and send photos the same way.

Exception messages are shown to the user as the job's error, so each one
is a plain sentence; details go to the log.
"""

import io

from PIL import Image, ImageOps

NOT_SET_UP = "Try-on isn’t set up on the server yet."
BUSY = "The try-on service is busy or out of try-ons for now. Please try again later."
REJECTED = "The try-on service couldn’t use these photos. Try another photo of you or of the piece."
NO_PERSON = (
    "We couldn’t see you clearly in your photo. Use a well-lit, head-to-toe photo "
    "where you fill most of the frame."
)
UNAVAILABLE = "The try-on service didn’t respond. Please try again in a minute."
UNREADABLE = "We couldn’t read one of the photos. Please add it again."


class TryOnServiceError(Exception):
    """A try-on that didn't happen; the message is safe to show the user."""


def to_jpeg(image: Image.Image, max_side: int) -> bytes:
    """Upright (phone photos often rely on EXIF rotation), on white where
    transparent (cut-out product PNGs), at most `max_side` on the long side."""
    upright = ImageOps.exif_transpose(image)
    if upright.mode in ("RGBA", "LA") or (upright.mode == "P" and "transparency" in upright.info):
        rgba = upright.convert("RGBA")
        flat = Image.new("RGB", rgba.size, (255, 255, 255))
        flat.paste(rgba, mask=rgba.getchannel("A"))
        upright = flat
    else:
        upright = upright.convert("RGB")
    upright.thumbnail((max_side, max_side))
    out = io.BytesIO()
    upright.save(out, format="JPEG", quality=90)
    return out.getvalue()
