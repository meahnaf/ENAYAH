import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-brand">Warehouse Tracking</div>
        <div className="navbar-links">
          {hasRole([UserRole.SUPERVISOR, UserRole.ADMIN]) && (
            <Link to="/dashboard" className={`navbar-link ${isActive('/dashboard') ? 'active' : ''}`}>
              Dashboard
            </Link>
          )}
          {hasRole([UserRole.WAREHOUSE, UserRole.ADMIN]) && (
            <Link to="/scan" className={`navbar-link ${isActive('/scan') ? 'active' : ''}`}>
              Scan Pallet
            </Link>
          )}
          {hasRole([UserRole.FORKLIFT, UserRole.SUPERVISOR, UserRole.ADMIN]) && (
            <Link to="/putaway" className={`navbar-link ${isActive('/putaway') ? 'active' : ''}`}>
              Put Away
            </Link>
          )}
          {hasRole([UserRole.QC, UserRole.SUPERVISOR, UserRole.ADMIN]) && (
            <Link to="/qc" className={`navbar-link ${isActive('/qc') ? 'active' : ''}`}>
              QC
            </Link>
          )}
          {hasRole([UserRole.SUPERVISOR, UserRole.QC, UserRole.ADMIN]) && (
            <Link to="/release" className={`navbar-link ${isActive('/release') ? 'active' : ''}`}>
              Scan Release
            </Link>
          )}
          {hasRole([UserRole.WAREHOUSE, UserRole.SUPERVISOR, UserRole.ADMIN]) && (
            <Link to="/dispatch" className={`navbar-link ${isActive('/dispatch') ? 'active' : ''}`}>
              Direct Out
            </Link>
          )}
          <Link to="/history" className={`navbar-link ${isActive('/history') ? 'active' : ''}`}>
            Pallet History
          </Link>
          {hasRole([UserRole.ADMIN]) && (
            <Link to="/qr" className={`navbar-link ${isActive('/qr') ? 'active' : ''}`}>
              Location QR Codes
            </Link>
          )}
          {hasRole([UserRole.ADMIN]) && (
            <Link to="/admin" className={`navbar-link ${isActive('/admin') ? 'active' : ''}`}>
              Admin
            </Link>
          )}
          <Link to="/locator" className={`navbar-link ${isActive('/locator') ? 'active' : ''}`}>
            Master Locator
          </Link>
          <button onClick={logout} className="button button-primary" style={{ padding: '8px 16px', fontSize: '14px' }}>
            Logout ({user?.name})
          </button>
        </div>
      </nav>
      <div className="container">
        {children}
      </div>
    </div>
  );
};

export default Layout;
