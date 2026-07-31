"""DB access for User rows. No business logic here — guest-identity
decisions (when to create a new guest, how the device id is generated)
belong in app/services/guest_identity.py, which calls this.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import AuthProvider, User


class UserRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_by_device_id(self, device_id: str) -> User | None:
        result = await self._db.execute(select(User).where(User.device_id == device_id))
        return result.scalar_one_or_none()

    async def create_guest(self, device_id: str) -> User:
        user = User(auth_provider=AuthProvider.GUEST, device_id=device_id)
        self._db.add(user)
        await self._db.commit()
        await self._db.refresh(user)
        return user
