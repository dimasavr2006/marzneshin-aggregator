"""add bridge_subscription_id to external subscriptions

Revision ID: 781d4ef22b42
Revises: 15799376388e
Create Date: 2026-05-16 20:25:54.527036

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '781d4ef22b42'
down_revision = '15799376388e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('external_subscriptions', sa.Column('bridge_subscription_id', sa.Integer(), sa.ForeignKey('external_subscriptions.id'), nullable=True))


def downgrade() -> None:
    op.drop_column('external_subscriptions', 'bridge_subscription_id')
