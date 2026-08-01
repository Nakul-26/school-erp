import React from 'react';
import { User, BookOpen } from 'lucide-react';
import type { AcademicYear, InquiryAddForm } from '../admissions.types';

interface AddInquiryModalProps {
  show: boolean;
  form: InquiryAddForm;
  setForm: React.Dispatch<React.SetStateAction<InquiryAddForm>>;
  academicYears: AcademicYear[];
  loading: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function AddInquiryModal({ show, form, setForm, academicYears, loading, onClose, onSubmit }: AddInquiryModalProps) {
  if (!show) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content admissions-modal" style={{ maxWidth: '540px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Add Admission Inquiry</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-body">
            <div className="admissions-modal-section-title">
              <User size={15} /> Student & Parent Details
            </div>
            <div className="admissions-modal-grid">
              <div className="form-group admissions-modal-full-width">
                <label>Student Name *</label>
                <input
                  required value={form.student_name}
                  onChange={e => setForm(f => ({ ...f, student_name: e.target.value }))}
                  placeholder="Full name of the student"
                />
              </div>
              <div className="form-group admissions-modal-full-width">
                <label>Parent / Guardian Name *</label>
                <input
                  required value={form.parent_name}
                  onChange={e => setForm(f => ({ ...f, parent_name: e.target.value }))}
                  placeholder="Parent's full name"
                />
              </div>
              <div className="form-group">
                <label>Parent Phone *</label>
                <input
                  required value={form.parent_phone}
                  onChange={e => setForm(f => ({ ...f, parent_phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="form-group">
                <label>Parent Email</label>
                <input
                  type="email" value={form.parent_email}
                  onChange={e => setForm(f => ({ ...f, parent_email: e.target.value }))}
                  placeholder="email@example.com"
                />
              </div>
              <div className="form-group">
                <label>Date of Birth</label>
                <input
                  type="date" value={form.date_of_birth}
                  onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Applying For Class *</label>
                <input
                  required value={form.applying_for_class}
                  onChange={e => setForm(f => ({ ...f, applying_for_class: e.target.value }))}
                  placeholder="e.g. Grade 5, Class X"
                />
              </div>
            </div>

            <div className="admissions-modal-section-title">
              <BookOpen size={15} /> Academic & Source Details
            </div>
            <div className="admissions-modal-grid">
              <div className="form-group">
                <label>Source</label>
                <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
                  <option>Walk-in</option>
                  <option>Phone</option>
                  <option>Website</option>
                  <option>Referral</option>
                </select>
              </div>
              <div className="form-group">
                <label>Academic Year</label>
                <select value={form.academic_year_id} onChange={e => setForm(f => ({ ...f, academic_year_id: e.target.value }))}>
                  <option value="">— Select Year —</option>
                  {academicYears.map(y => (
                    <option key={y.id} value={y.id}>{y.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group admissions-modal-full-width">
                <label>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  placeholder="Any additional notes or observations..."
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add Inquiry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
