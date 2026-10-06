import React, { useEffect, useState } from 'react';
import { Pallet, Transaction } from '../types';
import { palletService } from '../services/pallets';
import { transactionService } from '../services/transactions';
import { useNavigate, useSearchParams } from 'react-router-dom';

const PalletHistoryPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const palletIdParam = searchParams.get('palletId');
  const [pallet, setPallet] = useState<Pallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (palletIdParam) {
      loadPalletHistory(parseInt(palletIdParam));
    }
  }, [palletIdParam]);

  const loadPalletHistory = async (id: number) => {
    try {
      const [palletData, transactionsData] = await Promise.all([
        palletService.getPallet(id),
        transactionService.getPalletTransactions(id),
      ]);
      setPallet(palletData);
      setTransactions(transactionsData);
    } catch (err: any) {
      setError('Failed to load pallet history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case 'RECEIVED':
      case 'SCANNED':
        return 'badge-info';
      case 'WRAPPED':
      case 'READY_FOR_PUTAWAY':
      case 'PUTAWAY':
        return 'badge-success';
      case 'RELEASED':
      case 'DISPATCHED':
        return 'badge-success';
      case 'QC_APPROVED':
        return 'badge-success';
      case 'QC_REJECTED':
      case 'QC_HOLD':
        return 'badge-danger';
      default:
        return 'badge-warning';
    }
  };

  if (loading) {
    return <div className="loading">Loading pallet history...</div>;
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  if (!pallet) {
    return <div className="empty-state">No pallet selected</div>;
  }

  return (
    <div>
      <button
        onClick={() => navigate('/locator')}
        className="button button-warning"
        style={{ marginBottom: '20px' }}
      >
        ← Back to Master Locator
      </button>

      <h1 style={{ marginBottom: '30px' }}>Pallet History: {pallet.pallet_id}</h1>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h2 style={{ marginBottom: '20px' }}>Pallet Details</h2>
        <div className="grid grid-3">
          <div>
            <label className="label">Pallet ID</label>
            <div style={{ fontSize: '18px', fontWeight: '600' }}>{pallet.pallet_id}</div>
          </div>
          <div>
            <label className="label">Status</label>
            <span className={`badge ${getActionBadgeClass(pallet.status)}`}>
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
            <label className="label">Current Location</label>
            <div>{pallet.current_location?.location_code || 'N/A'}</div>
          </div>
          <div>
            <label className="label">Received</label>
            <div>{pallet.received_datetime ? formatDate(pallet.received_datetime) : 'N/A'}</div>
          </div>
          <div>
            <label className="label">Expected Release</label>
            <div>{pallet.expected_release_datetime ? formatDate(pallet.expected_release_datetime) : 'N/A'}</div>
          </div>
          <div>
            <label className="label">Actual Release</label>
            <div>{pallet.actual_release_datetime ? formatDate(pallet.actual_release_datetime) : 'N/A'}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '20px' }}>Transaction History ({transactions.length})</h2>

        {transactions.length === 0 ? (
          <div className="empty-state">No transactions recorded</div>
        ) : (
          <div style={{ position: 'relative' }}>
            {/* Timeline line */}
            <div
              style={{
                position: 'absolute',
                left: '20px',
                top: '0',
                bottom: '0',
                width: '2px',
                backgroundColor: '#e5e7eb',
              }}
            />

          {transactions.map((transaction) => (
              <div
                key={transaction.id}
                style={{
                  position: 'relative',
                  paddingLeft: '50px',
                  paddingBottom: '30px',
                }}
              >
                {/* Timeline dot */}
                <div
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '0',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: '#2563eb',
                    border: '3px solid white',
                    boxShadow: '0 0 0 2px #2563eb',
                  }}
                />

                <div
                  style={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '16px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span className={`badge ${getActionBadgeClass(transaction.action)}`}>
                      {transaction.action}
                    </span>
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>
                      {formatDate(transaction.timestamp)}
                    </span>
                  </div>

                  <div className="grid grid-2">
                    {transaction.previous_status && (
                      <div>
                        <label className="label">Previous Status</label>
                        <div>{transaction.previous_status}</div>
                      </div>
                    )}
                    {transaction.new_status && (
                      <div>
                        <label className="label">New Status</label>
                        <div>{transaction.new_status}</div>
                      </div>
                    )}
                    {transaction.from_location_id && (
                      <div>
                        <label className="label">From Location</label>
                        <div>ID: {transaction.from_location_id}</div>
                      </div>
                    )}
                    {transaction.to_location_id && (
                      <div>
                        <label className="label">To Location</label>
                        <div>ID: {transaction.to_location_id}</div>
                      </div>
                    )}
                    {transaction.reason && (
                      <div>
                        <label className="label">Reason</label>
                        <div>{transaction.reason}</div>
                      </div>
                    )}
                    {transaction.notes && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label className="label">Notes</label>
                        <div>{transaction.notes}</div>
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: '12px', fontSize: '14px', color: '#6b7280' }}>
                    User ID: {transaction.user_id}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PalletHistoryPage;
