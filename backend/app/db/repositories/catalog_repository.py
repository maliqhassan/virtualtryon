"""DB access for the shared store catalogue (stores and products). Not
scoped by user: the catalogue is the same for everyone and read-only to the
app."""

from typing import Any
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.catalog import Product, Store


class CatalogRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def list_stores_with_counts(self) -> list[tuple[Store, int]]:
        """One query (outer join + GROUP BY), not one count query per store."""
        result = await self._db.execute(
            select(Store, func.count(Product.id))
            .outerjoin(Product, Product.store_id == Store.id)
            .group_by(Store.id)
            .order_by(Store.name)
        )
        return [(store, int(count)) for store, count in result.all()]

    async def list_products(
        self,
        store_id: UUID | None = None,
        category: str | None = None,
        search: str | None = None,
        audience: str | None = None,
        occasion: str | None = None,
    ) -> list[tuple[Product, str]]:
        """Products with their store's name, newest first. `search` matches the
        product title, category or store name (case-insensitive). `audience`
        ("men"/"women") also includes unisex pieces; `occasion` is one tag.
        Both come pre-checked against fixed lists by the API schema."""
        query = select(Product, Store.name).join(Store, Store.id == Product.store_id)
        if audience is not None:
            query = query.where(Product.audience.in_([audience, "unisex"]))
        if occasion is not None:
            query = query.where(Product.occasions.contains(f",{occasion},"))
        if search:
            # Escape LIKE wildcards so a search for "50%" means the text "50%".
            escaped = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            pattern = f"%{escaped}%"
            query = query.where(
                or_(
                    Product.title.ilike(pattern, escape="\\"),
                    Product.category.ilike(pattern, escape="\\"),
                    Store.name.ilike(pattern, escape="\\"),
                )
            )
        if store_id is not None:
            query = query.where(Product.store_id == store_id)
        if category is not None:
            query = query.where(Product.category == category)
        result = await self._db.execute(query.order_by(Product.created_at.desc(), Product.title))
        return [(product, store_name) for product, store_name in result.all()]

    async def get_product(self, product_id: UUID) -> tuple[Product, str] | None:
        result = await self._db.execute(
            select(Product, Store.name)
            .join(Store, Store.id == Product.store_id)
            .where(Product.id == product_id)
        )
        row = result.first()
        return (row[0], row[1]) if row is not None else None

    async def get_store_by_slug(self, slug: str) -> Store | None:
        result = await self._db.execute(select(Store).where(Store.slug == slug))
        return result.scalar_one_or_none()

    async def get_store(self, store_id: UUID) -> Store | None:
        result = await self._db.execute(select(Store).where(Store.id == store_id))
        return result.scalar_one_or_none()

    async def count_stores(self) -> int:
        result = await self._db.execute(select(func.count(Store.id)))
        return int(result.scalar_one())

    async def add_store(self, **fields: Any) -> Store:
        store = Store(**fields)
        self._db.add(store)
        await self._db.flush()
        return store

    async def add_product(self, **fields: Any) -> Product:
        product = Product(**fields)
        self._db.add(product)
        await self._db.flush()
        return product

    async def tag_untagged_products(
        self, store_slugs: list[str], tags: dict[str, tuple[str, str]]
    ) -> int:
        """Sets audience/occasions by title on the given stores' products that
        have no occasions yet (a sample catalogue seeded before the tags
        existed). Other stores' products are never touched. Returns how many."""
        result = await self._db.execute(
            select(Product)
            .join(Store, Store.id == Product.store_id)
            .where(Product.occasions == "", Store.slug.in_(store_slugs))
        )
        tagged = 0
        for product in result.scalars().all():
            if product.title in tags:
                product.audience, product.occasions = tags[product.title]
                tagged += 1
        return tagged

    async def commit(self) -> None:
        await self._db.commit()
