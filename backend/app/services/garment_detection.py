"""Guesses a wardrobe photo's category (Shirts, Pants, Shoes…) so the app
can fill it in when a piece is added. The user can always change it.

The guess comes from an outside service (api4.ai's fashion model, through
RapidAPI), injected as a `GarmentDetector` so tests use a fake and an empty
FASHION_API_KEY turns detection off. Only garment photos are sent there,
never a user's body photos. Every call costs a paid credit, so the same
image is answered from memory, and calls are limited per user and overall.

A detection failure is never an error for the user: the category is simply
left for them to choose, as it was before.
"""

import hashlib
import logging
from dataclasses import dataclass
from typing import Protocol
from uuid import UUID

import httpx

from app.core.config import get_settings
from app.services.attempt_limiter import SlidingWindowLimiter
from app.services.image_validation import ImageUpload, validate_image

logger = logging.getLogger(__name__)

_API_URL = "https://fashion4.p.rapidapi.com/v2/results"
_API_HOST = "fashion4.p.rapidapi.com"
_TIMEOUT = httpx.Timeout(30.0, connect=10.0)

# Their labels → the app's categories (frontend GARMENT_CATEGORIES). The
# generic "clothing" box covers a whole outfit, so it isn't mapped.
_CATEGORY_BY_LABEL = {
    "top": "T-Shirts",
    "sweater": "Hoodies",
    "pants": "Pants",
    "shorts": "Shorts",
    "dress": "Dresses",
    "skirt": "Other",
    "outerwear": "Jackets",
    "footwear": "Shoes",
    "shoes": "Shoes",
    "bag": "Bags",
    "hat": "Accessories",
    "headwear": "Accessories",
    "glasses": "Accessories",
    "sunglasses": "Accessories",
    "tie": "Accessories",
    "belt": "Accessories",
    "gloves": "Accessories",
    "scarf": "Accessories",
    "watch": "Accessories",
    "jewelry": "Accessories",
    "socks": "Accessories",
}
_MIN_CONFIDENCE = 0.6
# A photo that shows a garment usually shows a bag, belt or scarf too; the
# garment is what's being added, so these only win when nothing else is seen.
_SMALL_ITEMS = {"Bags", "Accessories"}

DAILY_DETECTIONS_PER_USER = 5
_per_user_calls = SlidingWindowLimiter(DAILY_DETECTIONS_PER_USER, window_seconds=24 * 3600)
_all_calls = SlidingWindowLimiter(get_settings().FASHION_API_DAILY_LIMIT, window_seconds=24 * 3600)

# Answers by image hash, so re-picking the same photo costs nothing.
_MAX_REMEMBERED = 500
_remembered: dict[str, "CategoryGuess"] = {}


@dataclass(frozen=True)
class Label:
    name: str
    confidence: float


@dataclass(frozen=True)
class CategoryGuess:
    category: str | None
    confidence: float | None


NO_GUESS = CategoryGuess(category=None, confidence=None)


class GarmentDetector(Protocol):
    async def detect(self, image: ImageUpload) -> list[Label]:
        """Every item seen in the photo. Raises DetectionError on failure."""
        ...


class DetectionError(Exception):
    """The outside service couldn't be reached or gave no usable answer."""


class Api4aiFashionDetector:
    def __init__(self, api_key: str, transport: httpx.AsyncBaseTransport | None = None) -> None:
        self._api_key = api_key
        self._transport = transport

    async def detect(self, image: ImageUpload) -> list[Label]:
        files = {"image": (image.filename or "garment", image.content, image.content_type)}
        headers = {"x-rapidapi-key": self._api_key, "x-rapidapi-host": _API_HOST}
        try:
            async with httpx.AsyncClient(transport=self._transport, timeout=_TIMEOUT) as client:
                response = await client.post(_API_URL, files=files, headers=headers)
            response.raise_for_status()
            return _read_labels(response.json())
        except (
            httpx.HTTPError,
            ValueError,
            KeyError,
            TypeError,
            IndexError,
            AttributeError,
        ) as exc:
            raise DetectionError(str(exc)) from exc


def _read_labels(body: dict) -> list[Label]:
    """Their shape: results[0].entities[kind=objects].objects[].entities
    [kind=classes].classes, a {label: confidence} map per box."""
    result = body["results"][0]
    if result["status"]["code"] != "ok":
        raise DetectionError(result["status"].get("message", "not ok"))
    labels = []
    for entity in result["entities"]:
        if entity.get("kind") != "objects":
            continue
        for obj in entity["objects"]:
            for inner in obj["entities"]:
                if inner.get("kind") == "classes":
                    labels += [
                        Label(name, float(score)) for name, score in inner["classes"].items()
                    ]
    return labels


class NoDetector:
    """FASHION_API_KEY not set: nothing is sent anywhere."""

    async def detect(self, image: ImageUpload) -> list[Label]:
        return []


def get_garment_detector() -> GarmentDetector:
    api_key = get_settings().FASHION_API_KEY
    return Api4aiFashionDetector(api_key) if api_key else NoDetector()


def _best_guess(labels: list[Label]) -> CategoryGuess:
    mapped = [
        (label.confidence, _CATEGORY_BY_LABEL[label.name.lower()])
        for label in labels
        if label.name.lower() in _CATEGORY_BY_LABEL and label.confidence >= _MIN_CONFIDENCE
    ]
    if not mapped:
        return NO_GUESS
    garments = [guess for guess in mapped if guess[1] not in _SMALL_ITEMS]
    confidence, category = max(garments or mapped)
    return CategoryGuess(category=category, confidence=round(confidence, 2))


def reset_detection_state() -> None:
    """For tests."""
    _per_user_calls.reset()
    _all_calls.reset()
    _remembered.clear()


async def detect_category(
    *, user_id: UUID, image: ImageUpload, detector: GarmentDetector
) -> CategoryGuess:
    """Raises UnsupportedImageError for a file that isn't a JPEG or PNG."""
    validate_image(image)
    if isinstance(detector, NoDetector):
        return NO_GUESS

    key = hashlib.sha256(image.content).hexdigest()
    if key in _remembered:
        return _remembered[key]
    # Overall cap first, so a full server doesn't use up users' own tries.
    # No await between these, so parallel requests can't slip past them.
    if _all_calls.is_exhausted("all") or not _per_user_calls.try_acquire(str(user_id)):
        logger.info("Garment detection skipped: daily limit reached")
        return NO_GUESS
    _all_calls.try_acquire("all")

    try:
        labels = await detector.detect(image)
    except DetectionError as exc:
        logger.warning("Garment detection failed: %s", exc)
        return NO_GUESS

    guess = _best_guess(labels)
    if len(_remembered) >= _MAX_REMEMBERED:
        _remembered.clear()
    _remembered[key] = guess
    return guess
