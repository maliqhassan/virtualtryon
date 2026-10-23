"""add garments.source_store

Revision ID: f7a8b9c0d1e2
Revises: e6f7a8b9c0d1
Create Date: 2026-10-23 17:30:00.000000

Hand-written (no database reachable on the machine this was written on).
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f7a8b9c0d1e2"
down_revision: str | None = "e6f7a8b9c0d1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("garments", sa.Column("source_store", sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column("garments", "source_store")
