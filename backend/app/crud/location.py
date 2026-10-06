from sqlalchemy.orm import Session
from app.models.location import Location, LocationType
from app.models.pallet import Pallet
from app.schemas.location import LocationCreate, LocationUpdate
from typing import Optional
from sqlalchemy import or_


def get_location(db: Session, location_id: int) -> Optional[Location]:
    return db.query(Location).filter(Location.id == location_id).first()


def get_location_by_code(db: Session, location_code: str) -> Optional[Location]:
    return db.query(Location).filter(Location.location_code == location_code).first()


def get_location_by_qr(db: Session, qr_code_value: str) -> Optional[Location]:
    return db.query(Location).filter(Location.qr_code_value == qr_code_value).first()


def get_locations(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Location).offset(skip).limit(limit).all()


def get_available_locations(db: Session, location_type: Optional[LocationType] = None):
    query = db.query(Location).filter(Location.active == True, Location.occupied == False)
    assigned_ids = db.query(Pallet.assigned_location_id).filter(Pallet.assigned_location_id.isnot(None))
    current_ids = db.query(Pallet.current_location_id).filter(Pallet.current_location_id.isnot(None))
    query = query.filter(~Location.id.in_(assigned_ids), ~Location.id.in_(current_ids))
    if location_type:
        query = query.filter(Location.location_type == location_type)
    return query.all()


def create_location(db: Session, location: LocationCreate) -> Location:
    qr_value = location.location_code
    
    db_location = Location(
        location_code=location.location_code,
        zone=location.zone,
        rack=location.rack,
        level=location.level,
        position=location.position,
        location_type=location.location_type,
        qr_code_value=qr_value
    )
    db.add(db_location)
    db.commit()
    db.refresh(db_location)
    return db_location


def update_location(db: Session, location_id: int, location_update: LocationUpdate) -> Optional[Location]:
    db_location = get_location(db, location_id)
    if not db_location:
        return None
    
    update_data = location_update.model_dump(exclude_unset=True)
    pallet_uses_location = db.query(Pallet).filter(or_(
        Pallet.current_location_id == db_location.id,
        Pallet.assigned_location_id == db_location.id,
    )).first()
    if update_data.get("active") is False and (db_location.occupied or pallet_uses_location):
        raise ValueError("Location is occupied or assigned to a pallet and cannot be deactivated")
    for field, value in update_data.items():
        setattr(db_location, field, value)
    
    db.commit()
    db.refresh(db_location)
    return db_location
