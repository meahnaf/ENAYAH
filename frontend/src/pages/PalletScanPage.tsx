import React, { useState } from 'react';
import { Pallet, LoadType, PalletStatus } from '../types';
import { palletService } from '../services/pallets';
import CameraScanner from '../components/CameraScanner';

const PalletScanPage: React.FC = () => {
  const [palletId, setPalletId] = useState('');
  const [pallet, setPallet] = useState<Pallet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [manualEntry, setManualEntry] = useState(false);

  const handleScan = async () => {
    if (!palletId.trim()) {
      setError('Please enter or scan a pallet ID');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const scannedPallet = await palletService.scanPallet(palletId);
      setPallet(scannedPallet);
      setSuccess(`Pallet ${palletId} scanned successfully`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to scan pallet');
    } finally {
      setLoading(false);
    }
  };

  const handleWrap = async () => {
    if (!pallet) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const wrappedPallet = await palletService.wrapPallet(pallet.pallet_id);
      setPallet(wrappedPallet);
      setSuccess('Pallet marked as wrapped');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to wrap pallet');
    } finally {
      setLoading(false);
    }
  };

  const handleReadyForPutaway = async () => {
    if (!pallet) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const readyPallet = await palletService.markReadyForPutaway(pallet.pallet_id);
      setPallet(readyPallet);
      setSuccess('Pallet marked as ready for put-away');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to mark ready for put-away');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = async () => {
    if (!palletId.trim()) {
      setError('Please enter a pallet ID');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const newPallet = await palletService.createPallet({
        pallet_id: palletId,
        load_type: LoadType.STORAGE,
      });
      setPallet(newPallet);
      setSuccess(`Pallet ${palletId} created successfully`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create pallet');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPalletId('');
    setPallet(null);
    setError('');
    setSuccess('');
  };

  const getStatusBadgeClass = (status: PalletStatus) => {
    switch (status) {
      case PalletStatus.RECEIVED:
      case PalletStatus.SCANNED:
        return 'badge-info';
      case PalletStatus.WRAPPED:
        return 'badge-warning';
      case PalletStatus.READY_FOR_PUTAWAY:
        return 'badge-success';
      case PalletStatus.IN_RACK_HOLD:
        return 'badge-info';
      case PalletStatus.RELEASED:
      case PalletStatus.DISPATCHED:
        return 'badge-success';
      default:
        return 'badge-warning';
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: '30px' }}>Scan Pallet</h1>

      <div className="card">
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => setManualEntry(!manualEntry)}
            className="button button-primary"
          >
            {manualEntry ? 'Use Scanner' : 'Manual Entry'}
          </button>
        </div>

        {manualEntry ? (
          <div className="form-group">
            <label className="label">Pallet ID</label>
            <input
              type="text"
              className="input"
              value={palletId}
              onChange={(e) => setPalletId(e.target.value)}
              placeholder="Enter pallet ID manually"
            />
          </div>
        ) : (
          <>
            <CameraScanner enabled={!manualEntry} onScan={setPalletId} />
            <div className="form-group">
              <label className="label">Scanned pallet ID</label>
              <input className="input" value={palletId} onChange={(e) => setPalletId(e.target.value)} placeholder="Scan a code or enter pallet ID" />
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button
            onClick={handleScan}
            className="button button-primary"
            disabled={loading}
          >
            {loading ? 'Scanning...' : 'Scan'}
          </button>
          <button
            onClick={handleCreateNew}
            className="button button-success"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create New'}
          </button>
          <button
            onClick={resetForm}
            className="button button-warning"
            disabled={loading}
          >
            Reset
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
      </div>

      {pallet && (
        <div className="card">
          <h2 style={{ marginBottom: '20px' }}>Pallet Details</h2>
          
          <div className="grid grid-2" style={{ marginBottom: '20px' }}>
            <div>
              <label className="label">Pallet ID</label>
              <div style={{ fontSize: '18px', fontWeight: '600' }}>{pallet.pallet_id}</div>
            </div>
            <div>
              <label className="label">Status</label>
              <span className={`badge ${getStatusBadgeClass(pallet.status)}`}>
                {pallet.status}
              </span>
            </div>
            <div>
              <label className="label">Load Type</label>
              <div>{pallet.load_type}</div>
            </div>
            <div>
              <label className="label">Batch Number</label>
              <div>{pallet.batch_number || 'N/A'}</div>
            </div>
            <div>
              <label className="label">Quantity</label>
              <div>{pallet.quantity || 'N/A'}</div>
            </div>
            <div>
              <label className="label">Received</label>
              <div>{pallet.received_datetime ? new Date(pallet.received_datetime).toLocaleString() : 'N/A'}</div>
            </div>
          </div>

          {pallet.status === PalletStatus.RECEIVED || pallet.status === PalletStatus.SCANNED ? (
            <button
              onClick={handleWrap}
              className="button button-success"
              style={{ fontSize: '18px', padding: '16px 32px' }}
              disabled={loading}
            >
              Mark as Wrapped
            </button>
          ) : null}

          {pallet.status === PalletStatus.WRAPPED ? (
            <button
              onClick={handleReadyForPutaway}
              className="button button-success"
              style={{ fontSize: '18px', padding: '16px 32px' }}
              disabled={loading}
            >
              Mark Ready for Put-away
            </button>
          ) : null}

          {pallet.status === PalletStatus.READY_FOR_PUTAWAY ? (
            <div className="alert alert-success">
              Pallet is ready for put-away. Forklift operator will handle put-away.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default PalletScanPage;
