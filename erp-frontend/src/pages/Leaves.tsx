import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { PageGuidance } from '../components/PageGuidance';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, Trash2, Calendar, BookOpen, Edit, RefreshCw, X,
  ClipboardCheck, Check, AlertTriangle, CalendarDays, FileText
} from 'lucide-react';

// --- INTERFACES ---
interface LeaveType {
  id: string;
  name: string;
  code: string;
  days_per_year: number;
}

interface AcademicYear {
  id: string;
  name: string;
}

interface LeaveBalance {
  leave_type_id: string;
  leave_type_name: string;
  leave_type_code: string;
  total_days: number;
  used_days: number;
}

interface TeacherLeaveApplication {
  id: string;
  leave_type_name: string;
  leave_type_code: string;
  from_date: string;
  to_date: string;
  days_count: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at: string;
  remarks: string | null;
}

interface ApprovalApplication {
  id: string;
  employee_id: string;
  teacher_first_name: string;
  teacher_last_name: string;
  leave_type_name: string;
  leave_type_code: string;
  from_date: string;
  to_date: string;
  days_count: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at: string;
  remarks: string | null;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, React.CSSProperties> = {
    Pending: { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' },
    Approved: { background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' },
    Rejected: { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' },
  };
  const s = styles[status] || {};
  return (
    <span style={{ ...s, padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 600 }}>
      {status}
    </span>
  );
}

export default function Leaves() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryTab = searchParams.get('tab');
  
  // Roles verification
  const roles = user?.roles || (user?.role ? [user.role] : []);
  const isLeaveManager = roles.some((r: string) => ['super_admin', 'Admin', 'admin', 'Principal', 'HOD', 'hod'].includes(r));

  const [activeTab, setActiveTab] = useState<'my' | 'approvals' | 'quotas'>(
    isLeaveManager && (queryTab === 'approvals' || queryTab === 'quotas') ? queryTab : 'my'
  );

  const handleTabChange = (tab: 'my' | 'approvals' | 'quotas') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // --- COMMON METADATA ---
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);

  // --- TAB 1: MY LEAVE STATES ---
  const [mySelectedYear, setMySelectedYear] = useState('');
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [myApplications, setMyApplications] = useState<TeacherLeaveApplication[]>([]);
  const [myLoading, setMyLoading] = useState(true);

  // Apply leave form state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyLeaveTypeId, setApplyLeaveTypeId] = useState('');
  const [applyFromDate, setApplyFromDate] = useState('');
  const [applyToDate, setApplyToDate] = useState('');
  const [applyReason, setApplyReason] = useState('');
  const [applying, setApplying] = useState(false);

  const daysCount = applyFromDate && applyToDate
    ? Math.max(1, Math.ceil((new Date(applyToDate).getTime() - new Date(applyFromDate).getTime()) / 86400000) + 1)
    : 0;

  // --- TAB 2: LEAVE APPROVALS STATES ---
  const [appSelectedYear, setAppSelectedYear] = useState('');
  const [appActiveFilter, setAppActiveFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('Pending');
  const [appApplications, setAppApplications] = useState<ApprovalApplication[]>([]);
  const [appLoading, setAppLoading] = useState(true);

  // Approving / Rejecting modals state
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approveRemarks, setApproveRemarks] = useState('');
  const [approving, setApproving] = useState(false);

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // --- TAB 3: LEAVE QUOTAS STATES ---
  const [quotasLoading, setQuotasLoading] = useState(true);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [typeFormName, setTypeFormName] = useState('');
  const [typeFormCode, setTypeFormCode] = useState('');
  const [typeFormDays, setTypeFormDays] = useState<number>(10);
  const [typeSaving, setTypeSaving] = useState(false);

  const [showSeedModal, setShowSeedModal] = useState(false);
  const [seedYearId, setSeedYearId] = useState('');
  const [seeding, setSeeding] = useState(false);

  // --- LIFECYCLE INITIALIZATION ---
  useEffect(() => {
    fetchInitData();
  }, []);

  const fetchInitData = async () => {
    try {
      const [years, types] = await Promise.all([
        api.get('/academic-years'),
        api.get('/leave/types')
      ]);
      setAcademicYears(years || []);
      setLeaveTypes(types || []);
      if (years && years.length > 0) {
        setMySelectedYear(years[0].id);
        setAppSelectedYear(years[0].id);
        setSeedYearId(years[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Sync tab loading
  useEffect(() => {
    if (activeTab === 'my' && mySelectedYear) {
      fetchMyBalancesAndApps();
    } else if (activeTab === 'approvals') {
      fetchApprovalsList();
    } else if (activeTab === 'quotas') {
      fetchQuotasList();
    }
  }, [activeTab, mySelectedYear, appActiveFilter, appSelectedYear]);

  // --- MY LEAVES FUNCTIONS ---
  const fetchMyBalancesAndApps = async () => {
    try {
      setMyLoading(true);
      const [bal, apps] = await Promise.all([
        api.get(`/leave/balances/my?academic_year_id=${mySelectedYear}`),
        api.get('/leave/applications/my'),
      ]);
      setBalances(bal || []);
      setMyApplications(apps || []);
    } catch (err) {
      console.error(err);
    } finally {
      setMyLoading(false);
    }
  };

  const handleApply = async () => {
    if (!applyLeaveTypeId || !applyFromDate || !applyToDate || !applyReason.trim()) {
      alert('All fields are required.');
      return;
    }
    if (new Date(applyToDate) < new Date(applyFromDate)) {
      alert('To date cannot be before from date.');
      return;
    }
    try {
      setApplying(true);
      await api.post('/leave/applications', {
        leave_type_id: applyLeaveTypeId,
        academic_year_id: mySelectedYear,
        from_date: applyFromDate,
        to_date: applyToDate,
        days_count: daysCount,
        reason: applyReason.trim(),
      });
      setShowApplyModal(false);
      setApplyLeaveTypeId('');
      setApplyFromDate('');
      setApplyToDate('');
      setApplyReason('');
      fetchMyBalancesAndApps();
    } catch (err: any) {
      alert(err.message || 'Failed to submit application');
    } finally {
      setApplying(false);
    }
  };

  // --- LEAVE APPROVALS FUNCTIONS ---
  const fetchApprovalsList = async () => {
    try {
      setAppLoading(true);
      const params = new URLSearchParams();
      if (appActiveFilter !== 'All') params.set('status', appActiveFilter);
      // Backend does not strictly enforce academic year filter yet, but parameter is sent
      if (appSelectedYear) params.set('academic_year_id', appSelectedYear);
      
      const data = await api.get(`/leave/applications?${params.toString()}`);
      setAppApplications(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setAppLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approvingId) return;
    try {
      setApproving(true);
      await api.patch(`/leave/applications/${approvingId}/approve`, { remarks: approveRemarks || undefined });
      setApprovingId(null);
      setApproveRemarks('');
      fetchApprovalsList();
    } catch (err: any) {
      alert(err.message || 'Failed to approve application');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingId || !rejectRemarks.trim()) {
      alert('Remarks are required when rejecting a leave application.');
      return;
    }
    try {
      setRejecting(true);
      await api.patch(`/leave/applications/${rejectingId}/reject`, { remarks: rejectRemarks.trim() });
      setRejectingId(null);
      setRejectRemarks('');
      fetchApprovalsList();
    } catch (err: any) {
      alert(err.message || 'Failed to reject application');
    } finally {
      setRejecting(false);
    }
  };

  // --- LEAVE QUOTAS FUNCTIONS ---
  const fetchQuotasList = async () => {
    try {
      setQuotasLoading(true);
      const data = await api.get('/leave/types');
      setLeaveTypes(data || []);
    } catch (err) {
      console.error('Error fetching quotas list:', err);
    } finally {
      setQuotasLoading(false);
    }
  };

  const openAddTypeModal = () => {
    setEditingType(null);
    setTypeFormName('');
    setTypeFormCode('');
    setTypeFormDays(10);
    setShowTypeModal(true);
  };

  const openEditTypeModal = (lt: LeaveType) => {
    setEditingType(lt);
    setTypeFormName(lt.name);
    setTypeFormCode(lt.code);
    setTypeFormDays(lt.days_per_year);
    setShowTypeModal(true);
  };

  const handleSaveType = async () => {
    if (!typeFormName.trim() || !typeFormCode.trim() || !typeFormDays) {
      alert('All fields are required.');
      return;
    }
    try {
      setTypeSaving(true);
      if (editingType) {
        await api.put(`/leave/types/${editingType.id}`, { name: typeFormName.trim(), days_per_year: typeFormDays });
      } else {
        await api.post('/leave/types', { name: typeFormName.trim(), code: typeFormCode.trim().toUpperCase(), days_per_year: typeFormDays });
      }
      setShowTypeModal(false);
      fetchQuotasList();
    } catch (err: any) {
      alert(err.message || 'Failed to save leave type');
    } finally {
      setTypeSaving(false);
    }
  };

  const handleDeleteType = async (lt: LeaveType) => {
    if (!window.confirm(`Delete leave type "${lt.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/leave/types/${lt.id}`);
      fetchQuotasList();
    } catch (err: any) {
      alert(err.message || 'Failed to delete leave type');
    }
  };

  const handleSeedBalances = async () => {
    if (!seedYearId) {
      alert('Please select an academic year.');
      return;
    }
    try {
      setSeeding(true);
      await api.post('/leave/balances/seed', { academic_year_id: seedYearId });
      alert('Leave balances seeded successfully for all teachers!');
      setShowSeedModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to seed balances');
    } finally {
      setSeeding(false);
    }
  };

  // --- RENDERING TABS ---
  const renderMyLeaves = () => {
    return (
      <>
        {/* Balance cards */}
        {balances.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {balances.map((b) => {
              const pct = b.total_days > 0 ? Math.min(100, (b.used_days / b.total_days) * 100) : 0;
              const remaining = b.total_days - b.used_days;
              return (
                <div key={b.leave_type_id} className="card" style={{ padding: '1rem', margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{b.leave_type_name}</span>
                    <span className="badge badge-secondary">{b.leave_type_code}</span>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    {remaining} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>remaining</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    {b.used_days} used of {b.total_days} days
                  </div>
                  <div style={{ background: 'var(--border)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: pct > 80 ? 'var(--danger)' : pct > 50 ? 'var(--warning)' : 'var(--primary)', borderRadius: '4px', transition: 'width 0.3s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="card">
          <div style={{ padding: '0.5rem 0.5rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} />
            <h4 style={{ margin: 0 }}>Application History</h4>
          </div>

          {myLoading ? (
            <p style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading records...</p>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Admin Remarks</th>
                    <th>Applied On</th>
                  </tr>
                </thead>
                <tbody>
                  {myApplications.map((app) => (
                    <tr key={app.id}>
                      <td>
                        <strong>{app.leave_type_code}</strong>
                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{app.leave_type_name}</span>
                      </td>
                      <td>{app.from_date}</td>
                      <td>{app.to_date}</td>
                      <td>{app.days_count}</td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={app.reason}>
                        {app.reason}
                      </td>
                      <td><StatusBadge status={app.status} /></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{app.remarks || '—'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(app.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {myApplications.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        <CalendarDays size={32} style={{ display: 'block', margin: '0 auto 0.5rem' }} />
                        No leave applications found. Click "Apply for Leave" to submit one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    );
  };

  const renderApprovals = () => {
    return (
      <>
        {/* Filter buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {(['Pending', 'Approved', 'Rejected', 'All'] as const).map((filter) => (
            <button
              key={filter}
              className={`btn btn-sm ${appActiveFilter === filter ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setAppActiveFilter(filter)}
            >
              {filter} Request{filter !== 'Pending' && filter !== 'Approved' && filter !== 'Rejected' ? 's' : ''}
            </button>
          ))}
        </div>

        <div className="card">
          {appLoading ? (
            <p style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading applications...</p>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Emp ID</th>
                    <th>Teacher</th>
                    <th>Leave Type</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appApplications.map((app) => (
                    <tr key={app.id}>
                      <td><strong>{app.employee_id || '—'}</strong></td>
                      <td>{app.teacher_first_name} {app.teacher_last_name}</td>
                      <td>
                        <strong>{app.leave_type_code}</strong>
                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{app.leave_type_name}</span>
                      </td>
                      <td>{app.from_date}</td>
                      <td>{app.to_date}</td>
                      <td>{app.days_count}</td>
                      <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={app.reason}>
                        {app.reason}
                      </td>
                      <td><StatusBadge status={app.status} /></td>
                      <td style={{ textAlign: 'right' }}>
                        {app.status === 'Pending' ? (
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => { setApprovingId(app.id); setApproveRemarks(''); }}
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => { setRejectingId(app.id); setRejectRemarks(''); }}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{app.remarks || '—'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {appApplications.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        <ClipboardCheck size={32} style={{ display: 'block', margin: '0 auto 0.5rem' }} />
                        No {appActiveFilter === 'All' ? '' : appActiveFilter.toLowerCase() + ' '} leave requests found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    );
  };

  const renderQuotas = () => {
    return (
      <div className="card">
        {quotasLoading ? (
          <p style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading leave structures...</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Days / Year</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaveTypes.map((lt) => (
                  <tr key={lt.id}>
                    <td><span className="badge badge-secondary">{lt.code}</span></td>
                    <td><strong>{lt.name}</strong></td>
                    <td>{lt.days_per_year}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        <button className="btn btn-sm btn-outline" onClick={() => openEditTypeModal(lt)}>
                          Edit
                        </button>
                        <button className="btn btn-sm btn-outline btn-danger" onClick={() => handleDeleteType(lt)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {leaveTypes.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      <BookOpen size={32} style={{ display: 'block', margin: '0 auto 0.5rem' }} />
                      No leave types configured yet. Click "Add Leave Type" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout>
      <PageGuidance
        title="Leave & Attendance Quotas"
        description="Unified portal for checking leave balance, applying for leave requests, approving staff absences, and managing institutional leave configurations."
        steps={[
          "Apply for Leave by selecting type, date ranges, and providing justification remarks.",
          "As HOD/Admin, view teacher applications in Leave Approvals to Accept or Reject with comments.",
          "Go to Leave Quotas to adjust days limits or seed fresh annual balances."
        ]}
      />

      <div className="page-header" style={{ marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <h2>Staff Leave Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Submit leaves, approve teacher absences, and configure institutional leave categories
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {activeTab === 'my' && (
            <>
              <select 
                value={mySelectedYear} 
                onChange={(e) => setMySelectedYear(e.target.value)}
                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.875rem' }}
              >
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>{ay.name}</option>
                ))}
              </select>
              <button className="btn btn-primary" onClick={() => setShowApplyModal(true)}>
                <Plus size={16} /> Apply for Leave
              </button>
            </>
          )}

          {activeTab === 'approvals' && (
            <select 
              value={appSelectedYear} 
              onChange={(e) => setAppSelectedYear(e.target.value)}
              style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.875rem' }}
            >
              <option value="">All Years</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>{ay.name}</option>
              ))}
            </select>
          )}

          {activeTab === 'quotas' && isLeaveManager && (
            <>
              <button className="btn btn-outline" onClick={() => setShowSeedModal(true)}>
                <RefreshCw size={16} /> Seed Balances
              </button>
              <button className="btn btn-primary" onClick={openAddTypeModal}>
                <Plus size={16} /> Add Leave Type
              </button>
            </>
          )}
        </div>
      </div>

      {/* PILL TABS switcher */}
      {isLeaveManager && (
        <div className="page-tabs">
          <button 
            className={`page-tab ${activeTab === 'my' ? 'active' : ''}`}
            onClick={() => handleTabChange('my')}
          >
            My Leaves
          </button>
          <button 
            className={`page-tab ${activeTab === 'approvals' ? 'active' : ''}`}
            onClick={() => handleTabChange('approvals')}
          >
            Leave Approvals
          </button>
          <button 
            className={`page-tab ${activeTab === 'quotas' ? 'active' : ''}`}
            onClick={() => handleTabChange('quotas')}
          >
            Leave Quotas
          </button>
        </div>
      )}

      {/* ACTIVE TAB CONTENT */}
      {activeTab === 'my' && renderMyLeaves()}
      {activeTab === 'approvals' && renderApprovals()}
      {activeTab === 'quotas' && renderQuotas()}

      {/* --- APPLY FOR LEAVE MODAL --- */}
      {showApplyModal && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <h3>Apply for Leave</h3>
            <div className="form-group">
              <label>Leave Type *</label>
              <select value={applyLeaveTypeId} onChange={(e) => setApplyLeaveTypeId(e.target.value)}>
                <option value="">— Select Leave Type —</option>
                {leaveTypes.map((lt) => (
                  <option key={lt.id} value={lt.id}>{lt.name} ({lt.code})</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>From Date *</label>
                <input type="date" value={applyFromDate} onChange={(e) => setApplyFromDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label>To Date *</label>
                <input type="date" value={applyToDate} onChange={(e) => setApplyToDate(e.target.value)} />
              </div>
            </div>
            {daysCount > 0 && (
              <div style={{ background: '#f8fafc', borderRadius: '6px', padding: '0.6rem 1rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                Duration: <strong>{daysCount} day{daysCount !== 1 ? 's' : ''}</strong>
              </div>
            )}
            <div className="form-group">
              <label>Reason *</label>
              <textarea
                rows={3}
                value={applyReason}
                onChange={(e) => setApplyReason(e.target.value)}
                placeholder="Describe reason for leave request..."
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowApplyModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleApply} disabled={applying}>
                {applying ? 'Submitting…' : 'Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- APPROVE MODAL --- */}
      {approvingId && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <h3>Approve Leave Request</h3>
            <div className="form-group">
              <label>Approve remarks (optional)</label>
              <textarea
                rows={3}
                value={approveRemarks}
                onChange={(e) => setApproveRemarks(e.target.value)}
                placeholder="Add optional notes for the teacher..."
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setApprovingId(null)}>Cancel</button>
              <button className="btn btn-success" onClick={handleApprove} disabled={approving}>
                {approving ? 'Saving…' : 'Confirm Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- REJECT MODAL --- */}
      {rejectingId && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <h3>Reject Leave Request</h3>
            <div className="form-group">
              <label>Rejection reason * (required)</label>
              <textarea
                rows={3}
                value={rejectRemarks}
                onChange={(e) => setRejectRemarks(e.target.value)}
                placeholder="Remarks explaining rejection reason..."
                required
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setRejectingId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleReject} disabled={rejecting}>
                {rejecting ? 'Saving…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD / EDIT LEAVE TYPE MODAL --- */}
      {showTypeModal && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <h3>{editingType ? 'Edit Leave Type' : 'Add Leave Type'}</h3>
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={typeFormName}
                onChange={(e) => setTypeFormName(e.target.value)}
                placeholder="e.g. Sick Leave"
              />
            </div>
            {!editingType && (
              <div className="form-group">
                <label>Short Code *</label>
                <input
                  type="text"
                  value={typeFormCode}
                  onChange={(e) => setTypeFormCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SL"
                  maxLength={10}
                />
              </div>
            )}
            <div className="form-group">
              <label>Days Allocated Per Year *</label>
              <input
                type="number"
                min={1}
                max={365}
                value={typeFormDays}
                onChange={(e) => setTypeFormDays(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowTypeModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveType} disabled={typeSaving}>
                {typeSaving ? 'Saving…' : editingType ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SEED BALANCES MODAL --- */}
      {showSeedModal && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <h3>Seed Annual Leave Balances</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Create yearly leave balance slots for all teachers based on current active leave types. Existing balances will be preserved.
            </p>
            <div className="form-group">
              <label>Target Academic Year *</label>
              <select value={seedYearId} onChange={(e) => setSeedYearId(e.target.value)}>
                <option value="">— Select Year —</option>
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>{ay.name}</option>
                ))}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowSeedModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSeedBalances} disabled={seeding}>
                {seeding ? 'Seeding…' : 'Seed Balances'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
