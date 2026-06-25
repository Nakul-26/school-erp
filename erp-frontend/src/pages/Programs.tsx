import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, Eye, Edit3, Trash2, Shield, Users, BookOpen, RefreshCw, Info, Calendar, ArrowLeft, Check, X } from 'lucide-react';

export default function Programs() {
  const [programs, setPrograms] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ARCHIVED' | 'ALL'>('ACTIVE');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');

  // Terminology states
  const { user } = useAuth();
  const [institutionType, setInstitutionType] = useState<string>('college');

  const getProgramLabel = () => institutionType === 'school' ? 'Class' : 'Program';
  const getProgramsLabel = () => institutionType === 'school' ? 'Classes' : 'Programs';

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'syllabus' | 'sections' | 'timeline'>('info');

  // Form states
  const [addForm, setAddForm] = useState({ name: '', course_code: '', duration_years: 1, department_id: '', semester_enabled: 0, credit_system_enabled: 0, electives_enabled: 0, description: '' });
  const [editForm, setEditForm] = useState({ id: '', name: '', course_code: '', duration_years: 1, department_id: '', semester_enabled: 0, credit_system_enabled: 0, electives_enabled: 0, description: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [programsData, departmentsData, sectionsData, subjectsData, teachersData] = await Promise.all([
        api.get('/programs?include_archived=true'),
        api.get('/departments'),
        api.get('/sections').catch(() => []),
        api.get('/subjects').catch(() => []),
        api.get('/teachers').catch(() => [])
      ]);
      setPrograms(programsData || []);
      setDepartments(departmentsData || []);
      setSections(sectionsData || []);
      setSubjects(subjectsData || []);
      setTeachers(teachersData || []);

      if (user?.institution_id) {
        const inst = await api.get(`/institutions/${user.institution_id}`);
        if (inst && inst.institution_type) {
          setInstitutionType(inst.institution_type);
          if (inst.institution_type === 'school') {
            setAddForm(f => ({ ...f, duration_years: 1 }));
          } else {
            setAddForm(f => ({ ...f, duration_years: 4 }));
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const codeVal = addForm.course_code.trim().toUpperCase();
    const nameVal = addForm.name.trim();

    if (codeVal.length < 2) {
      alert('Code/Identifier must be at least 2 characters.');
      return;
    }
    if (nameVal.length < 3) {
      alert('Name must be at least 3 characters.');
      return;
    }

    try {
      const payload = {
        ...addForm,
        course_code: codeVal,
        name: nameVal,
        duration_years: institutionType === 'school' ? 1 : addForm.duration_years,
        department_id: addForm.department_id || null
      };
      await api.post('/programs', payload);
      setShowAddModal(false);
      setAddForm({ name: '', course_code: '', duration_years: institutionType === 'school' ? 1 : 4, department_id: '', semester_enabled: 0, credit_system_enabled: 0, electives_enabled: 0, description: '' });
      fetchData();
    } catch (err: any) {
      alert(err.message || `Error creating ${getProgramLabel().toLowerCase()}`);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const codeVal = editForm.course_code.trim().toUpperCase();
    const nameVal = editForm.name.trim();

    if (codeVal.length < 2) {
      alert('Code/Identifier must be at least 2 characters.');
      return;
    }
    if (nameVal.length < 3) {
      alert('Name must be at least 3 characters.');
      return;
    }

    try {
      await api.put(`/programs/${editForm.id}`, {
        name: nameVal,
        course_code: codeVal,
        duration_years: institutionType === 'school' ? 1 : editForm.duration_years,
        department_id: editForm.department_id || null,
        semester_enabled: editForm.semester_enabled,
        credit_system_enabled: editForm.credit_system_enabled,
        electives_enabled: editForm.electives_enabled,
        description: editForm.description
      });
      setShowEditModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error updating record');
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm(`Are you sure you want to archive this ${getProgramLabel().toLowerCase()}? (It will restrict future enrollments)`)) return;
    try {
      await api.delete(`/programs/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error archiving program');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await api.post(`/programs/${id}/restore`, {});
      fetchData();
      alert(`${getProgramLabel()} restored successfully.`);
    } catch (err: any) {
      alert(err.message || 'Error restoring program');
    }
  };

  const openEditModal = (prog: any) => {
    setEditForm({
      id: prog.id,
      name: prog.name,
      course_code: prog.course_code,
      duration_years: prog.duration_years || 1,
      department_id: prog.department_id || '',
      semester_enabled: prog.semester_enabled || 0,
      credit_system_enabled: prog.credit_system_enabled || 0,
      electives_enabled: prog.electives_enabled || 0,
      description: prog.description || ''
    });
    setShowEditModal(true);
  };

  const openDetailModal = (prog: any) => {
    setSelectedProgram(prog);
    setDetailTab('info');
    setShowDetailModal(true);
  };

  const getDeptCode = (deptId: string) => {
    const dept = departments.find(d => d.id === deptId);
    return dept ? dept.code : '-';
  };

  const getTeacherName = (teacherId: string) => {
    const t = teachers.find(teach => teach.id === teacherId);
    return t ? `${t.first_name} ${t.last_name}` : 'Not Assigned';
  };

  // Derived filters and maps
  const activePrograms = programs.filter(p => p.is_active === 1);
  const totalProgramsCount = activePrograms.length;
  const semesterEnabledCount = activePrograms.filter(p => p.semester_enabled === 1).length;
  const creditSystemCount = activePrograms.filter(p => p.credit_system_enabled === 1).length;

  const displayedPrograms = programs.filter(prog => {
    const matchesSearch = prog.name.toLowerCase().includes(search.toLowerCase()) || 
                          prog.course_code.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'ACTIVE' ? prog.is_active === 1 : 
                          statusFilter === 'ARCHIVED' ? prog.is_active === 0 : true;

    const matchesDept = deptFilter === 'ALL' ? true : prog.department_id === deptFilter;

    return matchesSearch && matchesStatus && matchesDept;
  });

  const detailSubjects = selectedProgram
    ? subjects.filter(s => s.course_id === selectedProgram.id)
    : [];

  const detailSections = selectedProgram
    ? sections.filter(sec => sec.course_id === selectedProgram.id)
    : [];

  // Group subjects by semester
  const groupedSubjects: { [key: string]: any[] } = {};
  if (selectedProgram) {
    detailSubjects.forEach(s => {
      const label = s.semester ? `Semester ${s.semester}` : 'Annual / Year-based';
      if (!groupedSubjects[label]) groupedSubjects[label] = [];
      groupedSubjects[label].push(s);
    });
  }

  return (
    <Layout>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{getProgramsLabel()}</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Manage academic curriculums, classes, and sections parameters.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} /> Add {getProgramLabel()}
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', minHeight: '110px' }}>
          <div style={{ padding: '0.75rem', backgroundColor: '#e0e7ff', borderRadius: 'var(--radius-md)', color: 'var(--primary)' }}>
            <Shield size={24} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Active</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{totalProgramsCount}</span>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', minHeight: '110px' }}>
          <div style={{ padding: '0.75rem', backgroundColor: '#ecfdf5', borderRadius: 'var(--radius-md)', color: '#059669' }}>
            <Calendar size={24} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Semester Based</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{semesterEnabledCount}</span>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', minHeight: '110px' }}>
          <div style={{ padding: '0.75rem', backgroundColor: '#fffbeb', borderRadius: 'var(--radius-md)', color: '#d97706' }}>
            <BookOpen size={24} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Credit System</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{creditSystemCount}</span>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card filters" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', padding: '1rem' }}>
        <div className="search-container" style={{ flex: '1 1 300px', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
          <Search size={18} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder={`Search by ${getProgramLabel().toLowerCase()} name or code...`} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', width: '100%', outline: 'none', background: 'transparent', fontSize: '0.875rem' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {institutionType !== 'school' && (
            <select 
              value={deptFilter} 
              onChange={(e) => setDeptFilter(e.target.value)}
              style={{ padding: '0.5rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', outline: 'none' }}
            >
              <option value="ALL">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{ padding: '0.5rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', outline: 'none' }}
          >
            <option value="ACTIVE">Active Only</option>
            <option value="ARCHIVED">Archived Only</option>
            <option value="ALL">All Statuses</option>
          </select>
          <button className="btn btn-secondary" onClick={fetchData} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={14} /> Sync
          </button>
        </div>
      </div>

      {/* Main Grid Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '1rem' }}>Code</th>
                  <th style={{ textAlign: 'left', padding: '1rem' }}>Name</th>
                  {institutionType !== 'school' && <th style={{ textAlign: 'left', padding: '1rem' }}>Department</th>}
                  {institutionType !== 'school' && <th style={{ textAlign: 'center', padding: '1rem' }}>Duration</th>}
                  <th style={{ textAlign: 'center', padding: '1rem' }}>Semesters</th>
                  <th style={{ textAlign: 'center', padding: '1rem' }}>Credits</th>
                  <th style={{ textAlign: 'center', padding: '1rem' }}>Status</th>
                  <th style={{ textAlign: 'right', padding: '1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedPrograms.map(prog => (
                  <tr key={prog.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem' }}>
                      <code style={{ fontSize: '0.9rem', fontWeight: 700, backgroundColor: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)' }}>
                        {prog.course_code}
                      </code>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{prog.name}</td>
                    {institutionType !== 'school' && <td style={{ padding: '1rem' }}>{getDeptCode(prog.department_id)}</td>}
                    {institutionType !== 'school' && (
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        {prog.duration_years} {prog.duration_years === 1 ? 'Year' : 'Years'}
                      </td>
                    )}
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      {prog.semester_enabled === 1 ? <Check size={16} color="var(--success)" style={{ margin: '0 auto' }} /> : <X size={16} color="var(--secondary)" style={{ margin: '0 auto' }} />}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      {prog.credit_system_enabled === 1 ? <Check size={16} color="var(--success)" style={{ margin: '0 auto' }} /> : <X size={16} color="var(--secondary)" style={{ margin: '0 auto' }} />}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span className={`badge badge-${prog.is_active === 1 ? 'success' : 'secondary'}`}>
                        {prog.is_active === 1 ? 'ACTIVE' : 'ARCHIVED'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => openDetailModal(prog)} 
                          className="btn btn-sm btn-outline" 
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Eye size={12} /> View
                        </button>
                        <button 
                          onClick={() => openEditModal(prog)} 
                          className="btn btn-sm btn-secondary" 
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Edit3 size={12} /> Edit
                        </button>
                        {prog.is_active === 1 ? (
                          <button 
                            onClick={() => handleArchive(prog.id)} 
                            className="btn btn-sm btn-outline-danger" 
                            style={{ color: 'var(--danger)', borderColor: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            <Trash2 size={12} /> Archive
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleRestore(prog.id)} 
                            className="btn btn-sm btn-outline-success" 
                            style={{ color: 'var(--success)', borderColor: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            <RefreshCw size={12} /> Restore
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {displayedPrograms.length === 0 && (
                  <tr>
                    <td colSpan={institutionType === 'school' ? 6 : 8} style={{ textAlign: 'center', padding: '3rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                        <Shield size={48} color="#cbd5e1" />
                        <h4 style={{ margin: 0, fontWeight: 700, color: 'var(--text-main)' }}>No {getProgramsLabel()} Found</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Try adjusting filters or add a new {getProgramLabel().toLowerCase()}.</p>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)} style={{ marginTop: '0.5rem' }}>
                          Add {getProgramLabel()}
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal 1: Add Program */}
      {showAddModal && (
        <div className="modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1000, padding: '1rem', overflowY: 'auto' }}>
          <div className="modal-content" style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', maxWidth: '520px', width: '100%', padding: '2rem', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-main)' }}>Add New {getProgramLabel()}</h3>
            <form onSubmit={handleAddSubmit}>
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Code / Identifier *</label>
                <input 
                  type="text" 
                  value={addForm.course_code} 
                  onChange={e => setAddForm({...addForm, course_code: e.target.value})} 
                  placeholder={institutionType === 'school' ? 'e.g. GRADE-10' : 'e.g. BE-CSE'} 
                  required 
                />
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label style={{ fontWeight: 600 }}>Name *</label>
                <input 
                  type="text" 
                  value={addForm.name} 
                  onChange={e => setAddForm({...addForm, name: e.target.value})} 
                  placeholder={institutionType === 'school' ? 'e.g. Grade 10 Standard' : 'e.g. B.E. Computer Science & Engineering'} 
                  required 
                />
              </div>

              {institutionType !== 'school' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 600 }}>Department</label>
                    <select 
                      value={addForm.department_id} 
                      onChange={e => setAddForm({...addForm, department_id: e.target.value})}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: '#ffffff', outline: 'none' }}
                    >
                      <option value="">-- Choose Department --</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label style={{ fontWeight: 600 }}>Duration (Years)</label>
                    <input 
                      type="number" 
                      value={addForm.duration_years} 
                      onChange={e => setAddForm({...addForm, duration_years: parseInt(e.target.value) || 4})} 
                      min="1" 
                      required 
                    />
                  </div>
                </div>
              )}

              {/* Toggles Panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: '#f8fafc' }}>
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'block', marginBottom: '0.25rem' }}>Academic Config Settings</strong>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input 
                    type="checkbox" 
                    checked={addForm.semester_enabled === 1}
                    onChange={e => setAddForm({...addForm, semester_enabled: e.target.checked ? 1 : 0})}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span>Enable Semester System (Semi-annual exams and classes)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input 
                    type="checkbox" 
                    checked={addForm.credit_system_enabled === 1}
                    onChange={e => setAddForm({...addForm, credit_system_enabled: e.target.checked ? 1 : 0})}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span>Enable Credits System (Subjects carry academic weight/credits)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input 
                    type="checkbox" 
                    checked={addForm.electives_enabled === 1}
                    onChange={e => setAddForm({...addForm, electives_enabled: e.target.checked ? 1 : 0})}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span>Allow Elective Registrations (Students can opt for selective subjects)</span>
                </label>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label style={{ fontWeight: 600 }}>Description</label>
                <textarea 
                  className="form-control" 
                  value={addForm.description} 
                  onChange={e => setAddForm({...addForm, description: e.target.value})}
                  placeholder="Provide syllabus outline or descriptions..."
                  style={{ width: '100%', minHeight: '80px', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', outline: 'none' }}
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save {getProgramLabel()}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Program */}
      {showEditModal && (
        <div className="modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1000, padding: '1rem', overflowY: 'auto' }}>
          <div className="modal-content" style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', maxWidth: '520px', width: '100%', padding: '2rem', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-main)' }}>Edit {getProgramLabel()}</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Code / Identifier *</label>
                <input 
                  type="text" 
                  value={editForm.course_code} 
                  onChange={e => setEditForm({...editForm, course_code: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label style={{ fontWeight: 600 }}>Name *</label>
                <input 
                  type="text" 
                  value={editForm.name} 
                  onChange={e => setEditForm({...editForm, name: e.target.value})} 
                  required 
                />
              </div>

              {institutionType !== 'school' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 600 }}>Department</label>
                    <select 
                      value={editForm.department_id} 
                      onChange={e => setEditForm({...editForm, department_id: e.target.value})}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: '#ffffff', outline: 'none' }}
                    >
                      <option value="">-- Choose Department --</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label style={{ fontWeight: 600 }}>Duration (Years)</label>
                    <input 
                      type="number" 
                      value={editForm.duration_years} 
                      onChange={e => setEditForm({...editForm, duration_years: parseInt(e.target.value) || 1})} 
                      min="1" 
                      required 
                    />
                  </div>
                </div>
              )}

              {/* Toggles Panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: '#f8fafc' }}>
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'block', marginBottom: '0.25rem' }}>Academic Config Settings</strong>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input 
                    type="checkbox" 
                    checked={editForm.semester_enabled === 1}
                    onChange={e => setEditForm({...editForm, semester_enabled: e.target.checked ? 1 : 0})}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span>Enable Semester System</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input 
                    type="checkbox" 
                    checked={editForm.credit_system_enabled === 1}
                    onChange={e => setEditForm({...editForm, credit_system_enabled: e.target.checked ? 1 : 0})}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span>Enable Credits System</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input 
                    type="checkbox" 
                    checked={editForm.electives_enabled === 1}
                    onChange={e => setEditForm({...editForm, electives_enabled: e.target.checked ? 1 : 0})}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span>Allow Elective Registrations</span>
                </label>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label style={{ fontWeight: 600 }}>Description</label>
                <textarea 
                  className="form-control" 
                  value={editForm.description} 
                  onChange={e => setEditForm({...editForm, description: e.target.value})}
                  style={{ width: '100%', minHeight: '80px', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', outline: 'none' }}
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem' }}>
                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: View Details Hub (Mini ERP inside ERP) */}
      {showDetailModal && selectedProgram && (
        <div className="modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1000, padding: '1rem', overflowY: 'auto' }}>
          <div className="modal-content" style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', maxWidth: '720px', width: '100%', padding: '2.5rem', boxShadow: 'var(--shadow-lg)', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            
            {/* Modal Hero Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', backgroundColor: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                🎓
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>{selectedProgram.name}</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.15rem' }}>
                  Code: <code style={{ fontWeight: 700, color: 'var(--text-main)' }}>{selectedProgram.course_code}</code>
                </span>
              </div>
              <span className={`badge badge-${selectedProgram.is_active === 1 ? 'success' : 'secondary'}`} style={{ marginLeft: 'auto' }}>
                {selectedProgram.is_active === 1 ? 'ACTIVE' : 'ARCHIVED'}
              </span>
            </div>

            {/* Tabs Header (Locked 52px, single line) */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', gap: '1rem', overflowX: 'auto', scrollbarWidth: 'none', height: '52px', alignItems: 'center' }}>
              {[
                { tab: 'info', label: 'Info Details' },
                { tab: 'syllabus', label: `Syllabus / Subjects (${detailSubjects.length})` },
                { tab: 'sections', label: `Class Sections (${detailSections.length})` },
                { tab: 'timeline', label: 'Timeline' }
              ].map(t => (
                <button
                  key={t.tab}
                  type="button"
                  onClick={() => setDetailTab(t.tab as any)}
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    background: 'none',
                    borderBottom: detailTab === t.tab ? '2px solid var(--primary)' : '2px solid transparent',
                    color: detailTab === t.tab ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: detailTab === t.tab ? 700 : 500,
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    whiteSpace: 'nowrap',
                    height: '100%'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab 1: Info */}
            {detailTab === 'info' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
                <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Description</span>
                  <p style={{ margin: 0, color: 'var(--text-main)' }}>{selectedProgram.description || 'No syllabus description provided.'}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Curriculum Options</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Semesters Enforced:</span>
                        <strong style={{ color: selectedProgram.semester_enabled === 1 ? 'var(--success)' : 'var(--text-muted)' }}>
                          {selectedProgram.semester_enabled === 1 ? 'Yes' : 'No'}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Credits System:</span>
                        <strong style={{ color: selectedProgram.credit_system_enabled === 1 ? 'var(--success)' : 'var(--text-muted)' }}>
                          {selectedProgram.credit_system_enabled === 1 ? 'Yes' : 'No'}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Allows Electives:</span>
                        <strong style={{ color: selectedProgram.electives_enabled === 1 ? 'var(--success)' : 'var(--text-muted)' }}>
                          {selectedProgram.electives_enabled === 1 ? 'Yes' : 'No'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Department Mapped</span>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{getDeptCode(selectedProgram.department_id)}</span>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Duration Cycle</span>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{selectedProgram.duration_years} {selectedProgram.duration_years === 1 ? 'Year' : 'Years'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Syllabus / Subjects grouped */}
            {detailTab === 'syllabus' && (
              <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {Object.keys(groupedSubjects).map(term => (
                  <div key={term} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem', backgroundColor: 'var(--bg-main)' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem' }}>
                      {term}
                    </h4>
                    <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <th style={{ textAlign: 'left', padding: '0.25rem' }}>Code</th>
                          <th style={{ textAlign: 'left', padding: '0.25rem' }}>Subject Name</th>
                          <th style={{ textAlign: 'center', padding: '0.25rem' }}>Credits</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedSubjects[term]?.map((sub: any) => (
                          <tr key={sub.id} style={{ borderBottom: '1px dotted var(--border)' }}>
                            <td style={{ padding: '0.4rem 0.25rem' }}><code>{sub.subject_code}</code></td>
                            <td style={{ padding: '0.4rem 0.25rem', fontWeight: 600 }}>{sub.subject_name}</td>
                            <td style={{ padding: '0.4rem 0.25rem', textAlign: 'center' }}>{sub.credits || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
                {detailSubjects.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    No subjects mapped to this curriculum layout.
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Class Sections */}
            {detailTab === 'sections' && (
              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Section</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Year / Sem Index</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Class Teacher</th>
                      <th style={{ textAlign: 'center', padding: '0.5rem' }}>Room</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailSections.map(sec => (
                      <tr key={sec.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.5rem', fontWeight: 600 }}>{sec.name}</td>
                        <td style={{ padding: '0.5rem' }}>Year {sec.year_number}</td>
                        <td style={{ padding: '0.5rem' }}>{getTeacherName(sec.class_teacher_id)}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>{sec.room || '-'}</td>
                      </tr>
                    ))}
                    {detailSections.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No active sections provisioned for this program.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 4: Timeline Activities */}
            {detailTab === 'timeline' && (
              <div style={{ maxHeight: '250px', overflowY: 'auto', paddingLeft: '0.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderLeft: '2px solid var(--border)', padding: '0.5rem 0 0.5rem 1rem', position: 'relative' }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-1.45rem', top: '0.2rem', width: '0.75rem', height: '0.75rem', borderRadius: '50%', backgroundColor: 'var(--primary)', border: '2px solid #ffffff' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                      {selectedProgram.created_at ? new Date(selectedProgram.created_at).toLocaleDateString() : 'N/A'}
                    </span>
                    <strong style={{ fontSize: '0.85rem', display: 'block', color: 'var(--text-main)', marginTop: '0.15rem' }}>Curriculum Registered</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Record initialized in system database.</span>
                  </div>
                  
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-1.45rem', top: '0.2rem', width: '0.75rem', height: '0.75rem', borderRadius: '50%', backgroundColor: '#cbd5e1', border: '2px solid #ffffff' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Current Status</span>
                    <strong style={{ fontSize: '0.85rem', display: 'block', color: 'var(--text-main)', marginTop: '0.15rem' }}>
                      Status set to {selectedProgram.is_active === 1 ? 'ACTIVE' : 'ARCHIVED'}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Close Actions */}
            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button type="button" onClick={() => setShowDetailModal(false)} className="btn btn-secondary">Close Details</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
