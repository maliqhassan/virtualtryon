"""add garments.source_url

Revision ID: e6f7a8b9c0d1
Revises: d5e6f7a8b9c0
Create Date: 2026-10-23 16:00:00.000000

Hand-written (no database reachable on the machine this was written on).
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "e6f7a8b9c0d1"
down_revision: str | None = "d5e6f7a8b9c0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("garments", sa.Column("source_url", sa.String(length=2048), nullable=True))


def downgrade() -> None:
    op.drop_column("garments", "source_url")
