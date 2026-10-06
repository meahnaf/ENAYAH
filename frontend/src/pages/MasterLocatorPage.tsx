import React, { useEffect, useState } from 'react';
import { Pallet, PalletStatus, LoadType, UserRole } from '../types';
import { palletService } from '../services/pallets';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const MasterLocatorPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [filteredPallets, setFilteredPallets] = useState<Pallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loadTypeFilter, setLoadTypeFilter] = useState<string>('all');
  const [receivedFrom, setReceivedFrom] = useState('');
  const [receivedTo, setReceivedTo] = useState('');
  const [overdueFilter, setOverdueFilter] = useState('all');
  const [selectedPallet, setSelectedPallet] = useState<Pallet | null>(null);

  useEffect(() => {
    loadPallets();
  }, []);

  useEffect(() => {
    filterPallets();
  }, [pallets, searchTerm, statusFilter, loadTypeFilter, receivedFrom, receivedTo, overdueFilter]);

  const loadPallets = async () => {
    try {
      const data = await palletService.getPallets({ limit: 1000 });
      setPallets(data);
    } catch (err: any) {
      console.error('Failed to load pallets');
    } finally {
      setLoading(false);
    }
  };

  const filterPallets = () => {
    let filtered = [...pallets];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.pallet_id.toLowerCase().includes(term) ||
          p.batch_number?.toLowerCase().includes(term) ||
          p.load_number?.toLowerCase().includes(term) ||
          p.product?.product_code.toLowerCase().includes(term) ||
          p.product?.product_name.toLowerCase().includes(term) ||
          p.current_location?.location_code.toLowerCase().includes(term) ||
          p.assigned_location?.location_code.toLowerCase().includes(term) ||
          p.status.toLowerCase().includes(term) || p.load_type.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    if (loadTypeFilter !== 'all') {
      filtered = filtered.filter((p) => p.load_type === loadTypeFilter);
    }

    if (receivedFrom) filtered = filtered.filter((p) => p.received_datetime && p.received_datetime.slice(0, 10) >= receivedFrom);
    if (receivedTo) filtered = filtered.filter((p) => p.received_datetime && p.received_datetime.slice(0, 10) <= receivedTo);
    if (overdueFilter !== 'all') {
      filtered = filtered.filter((p) => {
        const overdue = !!p.expected_release_datetime && Date.now() > new Date(p.expected_release_datetime).getTime() &&
          [PalletStatus.IN_RACK_HOLD, PalletStatus.RELEASE_ELIGIBLE].includes(p.status);
        return overdueFilter === 'overdue' ? overdue : !overdue;
      });
    }

    setFilteredPallets(filtered);
  };

  const placeSelectedPalletOnQcHold = async () => {
    if (!selectedPallet) return;
    const reason = window.prompt('Enter the reason for the QC hold:');
    if (!reason?.trim()) return;
    try {
      await palletService.qcHoldPallet(selectedPallet.pallet_id, reason.trim());
      await loadPallets();
      setSelectedPallet(null);
    } catch (err: any) {
      window.alert(err.response?.data?.detail || 'Failed to place pallet on QC hold');
    }
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
      case PalletStatus.QC_HOLD:
      case PalletStatus.QUARANTINE:
        return 'badge-danger';
      default:
        return 'badge-warning';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div>
      <h1 style={{ marginBottom: '30px' }}>Master Locator</h1>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="grid grid-3">
          <div>
            <label className="label">Search</label>
            <input
              type="text"
              className="input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pallet, product, batch, load, location, status"
            />
          </div>
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value={PalletStatus.RECEIVED}>Received</option>
              <option value={PalletStatus.SCANNED}>Scanned</option>
              <option value={PalletStatus.WRAPPED}>Wrapped</option>
              <option value={PalletStatus.READY_FOR_PUTAWAY}>Ready for Put-away</option>
              <option value={PalletStatus.IN_RACK_HOLD}>In Rack Hold</option>
              <option value={PalletStatus.RELEASED}>Released</option>
              <option value={PalletStatus.DISPATCHED}>Dispatched</option>
              <option value={PalletStatus.QC_HOLD}>QC Hold</option>
              <option value={PalletStatus.QUARANTINE}>Quarantine</option>
            </select>
          </div>
          <div>
            <label className="label">Load Type</label>
            <select
              className="input"
              value={loadTypeFilter}
              onChange={(e) => setLoadTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value={LoadType.STORAGE}>Storage</option>
              <option value={LoadType.DIRECT_OUT}>Direct Out</option>
            </select>
          </div>
          <div>
            <label className="label">Received from</label>
            <input className="input" type="date" value={receivedFrom} onChange={(e) => setReceivedFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">Received to</label>
            <input className="input" type="date" value={receivedTo} onChange={(e) => setReceivedTo(e.target.value)} />
          </div>
          <div>
            <label className="label">Hold age</label>
            <select className="input" value={overdueFilter} onChange={(e) => setOverdueFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="overdue">Overdue</option>
              <option value="current">Not overdue</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ marginBottom: '16px' }}>
          Showing {filteredPallets.length} of {pallets.length} pallets
          {hasRole([UserRole.SUPERVISOR, UserRole.ADMIN]) && (
            <button className="button button-primary" style={{ marginLeft: 12 }} onClick={async () => {
              const report = await palletService.exportPalletsCsv();
              const url = URL.createObjectURL(report);
              const link = document.createElement('a');
              link.href = url;
              link.download = 'pallet-report.csv';
              link.click();
              URL.revokeObjectURL(url);
            }}>Export CSV</button>
          )}
        </div>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : filteredPallets.length === 0 ? (
          <div className="empty-state">No pallets found</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Pallet ID</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Product</th>
                  <th>Batch</th>
                  <th>Quantity</th>
                  <th>Location</th>
                  <th>Received</th>
                  <th>Expected Release</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPallets.map((pallet) => (
                  <tr key={pallet.id}>
                    <td style={{ fontWeight: '600' }}>{pallet.pallet_id}</td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(pallet.status)}`}>
                        {pallet.status}
                      </span>
                    </td>
                    <td>{pallet.load_type}</td>
                    <td>{pallet.product?.product_name || pallet.product?.product_code || 'N/A'}</td>
                    <td>{pallet.batch_number || 'N/A'}</td>
                    <td>{pallet.quantity || 'N/A'}</td>
                    <td>{pallet.current_location?.location_code || 'N/A'}</td>
                    <td>{formatDate(pallet.received_datetime)}</td>
                    <td>{formatDate(pallet.expected_release_datetime)}</td>
                    <td>
                      <button
                        onClick={() => setSelectedPallet(pallet)}
                        className="button button-primary"
                        style={{ padding: '8px 16px', fontSize: '14px' }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedPallet && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Pallet Details: {selectedPallet.pallet_id}</h2>
            <button
              onClick={() => setSelectedPallet(null)}
              className="button button-warning"
              style={{ padding: '8px 16px' }}
            >
              Close
            </button>
          </div>

          <div className="grid grid-3">
            <div>
              <label className="label">Pallet ID</label>
              <div style={{ fontSize: '18px', fontWeight: '600' }}>{selectedPallet.pallet_id}</div>
            </div>
            <div>
              <label className="label">Status</label>
              <span className={`badge ${getStatusBadgeClass(selectedPallet.status)}`}>
                {selectedPallet.status}
              </span>
            </div>
            <div>
              <label className="label">Load Type</label>
              <div>{selectedPallet.load_type}</div>
            </div>
            <div>
              <label className="label">Load Number</label>
              <div>{selectedPallet.load_number || 'N/A'}</div>
            </div>
            <div>
              <label className="label">Batch Number</label>
              <div>{selectedPallet.batch_number || 'N/A'}</div>
            </div>
            <div>
              <label className="label">Quantity</label>
              <div>{selectedPallet.quantity || 'N/A'}</div>
            </div>
            <div>
              <label className="label">Current Location</label>
              <div>{selectedPallet.current_location?.location_code || 'N/A'}</div>
            </div>
            <div>
              <label className="label">Received</label>
              <div>{formatDate(selectedPallet.received_datetime)}</div>
            </div>
            <div>
              <label className="label">Expected Release</label>
              <div>{formatDate(selectedPallet.expected_release_datetime)}</div>
            </div>
            <div>
              <label className="label">Actual Release</label>
              <div>{formatDate(selectedPallet.actual_release_datetime)}</div>
            </div>
            <div>
              <label className="label">Hold Reason</label>
              <div>{selectedPallet.hold_reason || 'N/A'}</div>
            </div>
            <div>
              <label className="label">Hold Details</label>
              <div>{selectedPallet.hold_reason_details || 'N/A'}</div>
            </div>
          </div>
          
          <div style={{ marginTop: '20px' }}>
            <button
              onClick={() => navigate(`/history?palletId=${selectedPallet.id}`)}
              className="button button-primary"
              style={{ marginRight: '10px' }}
            >
              View Full History
            </button>
            {hasRole([UserRole.SUPERVISOR, UserRole.QC, UserRole.ADMIN]) &&
              selectedPallet.load_type === LoadType.STORAGE &&
              [PalletStatus.IN_RACK_HOLD, PalletStatus.RELEASE_ELIGIBLE].includes(selectedPallet.status) &&
              selectedPallet.expected_release_datetime && Date.now() >= new Date(selectedPallet.expected_release_datetime).getTime() && (
                <button onClick={() => navigate('/release')} className="button button-success">
                  Scan pallet to release
                </button>
              )}
            {hasRole([UserRole.QC, UserRole.ADMIN]) &&
              selectedPallet.status === PalletStatus.IN_RACK_HOLD && (
                <button onClick={placeSelectedPalletOnQcHold} className="button button-warning">
                  Place on QC hold
                </button>
              )}
            {hasRole([UserRole.WAREHOUSE, UserRole.SUPERVISOR, UserRole.ADMIN]) &&
              selectedPallet.load_type === LoadType.DIRECT_OUT &&
              selectedPallet.status === PalletStatus.DISPATCH_READY && (
                <button onClick={() => navigate('/dispatch')} className="button button-success">
                  Scan to dispatch
                </button>
              )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterLocatorPage;
