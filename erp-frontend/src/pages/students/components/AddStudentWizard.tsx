import React from 'react';
import { Check, ArrowLeft } from 'lucide-react';

interface AddStudentWizardProps {
  step: number;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  addForm: any;
  setAddForm: React.Dispatch<React.SetStateAction<any>>;
  academicYears: any[];
  programs: any[];
  sections: any[];
  institutionType: string;
  getProgramLabel: () => string;
  handleAddSubmit: (e: React.FormEvent) => Promise<void>;
  handlePrevStep: () => void;
  handleNextStep: () => void;
  canSubmit: boolean;
  setShowAddModal: (show: boolean) => void;
  resetAddForm: () => void;
}

export const AddStudentWizard: React.FC<AddStudentWizardProps> = ({
  step,
  setStep,
  addForm,
  setAddForm,
  academicYears,
  programs,
  sections,
  institutionType,
  getProgramLabel,
  handleAddSubmit,
  handlePrevStep,
  handleNextStep,
  canSubmit,
  setShowAddModal,
  resetAddForm,
}) => {
  return (
    <>
      <div className="page-header students-admission-header">
        <button className="btn btn-secondary students-btn-back" onClick={() => { setShowAddModal(false); resetAddForm(); }}>
          <ArrowLeft size={18} />
        </button>
        <div className="students-center-align">
          <h2 className="students-title-3">Student Admission Walkthrough</h2>
          <p className="students-text-4">Follow the steps to register and enroll a new student profile.</p>
        </div>
      </div>

      <div className="card students-walkthrough-card">
        {/* Stepper Progress bar */}
        <div className="students-row-6">
          {[
            { s: 1, label: 'Personal' },
            { s: 2, label: 'Academic' },
            { s: 3, label: 'Guardian' },
            { s: 4, label: 'Health Card' },
            { s: 5, label: 'Review' }
          ].map(st => (
            <div key={st.s} className={`students-stepper-step ${step === st.s ? 'is-current' : step > st.s ? 'is-completed' : 'is-upcoming'}`}>
              <div className={`students-stepper-badge ${step === st.s ? 'is-current' : step > st.s ? 'is-completed' : 'is-upcoming'}`}>
                {step > st.s ? <Check size={14} /> : st.s}
              </div>
              <span className="stepper-label students-stepper-label">{st.label}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddSubmit} className="students-walkthrough-form">
          <div className="students-walkthrough-form-scroll">
            {/* STEP 1: Personal Info */}
            {step === 1 && (
              <div>
                <h4 className="students-title-8">Step 1: Personal Information</h4>
                <div className="students-grid-9">
                  <div className="form-group">
                    <label>First Name *</label>
                    <input required type="text" value={addForm.first_name} onChange={e => setAddForm({...addForm, first_name: e.target.value})} placeholder="e.g. Alice" />
                  </div>
                  <div className="form-group">
                    <label>Middle Name (Optional)</label>
                    <input type="text" value={addForm.middle_name || ''} onChange={e => setAddForm({...addForm, middle_name: e.target.value})} placeholder="e.g. Marie" />
                  </div>
                  <div className="form-group">
                    <label>Last Name (Optional)</label>
                    <input type="text" value={addForm.last_name || ''} onChange={e => setAddForm({...addForm, last_name: e.target.value})} placeholder="e.g. Wonder" />
                  </div>
                </div>
                <div className="students-grid-10">
                  <div className="form-group">
                    <label>Admission Number *</label>
                    <input required type="text" value={addForm.admission_number} onChange={e => setAddForm({...addForm, admission_number: e.target.value})} placeholder="e.g. ADM-2001" />
                  </div>
                  <div className="form-group">
                    <label>Roll Number *</label>
                    <input required type="text" value={addForm.roll_number} onChange={e => setAddForm({...addForm, roll_number: e.target.value})} placeholder="e.g. CSE-A-12" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} placeholder="alice@example.com" />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input type="text" value={addForm.phone} onChange={e => setAddForm({...addForm, phone: e.target.value})} placeholder="e.g. +91 99999 88888" />
                </div>
                <div className="students-grid-11">
                  <div className="form-group">
                    <label>Gender *</label>
                    <select required value={addForm.gender} onChange={e => setAddForm({...addForm, gender: e.target.value})}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Date of Birth *</label>
                    <input required type="date" value={addForm.date_of_birth} onChange={e => setAddForm({...addForm, date_of_birth: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Address *</label>
                  <textarea required value={addForm.address} onChange={e => setAddForm({...addForm, address: e.target.value})} placeholder="Full address of the student" rows={2} className="students-textarea-address" />
                </div>
                <div className="form-group">
                  <label>Student Photo for ID Card *</label>
                  <input required type="file" accept="image/*" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setAddForm((prev: any) => ({ ...prev, photo: reader.result as string }));
                      };
                      reader.readAsDataURL(file);
                    }
                  }} className="students-file-input" />
                  {addForm.photo && (
                    <div className="students-preview-box">
                      <img src={addForm.photo} alt="Preview" className="students-preview-img" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: Academic Info */}
            {step === 2 && (
              <div>
                <h4 className="students-title-12">Step 2: Academic Assignment</h4>
                
                <div className="form-group">
                  <label>Academic Year *</label>
                  <select required value={addForm.academic_year_id} onChange={e => setAddForm({...addForm, academic_year_id: e.target.value})}>
                    <option value="">-- Select Academic Year --</option>
                    {academicYears.map(y => (
                      <option key={y.id} value={y.id}>{y.name} {y.is_current ? '(Current)' : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{getProgramLabel()} *</label>
                  <select required value={addForm.course_id} onChange={e => setAddForm({...addForm, course_id: e.target.value})}>
                    <option value="">-- Select {getProgramLabel()} --</option>
                    {programs.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Section / Class *</label>
                  <select required value={addForm.section_id} onChange={e => setAddForm({...addForm, section_id: e.target.value})}>
                    <option value="">-- Select Section --</option>
                    {sections
                      .filter(s => !addForm.course_id || s.course_id === addForm.course_id)
                      .map(s => (
                        <option key={s.id} value={s.id}>{s.name} (Year {s.year_number})</option>
                      ))}
                  </select>
                </div>
              </div>
            )}

            {/* STEP 3: Guardian Info */}
            {step === 3 && (
              <div>
                <h4 className="students-title-13">Step 3: Guardian Details</h4>
                
                {addForm.guardians.map((g: any, idx: number) => (
                  <div key={idx} className="students-guardian-card">
                    <div className="students-guardian-card-header">
                      <span className="students-guardian-card-title">Guardian #{idx + 1}</span>
                      {addForm.guardians.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline text-danger"
                          onClick={() => {
                            const updated = addForm.guardians.filter((_: any, i: number) => i !== idx);
                            setAddForm({ ...addForm, guardians: updated });
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Guardian Name *</label>
                      <input
                        required
                        type="text"
                        value={g.name}
                        onChange={e => {
                          const updated = addForm.guardians.map((item: any, i: number) => i === idx ? { ...item, name: e.target.value } : item);
                          setAddForm({ ...addForm, guardians: updated });
                        }}
                        placeholder="Full name of Father/Mother/Guardian"
                      />
                    </div>

                    <div className="form-group">
                      <label>Relationship *</label>
                      <select
                        required
                        value={g.relationship}
                        onChange={e => {
                          const updated = addForm.guardians.map((item: any, i: number) => i === idx ? { ...item, relationship: e.target.value } : item);
                          setAddForm({ ...addForm, guardians: updated });
                        }}
                      >
                        <option value="Father">Father</option>
                        <option value="Mother">Mother</option>
                        <option value="Guardian">Guardian</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Guardian Phone *</label>
                      <input
                        required
                        type="text"
                        value={g.phone}
                        onChange={e => {
                          const updated = addForm.guardians.map((item: any, i: number) => i === idx ? { ...item, phone: e.target.value } : item);
                          setAddForm({ ...addForm, guardians: updated });
                        }}
                        placeholder="Phone number"
                      />
                    </div>

                    <div className="form-group">
                      <label>Guardian Email</label>
                      <input
                        type="email"
                        value={g.email || ''}
                        onChange={e => {
                          const updated = addForm.guardians.map((item: any, i: number) => i === idx ? { ...item, email: e.target.value } : item);
                          setAddForm({ ...addForm, guardians: updated });
                        }}
                        placeholder="guardian@example.com"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className="btn btn-outline btn-sm students-btn-add-guardian"
                  onClick={() => {
                    setAddForm({
                      ...addForm,
                      guardians: [...addForm.guardians, { name: '', relationship: 'Mother', phone: '', email: '' }]
                    });
                  }}
                >
                  + Add Another Guardian
                </button>
              </div>
            )}

            {/* STEP 4: Health Info */}
            {step === 4 && (
              <div>
                <h4 className="students-title-health">Step 4: Health Card (Optional)</h4>
                <div className="form-group">
                  <label>Blood Group</label>
                  <select value={addForm.blood_group} onChange={e => setAddForm({...addForm, blood_group: e.target.value})}>
                    <option value="">-- Choose Blood Group --</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Emergency Contact Phone</label>
                  <input type="text" value={addForm.emergency_contact} onChange={e => setAddForm({...addForm, emergency_contact: e.target.value})} placeholder="e.g. +91 98765 43210 (Father)" />
                </div>
                <div className="form-group">
                  <label>Medical Notes</label>
                  <textarea value={addForm.medical_notes} onChange={e => setAddForm({...addForm, medical_notes: e.target.value})} placeholder="e.g. Asthma, special instructions, etc." rows={3} className="students-textarea-99" />
                </div>
              </div>
            )}

            {/* STEP 5: Review */}
            {step === 5 && (
              <div>
                <h4 className="students-title-14">Step 5: Review and Verify</h4>
                
                <div className="students-col-15">
                  <div className="students-summary-avatar-row">
                    {addForm.photo && (
                      <img src={addForm.photo} alt="Student Preview" className="students-summary-avatar-img" />
                    )}
                    <div>
                      <strong className="students-strong-16">Personal</strong>
                      <div>Name: <strong>{addForm.first_name} {addForm.middle_name ? addForm.middle_name + ' ' : ''}{addForm.last_name}</strong></div>
                      <div>Admission No: <strong>{addForm.admission_number}</strong> | Roll No: <strong>{addForm.roll_number || '-'}</strong></div>
                    </div>
                  </div>
                  <div>
                    <div>Gender: {addForm.gender} | DOB: {addForm.date_of_birth || '-'}</div>
                    <div>Phone: {addForm.phone || '-'} | Email: {addForm.email || '-'}</div>
                    <div>Address: <strong>{addForm.address || '-'}</strong></div>
                  </div>

                  <div className="students-div-17">
                    <strong className="students-strong-18">Academic Enrollment</strong>
                    <div>Year: {academicYears.find(y => y.id === addForm.academic_year_id)?.name || '-'}</div>
                    <div>{getProgramLabel()}: {programs.find(p => p.id === addForm.course_id)?.name || '-'}</div>
                    <div>Section: {sections.find(s => s.id === addForm.section_id)?.name || '-'}</div>
                  </div>

                  <div className="students-div-19">
                    <strong className="students-strong-20">Guardian Contacts</strong>
                    {addForm.guardians.map((g: any, idx: number) => (
                      <div key={idx} className="students-summary-guardian-item">
                        <div><strong>Guardian #{idx + 1}:</strong> {g.name || '-'} ({g.relationship})</div>
                        <div>Phone: {g.phone || '-'} | Email: {g.email || '-'}</div>
                      </div>
                    ))}
                  </div>

                  <div className="students-div-health">
                    <strong className="students-strong-health">Health Information</strong>
                    <div>Blood Group: <strong>{addForm.blood_group || '-'}</strong></div>
                    <div>Emergency Contact: <strong>{addForm.emergency_contact || '-'}</strong></div>
                    <div>Medical Notes: <strong>{addForm.medical_notes || '-'}</strong></div>
                  </div>
                </div>

                <p className="students-text-21">
                  Confirming will automatically register the student profile, establish the class enrollment record, and instantiate ledger entries matching active fee structures.
                </p>
              </div>
            )}
          </div>

          {/* Stepper Buttons */}
          <div className="modal-actions students-stepper-actions">
            {/* Left Side: Cancel */}
            <div className="students-left-align">
              <button type="button" onClick={() => { setShowAddModal(false); resetAddForm(); }} className="btn btn-secondary">Cancel</button>
            </div>
            
            {/* Center Side: Prev and Next */}
            <div className="students-flex-center-gap">
              {step > 1 && (
                <button type="button" onClick={handlePrevStep} className="btn btn-outline">Back</button>
              )}
              {step < 5 && (
                <button type="button" onClick={handleNextStep} className="btn btn-primary">Next</button>
              )}
            </div>
            
            {/* Right Side: Submit */}
            <div className="students-right-align">
              {step === 5 && (
                <button type="submit" className="btn btn-primary" disabled={!canSubmit}>Admit Student</button>
              )}
            </div>
          </div>
        </form>
      </div>
    </>
  );
};
