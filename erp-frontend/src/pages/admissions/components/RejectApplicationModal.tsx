import React from 'react';
import type { Application } from '../admissions.types';

interface RejectApplicationModalProps {
  application: Application | null;
  reason: string;
  setReason: (reason: string) => void;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function RejectApplicationModal({ application, reason, setReason, loading, onClose, onConfirm }: RejectApplicationModalProps) {
  if (!application) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content admissions-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Reject Application</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p className="admissions-text-115">
            Reject application for <strong>{application.student_first_name} {application.student_last_name}</strong>?
          </p>
          <div className="form-group">
            <label>Rejection Reason</label>
            <textarea
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Provide a reason for rejection (optional)..."
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Rejecting...' : 'Reject Application'}
          </button>
        </div>
      </div>
    </div>
  );
}
