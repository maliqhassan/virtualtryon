import json

import pytest

from app.services.product_page import (
    NoProductImageError,
    NotAProductPageError,
    guess_category,
    read_product_page,
)

PAGE_URL = "https://shop.example.pk/products/linen-shirt"


def _page(head: str = "", json_ld: object | None = None) -> str:
    script = f'<script type="application/ld+json">{json.dumps(json_ld)}</script>' if json_ld else ""
    return f"<html><head><title>Shop page</title>{head}{script}</head><body></body></html>"


def test_reads_a_shopify_style_product_group() -> None:
    html = _page(
        head=(
            '<meta property="og:type" content="product">'
            '<meta property="og:site_name" content="Example Store">'
        ),
        json_ld={
            "@context": "https://schema.org",
            "@type": "ProductGroup",
            "name": "Linen Shirt &amp; Co",
            "image": ["//cdn.example.pk/linen.jpg", "//cdn.example.pk/linen-2.jpg"],
            "hasVariant": [{"@type": "Product", "name": "Linen Shirt &amp; Co"}],
        },
    )
    product = read_product_page(html, PAGE_URL)
    assert product.title == "Linen Shirt & Co"
    assert product.image_url == "https://cdn.example.pk/linen.jpg"
    assert product.store_name == "Example Store"


def test_product_inside_graph_with_image_object() -> None:
    html = _page(
        json_ld={
            "@graph": [
                {"@type": "WebPage", "name": "ignored"},
                {"@type": ["Product"], "name": "Kurta", "image": {"url": "/img/kurta.png"}},
            ]
        }
    )
    product = read_product_page(html, PAGE_URL)
    assert product.title == "Kurta"
    assert product.image_url == "https://shop.example.pk/img/kurta.png"
    assert product.store_name == "shop.example.pk"


def test_og_tags_alone_are_enough_for_a_product_page() -> None:
    html = _page(
        head=(
            '<meta property="og:type" content="og:product">'
            '<meta property="og:title" content="Denim Jacket">'
            '<meta property="og:image" content="https://cdn.example.pk/denim.webp">'
        )
    )
    product = read_product_page(html, PAGE_URL)
    assert product.title == "Denim Jacket"
    assert product.image_url == "https://cdn.example.pk/denim.webp"


def test_broken_json_ld_is_skipped() -> None:
    html = (
        '<html><head><script type="application/ld+json">{not json</script>'
        '<script type="application/ld+json">'
        '{"@type": "Product", "name": "Tee", "image": "https://cdn.example.pk/t.jpg"}'
        "</script></head></html>"
    )
    assert read_product_page(html, PAGE_URL).title == "Tee"


@pytest.mark.parametrize(
    "html",
    [
        # A collection page: no product data, og:type website.
        _page(head='<meta property="og:type" content="website">'),
        # A page with no tags at all.
        "<html><head><title>Home</title></head></html>",
        # An explicit list of products.
        _page(json_ld={"@type": "ItemList", "itemListElement": []}),
        # Several different products on one page.
        _page(
            json_ld=[
                {"@type": "Product", "name": "Shirt A", "image": "https://x.pk/a.jpg"},
                {"@type": "Product", "name": "Shirt B", "image": "https://x.pk/b.jpg"},
            ]
        ),
    ],
)
def test_catalogue_pages_are_refused(html: str) -> None:
    with pytest.raises(NotAProductPageError):
        read_product_page(html, PAGE_URL)


def test_product_without_a_photo_is_refused() -> None:
    html = _page(json_ld={"@type": "Product", "name": "Mystery item"})
    with pytest.raises(NoProductImageError):
        read_product_page(html, PAGE_URL)


def test_non_web_image_link_is_refused() -> None:
    html = _page(json_ld={"@type": "Product", "name": "Odd", "image": "data:image/png;base64,AA"})
    with pytest.raises(NoProductImageError):
        read_product_page(html, PAGE_URL)


@pytest.mark.parametrize(
    ("title", "category"),
    [
        ("Graphic T-Shirt", "T-Shirts"),
        ("Oversized Hoodie", "Hoodies"),
        ("Wool Blazer", "Jackets"),
        ("Printed Lawn Kurta", "Shirts"),
        ("Slim Fit Jeans", "Pants"),
        ("Cargo Shorts", "Shorts"),
        ("Embroidered Maxi Dress", "Dresses"),
        ("Leather Khussa", "Shoes"),
        ("Canvas Tote Bag", "Bags"),
        ("Chiffon Dupatta", "Accessories"),
        ("Gift Card", "Other"),
    ],
)
def test_guess_category(title: str, category: str) -> None:
    assert guess_category(title) == category
