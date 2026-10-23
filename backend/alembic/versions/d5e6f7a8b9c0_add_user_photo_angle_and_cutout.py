"""add user_photos.angle and user_photos.cutout_storage_key

Revision ID: d5e6f7a8b9c0
Revises: c4d1e2f3a7b8
Create Date: 2026-10-23 23:30:00.000000

Hand-written (no database reachable on the machine this was written on).
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'd5e6f7a8b9c0'
down_revision: str | None = 'c4d1e2f3a7b8'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        'user_photos',
        sa.Column('angle', sa.String(length=10), nullable=False, server_default='front'),
    )
    op.add_column('user_photos', sa.Column('cutout_storage_key', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('user_photos', 'cutout_storage_key')
    op.drop_column('user_photos', 'angle')
