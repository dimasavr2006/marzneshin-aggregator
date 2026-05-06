"""add_preferred_bridge_server

Revision ID: 15799376388e
Revises: 44b7bc114d3c
Create Date: 2026-05-06 20:53:23.271358

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '15799376388e'
down_revision = '44b7bc114d3c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('external_subscriptions', sa.Column('preferred_bridge_server_id', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('external_subscriptions', 'preferred_bridge_server_id')
