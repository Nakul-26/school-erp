import './HomeworkList.css';
import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { BookOpen, Plus, Trash2, Calendar, Clipboard, FileText } from 'lucide-react';

interface Homework {
  id: string;
  section_id: string;
  section_name: string;
  subject_id: string;
  subject_name: string;
  subject_code: string;
  teacher_first: string;
  teacher_last: string;
  title: string;
  description: string;
  due_date: string;
}

export default function HomeworkList() {
  const [homeworkList, setHomeworkList] = useState<Homework[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Filters
  const [filterSection, setFilterSection] = useState('');
  const [filterSubject, setFilterSubject] = useState('');

  const [form, setForm] = useState({
    section_id: '',
    subject_id: '',
    teacher_id: '',
    title: '',
    description: '',
    due_date: new Date().toISOString().split('T')[0]
  });

  const user = JSON.parse(localStorage.getItem('erp_user') || '{}');
  const userRoles = user.roles || (user.role ? [user.role] : []);
  const userPermissions = user.permissions || [];
  const canManage = userPermissions.includes('homework.manage') || 
                    userRoles.some((r: string) => ['admin', 'super_admin', 'Principal', 'principal'].includes(r));

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchHomework();
  }, [filterSection, filterSubject]);

  const fetchMetadata = async () => {
    try {
      const [secList, subList, teachList] = await Promise.all([
        api.get('/classes'), // sections
        api.get('/subjects'),
        api.get('/teachers')
      ]);
      setSections(secList);
      setSubjects(subList);
      setTeachers(teachList);

      // Pre-fill teacher field if logged-in user is a teacher
      const matchedTeacher = teachList.find((t: any) => t.user_id === user.sub);
      if (matchedTeacher) {
        setForm(prev => ({ ...prev, teacher_id: matchedTeacher.id }));
      }
    } catch (err) {
      console.error('Error fetching metadata:', err);
    }
  };

  const fetchHomework = async () => {
    try {
      setLoading(true);
      let query = '';
      if (filterSection) query += `&section_id=${filterSection}`;
      if (filterSubject) query += `&subject_id=${filterSubject}`;
      if (query) query = '?' + query.substring(1);

      const data = await api.get(`/homework${query}`);
      setHomeworkList(data);
    } catch (err) {
      console.error('Error fetching homework:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.section_id || !form.subject_id || !form.teacher_id || !form.title || !form.due_date) {
      return alert('Please fill in all required fields');
    }
    try {
      setSaving(true);
      await api.post('/homework', form);
      alert('Homework assigned successfully!');
      setShowModal(false);
      setForm({
        section_id: '',
        subject_id: '',
        teacher_id: form.teacher_id, // keep teacher pre-filled
        title: '',
        description: '',
        due_date: new Date().toISOString().split('T')[0]
      });
      fetchHomework();
    } catch (err: any) {
      alert(err.message || 'Error creating homework assignment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this homework assignment?')) return;
    try {
      await api.delete(`/homework/${id}`);
      alert('Homework deleted');
      fetchHomework();
    } catch (err) {
      alert('Error deleting homework');
    }
  };

  return (
    <Layout>
      <PageGuidance
        title="Academic Homework"
        description="Use this page to give homework, assignments, or projects to students. Select the class, subject, and due date, then enter the instructions. Students and parents can view the homework from their portal."
        steps={["Click Create Homework to add a new assignment.","Select the target section, subject, due date, and fill instructions.","Students and parents will see this homework instantly in their portal."]}
      />
      <div className="page-header">
        <div>
          <h2>Academic Homework Logs</h2>
          <p className="homework-list-text-1">
            Post daily homework, assign projects, specify due dates, and track logs per subject section.
          </p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Assign Homework
          </button>
        )}
      </div>

      

      {/* Filter panel */}
      <div className="card homework-list-card">
        <div className="homework-list-row-3">
          <label className="homework-list-label-4">Filter Class:</label>
          <select value={filterSection} onChange={(e) => setFilterSection(e.target.value)} className="homework-list-select-5">
            <option value="">All Classes</option>
            {sections.map(s => <option key={s.id} value={s.id}>{s.name} - {s.course_name}</option>)}
          </select>
        </div>
        <div className="homework-list-row-6">
          <label className="homework-list-label-7">Filter Subject:</label>
          <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="homework-list-select-8">
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name} ({s.subject_code})</option>)}
          </select>
        </div>
      </div>

      <div className="card homework-list-card">
        {loading ? <p>Loading homework logs...</p> : (
          <table className="table">
            <thead>
              <tr>
                <th>Class/Section</th>
                <th>Subject</th>
                <th>Homework Title & Task</th>
                <th>Assigned By</th>
                <th>Due Date</th>
                {canManage && <th className="homework-list-th-10">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {homeworkList.map((h) => (
                <tr key={h.id}>
                  <td><strong>{h.section_name}</strong></td>
                  <td>
                    <strong>{h.subject_name}</strong>
                    <div className="homework-list-div-11">{h.subject_code}</div>
                  </td>
                  <td>
                    <strong className="homework-list-strong-12">{h.title}</strong>
                    {h.description && <p className="homework-list-text-13">{h.description}</p>}
                  </td>
                  <td>Teacher {h.teacher_first} {h.teacher_last}</td>
                  <td>
                    <div className="homework-list-row-14">
                      <Calendar size={14} /> {h.due_date}
                    </div>
                  </td>
                  {canManage && (
                    <td className="homework-list-td-15">
                      <button className="btn btn-sm btn-outline btn-danger" onClick={() => handleDelete(h.id)}>
                        <Trash2 size={12} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {homeworkList.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="homework-list-td-16">
                    <Clipboard size={32} className="homework-list-Clipboard-17"  />
                    <p>No homework assignments found matching filter criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content homework-list-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create Homework Assignment</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                
                <div className="homework-list-modal-section-title">
                  <BookOpen size={15} /> Academic Target
                </div>
                <div className="homework-list-modal-grid">
                  <div className="form-group">
                    <label>Select Class / Section *</label>
                    <select
                      value={form.section_id}
                      onChange={(e) => setForm({ ...form, section_id: e.target.value })}
                      required
                    >
                      <option value="">-- Choose Class --</option>
                      {sections.map(s => <option key={s.id} value={s.id}>{s.name} - {s.course_name}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Select Subject *</label>
                    <select
                      value={form.subject_id}
                      onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
                      required
                    >
                      <option value="">-- Choose Subject --</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name} ({s.subject_code})</option>)}
                    </select>
                  </div>

                  <div className="form-group homework-list-modal-full-width">
                    <label>Assigning Teacher *</label>
                    <select
                      value={form.teacher_id}
                      onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
                      required
                    >
                      <option value="">-- Choose Staff --</option>
                      {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name} ({t.employee_id})</option>)}
                    </select>
                  </div>
                </div>

                <div className="homework-list-modal-section-title">
                  <FileText size={15} /> Assignment Details
                </div>
                <div className="homework-list-modal-grid">
                  <div className="form-group homework-list-modal-full-width">
                    <label>Homework Title *</label>
                    <input
                      type="text"
                      placeholder="e.g. Exercise 4.2 Questions 1-5"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group homework-list-modal-full-width">
                    <label>Detailed Instructions / Notes</label>
                    <textarea rows={4} placeholder="Provide details about the homework task, references, textbooks, page numbers..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="homework-list-textarea-20"  />
                  </div>
                </div>

                <div className="homework-list-modal-section-title">
                  <Calendar size={15} /> Schedule
                </div>
                <div className="homework-list-modal-grid">
                  <div className="form-group homework-list-modal-full-width">
                    <label>Due Date *</label>
                    <input
                      type="date"
                      value={form.due_date}
                      onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Post Homework'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
