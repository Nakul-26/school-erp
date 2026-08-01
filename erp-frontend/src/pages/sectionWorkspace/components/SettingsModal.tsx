import React from 'react';
import type { SectionSettingsForm } from '../sectionWorkspace.types';

interface SettingsModalProps {
  show: boolean;
  form: SectionSettingsForm;
  setForm: React.Dispatch<React.SetStateAction<SectionSettingsForm>>;
  allTeachers: any[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function SettingsModal({ show, form, setForm, allTeachers, onClose, onSubmit }: SettingsModalProps) {
  if (!show) return null;
  return (
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div className="card modal-content" style={{ width: '440px', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '1.25rem' }}>Edit Class Configuration</h3>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Section Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="input"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Classroom Location</label>
              <input
                type="text"
                value={form.room}
                onChange={e => setForm({ ...form, room: e.target.value })}
                className="input"
                placeholder="e.g. Block C-302"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Max Capacity *</label>
              <input
                type="number"
                value={form.capacity}
                onChange={e => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })}
                className="input"
                required
                min="1"
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Class Teacher / Advisor</label>
            <select
              value={form.class_teacher_id}
              onChange={e => setForm({ ...form, class_teacher_id: e.target.value })}
              className="input"
            >
              <option value="">-- Assign Class Teacher (Optional) --</option>
              {allTeachers.map(t => (
                <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Save Settings</button>
          </div>
        </form>
      </div>
    </div>
  );
}
