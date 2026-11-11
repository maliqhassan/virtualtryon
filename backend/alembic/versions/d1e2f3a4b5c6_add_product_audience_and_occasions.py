"""add products.audience and products.occasions

Revision ID: d1e2f3a4b5c6
Revises: c0d1e2f3a4b5
Create Date: 2026-11-11 12:00:00.000000

For the Try-On studio's Men/Women toggle and occasion chips (handoff v2.1
change 4). Existing rows get "unisex" and no occasions; the catalogue seed
tags the sample products on the next start.

Hand-written (no database reachable on the machine this was written on).
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d1e2f3a4b5c6"
down_revision: str | None = "c0d1e2f3a4b5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "products",
        sa.Column("audience", sa.String(length=10), nullable=False, server_default="unisex"),
    )
    op.add_column(
        "products",
        sa.Column("occasions", sa.String(length=100), nullable=False, server_default=""),
    )


def downgrade() -> None:
    op.drop_column("products", "occasions")
    op.drop_column("products", "audience")
