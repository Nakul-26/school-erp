import React from 'react';
import type { CreateCompanyInput } from '../placements.types';

interface AddCompanyModalProps {
  show: boolean;
  form: CreateCompanyInput;
  setForm: React.Dispatch<React.SetStateAction<CreateCompanyInput>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function AddCompanyModal({ show, form, setForm, onClose, onSubmit }: AddCompanyModalProps) {
  if (!show) return null;

  return (
    <div className="modal">
      <div className="modal-content">
        <h3>Add Company</h3>
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>Company Name *</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>Industry</label>
            <input type="text" value={form.industry || ''} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Website</label>
            <input type="text" value={form.website || ''} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Contact Person</label>
            <input type="text" value={form.contact_person || ''} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Contact Email</label>
            <input type="email" value={form.contact_email || ''} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Contact Phone</label>
            <input type="text" value={form.contact_phone || ''} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Add Company</button>
          </div>
        </form>
      </div>
    </div>
  );
}
