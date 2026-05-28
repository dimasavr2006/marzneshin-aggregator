"""add server selection fields to external subscriptions

Revision ID: a6c2db0f2d41
Revises: 781d4ef22b42
Create Date: 2026-05-28 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "a6c2db0f2d41"
down_revision = "781d4ef22b42"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "external_subscriptions",
        sa.Column(
            "server_selection_mode",
            sa.String(length=32),
            nullable=False,
            server_default="all",
        ),
    )
    op.add_column(
        "external_subscriptions",
        sa.Column("selected_server_ids", sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("external_subscriptions", "selected_server_ids")
    op.drop_column("external_subscriptions", "server_selection_mode")
