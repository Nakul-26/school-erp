import React from 'react';

interface EditStudentModalProps {
  editForm: any;
  setEditForm: React.Dispatch<React.SetStateAction<any>>;
  editTab: 'personal' | 'academic' | 'guardian' | 'health';
  setEditTab: React.Dispatch<React.SetStateAction<'personal' | 'academic' | 'guardian' | 'health'>>;
  academicYears: any[];
  programs: any[];
  sections: any[];
  institutionType: string;
  getProgramLabel: () => string;
  handleEditSubmit: (e: React.FormEvent) => Promise<void>;
  setShowEditModal: (show: boolean) => void;
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
  editForm,
  setEditForm,
  editTab,
  setEditTab,
  academicYears,
  programs,
  sections,
  institutionType,
  getProgramLabel,
  handleEditSubmit,
  setShowEditModal,
}) => {
  return (
    <div className="modal students-modal">
      <div className="modal-content students-modal-content size-md students-modal-edit-walkthrough">
        <h3 className="students-title-94">Edit Student Record</h3>
        
        {/* Edit Modal Tabs */}
        <div className="students-modal-tabs-header">
          {(['personal', 'academic', 'guardian', 'health'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setEditTab(t)}
              className={`students-modal-tab-btn ${editTab === t ? 'is-active' : ''}`}
            >
              {t === 'personal' ? 'Personal' : t === 'academic' ? 'Academic' : t === 'guardian' ? 'Guardian' : 'Health Card'}
            </button>
          ))}
        </div>

        <form onSubmit={handleEditSubmit} className="students-walkthrough-form">
          <div className="students-walkthrough-form-scroll">
            {/* TAB 1: Personal Info */}
            {editTab === 'personal' && (
              <div>
                <div className="students-grid-96">
                  <div className="form-group">
                    <label>First Name *</label>
                    <input required type="text" value={editForm.first_name} onChange={e => setEditForm({...editForm, first_name: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Middle Name (Optional)</label>
                    <input type="text" value={editForm.middle_name || ''} onChange={e => setEditForm({...editForm, middle_name: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Last Name (Optional)</label>
                    <input type="text" value={editForm.last_name || ''} onChange={e => setEditForm({...editForm, last_name: e.target.value})} />
                  </div>
                </div>
                <div className="students-grid-97">
                  <div className="form-group">
                    <label>Admission No *</label>
                    <input required type="text" value={editForm.admission_number} onChange={e => setEditForm({...editForm, admission_number: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Roll No *</label>
                    <input required type="text" value={editForm.roll_number} onChange={e => setEditForm({...editForm, roll_number: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                </div>
                <div className="students-grid-98">
                  <div className="form-group">
                    <label>Gender *</label>
                    <select required value={editForm.gender} onChange={e => setEditForm({...editForm, gender: e.target.value})}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="APPLIED">APPLIED</option>
                      <option value="ADMITTED">ADMITTED</option>
                      <option value="GRADUATED">GRADUATED</option>
                      <option value="TRANSFERRED">TRANSFERRED</option>
                      <option value="DROPPED">DROPPED</option>
                      <option value="ALUMNI">ALUMNI</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Date of Birth *</label>
                  <input required type="date" value={editForm.date_of_birth} onChange={e => setEditForm({...editForm, date_of_birth: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Address *</label>
                  <textarea required value={editForm.address || ''} onChange={e => setEditForm({...editForm, address: e.target.value})} placeholder="Full address of the student" rows={2} className="students-textarea-address" />
                </div>
                <div className="form-group">
                  <label>Student Photo for ID Card *</label>
                  <input type="file" accept="image/*" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setEditForm((prev: any) => ({ ...prev, photo: reader.result as string }));
                      };
                      reader.readAsDataURL(file);
                    }
                  }} className="students-file-input" />
                  {editForm.photo && (
                    <div className="students-preview-box">
                      <img 
                        src={editForm.photo.startsWith('data:image') || editForm.photo.startsWith('/api') || editForm.photo.startsWith('http')
                          ? editForm.photo 
                          : `/api/students/photo/${editForm.id}`} 
                        alt="Preview" 
                        className="students-preview-img" 
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: Academic Details */}
            {editTab === 'academic' && (
              <div>
                <div className="form-group">
                  <label>Academic Year *</label>
                  <select required value={editForm.academic_year_id} onChange={e => setEditForm({...editForm, academic_year_id: e.target.value})}>
                    <option value="">-- Select Academic Year --</option>
                    {academicYears.map(y => (
                      <option key={y.id} value={y.id}>{y.name} {y.is_current ? '(Current)' : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>{getProgramLabel()} *</label>
                  <select required value={editForm.course_id} onChange={e => setEditForm({...editForm, course_id: e.target.value})}>
                    <option value="">-- Select {getProgramLabel()} --</option>
                    {programs.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Section *</label>
                  <select required value={editForm.section_id} onChange={e => setEditForm({...editForm, section_id: e.target.value})}>
                    <option value="">-- Select Section --</option>
                    {sections
                      .filter(s => !editForm.course_id || s.course_id === editForm.course_id)
                      .map(s => (
                        <option key={s.id} value={s.id}>{s.name} (Year {s.year_number})</option>
                      ))}
                  </select>
                </div>
                {institutionType !== 'school' && (
                  <div className="form-group">
                    <label>Semester</label>
                    <input type="number" min="1" max="10" value={editForm.semester} onChange={e => setEditForm({...editForm, semester: parseInt(e.target.value) || 1})} />
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Guardian Info */}
            {editTab === 'guardian' && (
              <div>
                {editForm.guardians?.map((g: any, idx: number) => (
                  <div key={idx} className="students-guardian-card">
                    <div className="students-guardian-card-header">
                      <span className="students-guardian-card-title">Guardian #{idx + 1}</span>
                      {editForm.guardians.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline text-danger"
                          onClick={() => {
                            const updated = editForm.guardians.filter((_: any, i: number) => i !== idx);
                            setEditForm({ ...editForm, guardians: updated });
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
                          const updated = editForm.guardians.map((item: any, i: number) => i === idx ? { ...item, name: e.target.value } : item);
                          setEditForm({ ...editForm, guardians: updated });
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
                          const updated = editForm.guardians.map((item: any, i: number) => i === idx ? { ...item, relationship: e.target.value } : item);
                          setEditForm({ ...editForm, guardians: updated });
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
                          const updated = editForm.guardians.map((item: any, i: number) => i === idx ? { ...item, phone: e.target.value } : item);
                          setEditForm({ ...editForm, guardians: updated });
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
                          const updated = editForm.guardians.map((item: any, i: number) => i === idx ? { ...item, email: e.target.value } : item);
                          setEditForm({ ...editForm, guardians: updated });
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
                    setEditForm({
                      ...editForm,
                      guardians: [...(editForm.guardians || []), { name: '', relationship: 'Mother', phone: '', email: '' }]
                    });
                  }}
                >
                  + Add Another Guardian
                </button>
              </div>
            )}

            {/* TAB 4: Health Card */}
            {editTab === 'health' && (
              <div>
                <div className="form-group">
                  <label>Blood Group</label>
                  <select value={editForm.blood_group} onChange={e => setEditForm({...editForm, blood_group: e.target.value})}>
                    <option value="">-- Choose Blood Group --</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Emergency Contact Phone</label>
                  <input type="text" value={editForm.emergency_contact} onChange={e => setEditForm({...editForm, emergency_contact: e.target.value})} placeholder="e.g. +91 98765 43210 (Father)" />
                </div>
                <div className="form-group">
                  <label>Medical Notes</label>
                  <textarea value={editForm.medical_notes} onChange={e => setEditForm({...editForm, medical_notes: e.target.value})} placeholder="e.g. Asthma, special instructions, etc." rows={3} className="students-textarea-99" />
                </div>
              </div>
            )}
          </div>

          <div className="modal-actions students-edit-modal-actions">
            <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
};
