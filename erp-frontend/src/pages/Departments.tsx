import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Plus, Search, Eye, Edit3, Trash2, Shield, Users, BookOpen, RefreshCw, Info, Calendar, ArrowLeft } from 'lucide-react';

export default function Departments() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ARCHIVED' | 'ALL'>('ACTIVE');
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState<any>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'teachers' | 'subjects' | 'timeline'>('info');

  // Form states
  const [addForm, setAddForm] = useState({ name: '', code: '', description: '', head_teacher_id: '' });
  const [editForm, setEditForm] = useState({ id: '', name: '', code: '', description: '', head_teacher_id: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [deptsData, teachersData, programsData, subjectsData] = await Promise.all([
        api.get('/departments?include_archived=true'),
        api.get('/teachers').catch(() => []),
        api.get('/programs').catch(() => []),
        api.get('/subjects').catch(() => [])
      ]);
      setDepartments(deptsData || []);
      setTeachers(teachersData || []);
      setPrograms(programsData || []);
      setSubjects(subjectsData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const codeVal = addForm.code.trim().toUpperCase();
    const nameVal = addForm.name.trim();
    
    if (codeVal.length < 2) {
      alert('Department Code must be at least 2 characters.');
      return;
    }
    if (nameVal.length < 3) {
      alert('Department Name must be at least 3 characters.');
      return;
    }

    try {
      await api.post('/departments', {
        ...addForm,
        code: codeVal,
        name: nameVal
      });
      setShowAddModal(false);
      setAddForm({ name: '', code: '', description: '', head_teacher_id: '' });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error creating department');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const codeVal = editForm.code.trim().toUpperCase();
    const nameVal = editForm.name.trim();

    if (codeVal.length < 2) {
      alert('Department Code must be at least 2 characters.');
      return;
    }
    if (nameVal.length < 3) {
      alert('Department Name must be at least 3 characters.');
      return;
    }

    try {
      await api.put(`/departments/${editForm.id}`, {
        name: nameVal,
        code: codeVal,
        description: editForm.description,
        head_teacher_id: editForm.head_teacher_id || null
      });
      setShowEditModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error updating department');
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Are you sure you want to archive this department? (Its references will be disabled)')) return;
    try {
      await api.delete(`/departments/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error archiving department');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await api.post(`/departments/${id}/restore`, {});
      fetchData();
      alert('Department restored successfully.');
    } catch (err: any) {
      alert(err.message || 'Error restoring department');
    }
  };

  const openEditModal = (dept: any) => {
    setEditForm({
      id: dept.id,
      name: dept.name,
      code: dept.code,
      description: dept.description || '',
      head_teacher_id: dept.head_teacher_id || ''
    });
    setShowEditModal(true);
  };

  const openDetailModal = (dept: any) => {
    setSelectedDept(dept);
    setDetailTab('info');
    setShowDetailModal(true);
  };

  // derived lists
  const filteredTeachers = selectedDept
    ? teachers.filter(t => t.department === selectedDept.name)
    : [];

  const filteredPrograms = selectedDept
    ? programs.filter(p => p.department_id === selectedDept.id)
    : [];

  const filteredSubjects = selectedDept
    ? subjects.filter(s => filteredPrograms.some(p => p.id === s.course_id))
    : [];

  // Filter based on status filter & search query
  const displayedDepartments = departments.filter(dept => {
    const matchesSearch = dept.name.toLowerCase().includes(search.toLowerCase()) || 
                          dept.code.toLowerCase().includes(search.toLowerCase());
    
    if (statusFilter === 'ACTIVE') return matchesSearch && dept.is_active === 1;
    if (statusFilter === 'ARCHIVED') return matchesSearch && dept.is_active === 0;
    return matchesSearch;
  });

  // Calculate statistics from active departments only
  const activeDepts = departments.filter(d => d.is_active === 1);
  const totalActiveDepts = activeDepts.length;
  const mappedTeachersCount = activeDepts.reduce((acc, d) => acc + (d.teachers_count || 0), 0);
  const mappedSubjectsCount = activeDepts.reduce((acc, d) => acc + (d.subjects_count || 0), 0);

  return (
    <Layout>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>Departments</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Manage academic departments, assign HODs, and view statistics.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} /> Add Department
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
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{totalActiveDepts}</span>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', minHeight: '110px' }}>
          <div style={{ padding: '0.75rem', backgroundColor: '#ecfdf5', borderRadius: 'var(--radius-md)', color: '#059669' }}>
            <Users size={24} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Mapped Teachers</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{mappedTeachersCount}</span>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', minHeight: '110px' }}>
          <div style={{ padding: '0.75rem', backgroundColor: '#fffbeb', borderRadius: 'var(--radius-md)', color: '#d97706' }}>
            <BookOpen size={24} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Mapped Subjects</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{mappedSubjectsCount}</span>
          </div>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="card filters" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', padding: '1rem' }}>
        <div className="search-container" style={{ flex: '1 1 300px', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
          <Search size={18} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Search by department name or code..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', width: '100%', outline: 'none', background: 'transparent', fontSize: '0.875rem' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
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

      {/* Main Grid / Table */}
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
                  <th style={{ textAlign: 'left', padding: '1rem' }}>HOD</th>
                  <th style={{ textAlign: 'center', padding: '1rem' }}>Teachers</th>
                  <th style={{ textAlign: 'center', padding: '1rem' }}>Subjects</th>
                  <th style={{ textAlign: 'center', padding: '1rem' }}>Status</th>
                  <th style={{ textAlign: 'right', padding: '1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedDepartments.map(dept => (
                  <tr key={dept.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem' }}>
                      <code style={{ fontSize: '0.9rem', fontWeight: 700, backgroundColor: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)' }}>
                        {dept.code}
                      </code>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{dept.name}</td>
                    <td style={{ padding: '1rem', color: dept.head_teacher_name ? 'var(--text-main)' : 'var(--text-muted)' }}>
                      {dept.head_teacher_name || 'Not Assigned'}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>{dept.teachers_count || 0}</td>
                    <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>{dept.subjects_count || 0}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span className={`badge badge-${dept.is_active === 1 ? 'success' : 'secondary'}`}>
                        {dept.is_active === 1 ? 'ACTIVE' : 'ARCHIVED'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => openDetailModal(dept)} 
                          className="btn btn-sm btn-outline" 
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Eye size={12} /> View
                        </button>
                        <button 
                          onClick={() => openEditModal(dept)} 
                          className="btn btn-sm btn-secondary" 
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Edit3 size={12} /> Edit
                        </button>
                        {dept.is_active === 1 ? (
                          <button 
                            onClick={() => handleArchive(dept.id)} 
                            className="btn btn-sm btn-outline-danger" 
                            style={{ color: 'var(--danger)', borderColor: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            <Trash2 size={12} /> Archive
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleRestore(dept.id)} 
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
                {displayedDepartments.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>
                      {/* Empty State Standard */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                        <Shield size={48} color="#cbd5e1" />
                        <h4 style={{ margin: 0, fontWeight: 700, color: 'var(--text-main)' }}>No Departments Found</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Try adjusting your search query or filters, or add a new department.</p>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)} style={{ marginTop: '0.5rem' }}>
                          Add Department
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

      {/* Modal 1: Add Department */}
      {showAddModal && (
        <div className="modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1000, padding: '1rem', overflowY: 'auto' }}>
          <div className="modal-content" style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', maxWidth: '520px', width: '100%', padding: '2rem', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-main)' }}>Add Department</h3>
            <form onSubmit={handleAddSubmit}>
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Department Code *</label>
                <input 
                  type="text" 
                  value={addForm.code} 
                  onChange={e => setAddForm({...addForm, code: e.target.value})} 
                  placeholder="e.g. CSE" 
                  required 
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>Unique code identifier.</span>
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label style={{ fontWeight: 600 }}>Department Name *</label>
                <input 
                  type="text" 
                  value={addForm.name} 
                  onChange={e => setAddForm({...addForm, name: e.target.value})} 
                  placeholder="e.g. Computer Science & Engineering" 
                  required 
                />
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label style={{ fontWeight: 600 }}>Head of Department (HOD)</label>
                <select 
                  value={addForm.head_teacher_id} 
                  onChange={e => setAddForm({...addForm, head_teacher_id: e.target.value})}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: '#ffffff', outline: 'none' }}
                >
                  <option value="">-- Assign Optional HOD --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.first_name} {t.middle_name ? t.middle_name + ' ' : ''}{t.last_name} ({t.employee_id})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label style={{ fontWeight: 600 }}>Description</label>
                <textarea 
                  className="form-control" 
                  value={addForm.description} 
                  onChange={e => setAddForm({...addForm, description: e.target.value})}
                  placeholder="Provide department detail summaries..."
                  style={{ width: '100%', minHeight: '80px', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', outline: 'none' }}
                />
              </div>
              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Department</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Department */}
      {showEditModal && (
        <div className="modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1000, padding: '1rem', overflowY: 'auto' }}>
          <div className="modal-content" style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', maxWidth: '520px', width: '100%', padding: '2rem', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-main)' }}>Edit Department</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Department Code *</label>
                <input 
                  type="text" 
                  value={editForm.code} 
                  onChange={e => setEditForm({...editForm, code: e.target.value})} 
                  placeholder="e.g. CSE" 
                  required 
                />
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label style={{ fontWeight: 600 }}>Department Name *</label>
                <input 
                  type="text" 
                  value={editForm.name} 
                  onChange={e => setEditForm({...editForm, name: e.target.value})} 
                  placeholder="e.g. Computer Science & Engineering" 
                  required 
                />
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label style={{ fontWeight: 600 }}>Head of Department (HOD)</label>
                <select 
                  value={editForm.head_teacher_id} 
                  onChange={e => setEditForm({...editForm, head_teacher_id: e.target.value})}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: '#ffffff', outline: 'none' }}
                >
                  <option value="">-- Unassigned --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.first_name} {t.middle_name ? t.middle_name + ' ' : ''}{t.last_name} ({t.employee_id})
                    </option>
                  ))}
                </select>
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

      {/* Modal 3: View Details Hub */}
      {showDetailModal && selectedDept && (
        <div className="modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1000, padding: '1rem', overflowY: 'auto' }}>
          <div className="modal-content" style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', maxWidth: '680px', width: '100%', padding: '2rem', boxShadow: 'var(--shadow-lg)', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)', position: 'relative' }}>
            
            {/* Modal Hero Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', backgroundColor: '#e0e7ff', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                🏢
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>{selectedDept.name}</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.15rem' }}>
                  Code: <code style={{ fontWeight: 700, color: 'var(--text-main)' }}>{selectedDept.code}</code>
                </span>
              </div>
              <span className={`badge badge-${selectedDept.is_active === 1 ? 'success' : 'secondary'}`} style={{ marginLeft: 'auto' }}>
                {selectedDept.is_active === 1 ? 'ACTIVE' : 'ARCHIVED'}
              </span>
            </div>

            {/* Tabs Header (Locked 52px, single line) */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', gap: '1rem', overflowX: 'auto', scrollbarWidth: 'none', height: '52px', alignItems: 'center' }}>
              {[
                { tab: 'info', label: 'Info' },
                { tab: 'teachers', label: `Teachers (${selectedDept.teachers_count || 0})` },
                { tab: 'subjects', label: `Subjects (${selectedDept.subjects_count || 0})` },
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
                  <p style={{ margin: 0, color: 'var(--text-main)' }}>{selectedDept.description || 'No description provided.'}</p>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Head of Department</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{selectedDept.head_teacher_name || 'Not Assigned'}</span>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Programs Enrolled</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{filteredPrograms.length} Active Courses</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Teachers Roster */}
            {detailTab === 'teachers' && (
              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Employee ID</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Name</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Designation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeachers.map(t => (
                      <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.5rem' }}><code>{t.employee_id}</code></td>
                        <td style={{ padding: '0.5rem', fontWeight: 600 }}>{t.first_name} {t.last_name}</td>
                        <td style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>{t.designation || 'Lecturer'}</td>
                      </tr>
                    ))}
                    {filteredTeachers.length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No active teachers assigned to this department.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 3: Subjects Roster */}
            {detailTab === 'subjects' && (
              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Code</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Subject Name</th>
                      <th style={{ textAlign: 'center', padding: '0.5rem' }}>Credits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubjects.map(s => (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.5rem' }}><code>{s.subject_code}</code></td>
                        <td style={{ padding: '0.5rem', fontWeight: 600 }}>{s.subject_name}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>{s.credits || 0}</td>
                      </tr>
                    ))}
                    {filteredSubjects.length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No subjects mapped under courses for this department.
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
                  
                  {/* Item 1 */}
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-1.45rem', top: '0.2rem', width: '0.75rem', height: '0.75rem', borderRadius: '50%', backgroundColor: 'var(--primary)', border: '2px solid #ffffff' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                      {selectedDept.created_at ? new Date(selectedDept.created_at).toLocaleDateString() : 'N/A'}
                    </span>
                    <strong style={{ fontSize: '0.85rem', display: 'block', color: 'var(--text-main)', marginTop: '0.15rem' }}>Department Provisioned</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Record initialized in system.</span>
                  </div>

                  {/* Item 2 */}
                  {selectedDept.head_teacher_name && (
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '-1.45rem', top: '0.2rem', width: '0.75rem', height: '0.75rem', borderRadius: '50%', backgroundColor: '#059669', border: '2px solid #ffffff' }} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                        Active Schedule State
                      </span>
                      <strong style={{ fontSize: '0.85rem', display: 'block', color: 'var(--text-main)', marginTop: '0.15rem' }}>HOD Mapped Successfully</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mapped to active teacher: {selectedDept.head_teacher_name}</span>
                    </div>
                  )}

                  {/* Item 3 */}
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-1.45rem', top: '0.2rem', width: '0.75rem', height: '0.75rem', borderRadius: '50%', backgroundColor: '#cbd5e1', border: '2px solid #ffffff' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Current Status</span>
                    <strong style={{ fontSize: '0.85rem', display: 'block', color: 'var(--text-main)', marginTop: '0.15rem' }}>
                      Status set to {selectedDept.is_active === 1 ? 'ACTIVE' : 'ARCHIVED'}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button type="button" onClick={() => setShowDetailModal(false)} className="btn btn-secondary">Close Details</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
