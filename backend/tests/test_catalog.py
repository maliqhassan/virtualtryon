import io
from uuid import UUID

import pytest
from httpx import AsyncClient
from PIL import Image

import app.db.session as db_session
from app.services.catalog_seed import SAMPLE_STORES, seed_sample_catalog
from app.services.storage import get_storage_service
from app.worker.worker_service import WorkerService


@pytest.fixture
async def catalog() -> None:
    async with db_session.AsyncSessionLocal() as db:
        await seed_sample_catalog(db, get_storage_service())


def _jpeg_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (64, 64), color=(30, 30, 30)).save(buf, format="JPEG")
    return buf.getvalue()


async def _first_store_and_product(client: AsyncClient) -> tuple[dict, dict]:
    stores = (await client.get("/api/v1/stores")).json()
    store = next(s for s in stores if s["slug"] == SAMPLE_STORES[0].slug)
    products = (await client.get(f"/api/v1/stores/{store['id']}/products")).json()
    return store, products[0]


async def _guest_with_photo(client: AsyncClient) -> dict:
    photo = await client.post(
        "/api/v1/user-photos", files={"image": ("me.jpg", _jpeg_bytes(), "image/jpeg")}
    )
    return {"X-Device-Id": photo.headers["x-device-id"]}


@pytest.mark.usefixtures("catalog")
async def test_lists_sample_stores_with_product_counts(client: AsyncClient) -> None:
    stores = (await client.get("/api/v1/stores")).json()

    slugs = {s["slug"]: s for s in stores}
    for sample in SAMPLE_STORES:
        assert slugs[sample.slug]["product_count"] == len(sample.products)


@pytest.mark.usefixtures("catalog")
async def test_store_products_and_category_filter(client: AsyncClient) -> None:
    store, product = await _first_store_and_product(client)

    filtered = (
        await client.get(f"/api/v1/stores/{store['id']}/products", params={"category": "Pants"})
    ).json()
    one = await client.get(f"/api/v1/products/{product['id']}")

    assert product["store_name"] == store["name"]
    assert all(p["category"] == "Pants" for p in filtered) and filtered
    assert one.status_code == 200
    assert get_storage_service().read(one.json()["image_url"])  # image really stored


async def test_unknown_store_and_product_return_404(client: AsyncClient) -> None:
    missing = "00000000-0000-0000-0000-000000000000"
    assert (await client.get(f"/api/v1/stores/{missing}/products")).status_code == 404
    assert (await client.get(f"/api/v1/products/{missing}")).status_code == 404


@pytest.mark.usefixtures("catalog")
async def test_seed_is_idempotent() -> None:
    async with db_session.AsyncSessionLocal() as db:
        assert await seed_sample_catalog(db, get_storage_service()) == 0


@pytest.mark.usefixtures("catalog")
async def test_try_on_a_store_product_end_to_end(client: AsyncClient, monkeypatch) -> None:
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "TRYON_PROVIDER", "demo")
    _store, product = await _first_store_and_product(client)
    headers = await _guest_with_photo(client)

    job = await client.post(
        "/api/v1/inference-jobs", json={"product_id": product["id"]}, headers=headers
    )
    assert job.status_code == 201
    assert job.json()["product_id"] == product["id"]
    assert job.json()["garment_id"] is None

    async with db_session.AsyncSessionLocal() as db:
        await WorkerService(db).process_single_job(UUID(job.json()["id"]))
    done = (await client.get(f"/api/v1/inference-jobs/{job.json()['id']}", headers=headers)).json()
    assert done["status"] == "completed"

    look = await client.post(
        "/api/v1/saved-looks/from-job", json={"job_id": done["id"]}, headers=headers
    )
    assert look.status_code == 201
    assert look.json()["title"] == product["title"]


async def test_try_on_needs_exactly_one_clothing_source(client: AsyncClient) -> None:
    headers = await _guest_with_photo(client)
    missing = "00000000-0000-0000-0000-000000000000"

    neither = await client.post("/api/v1/inference-jobs", json={}, headers=headers)
    both = await client.post(
        "/api/v1/inference-jobs",
        json={"garment_id": missing, "product_id": missing},
        headers=headers,
    )
    unknown_product = await client.post(
        "/api/v1/inference-jobs", json={"product_id": missing}, headers=headers
    )

    assert neither.status_code == 422
    assert both.status_code == 422
    assert unknown_product.status_code == 404


@pytest.mark.usefixtures("catalog")
async def test_search_matches_title_store_and_category(client: AsyncClient) -> None:
    by_title = (await client.get("/api/v1/products", params={"q": "hoodie"})).json()
    by_store = (await client.get("/api/v1/products", params={"q": "northline"})).json()
    by_category = (await client.get("/api/v1/products", params={"q": "dresses"})).json()
    wildcard = (await client.get("/api/v1/products", params={"q": "%"})).json()

    assert by_title and all("hoodie" in p["title"].lower() for p in by_title)
    assert by_store and all(p["store_name"] == "Northline Basics" for p in by_store)
    assert by_category and all(p["category"] == "Dresses" for p in by_category)
    assert wildcard == []  # "%" is searched as text, not as a wildcard
