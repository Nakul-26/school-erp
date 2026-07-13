import React from 'react';

interface EditTeacherModalProps {
  editForm: any;
  setEditForm: React.Dispatch<React.SetStateAction<any>>;
  editTab: 'personal' | 'professional' | 'academic' | 'account';
  setEditTab: React.Dispatch<React.SetStateAction<'personal' | 'professional' | 'academic' | 'account'>>;
  editAssignments: any[];
  newAssignment: any;
  setNewAssignment: React.Dispatch<React.SetStateAction<any>>;
  departments: any[];
  programs: any[];
  subjects: any[];
  sections: any[];
  academicYears: any[];
  handleEditSubmit: (e: React.FormEvent) => Promise<void>;
  handleAddAssignment: (e: React.FormEvent) => Promise<void>;
  handleRemoveAssignment: (assignId: string) => Promise<void>;
  setShowEditModal: (show: boolean) => void;
}

export const EditTeacherModal: React.FC<EditTeacherModalProps> = ({
  editForm,
  setEditForm,
  editTab,
  setEditTab,
  editAssignments,
  newAssignment,
  setNewAssignment,
  departments,
  programs,
  subjects,
  sections,
  academicYears,
  handleEditSubmit,
  handleAddAssignment,
  handleRemoveAssignment,
  setShowEditModal,
}) => {
  return (
    <div className="modal teachers-modal">
      <div className="modal-content teachers-modal-content size-md">
        <h3 className="teachers-title-91">Edit Teacher Record</h3>
        
        {/* Edit Modal Tabs */}
        <div className="teachers-modal-tabs-header">
          {(['personal', 'professional', 'academic', 'account'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setEditTab(t)}
              className={`teachers-modal-tab-btn ${editTab === t ? 'is-active' : ''}`}
            >
              {t === 'personal' ? 'Personal' : t === 'professional' ? 'Professional' : t === 'academic' ? 'Academic Load' : 'Portal Account'}
            </button>
          ))}
        </div>

        <form onSubmit={handleEditSubmit}>
          <div className="teachers-walkthrough-form-scroll">
            {/* TAB 1: Personal */}
            {editTab === 'personal' && (
              <div className="teachers-col-93">
                <div className="teachers-grid-94">
                  <div className="form-group">
                    <label>First Name *</label>
                    <input required type="text" value={editForm.first_name} onChange={e => setEditForm({...editForm, first_name: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Middle Name</label>
                    <input type="text" value={editForm.middle_name || ''} onChange={e => setEditForm({...editForm, middle_name: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Last Name *</label>
                    <input required type="text" value={editForm.last_name} onChange={e => setEditForm({...editForm, last_name: e.target.value})} />
                  </div>
                </div>
                <div className="teachers-grid-95">
                  <div className="form-group">
                    <label>Email *</label>
                    <input required type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input type="text" value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Professional */}
            {editTab === 'professional' && (
              <div className="teachers-col-96">
                <div className="teachers-grid-97">
                  <div className="form-group">
                    <label>Employee ID *</label>
                    <input required type="text" value={editForm.employee_id} onChange={e => setEditForm({...editForm, employee_id: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Department *</label>
                    <select 
                      required 
                      value={editForm.department} 
                      onChange={e => setEditForm({...editForm, department: e.target.value})}
                    >
                      <option value="">-- Choose Department --</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="teachers-grid-98">
                  <div className="form-group">
                    <label>Designation</label>
                    <input type="text" value={editForm.designation || ''} onChange={e => setEditForm({...editForm, designation: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Joining Date</label>
                    <input type="date" value={editForm.joining_date || ''} onChange={e => setEditForm({...editForm, joining_date: e.target.value})} />
                  </div>
                </div>
                <div className="teachers-grid-99">
                  <div className="form-group">
                    <label>Qualification</label>
                    <input type="text" value={editForm.qualification || ''} onChange={e => setEditForm({...editForm, qualification: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Experience (Years)</label>
                    <input type="text" value={editForm.experience || ''} onChange={e => setEditForm({...editForm, experience: e.target.value})} />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Academic Assignments */}
            {editTab === 'academic' && (
              <div>
                <h4 className="teachers-title-100">Add Subject Assignment</h4>
                
                <div className="teachers-grid-101">
                  <div className="form-group teachers-form-group">
                    <label className="teachers-label-103">Academic Year</label>
                    <select 
                      value={newAssignment.academic_year_id} 
                      onChange={e => setNewAssignment({...newAssignment, academic_year_id: e.target.value})}
                    >
                      {academicYears.map(y => (
                        <option key={y.id} value={y.id}>{y.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group teachers-form-group">
                    <label className="teachers-label-105">Class / Program</label>
                    <select 
                      value={newAssignment.course_id} 
                      onChange={e => setNewAssignment({...newAssignment, course_id: e.target.value, section_id: '', subject_id: ''})}
                    >
                      {programs.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group teachers-form-group">
                    <label className="teachers-label-107">Section</label>
                    <select 
                      value={newAssignment.section_id} 
                      onChange={e => setNewAssignment({...newAssignment, section_id: e.target.value})}
                    >
                      <option value="">-- Choose Section --</option>
                      {sections
                        .filter(s => s.course_id === newAssignment.course_id)
                        .map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                  </div>

                  <div className="form-group teachers-form-group">
                    <label className="teachers-label-109">Subject</label>
                    <select 
                      value={newAssignment.subject_id} 
                      onChange={e => setNewAssignment({...newAssignment, subject_id: e.target.value})}
                    >
                      <option value="">-- Choose Subject --</option>
                      {subjects
                        .filter(s => s.course_id === newAssignment.course_id)
                        .map(s => (
                          <option key={s.id} value={s.id}>{s.subject_name}</option>
                        ))}
                    </select>
                  </div>

                  <button type="button" onClick={handleAddAssignment} className="btn btn-primary btn-sm teachers-btn">
                    Assign
                  </button>
                </div>

                <h4 className="teachers-title-111">Current Assignments</h4>
                <div className="teachers-div-112">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Year</th>
                        <th>Class</th>
                        <th>Section</th>
                        <th>Subject</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editAssignments.map(a => (
                        <tr key={a.id}>
                          <td>{academicYears.find(y => y.id === a.academic_year_id)?.name || 'N/A'}</td>
                          <td>{programs.find(p => p.id === a.course_id)?.name || 'N/A'}</td>
                          <td>{sections.find(s => s.id === a.section_id)?.name || 'N/A'}</td>
                          <td>{subjects.find(s => s.id === a.subject_id)?.subject_name || 'N/A'}</td>
                          <td>
                            <button type="button" onClick={() => handleRemoveAssignment(a.id)} className="btn btn-sm btn-outline-danger teachers-btn">
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                      {editAssignments.length === 0 && (
                        <tr>
                          <td colSpan={5} className="teachers-td-114">No assignments mapped.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: Account Status */}
            {editTab === 'account' && (
              <div className="teachers-col-115">
                <div className="form-group">
                  <label>Account Status</label>
                  <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="ON_LEAVE">ON LEAVE</option>
                    <option value="RESIGNED">RESIGNED</option>
                    <option value="RETIRED">RETIRED</option>
                  </select>
                </div>
                <div className="teachers-div-116">
                  <strong>Administrative Note:</strong> Account credential resets and login profile adjustments must be performed through the general Users Directory access control configurations.
                </div>
              </div>
            )}
          </div>

          <div className="modal-actions teachers-modal-actions">
            <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-secondary">Cancel</button>
            {editTab !== 'academic' && (
              <button type="submit" className="btn btn-primary">Save Changes</button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
