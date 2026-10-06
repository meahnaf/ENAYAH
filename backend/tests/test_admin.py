from app.models.location import Location, LocationType
from app.models.pallet import Pallet, PalletStatus
from app.models.setting import SystemSetting
from app.models.user import User, UserRole


def test_admin_management_and_role_boundaries(client, auth, db_session):
    denied = client.get('/users/', headers=auth('supervisor'))
    assert denied.status_code == 403

    created = client.post('/users/', headers=auth('admin'), json={
        'employee_id': 'E-NEW', 'username': 'new-worker', 'name': 'New Worker',
        'role': 'WAREHOUSE', 'password': 'safe-password-1',
    })
    assert created.status_code == 200, created.text
    assert 'password' not in created.json()
    new_user_id = created.json()['id']

    login = client.post('/auth/login', data={'username': 'new-worker', 'password': 'safe-password-1'})
    assert login.status_code == 200
    wrong_password = client.post('/auth/login', data={'username': 'new-worker', 'password': 'incorrect-password'})
    assert wrong_password.status_code == 401

    edited = client.put(f'/users/{new_user_id}', headers=auth('admin'), json={'active': False})
    assert edited.status_code == 200 and edited.json()['active'] is False
    inactive_login = client.post('/auth/login', data={'username': 'new-worker', 'password': 'safe-password-1'})
    assert inactive_login.status_code == 401
    unknown_login = client.post('/auth/login', data={'username': 'missing', 'password': 'safe-password-1'})
    assert unknown_login.status_code == 401

    admin = db_session.query(User).filter_by(username='admin').one()
    last_admin = client.put(f'/users/{admin.id}', headers=auth('admin'), json={'active': False})
    assert last_admin.status_code == 409

    product = client.post('/products/', headers=auth('admin'), json={
        'product_code': 'SKU-NEW', 'product_name': 'New product', 'description': 'Test item',
    })
    assert product.status_code == 200, product.text
    product_id = product.json()['id']
    assert client.put(f'/products/{product_id}', headers=auth('admin'), json={'active': False}).json()['active'] is False

    location = client.post('/locations/', headers=auth('admin'), json={
        'location_code': 'Z-01-01', 'zone': 'Z', 'rack': '01', 'level': '01', 'position': '01', 'location_type': 'RACK',
    })
    assert location.status_code == 200, location.text
    location_id = location.json()['id']
    pallet = Pallet(pallet_id='PAL-ASSIGNED', load_type='STORAGE', status=PalletStatus.READY_FOR_PUTAWAY, assigned_location_id=location_id)
    db_session.add(pallet)
    db_session.commit()
    cannot_deactivate = client.put(f'/locations/{location_id}', headers=auth('admin'), json={'active': False})
    assert cannot_deactivate.status_code == 409


def test_admin_settings_are_validated_and_persisted(client, auth, db_session):
    denied = client.get('/settings/', headers=auth('warehouse'))
    assert denied.status_code == 403

    changed = client.put('/settings/', headers=auth('admin'), json={
        'storage_hold_period_hours': 36, 'qc_hold_target_hours': 18, 'warehouse_timezone': 'Asia/Riyadh',
    })
    assert changed.status_code == 200, changed.text
    assert client.get('/settings/', headers=auth('admin')).json()['storage_hold_period_hours'] == 36
    assert db_session.get(SystemSetting, 'qc_hold_target_hours').value == '18'

    invalid = client.put('/settings/', headers=auth('admin'), json={
        'storage_hold_period_hours': 0, 'qc_hold_target_hours': 18, 'warehouse_timezone': 'Not/AZone',
    })
    assert invalid.status_code == 422


def test_cors_uses_configured_local_origins(client):
    allowed = client.get('/health', headers={'Origin': 'http://localhost:3000'})
    assert allowed.headers.get('access-control-allow-origin') == 'http://localhost:3000'
    denied = client.get('/health', headers={'Origin': 'https://untrusted.example'})
    assert 'access-control-allow-origin' not in denied.headers
