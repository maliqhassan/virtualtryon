"""HTTP layer for the caller's try-on allowance. Logic in app/services/usage.py."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.usage import UsageResponse
from app.services.usage import get_usage

router = APIRouter()


@router.get("", response_model=UsageResponse)
async def get_my_usage(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UsageResponse:
    return await get_usage(db=db, user=current_user)
