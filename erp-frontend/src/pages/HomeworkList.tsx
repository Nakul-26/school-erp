import './HomeworkList.css';
import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { BookOpen, Plus, Trash2, Calendar, Clipboard, FileText } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

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
  const toast = useToast();
  const [homeworkList, setHomeworkList] = useState<Homework[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
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
  const userRoles: string[] = user.roles || (user.role ? [user.role] : []);
  const userPermissions: string[] = user.permissions || [];
  const isTeacherOnly = userRoles.some((r: string) => ['teacher', 'Teacher'].includes(r)) && 
    !userRoles.some((r: string) => ['admin', 'Admin', 'super_admin', 'Super Admin', 'principal', 'Principal', 'hod', 'HOD'].includes(r));

  const canManage = userPermissions.includes('homework.manage') || 
                    userPermissions.includes('homework.create') ||
                    userRoles.some((r: string) => ['admin', 'super_admin', 'Principal', 'principal', 'Teacher', 'teacher', 'HOD', 'hod'].includes(r));

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchHomework();
  }, [filterSection, filterSubject]);

  const fetchMetadata = async () => {
    try {
      const [secList, subList, teachList, allocList] = await Promise.all([
        api.get('/classes'), // sections
        api.get('/subjects'),
        api.get('/teachers'),
        api.get('/teaching-allocations').catch(() => [])
      ]);
      setTeachers(teachList);

      const matchedTeacher = teachList.find((t: any) => t.user_id === user.sub);
      if (matchedTeacher) {
        setForm(prev => ({ ...prev, teacher_id: matchedTeacher.id }));
      }

      if (isTeacherOnly) {
        const teacherAllocations = Array.isArray(allocList) ? allocList : [];
        setAllocations(teacherAllocations);

        const assignedSecIds = new Set(teacherAllocations.map((a: any) => a.section_id).filter(Boolean));
        const assignedSubIds = new Set(teacherAllocations.map((a: any) => a.subject_id).filter(Boolean));

        const filteredSections = secList.filter((s: any) => assignedSecIds.has(s.id) || (matchedTeacher && s.class_teacher_id === matchedTeacher.id));
        const filteredSubjects = subList.filter((sub: any) => assignedSubIds.has(sub.id));

        setSections(filteredSections.length > 0 ? filteredSections : secList);
        setSubjects(filteredSubjects.length > 0 ? filteredSubjects : subList);
      } else {
        setSections(secList);
        setSubjects(subList);
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
    if (!form.section_id || !form.subject_id || (!form.teacher_id && !isTeacherOnly) || !form.title || !form.due_date) {
      return toast.warning('Please fill in all required fields');
    }
    try {
      setSaving(true);
      await api.post('/homework', form);
      toast.success('Homework assigned successfully!');
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
      toast.error(err.message || 'Error creating homework assignment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this homework assignment?')) return;
    try {
      await api.delete(`/homework/${id}`);
      toast.success('Homework assignment deleted');
      fetchHomework();
    } catch (err: any) {
      toast.error(err.message || 'Error deleting homework');
    }
  };

  const availableSubjectsInModal = React.useMemo(() => {
    if (!isTeacherOnly || !form.section_id) return subjects;
    const sectionAllocated = subjects.filter(sub =>
      allocations.some((a: any) => (!a.section_id || a.section_id === form.section_id) && a.subject_id === sub.id)
    );
    return sectionAllocated.length > 0 ? sectionAllocated : subjects;
  }, [isTeacherOnly, form.section_id, subjects, allocations]);

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
                      {availableSubjectsInModal.map(s => <option key={s.id} value={s.id}>{s.subject_name} ({s.subject_code})</option>)}
                    </select>
                  </div>

                  {!isTeacherOnly && (
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
                  )}
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
