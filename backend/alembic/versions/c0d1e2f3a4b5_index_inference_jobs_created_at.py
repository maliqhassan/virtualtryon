"""index inference_jobs.created_at

Revision ID: c0d1e2f3a4b5
Revises: b9c0d1e2f3a4
Create Date: 2026-11-06 12:00:00.000000

For the server-wide daily try-on cap (ADR 0013), which counts every job
created since midnight on each new try-on.

Hand-written (no database reachable on the machine this was written on).
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c0d1e2f3a4b5"
down_revision: str | None = "b9c0d1e2f3a4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index(
        op.f("ix_inference_jobs_created_at"), "inference_jobs", ["created_at"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_inference_jobs_created_at"), table_name="inference_jobs")
