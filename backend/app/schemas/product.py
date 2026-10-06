from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ProductBase(BaseModel):
    product_code: str
    product_name: str
    description: Optional[str] = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    product_name: Optional[str] = None
    description: Optional[str] = None
    active: Optional[bool] = None


class Product(ProductBase):
    id: int
    active: bool
    created_at: datetime

    class Config:
        from_attributes = True
