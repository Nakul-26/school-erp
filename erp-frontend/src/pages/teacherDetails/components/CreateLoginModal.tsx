import React from 'react';

interface CreateLoginModalProps {
  show: boolean;
  username: string;
  setUsername: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  creating: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function CreateLoginModal({ show, username, setUsername, email, setEmail, password, setPassword, creating, onClose, onSubmit }: CreateLoginModalProps) {
  if (!show) return null;
  return (
    <div className="teacher-details-modal-overlay">
      <div className="card modal-content teacher-details-modal-card">
        <h3 className="teacher-details-modal-title">Link Login Credentials</h3>
        <form onSubmit={onSubmit} className="teacher-details-modal-form">
          <div className="teacher-details-form-group-col">
            <label className="teacher-details-form-label-styled">Username *</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="input" required />
          </div>
          <div className="teacher-details-form-group-col">
            <label className="teacher-details-form-label-styled">Email *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" required />
          </div>
          <div className="teacher-details-form-group-col">
            <label className="teacher-details-form-label-styled">Password *</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input" required />
          </div>

          <div className="teacher-details-modal-actions-row">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? 'Creating...' : 'Provision Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
