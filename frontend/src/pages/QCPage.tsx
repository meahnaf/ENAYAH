import React, { useEffect, useState } from 'react';
import { Pallet, PalletStatus } from '../types';
import { palletService } from '../services/pallets';

const QCPage: React.FC = () => {
  const [qcPending, setQcPending] = useState<Pallet[]>([]);
  const [rackStock, setRackStock] = useState<Pallet[]>([]);
  const [selectedPallet, setSelectedPallet] = useState<Pallet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    loadQcPending();
  }, []);

  const loadQcPending = async () => {
    try {
      const data = await palletService.getPallets({ status: PalletStatus.QC_HOLD });
      setQcPending(data);
      const held = await palletService.getPallets({ status: PalletStatus.IN_RACK_HOLD });
      setRackStock(held);
    } catch (err: any) {
      setError('Failed to load QC pending pallets');
    }
  };

  const handleHold = async () => {
    if (!selectedPallet || !reason.trim()) {
      setError('Please provide a hold reason');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await palletService.qcHoldPallet(selectedPallet.pallet_id, reason.trim());
      setSuccess(`Pallet ${selectedPallet.pallet_id} placed on QC hold`);
      setSelectedPallet(null);
      setReason('');
      loadQcPending();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to place pallet on QC hold');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedPallet) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await palletService.qcApprovePallet(selectedPallet.pallet_id);
      setSuccess(`Pallet ${selectedPallet.pallet_id} approved`);
      setSelectedPallet(null);
      setReason('');
      loadQcPending();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to approve pallet');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPallet || !reason.trim()) {
      setError('Please provide a rejection reason');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await palletService.qcRejectPallet(selectedPallet.pallet_id, reason);
      setSuccess(`Pallet ${selectedPallet.pallet_id} rejected and quarantined`);
      setSelectedPallet(null);
      setReason('');
      loadQcPending();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reject pallet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: '30px' }}>QC Management</h1>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="grid grid-2">
        <div className="card">
          <h2 style={{ marginBottom: '20px' }}>QC Pending ({qcPending.length})</h2>
          
          {qcPending.length === 0 ? (
            <div className="empty-state">No pallets pending QC review</div>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {qcPending.map((pallet) => (
                <div
                  key={pallet.id}
                  onClick={() => setSelectedPallet(pallet)}
                  style={{
                    padding: '12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    cursor: 'pointer',
                    backgroundColor: selectedPallet?.id === pallet.id ? '#dbeafe' : 'white',
                  }}
                >
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>{pallet.pallet_id}</div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    Batch: {pallet.batch_number || 'N/A'} | Qty: {pallet.quantity || 'N/A'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                    Hold Reason: {pallet.hold_reason || 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 style={{ marginBottom: '20px' }}>On-rack stock ({rackStock.length})</h2>
          {rackStock.length === 0 ? <div className="empty-state">No stock on rack</div> : rackStock.map((pallet) => (
            <button key={pallet.id} type="button" onClick={() => { setSelectedPallet(pallet); setReason(''); }} className="button button-warning" style={{ display: 'block', width: '100%', marginBottom: 8 }}>
              {pallet.pallet_id} · {pallet.current_location?.location_code || 'Location unknown'}
            </button>
          ))}
        </div>

        <div className="card">
          <h2 style={{ marginBottom: '20px' }}>QC Actions</h2>
          
          {!selectedPallet ? (
            <div className="empty-state">Select a pallet to perform QC actions</div>
          ) : (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <label className="label">Selected Pallet</label>
                <div style={{ fontSize: '18px', fontWeight: '600' }}>{selectedPallet.pallet_id}</div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  Batch: {selectedPallet.batch_number || 'N/A'} | Qty: {selectedPallet.quantity || 'N/A'}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  Location: {selectedPallet.current_location?.location_code || 'N/A'}
                </div>
              </div>

              <div className="form-group">
                <label className="label">Reason (for reject/hold)</label>
                <textarea
                  className="input"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for rejection or hold..."
                  rows={3}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {selectedPallet.status === PalletStatus.QC_HOLD ? <>
                  <button onClick={handleApprove} className="button button-success" disabled={loading}>
                    {loading ? 'Processing...' : 'Approve'}
                  </button>
                  <button onClick={handleReject} className="button button-danger" disabled={loading || !reason.trim()}>
                    {loading ? 'Processing...' : 'Reject'}
                  </button>
                </> : <button onClick={handleHold} className="button button-warning" disabled={loading || !reason.trim()}>
                  {loading ? 'Processing...' : 'Place on QC hold'}
                </button>}
                <button
                  onClick={() => setSelectedPallet(null)}
                  className="button button-warning"
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QCPage;
