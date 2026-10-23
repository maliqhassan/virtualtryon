"""Business logic for browsing the store catalogue. No FastAPI import here,
same layering rule as every other service."""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.catalog_repository import CatalogRepository
from app.models.catalog import Product
from app.schemas.catalog import ProductResponse, StoreResponse


class StoreNotFoundError(ValueError):
    pass


class ProductNotFoundError(ValueError):
    pass


def to_product_response(product: Product, store_name: str) -> ProductResponse:
    return ProductResponse(
        id=product.id,
        store_id=product.store_id,
        store_name=store_name,
        title=product.title,
        category=product.category,
        price_cents=product.price_cents,
        currency=product.currency,
        image_url=product.image_url,
        product_url=product.product_url,
    )


async def list_stores(db: AsyncSession) -> list[StoreResponse]:
    rows = await CatalogRepository(db).list_stores_with_counts()
    return [
        StoreResponse(
            id=store.id,
            slug=store.slug,
            name=store.name,
            tagline=store.tagline,
            accent_color=store.accent_color,
            product_count=count,
        )
        for store, count in rows
    ]


async def list_store_products(
    db: AsyncSession, store_id: UUID, category: str | None = None, search: str | None = None
) -> list[ProductResponse]:
    repo = CatalogRepository(db)
    if await repo.get_store(store_id) is None:
        raise StoreNotFoundError(f"No store {store_id}")
    rows = await repo.list_products(store_id=store_id, category=category, search=search)
    return [to_product_response(product, name) for product, name in rows]


async def list_all_products(
    db: AsyncSession, category: str | None = None, search: str | None = None
) -> list[ProductResponse]:
    rows = await CatalogRepository(db).list_products(category=category, search=search)
    return [to_product_response(product, name) for product, name in rows]


async def get_product(db: AsyncSession, product_id: UUID) -> ProductResponse:
    row = await CatalogRepository(db).get_product(product_id)
    if row is None:
        raise ProductNotFoundError(f"No product {product_id}")
    return to_product_response(*row)
