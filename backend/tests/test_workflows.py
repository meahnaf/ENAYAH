from datetime import datetime, timedelta, timezone

from app.models.pallet import Pallet
from app.models.transaction import Transaction


def test_storage_receiving_putaway_due_release_and_dispatch(client, auth, db_session):
    headers = auth("warehouse")
    received = client.post("/pallets/", headers=headers, json={
        "pallet_id": "PAL-STORAGE-1", "product_id": 1, "load_number": "LOAD-1", "quantity": 12,
        "load_type": "STORAGE",
    })
    assert received.status_code == 200, received.text
    assert received.json()["status"] == "RECEIVED"

    scanned = client.post("/pallets/scan", headers=headers, json={"pallet_id": "PAL-STORAGE-1"})
    assert scanned.status_code == 200
    wrapped = client.post("/pallets/wrap", headers=headers, json={"pallet_id": "PAL-STORAGE-1"})
    assert wrapped.status_code == 200
    ready = client.post("/pallets/ready-putaway", headers=headers, json={"pallet_id": "PAL-STORAGE-1"})
    assert ready.status_code == 200, ready.text
    assigned_qr = ready.json()["assigned_location"]["qr_code_value"]

    wrong_qr = "QR-RACK-B" if assigned_qr != "QR-RACK-B" else "QR-RACK-A"
    wrong = client.post("/pallets/putaway", headers=auth("forklift"), json={
        "pallet_id": "PAL-STORAGE-1", "scanned_location_qr": wrong_qr,
    })
    assert wrong.status_code == 400
    putaway = client.post("/pallets/putaway", headers=auth("forklift"), json={
        "pallet_id": "PAL-STORAGE-1", "scanned_location_qr": assigned_qr,
    })
    assert putaway.status_code == 200, putaway.text
    assert putaway.json()["status"] == "IN_RACK_HOLD"

    pallet = db_session.query(Pallet).filter_by(pallet_id="PAL-STORAGE-1").one()
    pallet.expected_release_datetime = datetime.now(timezone.utc) - timedelta(minutes=1)
    db_session.commit()

    # An authenticated refresh records eligibility but does not release stock.
    listed = client.get("/pallets/", headers=auth("supervisor"))
    assert listed.status_code == 200
    pallet_data = next(p for p in listed.json() if p["pallet_id"] == "PAL-STORAGE-1")
    assert pallet_data["status"] == "RELEASE_ELIGIBLE"
    assert pallet_data["actual_release_datetime"] is None
    db_session.expire_all()
    assert db_session.query(Pallet).filter_by(pallet_id="PAL-STORAGE-1").one().status.value == "RELEASE_ELIGIBLE"

    missing_reason = client.post("/pallets/release", headers=auth("supervisor"), json={"pallet_id": "PAL-STORAGE-1"})
    assert missing_reason.status_code == 400
    release = client.post("/pallets/release", headers=auth("supervisor"), json={
        "pallet_id": "PAL-STORAGE-1", "hold_reason": "Awaiting QC",
    })
    assert release.status_code == 200, release.text
    assert release.json()["status"] == "RELEASED"
    assert release.json()["actual_release_datetime"]

    dispatched = client.post("/pallets/dispatch", headers=auth("warehouse"), json={"pallet_id": "PAL-STORAGE-1"})
    assert dispatched.status_code == 200, dispatched.text
    duplicate = client.post("/pallets/dispatch", headers=auth("warehouse"), json={"pallet_id": "PAL-STORAGE-1"})
    assert duplicate.status_code == 400
    actions = [row.action for row in db_session.query(Transaction).order_by(Transaction.id).all()]
    assert actions == ['RECEIVED', 'SCANNED', 'WRAPPED', 'READY_FOR_PUTAWAY', 'PUTAWAY', 'RELEASE_ELIGIBLE', 'HOLD_REASON_ADDED', 'RELEASED', 'DISPATCHED']


def test_direct_out_bypasses_storage_and_dispatches_once(client, auth):
    received = client.post("/pallets/", headers=auth("warehouse"), json={
        "pallet_id": "PAL-DIRECT-1", "load_number": "LOAD-DIRECT", "load_type": "DIRECT_OUT",
    })
    assert received.status_code == 200, received.text
    assert received.json()["status"] == "DISPATCH_READY"
    assert received.json()["assigned_location_id"] is None

    dispatched = client.post("/pallets/dispatch", headers=auth("warehouse"), json={"pallet_id": "PAL-DIRECT-1"})
    assert dispatched.status_code == 200, dispatched.text
    assert dispatched.json()["status"] == "DISPATCHED"


def test_roles_and_qc_rejection_reason(client, auth, db_session):
    denied = client.post("/pallets/", headers=auth("forklift"), json={"pallet_id": "NO-PERM", "load_type": "STORAGE"})
    assert denied.status_code == 403

    received = client.post("/pallets/", headers=auth("warehouse"), json={
        "pallet_id": "PAL-QC-1", "load_type": "STORAGE",
    })
    assert received.status_code == 200

    # Put a seeded test pallet into QC hold to exercise a reason-required rejection.
    pallet = db_session.query(Pallet).filter_by(pallet_id="PAL-QC-1").one()
    from app.models.pallet import PalletStatus
    pallet.status = PalletStatus.QC_HOLD
    db_session.commit()

    no_reason = client.post("/pallets/qc-reject", headers=auth("qc"), json={"pallet_id": "PAL-QC-1"})
    assert no_reason.status_code == 400
    reject = client.post("/pallets/qc-reject", headers=auth("qc"), json={"pallet_id": "PAL-QC-1", "reason": "Damaged wrap"})
    assert reject.status_code == 200, reject.text
    assert reject.json()["status"] == "QUARANTINE"


def test_qc_hold_then_approve_and_release_requires_authorized_role(client, auth, db_session):
    received = client.post('/pallets/', headers=auth('warehouse'), json={'pallet_id': 'PAL-QC-APPROVE', 'load_type': 'STORAGE'})
    assert received.status_code == 200
    pallet = db_session.query(Pallet).filter_by(pallet_id='PAL-QC-APPROVE').one()
    from app.models.pallet import PalletStatus
    pallet.status = PalletStatus.IN_RACK_HOLD
    db_session.commit()

    held = client.post('/pallets/qc-hold', headers=auth('qc'), json={'pallet_id': 'PAL-QC-APPROVE', 'reason': 'Needs inspection'})
    assert held.status_code == 200 and held.json()['status'] == 'QC_HOLD'
    approved = client.post('/pallets/qc-approve', headers=auth('qc'), json={'pallet_id': 'PAL-QC-APPROVE'})
    assert approved.status_code == 200 and approved.json()['status'] == 'RELEASE_ELIGIBLE'
    denied_release = client.post('/pallets/release', headers=auth('warehouse'), json={'pallet_id': 'PAL-QC-APPROVE'})
    assert denied_release.status_code == 403
    released = client.post('/pallets/release', headers=auth('supervisor'), json={'pallet_id': 'PAL-QC-APPROVE'})
    assert released.status_code == 200 and released.json()['actual_release_datetime']
