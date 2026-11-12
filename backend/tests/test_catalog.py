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


@pytest.mark.usefixtures("catalog")
async def test_audience_filter_includes_unisex_pieces(client: AsyncClient) -> None:
    men = (await client.get("/api/v1/products", params={"audience": "men"})).json()
    women = (await client.get("/api/v1/products", params={"audience": "women"})).json()

    assert {p["audience"] for p in men} == {"men", "unisex"}
    assert {p["audience"] for p in women} == {"women", "unisex"}
    titles = {p["title"] for p in women}
    assert "Plum wrap dress" in titles and "White oxford shirt" not in titles


@pytest.mark.usefixtures("catalog")
async def test_occasion_filter_matches_one_tag(client: AsyncClient) -> None:
    wedding = (await client.get("/api/v1/products", params={"occasion": "wedding"})).json()
    dresses_for_women = (
        await client.get("/api/v1/products", params={"occasion": "dresses", "audience": "women"})
    ).json()

    assert wedding and all("wedding" in p["occasions"] for p in wedding)
    assert {p["category"] for p in dresses_for_women} == {"Dresses"}


async def test_filters_only_take_known_values(client: AsyncClient) -> None:
    assert (await client.get("/api/v1/products", params={"audience": "kids"})).status_code == 422
    bad = await client.get("/api/v1/products", params={"occasion": "%"})
    assert bad.status_code == 422


async def test_a_catalogue_seeded_before_tags_is_tagged_on_the_next_start() -> None:
    from sqlalchemy import update

    from app.models.catalog import Product

    async with db_session.AsyncSessionLocal() as db:
        await seed_sample_catalog(db, get_storage_service())
        await db.execute(update(Product).values(audience="unisex", occasions=""))
        await db.commit()
        await seed_sample_catalog(db, get_storage_service())  # the next start

    async with db_session.AsyncSessionLocal() as db:
        from sqlalchemy import select

        dress = (
            await db.execute(select(Product).where(Product.title == "Plum wrap dress"))
        ).scalar_one()
        assert dress.audience == "women"
        assert dress.occasion_list == ["dresses", "office"]


async def test_the_old_sample_store_is_updated_for_the_us_on_the_next_start() -> None:
    """A catalogue seeded with the Pakistan-market store (before handoff v2.1
    change 8) gets the US store and products on the next start, in place."""
    from sqlalchemy import select, update

    from app.models.catalog import Product, Store

    async with db_session.AsyncSessionLocal() as db:
        await seed_sample_catalog(db, get_storage_service())
        # Roll the first store back to how it was first seeded.
        store = (await db.execute(select(Store).where(Store.slug == "aster-and-co"))).scalar_one()
        store.slug, store.name = "saffron-atelier", "Saffron Atelier"
        # As first seeded: no tags on any of the store's products.
        await db.execute(
            update(Product)
            .where(Product.store_id == store.id)
            .values(audience="unisex", occasions="")
        )
        for new_title, old_title in [
            ("Ivory linen shirt", "Ivory linen kurta"),
            ("Gold satin blazer", "Saffron embroidered kurta"),
            ("Emerald satin gown", "Emerald silk kurta"),
        ]:
            await db.execute(
                update(Product)
                .where(Product.title == new_title)
                .values(title=old_title, category="Shirts", audience="men", occasions=",wedding,")
            )
        await db.commit()
        old_image = (
            await db.execute(select(Product.image_url).where(Product.title == "Emerald silk kurta"))
        ).scalar_one()

        await seed_sample_catalog(db, get_storage_service())  # the next start

    async with db_session.AsyncSessionLocal() as db:
        store = (await db.execute(select(Store).where(Store.id == store.id))).scalar_one()
        assert (store.slug, store.name) == ("aster-and-co", "Aster & Co")
        gown = (
            await db.execute(select(Product).where(Product.title == "Emerald satin gown"))
        ).scalar_one()
        assert (gown.category, gown.audience) == ("Dresses", "women")
        assert gown.occasion_list == ["dresses", "wedding"]
        assert gown.image_url != old_image
        blazer = (
            await db.execute(select(Product).where(Product.title == "Gold satin blazer"))
        ).scalar_one()
        assert (blazer.category, blazer.occasion_list) == ("Jackets", ["office", "wedding"])
        shirt = (
            await db.execute(select(Product).where(Product.title == "Ivory linen shirt"))
        ).scalar_one()
        assert shirt.occasion_list == ["casual", "office"]
        # The store's unchanged products get their tags too.
        rose = (
            await db.execute(select(Product).where(Product.title == "Rose festive dress"))
        ).scalar_one()
        assert (rose.audience, rose.occasion_list) == ("women", ["dresses", "wedding"])
        kurtas = await db.execute(select(Product).where(Product.title.contains("kurta")))
        assert kurtas.first() is None


async def test_the_update_leaves_a_database_with_both_stores_alone() -> None:
    from sqlalchemy import select

    from app.models.catalog import Store

    async with db_session.AsyncSessionLocal() as db:
        await seed_sample_catalog(db, get_storage_service())
        db.add(Store(slug="saffron-atelier", name="Old", tagline="", accent_color="#000000"))
        await db.commit()

        await seed_sample_catalog(db, get_storage_service())  # must not fail

    async with db_session.AsyncSessionLocal() as db:
        slugs = set((await db.execute(select(Store.slug))).scalars())
        assert {"saffron-atelier", "aster-and-co"} <= slugs
