"""add_bridge_naming_fields

Revision ID: 44b7bc114d3c
Revises: 2e94e893ef70
Create Date: 2026-05-06 19:21:54.646154

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '44b7bc114d3c'
down_revision = '2e94e893ef70'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('external_subscriptions', sa.Column('bridge_naming_template', sa.String(length=256), nullable=True))
    op.add_column('proxy_pool_servers', sa.Column('bridge_naming_override', sa.String(length=256), nullable=True))


def downgrade() -> None:
    op.drop_column('proxy_pool_servers', 'bridge_naming_override')
    op.drop_column('external_subscriptions', 'bridge_naming_template')
