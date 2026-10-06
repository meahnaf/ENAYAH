from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.crud.user import get_user, get_users, create_user, update_user
from app.schemas.user import User, UserCreate, UserUpdate
from app.core.deps import get_current_active_user, require_role
from app.models.user import User as UserModel, UserRole

router = APIRouter()


@router.get("/", response_model=List[User])
async def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(UserRole.ADMIN))
):
    users = get_users(db, skip=skip, limit=limit)
    return users


@router.get("/{user_id}", response_model=User)
async def read_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(UserRole.ADMIN))
):
    user = get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/", response_model=User)
async def create_user_endpoint(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(UserRole.ADMIN))
):
    # Check if username already exists
    from app.crud.user import get_user_by_username
    if get_user_by_username(db, user.username):
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Check if employee_id already exists
    from app.crud.user import get_user_by_employee_id
    if get_user_by_employee_id(db, user.employee_id):
        raise HTTPException(status_code=400, detail="Employee ID already exists")
    
    return create_user(db, user)


@router.put("/{user_id}", response_model=User)
async def update_user_endpoint(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(UserRole.ADMIN))
):
    try:
        updated_user = update_user(db, user_id, user_update)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    if updated_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return updated_user
