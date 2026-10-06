import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PalletScanPage from './pages/PalletScanPage';
import ReadyForPutawayPage from './pages/ReadyForPutawayPage';
import MasterLocatorPage from './pages/MasterLocatorPage';
import QCPage from './pages/QCPage';
import PalletHistoryPage from './pages/PalletHistoryPage';
import QRManagementPage from './pages/QRManagementPage';
import ReleaseScanPage from './pages/ReleaseScanPage';
import DispatchScanPage from './pages/DispatchScanPage';
import AdminPage from './pages/AdminPage';
import Layout from './components/Layout';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({
  children, 
  allowedRoles 
}) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const HomeRedirect: React.FC = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'WAREHOUSE') return <Navigate to="/scan" replace />;
  if (user.role === 'FORKLIFT') return <Navigate to="/putaway" replace />;
  if (user.role === 'QC') return <Navigate to="/qc" replace />;
  return <Navigate to="/dashboard" replace />;
};

const AppContent: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><HomeRedirect /></ProtectedRoute>} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['SUPERVISOR', 'ADMIN']}>
              <Layout>
                <DashboardPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/scan"
          element={
            <ProtectedRoute allowedRoles={['WAREHOUSE', 'ADMIN']}>
              <Layout>
                <PalletScanPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/putaway"
          element={
            <ProtectedRoute allowedRoles={['FORKLIFT', 'SUPERVISOR', 'ADMIN']}>
              <Layout>
                <ReadyForPutawayPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/locator"
          element={
            <ProtectedRoute>
              <Layout>
                <MasterLocatorPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/qc"
          element={
            <ProtectedRoute allowedRoles={['QC', 'SUPERVISOR', 'ADMIN']}>
              <Layout>
                <QCPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <Layout>
                <PalletHistoryPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/release"
          element={
            <ProtectedRoute allowedRoles={['SUPERVISOR', 'QC', 'ADMIN']}>
              <Layout><ReleaseScanPage /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dispatch"
          element={
            <ProtectedRoute allowedRoles={['WAREHOUSE', 'SUPERVISOR', 'ADMIN']}>
              <Layout><DispatchScanPage /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/qr"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Layout><QRManagementPage /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Layout><AdminPage /></Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
      <Routes><Route path="*" element={<Navigate to="/" replace />} /></Routes>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
