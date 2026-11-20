"""Draws the brand mark: a clothes hanger whose hook is a four-point spark.

Usage:
  python scripts/draw-logo.py assets/images          writes the app's icon images
  python scripts/draw-logo.py OUT_DIR --preview      writes only OUT_DIR/preview.png

The same drawing as src/components/brand-mark.tsx (same 1024 grid, same
spark curves, same hanger): change both together. Draws at 4x and
downsamples for smooth edges. Needs Pillow.
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw

NIGHT = (18, 17, 15, 255)  # theme `night`
GOLD = (231, 199, 122, 255)  # theme `goldSoft`
CREAM = (246, 241, 232, 255)
WHITE = (255, 255, 255, 255)
SS = 4  # supersampling

# On the 1024 grid, as in brand-mark.tsx. The drawing spans x 150..874 and
# y 196..826, centred on (512, 511).
SPARK = [  # four cubic curves: start, control, control, end
    ((512, 196), (512, 268), (580, 336), (652, 336)),
    ((652, 336), (580, 336), (512, 404), (512, 476)),
    ((512, 476), (512, 404), (444, 336), (372, 336)),
    ((372, 336), (444, 336), (512, 268), (512, 196)),
]
HANGER = [(512, 546), (836, 788), (188, 788)]
STROKE = 76


def _cubic(p0, p1, p2, p3, steps=48):
    for i in range(steps):
        t = i / steps
        a, b, c, d = (1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t**2, t**3
        yield (
            a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
            a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
        )


def draw_mark(size, color, scale=1.0):
    """The mark centred on a transparent size x size canvas. At scale 1.0 it
    spans about 71% of the width."""
    S = size * SS
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    u = S / 1024 * scale

    def p(x, y):
        return (S / 2 + (x - 512) * u, S / 2 + (y - 511) * u)

    spark = [p(*pt) for curve in SPARK for pt in _cubic(*curve)]
    d.polygon(spark, fill=color)

    w = STROKE * u
    corners = [p(*pt) for pt in HANGER]
    for a, b in zip(corners, corners[1:] + corners[:1]):
        d.line([a, b], fill=color, width=round(w))
    for c in corners:  # round joins
        d.ellipse([c[0] - w / 2, c[1] - w / 2, c[0] + w / 2, c[1] + w / 2], fill=color)

    return img.resize((size, size), Image.LANCZOS)


def app_icon():
    """Gold mark on night, full bleed (launchers round the corners)."""
    icon = Image.new("RGBA", (1024, 1024), NIGHT)
    icon.alpha_composite(draw_mark(1024, GOLD, scale=0.78))
    return icon


def write_assets(out):
    app_icon().convert("RGB").save(out / "icon.png")
    # Android adaptive icon: inside the 66% safe zone; the background is
    # app.json's adaptiveIcon.backgroundColor.
    draw_mark(1024, GOLD, scale=0.56).save(out / "android-icon-foreground.png")
    draw_mark(1024, WHITE, scale=0.56).save(out / "android-icon-monochrome.png")
    # Native splash (on a night background): small enough that Android 12+'s
    # circular mask (2/3 of the image) never clips the hanger's corners.
    draw_mark(1024, GOLD, scale=0.66).save(out / "splash-icon.png")
    fav = Image.new("RGBA", (48, 48), NIGHT)
    fav.alpha_composite(draw_mark(48, GOLD, scale=0.8))
    fav.convert("RGB").save(out / "favicon.png")


def write_preview(out):
    icon = app_icon()
    sheet = Image.new("RGB", (1500, 560), (240, 236, 228))
    x = 24
    for s in (512, 192, 96, 48):
        sheet.paste(icon.resize((s, s), Image.LANCZOS).convert("RGB"), (x, 24))
        x += s + 40
    light = Image.new("RGBA", (512, 512), CREAM)
    light.alpha_composite(draw_mark(512, NIGHT, scale=0.78))
    sheet.paste(light.convert("RGB"), (960, 24))
    sheet.save(out / "preview.png")


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    if "--preview" in sys.argv[2:]:
        write_preview(out)
    else:
        write_assets(out)


if __name__ == "__main__":
    main()
