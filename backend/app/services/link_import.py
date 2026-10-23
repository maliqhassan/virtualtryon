"""Turns a product link the user pasted (from any store, in their own
browser) into a private wardrobe item, ready to try on with the usual
try-on flow. No FastAPI import here, same layering rule as garments.py.

Steps: check the link → check the user has a try-on left (so we don't fetch
a store page for nothing) → attempt limits → fetch the page → read the
product → fetch its photo → store it as a JPEG or PNG garment that
remembers the link, for "View in store".

The photo is kept only in that user's wardrobe: never shown to anyone else,
removed when they delete the item or all their data.
"""

import asyncio
import codecs
import io
import logging
from urllib.parse import urlsplit

from PIL import Image, UnidentifiedImageError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.garment import GarmentResponse
from app.services.attempt_limiter import SlidingWindowLimiter
from app.services.garments import create_garment
from app.services.image_validation import MAX_UPLOAD_BYTES, ImageUpload
from app.services.product_page import NoProductImageError, guess_category, read_product_page
from app.services.safe_fetch import PageFetcher
from app.services.usage import UsageLimitReachedError, get_usage

logger = logging.getLogger(__name__)

MAX_URL_LENGTH = 2048
# Only this much of a page is read: product tags sit in the first part of a
# page, and some store pages are several MB of menus and scripts.
MAX_PAGE_BYTES = 3 * 1024 * 1024
# Users are still anonymous guests, so this endpoint must not become a free
# page fetcher. Every attempt counts, successful or not. 20 a day is far more
# than anyone trying clothes on needs; the overall cap also limits someone
# who keeps creating new guests.
DAILY_IMPORT_LIMIT = 20
HOURLY_IMPORT_LIMIT_ALL_USERS = 300
_per_user_attempts = SlidingWindowLimiter(DAILY_IMPORT_LIMIT, window_seconds=24 * 3600)
_all_attempts = SlidingWindowLimiter(HOURLY_IMPORT_LIMIT_ALL_USERS, window_seconds=3600)

_HTML_TYPES = {"text/html", "application/xhtml+xml"}
_PAGE_ACCEPT = "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1"
_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/*;q=0.8"


class InvalidLinkError(ValueError):
    """The text isn't a usable http(s) web address."""


class LinkImportLimitError(Exception):
    """Too many link imports: this user's daily limit, or the overall hourly cap."""


def reset_attempt_limits() -> None:
    """For tests."""
    _per_user_attempts.reset()
    _all_attempts.reset()


def _decode_page(content: bytes, charset: str | None) -> str:
    try:
        encoding = codecs.lookup(charset).name if charset else "utf-8"
    except LookupError:
        encoding = "utf-8"
    return content.decode(encoding, errors="replace")


def _to_storable_image(content: bytes) -> ImageUpload:
    """JPEG and PNG are stored as they are; anything else (WebP, AVIF, GIF…)
    is converted, because the rest of the app only handles those two."""
    try:
        with Image.open(io.BytesIO(content)) as probe:
            probe.verify()
        image = Image.open(io.BytesIO(content))
        image.load()
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as exc:
        raise NoProductImageError("The product photo couldn't be read") from exc

    if image.format == "JPEG":
        return ImageUpload(content=content, content_type="image/jpeg", filename=None)
    if image.format == "PNG":
        return ImageUpload(content=content, content_type="image/png", filename=None)

    buffer = io.BytesIO()
    if image.mode in ("RGBA", "LA", "PA") or "transparency" in image.info:
        image.convert("RGBA").save(buffer, format="PNG", optimize=True)
        return ImageUpload(content=buffer.getvalue(), content_type="image/png", filename=None)
    image.convert("RGB").save(buffer, format="JPEG", quality=90)
    return ImageUpload(content=buffer.getvalue(), content_type="image/jpeg", filename=None)


def _check_link(url: str) -> str:
    url = url.strip()
    try:
        parts = urlsplit(url)
    except ValueError as exc:
        raise InvalidLinkError("That doesn't look like a web link") from exc
    if len(url) > MAX_URL_LENGTH or parts.scheme not in ("http", "https") or not parts.hostname:
        raise InvalidLinkError("That doesn't look like a web link")
    return url


async def import_garment_from_link(
    db: AsyncSession, user: User, url: str, fetcher: PageFetcher
) -> GarmentResponse:
    """Raises InvalidLinkError, UsageLimitReachedError, LinkImportLimitError,
    NotAProductPageError, NoProductImageError, BlockedUrlError or FetchError."""
    url = _check_link(url)

    usage = await get_usage(db, user)
    if usage.remaining <= 0:
        raise UsageLimitReachedError(usage)

    # The overall cap is checked first so a refused user doesn't use it up.
    if not _all_attempts.try_acquire("all"):
        raise LinkImportLimitError("Too many store links right now")
    if not _per_user_attempts.try_acquire(str(user.id)):
        raise LinkImportLimitError(f"Limit of {DAILY_IMPORT_LIMIT} store links a day reached")

    page = await fetcher.fetch(url, max_bytes=MAX_PAGE_BYTES, accept=_PAGE_ACCEPT, truncate=True)
    if page.content_type not in _HTML_TYPES:
        raise NoProductImageError("That link isn't a web page")
    # Parsing a page of up to 3 MB takes a moment; keep it off the event loop.
    page_html = _decode_page(page.content, page.charset)
    product = await asyncio.to_thread(read_product_page, page_html, page.url)

    photo = await fetcher.fetch(product.image_url, max_bytes=MAX_UPLOAD_BYTES, accept=_IMAGE_ACCEPT)
    image = await asyncio.to_thread(_to_storable_image, photo.content)

    garment = await create_garment(
        db=db,
        user_id=user.id,
        title=product.title,
        category=guess_category(product.title),
        color=None,
        season=None,
        image=image,
        # Where the page really was after redirects, unless that's absurdly long.
        source_url=page.url if len(page.url) <= MAX_URL_LENGTH else url,
    )
    logger.info("garment imported from link: id=%s store=%s", garment.id, product.store_name)
    return garment
