from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.location import LocationType


class LocationBase(BaseModel):
    location_code: str
    zone: Optional[str] = None
    rack: Optional[str] = None
    level: Optional[str] = None
    position: Optional[str] = None
    location_type: LocationType = LocationType.RACK


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    zone: Optional[str] = None
    rack: Optional[str] = None
    level: Optional[str] = None
    position: Optional[str] = None
    location_type: Optional[LocationType] = None
    active: Optional[bool] = None


class Location(LocationBase):
    id: int
    qr_code_value: Optional[str] = None
    active: bool
    occupied: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
