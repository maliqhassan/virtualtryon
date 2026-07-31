"""HTTP layer for the UserPhoto feature. Routing, request parsing, and
status-code mapping only — real logic lives in app/services/user_photos.py.
"""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.user_photo import UserPhotoResponse
from app.services.image_validation import ImageUpload, UnsupportedImageError
from app.services.user_photos import create_user_photo

router = APIRouter()


async def _to_image_upload(file: UploadFile) -> ImageUpload:
    return ImageUpload(
        content=await file.read(), content_type=file.content_type, filename=file.filename
    )


@router.post("", response_model=UserPhotoResponse, status_code=status.HTTP_201_CREATED)
async def create_new_user_photo(
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserPhotoResponse:
    try:
        return await create_user_photo(
            db=db, user_id=current_user.id, image=await _to_image_upload(image)
        )
    except UnsupportedImageError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)
        ) from exc
