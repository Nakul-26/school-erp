import React from 'react';
import type { Inquiry } from '../admissions.types';

interface ConvertInquiryModalProps {
  inquiry: Inquiry | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConvertInquiryModal({ inquiry, loading, onClose, onConfirm }: ConvertInquiryModalProps) {
  if (!inquiry) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content admissions-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Convert to Application</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p className="admissions-text-77">
            Convert <strong>{inquiry.student_name}</strong>'s inquiry into a formal admission application?
          </p>
          <p className="admissions-text-78">
            This will create an application record and mark this inquiry as <strong>Applied</strong>. You can review and approve the application from the Applied tab.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={loading}>
            {loading ? 'Converting...' : 'Confirm Convert'}
          </button>
        </div>
      </div>
    </div>
  );
}
