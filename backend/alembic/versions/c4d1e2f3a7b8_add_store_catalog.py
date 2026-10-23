"""add store catalog (stores, products) and inference_jobs.product_id

Revision ID: c4d1e2f3a7b8
Revises: b3c9d2e4f5a6
Create Date: 2026-10-23 22:00:00.000000

Hand-written (no database reachable on the machine this was written on),
mirroring what autogenerate produces for these models.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'c4d1e2f3a7b8'
down_revision: str | None = 'b3c9d2e4f5a6'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'stores',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('slug', sa.String(length=80), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('tagline', sa.String(length=200), nullable=False),
        sa.Column('accent_color', sa.String(length=9), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug'),
    )
    op.create_table(
        'products',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('store_id', sa.Uuid(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('price_cents', sa.Integer(), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False),
        sa.Column('image_url', sa.String(), nullable=False),
        sa.Column('product_url', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_products_store_id'), 'products', ['store_id'], unique=False)
    op.add_column('inference_jobs', sa.Column('product_id', sa.Uuid(), nullable=True))
    op.create_index(
        op.f('ix_inference_jobs_product_id'), 'inference_jobs', ['product_id'], unique=False
    )
    op.create_foreign_key(
        'fk_inference_jobs_product_id_products',
        'inference_jobs',
        'products',
        ['product_id'],
        ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint(
        'fk_inference_jobs_product_id_products', 'inference_jobs', type_='foreignkey'
    )
    op.drop_index(op.f('ix_inference_jobs_product_id'), table_name='inference_jobs')
    op.drop_column('inference_jobs', 'product_id')
    op.drop_index(op.f('ix_products_store_id'), table_name='products')
    op.drop_table('products')
    op.drop_table('stores')
