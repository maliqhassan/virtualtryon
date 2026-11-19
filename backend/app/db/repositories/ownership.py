"""Which tables hold rows belonging to a user, read from the models.

Shared by the two operations that must touch everything a user owns: moving
a guest's things into an account (guest_merge_repository.py) and deleting an
account (account_deletion_repository.py). Reading the foreign keys, rather
than listing tables by hand, means a table added later is included
automatically instead of being silently left behind.
"""

from collections.abc import Iterator

from sqlalchemy import Column, Table

from app.db.base import Base
from app.models.user import User


def owner_columns(skip: tuple[str, ...] = ()) -> Iterator[tuple[Table, Column]]:
    """Every (table, column) pointing at users.id, in dependency order:
    a table comes after the tables it refers to. Tables named in `skip`
    are left out."""
    for table in Base.metadata.sorted_tables:
        if table.name == User.__tablename__ or table.name in skip:
            continue
        for column in table.columns:
            if any(fk.column.table.name == User.__tablename__ for fk in column.foreign_keys):
                yield table, column
