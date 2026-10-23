"""HTTP layer for Saved Looks. Routing, request parsing, and status-code
mapping only — real logic lives in app/services/saved_looks.py.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.saved_look import (
    SavedLookResponse,
    SavedLookUpdate,
    SaveLookFromJobRequest,
)
from app.services.image_validation import ImageUpload, UnsupportedImageError
from app.services.saved_looks import (
    SavedLookNotFoundError,
    TryOnNotFoundError,
    TryOnNotSaveableError,
    create_saved_look,
    create_saved_look_from_job,
    delete_saved_look,
    list_saved_looks,
    update_saved_look,
)

router = APIRouter()


async def _to_image_upload(file: UploadFile) -> ImageUpload:
    return ImageUpload(
        content=await file.read(),
        content_type=file.content_type,
        filename=file.filename,
    )


@router.get("", response_model=list[SavedLookResponse])
async def list_looks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[SavedLookResponse]:
    return await list_saved_looks(db=db, user_id=current_user.id)


@router.post("", response_model=SavedLookResponse, status_code=status.HTTP_201_CREATED)
async def create_look(
    user_image: UploadFile = File(...),
    clothing_image: UploadFile = File(...),
    generated_image: UploadFile = File(...),
    title: str = Form("Untitled Look"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SavedLookResponse:
    try:
        return await create_saved_look(
            db=db,
            user_id=current_user.id,
            title=title,
            user_image=await _to_image_upload(user_image),
            clothing_image=await _to_image_upload(clothing_image),
            generated_image=await _to_image_upload(generated_image),
        )
    except UnsupportedImageError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)
        ) from exc


@router.post("/from-job", response_model=SavedLookResponse, status_code=status.HTTP_201_CREATED)
async def create_look_from_job(
    payload: SaveLookFromJobRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SavedLookResponse:
    try:
        return await create_saved_look_from_job(db=db, user_id=current_user.id, payload=payload)
    except TryOnNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except TryOnNotSaveableError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.patch("/{look_id}", response_model=SavedLookResponse)
async def update_look(
    look_id: UUID,
    payload: SavedLookUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SavedLookResponse:
    try:
        return await update_saved_look(
            db=db, user_id=current_user.id, look_id=look_id, payload=payload
        )
    except SavedLookNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete("/{look_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_look(
    look_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    try:
        await delete_saved_look(db=db, user_id=current_user.id, look_id=look_id)
    except SavedLookNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
