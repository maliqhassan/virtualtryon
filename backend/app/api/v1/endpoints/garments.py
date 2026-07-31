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
from app.schemas.garment import GarmentResponse, GarmentUpdate
from app.services.garments import (
    GarmentNotFoundError,
    create_garment,
    delete_garment,
    list_garments,
    update_garment,
)
from app.services.image_validation import ImageUpload, UnsupportedImageError

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
