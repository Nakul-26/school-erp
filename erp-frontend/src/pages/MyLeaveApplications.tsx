import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { CalendarDays, Plus, X, FileText } from 'lucide-react';

interface AcademicYear {
  id: string;
  name: string;
}

interface LeaveType {
  id: string;
  name: string;
  code: string;
  days_per_year: number;
}

interface LeaveBalance {
  leave_type_id: string;
  leave_type_name: string;
  leave_type_code: string;
  total_days: number;
  used_days: number;
}

interface LeaveApplication {
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

export default function MyLeaveApplications() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [loading, setLoading] = useState(true);

  // Apply modal
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyLeaveTypeId, setApplyLeaveTypeId] = useState('');
  const [applyFromDate, setApplyFromDate] = useState('');
  const [applyToDate, setApplyToDate] = useState('');
  const [applyReason, setApplyReason] = useState('');
  const [applying, setApplying] = useState(false);

  const daysCount =
    applyFromDate && applyToDate
      ? Math.max(1, Math.ceil((new Date(applyToDate).getTime() - new Date(applyFromDate).getTime()) / 86400000) + 1)
      : 0;

  useEffect(() => {
    const fetchInit = async () => {
      try {
        const [years, types] = await Promise.all([api.get('/academic-years'), api.get('/leave/types')]);
        setAcademicYears(years);
        setLeaveTypes(types);
        if (years.length > 0) setSelectedYear(years[0].id);
      } catch (err) {
        console.error(err);
      }
    };
    fetchInit();
  }, []);

  useEffect(() => {
    if (selectedYear) fetchBalancesAndApplications();
  }, [selectedYear]);

  const fetchBalancesAndApplications = async () => {
    try {
      setLoading(true);
      const [bal, apps] = await Promise.all([
        api.get(`/leave/balances/my?academic_year_id=${selectedYear}`),
        api.get('/leave/applications/my'),
      ]);
      setBalances(bal);
      setApplications(apps);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
        academic_year_id: selectedYear,
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
      fetchBalancesAndApplications();
    } catch (err: any) {
      alert(err.message || 'Failed to submit application');
    } finally {
      setApplying(false);
    }
  };

  return (
    <Layout>
      <PageGuidance
        title="My Leave Applications"
        description="Use this page to check your available leave balance and apply for leave. Select the leave type, choose the dates, and enter the reason. Your request will be sent to your HOD or Principal for approval."
        steps={["Check remaining balances for Casual, Sick, or Earned leaves.","Click Apply for Leave and choose the date ranges and reasons.","Track your request's approval status in real-time."]}
      />
      <div className="page-header">
        <div>
          <h2><CalendarDays size={22} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />My Leave Applications</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            View your leave balances and apply for leave
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{ padding: '0.5rem 1rem' }}>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>{ay.name}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" onClick={() => setShowApplyModal(true)}>
            <Plus size={16} style={{ marginRight: '0.4rem' }} />
            Apply for Leave
          </button>
        </div>
      </div>

      

      {/* Balance Cards */}
      {balances.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {balances.map((b) => {
            const pct = b.total_days > 0 ? Math.min(100, (b.used_days / b.total_days) * 100) : 0;
            const remaining = b.total_days - b.used_days;
            return (
              <div key={b.leave_type_id} className="card" style={{ padding: '1rem', margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{b.leave_type_name}</span>
                  <span style={{ fontSize: '0.75rem', background: 'var(--primary)', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{b.leave_type_code}</span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                  {remaining} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>remaining</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  {b.used_days} used of {b.total_days} days
                </div>
                <div style={{ background: 'var(--border)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : 'var(--primary)', borderRadius: '4px', transition: 'width 0.3s' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Applications Table */}
      <div className="card">
        <div style={{ padding: '1rem 1rem 0', borderBottom: '1px solid var(--border)', marginBottom: '0' }}>
          <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FileText size={16} /> Application History
          </h4>
        </div>
        {loading ? (
          <p style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading…</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>From</th>
                <th>To</th>
                <th>Days</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Remarks</th>
                <th>Applied On</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id}>
                  <td><span style={{ fontWeight: 600 }}>{app.leave_type_code}</span> <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{app.leave_type_name}</span></td>
                  <td>{app.from_date}</td>
                  <td>{app.to_date}</td>
                  <td>{app.days_count}</td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={app.reason}>{app.reason}</td>
                  <td><StatusBadge status={app.status} /></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{app.remarks || '—'}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(app.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <CalendarDays size={32} style={{ display: 'block', margin: '0 auto 0.5rem' }} />
                    No leave applications found. Click "Apply for Leave" to submit one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Apply for Leave Modal */}
      {showApplyModal && (
        <div className="modal-overlay" onClick={() => setShowApplyModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Apply for Leave</h3>
              <button className="btn btn-sm btn-outline" onClick={() => setShowApplyModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
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
                <div style={{ background: 'var(--bg-secondary, #f8fafc)', borderRadius: '6px', padding: '0.6rem 1rem', marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Duration: <strong style={{ color: 'var(--text)' }}>{daysCount} day{daysCount !== 1 ? 's' : ''}</strong>
                </div>
              )}
              <div className="form-group">
                <label>Reason *</label>
                <textarea
                  rows={3}
                  value={applyReason}
                  onChange={(e) => setApplyReason(e.target.value)}
                  placeholder="Briefly describe the reason for leave…"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', resize: 'vertical' }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowApplyModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleApply} disabled={applying}>
                {applying ? 'Submitting…' : 'Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
