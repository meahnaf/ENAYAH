"""Create the initial warehouse schema."""

from alembic import op
from alembic import context
from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, JSON, String, Text, inspect
from sqlalchemy.sql import func

from app.models.location import LocationType
from app.models.pallet import LoadType, PalletStatus
from app.models.user import UserRole

revision = "20261003_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Older releases created this schema directly from ORM metadata at startup.
    if not context.is_offline_mode() and inspect(op.get_bind()).has_table("users"):
        return

    op.create_table(
        "users",
        Column("id", Integer, primary_key=True),
        Column("employee_id", String(50), nullable=False, unique=True),
        Column("name", String(200), nullable=False),
        Column("username", String(50), nullable=False, unique=True),
        Column("password_hash", String(255), nullable=False),
        Column("role", Enum(UserRole), nullable=False),
        Column("active", Boolean, server_default="true"),
        Column("created_at", DateTime(timezone=True), server_default=func.now()),
        Column("updated_at", DateTime(timezone=True)),
    )
    op.create_index("ix_users_employee_id", "users", ["employee_id"])
    op.create_index("ix_users_username", "users", ["username"])

    op.create_table(
        "products",
        Column("id", Integer, primary_key=True),
        Column("product_code", String(50), nullable=False, unique=True),
        Column("product_name", String(200), nullable=False),
        Column("description", String(500)),
        Column("active", Boolean, server_default="true"),
        Column("created_at", DateTime(timezone=True), server_default=func.now()),
    )
    op.create_index("ix_products_product_code", "products", ["product_code"])

    op.create_table(
        "locations",
        Column("id", Integer, primary_key=True),
        Column("location_code", String(50), nullable=False, unique=True),
        Column("zone", String(10)),
        Column("rack", String(20)),
        Column("level", String(10)),
        Column("position", String(10)),
        Column("location_type", Enum(LocationType)),
        Column("qr_code_value", String(100), unique=True),
        Column("active", Boolean, server_default="true"),
        Column("occupied", Boolean, server_default="false"),
        Column("created_at", DateTime(timezone=True), server_default=func.now()),
        Column("updated_at", DateTime(timezone=True)),
    )
    op.create_index("ix_locations_location_code", "locations", ["location_code"])
    op.create_index("ix_locations_qr_code_value", "locations", ["qr_code_value"])

    op.create_table(
        "pallets",
        Column("id", Integer, primary_key=True),
        Column("pallet_id", String(50), nullable=False, unique=True),
        Column("load_number", String(50)),
        Column("product_id", Integer, ForeignKey("products.id")),
        Column("batch_number", String(50)),
        Column("quantity", Integer),
        Column("load_type", Enum(LoadType), nullable=False),
        Column("production_datetime", DateTime(timezone=True)),
        Column("received_datetime", DateTime(timezone=True)),
        Column("wrapped_datetime", DateTime(timezone=True)),
        Column("ready_for_putaway_datetime", DateTime(timezone=True)),
        Column("putaway_datetime", DateTime(timezone=True)),
        Column("expected_release_datetime", DateTime(timezone=True)),
        Column("actual_release_datetime", DateTime(timezone=True)),
        Column("dispatched_datetime", DateTime(timezone=True)),
        Column("status", Enum(PalletStatus)),
        Column("hold_reason", String(100)),
        Column("hold_reason_details", Text),
        Column("current_location_id", Integer, ForeignKey("locations.id")),
        Column("created_by", Integer, ForeignKey("users.id")),
        Column("released_by", Integer, ForeignKey("users.id")),
        Column("dispatched_by", Integer, ForeignKey("users.id")),
        Column("created_at", DateTime(timezone=True), server_default=func.now()),
        Column("updated_at", DateTime(timezone=True)),
    )
    op.create_index("ix_pallets_pallet_id", "pallets", ["pallet_id"])
    op.create_index("ix_pallets_load_number", "pallets", ["load_number"])
    op.create_index("ix_pallets_batch_number", "pallets", ["batch_number"])

    op.create_table(
        "transactions",
        Column("id", Integer, primary_key=True),
        Column("pallet_id", Integer, ForeignKey("pallets.id"), nullable=False),
        Column("user_id", Integer, ForeignKey("users.id"), nullable=False),
        Column("action", String(50), nullable=False),
        Column("timestamp", DateTime(timezone=True), server_default=func.now()),
        Column("from_location_id", Integer, ForeignKey("locations.id")),
        Column("to_location_id", Integer, ForeignKey("locations.id")),
        Column("previous_status", String(50)),
        Column("new_status", String(50)),
        Column("reason", String(100)),
        Column("notes", Text),
        Column("metadata", JSON),
    )
    op.create_index("ix_transactions_pallet_id", "transactions", ["pallet_id"])
    op.create_index("ix_transactions_user_id", "transactions", ["user_id"])
    op.create_index("ix_transactions_action", "transactions", ["action"])
    op.create_index("ix_transactions_timestamp", "transactions", ["timestamp"])


def downgrade() -> None:
    op.drop_table("transactions")
    op.drop_table("pallets")
    op.drop_table("locations")
    op.drop_table("products")
    op.drop_table("users")
