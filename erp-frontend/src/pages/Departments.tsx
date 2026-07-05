import './Departments.css';
import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
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
      <PageGuidance
        title="Departments"
        description="Use this page to organize your school into main divisions like Primary, Secondary, or subject groups."
        steps={["Click \"Add Department\" to create a new division.","Enter the name and assign a head teacher to lead it.","Manage or update department details from the list below."]}
      />
      {/* Page Header */}
      <div className="page-header departments-page-header">
        <div>
          <h2 className="departments-title-2">Departments</h2>
          <p className="departments-text-3">Manage academic departments, assign HODs, and view statistics.</p>
        </div>
        <button className="btn btn-primary departments-btn" onClick={() => setShowAddModal(true)}>
          <Plus size={18} /> Add Department
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="departments-grid-5">
        <div className="card departments-card">
          <div className="departments-div-7">
            <Shield size={24} />
          </div>
          <div>
            <span className="departments-span-8">Total Active</span>
            <span className="departments-span-9">{totalActiveDepts}</span>
          </div>
        </div>

        <div className="card departments-card">
          <div className="departments-div-11">
            <Users size={24} />
          </div>
          <div>
            <span className="departments-span-12">Mapped Teachers</span>
            <span className="departments-span-13">{mappedTeachersCount}</span>
          </div>
        </div>

        <div className="card departments-card">
          <div className="departments-div-15">
            <BookOpen size={24} />
          </div>
          <div>
            <span className="departments-span-16">Mapped Subjects</span>
            <span className="departments-span-17">{mappedSubjectsCount}</span>
          </div>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="card filters departments-card">
        <div className="search-container departments-search-container">
          <Search size={18} color="var(--text-muted)" />
          <input type="text" placeholder="Search by department name or code..." value={search} onChange={(e) => setSearch(e.target.value)} className="departments-input-20"  />
        </div>
        <div className="departments-row-21">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="departments-select-22">
            <option value="ACTIVE">Active Only</option>
            <option value="ARCHIVED">Archived Only</option>
            <option value="ALL">All Statuses</option>
          </select>
          <button className="btn btn-secondary departments-btn" onClick={fetchData}>
            <RefreshCw size={14} /> Sync
          </button>
        </div>
      </div>

      {/* Main Grid / Table */}
      <div className="card departments-card">
        {loading ? (
          <div className="departments-div-25">Loading...</div>
        ) : (
          <div className="departments-div-26">
            <table className="table departments-table">
              <thead>
                <tr>
                  <th className="departments-th-28">Code</th>
                  <th className="departments-th-29">Name</th>
                  <th className="departments-th-30">HOD</th>
                  <th className="departments-th-31">Teachers</th>
                  <th className="departments-th-32">Subjects</th>
                  <th className="departments-th-33">Status</th>
                  <th className="departments-th-34">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedDepartments.map(dept => (
                  <tr key={dept.id} className="departments-tr-35">
                    <td className="departments-td-36">
                      <code className="departments-code-37">
                        {dept.code}
                      </code>
                    </td>
                    <td className="departments-td-38">{dept.name}</td>
                    <td style={{ padding: '1rem', color: dept.head_teacher_name ? 'var(--text-main)' : 'var(--text-muted)' }}>
                      {dept.head_teacher_name || 'Not Assigned'}
                    </td>
                    <td className="departments-td-39">{dept.teachers_count || 0}</td>
                    <td className="departments-td-40">{dept.subjects_count || 0}</td>
                    <td className="departments-td-41">
                      <span className={`badge badge-${dept.is_active === 1 ? 'success' : 'secondary'}`}>
                        {dept.is_active === 1 ? 'ACTIVE' : 'ARCHIVED'}
                      </span>
                    </td>
                    <td className="departments-td-42">
                      <div className="departments-row-43">
                        <button onClick={() => openDetailModal(dept)} className="btn btn-sm btn-outline departments-btn">
                          <Eye size={12} /> View
                        </button>
                        <button onClick={() => openEditModal(dept)} className="btn btn-sm btn-secondary departments-btn">
                          <Edit3 size={12} /> Edit
                        </button>
                        {dept.is_active === 1 ? (
                          <button onClick={() => handleArchive(dept.id)} className="btn btn-sm btn-outline-danger departments-btn">
                            <Trash2 size={12} /> Archive
                          </button>
                        ) : (
                          <button onClick={() => handleRestore(dept.id)} className="btn btn-sm btn-outline-success departments-btn">
                            <RefreshCw size={12} /> Restore
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {displayedDepartments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="departments-td-48">
                      {/* Empty State Standard */}
                      <div className="departments-col-49">
                        <Shield size={48} color="#cbd5e1" />
                        <h4 className="departments-title-50">No Departments Found</h4>
                        <p className="departments-text-51">Try adjusting your search query or filters, or add a new department.</p>
                        <button className="btn btn-primary btn-sm departments-btn" onClick={() => setShowAddModal(true)}>
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
        <div className="modal departments-modal">
          <div className="modal-content departments-modal-content">
            <h3 className="departments-title-55">Add Department</h3>
            <form onSubmit={handleAddSubmit}>
              <div className="form-group">
                <label className="departments-label-56">Department Code *</label>
                <input 
                  type="text" 
                  value={addForm.code} 
                  onChange={e => setAddForm({...addForm, code: e.target.value})} 
                  placeholder="e.g. CSE" 
                  required 
                />
                <span className="departments-span-57">Unique code identifier.</span>
              </div>
              <div className="form-group departments-form-group">
                <label className="departments-label-59">Department Name *</label>
                <input 
                  type="text" 
                  value={addForm.name} 
                  onChange={e => setAddForm({...addForm, name: e.target.value})} 
                  placeholder="e.g. Computer Science & Engineering" 
                  required 
                />
              </div>
              <div className="form-group departments-form-group">
                <label className="departments-label-61">Head of Department (HOD)</label>
                <select value={addForm.head_teacher_id} onChange={e => setAddForm({...addForm, head_teacher_id: e.target.value})} className="departments-select-62">
                  <option value="">-- Assign Optional HOD --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.first_name} {t.middle_name ? t.middle_name + ' ' : ''}{t.last_name} ({t.employee_id})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group departments-form-group">
                <label className="departments-label-64">Description</label>
                <textarea className="form-control departments-form-control" value={addForm.description} onChange={e => setAddForm({...addForm, description: e.target.value})} placeholder="Provide department detail summaries..."  />
              </div>
              <div className="modal-actions departments-modal-actions">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Department</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Department */}
      {showEditModal && (
        <div className="modal departments-modal">
          <div className="modal-content departments-modal-content">
            <h3 className="departments-title-69">Edit Department</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label className="departments-label-70">Department Code *</label>
                <input 
                  type="text" 
                  value={editForm.code} 
                  onChange={e => setEditForm({...editForm, code: e.target.value})} 
                  placeholder="e.g. CSE" 
                  required 
                />
              </div>
              <div className="form-group departments-form-group">
                <label className="departments-label-72">Department Name *</label>
                <input 
                  type="text" 
                  value={editForm.name} 
                  onChange={e => setEditForm({...editForm, name: e.target.value})} 
                  placeholder="e.g. Computer Science & Engineering" 
                  required 
                />
              </div>
              <div className="form-group departments-form-group">
                <label className="departments-label-74">Head of Department (HOD)</label>
                <select value={editForm.head_teacher_id} onChange={e => setEditForm({...editForm, head_teacher_id: e.target.value})} className="departments-select-75">
                  <option value="">-- Unassigned --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.first_name} {t.middle_name ? t.middle_name + ' ' : ''}{t.last_name} ({t.employee_id})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group departments-form-group">
                <label className="departments-label-77">Description</label>
                <textarea className="form-control departments-form-control" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})}  />
              </div>
              <div className="modal-actions departments-modal-actions">
                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: View Details Hub */}
      {showDetailModal && selectedDept && (
        <div className="modal departments-modal">
          <div className="modal-content departments-modal-content">
            
            {/* Modal Hero Header */}
            <div className="departments-row-82">
              <div className="departments-row-83">
                🏢
              </div>
              <div>
                <h3 className="departments-title-84">{selectedDept.name}</h3>
                <span className="departments-span-85">
                  Code: <code className="departments-code-86">{selectedDept.code}</code>
                </span>
              </div>
              <span className={`badge badge-${selectedDept.is_active === 1 ? 'success' : 'secondary'} departments-span-87`}>
                {selectedDept.is_active === 1 ? 'ACTIVE' : 'ARCHIVED'}
              </span>
            </div>

            {/* Tabs Header (Locked 52px, single line) */}
            <div className="departments-row-88">
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
              <div className="departments-col-89">
                <div className="departments-div-90">
                  <span className="departments-span-91">Description</span>
                  <p className="departments-text-92">{selectedDept.description || 'No description provided.'}</p>
                </div>
                
                <div className="departments-grid-93">
                  <div className="departments-div-94">
                    <span className="departments-span-95">Head of Department</span>
                    <span className="departments-span-96">{selectedDept.head_teacher_name || 'Not Assigned'}</span>
                  </div>
                  <div className="departments-div-97">
                    <span className="departments-span-98">Programs Enrolled</span>
                    <span className="departments-span-99">{filteredPrograms.length} Active Courses</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Teachers Roster */}
            {detailTab === 'teachers' && (
              <div className="departments-div-100">
                <table className="table departments-table">
                  <thead>
                    <tr>
                      <th className="departments-th-102">Employee ID</th>
                      <th className="departments-th-103">Name</th>
                      <th className="departments-th-104">Designation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeachers.map(t => (
                      <tr key={t.id} className="departments-tr-105">
                        <td className="departments-td-106"><code>{t.employee_id}</code></td>
                        <td className="departments-td-107">{t.first_name} {t.last_name}</td>
                        <td className="departments-td-108">{t.designation || 'Lecturer'}</td>
                      </tr>
                    ))}
                    {filteredTeachers.length === 0 && (
                      <tr>
                        <td colSpan={3} className="departments-td-109">
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
              <div className="departments-div-110">
                <table className="table departments-table">
                  <thead>
                    <tr>
                      <th className="departments-th-112">Code</th>
                      <th className="departments-th-113">Subject Name</th>
                      <th className="departments-th-114">Credits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubjects.map(s => (
                      <tr key={s.id} className="departments-tr-115">
                        <td className="departments-td-116"><code>{s.subject_code}</code></td>
                        <td className="departments-td-117">{s.subject_name}</td>
                        <td className="departments-td-118">{s.credits || 0}</td>
                      </tr>
                    ))}
                    {filteredSubjects.length === 0 && (
                      <tr>
                        <td colSpan={3} className="departments-td-119">
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
              <div className="departments-div-120">
                <div className="departments-col-121">
                  
                  {/* Item 1 */}
                  <div className="departments-div-122">
                    <div className="departments-div-123"  />
                    <span className="departments-span-124">
                      {selectedDept.created_at ? new Date(selectedDept.created_at).toLocaleDateString() : 'N/A'}
                    </span>
                    <strong className="departments-strong-125">Department Provisioned</strong>
                    <span className="departments-span-126">Record initialized in system.</span>
                  </div>

                  {/* Item 2 */}
                  {selectedDept.head_teacher_name && (
                    <div className="departments-div-127">
                      <div className="departments-div-128"  />
                      <span className="departments-span-129">
                        Active Schedule State
                      </span>
                      <strong className="departments-strong-130">HOD Mapped Successfully</strong>
                      <span className="departments-span-131">Mapped to active teacher: {selectedDept.head_teacher_name}</span>
                    </div>
                  )}

                  {/* Item 3 */}
                  <div className="departments-div-132">
                    <div className="departments-div-133"  />
                    <span className="departments-span-134">Current Status</span>
                    <strong className="departments-strong-135">
                      Status set to {selectedDept.is_active === 1 ? 'ACTIVE' : 'ARCHIVED'}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="modal-actions departments-modal-actions">
              <button type="button" onClick={() => setShowDetailModal(false)} className="btn btn-secondary">Close Details</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
