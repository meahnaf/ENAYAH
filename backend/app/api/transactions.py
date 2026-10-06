from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.crud.transaction import get_transactions, get_pallet_transactions, get_user_transactions
from app.schemas.transaction import Transaction
from app.core.deps import get_current_active_user, require_role
from app.models.user import User as UserModel, UserRole

router = APIRouter()


@router.get("/", response_model=List[Transaction])
async def read_transactions(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(UserRole.ADMIN, UserRole.SUPERVISOR))
):
    transactions = get_transactions(db, skip=skip, limit=limit)
    return transactions


@router.get("/pallet/{pallet_id}", response_model=List[Transaction])
async def read_pallet_transactions(
    pallet_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    transactions = get_pallet_transactions(db, pallet_id)
    return transactions


@router.get("/user/{user_id}", response_model=List[Transaction])
async def read_user_transactions(
    user_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(UserRole.ADMIN, UserRole.SUPERVISOR))
):
    transactions = get_user_transactions(db, user_id, skip=skip, limit=limit)
    return transactions
