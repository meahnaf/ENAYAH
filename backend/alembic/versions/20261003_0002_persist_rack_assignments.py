"""Persist assigned racks and enforce one pallet per rack."""

from alembic import op
import sqlalchemy as sa

revision = "20261003_0002"
down_revision = "20261003_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("pallets", sa.Column("assigned_location_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_pallets_assigned_location_id_locations",
        "pallets",
        "locations",
        ["assigned_location_id"],
        ["id"],
    )
    op.execute("""
        WITH ready AS (
            SELECT id, row_number() OVER (ORDER BY ready_for_putaway_datetime, id) AS slot
            FROM pallets WHERE status = 'READY_FOR_PUTAWAY'
        ), available AS (
            SELECT id, row_number() OVER (ORDER BY location_code) AS slot
            FROM locations
            WHERE active IS TRUE AND occupied IS FALSE AND location_type = 'RACK'
              AND id NOT IN (SELECT current_location_id FROM pallets WHERE current_location_id IS NOT NULL)
        )
        UPDATE pallets AS p
        SET assigned_location_id = available.id
        FROM ready JOIN available USING (slot)
        WHERE p.id = ready.id
    """)
    op.create_unique_constraint("uq_pallets_current_location", "pallets", ["current_location_id"])
    op.create_unique_constraint("uq_pallets_assigned_location", "pallets", ["assigned_location_id"])


def downgrade() -> None:
    op.drop_constraint("uq_pallets_assigned_location", "pallets", type_="unique")
    op.drop_constraint("uq_pallets_current_location", "pallets", type_="unique")
    op.drop_constraint("fk_pallets_assigned_location_id_locations", "pallets", type_="foreignkey")
    op.drop_column("pallets", "assigned_location_id")
