"""Persist configurable warehouse operating settings."""

from alembic import op
import sqlalchemy as sa

revision = "20261003_0003"
down_revision = "20261003_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "system_settings",
        sa.Column("key", sa.String(length=100), nullable=False),
        sa.Column("value", sa.String(length=500), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("key"),
    )
    op.bulk_insert(
        sa.table("system_settings", sa.column("key", sa.String), sa.column("value", sa.String)),
        [
            {"key": "storage_hold_period_hours", "value": "48"},
            {"key": "qc_hold_target_hours", "value": "24"},
            {"key": "warehouse_timezone", "value": "Asia/Riyadh"},
        ],
    )


def downgrade() -> None:
    op.drop_table("system_settings")
