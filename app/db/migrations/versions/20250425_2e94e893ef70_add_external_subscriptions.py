"""add external subscriptions and proxy pool servers

Revision ID: 2e94e893ef70
Revises: 57eba0a293f2
Create Date: 2025-04-25 22:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "2e94e893ef70"
down_revision = "57eba0a293f2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "external_subscriptions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("url", sa.String(length=512), nullable=False),
        sa.Column("type", sa.String(length=32), nullable=False),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column(
            "routing_mode",
            sa.String(length=32),
            server_default="both",
            nullable=False,
        ),
        sa.Column("admin_id", sa.Integer(), nullable=True),
        sa.Column(
            "is_active",
            sa.Boolean(),
            server_default=sa.sql.true(),
            nullable=False,
        ),
        sa.Column("last_sync_at", sa.DateTime(), nullable=True),
        sa.Column("parsed_servers", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["admin_id"],
            ["admins.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "proxy_pool_servers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("subscription_id", sa.Integer(), nullable=True),
        sa.Column("protocol", sa.String(length=32), nullable=True),
        sa.Column("name", sa.String(length=256), nullable=True),
        sa.Column("address", sa.String(length=256), nullable=True),
        sa.Column("port", sa.Integer(), nullable=True),
        sa.Column("uuid", sa.String(length=36), nullable=True),
        sa.Column("password", sa.String(length=128), nullable=True),
        sa.Column("security", sa.String(length=32), nullable=True),
        sa.Column("network", sa.String(length=32), nullable=True),
        sa.Column("tls", sa.String(length=32), nullable=True),
        sa.Column("sni", sa.String(length=256), nullable=True),
        sa.Column("host", sa.String(length=256), nullable=True),
        sa.Column("path", sa.String(length=256), nullable=True),
        sa.Column("fp", sa.String(length=32), nullable=True),
        sa.Column("pbk", sa.String(length=128), nullable=True),
        sa.Column("sid", sa.String(length=128), nullable=True),
        sa.Column("flow", sa.String(length=32), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("last_tested_at", sa.DateTime(), nullable=True),
        sa.Column(
            "is_available",
            sa.Boolean(),
            server_default=sa.sql.true(),
            nullable=False,
        ),
        sa.Column("v2data_config", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["subscription_id"],
            ["external_subscriptions.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("proxy_pool_servers")
    op.drop_table("external_subscriptions")
