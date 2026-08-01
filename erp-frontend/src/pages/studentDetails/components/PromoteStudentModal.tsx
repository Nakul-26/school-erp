import React from 'react';

interface PromoteForm {
  academic_year_id: string;
  course_id: string;
  section_id: string;
  semester: number;
}

interface PromoteStudentModalProps {
  show: boolean;
  form: PromoteForm;
  onFieldChange: (field: string, value: any) => void;
  setForm: React.Dispatch<React.SetStateAction<PromoteForm>>;
  academicYears: any[];
  programs: any[];
  sections: any[];
  institutionType: string;
  getProgramLabel: () => string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function PromoteStudentModal({
  show, form, onFieldChange, setForm, academicYears, programs, sections, institutionType, getProgramLabel, onClose, onSubmit,
}: PromoteStudentModalProps) {
  if (!show) return null;
  const availableSections = sections.filter(s => s.academic_year_id === form.academic_year_id && s.course_id === form.course_id);

  return (
    <div className="modal student-details-modal">
      <div className="modal-content student-details-modal-content">
        <h3 className="student-details-title-217">Promote Student</h3>
        <form onSubmit={onSubmit}>

          <div className="form-group">
            <label>Target Academic Year *</label>
            <select
              value={form.academic_year_id}
              onChange={e => onFieldChange('academic_year_id', e.target.value)}
              required
            >
              <option value="">-- Select Target Year --</option>
              {academicYears.map(ay => (
                <option key={ay.id} value={ay.id}>{ay.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group student-details-form-group">
            <label>Target {getProgramLabel()} *</label>
            <select
              value={form.course_id}
              onChange={e => onFieldChange('course_id', e.target.value)}
              required
            >
              <option value="">-- Select Target {getProgramLabel()} --</option>
              {programs.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group student-details-form-group">
            <label>Target Section *</label>
            <select
              value={form.section_id}
              onChange={e => setForm({ ...form, section_id: e.target.value })}
              required
            >
              <option value="">-- Select Target Section --</option>
              {availableSections.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {availableSections.length === 0 && (
              <span className="student-details-span-220">
                ⚠️ No sections available for this configuration. Please set up sections first.
              </span>
            )}
          </div>

          {institutionType !== 'school' && (
            <div className="form-group student-details-form-group">
              <label>Target Semester *</label>
              <input
                type="number"
                min={1}
                max={8}
                value={form.semester}
                onChange={e => setForm({ ...form, semester: parseInt(e.target.value) || 1 })}
                required
              />
            </div>
          )}

          <div className="modal-actions student-details-modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!form.academic_year_id || !form.course_id || !form.section_id}
            >
              Promote Student
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
