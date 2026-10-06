from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.crud.pallet import (
    get_pallet, get_pallet_by_pallet_id, get_pallets, get_pallets_by_status,
    get_pallets_by_load_type, create_pallet, update_pallet, mark_pallet_wrapped,
    mark_pallet_ready_for_putaway, complete_putaway, release_pallet, dispatch_pallet,
    get_overdue_pallets, get_ready_for_putaway_pallets, refresh_release_eligibility
)
from app.crud.transaction import create_transaction
from app.schemas.pallet import (
    Pallet, PalletCreate, PalletUpdate, PalletScan, PalletWrap,
    PalletPutaway, PalletRelease, PalletDispatch, PalletQCDecision
)
from app.schemas.transaction import TransactionCreate
from app.core.deps import get_current_active_user, require_role
from app.models.user import User as UserModel, UserRole
from app.models.pallet import Pallet as PalletModel, PalletStatus, LoadType
from app.models.location import Location
from fastapi.responses import StreamingResponse
import csv
import io

router = APIRouter()


@router.get("/export/csv")
async def export_pallets_csv(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(UserRole.SUPERVISOR, UserRole.ADMIN)),
):
    refresh_release_eligibility(db, current_user.id)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Pallet ID", "Load Number", "Product Code", "Product Name", "Batch", "Quantity",
        "Load Type", "Status", "Current Location", "Assigned Location", "Received",
        "Put Away", "Expected Release", "Actual Release", "Dispatched",
    ])
    for pallet in get_pallets(db, skip=0, limit=100000):
        writer.writerow([
            pallet.pallet_id, pallet.load_number, pallet.product.product_code if pallet.product else "",
            pallet.product.product_name if pallet.product else "", pallet.batch_number, pallet.quantity,
            pallet.load_type.value, pallet.status.value,
            pallet.current_location.location_code if pallet.current_location else "",
            pallet.assigned_location.location_code if pallet.assigned_location else "",
            pallet.received_datetime.isoformat() if pallet.received_datetime else "",
            pallet.putaway_datetime.isoformat() if pallet.putaway_datetime else "",
            pallet.expected_release_datetime.isoformat() if pallet.expected_release_datetime else "",
            pallet.actual_release_datetime.isoformat() if pallet.actual_release_datetime else "",
            pallet.dispatched_datetime.isoformat() if pallet.dispatched_datetime else "",
        ])
    db.commit()
    return StreamingResponse(
        iter([output.getvalue()]), media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=pallet-report.csv"},
    )


@router.get("/", response_model=List[Pallet])
async def read_pallets(
    skip: int = 0,
    limit: int = 100,
    status: PalletStatus = None,
    load_type: LoadType = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    refresh_release_eligibility(db, current_user.id)
    if status:
        pallets = get_pallets_by_status(db, status, skip=skip, limit=limit)
    elif load_type:
        pallets = get_pallets_by_load_type(db, load_type, skip=skip, limit=limit)
    else:
        pallets = get_pallets(db, skip=skip, limit=limit)
    return pallets


@router.get("/{pallet_id}", response_model=Pallet)
async def read_pallet(
    pallet_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    refresh_release_eligibility(db, current_user.id)
    pallet = get_pallet(db, pallet_id)
    if pallet is None:
        raise HTTPException(status_code=404, detail="Pallet not found")
    return pallet


@router.post("/", response_model=Pallet)
async def create_pallet_endpoint(
    pallet: PalletCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(UserRole.WAREHOUSE, UserRole.ADMIN))
):
    try:
        db_pallet = create_pallet(db, pallet, current_user.id)
        
        # Create transaction
        create_transaction(db, TransactionCreate(
            pallet_id=db_pallet.id,
            action="RECEIVED",
            new_status=db_pallet.status.value
        ), current_user.id)
        db.commit()
        
        return db_pallet
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/scan", response_model=Pallet)
async def scan_pallet(
    scan: PalletScan,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(UserRole.WAREHOUSE, UserRole.FORKLIFT, UserRole.QC, UserRole.SUPERVISOR, UserRole.ADMIN))
):
    pallet = get_pallet_by_pallet_id(db, scan.pallet_id)
    if not pallet:
        raise HTTPException(status_code=404, detail="Pallet not found")
    
    # Create transaction for scan
    create_transaction(db, TransactionCreate(
        pallet_id=pallet.id,
        action="SCANNED",
        previous_status=pallet.status.value,
        new_status=pallet.status.value
    ), current_user.id)
    db.commit()
    
    return pallet


@router.post("/wrap", response_model=Pallet)
async def wrap_pallet(
    wrap: PalletWrap,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(UserRole.WAREHOUSE, UserRole.ADMIN))
):
    pallet = get_pallet_by_pallet_id(db, wrap.pallet_id)
    if not pallet:
        raise HTTPException(status_code=404, detail="Pallet not found")
    
    if pallet.status != PalletStatus.RECEIVED and pallet.status != PalletStatus.SCANNED:
        raise HTTPException(status_code=400, detail="Pallet must be in RECEIVED or SCANNED status to wrap")
    
    previous_status = pallet.status
    db_pallet = mark_pallet_wrapped(db, pallet.id)
    
    # Create transaction
    create_transaction(db, TransactionCreate(
        pallet_id=db_pallet.id,
        action="WRAPPED",
        previous_status=previous_status.value,
        new_status=PalletStatus.WRAPPED.value
    ), current_user.id)
    db.commit()
    
    return db_pallet


@router.post("/ready-putaway", response_model=Pallet)
async def mark_ready_for_putaway(
    wrap: PalletWrap,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(UserRole.WAREHOUSE, UserRole.ADMIN))
):
    pallet = get_pallet_by_pallet_id(db, wrap.pallet_id)
    if not pallet:
        raise HTTPException(status_code=404, detail="Pallet not found")
    
    if pallet.status != PalletStatus.WRAPPED:
        raise HTTPException(status_code=400, detail="Pallet must be WRAPPED to mark ready for putaway")
    
    previous_status = pallet.status
    try:
        db_pallet = mark_pallet_ready_for_putaway(db, pallet.id)
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(e))
    
    # Create transaction
    create_transaction(db, TransactionCreate(
        pallet_id=db_pallet.id,
        action="READY_FOR_PUTAWAY",
        previous_status=previous_status.value,
        new_status=PalletStatus.READY_FOR_PUTAWAY.value,
        to_location_id=db_pallet.assigned_location_id,
        metadata={"rack_assigned": True}
    ), current_user.id)
    db.commit()
    
    return db_pallet


@router.get("/ready-putaway/queue", response_model=List[Pallet])
async def get_ready_for_putaway_queue(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(UserRole.FORKLIFT, UserRole.SUPERVISOR, UserRole.ADMIN))
):
    return get_ready_for_putaway_pallets(db)


@router.post("/putaway", response_model=Pallet)
async def putaway_pallet(
    putaway: PalletPutaway,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(UserRole.FORKLIFT, UserRole.SUPERVISOR, UserRole.ADMIN))
):
    pallet = get_pallet_by_pallet_id(db, putaway.pallet_id)
    if not pallet:
        raise HTTPException(status_code=404, detail="Pallet not found")
    
    if pallet.status != PalletStatus.READY_FOR_PUTAWAY:
        raise HTTPException(status_code=400, detail="Pallet must be READY_FOR_PUTAWAY to put away")
    
    # Validate location exists
    from app.crud.location import get_location
    from app.crud.location import get_location_by_qr, get_location_by_code
    location = get_location_by_qr(db, putaway.scanned_location_qr) or get_location_by_code(db, putaway.scanned_location_qr)
    if not location:
        raise HTTPException(status_code=404, detail="Scanned rack QR code was not found")
    location = db.query(Location).filter(Location.id == location.id).with_for_update().first()
    if not location.active:
        raise HTTPException(status_code=400, detail="Scanned rack location is inactive")
    if location.occupied:
        raise HTTPException(status_code=409, detail="Scanned rack location is already occupied")
    if db.query(PalletModel.id).filter(PalletModel.current_location_id == location.id).first():
        raise HTTPException(status_code=409, detail="A pallet is already recorded at this rack")
    if db.query(PalletModel.id).filter(PalletModel.assigned_location_id == location.id, PalletModel.id != pallet.id).first():
        raise HTTPException(status_code=409, detail="This rack is assigned to another pallet")
    expected_location = get_location(db, pallet.assigned_location_id) if pallet.assigned_location_id else None
    if expected_location is None:
        raise HTTPException(status_code=409, detail="Pallet has no assigned rack. Return it to the warehouse queue for assignment.")
    if expected_location.id != location.id:
        raise HTTPException(status_code=400, detail=f"WRONG LOCATION. Expected: {expected_location.location_code}. Scanned: {location.location_code}.")
    
    previous_status = pallet.status
    db_pallet = complete_putaway(db, pallet.id, location.id)
    
    location.occupied = True
    
    # Create transaction
    create_transaction(db, TransactionCreate(
        pallet_id=db_pallet.id,
        action="PUTAWAY",
        previous_status=previous_status.value,
        new_status=PalletStatus.IN_RACK_HOLD.value,
        from_location_id=None,
        to_location_id=location.id
    ), current_user.id)
    db.commit()
    
    return db_pallet


@router.post("/release", response_model=Pallet)
async def release_pallet_endpoint(
    release: PalletRelease,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(UserRole.SUPERVISOR, UserRole.QC, UserRole.ADMIN))
):
    refresh_release_eligibility(db, current_user.id)
    pallet = get_pallet_by_pallet_id(db, release.pallet_id)
    if not pallet:
        raise HTTPException(status_code=404, detail="Pallet not found")
    
    if pallet.load_type == LoadType.DIRECT_OUT:
        raise HTTPException(status_code=400, detail="DIRECT_OUT loads should use dispatch endpoint")
    
    if pallet.status not in (PalletStatus.IN_RACK_HOLD, PalletStatus.RELEASE_ELIGIBLE):
        raise HTTPException(status_code=400, detail="Pallet must be on a storage hold to release")
    
    # Check if overdue and require reason
    from datetime import datetime, timezone
    expected_release = pallet.expected_release_datetime
    if expected_release and expected_release.tzinfo is None:
        expected_release = expected_release.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    if pallet.status != PalletStatus.RELEASE_ELIGIBLE and (expected_release is None or now < expected_release):
        raise HTTPException(status_code=400, detail="Pallet is not yet eligible for release")
    if expected_release and now > expected_release:
        if not release.hold_reason or not release.hold_reason.strip():
            raise HTTPException(status_code=400, detail="Hold reason is required for overdue pallets")
        if release.hold_reason.value == "Other" and not (release.hold_reason_details or "").strip():
            raise HTTPException(status_code=400, detail="Details are required when the hold reason is Other")
    
    previous_status = pallet.status
    previous_location_id = pallet.current_location_id
    hold_reason = release.hold_reason.value if release.hold_reason else None
    db_pallet = release_pallet(db, pallet.id, current_user.id, hold_reason, release.hold_reason_details)
    
    # Update location as not occupied
    if previous_location_id:
        from app.crud.location import get_location
        previous_location = get_location(db, previous_location_id)
        if previous_location:
            previous_location.occupied = False
    
    # Create transaction
    if expected_release and now > expected_release and hold_reason:
        create_transaction(db, TransactionCreate(
            pallet_id=db_pallet.id,
            action="HOLD_REASON_ADDED",
            previous_status=previous_status.value,
            new_status=previous_status.value,
            from_location_id=previous_location_id,
            reason=hold_reason,
            notes=release.hold_reason_details,
        ), current_user.id)
    create_transaction(db, TransactionCreate(
        pallet_id=db_pallet.id,
        action="RELEASED",
        previous_status=previous_status.value,
        new_status=PalletStatus.RELEASED.value,
        from_location_id=previous_location_id,
        reason=hold_reason,
        notes=release.hold_reason_details
    ), current_user.id)
    db.commit()
    
    return db_pallet


@router.post("/dispatch", response_model=Pallet)
async def dispatch_pallet_endpoint(
    dispatch: PalletDispatch,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(UserRole.WAREHOUSE, UserRole.SUPERVISOR, UserRole.ADMIN))
):
    pallet = get_pallet_by_pallet_id(db, dispatch.pallet_id)
    if not pallet:
        raise HTTPException(status_code=404, detail="Pallet not found")
    
    if pallet.status == PalletStatus.DISPATCHED:
        raise HTTPException(status_code=400, detail="Pallet has already been dispatched")

    if pallet.load_type == LoadType.STORAGE and pallet.status != PalletStatus.RELEASED:
        raise HTTPException(status_code=400, detail="STORAGE pallets must be RELEASED before dispatch")
    
    if pallet.load_type == LoadType.DIRECT_OUT and pallet.status != PalletStatus.DISPATCH_READY:
        raise HTTPException(status_code=400, detail="DIRECT_OUT pallets must be DISPATCH_READY")
    
    previous_status = pallet.status
    previous_location_id = pallet.current_location_id
    db_pallet = dispatch_pallet(db, pallet.id, current_user.id)
    
    # Update location as not occupied
    if previous_location_id:
        from app.crud.location import get_location
        previous_location = get_location(db, previous_location_id)
        if previous_location:
            previous_location.occupied = False
    
    # Create transaction
    create_transaction(db, TransactionCreate(
        pallet_id=db_pallet.id,
        action="DISPATCHED",
        previous_status=previous_status.value,
        new_status=PalletStatus.DISPATCHED.value,
        from_location_id=previous_location_id
    ), current_user.id)
    db.commit()
    
    return db_pallet


@router.get("/overdue/list", response_model=List[Pallet])
async def get_overdue_list(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(UserRole.SUPERVISOR, UserRole.ADMIN))
):
    refresh_release_eligibility(db, current_user.id)
    return get_overdue_pallets(db)


@router.get("/qc-pending", response_model=List[Pallet])
async def get_qc_pending(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(UserRole.QC, UserRole.SUPERVISOR, UserRole.ADMIN))
):
    return get_pallets_by_status(db, PalletStatus.QC_HOLD)


@router.post("/qc-approve", response_model=Pallet)
async def qc_approve_pallet(
    pallet_scan: PalletScan,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(UserRole.QC, UserRole.SUPERVISOR, UserRole.ADMIN))
):
    pallet = get_pallet_by_pallet_id(db, pallet_scan.pallet_id)
    if not pallet:
        raise HTTPException(status_code=404, detail="Pallet not found")
    
    if pallet.status != PalletStatus.QC_HOLD:
        raise HTTPException(status_code=400, detail="Pallet must be in QC_HOLD status to approve")
    
    previous_status = pallet.status
    pallet.status = PalletStatus.RELEASE_ELIGIBLE
    
    # Create transaction
    create_transaction(db, TransactionCreate(
        pallet_id=pallet.id,
        action="QC_APPROVED",
        previous_status=previous_status.value,
        new_status=PalletStatus.RELEASE_ELIGIBLE.value
    ), current_user.id)
    db.commit()
    
    return pallet


@router.post("/qc-reject", response_model=Pallet)
async def qc_reject_pallet(
    decision: PalletQCDecision,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(UserRole.QC, UserRole.SUPERVISOR, UserRole.ADMIN))
):
    pallet = get_pallet_by_pallet_id(db, decision.pallet_id)
    if not pallet:
        raise HTTPException(status_code=404, detail="Pallet not found")
    
    if pallet.status != PalletStatus.QC_HOLD:
        raise HTTPException(status_code=400, detail="Pallet must be in QC_HOLD status to reject")
    
    if not decision.reason or not decision.reason.strip():
        raise HTTPException(status_code=400, detail="Rejection reason is required")
    
    previous_status = pallet.status
    pallet.status = PalletStatus.QUARANTINE
    pallet.hold_reason = "QC Rejection"
    pallet.hold_reason_details = decision.reason.strip()
    
    # Create transaction
    create_transaction(db, TransactionCreate(
        pallet_id=pallet.id,
        action="QC_REJECTED",
        previous_status=previous_status.value,
        new_status=PalletStatus.QUARANTINE.value,
        reason="QC Rejection",
        notes=decision.reason.strip()
    ), current_user.id)
    db.commit()
    
    return pallet


@router.post("/qc-hold", response_model=Pallet)
async def qc_hold_pallet(
    decision: PalletQCDecision,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(UserRole.QC, UserRole.ADMIN))
):
    pallet = get_pallet_by_pallet_id(db, decision.pallet_id)
    if not pallet:
        raise HTTPException(status_code=404, detail="Pallet not found")
    
    if pallet.status != PalletStatus.IN_RACK_HOLD:
        raise HTTPException(status_code=400, detail="Pallet must be in IN_RACK_HOLD status to place on QC hold")
    
    if not decision.reason or not decision.reason.strip():
        raise HTTPException(status_code=400, detail="Hold reason is required")
    
    previous_status = pallet.status
    pallet.status = PalletStatus.QC_HOLD
    pallet.hold_reason = "QC Hold"
    pallet.hold_reason_details = decision.reason.strip()
    
    # Create transaction
    create_transaction(db, TransactionCreate(
        pallet_id=pallet.id,
        action="QC_HOLD",
        previous_status=previous_status.value,
        new_status=PalletStatus.QC_HOLD.value,
        reason="QC Hold",
        notes=decision.reason.strip()
    ), current_user.id)
    db.commit()
    
    return pallet
