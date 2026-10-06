import React, { useState } from 'react';
import { Pallet } from '../types';
import CameraScanner from '../components/CameraScanner';
import { palletService } from '../services/pallets';

const holdReasons = [
  'Awaiting QC',
  'Documentation Issue',
  'Quality Investigation',
  'Production Issue',
  'Customer Requirement',
  'System Issue',
  'Other',
];

const ReleaseScanPage: React.FC = () => {
  const [palletId, setPalletId] = useState('');
  const [pallet, setPallet] = useState<Pallet | null>(null);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const overdue = !!pallet?.expected_release_datetime && Date.now() > new Date(pallet.expected_release_datetime).getTime();

  const findPallet = async (value = palletId) => {
    if (!value.trim() || busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await palletService.scanPallet(value.trim());
      setPallet(result);
      setPalletId(result.pallet_id);
      if (result.load_type !== 'STORAGE' || !['IN_RACK_HOLD', 'RELEASE_ELIGIBLE'].includes(result.status)) {
        setError('This pallet is not currently eligible for the storage release workflow.');
      }
    } catch (err: any) {
      setPallet(null);
      setError(err.response?.data?.detail || 'Pallet not found');
    } finally {
      setBusy(false);
    }
  };

  const confirmRelease = async () => {
    if (!pallet || busy) return;
    if (overdue && (!reason || (reason === 'Other' && !details.trim()))) {
      setError('Select a hold reason. Other also requires details.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const released = await palletService.releasePallet({
        pallet_id: pallet.pallet_id,
        hold_reason: overdue ? reason : undefined,
        hold_reason_details: overdue ? details.trim() || undefined : undefined,
      });
      setPallet(released);
      setMessage(`Released at ${new Date(released.actual_release_datetime || Date.now()).toLocaleString()}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Release failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main>
      <h1>Scan Release</h1>
      <section className="card">
        <CameraScanner enabled={!busy && !pallet} onScan={(value) => { setPalletId(value); void findPallet(value); }} />
        <div className="form-group">
          <label className="label" htmlFor="release-pallet-id">Pallet ID</label>
          <input id="release-pallet-id" className="input" value={palletId} onChange={(event) => setPalletId(event.target.value)} placeholder="Scan or enter pallet ID" />
        </div>
        <button type="button" className="button button-primary" onClick={() => void findPallet()} disabled={busy || !palletId.trim()}>
          {busy ? 'Loading...' : 'Find pallet'}
        </button>
      </section>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {message && <div className="alert alert-success" role="status">{message}</div>}
      {pallet && (
        <section className="card">
          <h2>{pallet.pallet_id}</h2>
          <dl className="detail-grid">
            <div><dt>Batch</dt><dd>{pallet.batch_number || 'N/A'}</dd></div>
            <div><dt>Product</dt><dd>{pallet.product?.product_name || 'N/A'}</dd></div>
            <div><dt>Quantity</dt><dd>{pallet.quantity ?? 'N/A'}</dd></div>
            <div><dt>Status</dt><dd>{pallet.status}</dd></div>
            <div><dt>Location</dt><dd>{pallet.current_location?.location_code || 'N/A'}</dd></div>
            <div><dt>Put away</dt><dd>{pallet.putaway_datetime ? new Date(pallet.putaway_datetime).toLocaleString() : 'N/A'}</dd></div>
            <div><dt>Expected release</dt><dd>{pallet.expected_release_datetime ? new Date(pallet.expected_release_datetime).toLocaleString() : 'N/A'}</dd></div>
            <div><dt>Hold duration</dt><dd>{pallet.putaway_datetime ? `${Math.max(0, Math.floor((Date.now() - new Date(pallet.putaway_datetime).getTime()) / 3600000))} hours` : 'N/A'}</dd></div>
            <div><dt>Hold reason</dt><dd>{pallet.hold_reason_details || pallet.hold_reason || 'None'}</dd></div>
          </dl>
          {overdue && !pallet.actual_release_datetime && (
            <div className="form-group">
              <label className="label" htmlFor="release-reason">Overdue hold reason</label>
              <select id="release-reason" className="input" value={reason} onChange={(event) => setReason(event.target.value)}>
                <option value="">Select reason</option>
                {holdReasons.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              {reason === 'Other' && <textarea className="input" value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Explain the reason" rows={3} />}
            </div>
          )}
          {!pallet.actual_release_datetime && (
            <button type="button" className="button button-success" onClick={() => void confirmRelease()} disabled={busy || !['IN_RACK_HOLD', 'RELEASE_ELIGIBLE'].includes(pallet.status)}>
              {busy ? 'Releasing...' : 'Confirm release'}
            </button>
          )}
          <button type="button" className="button button-warning" onClick={() => { setPallet(null); setPalletId(''); setReason(''); setDetails(''); setMessage(''); setError(''); }}>
            Scan another pallet
          </button>
        </section>
      )}
    </main>
  );
};

export default ReleaseScanPage;
