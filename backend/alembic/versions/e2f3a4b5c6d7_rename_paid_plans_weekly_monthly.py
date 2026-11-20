"""rename paid plans to weekly and monthly

Revision ID: e2f3a4b5c6d7
Revises: d1e2f3a4b5c6
Create Date: 2026-11-20 12:00:00.000000

Pro / Pro Plus become Weekly / Monthly (app/services/plans.py). The plan
column is a PostgreSQL enum storing member names, so the values are
renamed in place: nobody can be on a paid plan yet (no payments), and a
rename keeps any row valid either way. Hand-written: autogenerate doesn't
detect enum value changes.
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e2f3a4b5c6d7"
down_revision: str | None = "d1e2f3a4b5c6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_RENAMES = [("PRO", "WEEKLY"), ("PRO_PLUS", "MONTHLY")]


def _rename(pairs: list[tuple[str, str]]) -> None:
    if op.get_bind().dialect.name == "postgresql":
        for old, new in pairs:
            op.execute(f"ALTER TYPE plan RENAME VALUE '{old}' TO '{new}'")
    else:  # no native enum (e.g. SQLite): the names are plain strings
        for old, new in pairs:
            op.execute(f"UPDATE users SET plan = '{new}' WHERE plan = '{old}'")


def upgrade() -> None:
    _rename(_RENAMES)


def downgrade() -> None:
    _rename([(new, old) for old, new in _RENAMES])
