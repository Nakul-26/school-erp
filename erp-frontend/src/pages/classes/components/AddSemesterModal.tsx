import React from 'react';

export interface AddSemesterForm {
  semester_number: number;
  name: string;
  start_date: string;
  end_date: string;
}

interface AddSemesterModalProps {
  show: boolean;
  form: AddSemesterForm;
  setForm: React.Dispatch<React.SetStateAction<AddSemesterForm>>;
  academicYearName: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function AddSemesterModal({ show, form, setForm, academicYearName, onClose, onSubmit }: AddSemesterModalProps) {
  if (!show) return null;
  return (
    <div className="modal classes-modal" style={{ zIndex: 1000 }}>
      <div className="modal-content classes-modal-content size-sm">
        <h3 style={{ margin: 0, marginBottom: '0.5rem', fontSize: '1.25rem', fontWeight: 700 }}>
          Add Semester
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Creating a semester for academic year <strong>{academicYearName}</strong>.
        </p>
        <form onSubmit={onSubmit}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.375rem' }}>
              Semester Number *
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={form.semester_number}
              onChange={e => setForm(f => ({ ...f, semester_number: Math.max(1, parseInt(e.target.value) || 1) }))}
              required
            />
          </div>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.375rem' }}>
              Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder={`Semester ${form.semester_number}`}
            />
          </div>
          <div className="classes-grid-241" style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.375rem' }}>
                Start Date
              </label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.375rem' }}>
                End Date
              </label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
              />
            </div>
          </div>
          <div className="modal-actions classes-modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Add Semester</button>
          </div>
        </form>
      </div>
    </div>
  );
}
