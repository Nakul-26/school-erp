import './Subjects.css';
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Search, Plus, Edit2, Trash2, Eye, RefreshCw, Archive, RotateCcw, AlertTriangle } from 'lucide-react';
import { PageGuidance } from '../components/PageGuidance';
import { hasAnyPermission, hasAnyRole } from '../utils/accessControl';

interface Program {
  id: string;
  name: string;
  duration_years?: number;
  semester_enabled?: number;
  department_id?: string;
}

interface Department {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  subject_code: string;
  subject_name: string;
  credits?: number | null;
  semester?: number | null;
  theory_lab?: string;
  weekly_hours?: number | null;
  is_elective?: number;
  status?: string;
  is_active?: number;
  course_id: string;
  course_name?: string;
  description?: string | null;
  department?: string | null;
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
  const [formError, setFormError] = useState<string | null>(null);
  
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
  const [subjectSelectedSemester, setSubjectSelectedSemester] = useState<string>('All');
  const [subjectSelectedDept, setSubjectSelectedDept] = useState<string>('All');
  const [subjectSelectedStatus, setSubjectSelectedStatus] = useState<string>('ACTIVE');
  const [subjectSelectedType, setSubjectSelectedType] = useState<string>('All');
  const [subjectSelectedElective, setSubjectSelectedElective] = useState<string>('All');
  const [showMoreFilters, setShowMoreFilters] = useState<boolean>(false);

  // Bulk Actions State
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [showBulkTypeModal, setShowBulkTypeModal] = useState<boolean>(false);
  const [bulkTheoryLab, setBulkTheoryLab] = useState<string>('Theory');

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
        api.get('/subjects?status=ALL').catch(() => [])
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
    if (subject.is_active === 0) {
      alert('Archived subjects are read-only. Restore the subject to make changes.');
      return;
    }
    setEditingSubjectId(subject.id);
    setFormError(null);
    setSubjectForm({
      subject_name: subject.subject_name || '',
      subject_code: (subject.subject_code || '').toUpperCase(),
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
    setFormError(null);

    const codeUpper = subjectForm.subject_code.trim().toUpperCase();
    const nameTrimmed = subjectForm.subject_name.trim();

    if (!codeUpper) {
      setFormError('Subject Code is required.');
      return;
    }
    if (!nameTrimmed) {
      setFormError('Subject Name is required.');
      return;
    }
    if (!subjectForm.course_id) {
      setFormError('Program/Class selection is required.');
      return;
    }

    // Client-side Duplicate Check
    const dupCode = subjects.find(s => 
      s.course_id === subjectForm.course_id && 
      s.is_active !== 0 &&
      s.subject_code.toUpperCase() === codeUpper && 
      s.id !== editingSubjectId
    );
    if (dupCode) {
      setFormError(`A subject with code '${codeUpper}' already exists in this program.`);
      return;
    }

    const dupName = subjects.find(s => 
      s.course_id === subjectForm.course_id && 
      s.is_active !== 0 &&
      s.subject_name.trim().toLowerCase() === nameTrimmed.toLowerCase() && 
      s.id !== editingSubjectId
    );
    if (dupName) {
      setFormError(`A subject with name '${nameTrimmed}' already exists in this program.`);
      return;
    }

    // Lab Credit Rule
    if (subjectForm.theory_lab === 'Lab' && subjectForm.credits > subjectForm.weekly_hours) {
      setFormError(`For Lab subjects, credits (${subjectForm.credits}) cannot exceed weekly lab hours (${subjectForm.weekly_hours}).`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...subjectForm,
        subject_code: codeUpper,
        subject_name: nameTrimmed,
        credits: Number(subjectForm.credits),
        semester: Number(subjectForm.semester),
        weekly_hours: Number(subjectForm.weekly_hours)
      };

      if (editingSubjectId) {
        await api.put(`/subjects/${editingSubjectId}`, payload);
      } else {
        await api.post('/subjects', payload);
      }
      
      const subs = await api.get('/subjects?status=ALL');
      setSubjects(subs || []);
      setShowSubjectModal(false);
    } catch (err: any) {
      setFormError(err.message || 'Saving subject failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubjectArchive = async (subject: Subject) => {
    if (!confirm(`Are you sure you want to archive subject '${subject.subject_name}'?`)) return;
    try {
      await api.post(`/subjects/${subject.id}/archive`, {});
      const subs = await api.get('/subjects?status=ALL');
      setSubjects(subs || []);
    } catch (err: any) {
      alert(err.message || 'Failed to archive subject.');
    }
  };

  const handleSubjectRestore = async (subject: Subject) => {
    try {
      await api.post(`/subjects/${subject.id}/restore`, {});
      const subs = await api.get('/subjects?status=ALL');
      setSubjects(subs || []);
    } catch (err: any) {
      alert(err.message || 'Failed to restore subject.');
    }
  };

  const handleSubjectDelete = async (subject: Subject) => {
    if (!confirm(`Are you sure you want to PERMANENTLY delete subject '${subject.subject_name}' (${subject.subject_code})?`)) return;
    try {
      await api.delete(`/subjects/${subject.id}?force=true`);
      const subs = await api.get('/subjects?status=ALL');
      setSubjects(subs || []);
    } catch (err: any) {
      alert(err.message || 'Failed to delete subject.');
    }
  };

  const handleClearAllFilters = () => {
    setSubjectSearchText('');
    setSubjectSelectedProgId('All');
    setSubjectSelectedSemester('All');
    setSubjectSelectedDept('All');
    setSubjectSelectedStatus('ACTIVE');
    setSubjectSelectedType('All');
    setSubjectSelectedElective('All');
  };

  // Filter computation & sorting
  const filteredSubjects = subjects
    .filter(subject => {
      if (subjectSearchText) {
        const search = subjectSearchText.toLowerCase();
        const matchName = subject.subject_name?.toLowerCase().includes(search);
        const matchCode = subject.subject_code?.toLowerCase().includes(search);
        if (!matchName && !matchCode) return false;
      }
      if (subjectSelectedProgId !== 'All' && subject.course_id !== subjectSelectedProgId) {
        return false;
      }
      if (subjectSelectedSemester !== 'All' && String(subject.semester) !== subjectSelectedSemester) {
        return false;
      }
      if (subjectSelectedDept !== 'All' && subject.department !== subjectSelectedDept) {
        return false;
      }
      if (subjectSelectedStatus === 'ACTIVE' && subject.is_active === 0) {
        return false;
      }
      if (subjectSelectedStatus === 'ARCHIVED' && subject.is_active !== 0) {
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
    })
    .sort((a, b) => {
      const activeDiff = (b.is_active ?? 1) - (a.is_active ?? 1);
      if (activeDiff !== 0) return activeDiff;
      const semDiff = (a.semester || 1) - (b.semester || 1);
      if (semDiff !== 0) return semDiff;
      const codeDiff = (a.subject_code || '').localeCompare(b.subject_code || '');
      if (codeDiff !== 0) return codeDiff;
      return (a.subject_name || '').localeCompare(b.subject_name || '');
    });

  const uniqueSubjectDepts = Array.from(new Set(subjects.map(s => s.department).filter(Boolean))) as string[];
  const hasActiveFilters = 
    subjectSearchText !== '' || 
    subjectSelectedProgId !== 'All' || 
    subjectSelectedSemester !== 'All' || 
    subjectSelectedDept !== 'All' || 
    subjectSelectedStatus !== 'ACTIVE' || 
    subjectSelectedType !== 'All' || 
    subjectSelectedElective !== 'All';

  const getProgramLabel = () => institutionType === 'school' ? 'Class' : 'Program';

  return (
    <Layout>
      <PageGuidance
        title="Subjects Directory"
        description="Manage subject curriculum catalog, credits, semester allocation, and subject types."
        steps={[
          "Click \"Add Subject\" to define a new core or elective subject.",
          "Set the subject code, credit value, weekly periods, and theory/lab type.",
          "Filter by Program, Semester, Status, or Subject Type."
        ]}
      />

      <div className="page-header">
        <div>
          <h2>Subjects</h2>
          <p className="subjects-text-1">
            Manage subject curriculum directory and academic properties.
          </p>
        </div>
        {canManageAcademic && (
          <button className="btn btn-primary" onClick={() => {
            setEditingSubjectId(null);
            setFormError(null);
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
            <option value="All">All {getProgramLabel()}s</option>
            {programs.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Semester Selector */}
        <div className="subjects-filter-item">
          <select
            value={subjectSelectedSemester}
            onChange={e => setSubjectSelectedSemester(e.target.value)}
            className="subjects-select"
            aria-label="Filter by Semester"
          >
            <option value="All">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
              <option key={s} value={String(s)}>Semester {s}</option>
            ))}
          </select>
        </div>

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
            <option value="Theory + Lab">Theory + Lab</option>
            <option value="Seminar">Seminar</option>
            <option value="Project">Project</option>
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
            <option value="ACTIVE">Active Subjects</option>
            <option value="ARCHIVED">Archived Subjects</option>
            <option value="ALL">All Subjects</option>
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

      {/* Extra Filters */}
      {showMoreFilters && (
        <div className="card filters subjects-filters-card subjects-extra-filters-card">
          <div className="subjects-filter-item">
            <select 
              value={subjectSelectedElective} 
              onChange={e => setSubjectSelectedElective(e.target.value)}
              className="subjects-select"
              aria-label="Filter by Elective"
            >
              <option value="All">All Categories</option>
              <option value="Core">Core</option>
              <option value="Elective">Elective</option>
            </select>
          </div>
        </div>
      )}

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="subjects-active-chips" style={{ marginTop: '0.75rem' }}>
          <button 
            type="button"
            className="btn btn-secondary subjects-btn-clear"
            onClick={handleClearAllFilters}
          >
            Reset Filters
          </button>
        </div>
      )}

      <div className="card" style={{ padding: '1rem 1.25rem', marginTop: '1.25rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            <RefreshCw size={20} className="spin" style={{ marginBottom: '0.5rem' }} />
            <p>Loading subjects catalog...</p>
          </div>
        ) : (
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem' }}>Code</th>
                <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem' }}>Subject Name</th>
                <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem' }}>Semester</th>
                <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem' }}>Credits</th>
                <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem' }}>Type</th>
                <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem' }}>Weekly Hours</th>
                <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem' }}>Category</th>
                <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem' }}>{getProgramLabel()}</th>
                <th style={{ textAlign: 'right', padding: '0.65rem 0.5rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubjects.map(subject => {
                const isArchived = subject.is_active === 0;
                return (
                  <tr 
                    key={subject.id} 
                    style={{ 
                      borderBottom: '1px solid var(--border)', 
                      opacity: isArchived ? 0.65 : 1,
                      backgroundColor: isArchived ? '#f8fafc' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '0.65rem 0.5rem', fontFamily: 'monospace', fontWeight: '600' }}>
                      {subject.subject_code}
                    </td>
                    <td style={{ padding: '0.65rem 0.5rem' }}>
                      <span 
                        onClick={() => navigate(`/subjects/${subject.id}`)} 
                        style={{ fontWeight: '600', color: 'var(--primary)', cursor: 'pointer' }}
                      >
                        {subject.subject_name}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.5rem' }}>{subject.semester || 1}</td>
                    <td style={{ padding: '0.65rem 0.5rem' }}>{subject.credits ?? 3}</td>
                    <td style={{ padding: '0.65rem 0.5rem' }}>{subject.theory_lab || 'Theory'}</td>
                    <td style={{ padding: '0.65rem 0.5rem' }}>{subject.weekly_hours ?? 4} hrs/wk</td>
                    <td style={{ padding: '0.65rem 0.5rem' }}>
                      <span className={`badge badge-${subject.is_elective ? 'info' : 'secondary'}`}>
                        {subject.is_elective === 1 ? 'Elective' : 'Core'}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.5rem' }}>
                      <span className={`badge badge-${isArchived ? 'secondary' : 'success'}`}>
                        {isArchived ? 'Archived' : 'Active'}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.5rem' }}>{subject.course_name || programs.find(p => p.id === subject.course_id)?.name || 'N/A'}</td>
                    <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.25rem 0.45rem', height: 'auto' }} 
                          onClick={() => navigate(`/subjects/${subject.id}`)} 
                          title="View Subject Details"
                        >
                          <Eye size={13} />
                        </button>

                        {canManageAcademic && (
                          <>
                            {!isArchived ? (
                              <>
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '0.25rem 0.45rem', height: 'auto' }} 
                                  onClick={() => handleSubjectEditClick(subject)} 
                                  title="Edit Subject"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button 
                                  className="btn btn-outline" 
                                  style={{ padding: '0.25rem 0.45rem', height: 'auto', color: 'var(--text-secondary)' }} 
                                  onClick={() => handleSubjectArchive(subject)} 
                                  title="Archive Subject"
                                >
                                  <Archive size={13} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '0.25rem 0.45rem', height: 'auto', color: 'var(--success)' }} 
                                  onClick={() => handleSubjectRestore(subject)} 
                                  title="Restore Subject"
                                >
                                  <RotateCcw size={13} />
                                </button>
                                <button 
                                  className="btn btn-danger" 
                                  style={{ padding: '0.25rem 0.45rem', height: 'auto' }} 
                                  onClick={() => handleSubjectDelete(subject)} 
                                  title="Delete Permanently"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredSubjects.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    No subjects match your current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Add/Edit Subject Modal ── */}
      {showSubjectModal && canManageAcademic && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card modal-content" style={{ width: '480px', padding: '1.5rem' }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.75rem' }}>
              {editingSubjectId ? 'Edit Subject Details' : 'Add New Subject'}
            </h4>

            {formError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '0.65rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                <AlertTriangle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubjectSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Subject Code *</label>
                  <input
                    type="text"
                    value={subjectForm.subject_code}
                    onChange={(e) => setSubjectForm({ ...subjectForm, subject_code: e.target.value.toUpperCase() })}
                    className="input"
                    placeholder="e.g. CS101"
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Subject Name *</label>
                  <input
                    type="text"
                    value={subjectForm.subject_name}
                    onChange={(e) => setSubjectForm({ ...subjectForm, subject_name: e.target.value })}
                    className="input"
                    placeholder="e.g. Data Structures"
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>{getProgramLabel()} *</label>
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
                  <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Semester</label>
                  <select
                    value={subjectForm.semester}
                    onChange={(e) => setSubjectForm({ ...subjectForm, semester: Number(e.target.value) })}
                    className="input"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(s => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Credits</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="1"
                    value={subjectForm.credits}
                    onChange={(e) => setSubjectForm({ ...subjectForm, credits: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="input"
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Subject Type</label>
                  <select
                    value={subjectForm.theory_lab}
                    onChange={(e) => setSubjectForm({ ...subjectForm, theory_lab: e.target.value })}
                    className="input"
                  >
                    <option value="Theory">Theory</option>
                    <option value="Lab">Lab</option>
                    <option value="Theory + Lab">Theory + Lab</option>
                    <option value="Seminar">Seminar</option>
                    <option value="Project">Project</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Weekly Hours</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={subjectForm.weekly_hours}
                    onChange={(e) => setSubjectForm({ ...subjectForm, weekly_hours: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="input"
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Category</label>
                  <select
                    value={subjectForm.is_elective}
                    onChange={(e) => setSubjectForm({ ...subjectForm, is_elective: Number(e.target.value) })}
                    className="input"
                  >
                    <option value="0">Core (Mandatory)</option>
                    <option value="1">Elective (Optional)</option>
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
