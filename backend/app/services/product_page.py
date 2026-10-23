"""Reads what a store's page says about itself: the hidden product info shops
publish for Google and link previews (JSON-LD `Product` data and `og:`
tags). Pure functions, no network.

A page counts as a product page only when it describes exactly one product.
Collection, category and home pages (several products, an `ItemList`, or
nothing product-like) are refused, because the app tries on single items
and never shows a store's catalogue.
"""

import html
import json
import re
from collections.abc import Iterator
from dataclasses import dataclass
from html.parser import HTMLParser
from typing import Any
from urllib.parse import urljoin, urlsplit

from app.models.garment import SOURCE_STORE_MAX_LENGTH

MAX_TITLE_LENGTH = 200

_PRODUCT_TYPES = {"product", "productgroup"}  # Shopify describes variants as a ProductGroup
_LIST_TYPES = {"itemlist", "collectionpage", "offercatalog", "searchresultspage"}
_OG_PRODUCT_TYPES = {"product", "og:product", "product.item", "product.group"}


class NotAProductPageError(ValueError):
    """The page isn't about one product (a collection, category or home page)."""


class NoProductImageError(ValueError):
    """The page is about a product but doesn't name a usable photo of it."""


@dataclass(frozen=True)
class ProductPage:
    title: str
    image_url: str
    store_name: str


class _PageInfoParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.meta: dict[str, str] = {}
        self.json_ld: list[str] = []
        self.title = ""
        self._json_ld_parts: list[str] | None = None
        self._title_parts: list[str] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {name.lower(): (value or "") for name, value in attrs}
        if tag == "meta":
            key = (values.get("property") or values.get("name") or "").strip().lower()
            if key and "content" in values:
                self.meta.setdefault(key, values["content"].strip())
        elif tag == "script" and values.get("type", "").strip().lower() == "application/ld+json":
            self._json_ld_parts = []
        elif tag == "title" and not self.title:
            self._title_parts = []

    def handle_endtag(self, tag: str) -> None:
        if tag == "script" and self._json_ld_parts is not None:
            self.json_ld.append("".join(self._json_ld_parts))
            self._json_ld_parts = None
        elif tag == "title" and self._title_parts is not None:
            self.title = " ".join("".join(self._title_parts).split())
            self._title_parts = None

    def handle_data(self, data: str) -> None:
        if self._json_ld_parts is not None:
            self._json_ld_parts.append(data)
        elif self._title_parts is not None:
            self._title_parts.append(data)


def _nodes(value: Any) -> Iterator[dict[str, Any]]:
    """Top-level JSON-LD objects, plus those inside @graph and mainEntity."""
    if isinstance(value, list):
        for item in value:
            yield from _nodes(item)
    elif isinstance(value, dict):
        yield value
        yield from _nodes(value.get("@graph"))
        yield from _nodes(value.get("mainEntity"))


def _types(node: dict[str, Any]) -> set[str]:
    raw = node.get("@type")
    values = raw if isinstance(raw, list) else [raw]
    return {v.strip().lower() for v in values if isinstance(v, str)}


def _first_image(value: Any) -> str | None:
    if isinstance(value, str):
        return value.strip() or None
    if isinstance(value, list):
        for item in value:
            if found := _first_image(item):
                return found
    if isinstance(value, dict):
        return _first_image(value.get("url") or value.get("contentUrl"))
    return None


def _clean(text: str) -> str:
    return " ".join(html.unescape(text).split())


def read_product_page(page_html: str, page_url: str) -> ProductPage:
    """Raises NotAProductPageError or NoProductImageError."""
    parser = _PageInfoParser()
    parser.feed(page_html)
    parser.close()

    nodes: list[dict[str, Any]] = []
    for blob in parser.json_ld:
        try:
            nodes.extend(_nodes(json.loads(blob)))
        except ValueError:
            continue  # one broken script shouldn't hide the others

    products = [n for n in nodes if _types(n) & _PRODUCT_TYPES]
    names = {_clean(str(p.get("name", ""))).lower() for p in products}
    if len(names) > 1:
        raise NotAProductPageError("This page lists several products")
    product = products[0] if products else None
    if product is None:
        is_list = any(_types(n) & _LIST_TYPES for n in nodes)
        og_type = parser.meta.get("og:type", "").lower()
        if is_list or og_type not in _OG_PRODUCT_TYPES:
            raise NotAProductPageError("This page isn't about a single product")

    image = (
        (_first_image(product.get("image")) if product else None)
        or parser.meta.get("og:image:secure_url")
        or parser.meta.get("og:image")
        or parser.meta.get("twitter:image")
    )
    image_url = urljoin(page_url, image) if image else ""
    if urlsplit(image_url).scheme not in ("http", "https"):
        raise NoProductImageError("No product photo found on this page")

    title = (
        (_clean(str(product.get("name", ""))) if product else "")
        or _clean(parser.meta.get("og:title", ""))
        or _clean(parser.meta.get("twitter:title", ""))
        or _clean(parser.title)
        or "Store item"
    )
    host = (urlsplit(page_url).hostname or "").removeprefix("www.")
    store_name = _clean(parser.meta.get("og:site_name", "")) or host
    return ProductPage(
        title=title[:MAX_TITLE_LENGTH],
        image_url=image_url,
        store_name=store_name[:SOURCE_STORE_MAX_LENGTH],
    )


# Checked in order; the first match wins. The names match the app's wardrobe
# categories (frontend/src/features/wardrobe/types.ts). It's only a label the
# user can change: the try-on itself works out the kind of clothing.
_CATEGORY_KEYWORDS: list[tuple[str, str]] = [
    ("T-Shirts", r"t-?shirts?|tees?|polos?"),
    ("Hoodies", r"hood(ie|y)s?|sweatshirts?|sweaters?|jumpers?|pullovers?|cardigans?"),
    ("Jackets", r"jackets?|coats?|blazers?|parkas?|gilets?|waistcoats?|puffers?"),
    ("Dresses", r"dress(es)?|gowns?|frocks?|abayas?|jumpsuits?|maxis?|kaftans?"),
    ("Shorts", r"shorts"),
    ("Pants", r"jeans|pants?|trousers?|chinos?|joggers?|leggings?|shalwars?|palazzos?|skirts?"),
    ("Shirts", r"shirts?|tops?|blouses?|tunics?|kurtas?|kurtis?"),
    ("Shoes", r"shoes?|sneakers?|trainers?|sandals?|heels?|boots?|loafers?|slippers?|khussas?"),
    ("Bags", r"bags?|totes?|clutch(es)?|backpacks?|purses?|wallets?"),
    ("Accessories", r"caps?|hats?|scarf|scarves|belts?|watch(es)?|sunglasses|dupattas?|shawls?"),
]


def guess_category(title: str) -> str:
    lowered = title.lower()
    for category, pattern in _CATEGORY_KEYWORDS:
        if re.search(rf"\b(?:{pattern})\b", lowered):
            return category
    return "Other"
