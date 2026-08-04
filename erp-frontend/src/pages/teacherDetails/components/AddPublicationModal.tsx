import React from 'react';

export interface PublicationForm {
  title: string;
  publication_type: string;
  venue_name: string;
  publication_date: string;
  co_authors: string;
  doi_or_url: string;
  description: string;
}

interface AddPublicationModalProps {
  show: boolean;
  form: PublicationForm;
  setForm: React.Dispatch<React.SetStateAction<PublicationForm>>;
  saving: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function AddPublicationModal({ show, form, setForm, saving, onClose, onSubmit }: AddPublicationModalProps) {
  if (!show) return null;
  return (
    <div className="teacher-details-modal-overlay">
      <div className="card modal-content teacher-details-modal-card">
        <h3 className="teacher-details-modal-title">Add Research Publication</h3>
        <form onSubmit={onSubmit} className="teacher-details-modal-form">
          <div className="teacher-details-form-group-col">
            <label className="teacher-details-form-label-styled">Title *</label>
            <input type="text" className="input" placeholder="e.g. Machine Learning in Adaptive Assessment Systems"
              value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="teacher-details-form-group-col">
            <label className="teacher-details-form-label-styled">Publication Type</label>
            <select className="input" value={form.publication_type} onChange={e => setForm({ ...form, publication_type: e.target.value })}>
              <option value="JOURNAL">Journal Article</option>
              <option value="CONFERENCE">Conference Paper</option>
              <option value="BOOK">Book</option>
              <option value="BOOK_CHAPTER">Book Chapter</option>
              <option value="PATENT">Patent</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="teacher-details-form-group-col">
            <label className="teacher-details-form-label-styled">Journal / Conference / Venue</label>
            <input type="text" className="input" placeholder="e.g. IEEE Transactions on Education"
              value={form.venue_name} onChange={e => setForm({ ...form, venue_name: e.target.value })} />
          </div>
          <div className="teacher-details-form-group-col">
            <label className="teacher-details-form-label-styled">Publication Date</label>
            <input type="date" className="input" value={form.publication_date} onChange={e => setForm({ ...form, publication_date: e.target.value })} />
          </div>
          <div className="teacher-details-form-group-col">
            <label className="teacher-details-form-label-styled">Co-Authors</label>
            <input type="text" className="input" placeholder="e.g. Dr. A. Sharma, Dr. B. Rao"
              value={form.co_authors} onChange={e => setForm({ ...form, co_authors: e.target.value })} />
          </div>
          <div className="teacher-details-form-group-col">
            <label className="teacher-details-form-label-styled">DOI / URL</label>
            <input type="url" className="input" placeholder="https://doi.org/..."
              value={form.doi_or_url} onChange={e => setForm({ ...form, doi_or_url: e.target.value })} />
          </div>
          <div className="teacher-details-form-group-col">
            <label className="teacher-details-form-label-styled">Description</label>
            <textarea className="input" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="teacher-details-modal-actions-row">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Add Publication'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
