import React from 'react';

interface EditProgramForm {
  id: string;
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

interface EditProgramModalProps {
  show: boolean;
  form: EditProgramForm;
  setForm: React.Dispatch<React.SetStateAction<EditProgramForm>>;
  institutionType: string;
  getProgramLabel: () => string;
  departments: any[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function EditProgramModal({ show, form, setForm, institutionType, getProgramLabel, departments, onClose, onSubmit }: EditProgramModalProps) {
  if (!show) return null;
  return (
    <div className="modal classes-modal">
      <div className="modal-content classes-modal-content size-sm">
        <h3 className="classes-title-237">Edit {getProgramLabel()}</h3>
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="classes-label-238">Code / Identifier *</label>
            <input
              type="text"
              value={form.course_code}
              onChange={e => setForm({ ...form, course_code: e.target.value.toUpperCase() })}
              required
            />
          </div>
          <div className="form-group classes-form-group">
            <label className="classes-label-240">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          {institutionType !== 'school' && (
            <>
              <div className="classes-grid-241" style={{ marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="classes-label-242">Degree Type *</label>
                  <select
                    value={form.degree_type}
                    onChange={e => setForm({ ...form, degree_type: e.target.value })}
                    className="classes-select-243"
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
                  <label className="classes-label-242">Department</label>
                  <select value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })} className="classes-select-243">
                    <option value="">-- Choose Department --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="classes-grid-241" style={{ marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="classes-label-244">Duration Value *</label>
                  <input
                    type="number"
                    value={form.duration_years}
                    onChange={e => setForm({ ...form, duration_years: Math.max(1, parseInt(e.target.value) || 1) })}
                    min="1"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="classes-label-244">Duration Unit *</label>
                  <select
                    value={form.duration_unit}
                    onChange={e => setForm({ ...form, duration_unit: e.target.value })}
                    className="classes-select-243"
                  >
                    <option value="Years">Years</option>
                    <option value="Semesters">Semesters</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Toggles Panel */}
          <div className="classes-col-245">
            <strong className="classes-strong-246">Academic Config Settings</strong>

            <label className="classes-row-247">
              <input type="checkbox" checked={form.semester_enabled === 1} onChange={e => setForm({ ...form, semester_enabled: e.target.checked ? 1 : 0 })} className="classes-input-248" />
              <span>Enable Semester System</span>
            </label>

            <label className="classes-row-249">
              <input type="checkbox" checked={form.credit_system_enabled === 1} onChange={e => setForm({ ...form, credit_system_enabled: e.target.checked ? 1 : 0 })} className="classes-input-250" />
              <span>Enable Credits System</span>
            </label>

            <label className="classes-row-251">
              <input type="checkbox" checked={form.electives_enabled === 1} onChange={e => setForm({ ...form, electives_enabled: e.target.checked ? 1 : 0 })} className="classes-input-252" />
              <span>Allow Elective Registrations</span>
            </label>
          </div>

          <div className="form-group classes-form-group">
            <label className="classes-label-254">Description</label>
            <textarea className="form-control classes-form-control" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
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
