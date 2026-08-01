import React from 'react';

interface AddProgramForm {
  name: string;
  course_code: string;
  duration_years: number;
  duration_unit: string;
  degree_type: string;
  department_id: string;
  semester_enabled: number;
  credit_system_enabled: number;
  electives_enabled: number;
  description: string;
}

interface AddProgramModalProps {
  show: boolean;
  form: AddProgramForm;
  setForm: React.Dispatch<React.SetStateAction<AddProgramForm>>;
  institutionType: string;
  getProgramLabel: () => string;
  departments: any[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function AddProgramModal({ show, form, setForm, institutionType, getProgramLabel, departments, onClose, onSubmit }: AddProgramModalProps) {
  if (!show) return null;
  return (
    <div className="modal classes-modal">
      <div className="modal-content classes-modal-content size-sm">
        <h3 className="classes-title-215">Add New {getProgramLabel()}</h3>
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="classes-label-216">Code / Identifier *</label>
            <input
              type="text"
              value={form.course_code}
              onChange={e => setForm({ ...form, course_code: e.target.value.toUpperCase() })}
              placeholder={institutionType === 'school' ? 'e.g. GRADE-10' : 'e.g. BE-CSE'}
              required
            />
          </div>
          <div className="form-group classes-form-group">
            <label className="classes-label-218">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder={institutionType === 'school' ? 'e.g. Grade 10 Standard' : 'e.g. B.E. Computer Science & Engineering'}
              required
            />
          </div>

          {institutionType !== 'school' && (
            <>
              <div className="classes-grid-219" style={{ marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="classes-label-220">Degree Type *</label>
                  <select
                    value={form.degree_type}
                    onChange={e => setForm({ ...form, degree_type: e.target.value })}
                    className="classes-select-221"
                    required
                  >
                    <option value="UG">UG (Bachelor Degree)</option>
                    <option value="PG">PG (Master Degree)</option>
                    <option value="Diploma">Diploma</option>
                    <option value="Doctorate">Doctorate (PhD)</option>
                    <option value="Certificate">Certificate</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="classes-label-220">Department</label>
                  <select value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })} className="classes-select-221">
                    <option value="">-- Choose Department --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="classes-grid-219" style={{ marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="classes-label-222">Duration Value *</label>
                  <input
                    type="number"
                    value={form.duration_years}
                    onChange={e => setForm({ ...form, duration_years: Math.max(1, parseInt(e.target.value) || 1) })}
                    min="1"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="classes-label-222">Duration Unit *</label>
                  <select
                    value={form.duration_unit}
                    onChange={e => setForm({ ...form, duration_unit: e.target.value })}
                    className="classes-select-221"
                  >
                    <option value="Years">Years</option>
                    <option value="Semesters">Semesters</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Toggles Panel */}
          <div className="classes-col-223">
            <strong className="classes-strong-224">Academic Config Settings</strong>

            <label className="classes-row-225">
              <input type="checkbox" checked={form.semester_enabled === 1} onChange={e => setForm({ ...form, semester_enabled: e.target.checked ? 1 : 0 })} className="classes-input-226" />
              <span>Enable Semester System (Semi-annual exams and classes)</span>
            </label>

            <label className="classes-row-227">
              <input type="checkbox" checked={form.credit_system_enabled === 1} onChange={e => setForm({ ...form, credit_system_enabled: e.target.checked ? 1 : 0 })} className="classes-input-228" />
              <span>Enable Credits System (Subjects carry academic weight/credits)</span>
            </label>

            <label className="classes-row-229">
              <input type="checkbox" checked={form.electives_enabled === 1} onChange={e => setForm({ ...form, electives_enabled: e.target.checked ? 1 : 0 })} className="classes-input-230" />
              <span>Allow Elective Registrations (Students can opt for selective subjects)</span>
            </label>
          </div>

          <div className="form-group classes-form-group">
            <label className="classes-label-232">Description</label>
            <textarea className="form-control classes-form-control" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Provide syllabus outline or descriptions..." />
          </div>

          <div className="modal-actions classes-modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Save {getProgramLabel()}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
