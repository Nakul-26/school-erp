import './LeaveApprovals.css';
import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { ClipboardCheck, X, Check, AlertTriangle } from 'lucide-react';

interface AcademicYear {
  id: string;
  name: string;
}

interface LeaveApplication {
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

type FilterTab = 'All' | 'Pending' | 'Approved' | 'Rejected';

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

export default function LeaveApprovals() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('Pending');
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [loading, setLoading] = useState(true);

  // Reject modal
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Approve remarks (optional)
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approveRemarks, setApproveRemarks] = useState('');
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    const fetchYears = async () => {
      try {
        const years = await api.get('/academic-years');
        setAcademicYears(years);
        if (years.length > 0) setSelectedYear(years[0].id);
      } catch (err) { console.error(err); }
    };
    fetchYears();
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [activeTab, selectedYear]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeTab !== 'All') params.set('status', activeTab);
      const data = await api.get(`/leave/applications?${params.toString()}`);
      setApplications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approvingId) return;
    try {
      setApproving(true);
      await api.patch(`/leave/applications/${approvingId}/approve`, { remarks: approveRemarks || undefined });
      setApprovingId(null);
      setApproveRemarks('');
      fetchApplications();
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
      fetchApplications();
    } catch (err: any) {
      alert(err.message || 'Failed to reject application');
    } finally {
      setRejecting(false);
    }
  };

  const tabs: FilterTab[] = ['All', 'Pending', 'Approved', 'Rejected'];

  return (
    <Layout>
      <PageGuidance
        title="Leave Approvals"
        description="Use this page to review leave requests submitted by teachers. Check the leave dates and reason before approving or rejecting the request. You can also filter requests by status or academic year."
        steps={["View pending, approved, and rejected teacher leave requests.","Filter by status or academic year to inspect specific records.","Click Approve or Reject to update and save the status."]}
      />
      <div className="page-header">
        <div>
          <h2><ClipboardCheck size={22} className="leave-approvals-ClipboardCheck-1"  />Leave Approvals</h2>
          <p className="leave-approvals-text-2">
            Review and act on staff leave applications
          </p>
        </div>
        <div className="form-group leave-approvals-form-group">
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="leave-approvals-select-4">
            <option value="">All Years</option>
            {academicYears.map((ay) => (
              <option key={ay.id} value={ay.id}>{ay.name}</option>
            ))}
          </select>
        </div>
      </div>

      

      {/* Filter Tabs */}
      <div className="leave-approvals-row-5">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`btn btn-sm ${activeTab === tab ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <p className="leave-approvals-text-6">Loading applications…</p>
        ) : (
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id}>
                  <td><strong>{app.employee_id || '—'}</strong></td>
                  <td>{app.teacher_first_name} {app.teacher_last_name}</td>
                  <td>
                    <span className="leave-approvals-span-7">{app.leave_type_code}</span>
                    <span className="leave-approvals-span-8">{app.leave_type_name}</span>
                  </td>
                  <td>{app.from_date}</td>
                  <td>{app.to_date}</td>
                  <td>{app.days_count}</td>
                  <td className="leave-approvals-td-9" title={app.reason}>{app.reason}</td>
                  <td><StatusBadge status={app.status} /></td>
                  <td>
                    {app.status === 'Pending' ? (
                      <div className="leave-approvals-row-10">
                        <button className="btn btn-sm btn-success leave-approvals-btn" onClick={() => { setApprovingId(app.id); setApproveRemarks(''); }} title="Approve">
                          <Check size={13} /> Approve
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => { setRejectingId(app.id); setRejectRemarks(''); }}
                          title="Reject"
                        >
                          <X size={13} /> Reject
                        </button>
                      </div>
                    ) : (
                      <span className="leave-approvals-span-12">{app.remarks || '—'}</span>
                    )}
                  </td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr>
                  <td colSpan={9} className="leave-approvals-td-13">
                    <ClipboardCheck size={32} className="leave-approvals-ClipboardCheck-14"  />
                    No {activeTab === 'All' ? '' : activeTab.toLowerCase() + ' '}leave applications found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Approve Modal */}
      {approvingId && (
        <div className="modal-overlay" onClick={() => setApprovingId(null)}>
          <div className="modal leave-approvals-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Check size={18} className="leave-approvals-Check-16"  />Approve Leave</h3>
              <button className="btn btn-sm btn-outline" onClick={() => setApprovingId(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Remarks (optional)</label>
                <textarea rows={3} value={approveRemarks} onChange={(e) => setApproveRemarks(e.target.value)} placeholder="Add an optional note for the teacher…" className="leave-approvals-textarea-17"  />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setApprovingId(null)}>Cancel</button>
              <button className="btn leave-approvals-btn" onClick={handleApprove} disabled={approving}>
                {approving ? 'Approving…' : 'Confirm Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingId && (
        <div className="modal-overlay" onClick={() => setRejectingId(null)}>
          <div className="modal leave-approvals-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><AlertTriangle size={18} className="leave-approvals-AlertTriangle-20"  />Reject Leave</h3>
              <button className="btn btn-sm btn-outline" onClick={() => setRejectingId(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Remarks * (required)</label>
                <textarea rows={3} value={rejectRemarks} onChange={(e) => setRejectRemarks(e.target.value)} placeholder="Provide a reason for rejection…" className="leave-approvals-textarea-21"  />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setRejectingId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleReject} disabled={rejecting}>
                {rejecting ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
