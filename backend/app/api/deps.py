"""Shared FastAPI dependencies for app/api/v1/endpoints/.

get_current_user resolves who is calling. A signed-in account sends a
session token (`Authorization: Bearer …`, ADR 0010); a guest sends its
device id. Every endpoint depends on this one function, so neither path
leaks into endpoint code. get_existing_user is the same lookup without
issuing a new guest, for sign-in, which must not create rows on its own.
"""

from fastapi import Depends, Header, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import read_session_token
from app.db.repositories.user_repository import UserRepository
from app.db.session import get_db
from app.models.user import User
from app.services.guest_identity import DEVICE_ID_HEADER, resolve_or_create_guest

_BEARER = "bearer "


def _session_expired() -> HTTPException:
    # The app clears its token on this code and continues as a guest.
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"code": "session_expired", "message": "Please sign in again."},
    )


async def _user_from_token(repo: UserRepository, authorization: str) -> User:
    # A token that is present but invalid is an error, never a silent
    # fall-back to a guest: that would hide the account's data.
    if not authorization.lower().startswith(_BEARER):
        raise _session_expired()
    user_id = read_session_token(authorization[len(_BEARER) :].strip())
    user = await repo.get_by_id(user_id) if user_id is not None else None
    if user is None:
        raise _session_expired()
    return user


async def get_current_user(
    response: Response,
    db: AsyncSession = Depends(get_db),
    x_device_id: str | None = Header(default=None, alias=DEVICE_ID_HEADER),
    authorization: str | None = Header(default=None),
) -> User:
    repo = UserRepository(db)
    if authorization is not None:
        return await _user_from_token(repo, authorization)

    user, new_device_id = await resolve_or_create_guest(repo, x_device_id)
    if new_device_id is not None:
        response.headers[DEVICE_ID_HEADER] = new_device_id
    return user


async def get_existing_user(
    db: AsyncSession = Depends(get_db),
    x_device_id: str | None = Header(default=None, alias=DEVICE_ID_HEADER),
    authorization: str | None = Header(default=None),
) -> User | None:
    repo = UserRepository(db)
    if authorization is not None:
        return await _user_from_token(repo, authorization)
    return await repo.get_by_device_id(x_device_id) if x_device_id else None
