from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import enum
from app.models.pallet import LoadType, PalletStatus
from app.schemas.location import Location as LocationSchema
from app.schemas.product import Product as ProductSchema


class PalletBase(BaseModel):
    pallet_id: str
    load_number: Optional[str] = None
    product_id: Optional[int] = None
    batch_number: Optional[str] = None
    quantity: Optional[int] = None
    load_type: LoadType = LoadType.STORAGE
    production_datetime: Optional[datetime] = None


class PalletCreate(PalletBase):
    pass


class PalletUpdate(BaseModel):
    status: Optional[PalletStatus] = None
    hold_reason: Optional[str] = None
    hold_reason_details: Optional[str] = None
    current_location_id: Optional[int] = None


class Pallet(PalletBase):
    id: int
    received_datetime: Optional[datetime] = None
    wrapped_datetime: Optional[datetime] = None
    ready_for_putaway_datetime: Optional[datetime] = None
    putaway_datetime: Optional[datetime] = None
    expected_release_datetime: Optional[datetime] = None
    actual_release_datetime: Optional[datetime] = None
    dispatched_datetime: Optional[datetime] = None
    status: PalletStatus
    hold_reason: Optional[str] = None
    hold_reason_details: Optional[str] = None
    current_location_id: Optional[int] = None
    created_by: Optional[int] = None
    released_by: Optional[int] = None
    dispatched_by: Optional[int] = None
    assigned_location_id: Optional[int] = None
    assigned_location: Optional[LocationSchema] = None
    current_location: Optional[LocationSchema] = None
    product: Optional[ProductSchema] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PalletScan(BaseModel):
    pallet_id: str


class PalletWrap(BaseModel):
    pallet_id: str


class PalletPutaway(BaseModel):
    pallet_id: str
    scanned_location_qr: str


class PalletQCDecision(PalletScan):
    reason: Optional[str] = None


class OverdueHoldReason(str, enum.Enum):
    AWAITING_QC = "Awaiting QC"
    DOCUMENTATION_ISSUE = "Documentation Issue"
    QUALITY_INVESTIGATION = "Quality Investigation"
    PRODUCTION_ISSUE = "Production Issue"
    CUSTOMER_REQUIREMENT = "Customer Requirement"
    SYSTEM_ISSUE = "System Issue"
    OTHER = "Other"


class PalletRelease(BaseModel):
    pallet_id: str
    hold_reason: Optional[OverdueHoldReason] = None
    hold_reason_details: Optional[str] = None


class PalletDispatch(BaseModel):
    pallet_id: str
