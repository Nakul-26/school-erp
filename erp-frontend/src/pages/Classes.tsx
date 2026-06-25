import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { 
  Plus, 
  Search, 
  Eye, 
  Edit2, 
  Archive, 
  RefreshCw, 
  Calendar, 
  Users, 
  SlidersHorizontal, 
  Info, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  MapPin,
  Trash2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Classes() {
  const [classes, setClasses] = useState<any[]>([]); // sections
  const [years, setYears] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [filterYear, setFilterYear] = useState('');
  const [filterProgram, setFilterProgram] = useState('');
  const [filterStatus, setFilterStatus] = useState('1'); // '1' = active, '0' = archived
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Form
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingSection, setEditingSection] = useState<any>(null);
  const [form, setForm] = useState({ 
    name: '', 
    year_number: 1, 
    academic_year_id: '', 
    course_id: '', 
    capacity: 40, 
    room: '', 
    class_teacher_id: '' 
  });

  // Detail Hub Modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'roster' | 'timetable' | 'timeline'>('info');

  // Detail tab sub-states
  const [sectionStudents, setSectionStudents] = useState<any[]>([]);
  const [sectionTimetable, setSectionTimetable] = useState<any[]>([]);
  const [sectionLogs, setSectionLogs] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Institution & Terminology States
  const { user } = useAuth();
  const [institutionType, setInstitutionType] = useState<string>('college');

  const getProgramLabel = () => institutionType === 'school' ? 'Class' : 'Program';
  const getSectionTitle = () => institutionType === 'school' ? 'Sections' : 'Classes & Sections';

  useEffect(() => {
    fetchData();
  }, [filterYear, filterProgram, filterStatus]); // reload lists on filter change (except search, which is client-side or on-change)

  const fetchData = async () => {
    setLoading(true);
    try {
      // Build filter params
      const params: Record<string, string> = {};
      if (filterYear) params.academic_year_id = filterYear;
      if (filterProgram) params.course_id = filterProgram;
      if (filterStatus) params.is_active = filterStatus;
      
      const queryStr = new URLSearchParams(params).toString();
      const [sectionsData, yearsData, programsData, teachersData] = await Promise.all([
        api.get(`/sections?${queryStr}`),
        api.get('/academic-years'),
        api.get('/programs'),
        api.get('/teachers').catch(() => [])
      ]);

      setClasses(sectionsData || []);
      setYears(yearsData || []);
      setPrograms(programsData || []);
      setTeachers(teachersData || []);

      if (yearsData.length > 0 && !form.academic_year_id) {
        setForm(f => ({ ...f, academic_year_id: yearsData[0].id }));
      }
      if (programsData.length > 0 && !form.course_id) {
        setForm(f => ({ ...f, course_id: programsData[0].id }));
      }

      if (user?.institution_id) {
        const inst = await api.get(`/institutions/${user.institution_id}`);
        if (inst && inst.institution_type) {
          setInstitutionType(inst.institution_type);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = async (section: any) => {
    setSelectedSection(section);
    setDetailTab('info');
    setShowDetailModal(true);
    setDetailLoading(true);
    try {
      const [studentsData, timetableData, logsData] = await Promise.all([
        api.get(`/students?section_id=${section.id}`).catch(() => []),
        api.get(`/weekly-timetable?section_id=${section.id}`).catch(() => []),
        api.get(`/audit-logs?module=sections&record_id=${section.id}`).catch(() => ({ data: [] }))
      ]);
      setSectionStudents(studentsData || []);
      setSectionTimetable(timetableData || []);
      setSectionLogs(logsData?.data || []);
    } catch (err) {
      console.error('Error fetching details', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingSection(null);
    setForm({
      name: '',
      year_number: 1,
      academic_year_id: years[0]?.id || '',
      course_id: programs[0]?.id || '',
      capacity: 40,
      room: '',
      class_teacher_id: ''
    });
    setShowFormModal(true);
  };

  const handleOpenEdit = (section: any) => {
    setEditingSection(section);
    setForm({
      name: section.name,
      year_number: section.year_number,
      academic_year_id: section.academic_year_id,
      course_id: section.course_id,
      capacity: section.capacity || 40,
      room: section.room || '',
      class_teacher_id: section.class_teacher_id || ''
    });
    setShowFormModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        academic_year_id: form.academic_year_id,
        course_id: form.course_id,
        year_number: institutionType === 'school' ? 1 : form.year_number,
        capacity: form.capacity ? parseInt(form.capacity.toString(), 10) : null,
        room: form.room || null,
        class_teacher_id: form.class_teacher_id || null
      };

      if (editingSection) {
        await api.put(`/sections/${editingSection.id}`, payload);
      } else {
        await api.post('/sections', payload);
      }
      
      setShowFormModal(false);
      setEditingSection(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error processing request');
    }
  };

  const handleToggleStatus = async (section: any) => {
    const action = section.is_active ? 'archive' : 'restore';
    if (!confirm(`Are you sure you want to ${action} this section?`)) return;
    try {
      await api.put(`/sections/${section.id}`, { is_active: section.is_active ? 0 : 1 });
      fetchData();
    } catch (err: any) {
      alert(err.error || err.message || `Error attempting to ${action} section`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this section? This action is irreversible.')) return;
    try {
      await api.delete(`/sections/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.error || err.message || 'Error deleting section');
    }
  };

  // Filter client-side by search query
  const filteredClasses = classes.filter(cls => {
    const searchLower = searchQuery.toLowerCase();
    const nameMatch = cls.name.toLowerCase().includes(searchLower);
    const roomMatch = cls.room ? cls.room.toLowerCase().includes(searchLower) : false;
    const teacherMatch = cls.class_teacher_name ? cls.class_teacher_name.toLowerCase().includes(searchLower) : false;
    const programMatch = cls.course_name ? cls.course_name.toLowerCase().includes(searchLower) : false;
    return nameMatch || roomMatch || teacherMatch || programMatch;
  });

  // Calculate statistics
  const activeSections = classes.filter(c => c.is_active === 1);
  const totalSectionsCount = activeSections.length;
  const sectionsWithoutTeacher = activeSections.filter(c => !c.class_teacher_id).length;
  const totalCapacity = activeSections.reduce((acc, c) => acc + (c.capacity || 0), 0);
  const avgCapacity = totalSectionsCount > 0 ? Math.round(totalCapacity / totalSectionsCount) : 0;
  const enrolledStudentsCount = activeSections.reduce((acc, c) => acc + (c.student_count || 0), 0);

  return (
    <Layout>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>{getSectionTitle()}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Manage classroom allocations, student capacities, and class teacher mappings.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
          <Plus size={18} /> Add {institutionType === 'school' ? 'Section' : 'Class/Section'}
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
            <SlidersHorizontal size={24} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Sections</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{totalSectionsCount}</span>
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>No Class Teacher</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{sectionsWithoutTeacher}</span>
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', color: '#059669' }}>
            <Info size={24} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Avg Capacity</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{avgCapacity}</span>
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
            <Users size={24} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Active Enrolled</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{enrolledStudentsCount}</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <div style={{ flex: '1', minWidth: '240px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by section name, room, or teacher..." 
            style={{ paddingLeft: '2.5rem', width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', fontSize: '0.875rem' }}>
            <option value="">All Academic Years</option>
            {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
          </select>

          <select value={filterProgram} onChange={e => setFilterProgram(e.target.value)} style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', fontSize: '0.875rem' }}>
            <option value="">All {getProgramLabel()}s</option>
            {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', fontSize: '0.875rem' }}>
            <option value="1">Active Only</option>
            <option value="0">Archived Only</option>
            <option value="">All Statuses</option>
          </select>
        </div>
      </div>

      {/* Listing Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem' }}>
            <RefreshCw className="spinner" size={32} style={{ color: 'var(--primary)' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading sections database...</span>
          </div>
        ) : (
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'rgba(248, 250, 252, 0.5)' }}>
                <th style={{ textAlign: 'left', padding: '1rem' }}>Section details</th>
                {institutionType !== 'school' && <th style={{ textAlign: 'left', padding: '1rem' }}>Year Level</th>}
                <th style={{ textAlign: 'left', padding: '1rem' }}>{getProgramLabel()}</th>
                <th style={{ textAlign: 'left', padding: '1rem' }}>Classroom / Room</th>
                <th style={{ textAlign: 'left', padding: '1rem' }}>Capacity Status</th>
                <th style={{ textAlign: 'left', padding: '1rem' }}>Class Teacher</th>
                <th style={{ textAlign: 'center', padding: '1rem' }}>Status</th>
                <th style={{ textAlign: 'right', padding: '1rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClasses.map(cls => {
                const isOverfilled = (cls.student_count || 0) >= (cls.capacity || 40);
                const percent = Math.min(100, Math.round(((cls.student_count || 0) / (cls.capacity || 40)) * 100));
                
                return (
                  <tr key={cls.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }} className="hover-row">
                    <td style={{ padding: '1rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>{cls.name}</span>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>{cls.academic_year_name || 'No Year'}</span>
                    </td>
                    {institutionType !== 'school' && (
                      <td style={{ padding: '1rem', color: 'var(--text-main)' }}>Year {cls.year_number}</td>
                    )}
                    <td style={{ padding: '1rem', color: 'var(--text-main)', fontWeight: 500 }}>
                      {cls.course_name || 'Unknown'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {cls.room ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                          <MapPin size={14} style={{ color: 'var(--text-muted)' }} /> {cls.room}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Not Assigned</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '130px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
                          <span style={{ color: isOverfilled ? '#dc2626' : 'var(--text-main)' }}>{cls.student_count || 0} / {cls.capacity || 40}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{percent}%</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${percent}%`, 
                            height: '100%', 
                            borderRadius: '3px', 
                            backgroundColor: percent > 100 ? '#ef4444' : percent >= 85 ? '#f97316' : '#10b981'
                          }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {cls.class_teacher_name ? (
                        <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>{cls.class_teacher_name}</span>
                      ) : (
                        <span style={{ display: 'inline-block', padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-sm)', backgroundColor: '#f1f5f9', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.625rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        backgroundColor: cls.is_active ? '#dcfce7' : '#fef3c7',
                        color: cls.is_active ? '#15803d' : '#b45309'
                      }}>
                        {cls.is_active ? 'Active' : 'Archived'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button className="btn btn-sm btn-secondary" onClick={() => handleOpenDetails(cls)} title="View Detail dossier" style={{ padding: '0.35rem' }}>
                          <Eye size={14} />
                        </button>
                        <button className="btn btn-sm btn-secondary" onClick={() => handleOpenEdit(cls)} title="Edit details" style={{ padding: '0.35rem' }}>
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-sm btn-secondary" onClick={() => handleToggleStatus(cls)} title={cls.is_active ? 'Archive section' : 'Restore section'} style={{ padding: '0.35rem' }}>
                          <Archive size={14} />
                        </button>
                        {!cls.is_active && (
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(cls.id)} title="Delete permanently" style={{ padding: '0.35rem' }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredClasses.length === 0 && (
                <tr>
                  <td colSpan={institutionType === 'school' ? 7 : 8} style={{ textAlign: 'center', padding: '4rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <Users size={32} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>No Classes or Sections Found</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Try clearing filters or search to broaden search boundaries.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Form Modal */}
      {showFormModal && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1000 }}>
          <div className="modal-content" style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', maxWidth: '480px', width: '100%', padding: '2rem', boxShadow: 'var(--shadow-lg)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1.25rem' }}>
              {editingSection ? `Edit Class/Section: ${editingSection.name}` : `Add New ${institutionType === 'school' ? 'Section' : 'Class/Section'}`}
            </h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>Section Name *</label>
                <input 
                  type="text" 
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})} 
                  placeholder="e.g. Section A, Section B, A"
                  required 
                />
              </div>

              {institutionType !== 'school' && (
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>Year Level *</label>
                  <input 
                    type="number" 
                    value={form.year_number} 
                    onChange={e => setForm({...form, year_number: parseInt(e.target.value, 10) || 1})} 
                    required 
                    min="1" 
                  />
                </div>
              )}

              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>{getProgramLabel()} *</label>
                <select value={form.course_id} onChange={e => setForm({...form, course_id: e.target.value})} required>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>Academic Year *</label>
                <select value={form.academic_year_id} onChange={e => setForm({...form, academic_year_id: e.target.value})} required>
                  {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>Room / Location</label>
                  <input 
                    type="text" 
                    value={form.room} 
                    onChange={e => setForm({...form, room: e.target.value})} 
                    placeholder="e.g. Room 302"
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>Max Capacity *</label>
                  <input 
                    type="number" 
                    value={form.capacity} 
                    onChange={e => setForm({...form, capacity: parseInt(e.target.value, 10) || 0})} 
                    required 
                    min="1"
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>Class Teacher / Advisor</label>
                <select value={form.class_teacher_id} onChange={e => setForm({...form, class_teacher_id: e.target.value})}>
                  <option value="">-- Assign Class Teacher (Optional) --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name} ({t.employee_id || 'No ID'})</option>
                  ))}
                </select>
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowFormModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Hub Dossier Modal */}
      {showDetailModal && selectedSection && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1000 }}>
          <div className="modal-content" style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', maxWidth: '640px', width: '100%', padding: '2rem', boxShadow: 'var(--shadow-lg)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 850, color: 'var(--text-main)', margin: 0 }}>Section Dossier: {selectedSection.name}</h3>
                <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  {selectedSection.course_name} • {selectedSection.academic_year_name}
                </span>
              </div>
              <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>Close Dossier</button>
            </div>

            {/* Tab Links */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', gap: '1rem', overflowX: 'auto', scrollbarWidth: 'none', height: '52px', alignItems: 'center' }}>
              {[
                { tab: 'info', label: 'Info & Analytics' },
                { tab: 'roster', label: `Student Roster (${detailLoading ? '...' : sectionStudents.length})` },
                { tab: 'timetable', label: `Timetable (${detailLoading ? '...' : sectionTimetable.length})` },
                { tab: 'timeline', label: 'Audit Timeline' }
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

            {detailLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '1rem' }}>
                <RefreshCw className="spinner" size={24} style={{ color: 'var(--primary)' }} />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Retrieving dossier logs...</span>
              </div>
            ) : (
              <div>
                {/* Tab 1: Info & Analytics */}
                {detailTab === 'info' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Classroom Location</span>
                        <span style={{ fontWeight: 650, color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <MapPin size={16} /> {selectedSection.room || 'No Room Assigned'}
                        </span>
                      </div>

                      <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Class Teacher</span>
                        <span style={{ fontWeight: 650, color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Users size={16} /> {selectedSection.class_teacher_name || 'No Teacher Mapped'}
                        </span>
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 700 }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Section Enrollment Fill Rate</span>
                        <span style={{ color: 'var(--text-main)' }}>{selectedSection.student_count || 0} / {selectedSection.capacity || 40} Students</span>
                      </div>
                      
                      {/* Visual Progress Bar */}
                      {(() => {
                        const count = selectedSection.student_count || 0;
                        const cap = selectedSection.capacity || 40;
                        const percent = Math.min(100, Math.round((count / cap) * 100));
                        return (
                          <div>
                            <div style={{ width: '100%', height: '12px', backgroundColor: '#e2e8f0', borderRadius: '6px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                              <div style={{ 
                                width: `${percent}%`, 
                                height: '100%', 
                                borderRadius: '6px', 
                                backgroundColor: percent > 100 ? '#ef4444' : percent >= 85 ? '#f97316' : '#10b981'
                              }} />
                            </div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              {percent >= 100 ? (
                                <><AlertTriangle size={14} style={{ color: '#ef4444' }} /> <span style={{ color: '#b91c1c', fontWeight: 600 }}>Capacity limit reached! Additional enrollments blocked.</span></>
                              ) : percent >= 85 ? (
                                <><AlertTriangle size={14} style={{ color: '#f97316' }} /> <span style={{ color: '#c2410c', fontWeight: 600 }}>Approaching max capacity limit.</span></>
                              ) : (
                                <><CheckCircle2 size={14} style={{ color: '#10b981' }} /> <span>Safe capacity level. Enrolling new students is allowed.</span></>
                              )}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Tab 2: Student Roster */}
                {detailTab === 'roster' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Enrolled Student Directory</span>
                      <span style={{ fontSize: '0.8rem', padding: '0.125rem 0.5rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontWeight: 600 }}>
                        {sectionStudents.length} Students
                      </span>
                    </div>

                    <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                      <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ textAlign: 'left', padding: '0.75rem' }}>Student ID</th>
                            <th style={{ textAlign: 'left', padding: '0.75rem' }}>Name</th>
                            <th style={{ textAlign: 'left', padding: '0.75rem' }}>Email</th>
                            <th style={{ textAlign: 'center', padding: '0.75rem' }}>Semester</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sectionStudents.map(student => (
                            <tr key={student.id} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '0.75rem' }}><code>{student.student_id || student.id.substring(0,8)}</code></td>
                              <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>{student.first_name} {student.last_name}</td>
                              <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{student.email || 'N/A'}</td>
                              <td style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-main)' }}>Semester {student.semester || '1'}</td>
                            </tr>
                          ))}
                          {sectionStudents.length === 0 && (
                            <tr>
                              <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                No active students currently enrolled in this section.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Tab 3: Timetable */}
                {detailTab === 'timetable' && (
                  <div>
                    <h4 style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Weekly Class Schedule</h4>
                    <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                      <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ textAlign: 'left', padding: '0.75rem' }}>Day</th>
                            <th style={{ textAlign: 'left', padding: '0.75rem' }}>Period Time</th>
                            <th style={{ textAlign: 'left', padding: '0.75rem' }}>Subject</th>
                            <th style={{ textAlign: 'left', padding: '0.75rem' }}>Teacher</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sectionTimetable.map(item => (
                            <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '0.75rem', fontWeight: 600 }}>{item.day_of_week}</td>
                              <td style={{ padding: '0.75rem' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                  <Clock size={12} /> {item.start_time} - {item.end_time}
                                </span>
                              </td>
                              <td style={{ padding: '0.75rem', color: 'var(--text-main)', fontWeight: 500 }}>{item.subject_name}</td>
                              <td style={{ padding: '0.75rem', color: 'var(--text-main)' }}>{item.teacher_name}</td>
                            </tr>
                          ))}
                          {sectionTimetable.length === 0 && (
                            <tr>
                              <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                No timetable schedule entries assigned for this section.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Tab 4: Audit Timeline */}
                {detailTab === 'timeline' && (
                  <div>
                    <h4 style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Activity History Log</h4>
                    <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem' }}>
                      {sectionLogs.map((log: any) => (
                        <div key={log.id} style={{ borderLeft: '3px solid var(--primary)', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>{log.description}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>by {log.user_name} ({log.user_email})</span>
                            <span>•</span>
                            <span>{new Date(log.timestamp).toLocaleString()}</span>
                          </span>
                        </div>
                      ))}
                      {sectionLogs.length === 0 && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>
                          No audit activity logs recorded for this section.
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
