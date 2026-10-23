"""POST /api/v1/garments/from-link, with a fake fetcher: no network in tests
(test_safe_fetch.py covers the real fetcher's address checks)."""

import io
import json

import pytest
from httpx import AsyncClient
from PIL import Image

from app.main import app
from app.models.user import Plan
from app.services import link_import, plans
from app.services.attempt_limiter import SlidingWindowLimiter
from app.services.plans import AllowancePeriod, PlanAllowance
from app.services.safe_fetch import BlockedUrlError, FetchedResource, FetchError, get_page_fetcher

PRODUCT_URL = "https://shop.example.pk/products/linen-kurta"
IMAGE_URL = "https://cdn.example.pk/linen-kurta.webp"


def _image(fmt: str) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (40, 60), color=(180, 90, 40)).save(buffer, format=fmt)
    return buffer.getvalue()


def _product_html(name: str = "Linen Kurta", image: str = IMAGE_URL) -> bytes:
    data = {"@type": "Product", "name": name, "image": image}
    return (
        '<html><head><meta property="og:site_name" content="Example Store">'
        f'<script type="application/ld+json">{json.dumps(data)}</script></head></html>'
    ).encode()


class FakeFetcher:
    def __init__(self, responses: dict[str, FetchedResource | Exception]) -> None:
        self.responses = responses
        self.requested: list[str] = []

    async def fetch(
        self, url: str, *, max_bytes: int, accept: str, truncate: bool = False
    ) -> FetchedResource:
        self.requested.append(url)
        response = self.responses[url]
        if isinstance(response, Exception):
            raise response
        return response


def _store(page: bytes = b"", image: bytes | None = None) -> dict[str, FetchedResource | Exception]:
    return {
        PRODUCT_URL: FetchedResource(PRODUCT_URL, "text/html", page or _product_html()),
        IMAGE_URL: FetchedResource(IMAGE_URL, "image/webp", image or _image("WEBP")),
    }


@pytest.fixture(autouse=True)
def _fresh_attempt_limits():
    link_import.reset_attempt_limits()
    yield
    link_import.reset_attempt_limits()


@pytest.fixture
def use_fetcher():
    def install(fetcher: FakeFetcher) -> FakeFetcher:
        app.dependency_overrides[get_page_fetcher] = lambda: fetcher
        return fetcher

    yield install
    app.dependency_overrides.pop(get_page_fetcher, None)


async def _import(client: AsyncClient, url: str = PRODUCT_URL, device_id: str | None = None):
    headers = {"X-Device-Id": device_id} if device_id else {}
    return await client.post("/api/v1/garments/from-link", json={"url": url}, headers=headers)


async def test_imports_a_product_as_a_private_wardrobe_item(client: AsyncClient, use_fetcher):
    use_fetcher(FakeFetcher(_store()))

    response = await _import(client)

    assert response.status_code == 201, response.text
    garment = response.json()
    assert garment["title"] == "Linen Kurta"
    assert garment["category"] == "Shirts"
    assert garment["source_url"] == PRODUCT_URL
    assert garment["source_store"] == "Example Store"
    assert garment["image_url"].startswith("/uploads/")
    # WebP was converted to something the rest of the app understands.
    stored = await client.get(garment["image_url"])
    assert Image.open(io.BytesIO(stored.content)).format in ("JPEG", "PNG")

    device_id = response.headers["x-device-id"]
    listed = await client.get("/api/v1/garments", headers={"X-Device-Id": device_id})
    assert [g["source_url"] for g in listed.json()] == [PRODUCT_URL]
    # Another guest can't see it.
    assert (await client.get("/api/v1/garments")).json() == []


async def test_uploaded_garments_have_no_source_url(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/garments",
        files={"image": ("g.jpg", _image("JPEG"), "image/jpeg")},
        data={"title": "Mine", "category": "Shirts"},
    )
    assert response.json()["source_url"] is None
    assert response.json()["source_store"] is None


@pytest.mark.parametrize(
    ("responses", "status", "code"),
    [
        (
            {PRODUCT_URL: FetchedResource(PRODUCT_URL, "text/html", b"<html><head></head></html>")},
            422,
            "not_a_product_page",
        ),
        (
            {
                PRODUCT_URL: FetchedResource(
                    PRODUCT_URL, "text/html", _product_html(image="data:image/png;base64,AA")
                )
            },
            422,
            "no_product_image",
        ),
        (
            {
                PRODUCT_URL: FetchedResource(PRODUCT_URL, "text/html", _product_html()),
                IMAGE_URL: FetchedResource(IMAGE_URL, "image/jpeg", b"not really an image"),
            },
            422,
            "no_product_image",
        ),
        (
            {PRODUCT_URL: FetchedResource(PRODUCT_URL, "application/pdf", b"%PDF")},
            422,
            "no_product_image",
        ),
        ({PRODUCT_URL: FetchError("The site answered 403")}, 502, "store_unreachable"),
        ({PRODUCT_URL: BlockedUrlError("private")}, 400, "blocked_link"),
    ],
)
async def test_failures_have_codes_the_app_can_explain(
    client: AsyncClient, use_fetcher, responses, status: int, code: str
) -> None:
    use_fetcher(FakeFetcher(responses))
    response = await _import(client)
    assert response.status_code == status
    assert response.json()["detail"]["code"] == code


@pytest.mark.parametrize("url", ["hello", "ftp://shop.example.pk/x", "https://"])
async def test_text_that_isnt_a_web_link_is_refused_without_fetching(
    client: AsyncClient, use_fetcher, url: str
) -> None:
    fetcher = use_fetcher(FakeFetcher({}))
    response = await _import(client, url)
    assert response.status_code == 422
    assert fetcher.requested == []


async def test_daily_limit_counts_failed_attempts_too(
    client: AsyncClient, use_fetcher, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(link_import, "_per_user_attempts", SlidingWindowLimiter(2, 3600))
    fetcher = use_fetcher(FakeFetcher({**_store(), "https://shop.example.pk/": FetchError("x")}))

    # The app already has a device id by the time it imports anything.
    device_id = (await client.get("/api/v1/usage")).headers["x-device-id"]
    failed = await _import(client, "https://shop.example.pk/", device_id=device_id)
    assert failed.status_code == 502
    assert (await _import(client, device_id=device_id)).status_code == 201
    third = await _import(client, device_id=device_id)

    assert third.status_code == 429
    assert third.json()["detail"]["code"] == "too_many_imports"
    assert (
        len(fetcher.requested) == 3
    )  # page + photo, then a failed page; the refusal fetched nothing
    # Another guest still has their own allowance.
    assert (await _import(client)).status_code == 201


async def test_overall_hourly_cap(
    client: AsyncClient, use_fetcher, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(link_import, "_all_attempts", SlidingWindowLimiter(1, 3600))
    use_fetcher(FakeFetcher(_store()))

    assert (await _import(client)).status_code == 201
    assert (await _import(client)).status_code == 429  # a different guest


async def test_page_charset_is_respected(client: AsyncClient, use_fetcher) -> None:
    page = _product_html(name="Café Blouse").decode().encode("windows-1252")
    use_fetcher(
        FakeFetcher(
            {
                PRODUCT_URL: FetchedResource(PRODUCT_URL, "text/html", page, "windows-1252"),
                IMAGE_URL: FetchedResource(IMAGE_URL, "image/jpeg", _image("JPEG")),
            }
        )
    )
    response = await _import(client)
    assert response.json()["title"] == "Café Blouse"


async def test_no_try_ons_left_means_no_fetch(
    client: AsyncClient, use_fetcher, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setitem(
        plans.PLAN_ALLOWANCES, Plan.FREE, PlanAllowance(limit=0, period=AllowancePeriod.LIFETIME)
    )
    fetcher = use_fetcher(FakeFetcher(_store()))

    response = await _import(client)

    assert response.status_code == 402
    assert fetcher.requested == []


async def test_imported_item_can_be_tried_on(client: AsyncClient, use_fetcher) -> None:
    use_fetcher(FakeFetcher(_store()))
    imported = await _import(client)
    device_id = imported.headers["x-device-id"]
    headers = {"X-Device-Id": device_id}
    await client.post(
        "/api/v1/user-photos",
        files={"image": ("me.jpg", _image("JPEG"), "image/jpeg")},
        headers=headers,
    )

    job = await client.post(
        "/api/v1/inference-jobs", json={"garment_id": imported.json()["id"]}, headers=headers
    )

    assert job.status_code == 201, job.text
    assert job.json()["garment_id"] == imported.json()["id"]
