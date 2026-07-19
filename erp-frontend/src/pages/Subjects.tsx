import './Subjects.css';
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Search, Plus, Edit2, Trash2, Eye, RefreshCw, Info } from 'lucide-react';
import { PageGuidance } from '../components/PageGuidance';
import { hasAnyPermission, hasAnyRole } from '../utils/accessControl';

interface Program {
  id: string;
  name: string;
  department_id: string;
}

interface Department {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  subject_code: string;
  subject_name: string;
  credits?: number;
  semester?: number;
  theory_lab?: string;
  weekly_hours?: number;
  is_elective?: number;
  status?: string;
  course_id: string;
  description?: string;
  department?: string;
}

export default function Subjects() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const roles = user?.roles || (user?.role ? [user.role] : []);
  const userPermissions = user?.permissions || [];
  const canManageAcademic = hasAnyPermission(userPermissions, ['academic.manage']) ||
    hasAnyRole(roles, ['admin', 'super_admin', 'Principal', 'HOD']);

  // Core Data States
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [institutionType, setInstitutionType] = useState<string>('school');

  // Modal and Form States
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [subjectForm, setSubjectForm] = useState({ 
    subject_name: '', 
    subject_code: '', 
    credits: 3, 
    semester: 1, 
    course_id: '',
    is_elective: 0,
    status: 'ACTIVE',
    description: '',
    theory_lab: 'Theory',
    department: '',
    weekly_hours: 4
  });

  // Filter States
  const [subjectSearchText, setSubjectSearchText] = useState<string>('');
  const [subjectSelectedProgId, setSubjectSelectedProgId] = useState<string>('All');
  const [subjectSelectedDept, setSubjectSelectedDept] = useState<string>('All');
  const [subjectSelectedStatus, setSubjectSelectedStatus] = useState<string>('All');
  const [subjectSelectedType, setSubjectSelectedType] = useState<string>('All');
  const [subjectSelectedElective, setSubjectSelectedElective] = useState<string>('All');
  const [showMoreFilters, setShowMoreFilters] = useState<boolean>(false);

  // Redirection Check for legacy Subject Assignments link requests
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'assignments') {
      navigate('/academic-setup?tab=assignments', { replace: true });
    }
  }, [location.search, navigate]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    setLoading(true);
    try {
      const [depts, progs, subs] = await Promise.all([
        api.get('/departments').catch(() => []),
        api.get('/programs').catch(() => []),
        api.get('/subjects').catch(() => [])
      ]);

      setDepartments(depts || []);
      setPrograms(progs || []);
      setSubjects(subs || []);

      if (user?.institution_id) {
        const inst = await api.get(`/institutions/${user.institution_id}`);
        if (inst && inst.institution_type) {
          setInstitutionType(inst.institution_type);
        }
      }

      if (progs && progs.length > 0) {
        setSubjectForm(f => ({ ...f, course_id: progs[0].id }));
      }
    } catch (err) {
      console.error('Failed to load subjects page metadata', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectEditClick = (subject: Subject) => {
    setEditingSubjectId(subject.id);
    setSubjectForm({
      subject_name: subject.subject_name || '',
      subject_code: subject.subject_code || '',
      credits: subject.credits ?? 3,
      semester: subject.semester ?? 1,
      course_id: subject.course_id || '',
      is_elective: subject.is_elective ?? 0,
      status: subject.status || 'ACTIVE',
      description: subject.description || '',
      theory_lab: subject.theory_lab || 'Theory',
      department: subject.department || '',
      weekly_hours: subject.weekly_hours ?? 4
    });
    setShowSubjectModal(true);
  };

  const handleSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingSubjectId) {
        await api.put(`/subjects/${editingSubjectId}`, subjectForm);
      } else {
        await api.post('/subjects', subjectForm);
      }
      
      // Refresh list
      const subs = await api.get('/subjects');
      setSubjects(subs || []);
      setShowSubjectModal(false);
    } catch (err: any) {
      alert(err.message || 'Saving subject failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubjectDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;
    try {
      await api.delete(`/subjects/${id}`);
      const subs = await api.get('/subjects');
      setSubjects(subs || []);
    } catch (err: any) {
      alert(err.message || 'Failed to delete subject.');
    }
  };

  const handleClearAllFilters = () => {
    setSubjectSearchText('');
    setSubjectSelectedProgId('All');
    setSubjectSelectedDept('All');
    setSubjectSelectedStatus('All');
    setSubjectSelectedType('All');
    setSubjectSelectedElective('All');
  };

  // Filter computation
  const filteredSubjects = subjects.filter(subject => {
    if (subjectSearchText) {
      const search = subjectSearchText.toLowerCase();
      const matchName = subject.subject_name?.toLowerCase().includes(search);
      const matchCode = subject.subject_code?.toLowerCase().includes(search);
      if (!matchName && !matchCode) return false;
    }
    if (subjectSelectedProgId !== 'All' && subject.course_id !== subjectSelectedProgId) {
      return false;
    }
    if (subjectSelectedDept !== 'All' && subject.department !== subjectSelectedDept) {
      return false;
    }
    if (subjectSelectedStatus !== 'All' && (subject.status || 'ACTIVE') !== subjectSelectedStatus) {
      return false;
    }
    if (subjectSelectedType !== 'All' && (subject.theory_lab || 'Theory') !== subjectSelectedType) {
      return false;
    }
    if (subjectSelectedElective !== 'All') {
      const isElective = subject.is_elective === 1 ? 'Elective' : 'Core';
      if (isElective !== subjectSelectedElective) return false;
    }
    return true;
  });

  const uniqueSubjectDepts = Array.from(new Set(subjects.map(s => s.department).filter(Boolean))) as string[];
  const hasActiveFilters = 
    subjectSearchText !== '' || 
    subjectSelectedProgId !== 'All' || 
    subjectSelectedDept !== 'All' || 
    subjectSelectedStatus !== 'All' || 
    subjectSelectedType !== 'All' || 
    subjectSelectedElective !== 'All';

  const getProgramLabel = () => institutionType === 'school' ? 'Class' : 'Program';

  return (
    <Layout>
      <PageGuidance
        title="Subjects Directory"
        description="Use this page to manage the directory of subjects taught in the school."
        steps={[
          "Click \"Add Subject\" to create a new subject (e.g., Mathematics).",
          "Choose the class level where this subject is taught.",
          "Enter the subject code and weekly hours."
        ]}
      />

      <div className="page-header">
        <div>
          <h2>Subjects</h2>
          <p className="subjects-text-1">
            Manage subject curriculum directory.
          </p>
        </div>
        {canManageAcademic && (
          <button className="btn btn-primary" onClick={() => {
            setEditingSubjectId(null);
            setSubjectForm({ 
              subject_name: '', 
              subject_code: '', 
              credits: 3, 
              semester: 1, 
              course_id: programs[0]?.id || '',
              is_elective: 0,
              status: 'ACTIVE',
              description: '',
              theory_lab: 'Theory',
              department: '',
              weekly_hours: 4
            });
            setShowSubjectModal(true);
          }}>Add Subject</button>
        )}
      </div>

      <div className="card filters subjects-filters-card">
        {/* Search */}
        <div className="search-container subjects-search-container">
          <Search size={14} className="subjects-Search-icon" />
          <input 
            type="text" 
            placeholder="Search by subject name or code..." 
            value={subjectSearchText}
            onChange={e => setSubjectSearchText(e.target.value)}
            className="subjects-search-input"
            aria-label="Search by subject name or code"
          />
        </div>

        {/* Program Selector */}
        <div className="subjects-filter-item">
          <select 
            value={subjectSelectedProgId} 
            onChange={e => setSubjectSelectedProgId(e.target.value)}
            className="subjects-select"
            aria-label="Filter by Class"
          >
            <option value="All">All {getProgramLabel()}es</option>
            {programs.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Department Selector */}
        {uniqueSubjectDepts.length > 0 && (
          <div className="subjects-filter-item">
            <select 
              value={subjectSelectedDept} 
              onChange={e => setSubjectSelectedDept(e.target.value)}
              className="subjects-select"
              aria-label="Filter by Department"
            >
              <option value="All">All Departments</option>
              {uniqueSubjectDepts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}

        {/* Type Selector (Theory/Lab) */}
        <div className="subjects-filter-item">
          <select 
            value={subjectSelectedType} 
            onChange={e => setSubjectSelectedType(e.target.value)}
            className="subjects-select"
            aria-label="Filter by Type"
          >
            <option value="All">All Types</option>
            <option value="Theory">Theory</option>
            <option value="Lab">Lab</option>
          </select>
        </div>

        {/* Status Selector */}
        <div className="subjects-filter-item">
          <select 
            value={subjectSelectedStatus} 
            onChange={e => setSubjectSelectedStatus(e.target.value)}
            className="subjects-select"
            aria-label="Filter by Status"
          >
            <option value="All">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>

        {/* More Filters Toggle */}
        <div className="subjects-filter-action">
          <button 
            type="button"
            className="btn btn-secondary subjects-btn-toggle"
            onClick={() => setShowMoreFilters(!showMoreFilters)}
          >
            {showMoreFilters ? 'Less ▲' : 'More ▼'}
          </button>
        </div>
      </div>

      {/* Row 3: Collapsible Extra Filters */}
      {showMoreFilters && (
        <div className="card filters subjects-filters-card subjects-extra-filters-card">
          <div className="subjects-filter-item">
            <select 
              value={subjectSelectedElective} 
              onChange={e => setSubjectSelectedElective(e.target.value)}
              className="subjects-select"
              aria-label="Filter by Elective"
            >
              <option value="All">All Electives</option>
              <option value="Core">Core</option>
              <option value="Elective">Elective</option>
            </select>
          </div>
        </div>
      )}

      {/* Row 4: Active Filter Chips */}
      {hasActiveFilters && (
        <div className="subjects-active-chips">
          <button 
            type="button"
            className="btn btn-secondary subjects-btn-clear"
            onClick={handleClearAllFilters}
          >
            Clear All Filters
          </button>
        </div>
      )}

      <div className="card" style={{ padding: '1rem 1.25rem', marginTop: '1.5rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            <RefreshCw size={20} className="spin" style={{ marginBottom: '0.5rem' }} />
            <p>Loading subjects list...</p>
          </div>
        ) : (
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {institutionType !== 'school' && <th style={{ textAlign: 'left', padding: '0.5rem' }}>Code</th>}
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Name</th>
                {institutionType !== 'school' && <th style={{ textAlign: 'left', padding: '0.5rem' }}>Semester</th>}
                {institutionType !== 'school' && <th style={{ textAlign: 'left', padding: '0.5rem' }}>Credits</th>}
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Type</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Weekly Hours</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Elective</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>{getProgramLabel()}</th>
                <th style={{ textAlign: 'right', padding: '0.5rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubjects.map(subject => (
                <tr key={subject.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  {institutionType !== 'school' && <td style={{ padding: '0.65rem 0.5rem' }}>{subject.subject_code}</td>}
                  <td style={{ padding: '0.65rem 0.5rem' }}>
                    <span onClick={() => navigate(`/subjects/${subject.id}`)} style={{ fontWeight: '600', color: 'var(--primary)', cursor: 'pointer' }}>
                      {subject.subject_name}
                    </span>
                  </td>
                  {institutionType !== 'school' && <td style={{ padding: '0.65rem 0.5rem' }}>{subject.semester}</td>}
                  {institutionType !== 'school' && <td style={{ padding: '0.65rem 0.5rem' }}>{subject.credits}</td>}
                  <td style={{ padding: '0.65rem 0.5rem' }}>{subject.theory_lab || 'Theory'}</td>
                  <td style={{ padding: '0.65rem 0.5rem' }}>{subject.weekly_hours ?? 4} hrs</td>
                  <td style={{ padding: '0.65rem 0.5rem' }}>{subject.is_elective === 1 ? 'Yes' : 'No'}</td>
                  <td style={{ padding: '0.65rem 0.5rem' }}>
                    <span className={`badge badge-${subject.status === 'INACTIVE' ? 'secondary' : 'success'}`}>
                      {subject.status || 'ACTIVE'}
                    </span>
                  </td>
                  <td style={{ padding: '0.65rem 0.5rem' }}>{programs.find(p => p.id === subject.course_id)?.name || 'Unknown'}</td>
                  <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', height: 'auto' }} onClick={() => navigate(`/subjects/${subject.id}`)} title="Open Subject Workspace">
                        <Eye size={13} />
                      </button>
                      {canManageAcademic && (
                        <>
                          <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', height: 'auto' }} onClick={() => handleSubjectEditClick(subject)} title="Edit Subject">
                            <Edit2 size={13} />
                          </button>
                          <button className="btn btn-danger" style={{ padding: '0.25rem 0.5rem', height: 'auto' }} onClick={() => handleSubjectDelete(subject.id)} title="Delete Subject">
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSubjects.length === 0 && (
                <tr>
                  <td colSpan={12} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No subjects found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Add/Edit Subject Modal ── */}
      {showSubjectModal && canManageAcademic && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card modal-content" style={{ width: '460px', padding: '1.5rem' }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '1rem' }}>
              {editingSubjectId ? 'Edit Subject Details' : 'Add New Subject'}
            </h4>
            <form onSubmit={handleSubjectSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Subject Name</label>
                  <input
                    type="text"
                    value={subjectForm.subject_name}
                    onChange={(e) => setSubjectForm({ ...subjectForm, subject_name: e.target.value })}
                    className="input"
                    placeholder="e.g. Mathematics"
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Subject Code</label>
                  <input
                    type="text"
                    value={subjectForm.subject_code}
                    onChange={(e) => setSubjectForm({ ...subjectForm, subject_code: e.target.value })}
                    className="input"
                    placeholder="e.g. MATH-801"
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Class / Grade</label>
                  <select
                    value={subjectForm.course_id}
                    onChange={(e) => setSubjectForm({ ...subjectForm, course_id: e.target.value })}
                    className="input"
                    required
                  >
                    {programs.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Weekly Periods</label>
                  <input
                    type="number"
                    min="1"
                    value={subjectForm.weekly_hours}
                    onChange={(e) => setSubjectForm({ ...subjectForm, weekly_hours: parseInt(e.target.value) || 4 })}
                    className="input"
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Type</label>
                  <select
                    value={subjectForm.theory_lab}
                    onChange={(e) => setSubjectForm({ ...subjectForm, theory_lab: e.target.value })}
                    className="input"
                  >
                    <option value="Theory">Theory</option>
                    <option value="Lab">Lab</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Is Elective?</label>
                  <select
                    value={subjectForm.is_elective}
                    onChange={(e) => setSubjectForm({ ...subjectForm, is_elective: parseInt(e.target.value) || 0 })}
                    className="input"
                  >
                    <option value="0">No (Core)</option>
                    <option value="1">Yes (Elective)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Status</label>
                  <select
                    value={subjectForm.status}
                    onChange={(e) => setSubjectForm({ ...subjectForm, status: e.target.value })}
                    className="input"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Save Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
