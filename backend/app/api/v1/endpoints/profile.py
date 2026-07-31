"""HTTP layer for the Profile feature. Routing, request parsing, and
status-code mapping only — real logic lives in app/services/profiles.py.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.profile import CreateProfileRequest, ProfileResponse, UpdateProfileRequest
from app.services.profiles import (
    ProfileAlreadyExistsError,
    ProfileNotFoundError,
    create_profile,
    get_profile,
    update_profile,
)

router = APIRouter()


@router.get("", response_model=ProfileResponse | None)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProfileResponse | None:
    return await get_profile(db=db, user_id=current_user.id)


@router.post("", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_my_profile(
    payload: CreateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProfileResponse:
    try:
        return await create_profile(db=db, user_id=current_user.id, payload=payload)
    except ProfileAlreadyExistsError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.patch("", response_model=ProfileResponse)
async def update_my_profile(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProfileResponse:
    try:
        return await update_profile(db=db, user_id=current_user.id, payload=payload)
    except ProfileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
