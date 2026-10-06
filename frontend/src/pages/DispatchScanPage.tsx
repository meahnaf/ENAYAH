import React, { useState } from 'react';
import { Pallet, PalletStatus } from '../types';
import CameraScanner from '../components/CameraScanner';
import { palletService } from '../services/pallets';

const DispatchScanPage: React.FC = () => {
  const [palletId, setPalletId] = useState('');
  const [pallet, setPallet] = useState<Pallet | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const findPallet = async (value = palletId) => {
    if (!value.trim() || busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await palletService.scanPallet(value.trim());
      setPallet(result);
      setPalletId(result.pallet_id);
      if (result.load_type !== 'DIRECT_OUT' || result.status !== PalletStatus.DISPATCH_READY) {
        setError('Only DIRECT_OUT pallets in DISPATCH_READY can be dispatched here.');
      }
    } catch (err: any) {
      setPallet(null);
      setError(err.response?.data?.detail || 'Pallet not found');
    } finally {
      setBusy(false);
    }
  };

  const confirmDispatch = async () => {
    if (!pallet || busy) return;
    setBusy(true);
    setError('');
    try {
      const dispatched = await palletService.dispatchPallet(pallet.pallet_id);
      setPallet(dispatched);
      setMessage(`Dispatched at ${new Date(dispatched.dispatched_datetime || Date.now()).toLocaleString()}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Dispatch failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main>
      <h1>Direct Out Dispatch</h1>
      <section className="card">
        <CameraScanner enabled={!busy && !pallet} onScan={(value) => { setPalletId(value); void findPallet(value); }} />
        <div className="form-group">
          <label className="label" htmlFor="dispatch-pallet-id">Pallet ID</label>
          <input id="dispatch-pallet-id" className="input" value={palletId} onChange={(event) => setPalletId(event.target.value)} placeholder="Scan or enter pallet ID" />
        </div>
        <button type="button" className="button button-primary" onClick={() => void findPallet()} disabled={busy || !palletId.trim()}>{busy ? 'Loading...' : 'Find pallet'}</button>
      </section>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {message && <div className="alert alert-success" role="status">{message}</div>}
      {pallet && (
        <section className="card">
          <h2>{pallet.pallet_id}</h2>
          <p>{pallet.product?.product_name || 'Product unavailable'} · Batch {pallet.batch_number || 'N/A'} · Qty {pallet.quantity ?? 'N/A'}</p>
          <p>Status: {pallet.status}</p>
          {pallet.status === PalletStatus.DISPATCH_READY && (
            <button type="button" className="button button-success" onClick={() => void confirmDispatch()} disabled={busy}>{busy ? 'Dispatching...' : 'Confirm dispatch'}</button>
          )}
          <button type="button" className="button button-warning" onClick={() => { setPallet(null); setPalletId(''); setMessage(''); setError(''); }}>
            Scan another pallet
          </button>
        </section>
      )}
    </main>
  );
};

export default DispatchScanPage;
