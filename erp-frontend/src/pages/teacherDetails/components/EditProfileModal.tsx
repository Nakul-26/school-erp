import React from 'react';

interface EditProfileModalProps {
  show: boolean;
  editTab: 'personal' | 'professional' | 'account';
  setEditTab: (tab: 'personal' | 'professional' | 'account') => void;
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  departments: any[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function EditProfileModal({ show, editTab, setEditTab, form, setForm, departments, onClose, onSubmit }: EditProfileModalProps) {
  if (!show) return null;
  return (
    <div className="teacher-details-modal-overlay">
      <div className="card modal-content teacher-details-modal-card-wide">
        <h3 className="teacher-details-modal-title">Edit Teacher Profile</h3>

        <div className="teacher-details-edit-tabs-nav">
          <button
            type="button"
            className={`teacher-details-edit-tab-btn${editTab === 'personal' ? ' is-active' : ''}`}
            onClick={() => setEditTab('personal')}
          >
            Personal Details
          </button>
          <button
            type="button"
            className={`teacher-details-edit-tab-btn${editTab === 'professional' ? ' is-active' : ''}`}
            onClick={() => setEditTab('professional')}
          >
            Professional Details
          </button>
        </div>

        <form onSubmit={onSubmit} className="teacher-details-modal-form">
          {editTab === 'personal' && (
            <div className="teacher-details-form-row-2col">
              <div className="teacher-details-form-group-col">
                <label className="teacher-details-form-label-styled">First Name</label>
                <input type="text" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} className="input" required />
              </div>
              <div className="teacher-details-form-group-col">
                <label className="teacher-details-form-label-styled">Last Name</label>
                <input type="text" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} className="input" required />
              </div>
              <div className="teacher-details-form-group-col">
                <label className="teacher-details-form-label-styled">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input" />
              </div>
              <div className="teacher-details-form-group-col">
                <label className="teacher-details-form-label-styled">Phone</label>
                <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="input" />
              </div>
            </div>
          )}

          {editTab === 'professional' && (
            <div className="teacher-details-form-row-2col">
              <div className="teacher-details-form-group-col">
                <label className="teacher-details-form-label-styled">Employee ID</label>
                <input type="text" value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} className="input" />
              </div>
              <div className="teacher-details-form-group-col">
                <label className="teacher-details-form-label-styled">Department</label>
                <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="input">
                  <option value="">Select Department</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="teacher-details-form-group-col">
                <label className="teacher-details-form-label-styled">Designation</label>
                <input type="text" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} className="input" />
              </div>
              <div className="teacher-details-form-group-col">
                <label className="teacher-details-form-label-styled">Joining Date</label>
                <input type="date" value={form.joining_date} onChange={e => setForm({ ...form, joining_date: e.target.value })} className="input" />
              </div>
            </div>
          )}

          <div className="teacher-details-modal-actions-row-large">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}
