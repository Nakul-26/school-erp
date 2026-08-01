import React from 'react';
import type { CreateDriveInput, Company } from '../placements.types';

interface AddDriveModalProps {
  show: boolean;
  form: CreateDriveInput;
  setForm: React.Dispatch<React.SetStateAction<CreateDriveInput>>;
  companies: Company[];
  programs: any[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function AddDriveModal({ show, form, setForm, companies, programs, onClose, onSubmit }: AddDriveModalProps) {
  if (!show) return null;

  return (
    <div className="modal">
      <div className="modal-content">
        <h3>New Placement Drive</h3>
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>Company *</label>
            <select value={form.company_id} onChange={e => setForm(f => ({ ...f, company_id: e.target.value }))} required>
              <option value="">Select company...</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Program *</label>
            <select value={form.course_id} onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))} required>
              <option value="">Select program...</option>
              {programs.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Role / Title *</label>
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>Type *</label>
            <select value={form.drive_type} onChange={e => setForm(f => ({ ...f, drive_type: e.target.value as any }))}>
              <option value="PLACEMENT">Placement</option>
              <option value="INTERNSHIP">Internship</option>
            </select>
          </div>
          <div className="form-group">
            <label>Package / Stipend Amount</label>
            <input type="number" value={form.package_amount ?? ''} onChange={e => setForm(f => ({ ...f, package_amount: e.target.value ? Number(e.target.value) : undefined }))} />
          </div>
          <div className="form-group">
            <label>Drive Date</label>
            <input type="date" value={form.drive_date || ''} onChange={e => setForm(f => ({ ...f, drive_date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Application Deadline</label>
            <input type="date" value={form.application_deadline || ''} onChange={e => setForm(f => ({ ...f, application_deadline: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Minimum CGPA (optional eligibility gate)</label>
            <input type="number" step="0.01" value={form.min_cgpa ?? ''} onChange={e => setForm(f => ({ ...f, min_cgpa: e.target.value ? Number(e.target.value) : undefined }))} />
          </div>
          <div className="form-group">
            <label>Max Open Backlogs Allowed (optional eligibility gate)</label>
            <input type="number" value={form.max_backlogs ?? ''} onChange={e => setForm(f => ({ ...f, max_backlogs: e.target.value ? Number(e.target.value) : undefined }))} />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            CGPA/backlog eligibility only applies to programs using the credit/GPA system — for other programs these two fields are ignored.
          </p>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create Drive</button>
          </div>
        </form>
      </div>
    </div>
  );
}
