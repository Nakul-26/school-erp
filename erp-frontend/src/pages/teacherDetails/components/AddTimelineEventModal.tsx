import React from 'react';

interface AddTimelineEventModalProps {
  show: boolean;
  form: { title: string; desc: string };
  setForm: React.Dispatch<React.SetStateAction<{ title: string; desc: string }>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function AddTimelineEventModal({ show, form, setForm, onClose, onSubmit }: AddTimelineEventModalProps) {
  if (!show) return null;
  return (
    <div className="teacher-details-modal-overlay">
      <div className="card modal-content teacher-details-modal-card">
        <h3 className="teacher-details-modal-title">Add Timeline Audit Log</h3>
        <form onSubmit={onSubmit} className="teacher-details-modal-form">
          <div className="teacher-details-form-group-col">
            <label htmlFor="timeline-title-input" className="teacher-details-form-label-styled">Event Title *</label>
            <input
              id="timeline-title-input"
              type="text"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="input"
              placeholder="e.g. Profile Details Updated"
              required
            />
          </div>
          <div className="teacher-details-form-group-col">
            <label htmlFor="timeline-desc-textarea" className="teacher-details-form-label-styled">Event Description *</label>
            <textarea
              id="timeline-desc-textarea"
              value={form.desc}
              onChange={e => setForm({ ...form, desc: e.target.value })}
              className="input"
              placeholder="Provide brief details about this audit log entry..."
              rows={3}
              required
            />
          </div>

          <div className="teacher-details-modal-actions-row">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Add Log</button>
          </div>
        </form>
      </div>
    </div>
  );
}
