import './StudyMaterials.css';
import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { BookMarked, Plus, Trash2, Download, Link as LinkIcon, FileText } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface Material {
  id: string;
  section_id: string;
  section_name: string;
  subject_id: string;
  subject_name: string;
  subject_code: string;
  teacher_first: string;
  teacher_last: string;
  title: string;
  description: string | null;
  material_type: string;
  file_key: string | null;
  external_url: string | null;
  created_at: string;
}

export default function StudyMaterials() {
  const toast = useToast();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [filterSection, setFilterSection] = useState('');
  const [filterSubject, setFilterSubject] = useState('');

  const [form, setForm] = useState({
    section_id: '', subject_id: '', teacher_id: '', title: '', description: '',
    material_type: 'DOCUMENT', external_url: '',
  });
  const [file, setFile] = useState<File | null>(null);

  const user = JSON.parse(localStorage.getItem('erp_user') || '{}');
  const userRoles: string[] = user.roles || (user.role ? [user.role] : []);
  const userPermissions: string[] = user.permissions || [];
  const isTeacherOnly = userRoles.some((r: string) => ['teacher', 'Teacher'].includes(r)) &&
    !userRoles.some((r: string) => ['admin', 'Admin', 'super_admin', 'Super Admin', 'principal', 'Principal', 'hod', 'HOD'].includes(r));

  const canManage = userPermissions.includes('study_materials.manage') ||
    userRoles.some((r: string) => ['admin', 'super_admin', 'Principal', 'principal', 'Teacher', 'teacher', 'HOD', 'hod'].includes(r));

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [filterSection, filterSubject]);

  const fetchMetadata = async () => {
    try {
      const [secList, subList] = await Promise.all([api.get('/classes'), api.get('/subjects')]);
      setSections(secList);
      setSubjects(subList);

      if (canManage) {
        const teachList = await api.get('/teachers');
        const matchedTeacher = teachList.find((t: any) => t.user_id === user.sub);
        if (matchedTeacher) setForm(prev => ({ ...prev, teacher_id: matchedTeacher.id }));
      }
    } catch (err) {
      console.error('Error fetching metadata:', err);
    }
  };

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      let query = '';
      if (filterSection) query += `&section_id=${filterSection}`;
      if (filterSubject) query += `&subject_id=${filterSubject}`;
      if (query) query = '?' + query.substring(1);
      const data = await api.get(`/study-materials${query}`);
      setMaterials(data);
    } catch (err) {
      console.error('Error fetching study materials:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm(prev => ({ section_id: '', subject_id: '', teacher_id: prev.teacher_id, title: '', description: '', material_type: 'DOCUMENT', external_url: '' }));
    setFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.section_id || !form.subject_id || (!form.teacher_id && !isTeacherOnly) || !form.title) {
      return toast.warning('Please fill in all required fields');
    }
    if (form.material_type !== 'LINK' && !file && !form.external_url) {
      return toast.warning('Attach a file or provide an external URL');
    }

    try {
      setSaving(true);
      const fd = new FormData();
      fd.append('section_id', form.section_id);
      fd.append('subject_id', form.subject_id);
      if (form.teacher_id) fd.append('teacher_id', form.teacher_id);
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('material_type', form.material_type);
      if (form.external_url) fd.append('external_url', form.external_url);
      if (file) fd.append('file', file);

      await api.upload('/study-materials/upload', fd);
      toast.success('Study material posted successfully!');
      setShowModal(false);
      resetForm();
      fetchMaterials();
    } catch (err: any) {
      toast.error(err.message || 'Error posting study material');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this study material?')) return;
    try {
      await api.delete(`/study-materials/${id}`);
      toast.success('Study material deleted');
      fetchMaterials();
    } catch (err: any) {
      toast.error(err.message || 'Error deleting study material');
    }
  };

  const handleDownload = (id: string) => {
    const baseUrl = import.meta.env.VITE_API_URL || '';
    // Session cookie is attached automatically on this top-level navigation.
    window.open(`${baseUrl}/study-materials/${id}/download`, '_blank');
  };

  return (
    <Layout>
      <PageGuidance
        title="Study Materials"
        description="Upload structured study materials (notes, presentations, videos, links) scoped to a class section and subject. Students and parents see materials for their own section."
        steps={["Click Post Material to add a new resource.", "Select the target section and subject, then attach a file or paste an external link.", "Students and parents will see it instantly in their portal."]}
      />
      <div className="page-header">
        <div>
          <h2>Study Materials</h2>
          <p className="study-materials-text-1">
            Structured notes, presentations, videos, and reference links organized by class and subject.
          </p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Post Material
          </button>
        )}
      </div>

      <div className="card study-materials-card">
        <div className="study-materials-row-3">
          <label className="study-materials-label-4">Filter Class:</label>
          <select value={filterSection} onChange={(e) => setFilterSection(e.target.value)}>
            <option value="">All Classes</option>
            {sections.map(s => <option key={s.id} value={s.id}>{s.name} - {s.course_name}</option>)}
          </select>
        </div>
        <div className="study-materials-row-3">
          <label className="study-materials-label-4">Filter Subject:</label>
          <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name} ({s.subject_code})</option>)}
          </select>
        </div>
      </div>

      <div className="card study-materials-card">
        {loading ? <p>Loading study materials...</p> : (
          <table className="table">
            <thead>
              <tr>
                <th>Class/Section</th>
                <th>Subject</th>
                <th>Title</th>
                <th>Type</th>
                <th>Posted By</th>
                <th className="study-materials-th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((m) => (
                <tr key={m.id}>
                  <td><strong>{m.section_name}</strong></td>
                  <td>
                    <strong>{m.subject_name}</strong>
                    <div className="study-materials-div-11">{m.subject_code}</div>
                  </td>
                  <td>
                    <strong>{m.title}</strong>
                    {m.description && <p className="study-materials-text-13">{m.description}</p>}
                  </td>
                  <td><span className="badge study-materials-badge">{m.material_type}</span></td>
                  <td>Teacher {m.teacher_first} {m.teacher_last}</td>
                  <td className="study-materials-th-actions">
                    {m.external_url && (
                      <a href={m.external_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline">
                        <LinkIcon size={12} />
                      </a>
                    )}
                    {m.file_key && (
                      <button className="btn btn-sm btn-outline" onClick={() => handleDownload(m.id)}>
                        <Download size={12} />
                      </button>
                    )}
                    {canManage && (
                      <button className="btn btn-sm btn-outline btn-danger" onClick={() => handleDelete(m.id)}>
                        <Trash2 size={12} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {materials.length === 0 && (
                <tr>
                  <td colSpan={6} className="study-materials-td-16">
                    <BookMarked size={32} className="study-materials-icon-muted" />
                    <p>No study materials found matching filter criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content study-materials-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Post Study Material</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="study-materials-modal-grid">
                  <div className="form-group">
                    <label>Select Class / Section *</label>
                    <select value={form.section_id} onChange={(e) => setForm({ ...form, section_id: e.target.value })} required>
                      <option value="">-- Choose Class --</option>
                      {sections.map(s => <option key={s.id} value={s.id}>{s.name} - {s.course_name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Select Subject *</label>
                    <select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })} required>
                      <option value="">-- Choose Subject --</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name} ({s.subject_code})</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Title *</label>
                  <input type="text" placeholder="e.g. Chapter 4 Notes - Thermodynamics" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>

                <div className="study-materials-modal-grid">
                  <div className="form-group">
                    <label>Material Type</label>
                    <select value={form.material_type} onChange={(e) => setForm({ ...form, material_type: e.target.value })}>
                      <option value="DOCUMENT">Document</option>
                      <option value="PRESENTATION">Presentation</option>
                      <option value="VIDEO">Video</option>
                      <option value="LINK">External Link</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                {form.material_type === 'LINK' ? (
                  <div className="form-group">
                    <label>External URL *</label>
                    <input type="url" placeholder="https://..." value={form.external_url} onChange={(e) => setForm({ ...form, external_url: e.target.value })} required />
                  </div>
                ) : (
                  <div className="form-group">
                    <label><FileText size={14} /> Attach File</label>
                    <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    <small className="study-materials-small">PDF, images, or Office documents up to 5MB.</small>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Posting...' : 'Post Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
