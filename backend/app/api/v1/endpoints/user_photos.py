"""HTTP layer for the user's own photo. Routing, request parsing, and
status-code mapping only — real logic lives in app/services/user_photos.py.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.uploads import read_image_upload
from app.db.session import get_db
from app.models.user import User
from app.schemas.user_photo import UserPhotoResponse
from app.services.image_validation import UnsupportedImageError
from app.services.photo_background import BackgroundRemover, get_background_remover
from app.services.photo_quality import (
    FullBodyChecker,
    PhotoRejectedError,
    get_full_body_checker,
)
from app.services.user_photos import (
    InvalidPhotoAngleError,
    TooManyPhotosError,
    UserPhotoNotFoundError,
    create_user_photo,
    delete_user_photo,
    delete_user_photos,
    get_current_user_photo,
    list_user_photos,
)

router = APIRouter()


@router.post("", response_model=UserPhotoResponse, status_code=status.HTTP_201_CREATED)
async def create_new_user_photo(
    image: UploadFile = File(...),
    angle: str = Form("front"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    body_checker: FullBodyChecker = Depends(get_full_body_checker),
    background_remover: BackgroundRemover = Depends(get_background_remover),
) -> UserPhotoResponse:
    try:
        return await create_user_photo(
            db=db,
            user_id=current_user.id,
            image=await read_image_upload(image),
            body_checker=body_checker,
            background_remover=background_remover,
            angle=angle,
        )
    except (UnsupportedImageError, PhotoRejectedError, InvalidPhotoAngleError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)
        ) from exc
    except TooManyPhotosError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.get("", response_model=list[UserPhotoResponse])
async def get_my_photos(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[UserPhotoResponse]:
    """All of the user's model photos, newest first."""
    return await list_user_photos(db=db, user_id=current_user.id)


@router.get("/current", response_model=UserPhotoResponse | None)
async def get_my_current_photo(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserPhotoResponse | None:
    """The newest photo (what a try-on uses unless the app picks another), or
    null (not 404) when there's none yet, as GET /profile does."""
    return await get_current_user_photo(db=db, user_id=current_user.id)


@router.delete("/current", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_photos(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await delete_user_photos(db=db, user_id=current_user.id)


# After DELETE /current, so "current" never reaches this route.
@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_one_photo(
    photo_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    try:
        await delete_user_photo(db=db, user_id=current_user.id, photo_id=photo_id)
    except UserPhotoNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
