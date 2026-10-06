from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.pallet import Pallet, PalletStatus, LoadType
from app.models.user import User as UserModel, UserRole
from app.core.deps import get_current_active_user, require_role
from datetime import datetime, timedelta, timezone
from app.core.config import settings
from app.crud.pallet import refresh_release_eligibility

router = APIRouter()


@router.get("/")
async def get_dashboard(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(UserRole.SUPERVISOR, UserRole.ADMIN))
):
    refresh_release_eligibility(db, current_user.id)
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Count pallets by status
    status_counts = db.query(
        Pallet.status,
        func.count(Pallet.id)
    ).group_by(Pallet.status).all()
    
    status_dict = {status.value: count for status, count in status_counts}
    
    # Today's counts
    received_today = db.query(func.count(Pallet.id)).filter(
        Pallet.received_datetime >= today
    ).scalar() or 0
    
    wrapped_today = db.query(func.count(Pallet.id)).filter(
        Pallet.wrapped_datetime >= today
    ).scalar() or 0
    
    putaway_today = db.query(func.count(Pallet.id)).filter(
        Pallet.putaway_datetime >= today
    ).scalar() or 0
    
    released_today = db.query(func.count(Pallet.id)).filter(
        Pallet.actual_release_datetime >= today
    ).scalar() or 0
    
    dispatched_today = db.query(func.count(Pallet.id)).filter(
        Pallet.dispatched_datetime >= today
    ).scalar() or 0
    
    # Direct out today
    direct_out_today = db.query(func.count(Pallet.id)).filter(
        Pallet.load_type == LoadType.DIRECT_OUT,
        Pallet.dispatched_datetime >= today
    ).scalar() or 0
    
    # Overdue holds
    overdue_count = db.query(func.count(Pallet.id)).filter(
        Pallet.status.in_([PalletStatus.IN_RACK_HOLD, PalletStatus.RELEASE_ELIGIBLE]),
        Pallet.expected_release_datetime < now
    ).scalar() or 0
    
    # QC pending
    qc_pending = status_dict.get(PalletStatus.QC_HOLD.value, 0)
    
    return {
        "today": {
            "received": received_today,
            "wrapped": wrapped_today,
            "ready_for_putaway": status_dict.get(PalletStatus.READY_FOR_PUTAWAY.value, 0),
            "put_away": putaway_today,
            "released": released_today,
            "direct_out": direct_out_today,
            "qc_pending": qc_pending,
            "over_48_hours": overdue_count
        },
        "backlog": {
            "unscanned": status_dict.get(PalletStatus.RECEIVED.value, 0),
            "waiting_for_wrapping": status_dict.get(PalletStatus.SCANNED.value, 0),
            "ready_for_putaway": status_dict.get(PalletStatus.READY_FOR_PUTAWAY.value, 0),
            "qc_pending": qc_pending,
            "overdue_hold": overdue_count,
            "quarantine": status_dict.get(PalletStatus.QUARANTINE.value, 0)
        }
    }
