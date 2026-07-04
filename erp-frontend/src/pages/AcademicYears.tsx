import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import Layout from '../components/Layout';
import WorkspaceShell from '../components/WorkspaceShell';
import { api } from '../services/api';
import { 
  Calendar, 
  RefreshCw, 
  UserCheck, 
  Archive, 
  Plus, 
  Trash2, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  ChevronRight,
  Info,
  SlidersHorizontal,
  CheckCircle,
  TrendingUp,
  Sliders,
  DollarSign
} from 'lucide-react';

type TabType = 'list' | 'rollover' | 'promote' | 'close';

export default function AcademicYears() {
  const [activeTab, setActiveTab] = useState<TabType>('list');
  const [years, setYears] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Forms
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', start_date: '', end_date: '', is_current: 0, status: 'Draft' });

  // 1. Rollover Wizard State
  const [rolloverForm, setRolloverForm] = useState({
    source_year_id: '',
    target_year_id: '',
    checklist: ['sections', 'fees', 'allocations', 'timetable']
  });
  const [rolloverPreview, setRolloverPreview] = useState<any | null>(null);
  const [rolloverLogs, setRolloverLogs] = useState<string>('');
  const [rolloverLoading, setRolloverLoading] = useState(false);

  // 2. Promotion Wizard State
  const [promoForm, setPromoForm] = useState({
    source_year_id: '',
    target_year_id: '',
    source_course_id: '',
    source_section_id: '',
    target_course_id: '',
    target_section_id: '',
    target_semester: 1,
    generate_fees: true
  });
  const [sourceSections, setSourceSections] = useState<any[]>([]);
  const [targetSections, setTargetSections] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [promotionPreview, setPromotionPreview] = useState<any[]>([]);
  const [fetchingPromoData, setFetchingPromoData] = useState(false);
  const [executingPromotion, setExecutingPromotion] = useState(false);

  // 3. Closing Wizard State
  const [closingForm, setClosingForm] = useState({
    academic_year_id: ''
  });
  const [closingPreview, setClosingPreview] = useState<any[] | null>(null);
  const [checkingClose, setCheckingClose] = useState(false);
  const [executingClose, setExecutingClose] = useState(false);

  useEffect(() => {
    fetchYearsAndPrograms();
  }, []);

  const fetchYearsAndPrograms = async () => {
    setLoading(true);
    try {
      const [yearsData, programsData] = await Promise.all([
        api.get('/academic-years'),
        api.get('/programs')
      ]);
      setYears(yearsData || []);
      setPrograms(programsData || []);

      if (yearsData.length > 0) {
        const active = yearsData.find((y: any) => y.is_current) || yearsData[0];
        setRolloverForm(prev => ({
          ...prev,
          source_year_id: active.id,
          target_year_id: yearsData.find((y: any) => y.id !== active.id)?.id || ''
        }));
        setPromoForm(prev => ({
          ...prev,
          source_year_id: active.id,
          target_year_id: yearsData.find((y: any) => y.id !== active.id)?.id || ''
        }));
        setClosingForm({
          academic_year_id: active.id
        });
      }

      if (programsData.length > 0) {
        setPromoForm(prev => ({
          ...prev,
          source_course_id: programsData[0].id,
          target_course_id: programsData[0].id
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch sections based on source/target year & program
  useEffect(() => {
    if (promoForm.source_year_id && promoForm.source_course_id) {
      api.get(`/sections?academic_year_id=${promoForm.source_year_id}&course_id=${promoForm.source_course_id}`)
        .then(res => {
          setSourceSections(res || []);
          if (res && res.length > 0) {
            setPromoForm(prev => ({ ...prev, source_section_id: res[0].id }));
          } else {
            setSourceSections([]);
            setPromoForm(prev => ({ ...prev, source_section_id: '' }));
          }
        }).catch(err => console.error(err));
    }
  }, [promoForm.source_year_id, promoForm.source_course_id]);

  useEffect(() => {
    if (promoForm.target_year_id && promoForm.target_course_id) {
      api.get(`/sections?academic_year_id=${promoForm.target_year_id}&course_id=${promoForm.target_course_id}`)
        .then(res => {
          setTargetSections(res || []);
          if (res && res.length > 0) {
            setPromoForm(prev => ({ ...prev, target_section_id: res[0].id }));
          } else {
            setTargetSections([]);
            setPromoForm(prev => ({ ...prev, target_section_id: '' }));
          }
        }).catch(err => console.error(err));
    }
  }, [promoForm.target_year_id, promoForm.target_course_id]);

  // Handle Lifecycle actions
  const handleAddYear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/academic-years', addForm);
      setShowAddModal(false);
      setAddForm({ name: '', start_date: '', end_date: '', is_current: 0, status: 'Draft' });
      fetchYearsAndPrograms();
    } catch (err) {
      alert('Error creating academic year');
    }
  };

  const handleUpdateStatus = async (id: string, updates: Partial<any>) => {
    try {
      await api.put(`/academic-years/${id}`, updates);
      fetchYearsAndPrograms();
    } catch (err) {
      alert('Error updating academic year status');
    }
  };

  const handleDeleteYear = async (id: string) => {
    if (!confirm('Are you sure you want to delete this academic year? All configuration structures tied exclusively to this year will be archived.')) return;
    try {
      await api.delete(`/academic-years/${id}`);
      fetchYearsAndPrograms();
    } catch (err) {
      alert('Error deleting academic year');
    }
  };

  // --- Rollover Logic ---
  const handleRolloverChecklistChange = (key: string) => {
    setRolloverForm(prev => {
      const list = prev.checklist.includes(key)
        ? prev.checklist.filter(item => item !== key)
        : [...prev.checklist, key];
      return { ...prev, checklist: list };
    });
  };

  const runRolloverSimulation = async () => {
    if (rolloverForm.source_year_id === rolloverForm.target_year_id) {
      alert('Source and target academic years must be different.');
      return;
    }
    setRolloverLoading(true);
    setRolloverLogs('');
    try {
      const res = await api.post('/academic-years/rollover', {
        ...rolloverForm,
        preview: true
      });
      setRolloverPreview(res.summary);
      setRolloverLogs(res.logs);
    } catch (e: any) {
      alert(`Simulation failed: ${e.message}`);
    } finally {
      setRolloverLoading(false);
    }
  };

  const executeRollover = async () => {
    if (!confirm('Are you sure you want to execute this rollover? Configured structures will be duplicated in the target academic year.')) return;
    setRolloverLoading(true);
    try {
      const res = await api.post('/academic-years/rollover', {
        ...rolloverForm,
        preview: false
      });
      setRolloverLogs(res.logs);
      alert('Rollover completed successfully!');
      fetchYearsAndPrograms();
    } catch (e: any) {
      alert(`Rollover failed: ${e.message}`);
    } finally {
      setRolloverLoading(false);
    }
  };

  // --- Promotion Wizard Logic ---
  const fetchPromotionRoster = async () => {
    if (!promoForm.source_section_id) {
      alert('Please select a source section.');
      return;
    }
    setFetchingPromoData(true);
    setStudents([]);
    setPromotionPreview([]);
    setSelectedStudents([]);
    try {
      // 1. Fetch Students in Section
      const studentsData = await api.get(`/students?section_id=${promoForm.source_section_id}`);
      setStudents(studentsData || []);

      if (studentsData && studentsData.length > 0) {
        const studentIds = studentsData.map((s: any) => s.id);
        // 2. Fetch eligibility preview from endpoint
        const res = await api.post('/academic-years/promote', {
          source_year_id: promoForm.source_year_id,
          target_year_id: promoForm.target_year_id,
          source_course_id: promoForm.source_course_id,
          source_section_id: promoForm.source_section_id,
          target_course_id: promoForm.target_course_id,
          target_section_id: promoForm.target_section_id,
          target_semester: Number(promoForm.target_semester),
          student_ids: studentIds,
          generate_fees: promoForm.generate_fees,
          preview: true
        });
        setPromotionPreview(res.results || []);
        // Auto-select eligible or warnings by default
        const preSelected = res.results
          ?.filter((r: any) => r.status !== 'Not Eligible')
          ?.map((r: any) => r.student_id) || [];
        setSelectedStudents(preSelected);
      }
    } catch (e: any) {
      alert(`Failed to fetch student roster: ${e.message}`);
    } finally {
      setFetchingPromoData(false);
    }
  };

  const handleSelectStudentToggle = (sid: string) => {
    setSelectedStudents(prev =>
      prev.includes(sid) ? prev.filter(id => id !== sid) : [...prev, sid]
    );
  };

  const executePromotion = async () => {
    if (selectedStudents.length === 0) {
      alert('Please select at least one student to promote.');
      return;
    }
    if (!promoForm.target_section_id) {
      alert('Please select a destination section.');
      return;
    }
    if (!confirm(`Are you sure you want to promote ${selectedStudents.length} students to the target section?`)) return;
    setExecutingPromotion(true);
    try {
      const res = await api.post('/academic-years/promote', {
        source_year_id: promoForm.source_year_id,
        target_year_id: promoForm.target_year_id,
        source_course_id: promoForm.source_course_id,
        source_section_id: promoForm.source_section_id,
        target_course_id: promoForm.target_course_id,
        target_section_id: promoForm.target_section_id,
        target_semester: Number(promoForm.target_semester),
        student_ids: selectedStudents,
        generate_fees: promoForm.generate_fees,
        preview: false
      });
      alert(`Successfully promoted ${res.promoted_count} students!`);
      fetchPromotionRoster();
    } catch (e: any) {
      alert(`Promotion execution failed: ${e.message}`);
    } finally {
      setExecutingPromotion(false);
    }
  };

  // --- Closing Wizard Logic ---
  const runClosingAudits = async () => {
    setCheckingClose(true);
    setClosingPreview(null);
    try {
      const res = await api.post('/academic-years/close', {
        academic_year_id: closingForm.academic_year_id,
        preview: true
      });
      setClosingPreview(res.checks || []);
    } catch (e: any) {
      alert(`Audits failed: ${e.message}`);
    } finally {
      setCheckingClose(false);
    }
  };

  const executeClose = async () => {
    if (!confirm('Are you sure you want to lock and close this academic year? This is non-reversible and freezes historical records.')) return;
    setExecutingClose(true);
    try {
      await api.post('/academic-years/close', {
        academic_year_id: closingForm.academic_year_id,
        preview: false
      });
      alert('Academic year closed and archived successfully!');
      fetchYearsAndPrograms();
      setClosingPreview(null);
    } catch (e: any) {
      alert(`Closing failed: ${e.message}`);
    } finally {
      setExecutingClose(false);
    }
  };

  // --- KPI Prep ---
  const currentYearObj = years.find(y => y.is_current);
  const kpis = [
    { label: 'Total Academic Years', value: years.length, icon: <Calendar size={20} />, color: 'primary' as const },
    { label: 'Active / Current Year', value: currentYearObj?.name || 'None', icon: <CheckCircle2 size={20} />, color: 'success' as const, description: currentYearObj ? `${currentYearObj.start_date} to ${currentYearObj.end_date}` : '' },
    { label: 'Draft Years', value: years.filter(y => y.status === 'Draft').length, icon: <Clock size={20} />, color: 'info' as const },
    { label: 'Archived Years', value: years.filter(y => y.status === 'Archived').length, icon: <Archive size={20} />, color: 'info' as const }
  ];

  const tabs = [
    { id: 'list', label: 'List & Lifecycle', icon: <Calendar size={16} /> },
    { id: 'rollover', label: 'Rollover Wizard', icon: <RefreshCw size={16} /> },
    { id: 'promote', label: 'Promotion Wizard', icon: <UserCheck size={16} /> },
    { id: 'close', label: 'Year Closing Wizard', icon: <Archive size={16} /> }
  ];

  return (
    <Layout>
      <PageGuidance
        title="School Years"
        description="Use this page to set up and manage the calendar years for school operations."
        steps={["Create a new school year (e.g. 2026-27) with its start and end dates.","Mark the current school year so the system displays the correct student records.","Switch between years to view historic school records."]}
      />
      <WorkspaceShell
        title="Academic Years Workspace"
        breadcrumbs={[{ label: 'Institution Admin', to: '/settings' }, { label: 'Academic Years' }]}
        statusBadge={{ label: currentYearObj?.status || 'Archived', type: currentYearObj?.status === 'Active' ? 'success' : 'secondary' }}
        actions={
          <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Add Academic Year
          </button>
        }
        kpis={kpis}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as TabType)}
      >
        {activeTab === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontWeight: 700 }}>Registered Academic Years</h3>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Lifecycle management of terms</span>
              </div>
              <div style={{ padding: '1rem' }}>
                <div className="table-responsive">
                  <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Lifecycle Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {years.map(year => (
                      <tr key={year.id} style={{ verticalAlign: 'middle' }}>
                        <td style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
                          {year.name} {year.is_current === 1 && <span className="badge badge-success" style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}>Current</span>}
                        </td>
                        <td>{year.start_date}</td>
                        <td>{year.end_date}</td>
                        <td>
                          <span className={`badge ${
                            year.status === 'Active' ? 'badge-success' :
                            year.status === 'Draft' ? 'badge-info' :
                            year.status === 'Locked' ? 'badge-warning' : 'badge-secondary'
                          }`}>
                            {year.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                            {year.status !== 'Active' && year.status !== 'Archived' && (
                              <button className="btn btn-sm btn-outline" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }} onClick={() => handleUpdateStatus(year.id, { is_current: 1, status: 'Active' })}>
                                Make Current
                              </button>
                            )}
                            {year.status === 'Active' && (
                              <button className="btn btn-sm btn-warning" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', padding: '0.25rem 0.5rem' }} onClick={() => handleUpdateStatus(year.id, { status: 'Locked' })}>
                                <Lock size={12} /> Lock Year
                              </button>
                            )}
                            {year.status === 'Locked' && (
                              <button className="btn btn-sm btn-success" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', padding: '0.25rem 0.5rem' }} onClick={() => handleUpdateStatus(year.id, { status: 'Active' })}>
                                <Unlock size={12} /> Unlock
                              </button>
                            )}
                            {year.status !== 'Archived' && year.status !== 'Draft' && (
                              <button className="btn btn-sm btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', padding: '0.25rem 0.5rem' }} onClick={() => handleUpdateStatus(year.id, { status: 'Archived', is_current: 0 })}>
                                <Archive size={12} /> Archive
                              </button>
                            )}
                            {!year.is_current && (
                              <button className="btn btn-sm btn-danger" style={{ padding: '0.25rem 0.4rem' }} onClick={() => handleDeleteYear(year.id)} title="Delete">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rollover' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Configuration Rollover Wizard</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Safely carry forward setup data (Sections, Subjects, Allocations) to a new year. Operational transaction records (Attendance, Grades, Payments) are <strong>never</strong> copied.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Source Academic Year (From)</label>
                <select value={rolloverForm.source_year_id} onChange={e => setRolloverForm({...rolloverForm, source_year_id: e.target.value})} style={{ width: '100%', padding: '0.5rem' }}>
                  {years.map(y => (
                    <option key={y.id} value={y.id}>{y.name} ({y.status})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Target Academic Year (To)</label>
                <select value={rolloverForm.target_year_id} onChange={e => setRolloverForm({...rolloverForm, target_year_id: e.target.value})} style={{ width: '100%', padding: '0.5rem' }}>
                  <option value="">-- Select Year --</option>
                  {years.map(y => (
                    <option key={y.id} value={y.id}>{y.name} ({y.status})</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
              <h4 style={{ fontWeight: 600, fontSize: '0.95rem', margin: '0 0 0.75rem 0' }}>Select Configuration Scope to Copy</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={rolloverForm.checklist.includes('sections')} onChange={() => handleRolloverChecklistChange('sections')} />
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Sections & Year Levels</span>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Classrooms and division mapping structures</p>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={rolloverForm.checklist.includes('fees')} onChange={() => handleRolloverChecklistChange('fees')} />
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Fee Structures</span>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Default rates per program and year number</p>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={rolloverForm.checklist.includes('allocations')} onChange={() => handleRolloverChecklistChange('allocations')} />
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Teaching Allocations Template</span>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Teacher-subject maps (mapped to target sections)</p>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={rolloverForm.checklist.includes('timetable')} onChange={() => handleRolloverChecklistChange('timetable')} />
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Timetable Templates</span>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Duplicate slot structures and template sessions</p>
                  </div>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={runRolloverSimulation} disabled={rolloverLoading || !rolloverForm.target_year_id}>
                {rolloverLoading ? 'Simulating...' : 'Run Rollover Simulation'}
              </button>
              {rolloverPreview && (
                <button className="btn btn-primary" onClick={executeRollover} disabled={rolloverLoading}>
                  Execute Rollover
                </button>
              )}
            </div>

            {rolloverPreview && (
              <div style={{ marginTop: '1.5rem' }}>
                <h4 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Simulation Summary Results</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ border: '1px solid #e2e8f0', padding: '0.75rem', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sections to Recreate</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{rolloverPreview.sections_count}</div>
                  </div>
                  <div style={{ border: '1px solid #e2e8f0', padding: '0.75rem', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Allocations to Remap</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{rolloverPreview.allocations_count}</div>
                  </div>
                  <div style={{ border: '1px solid #e2e8f0', padding: '0.75rem', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Timetable Slots Map</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{rolloverPreview.timetable_count}</div>
                  </div>
                  <div style={{ border: '1px solid #e2e8f0', padding: '0.75rem', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Fee Rules</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{rolloverPreview.fees_count}</div>
                  </div>
                </div>

                {rolloverPreview.warnings.length > 0 && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '1rem', borderRadius: '6px', color: '#b45309', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                      <AlertTriangle size={18} /> Simulation Warnings
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem' }}>
                      {rolloverPreview.warnings.map((w: string, idx: number) => (
                        <li key={idx} style={{ marginBottom: '0.25rem' }}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {rolloverLogs && (
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>Rollover Process Logs</h4>
                <pre style={{ background: '#1e293b', color: '#38bdf8', padding: '1rem', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.85rem', maxHeight: '200px', overflowY: 'auto' }}>
                  {rolloverLogs}
                </pre>
              </div>
            )}
          </div>
        )}

        {activeTab === 'promote' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Student Promotion Wizard</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Promote students between classes/semesters. Evaluates attendance threshold compliance, pending outstanding balances, and generates next-term records.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Source Year</label>
                <select value={promoForm.source_year_id} onChange={e => setPromoForm({...promoForm, source_year_id: e.target.value})} style={{ width: '100%', padding: '0.4rem' }}>
                  {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Target Year</label>
                <select value={promoForm.target_year_id} onChange={e => setPromoForm({...promoForm, target_year_id: e.target.value})} style={{ width: '100%', padding: '0.4rem' }}>
                  {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Program / Class</label>
                <select value={promoForm.source_course_id} onChange={e => setPromoForm({...promoForm, source_course_id: e.target.value, target_course_id: e.target.value})} style={{ width: '100%', padding: '0.4rem' }}>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Source Section</label>
                <select value={promoForm.source_section_id} onChange={e => setPromoForm({...promoForm, source_section_id: e.target.value})} style={{ width: '100%', padding: '0.4rem' }} disabled={sourceSections.length === 0}>
                  {sourceSections.length === 0 && <option value="">-- No Sections --</option>}
                  {sourceSections.map(s => <option key={s.id} value={s.id}>{s.name} (Year {s.year_number})</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Destination Program</label>
                <select value={promoForm.target_course_id} onChange={e => setPromoForm({...promoForm, target_course_id: e.target.value})} style={{ width: '100%', padding: '0.4rem' }}>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Destination Section</label>
                <select value={promoForm.target_section_id} onChange={e => setPromoForm({...promoForm, target_section_id: e.target.value})} style={{ width: '100%', padding: '0.4rem' }} disabled={targetSections.length === 0}>
                  {targetSections.length === 0 && <option value="">-- No Sections --</option>}
                  {targetSections.map(s => <option key={s.id} value={s.id}>{s.name} (Year {s.year_number})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Destination Semester</label>
                <input type="number" min={1} max={8} value={promoForm.target_semester} onChange={e => setPromoForm({...promoForm, target_semester: Number(e.target.value)})} style={{ width: '100%', padding: '0.4rem' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={fetchPromotionRoster} disabled={fetchingPromoData || !promoForm.source_section_id}>
                {fetchingPromoData ? 'Evaluating Eligibility...' : 'Load & Audit Student Roster'}
              </button>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', userSelect: 'none' }}>
                <input type="checkbox" checked={promoForm.generate_fees} onChange={e => setPromoForm({...promoForm, generate_fees: e.target.checked})} />
                Generate next-term balances and fee bills
              </label>
            </div>

            {students.length > 0 && (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflowX: 'auto' }}>
                <table className="table" style={{ margin: 0 }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ width: '40px', textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedStudents.length === students.length && students.length > 0} 
                          onChange={(e) => {
                            if (e.target.checked) {
                              const eligible = promotionPreview.filter(p => p.status !== 'Not Eligible').map(p => p.student_id);
                              setSelectedStudents(eligible);
                            } else {
                              setSelectedStudents([]);
                            }
                          }}
                        />
                      </th>
                      <th>Student Name</th>
                      <th>Status Details</th>
                      <th>Eligibility Badge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(s => {
                      const prevInfo = promotionPreview.find(p => p.student_id === s.id);
                      const isSelected = selectedStudents.includes(s.id);
                      const status = prevInfo?.status || 'Eligible';
                      
                      return (
                        <tr key={s.id} style={{ verticalAlign: 'middle' }}>
                          <td style={{ textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={isSelected} 
                              disabled={status === 'Not Eligible'}
                              onChange={() => handleSelectStudentToggle(s.id)}
                            />
                          </td>
                          <td style={{ fontWeight: 600 }}>{s.first_name} {s.last_name}</td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {prevInfo?.details || 'All clear'}
                          </td>
                          <td>
                            <span className={`badge ${
                              status === 'Eligible' ? 'badge-success' :
                              status === 'Warning' ? 'badge-warning' : 'badge-danger'
                            }`}>
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div style={{ padding: '1rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Selected: <strong>{selectedStudents.length}</strong> of <strong>{students.length}</strong> students
                  </span>
                  <button className="btn btn-primary" onClick={executePromotion} disabled={selectedStudents.length === 0 || executingPromotion}>
                    {executingPromotion ? 'Executing Promotion...' : 'Execute Promotion Wizard'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'close' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Academic Year Closing Wizard</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Finalize and close an academic term. Performs structural audits to check for open gradebooks, pending approvals, or unsettled fee balances before archiving data.
            </p>

            <div style={{ maxWidth: '400px', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Select Academic Year to Archive & Lock</label>
                <select value={closingForm.academic_year_id} onChange={e => setClosingForm({ academic_year_id: e.target.value })} style={{ width: '100%', padding: '0.5rem' }}>
                  {years.filter(y => y.status === 'Active' || y.status === 'Locked').map(y => (
                    <option key={y.id} value={y.id}>{y.name} ({y.status})</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={runClosingAudits} disabled={checkingClose || !closingForm.academic_year_id}>
                {checkingClose ? 'Auditing Term Data...' : 'Run Pre-Closing Audits'}
              </button>
            </div>

            {closingPreview && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1.25rem', borderRadius: '8px' }}>
                <h4 style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <SlidersHorizontal size={18} /> Audit Verification Report
                </h4>

                {closingPreview.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534', background: '#dcfce7', padding: '1rem', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 600 }}>
                    <CheckCircle2 size={20} /> All audits passed. This academic year satisfies all closing conditions.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    {closingPreview.map((c, idx) => (
                      <div key={idx} style={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        gap: '0.75rem', 
                        padding: '0.85rem', 
                        borderRadius: '6px', 
                        background: c.type === 'error' ? '#fef2f2' : '#fffbeb',
                        border: `1px solid ${c.type === 'error' ? '#fee2e2' : '#fef3c7'}`,
                        color: c.type === 'error' ? '#991b1b' : '#92400e'
                      }}>
                        {c.type === 'error' ? <XCircle size={18} style={{ marginTop: '0.1rem' }} /> : <AlertTriangle size={18} style={{ marginTop: '0.1rem' }} />}
                        <div>
                          <strong style={{ display: 'block', fontSize: '0.9rem' }}>{c.type === 'error' ? 'Blocker Error' : 'Operational Warning'}</strong>
                          <span style={{ fontSize: '0.85rem' }}>{c.message}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                  <button className="btn btn-secondary" onClick={() => setClosingPreview(null)}>Cancel</button>
                  <button 
                    className="btn btn-danger" 
                    onClick={executeClose} 
                    disabled={executingClose || closingPreview.some(c => c.type === 'error')}
                  >
                    {executingClose ? 'Executing Close...' : 'Close & Archive Academic Year'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Form for adding Academic Year */}
        {showAddModal && (
          <div className="modal">
            <div className="modal-content" style={{ maxWidth: '450px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontWeight: 700 }}>Add Academic Year</h3>
                <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}>×</button>
              </div>
              <form onSubmit={handleAddYear}>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label style={{ fontWeight: 600 }}>Name (e.g., 2026-27)</label>
                  <input type="text" value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} required style={{ width: '100%', padding: '0.5rem' }} />
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label style={{ fontWeight: 600 }}>Start Date</label>
                  <input type="date" value={addForm.start_date} onChange={e => setAddForm({...addForm, start_date: e.target.value})} required style={{ width: '100%', padding: '0.5rem' }} />
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label style={{ fontWeight: 600 }}>End Date</label>
                  <input type="date" value={addForm.end_date} onChange={e => setAddForm({...addForm, end_date: e.target.value})} required style={{ width: '100%', padding: '0.5rem' }} />
                </div>
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!addForm.is_current} onChange={e => setAddForm({...addForm, is_current: e.target.checked ? 1 : 0})} />
                    Set as current academic year
                  </label>
                </div>
                <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Academic Year</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </WorkspaceShell>
    </Layout>
  );
}
