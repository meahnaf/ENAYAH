from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class LoadType(str, enum.Enum):
    STORAGE = "STORAGE"
    DIRECT_OUT = "DIRECT_OUT"


class PalletStatus(str, enum.Enum):
    RECEIVED = "RECEIVED"
    SCANNED = "SCANNED"
    WRAPPED = "WRAPPED"
    READY_FOR_PUTAWAY = "READY_FOR_PUTAWAY"
    IN_RACK_HOLD = "IN_RACK_HOLD"
    RELEASE_ELIGIBLE = "RELEASE_ELIGIBLE"
    RELEASED = "RELEASED"
    DISPATCH_READY = "DISPATCH_READY"
    DISPATCHED = "DISPATCHED"
    QC_HOLD = "QC_HOLD"
    QUARANTINE = "QUARANTINE"
    CANCELLED = "CANCELLED"


class Pallet(Base):
    __tablename__ = "pallets"
    __table_args__ = (
        UniqueConstraint("current_location_id", name="uq_pallets_current_location"),
        UniqueConstraint("assigned_location_id", name="uq_pallets_assigned_location"),
    )

    id = Column(Integer, primary_key=True, index=True)
    pallet_id = Column(String(50), unique=True, index=True, nullable=False)
    load_number = Column(String(50), index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    batch_number = Column(String(50), index=True)
    quantity = Column(Integer)
    load_type = Column(Enum(LoadType), nullable=False, default=LoadType.STORAGE)
    
    # Timestamps
    production_datetime = Column(DateTime(timezone=True))
    received_datetime = Column(DateTime(timezone=True))
    wrapped_datetime = Column(DateTime(timezone=True))
    ready_for_putaway_datetime = Column(DateTime(timezone=True))
    putaway_datetime = Column(DateTime(timezone=True))
    expected_release_datetime = Column(DateTime(timezone=True))
    actual_release_datetime = Column(DateTime(timezone=True))
    dispatched_datetime = Column(DateTime(timezone=True))
    
    # Status and location
    status = Column(Enum(PalletStatus), default=PalletStatus.RECEIVED)
    hold_reason = Column(String(100))
    hold_reason_details = Column(Text)
    current_location_id = Column(Integer, ForeignKey("locations.id"))
    assigned_location_id = Column(Integer, ForeignKey("locations.id"))
    
    # Audit fields
    created_by = Column(Integer, ForeignKey("users.id"))
    released_by = Column(Integer, ForeignKey("users.id"))
    dispatched_by = Column(Integer, ForeignKey("users.id"))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    product = relationship("Product", backref="pallets")
    current_location = relationship("Location", foreign_keys=[current_location_id], backref="pallets")
    assigned_location = relationship("Location", foreign_keys=[assigned_location_id])
    creator = relationship("User", foreign_keys=[created_by], backref="created_pallets")
    releaser = relationship("User", foreign_keys=[released_by], backref="released_pallets")
    dispatcher = relationship("User", foreign_keys=[dispatched_by], backref="dispatched_pallets")
