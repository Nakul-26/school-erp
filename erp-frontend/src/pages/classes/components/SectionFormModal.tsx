import React from 'react';

interface SectionForm {
  name: string;
  year_number: number;
  academic_year_id: string;
  course_id: string;
  capacity: number;
  room: string;
  class_teacher_id: string;
}

interface SectionFormModalProps {
  show: boolean;
  editingSection: any;
  form: SectionForm;
  setForm: React.Dispatch<React.SetStateAction<SectionForm>>;
  institutionType: string;
  getProgramLabel: () => string;
  programs: any[];
  years: any[];
  teachers: any[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function SectionFormModal({
  show, editingSection, form, setForm, institutionType, getProgramLabel, programs, years, teachers, onClose, onSubmit,
}: SectionFormModalProps) {
  if (!show) return null;
  return (
    <div className="modal-overlay classes-modal-overlay">
      <div className="modal-content classes-modal-content size-sm">
        <h3 className="classes-title-137">
          {editingSection ? `Edit Class/Section: ${editingSection.name}` : `Add New ${institutionType === 'school' ? 'Section' : 'Class/Section'}`}
        </h3>
        <form onSubmit={onSubmit} className="classes-col-138">
          <div className="form-group">
            <label className="classes-label-139">Section Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Section A, Section B, A"
              required
            />
          </div>

          {institutionType !== 'school' && (
            <div className="form-group">
              <label className="classes-label-140">Year Level *</label>
              <input
                type="number"
                value={form.year_number}
                onChange={e => setForm({ ...form, year_number: parseInt(e.target.value, 10) || 1 })}
                required
                min="1"
              />
            </div>
          )}

          <div className="form-group">
            <label className="classes-label-141">{getProgramLabel()} *</label>
            <select value={form.course_id} onChange={e => setForm({ ...form, course_id: e.target.value })} required>
              {programs.map(p => {
                if (p.is_active !== 1 && p.id !== form.course_id) return null;
                return <option key={p.id} value={p.id}>{p.name}{p.is_active !== 1 ? ' (Archived)' : ''}</option>;
              })}
            </select>
          </div>

          <div className="form-group">
            <label className="classes-label-142">Academic Year *</label>
            <select value={form.academic_year_id} onChange={e => setForm({ ...form, academic_year_id: e.target.value })} required>
              {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
          </div>

          <div className="classes-grid-143">
            <div className="form-group">
              <label className="classes-label-144">Room / Location</label>
              <input
                type="text"
                value={form.room}
                onChange={e => setForm({ ...form, room: e.target.value })}
                placeholder="e.g. Room 302"
              />
            </div>

            <div className="form-group">
              <label className="classes-label-145">Max Capacity *</label>
              <input
                type="number"
                value={form.capacity}
                onChange={e => setForm({ ...form, capacity: parseInt(e.target.value, 10) || 0 })}
                required
                min="1"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="classes-label-146">Class Teacher / Advisor</label>
            <select value={form.class_teacher_id} onChange={e => setForm({ ...form, class_teacher_id: e.target.value })}>
              <option value="">-- Assign Class Teacher (Optional) --</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.first_name} {t.last_name} ({t.employee_id || 'No ID'})</option>
              ))}
            </select>
          </div>

          <div className="modal-actions classes-modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}
