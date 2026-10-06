import React, { useEffect, useState } from 'react';
import { Location } from '../types';
import { locationService } from '../services/locations';
import api from '../services/api';

const QRManagementPage: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const data = await locationService.getLocations(0, 1000);
      setLocations(data);
    } catch (err: any) {
      console.error('Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = (location: Location) => {
    api.get(`/qr/locations/${location.id}/qr`, { responseType: 'blob' })
      .then((response) => {
        const blob = response.data as Blob;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qr-${location.location_code}.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })
      .catch((err) => console.error('Failed to download QR', err));
  };

  const downloadBatchQR = () => {
    api.get('/qr/locations/batch-qr?limit=1000', { responseType: 'blob' })
      .then((response) => {
        const blob = response.data as Blob;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'location-qr-codes.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })
      .catch((err) => console.error('Failed to download batch QR', err));
  };

  if (loading) {
    return <div className="loading">Loading locations...</div>;
  }

  return (
    <div>
      <h1 style={{ marginBottom: '30px' }}>QR Code Management</h1>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h2 style={{ marginBottom: '20px' }}>Actions</h2>
        <button
          onClick={downloadBatchQR}
          className="button button-primary"
          style={{ fontSize: '16px', padding: '12px 24px' }}
        >
          Download All QR Codes (PDF)
        </button>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '20px' }}>Locations ({locations.length})</h2>

        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Location Code</th>
                <th>Zone</th>
                <th>Rack</th>
                <th>Level</th>
                <th>Position</th>
                <th>Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((location) => (
                <tr key={location.id}>
                  <td style={{ fontWeight: '600' }}>{location.location_code}</td>
                  <td>{location.zone || 'N/A'}</td>
                  <td>{location.rack || 'N/A'}</td>
                  <td>{location.level || 'N/A'}</td>
                  <td>{location.position || 'N/A'}</td>
                  <td>{location.location_type}</td>
                  <td>
                    <span className={`badge ${location.occupied ? 'badge-warning' : 'badge-success'}`}>
                      {location.occupied ? 'Occupied' : 'Available'}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => downloadQR(location)}
                      className="button button-primary"
                      style={{ padding: '8px 16px', fontSize: '14px' }}
                    >
                      Download QR
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default QRManagementPage;
