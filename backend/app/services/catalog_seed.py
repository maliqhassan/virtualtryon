"""Creates the sample store catalogue: three fictional stores whose products
are real stock photos of people wearing them (Pexels, see
app/catalog_photos/CREDITS.md), so the Shop tab has something real to
browse and the try-on has real clothing photos to work from, before any
actual store is connected. Run with `python -m app.seed_catalog` (start.sh
does, on every start).

Idempotent. With stores already there it creates nothing; it only brings an
older sample catalogue up to date, in place: the Pakistan-market store
renamed for the US (handoff v2.1 change 8), every earlier product title
mapped to its current product, drawn images swapped for the photos, and
audience/occasion tags set. Old image files are left in storage rather than
risk deleting one something still uses.

The store names are invented. The app labels them as sample stores.
"""

import logging
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.catalog_repository import CatalogRepository
from app.models.catalog import Product, occasions_column
from app.services.storage import StorageService

logger = logging.getLogger(__name__)

PHOTOS_DIR = Path(__file__).resolve().parent.parent / "catalog_photos"


@dataclass(frozen=True)
class SampleProduct:
    title: str
    category: str
    price_cents: int
    # File name in app/catalog_photos, without ".jpg".
    photo: str
    # For the Try-On studio's Men/Women toggle and occasion chips.
    audience: str
    occasions: tuple[str, ...]


@dataclass(frozen=True)
class SampleStore:
    slug: str
    name: str
    tagline: str
    accent_color: str
    products: tuple[SampleProduct, ...]


P = SampleProduct

SAMPLE_STORES: tuple[SampleStore, ...] = (
    SampleStore(
        slug="aster-and-co",
        name="Aster & Co",
        tagline="Occasion wear for weddings, date nights and every day",
        accent_color="#B4713F",
        products=(
            P(
                "Ivory linen shirt",
                "Shirts",
                4900,
                "ivory-linen-shirt",
                "men",
                ("casual", "office"),
            ),
            P(
                "Grey tailored suit",
                "Jackets",
                12900,
                "grey-tailored-suit",
                "women",
                ("office", "wedding"),
            ),
            P("Red satin gown", "Dresses", 8900, "red-satin-gown", "women", ("dresses", "wedding")),
            P(
                "Charcoal suit jacket",
                "Jackets",
                11900,
                "charcoal-suit-jacket",
                "men",
                ("office", "wedding"),
            ),
            P(
                "Burgundy velvet dress",
                "Dresses",
                7900,
                "burgundy-velvet-dress",
                "women",
                ("dresses", "wedding"),
            ),
            P("Pink wide trousers", "Pants", 5400, "pink-wide-trousers", "women", ("office",)),
        ),
    ),
    SampleStore(
        slug="northline-basics",
        name="Northline Basics",
        tagline="Everyday essentials, done simply",
        accent_color="#4A5578",
        products=(
            P("White oxford shirt", "Shirts", 3900, "white-oxford-shirt", "men", ("office",)),
            P("Navy crew tee", "T-Shirts", 1900, "navy-crew-tee", "unisex", ("casual",)),
            P("White crew tee", "T-Shirts", 1900, "white-crew-tee", "unisex", ("casual",)),
            P(
                "Sage crew sweater",
                "Hoodies",
                4400,
                "sage-crew-sweater",
                "men",
                ("casual", "office"),
            ),
            P("Black denim jacket", "Jackets", 6900, "black-denim-jacket", "unisex", ("casual",)),
            P("Navy shorts", "Shorts", 2900, "navy-shorts", "unisex", ("casual",)),
        ),
    ),
    SampleStore(
        slug="ember-and-thread",
        name="Ember & Thread",
        tagline="Warm colours and soft layers",
        accent_color="#8E3324",
        products=(
            P("Cream hoodie", "Hoodies", 4900, "cream-hoodie", "unisex", ("casual",)),
            P("Mint hoodie", "Hoodies", 4900, "mint-hoodie", "unisex", ("casual",)),
            P("Lavender hoodie", "Hoodies", 4900, "lavender-hoodie", "women", ("casual",)),
            P("Yellow knit sweater", "Hoodies", 4400, "yellow-knit-sweater", "women", ("casual",)),
            P(
                "Black wide trousers",
                "Pants",
                4600,
                "black-wide-trousers",
                "women",
                ("casual", "office"),
            ),
            P(
                "Striped wrap dress",
                "Dresses",
                5900,
                "striped-wrap-dress",
                "women",
                ("dresses", "office"),
            ),
        ),
    ),
)

# Titles earlier versions of the catalogue used, and the product each one is
# now. Titles not listed (and still current) map to themselves.
_EARLIER_TITLES = {
    # The Pakistan-market store's first products.
    "Ivory linen kurta": "Ivory linen shirt",
    "Saffron embroidered kurta": "Grey tailored suit",
    "Emerald silk kurta": "Red satin gown",
    # The drawn catalogue.
    "Gold satin blazer": "Grey tailored suit",
    "Emerald satin gown": "Red satin gown",
    "Charcoal waistcoat": "Charcoal suit jacket",
    "Rose festive dress": "Burgundy velvet dress",
    "Cream straight trousers": "Pink wide trousers",
    "Heather grey tee": "White crew tee",
    "Olive chinos": "Sage crew sweater",
    "Indigo denim jacket": "Black denim jacket",
    "Stone shorts": "Navy shorts",
    "Clay hoodie": "Cream hoodie",
    "Forest hoodie": "Mint hoodie",
    "Rust overshirt": "Lavender hoodie",
    "Mustard knit tee": "Yellow knit sweater",
    "Plum wrap dress": "Striped wrap dress",
}
_OLD_STORE_SLUG = "saffron-atelier"
_NEW_STORE_SLUG = "aster-and-co"


def photo_bytes(product: SampleProduct) -> bytes:
    return (PHOTOS_DIR / f"{product.photo}.jpg").read_bytes()


async def _rename_old_store(repo: CatalogRepository) -> None:
    store = await repo.get_store_by_slug(_OLD_STORE_SLUG)
    if store is None:
        return
    if await repo.get_store_by_slug(_NEW_STORE_SLUG) is not None:
        # Both exist (a partly reseeded database): leave them, rather than
        # fail every start on the unique slug.
        logger.warning("catalog seed: %s and %s both exist", _OLD_STORE_SLUG, _NEW_STORE_SLUG)
        return
    current = next(s for s in SAMPLE_STORES if s.slug == _NEW_STORE_SLUG)
    store.slug, store.name, store.tagline = current.slug, current.name, current.tagline
    # Sessions don't autoflush: write the new slug before stores are looked
    # up by it below.
    await repo.flush()


def _bring_up_to_date(product: Product, sample: SampleProduct, storage: StorageService) -> bool:
    """Sets the product to `sample`; True if anything changed. A new image is
    stored only when the title changed or the image is still a drawing."""
    occasions = occasions_column(sample.occasions)
    renamed = product.title != sample.title
    drawn = product.image_url.endswith(".png")
    changed = (
        renamed
        or drawn
        or (product.category, product.price_cents, product.audience, product.occasions)
        != (sample.category, sample.price_cents, sample.audience, occasions)
    )
    if not changed:
        return False
    if renamed or drawn:
        product.image_url = storage.save(photo_bytes(sample), "jpg")
    product.title = sample.title
    product.category = sample.category
    product.price_cents = sample.price_cents
    product.audience = sample.audience
    product.occasions = occasions
    return True


async def _update_existing(repo: CatalogRepository, storage: StorageService) -> int:
    """Brings the sample stores' products up to date; returns how many changed."""
    await _rename_old_store(repo)
    updated = 0
    for sample_store in SAMPLE_STORES:
        store = await repo.get_store_by_slug(sample_store.slug)
        if store is None:
            continue
        samples = {sample.title: sample for sample in sample_store.products}
        for product, _store_name in await repo.list_products(store_id=store.id):
            current_title = _EARLIER_TITLES.get(product.title, product.title)
            sample = samples.get(current_title)
            if sample is not None and _bring_up_to_date(product, sample, storage):
                updated += 1
    return updated


async def seed_sample_catalog(db: AsyncSession, storage: StorageService) -> int:
    """Returns the number of products created (0 if a catalogue already
    exists, which is then only brought up to date; see the module docstring)."""
    repo = CatalogRepository(db)
    if await repo.count_stores() > 0:
        updated = await _update_existing(repo, storage)
        await repo.commit()
        logger.info("catalog seed skipped: stores already exist (%d updated)", updated)
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
            await repo.add_product(
                store_id=store.id,
                title=product.title,
                category=product.category,
                price_cents=product.price_cents,
                currency="USD",
                image_url=storage.save(photo_bytes(product), "jpg"),
                product_url=None,
                audience=product.audience,
                occasions=occasions_column(product.occasions),
            )
            created += 1
    await repo.commit()
    logger.info("catalog seeded: %d stores, %d products", len(SAMPLE_STORES), created)
    return created
