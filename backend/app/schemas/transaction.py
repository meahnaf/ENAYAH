from pydantic import BaseModel, Field, AliasChoices
from typing import Optional, Any
from datetime import datetime


class TransactionBase(BaseModel):
    pallet_id: int
    action: str
    from_location_id: Optional[int] = None
    to_location_id: Optional[int] = None
    previous_status: Optional[str] = None
    new_status: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None
    metadata: Optional[dict] = Field(default=None, validation_alias=AliasChoices("event_metadata", "metadata"))


class TransactionCreate(TransactionBase):
    pass


class Transaction(TransactionBase):
    id: int
    user_id: int
    timestamp: datetime

    class Config:
        from_attributes = True
