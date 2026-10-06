from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class LocationType(str, enum.Enum):
    RACK = "RACK"
    FLOOR = "FLOOR"
    STAGING = "STAGING"
    DISPATCH = "DISPATCH"
    QUARANTINE = "QUARANTINE"


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    location_code = Column(String(50), unique=True, index=True, nullable=False)
    zone = Column(String(10))
    rack = Column(String(20))
    level = Column(String(10))
    position = Column(String(10))
    location_type = Column(Enum(LocationType), default=LocationType.RACK)
    qr_code_value = Column(String(100), unique=True, index=True)
    active = Column(Boolean, default=True)
    occupied = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
