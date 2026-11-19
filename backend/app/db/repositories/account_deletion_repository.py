"""Removes a user and every row that belongs to them (ADR 0015).

Rows are deleted in reverse dependency order (a table before the tables it
refers to), so no foreign key is left pointing at a deleted row. Staged
only: the caller collects the files to delete first, and commits.
"""

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.ownership import owner_columns
from app.models.user import User


class AccountDeletionRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def stage_delete_account(self, user: User) -> None:
        for table, column in reversed(list(owner_columns())):
            await self._db.execute(delete(table).where(column == user.id))
        await self._db.delete(user)
