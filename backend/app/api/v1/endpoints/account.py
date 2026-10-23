"""HTTP layer for account-level operations. Logic in app/services/account.py."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.services.account import delete_all_user_data

router = APIRouter()


@router.delete("/data", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await delete_all_user_data(db=db, user_id=current_user.id)
