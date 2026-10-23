"""Creates the sample store catalogue: three fictional stores with drawn
product images, so the Shop tab has something real to browse and try on
before any actual store is connected. Idempotent: does nothing if stores
already exist. Run with `python -m app.seed_catalog`.

The store names are invented. The app labels them as sample stores.
"""

import io
import logging
from dataclasses import dataclass

from PIL import Image, ImageDraw, ImageFilter
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.catalog_repository import CatalogRepository
from app.services.storage import StorageService

logger = logging.getLogger(__name__)

W, H = 600, 800
Colour = tuple[int, int, int]


@dataclass(frozen=True)
class SampleProduct:
    title: str
    category: str
    price_cents: int
    shape: str
    fill: Colour
    background: Colour


@dataclass(frozen=True)
class SampleStore:
    slug: str
    name: str
    tagline: str
    accent_color: str
    products: tuple[SampleProduct, ...]


SAMPLE_STORES: tuple[SampleStore, ...] = (
    SampleStore(
        slug="saffron-atelier",
        name="Saffron Atelier",
        tagline="Eastern wear for Eid, weddings and every day",
        accent_color="#B4713F",
        products=(
            SampleProduct(
                "Ivory linen kurta", "Shirts", 4900, "kurta", (244, 238, 226), (239, 232, 220)
            ),
            SampleProduct(
                "Saffron embroidered kurta",
                "Shirts",
                6400,
                "kurta",
                (214, 150, 60),
                (246, 236, 220),
            ),
            SampleProduct(
                "Emerald silk kurta", "Shirts", 7800, "kurta", (46, 112, 80), (226, 236, 228)
            ),
            SampleProduct(
                "Charcoal waistcoat", "Jackets", 5500, "waistcoat", (58, 55, 50), (236, 231, 225)
            ),
            SampleProduct(
                "Rose festive dress", "Dresses", 8900, "dress", (190, 110, 120), (246, 232, 232)
            ),
            SampleProduct(
                "Cream straight trousers",
                "Pants",
                3900,
                "trousers",
                (232, 222, 204),
                (240, 236, 228),
            ),
        ),
    ),
    SampleStore(
        slug="northline-basics",
        name="Northline Basics",
        tagline="Everyday essentials, done simply",
        accent_color="#4A5578",
        products=(
            SampleProduct(
                "White oxford shirt", "Shirts", 3900, "shirt", (255, 255, 255), (230, 234, 240)
            ),
            SampleProduct("Navy crew tee", "T-Shirts", 1900, "tee", (52, 64, 98), (228, 232, 240)),
            SampleProduct(
                "Heather grey tee", "T-Shirts", 1900, "tee", (168, 168, 170), (238, 238, 236)
            ),
            SampleProduct(
                "Olive chinos", "Pants", 4400, "trousers", (122, 127, 87), (231, 234, 223)
            ),
            SampleProduct(
                "Indigo denim jacket", "Jackets", 6900, "jacket", (64, 86, 130), (229, 233, 241)
            ),
            SampleProduct(
                "Stone shorts", "Shorts", 2900, "shorts", (196, 182, 156), (240, 236, 228)
            ),
        ),
    ),
    SampleStore(
        slug="ember-and-thread",
        name="Ember & Thread",
        tagline="Warm colours and soft layers",
        accent_color="#8E3324",
        products=(
            SampleProduct(
                "Clay hoodie", "Hoodies", 4900, "hoodie", (180, 113, 63), (243, 231, 219)
            ),
            SampleProduct(
                "Forest hoodie", "Hoodies", 4900, "hoodie", (62, 96, 72), (230, 236, 230)
            ),
            SampleProduct(
                "Rust overshirt", "Jackets", 5900, "jacket", (150, 70, 45), (244, 232, 224)
            ),
            SampleProduct(
                "Mustard knit tee", "T-Shirts", 2400, "tee", (201, 162, 39), (246, 240, 222)
            ),
            SampleProduct(
                "Black wide trousers", "Pants", 4600, "trousers", (36, 33, 30), (236, 231, 225)
            ),
            SampleProduct(
                "Plum wrap dress", "Dresses", 7200, "dress", (110, 60, 90), (240, 230, 238)
            ),
        ),
    ),
)


def _darker(c: Colour, amount: float = 0.72) -> Colour:
    return (int(c[0] * amount), int(c[1] * amount), int(c[2] * amount))


def _outline(shape: str) -> list[tuple[int, int]]:
    if shape in ("shirt", "tee", "hoodie", "jacket", "kurta", "waistcoat"):
        long = shape == "kurta"
        bottom = 700 if long else 640
        if shape == "waistcoat":
            return [
                (220, 150),
                (262, 130),
                (300, 220),
                (338, 130),
                (380, 150),
                (404, 260),
                (404, bottom),
                (196, bottom),
                (196, 260),
            ]
        sleeve = 292 if shape != "tee" else 262
        return [
            (196, 150),
            (262, 118),
            (300, 150),
            (338, 118),
            (404, 150),
            (492, 236),
            (446, sleeve),
            (404, 252),
            (404, bottom),
            (196, bottom),
            (196, 252),
            (154, sleeve),
            (108, 236),
        ]
    if shape == "trousers":
        return [(206, 110), (394, 110), (418, 700), (326, 700), (300, 300), (274, 700), (182, 700)]
    if shape == "shorts":
        return [(206, 200), (394, 200), (420, 470), (318, 470), (300, 360), (282, 470), (180, 470)]
    if shape == "dress":
        return [
            (240, 110),
            (360, 110),
            (390, 220),
            (360, 330),
            (470, 700),
            (130, 700),
            (240, 330),
            (210, 220),
        ]
    raise ValueError(f"unknown shape {shape}")


def draw_product(product: SampleProduct) -> bytes:
    """A flat-lay illustration of the product with a soft drop shadow."""
    image = Image.new("RGB", (W, H), product.background)
    points = _outline(product.shape)

    shadow = Image.new("L", (W, H), 0)
    ImageDraw.Draw(shadow).polygon([(x, y + 18) for x, y in points], fill=70)
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    image.paste(_darker(product.background, 0.8), (0, 0), shadow)

    draw = ImageDraw.Draw(image)
    line = _darker(product.fill)
    draw.polygon(points, fill=product.fill, outline=line, width=3)

    if product.shape in ("shirt", "kurta", "jacket"):
        draw.line([(300, 160), (300, points[8][1] - 10)], fill=line, width=2)
    if product.shape in ("shirt", "kurta"):
        draw.polygon(
            [(262, 118), (282, 168), (300, 150), (318, 168), (338, 118)],
            fill=product.fill,
            outline=line,
        )
    if product.shape == "kurta":
        for y in range(170, 330, 22):
            draw.ellipse((292, y, 300, y + 8), fill=(180, 113, 63))
    if product.shape == "hoodie":
        draw.arc((244, 70, 356, 200), 180, 360, fill=line, width=4)
        draw.polygon([(232, 440), (368, 440), (384, 540), (216, 540)], outline=line, width=3)
        draw.line([(286, 178), (282, 270)], fill=(246, 244, 240), width=3)
        draw.line([(314, 178), (318, 270)], fill=(246, 244, 240), width=3)
    if product.shape == "jacket":
        draw.polygon(
            [(262, 118), (300, 330), (240, 230)], fill=_darker(product.fill, 0.9), outline=line
        )
        draw.polygon(
            [(338, 118), (300, 330), (360, 230)], fill=_darker(product.fill, 0.9), outline=line
        )
        for y in (370, 450, 530):
            draw.ellipse((293, y, 307, y + 14), fill=(201, 162, 39))
    if product.shape in ("trousers", "shorts"):
        top = points[0][1]
        draw.rectangle((points[0][0], top, points[1][0], top + 32), outline=line, width=3)
        draw.line([(300, top + 32), (300, top + 150)], fill=line, width=2)
    if product.shape == "dress":
        draw.line([(240, 330), (360, 330)], fill=line, width=3)

    buffer = io.BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    return buffer.getvalue()


async def seed_sample_catalog(db: AsyncSession, storage: StorageService) -> int:
    """Returns the number of products created (0 if a catalogue already exists)."""
    repo = CatalogRepository(db)
    if await repo.count_stores() > 0:
        logger.info("catalog seed skipped: stores already exist")
        return 0

    created = 0
    for sample in SAMPLE_STORES:
        store = await repo.add_store(
            slug=sample.slug,
            name=sample.name,
            tagline=sample.tagline,
            accent_color=sample.accent_color,
        )
        for product in sample.products:
            image_url = storage.save(draw_product(product), "png")
            await repo.add_product(
                store_id=store.id,
                title=product.title,
                category=product.category,
                price_cents=product.price_cents,
                currency="USD",
                image_url=image_url,
                product_url=None,
            )
            created += 1
    await repo.commit()
    logger.info("catalog seeded: %d stores, %d products", len(SAMPLE_STORES), created)
    return created
