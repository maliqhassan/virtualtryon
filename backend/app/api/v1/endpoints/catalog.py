"""HTTP layer for the store catalogue. Public and read-only: browsing stores
needs no guest identity. Logic in app/services/catalog.py."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.catalog import ProductResponse, StoreResponse
from app.services.catalog import (
    ProductNotFoundError,
    StoreNotFoundError,
    get_product,
    list_all_products,
    list_store_products,
    list_stores,
)

router = APIRouter()


@router.get("/stores", response_model=list[StoreResponse])
async def get_stores(db: AsyncSession = Depends(get_db)) -> list[StoreResponse]:
    return await list_stores(db)


@router.get("/stores/{store_id}/products", response_model=list[ProductResponse])
async def get_store_products(
    store_id: UUID,
    category: str | None = Query(default=None, max_length=100),
    q: str | None = Query(default=None, max_length=100, description="Search text"),
    db: AsyncSession = Depends(get_db),
) -> list[ProductResponse]:
    try:
        return await list_store_products(db, store_id, category, q.strip() if q else None)
    except StoreNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/products", response_model=list[ProductResponse])
async def get_products(
    category: str | None = Query(default=None, max_length=100),
    q: str | None = Query(default=None, max_length=100, description="Search text"),
    db: AsyncSession = Depends(get_db),
) -> list[ProductResponse]:
    return await list_all_products(db, category, q.strip() if q else None)


@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_one_product(product_id: UUID, db: AsyncSession = Depends(get_db)) -> ProductResponse:
    try:
        return await get_product(db, product_id)
    except ProductNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
