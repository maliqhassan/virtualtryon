"""Shared FastAPI dependencies for app/api/v1/endpoints/.

get_current_user is the one seam that changes when real authentication
(Milestone 6) lands — it would decode a real auth token instead of
resolving a guest device id. Every endpoint depending on it stays
unchanged; only this function's body would be replaced.
"""

from fastapi import Depends, Header, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.user_repository import UserRepository
from app.db.session import get_db
from app.models.user import User
from app.services.guest_identity import DEVICE_ID_HEADER, resolve_or_create_guest


async def get_current_user(
    response: Response,
    db: AsyncSession = Depends(get_db),
    x_device_id: str | None = Header(default=None, alias=DEVICE_ID_HEADER),
) -> User:
    repo = UserRepository(db)
    user, new_device_id = await resolve_or_create_guest(repo, x_device_id)
    if new_device_id is not None:
        response.headers[DEVICE_ID_HEADER] = new_device_id
    return user
