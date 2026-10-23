"""Demo `AIInferenceClient`: lets the whole app (upload → generate → result →
save) be tested end to end before a real try-on API is connected.

It does NOT generate a try-on. It returns the user's own photo with the
garment pinned in a corner and a banner reading "DEMO RESULT · AI NOT
CONNECTED", so it can never be mistaken for real output. Selected only when
the backend's TRYON_PROVIDER setting is "demo".
"""

from PIL import Image, ImageDraw, ImageFont

from ..inference_client import (
    AIInferenceClient,
    AIInferenceRequest,
    AIInferenceResponse,
)

_MAX_SIDE = 1280
_BANNER_TEXT = "DEMO RESULT · AI NOT CONNECTED"
_INK = (22, 19, 15)
_PAPER = (246, 244, 240)
_CLAY = (180, 113, 63)


class DemoInferenceClient(AIInferenceClient):
    def infer(self, request: AIInferenceRequest) -> AIInferenceResponse:
        base = request.user_image.convert("RGB")
        base.thumbnail((_MAX_SIDE, _MAX_SIDE))
        width, height = base.size

        garment = request.clothing_image.convert("RGB")
        thumb_side = max(width // 3, 64)
        garment.thumbnail((thumb_side, thumb_side))
        border = max(width // 120, 3)
        framed = Image.new("RGB", (garment.width + border * 2, garment.height + border * 2), _PAPER)
        framed.paste(garment, (border, border))
        margin = max(width // 30, 8)
        base.paste(framed, (width - framed.width - margin, height - framed.height - margin))

        draw = ImageDraw.Draw(base, "RGBA")
        banner_height = max(height // 14, 28)
        draw.rectangle((0, 0, width, banner_height), fill=(*_INK, 220))
        draw.rectangle((0, banner_height - 4, width, banner_height), fill=_CLAY)
        font = ImageFont.load_default(size=max(banner_height // 2, 12))
        text_box = draw.textbbox((0, 0), _BANNER_TEXT, font=font)
        text_x = (width - (text_box[2] - text_box[0])) // 2
        text_y = (banner_height - 4 - (text_box[3] - text_box[1])) // 2 - text_box[1]
        draw.text((text_x, text_y), _BANNER_TEXT, font=font, fill=_PAPER)

        return AIInferenceResponse(
            generated_image=base, model_name="demo", inference_time_seconds=0.0
        )
