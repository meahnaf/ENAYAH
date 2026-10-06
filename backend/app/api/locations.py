from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.crud.location import get_location, get_locations, get_available_locations, create_location, update_location
from app.schemas.location import Location, LocationCreate, LocationUpdate
from app.core.deps import get_current_active_user, require_role
from app.models.user import User as UserModel, UserRole
from app.models.location import LocationType

router = APIRouter()


@router.get("/resolve-qr", response_model=Location)
async def resolve_location_qr(
    qr_value: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    from app.crud.location import get_location_by_qr, get_location_by_code
    location = get_location_by_qr(db, qr_value) or get_location_by_code(db, qr_value)
    if location is None or not location.active:
        raise HTTPException(status_code=404, detail="Active location not found for scanned QR code")
    return location


@router.get("/", response_model=List[Location])
async def read_locations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    locations = get_locations(db, skip=skip, limit=limit)
    return locations


@router.get("/available", response_model=List[Location])
async def read_available_locations(
    location_type: LocationType = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    locations = get_available_locations(db, location_type)
    return locations


@router.get("/{location_id}", response_model=Location)
async def read_location(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    location = get_location(db, location_id)
    if location is None:
        raise HTTPException(status_code=404, detail="Location not found")
    return location


@router.post("/", response_model=Location)
async def create_location_endpoint(
    location: LocationCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(UserRole.ADMIN))
):
    # Check if location code already exists
    from app.crud.location import get_location_by_code
    if get_location_by_code(db, location.location_code):
        raise HTTPException(status_code=400, detail="Location code already exists")
    
    return create_location(db, location)


@router.put("/{location_id}", response_model=Location)
async def update_location_endpoint(
    location_id: int,
    location_update: LocationUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(UserRole.ADMIN))
):
    try:
        updated_location = update_location(db, location_id, location_update)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    if updated_location is None:
        raise HTTPException(status_code=404, detail="Location not found")
    return updated_location
