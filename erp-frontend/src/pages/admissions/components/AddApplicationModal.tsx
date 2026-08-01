import React from 'react';
import { User, BookOpen, Users, Award } from 'lucide-react';
import type { AcademicYear, Program, ApplicationAddForm } from '../admissions.types';

interface AddApplicationModalProps {
  show: boolean;
  form: ApplicationAddForm;
  setForm: React.Dispatch<React.SetStateAction<ApplicationAddForm>>;
  academicYears: AcademicYear[];
  programs: Program[];
  loading: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function AddApplicationModal({ show, form, setForm, academicYears, programs, loading, onClose, onSubmit }: AddApplicationModalProps) {
  if (!show) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content admissions-modal" style={{ maxWidth: '680px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">New Admission Application</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-body">
            <div className="admissions-modal-section-title">
              <User size={15} /> Student Information
            </div>
            <div className="admissions-modal-grid">
              <div className="form-group">
                <label>First Name *</label>
                <input required value={form.student_first_name} onChange={e => setForm(f => ({ ...f, student_first_name: e.target.value }))} placeholder="First name" />
              </div>
              <div className="form-group">
                <label>Last Name *</label>
                <input required value={form.student_last_name} onChange={e => setForm(f => ({ ...f, student_last_name: e.target.value }))} placeholder="Last name" />
              </div>
              <div className="form-group">
                <label>Date of Birth</label>
                <input type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Gender</label>
                <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                  <option value="">— Select —</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            <div className="admissions-modal-section-title">
              <BookOpen size={15} /> Academic Details
            </div>
            <div className="admissions-modal-grid">
              <div className="form-group">
                <label>Applying For (Course / Program)</label>
                <select value={form.applying_for_course_id} onChange={e => setForm(f => ({ ...f, applying_for_course_id: e.target.value }))}>
                  <option value="">— Select Program —</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Academic Year *</label>
                <select required value={form.academic_year_id} onChange={e => setForm(f => ({ ...f, academic_year_id: e.target.value }))}>
                  <option value="">— Select Year —</option>
                  {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
              </div>
            </div>

            <div className="admissions-modal-section-title">
              <Users size={15} /> Parent / Guardian Details
            </div>
            <div className="admissions-modal-grid">
              <div className="form-group admissions-modal-full-width">
                <label>Parent Name *</label>
                <input required value={form.parent_name} onChange={e => setForm(f => ({ ...f, parent_name: e.target.value }))} placeholder="Full name" />
              </div>
              <div className="form-group">
                <label>Parent Phone *</label>
                <input required value={form.parent_phone} onChange={e => setForm(f => ({ ...f, parent_phone: e.target.value }))} placeholder="+91 98765 43210" />
              </div>
              <div className="form-group">
                <label>Parent Email</label>
                <input type="email" value={form.parent_email} onChange={e => setForm(f => ({ ...f, parent_email: e.target.value }))} placeholder="email@example.com" />
              </div>
            </div>

            <div className="admissions-modal-section-title">
              <Award size={15} /> Previous Education
            </div>
            <div className="admissions-modal-grid">
              <div className="form-group admissions-modal-full-width">
                <label>Previous School</label>
                <input value={form.previous_school} onChange={e => setForm(f => ({ ...f, previous_school: e.target.value }))} placeholder="Name of last school attended" />
              </div>
              <div className="form-group admissions-modal-full-width">
                <label>Previous Class</label>
                <input value={form.previous_class} onChange={e => setForm(f => ({ ...f, previous_class: e.target.value }))} placeholder="e.g. Class 9" />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
