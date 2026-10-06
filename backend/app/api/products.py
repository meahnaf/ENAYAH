from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.crud.product import get_product, get_products, create_product, update_product
from app.schemas.product import Product, ProductCreate, ProductUpdate
from app.core.deps import get_current_active_user, require_role
from app.models.user import User as UserModel, UserRole

router = APIRouter()


@router.get("/", response_model=List[Product])
async def read_products(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    products = get_products(db, skip=skip, limit=limit)
    return products


@router.get("/{product_id}", response_model=Product)
async def read_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    product = get_product(db, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.post("/", response_model=Product)
async def create_product_endpoint(
    product: ProductCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(UserRole.ADMIN))
):
    # Check if product code already exists
    from app.crud.product import get_product_by_code
    if get_product_by_code(db, product.product_code):
        raise HTTPException(status_code=400, detail="Product code already exists")
    
    return create_product(db, product)


@router.put("/{product_id}", response_model=Product)
async def update_product_endpoint(
    product_id: int,
    product_update: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(UserRole.ADMIN))
):
    updated_product = update_product(db, product_id, product_update)
    if updated_product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return updated_product
