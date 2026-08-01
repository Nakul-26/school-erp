import React from 'react';

interface ChangeSectionModalProps {
  show: boolean;
  currentEnrollment: any;
  programs: any[];
  sections: any[];
  getProgramLabel: () => string;
  form: { section_id: string };
  setForm: (form: { section_id: string }) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function ChangeSectionModal({ show, currentEnrollment, programs, sections, getProgramLabel, form, setForm, onClose, onSubmit }: ChangeSectionModalProps) {
  if (!show || !currentEnrollment) return null;
  const availableSections = sections.filter(s => s.academic_year_id === currentEnrollment.academic_year_id && s.course_id === currentEnrollment.course_id);

  return (
    <div className="modal student-details-modal">
      <div className="modal-content student-details-modal-content">
        <h3 className="student-details-title-225">Change Section</h3>
        <form onSubmit={onSubmit}>

          <div className="student-details-div-226">
            <div className="student-details-div-227">Current {getProgramLabel()}</div>
            <strong className="student-details-strong-228">
              {programs.find(p => p.id === currentEnrollment.course_id)?.name || 'Unknown'}
            </strong>
          </div>

          <div className="form-group">
            <label>New Section *</label>
            <select
              value={form.section_id}
              onChange={e => setForm({ section_id: e.target.value })}
              required
            >
              <option value="">-- Select Section --</option>
              {availableSections.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {availableSections.length === 0 && (
              <span className="student-details-span-229">
                ⚠️ No other sections available for this class.
              </span>
            )}
          </div>

          <div className="modal-actions student-details-modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!form.section_id || form.section_id === currentEnrollment.section_id}
            >
              Change Section
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
