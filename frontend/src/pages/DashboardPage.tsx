import React, { useEffect, useState } from 'react';
import { DashboardData } from '../types';
import { dashboardService } from '../services/dashboard';

const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const dashboardData = await dashboardService.getDashboard();
      setData(dashboardData);
    } catch (err: any) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  if (!data) {
    return <div className="empty-state">No data available</div>;
  }

  return (
    <div>
      <h1 style={{ marginBottom: '30px' }}>Warehouse Dashboard</h1>

      <h2 style={{ marginBottom: '20px' }}>Today's Activity</h2>
      <div className="grid grid-4" style={{ marginBottom: '30px' }}>
        <div className="stat-card">
          <div className="stat-value">{data.today.received}</div>
          <div className="stat-label">Received</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.today.wrapped}</div>
          <div className="stat-label">Wrapped</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.today.ready_for_putaway}</div>
          <div className="stat-label">Ready for Put-away</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.today.put_away}</div>
          <div className="stat-label">Put Away</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.today.released}</div>
          <div className="stat-label">Released</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.today.direct_out}</div>
          <div className="stat-label">Direct Out</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.today.qc_pending}</div>
          <div className="stat-label">QC Pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: data.today.over_48_hours > 0 ? '#dc2626' : '#2563eb' }}>
            {data.today.over_48_hours}
          </div>
          <div className="stat-label">Over 48 Hours</div>
        </div>
      </div>

      <h2 style={{ marginBottom: '20px' }}>Current Backlog</h2>
      <div className="grid grid-3">
        <div className="stat-card">
          <div className="stat-value">{data.backlog.unscanned}</div>
          <div className="stat-label">Unscanned</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.backlog.waiting_for_wrapping}</div>
          <div className="stat-label">Waiting for Wrapping</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.backlog.ready_for_putaway}</div>
          <div className="stat-label">Ready for Put-away</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.backlog.qc_pending}</div>
          <div className="stat-label">QC Pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: data.backlog.overdue_hold > 0 ? '#dc2626' : '#2563eb' }}>
            {data.backlog.overdue_hold}
          </div>
          <div className="stat-label">Overdue Hold</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: data.backlog.quarantine > 0 ? '#dc2626' : '#2563eb' }}>
            {data.backlog.quarantine}
          </div>
          <div className="stat-label">Quarantine</div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
