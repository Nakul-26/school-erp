import React from 'react';

interface ApplyLeaveModalProps {
  show: boolean;
  leaveTypes: any[];
  form: { leave_type_id: string; from_date: string; to_date: string; days_count: number; reason: string };
  setForm: React.Dispatch<React.SetStateAction<{ leave_type_id: string; from_date: string; to_date: string; days_count: number; reason: string }>>;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function ApplyLeaveModal({ show, leaveTypes, form, setForm, submitting, onClose, onSubmit }: ApplyLeaveModalProps) {
  if (!show) return null;
  return (
    <div className="teacher-details-modal-overlay">
      <div className="card modal-content teacher-details-modal-card">
        <h3 className="teacher-details-modal-title">Apply for Leave</h3>
        <form onSubmit={onSubmit} className="teacher-details-modal-form">
          <div className="teacher-details-form-group-col">
            <label className="teacher-details-form-label-styled">Leave Type *</label>
            <select
              value={form.leave_type_id}
              onChange={e => setForm({ ...form, leave_type_id: e.target.value })}
              className="input"
              required
            >
              {leaveTypes.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
              ))}
            </select>
          </div>

          <div className="teacher-details-form-row-2col">
            <div className="teacher-details-form-group-col">
              <label className="teacher-details-form-label-styled">From Date *</label>
              <input
                type="date"
                value={form.from_date}
                onChange={e => setForm({ ...form, from_date: e.target.value })}
                className="input"
                required
              />
            </div>

            <div className="teacher-details-form-group-col">
              <label className="teacher-details-form-label-styled">To Date *</label>
              <input
                type="date"
                value={form.to_date}
                onChange={e => setForm({ ...form, to_date: e.target.value })}
                className="input"
                required
              />
            </div>
          </div>

          <div className="teacher-details-form-group-col">
            <label className="teacher-details-form-label-styled">Days Count *</label>
            <input
              type="number"
              value={form.days_count}
              onChange={e => setForm({ ...form, days_count: parseInt(e.target.value) || 1 })}
              className="input"
              min="1"
              required
            />
          </div>

          <div className="teacher-details-form-group-col">
            <label className="teacher-details-form-label-styled">Reason *</label>
            <textarea
              value={form.reason}
              onChange={e => setForm({ ...form, reason: e.target.value })}
              className="input"
              placeholder="Reason for leave..."
              rows={3}
              required
            />
          </div>

          <div className="teacher-details-modal-actions-row">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Apply'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
