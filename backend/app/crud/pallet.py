from sqlalchemy.orm import Session
from app.models.pallet import Pallet, LoadType, PalletStatus
from app.schemas.pallet import PalletCreate, PalletUpdate
from typing import Optional, List
from datetime import datetime, timedelta, timezone
from app.core.config import settings
from app.models.location import Location, LocationType
from app.models.transaction import Transaction
from app.models.setting import SystemSetting


def get_pallet(db: Session, pallet_id: int) -> Optional[Pallet]:
    return db.query(Pallet).filter(Pallet.id == pallet_id).first()


def get_pallet_by_pallet_id(db: Session, pallet_id: str) -> Optional[Pallet]:
    return db.query(Pallet).filter(Pallet.pallet_id == pallet_id).first()


def get_pallets(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Pallet).offset(skip).limit(limit).all()


def get_pallets_by_status(db: Session, status: PalletStatus, skip: int = 0, limit: int = 100):
    return db.query(Pallet).filter(Pallet.status == status).offset(skip).limit(limit).all()


def get_pallets_by_load_type(db: Session, load_type: LoadType, skip: int = 0, limit: int = 100):
    return db.query(Pallet).filter(Pallet.load_type == load_type).offset(skip).limit(limit).all()


def refresh_release_eligibility(db: Session, user_id: int) -> None:
    now = datetime.now(timezone.utc)
    due_pallets = db.query(Pallet).filter(
        Pallet.status == PalletStatus.IN_RACK_HOLD,
        Pallet.load_type == LoadType.STORAGE,
        Pallet.expected_release_datetime.isnot(None),
        Pallet.expected_release_datetime <= now,
    ).all()
    for pallet in due_pallets:
        pallet.status = PalletStatus.RELEASE_ELIGIBLE
        db.add(Transaction(
            pallet_id=pallet.id,
            user_id=user_id,
            action="RELEASE_ELIGIBLE",
            previous_status=PalletStatus.IN_RACK_HOLD.value,
            new_status=PalletStatus.RELEASE_ELIGIBLE.value,
            notes="Hold period elapsed; eligibility detected during an authenticated request.",
        ))
    if due_pallets:
        db.commit()


def create_pallet(db: Session, pallet: PalletCreate, user_id: int) -> Pallet:
    # Check for duplicate pallet_id
    existing = get_pallet_by_pallet_id(db, pallet.pallet_id)
    if existing:
        raise ValueError(f"Pallet with ID {pallet.pallet_id} already exists")
    
    db_pallet = Pallet(
        **pallet.model_dump(),
        created_by=user_id,
        received_datetime=datetime.now(timezone.utc),
        status=(PalletStatus.DISPATCH_READY if pallet.load_type == LoadType.DIRECT_OUT else PalletStatus.RECEIVED)
    )
    
    db.add(db_pallet)
    db.flush()
    return db_pallet


def update_pallet(db: Session, pallet_id: int, pallet_update: PalletUpdate) -> Optional[Pallet]:
    db_pallet = get_pallet(db, pallet_id)
    if not db_pallet:
        return None
    
    update_data = pallet_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_pallet, field, value)
    
    db.commit()
    db.refresh(db_pallet)
    return db_pallet


def mark_pallet_wrapped(db: Session, pallet_id: int) -> Optional[Pallet]:
    db_pallet = get_pallet(db, pallet_id)
    if not db_pallet:
        return None
    
    db_pallet.status = PalletStatus.WRAPPED
    db_pallet.wrapped_datetime = datetime.now(timezone.utc)
    db.flush()
    return db_pallet


def mark_pallet_ready_for_putaway(db: Session, pallet_id: int) -> Optional[Pallet]:
    db_pallet = get_pallet(db, pallet_id)
    if not db_pallet:
        return None
    
    assigned_ids = db.query(Pallet.assigned_location_id).filter(Pallet.assigned_location_id.isnot(None))
    current_ids = db.query(Pallet.current_location_id).filter(Pallet.current_location_id.isnot(None))
    location = db.query(Location).filter(
        Location.active.is_(True),
        Location.occupied.is_(False),
        Location.location_type == LocationType.RACK,
        ~Location.id.in_(assigned_ids),
        ~Location.id.in_(current_ids),
    ).order_by(Location.location_code).with_for_update(skip_locked=True).first()
    if location is None:
        raise ValueError("No available rack locations to assign")

    db_pallet.status = PalletStatus.READY_FOR_PUTAWAY
    db_pallet.assigned_location_id = location.id
    db_pallet.ready_for_putaway_datetime = datetime.now(timezone.utc)
    db.flush()
    return db_pallet


def complete_putaway(db: Session, pallet_id: int, location_id: int) -> Optional[Pallet]:
    db_pallet = get_pallet(db, pallet_id)
    if not db_pallet:
        return None
    
    db_pallet.status = PalletStatus.IN_RACK_HOLD
    db_pallet.current_location_id = location_id
    db_pallet.assigned_location_id = None
    db_pallet.putaway_datetime = datetime.now(timezone.utc)
    if db_pallet.load_type == LoadType.STORAGE:
        hold_setting = db.get(SystemSetting, "storage_hold_period_hours")
        hold_hours = int(hold_setting.value) if hold_setting else settings.DEFAULT_HOLD_PERIOD_HOURS
        db_pallet.expected_release_datetime = db_pallet.putaway_datetime + timedelta(hours=hold_hours)
    db.flush()
    return db_pallet


def release_pallet(db: Session, pallet_id: int, user_id: int, hold_reason: Optional[str] = None, hold_reason_details: Optional[str] = None) -> Optional[Pallet]:
    db_pallet = get_pallet(db, pallet_id)
    if not db_pallet:
        return None
    
    db_pallet.status = PalletStatus.RELEASED
    db_pallet.actual_release_datetime = datetime.now(timezone.utc)
    db_pallet.released_by = user_id
    db_pallet.current_location_id = None
    
    if hold_reason:
        db_pallet.hold_reason = hold_reason
    if hold_reason_details:
        db_pallet.hold_reason_details = hold_reason_details
    
    db.flush()
    return db_pallet


def dispatch_pallet(db: Session, pallet_id: int, user_id: int) -> Optional[Pallet]:
    db_pallet = get_pallet(db, pallet_id)
    if not db_pallet:
        return None
    
    db_pallet.status = PalletStatus.DISPATCHED
    db_pallet.dispatched_datetime = datetime.now(timezone.utc)
    db_pallet.dispatched_by = user_id
    db.flush()
    return db_pallet


def get_overdue_pallets(db: Session) -> List[Pallet]:
    now = datetime.now(timezone.utc)
    return db.query(Pallet).filter(
        Pallet.status.in_([PalletStatus.IN_RACK_HOLD, PalletStatus.RELEASE_ELIGIBLE]),
        Pallet.expected_release_datetime < now,
        Pallet.expected_release_datetime.isnot(None)
    ).all()


def get_ready_for_putaway_pallets(db: Session) -> List[Pallet]:
    return db.query(Pallet).filter(
        Pallet.status == PalletStatus.READY_FOR_PUTAWAY
    ).order_by(Pallet.ready_for_putaway_datetime).all()
