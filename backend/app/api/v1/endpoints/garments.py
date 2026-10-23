"""HTTP layer for the Wardrobe (Garment) feature. Routing, request
parsing, and status-code mapping only — real logic lives in
app/services/garments.py.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.garment import GarmentFromLinkRequest, GarmentResponse, GarmentUpdate
from app.services.garments import (
    GarmentNotFoundError,
    create_garment,
    delete_garment,
    list_garments,
    update_garment,
)
from app.services.image_validation import ImageUpload, UnsupportedImageError
from app.services.link_import import (
    InvalidLinkError,
    LinkImportLimitError,
    import_garment_from_link,
)
from app.services.product_page import NoProductImageError, NotAProductPageError
from app.services.safe_fetch import BlockedUrlError, FetchError, PageFetcher, get_page_fetcher
from app.services.usage import UsageLimitReachedError

router = APIRouter()


async def _to_image_upload(file: UploadFile) -> ImageUpload:
    return ImageUpload(
        content=await file.read(), content_type=file.content_type, filename=file.filename
    )


@router.get("", response_model=list[GarmentResponse])
async def list_all_garments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[GarmentResponse]:
    return await list_garments(db=db, user_id=current_user.id)


@router.post("", response_model=GarmentResponse, status_code=status.HTTP_201_CREATED)
async def create_new_garment(
    image: UploadFile = File(...),
    title: str = Form(...),
    category: str = Form(...),
    color: str | None = Form(None),
    season: str | None = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GarmentResponse:
    try:
        return await create_garment(
            db=db,
            user_id=current_user.id,
            title=title,
            category=category,
            color=color,
            season=season,
            image=await _to_image_upload(image),
        )
    except UnsupportedImageError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)
        ) from exc


def _link_error(status_code: int, code: str, message: str) -> HTTPException:
    """`code` is what the app switches on; `message` is for logs and debugging."""
    return HTTPException(status_code=status_code, detail={"code": code, "message": message})


@router.post("/from-link", response_model=GarmentResponse, status_code=status.HTTP_201_CREATED)
async def import_garment_from_store_link(
    payload: GarmentFromLinkRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    fetcher: PageFetcher = Depends(get_page_fetcher),
) -> GarmentResponse:
    try:
        return await import_garment_from_link(
            db=db, user=current_user, url=payload.url, fetcher=fetcher
        )
    except InvalidLinkError as exc:
        raise _link_error(status.HTTP_422_UNPROCESSABLE_CONTENT, "invalid_link", str(exc)) from exc
    except NotAProductPageError as exc:
        raise _link_error(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "not_a_product_page", str(exc)
        ) from exc
    except (NoProductImageError, UnsupportedImageError) as exc:
        raise _link_error(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "no_product_image", str(exc)
        ) from exc
    except BlockedUrlError as exc:
        raise _link_error(status.HTTP_400_BAD_REQUEST, "blocked_link", str(exc)) from exc
    except FetchError as exc:
        raise _link_error(status.HTTP_502_BAD_GATEWAY, "store_unreachable", str(exc)) from exc
    except LinkImportLimitError as exc:
        raise _link_error(status.HTTP_429_TOO_MANY_REQUESTS, "too_many_imports", str(exc)) from exc
    except UsageLimitReachedError as exc:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={"message": str(exc), "usage": exc.usage.model_dump(mode="json")},
        ) from exc


@router.patch("/{garment_id}", response_model=GarmentResponse)
async def update_existing_garment(
    garment_id: UUID,
    payload: GarmentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GarmentResponse:
    try:
        return await update_garment(
            db=db, user_id=current_user.id, garment_id=garment_id, payload=payload
        )
    except GarmentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete("/{garment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_garment(
    garment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    try:
        await delete_garment(db=db, user_id=current_user.id, garment_id=garment_id)
    except GarmentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
