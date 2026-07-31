"""DB access for UserPhoto rows. Deliberately just `create` — no
`get`/`list`/`update`/`delete` exist because nothing requested them; this
resource's only current consumer is create-then-hand-the-storage-key-back.
"""

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_photo import UserPhoto


class UserPhotoRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(self, **fields: Any) -> UserPhoto:
        photo = UserPhoto(**fields)
        self._db.add(photo)
        await self._db.commit()
        await self._db.refresh(photo)
        return photo
