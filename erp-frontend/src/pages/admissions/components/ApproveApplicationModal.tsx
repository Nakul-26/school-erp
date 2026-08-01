import React from 'react';
import type { Application } from '../admissions.types';

interface ApproveApplicationModalProps {
  application: Application | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ApproveApplicationModal({ application, loading, onClose, onConfirm }: ApproveApplicationModalProps) {
  if (!application) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content admissions-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Approve Application</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p className="admissions-text-111">
            Approve application for <strong>{application.student_first_name} {application.student_last_name}</strong>?
          </p>
          <div className="admissions-div-112">
            ⚠️ Approving will <strong>automatically create a student record</strong> in the system with admission number <code>{application.application_number}</code>.
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={loading}>
            {loading ? 'Approving...' : 'Approve & Create Student'}
          </button>
        </div>
      </div>
    </div>
  );
}
