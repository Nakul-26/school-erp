import './MyLeaveApplications.css';
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
          <h2><CalendarDays size={22} className="my-leave-applications-CalendarDays-1"  />My Leave Applications</h2>
          <p className="my-leave-applications-text-2">
            View your leave balances and apply for leave
          </p>
        </div>
        <div className="my-leave-applications-row-3">
          <div className="form-group my-leave-applications-form-group">
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="my-leave-applications-select-5">
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>{ay.name}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" onClick={() => setShowApplyModal(true)}>
            <Plus size={16} className="my-leave-applications-Plus-6"  />
            Apply for Leave
          </button>
        </div>
      </div>

      

      {/* Balance Cards */}
      {balances.length > 0 && (
        <div className="my-leave-applications-grid-7">
          {balances.map((b) => {
            const pct = b.total_days > 0 ? Math.min(100, (b.used_days / b.total_days) * 100) : 0;
            const remaining = b.total_days - b.used_days;
            return (
              <div key={b.leave_type_id} className="card my-leave-applications-card">
                <div className="my-leave-applications-row-9">
                  <span className="my-leave-applications-span-10">{b.leave_type_name}</span>
                  <span className="my-leave-applications-span-11">{b.leave_type_code}</span>
                </div>
                <div className="my-leave-applications-div-12">
                  {remaining} <span className="my-leave-applications-span-13">remaining</span>
                </div>
                <div className="my-leave-applications-div-14">
                  {b.used_days} used of {b.total_days} days
                </div>
                <div className="my-leave-applications-div-15">
                  <div style={{ width: `${pct}%`, height: '100%', background: pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : 'var(--primary)', borderRadius: '4px', transition: 'width 0.3s' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Applications Table */}
      <div className="card">
        <div className="my-leave-applications-div-16">
          <h4 className="my-leave-applications-row-17">
            <FileText size={16} /> Application History
          </h4>
        </div>
        {loading ? (
          <p className="my-leave-applications-text-18">Loading…</p>
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
                  <td><span className="my-leave-applications-span-19">{app.leave_type_code}</span> <span className="my-leave-applications-span-20">{app.leave_type_name}</span></td>
                  <td>{app.from_date}</td>
                  <td>{app.to_date}</td>
                  <td>{app.days_count}</td>
                  <td className="my-leave-applications-td-21" title={app.reason}>{app.reason}</td>
                  <td><StatusBadge status={app.status} /></td>
                  <td className="my-leave-applications-td-22">{app.remarks || '—'}</td>
                  <td className="my-leave-applications-td-23">{new Date(app.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr>
                  <td colSpan={8} className="my-leave-applications-td-24">
                    <CalendarDays size={32} className="my-leave-applications-CalendarDays-25"  />
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
              <div className="my-leave-applications-grid-26">
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
                <div className="my-leave-applications-div-27">
                  Duration: <strong className="my-leave-applications-strong-28">{daysCount} day{daysCount !== 1 ? 's' : ''}</strong>
                </div>
              )}
              <div className="form-group">
                <label>Reason *</label>
                <textarea rows={3} value={applyReason} onChange={(e) => setApplyReason(e.target.value)} placeholder="Briefly describe the reason for leave…" className="my-leave-applications-textarea-29"  />
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
