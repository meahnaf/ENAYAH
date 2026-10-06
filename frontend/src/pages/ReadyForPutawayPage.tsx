import React, { useEffect, useState } from 'react';
import { Pallet, Location } from '../types';
import { palletService } from '../services/pallets';
import { locationService } from '../services/locations';
import CameraScanner from '../components/CameraScanner';

const ReadyForPutawayPage: React.FC = () => {
  const [queue, setQueue] = useState<Pallet[]>([]);
  const [availableLocations, setAvailableLocations] = useState<Location[]>([]);
  const [selectedPallet, setSelectedPallet] = useState<Pallet | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [scannedPalletId, setScannedPalletId] = useState('');
  const [scannedLocationQr, setScannedLocationQr] = useState('');
  const [scannerMode, setScannerMode] = useState<'pallet' | 'rack' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadQueue();
    loadAvailableLocations();
  }, []);

  const loadQueue = async () => {
    try {
      const data = await palletService.getReadyForPutawayQueue();
      setQueue(data);
    } catch (err: any) {
      setError('Failed to load queue');
    }
  };

  const loadAvailableLocations = async () => {
    try {
      const data = await locationService.getAvailableLocations('RACK');
      setAvailableLocations(data);
    } catch (err: any) {
      setError('Failed to load locations');
    }
  };

  const handlePutaway = async () => {
    if (!selectedPallet || !selectedLocation || scannedPalletId.trim() !== selectedPallet.pallet_id || !scannedLocationQr.trim()) {
      setError('Scan the selected pallet and its assigned rack QR code before confirming');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await palletService.putawayPallet({
        pallet_id: selectedPallet.pallet_id,
        scanned_location_qr: scannedLocationQr,
      });
      
      setSuccess(`Pallet ${selectedPallet.pallet_id} put away at ${selectedLocation.location_code}`);
      setSelectedPallet(null);
      setSelectedLocation(null);
      setScannedPalletId('');
      setScannedLocationQr('');
      
      // Reload queue and locations
      loadQueue();
      loadAvailableLocations();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to put away pallet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: '30px' }}>Ready for Put-away</h1>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h2 style={{ marginBottom: '16px' }}>Scan pallet and rack</h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button type="button" className={`button ${scannerMode === 'pallet' ? 'button-primary' : 'button-warning'}`} onClick={() => setScannerMode(scannerMode === 'pallet' ? null : 'pallet')}>Scan pallet</button>
          <button type="button" className={`button ${scannerMode === 'rack' ? 'button-primary' : 'button-warning'}`} onClick={() => setScannerMode(scannerMode === 'rack' ? null : 'rack')}>Scan rack</button>
        </div>
        <CameraScanner enabled={scannerMode !== null && !loading} onScan={(value) => {
          if (scannerMode === 'pallet') {
            const match = queue.find((item) => item.pallet_id === value);
            setScannedPalletId(value);
            if (match) {
              setSelectedPallet(match);
              setScannerMode('rack');
              setError('');
            } else setError('Pallet is not in the ready-for-putaway queue');
            return;
          }
          if (scannerMode === 'rack') {
            setScannedLocationQr(value);
            void palletService.resolveLocationQr(value).then((location) => {
              setSelectedLocation(location);
              const expected = selectedPallet?.assigned_location?.location_code;
              if (expected && expected !== location.location_code) setError(`WRONG LOCATION. Expected ${expected}; scanned ${location.location_code}.`);
              else setError('');
              setScannerMode(null);
            }).catch((err) => setError(err.response?.data?.detail || 'Scanned rack QR code was not found'));
          }
        }} />
        <div className="grid grid-2">
          <div className="form-group">
            <label className="label" htmlFor="putaway-pallet-scan">Pallet barcode / ID</label>
            <input id="putaway-pallet-scan" className="input" value={scannedPalletId} onChange={(event) => {
              const value = event.target.value.trim();
              setScannedPalletId(event.target.value);
              const match = queue.find((item) => item.pallet_id === value);
              if (match) setSelectedPallet(match);
            }} placeholder="Scan or enter pallet ID" />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="putaway-rack-scan">Rack QR code</label>
            <input id="putaway-rack-scan" className="input" value={scannedLocationQr} onChange={(event) => {
              const value = event.target.value.trim();
              setScannedLocationQr(event.target.value);
              const match = availableLocations.find((item) => item.qr_code_value === value || item.location_code === value);
              setSelectedLocation(match || null);
              if (value && !match) setError('Rack QR code is not an available location');
              else setError('');
            }} placeholder="Scan rack label or enter its code" />
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="grid grid-2">
        <div className="card">
          <h2 style={{ marginBottom: '20px' }}>Pallet Queue ({queue.length})</h2>
          
          {queue.length === 0 ? (
            <div className="empty-state">No pallets ready for put-away</div>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {queue.map((pallet) => (
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
                  <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '4px' }}>
                    Assigned rack: {pallet.assigned_location?.location_code || 'Assignment missing'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                    Ready: {pallet.ready_for_putaway_datetime ? new Date(pallet.ready_for_putaway_datetime).toLocaleString() : 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 style={{ marginBottom: '20px' }}>Available Locations ({availableLocations.length})</h2>
          
          {availableLocations.length === 0 ? (
            <div className="empty-state">No available rack locations</div>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {availableLocations.map((location) => (
                <div
                  key={location.id}
                  onClick={() => setSelectedLocation(location)}
                  style={{
                    padding: '12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    cursor: 'pointer',
                    backgroundColor: selectedLocation?.id === location.id ? '#dbeafe' : 'white',
                  }}
                >
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>{location.location_code}</div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    Zone: {location.zone || 'N/A'} | Rack: {location.rack || 'N/A'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                    Level: {location.level || 'N/A'} | Position: {location.position || 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedPallet && selectedLocation && (
        <div className="card" style={{ marginTop: '20px' }}>
          <h2 style={{ marginBottom: '20px' }}>Confirm Put-away</h2>
          
          <div className="grid grid-2" style={{ marginBottom: '20px' }}>
            <div>
              <label className="label">Pallet</label>
              <div style={{ fontSize: '18px', fontWeight: '600' }}>{selectedPallet.pallet_id}</div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                Batch: {selectedPallet.batch_number || 'N/A'} | Qty: {selectedPallet.quantity || 'N/A'}
              </div>
            </div>
            <div>
              <label className="label">Location</label>
              <div style={{ fontSize: '18px', fontWeight: '600' }}>{selectedLocation.location_code}</div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                Assigned: {selectedPallet.assigned_location?.location_code || 'N/A'}
              </div>
            </div>
          </div>

          <button
            onClick={handlePutaway}
            className="button button-success"
            style={{ fontSize: '18px', padding: '16px 32px' }}
            disabled={loading}
          >
            {loading ? 'Putting away...' : 'Confirm scanned rack and put away'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ReadyForPutawayPage;
