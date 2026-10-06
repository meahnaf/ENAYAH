import React, { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Location, Product, User, UserRole } from '../types';

type Section = 'users' | 'products' | 'locations' | 'settings';
type Settings = { storage_hold_period_hours: number; qc_hold_target_hours: number; warehouse_timezone: string };

const AdminPage: React.FC = () => {
  const [section, setSection] = useState<Section>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [settings, setSettings] = useState<Settings>({ storage_hold_period_hours: 48, qc_hold_target_hours: 24, warehouse_timezone: 'Asia/Riyadh' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [editingLocation, setEditingLocation] = useState<number | null>(null);

  const load = async () => {
    try {
      const [u, p, l, s] = await Promise.all([
        api.get<User[]>('/users/?limit=1000'), api.get<Product[]>('/products/?limit=1000'),
        api.get<Location[]>('/locations/?limit=1000'), api.get<Settings>('/settings/'),
      ]);
      setUsers(u.data); setProducts(p.data); setLocations(l.data); setSettings(s.data);
    } catch (err: any) { setError(err.response?.data?.detail || 'Could not load administration data'); }
  };

  useEffect(() => { void load(); }, []);

  const submit = async (event: FormEvent<HTMLFormElement>, action: (form: FormData) => Promise<void>) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try { await action(new FormData(event.currentTarget)); event.currentTarget.reset(); await load(); setNotice('Changes saved'); }
    catch (err: any) { setError(err.response?.data?.detail || 'Could not save changes'); }
    finally { setBusy(false); }
  };

  const toggleActive = async (kind: 'users' | 'products' | 'locations', id: number, active: boolean) => {
    setError(''); setNotice('');
    try {
      if (kind === 'users') await api.put(`/users/${id}`, { active });
      if (kind === 'products') await api.put(`/products/${id}`, { active });
      if (kind === 'locations') await api.put(`/locations/${id}`, { active });
      await load();
    } catch (err: any) { setError(err.response?.data?.detail || 'Could not update record'); }
  };

  const tabs: { id: Section; label: string }[] = [
    { id: 'users', label: 'Users' }, { id: 'products', label: 'Products' },
    { id: 'locations', label: 'Locations' }, { id: 'settings', label: 'Settings' },
  ];

  return <main className="admin-page">
    <div className="admin-heading"><div><h1>Administration</h1><p>Warehouse users, catalog, rack capacity, and operating rules</p></div><Link className="button button-warning" to="/qr">Print location QR codes</Link></div>
    <div className="admin-tabs" role="tablist" aria-label="Administration sections">
      {tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={section === tab.id} className={`admin-tab ${section === tab.id ? 'active' : ''}`} onClick={() => setSection(tab.id)}>{tab.label}</button>)}
    </div>
    {error && <div className="alert alert-error" role="alert">{error}</div>}{notice && <div className="alert alert-success" role="status">{notice}</div>}

    {section === 'users' && <section className="admin-section">
      <h2>{editingUser ? 'Edit user' : 'Add user'}</h2>
      <form key={`user-${editingUser ?? 'new'}`} className="admin-form" onSubmit={(e) => submit(e, async (f) => {
        const id = editingUser; const body: Record<string, unknown> = { name: f.get('name'), role: f.get('role'), active: true };
        if (f.get('password')) body.password = f.get('password');
        if (id) await api.put(`/users/${id}`, body);
        else await api.post('/users/', { employee_id: f.get('employee_id'), username: f.get('username'), name: f.get('name'), role: f.get('role'), password: f.get('password') });
        setEditingUser(null);
      })}>
        {!editingUser && <><input className="input" name="employee_id" placeholder="Employee ID" required /><input className="input" name="username" placeholder="Username" required /></>}
        <input className="input" name="name" placeholder="Full name" defaultValue={users.find((u) => u.id === editingUser)?.name || ''} required />
        <select className="input" name="role" defaultValue={users.find((u) => u.id === editingUser)?.role || UserRole.WAREHOUSE}>{Object.values(UserRole).map((role) => <option key={role} value={role}>{role}</option>)}</select>
        <input className="input" name="password" type="password" placeholder={editingUser ? 'New password (optional)' : 'Initial password (8-72 characters)'} minLength={8} maxLength={72} required={!editingUser} />
        <button className="button button-primary" disabled={busy}>{editingUser ? 'Save user' : 'Create user'}</button>{editingUser && <button className="button button-warning" type="button" onClick={() => setEditingUser(null)}>Cancel</button>}
      </form>
      <div className="admin-table-wrap"><table className="table"><thead><tr><th>Employee</th><th>Name</th><th>Username</th><th>Role</th><th>State</th><th>Actions</th></tr></thead><tbody>{users.map((u) => <tr key={u.id}><td>{u.employee_id}</td><td>{u.name}</td><td>{u.username}</td><td>{u.role}</td><td>{u.active ? 'Active' : 'Inactive'}</td><td><button className="button button-warning" onClick={() => setEditingUser(u.id)}>Edit</button> <button className="button" onClick={() => void toggleActive('users', u.id, !u.active)}>{u.active ? 'Deactivate' : 'Activate'}</button></td></tr>)}</tbody></table></div>
    </section>}

    {section === 'products' && <section className="admin-section">
      <h2>{editingProduct ? 'Edit product' : 'Add product'}</h2>
      <form key={`product-${editingProduct ?? 'new'}`} className="admin-form" onSubmit={(e) => submit(e, async (f) => {
        const id = editingProduct; const body = { product_name: f.get('product_name'), description: f.get('description') };
        if (id) await api.put(`/products/${id}`, body); else await api.post('/products/', { product_code: f.get('product_code'), ...body });
        setEditingProduct(null);
      })}>
        {!editingProduct && <input className="input" name="product_code" placeholder="Product code" required />}
        <input className="input" name="product_name" placeholder="Product name" defaultValue={products.find((p) => p.id === editingProduct)?.product_name || ''} required />
        <input className="input" name="description" placeholder="Description" defaultValue={products.find((p) => p.id === editingProduct)?.description || ''} />
        <button className="button button-primary" disabled={busy}>{editingProduct ? 'Save product' : 'Create product'}</button>{editingProduct && <button className="button button-warning" type="button" onClick={() => setEditingProduct(null)}>Cancel</button>}
      </form>
      <div className="admin-table-wrap"><table className="table"><thead><tr><th>Code</th><th>Name</th><th>Description</th><th>State</th><th>Actions</th></tr></thead><tbody>{products.map((p) => <tr key={p.id}><td>{p.product_code}</td><td>{p.product_name}</td><td>{p.description}</td><td>{p.active ? 'Active' : 'Inactive'}</td><td><button className="button button-warning" onClick={() => setEditingProduct(p.id)}>Edit</button> <button className="button" onClick={() => void toggleActive('products', p.id, !p.active)}>{p.active ? 'Deactivate' : 'Activate'}</button></td></tr>)}</tbody></table></div>
    </section>}

    {section === 'locations' && <section className="admin-section">
      <h2>{editingLocation ? 'Edit location' : 'Add location'}</h2>
      <form key={`location-${editingLocation ?? 'new'}`} className="admin-form" onSubmit={(e) => submit(e, async (f) => {
        const id = editingLocation;
        const body = { zone: f.get('zone') || null, rack: f.get('rack') || null, level: f.get('level') || null, position: f.get('position') || null, location_type: f.get('location_type') };
        if (id) await api.put(`/locations/${id}`, body); else await api.post('/locations/', { location_code: f.get('location_code'), ...body });
        setEditingLocation(null);
      })}>
        {!editingLocation && <input className="input" name="location_code" placeholder="Location code, e.g. A-01-01" required />}
        <input className="input" name="zone" placeholder="Zone" defaultValue={locations.find((l) => l.id === editingLocation)?.zone || ''} />
        <input className="input" name="rack" placeholder="Rack" defaultValue={locations.find((l) => l.id === editingLocation)?.rack || ''} />
        <input className="input" name="level" placeholder="Level" defaultValue={locations.find((l) => l.id === editingLocation)?.level || ''} />
        <input className="input" name="position" placeholder="Position" defaultValue={locations.find((l) => l.id === editingLocation)?.position || ''} />
        <select className="input" name="location_type" defaultValue={locations.find((l) => l.id === editingLocation)?.location_type || 'RACK'}>{['RACK', 'FLOOR', 'STAGING', 'DISPATCH', 'QUARANTINE'].map((type) => <option key={type}>{type}</option>)}</select>
        <button className="button button-primary" disabled={busy}>{editingLocation ? 'Save location' : 'Create location'}</button>{editingLocation && <button className="button button-warning" type="button" onClick={() => setEditingLocation(null)}>Cancel</button>}
      </form>
      <div className="admin-table-wrap"><table className="table"><thead><tr><th>Code</th><th>Zone / Rack</th><th>Level / Position</th><th>Type</th><th>Occupancy</th><th>State</th><th>Actions</th></tr></thead><tbody>{locations.map((l) => <tr key={l.id}><td>{l.location_code}</td><td>{l.zone || '-'} / {l.rack || '-'}</td><td>{l.level || '-'} / {l.position || '-'}</td><td>{l.location_type}</td><td>{l.occupied ? 'Occupied' : 'Available'}</td><td>{l.active ? 'Active' : 'Inactive'}</td><td><button className="button button-warning" onClick={() => setEditingLocation(l.id)}>Edit</button> <button className="button" disabled={!l.active && l.occupied} onClick={() => void toggleActive('locations', l.id, !l.active)}>{l.active ? 'Deactivate' : 'Activate'}</button> <a className="button" href={`${import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8000`}/qr/locations/${l.id}/qr`} target="_blank" rel="noreferrer">QR</a></td></tr>)}</tbody></table></div>
    </section>}

    {section === 'settings' && <section className="admin-section admin-settings"><h2>Warehouse operating settings</h2><form className="admin-form" onSubmit={(e) => submit(e, async (f) => {
      const body = { storage_hold_period_hours: Number(f.get('storage_hold_period_hours')), qc_hold_target_hours: Number(f.get('qc_hold_target_hours')), warehouse_timezone: String(f.get('warehouse_timezone')) };
      const response = await api.put<Settings>('/settings/', body); setSettings(response.data);
    })}>
      <label>Storage hold period (hours)<input className="input" type="number" name="storage_hold_period_hours" min={1} max={720} value={settings.storage_hold_period_hours} onChange={(e) => setSettings({ ...settings, storage_hold_period_hours: Number(e.target.value) })} required /></label>
      <label>QC target (hours)<input className="input" type="number" name="qc_hold_target_hours" min={1} max={720} value={settings.qc_hold_target_hours} onChange={(e) => setSettings({ ...settings, qc_hold_target_hours: Number(e.target.value) })} required /></label>
      <label>Warehouse timezone<input className="input" name="warehouse_timezone" value={settings.warehouse_timezone} onChange={(e) => setSettings({ ...settings, warehouse_timezone: e.target.value })} placeholder="Asia/Riyadh" required /></label>
      <button className="button button-primary" disabled={busy}>Save settings</button>
    </form></section>}
  </main>;
};

export default AdminPage;
