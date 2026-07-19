import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function AccessDenied() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const state = location.state as { reason?: string } | null;

  return (
    <div className="auth-container" style={{ minHeight: '100vh' }}>
      <div className="auth-card" style={{ maxWidth: '560px', textAlign: 'center' }}>
        <ShieldAlert size={56} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
        <h2>Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          {state?.reason || 'You do not have permission to open this page or perform that action.'}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/dashboard')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={16} /> Go Back
          </button>
          <button className="btn btn-danger" onClick={logout} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <LogOut size={16} /> Log Out
          </button>
        </div>
      </div>
    </div>
  );
}