import React from 'react';

interface BulkTeacherModalProps {
  show: boolean;
  selectedCount: number;
  teachers: any[];
  bulkTeacherId: string;
  setBulkTeacherId: (id: string) => void;
  onClose: () => void;
  onApply: () => void;
}

export function BulkTeacherModal({ show, selectedCount, teachers, bulkTeacherId, setBulkTeacherId, onClose, onApply }: BulkTeacherModalProps) {
  if (!show) return null;
  return (
    <div className="modal classes-modal" style={{ zIndex: 1000 }}>
      <div className="modal-content classes-modal-content size-sm">
        <h3 style={{ margin: 0, marginBottom: '0.5rem', fontSize: '1.25rem', fontWeight: 700 }}>
          Bulk Assign Class Teacher
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Select a teacher to assign as the primary Class Teacher for the <strong>{selectedCount}</strong> selected sections.
        </p>
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.375rem' }}>
            Class Teacher
          </label>
          <select
            value={bulkTeacherId}
            onChange={e => setBulkTeacherId(e.target.value)}
            className="classes-select-31"
            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}
          >
            <option value="">-- Unassigned / None --</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id}>
                {t.first_name} {t.last_name} ({t.employee_id || 'Teacher'})
              </option>
            ))}
          </select>
        </div>
        <div className="modal-actions classes-modal-actions">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onApply}
          >
            Apply Assignment
          </button>
        </div>
      </div>
    </div>
  );
}
