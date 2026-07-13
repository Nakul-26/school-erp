import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface AddTeacherWizardProps {
  createStep: number;
  setCreateStep: React.Dispatch<React.SetStateAction<number>>;
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  departments: any[];
  programs: any[];
  subjects: any[];
  sections: any[];
  academicYears: any[];
  getSubjectsForDepartment: (deptName: string) => any[];
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  prevStep: () => void;
  nextStep: () => void;
  setShowModal: (show: boolean) => void;
}

export const AddTeacherWizard: React.FC<AddTeacherWizardProps> = ({
  createStep,
  setCreateStep,
  form,
  setForm,
  departments,
  programs,
  subjects,
  sections,
  academicYears,
  getSubjectsForDepartment,
  handleSubmit,
  prevStep,
  nextStep,
  setShowModal,
}) => {
  return (
    <>
      <div className="page-header teachers-page-header">
        <button className="btn btn-secondary teachers-btn-back" onClick={() => setShowModal(false)}>
          <ArrowLeft size={18} />
        </button>
        <div className="teachers-center-align">
          <h2 className="teachers-title-3">Teacher Registration Walkthrough</h2>
          <p className="teachers-text-4">Follow the steps to register a new teacher and set up their portal account.</p>
        </div>
      </div>

      <div className="card teachers-walkthrough-card">
        {/* Step Indicators */}
        <div className="teachers-row-6">
          {[
            { step: 1, label: 'Personal' },
            { step: 2, label: 'Professional' },
            { step: 3, label: 'Account' },
            { step: 4, label: 'Review' }
          ].map(st => {
            const isActive = createStep >= st.step;
            const isCurrent = createStep === st.step;
            return (
              <div key={st.step} className="teachers-col-8">
                <div className={`teachers-stepper-badge ${isCurrent ? 'is-current' : isActive ? 'is-completed' : 'is-upcoming'}`}>
                  {isActive && createStep > st.step ? '✓' : st.step}
                </div>
                <span className="stepper-label teachers-stepper-label">{st.label}</span>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="teachers-walkthrough-form">
          <div className="teachers-walkthrough-form-scroll">
            {/* Step 1: Personal Details */}
            {createStep === 1 && (
              <div className="teachers-col-9">
                <div className="teachers-grid-10">
                  <div className="form-group">
                    <label>First Name *</label>
                    <input required type="text" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} placeholder="e.g. John" />
                  </div>
                  <div className="form-group">
                    <label>Middle Name</label>
                    <input type="text" value={form.middle_name} onChange={e => setForm({...form, middle_name: e.target.value})} placeholder="e.g. Alan" />
                  </div>
                  <div className="form-group">
                    <label>Last Name *</label>
                    <input required type="text" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} placeholder="e.g. Smith" />
                  </div>
                </div>
                
                <div className="teachers-grid-11">
                  <div className="form-group">
                    <label>Email Address *</label>
                    <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="john.smith@institution.com" />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="e.g. +91 99999 88888" />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Professional Details */}
            {createStep === 2 && (
              <div className="teachers-col-12">
                <div className="teachers-grid-13">
                  <div className="form-group">
                    <label>Employee ID *</label>
                    <input required type="text" value={form.employee_id} onChange={e => setForm({...form, employee_id: e.target.value})} placeholder="e.g. EMP-101" />
                  </div>
                  <div className="form-group">
                    <label>Department *</label>
                    <select 
                      required 
                      value={form.department} 
                      onChange={e => setForm({...form, department: e.target.value, selectedSubjects: []})}
                    >
                      <option value="">-- Choose Department --</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Designation</label>
                    <input type="text" value={form.designation} onChange={e => setForm({...form, designation: e.target.value})} placeholder="e.g. Assistant Professor" />
                  </div>
                </div>

                <div className="teachers-grid-14">
                  <div className="form-group">
                    <label>Joining Date</label>
                    <input type="date" value={form.joining_date} onChange={e => setForm({...form, joining_date: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Qualification</label>
                    <input type="text" value={form.qualification} onChange={e => setForm({...form, qualification: e.target.value})} placeholder="e.g. Ph.D., M.Tech" />
                  </div>
                  <div className="form-group">
                    <label>Experience (Years / Details)</label>
                    <input type="text" value={form.experience} onChange={e => setForm({...form, experience: e.target.value})} placeholder="e.g. 5 Years" />
                  </div>
                </div>

                {form.department && (
                  <div className="form-group teachers-form-group">
                    <label className="teachers-label-16">Available Subjects (Autocreated Assignments)</label>
                    <div className="teachers-grid-17">
                      {getSubjectsForDepartment(form.department).map(s => {
                        const programName = programs.find(p => p.id === s.course_id)?.name || '';
                        return (
                          <label key={s.id} className="teachers-row-18">
                            <input 
                              type="checkbox" 
                              checked={form.selectedSubjects?.includes(s.id)}
                              onChange={e => {
                                const checked = e.target.checked;
                                const updated = checked 
                                  ? [...(form.selectedSubjects || []), s.id]
                                  : (form.selectedSubjects || []).filter((id: string) => id !== s.id);
                                setForm({ ...form, selectedSubjects: updated });
                              }}
                            />
                            <div>
                              <span className="teachers-span-19">{s.subject_name}</span>
                              <span className="teachers-span-20">{programName}</span>
                            </div>
                          </label>
                        );
                      })}
                      {getSubjectsForDepartment(form.department).length === 0 && (
                        <span className="teachers-span-21">No subjects found for this department.</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Account Setup */}
            {createStep === 3 && (
              <div className="teachers-col-22">
                <label className="teachers-row-23">
                  <input type="checkbox" checked={form.create_login} onChange={e => setForm({...form, create_login: e.target.checked})} className="teachers-input-24" />
                  <span>Create Login Account</span>
                </label>

                {form.create_login ? (
                  <div className="teachers-col-25">
                    <div className="form-group">
                      <label className="teachers-label-26">Username *</label>
                      <input 
                        required 
                        type="text" 
                        value={form.username} 
                        onChange={e => setForm({...form, username: e.target.value})} 
                        placeholder="e.g. john.smith"
                      />
                      <span className="teachers-span-27">
                        Unique identifier used to access the portal.
                      </span>
                    </div>

                    <div className="teachers-grid-28">
                      <div className="form-group">
                        <label className="teachers-label-29">Temporary Password *</label>
                        <input 
                          required 
                          type="text" 
                          value={form.password} 
                          onChange={e => setForm({...form, password: e.target.value})} 
                          placeholder="e.g. Temp@2026"
                        />
                      </div>
                      <div className="form-group">
                        <label className="teachers-label-30">Role</label>
                        <input type="text" value="Teacher" disabled className="teachers-input-31" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="teachers-row-32">
                    <span>Login account will be created later.</span>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Review & Confirm */}
            {createStep === 4 && (
              <div className="teachers-col-33">
                <div className="teachers-div-34">
                  <h4 className="teachers-title-35">Personal Details</h4>
                  <div className="teachers-grid-36">
                    <div><strong className="teachers-strong-37">Name:</strong> {form.first_name} {form.middle_name ? form.middle_name + ' ' : ''}{form.last_name}</div>
                    <div><strong className="teachers-strong-38">Email:</strong> {form.email || 'N/A'}</div>
                    <div><strong className="teachers-strong-39">Phone:</strong> {form.phone || 'N/A'}</div>
                  </div>
                </div>

                <div className="teachers-div-40">
                  <h4 className="teachers-title-41">Professional Details</h4>
                  <div className="teachers-grid-42">
                    <div><strong className="teachers-strong-43">Employee ID:</strong> {form.employee_id}</div>
                    <div><strong className="teachers-strong-44">Department:</strong> {form.department}</div>
                    <div><strong className="teachers-strong-45">Designation:</strong> {form.designation || 'N/A'}</div>
                    <div><strong className="teachers-strong-46">Joining Date:</strong> {form.joining_date || 'N/A'}</div>
                    <div><strong className="teachers-strong-47">Qualification:</strong> {form.qualification || 'N/A'}</div>
                    <div><strong className="teachers-strong-48">Experience:</strong> {form.experience || 'N/A'}</div>
                  </div>
                </div>

                <div className="teachers-div-49">
                  <h4 className="teachers-title-50">Account Setup</h4>
                  {form.create_login ? (
                    <div className="teachers-grid-51">
                      <div><strong className="teachers-strong-52">Username:</strong> {form.username}</div>
                      <div><strong className="teachers-strong-53">Password:</strong> {form.password}</div>
                      <div><strong className="teachers-strong-54">Role:</strong> Teacher</div>
                    </div>
                  ) : (
                    <div className="teachers-div-55">
                      Login account will be created later.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Wizard Form Actions */}
          <div className="modal-actions teachers-modal-actions">
            <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary teachers-btn">Cancel</button>
            <div className="teachers-row-58">
              {createStep > 1 && (
                <button type="button" onClick={prevStep} className="btn btn-secondary">
                  Back
                </button>
              )}
              {createStep < 4 ? (
                <button key="btn-next" type="button" onClick={nextStep} className="btn btn-primary">
                  Next
                </button>
              ) : (
                <button key="btn-submit" type="submit" className="btn btn-primary">
                  Create Teacher
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </>
  );
};
