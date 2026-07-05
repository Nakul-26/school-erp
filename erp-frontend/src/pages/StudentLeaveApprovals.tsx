import './StudentLeaveApprovals.css';
import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Calendar, Check, X } from 'lucide-react';

interface StudentLeaveRecord {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  roll_number: string | null;
  course_name: string;
  from_date: string;
  to_date: string;
  days_count: number;
  reason: string;
  applied_by: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  remarks: string | null;
}

export default function StudentLeaveApprovals() {
  const [leaves, setLeaves] = useState<StudentLeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Pending' | 'Approved' | 'Rejected'>('Pending');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const data = await api.get('/student-leaves/review');
      setLeaves(data);
    } catch (err) {
      console.error('Error fetching student leaves:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this student leave request?')) return;
    try {
      await api.patch(`/student-leaves/${id}/approve`, { remarks: 'Approved' });
      alert('Leave approved successfully!');
      fetchLeaves();
    } catch (err) {
      alert('Error approving leave');
    }
  };

  const handleRejectClick = (id: string) => {
    setSelectedLeaveId(id);
    setReviewRemarks('');
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeaveId || !reviewRemarks.trim()) return;
    try {
      await api.patch(`/student-leaves/${selectedLeaveId}/reject`, { remarks: reviewRemarks });
      alert('Leave request rejected');
      setShowRejectModal(false);
      fetchLeaves();
    } catch (err: any) {
      alert(err.message || 'Error rejecting leave');
    }
  };

  const filteredLeaves = leaves.filter(l => l.status === activeTab);

  return (
    <Layout>
      <PageGuidance
        title="Student Leave Inbox"
        description="Use this page to review leave requests submitted for students by their parents or teachers. Read the reason for leave, then approve or reject the request. Approved leaves are included in the student's attendance record."
        steps={["Review student leave applications sorted by status.","Click Approve or Reject after checking the leave dates and reasons.","Approved leaves automatically update the student's attendance register."]}
      />
      <div className="page-header">
        <div>
          <h2>Student Leave Inbox</h2>
          <p className="student-leave-approvals-text-1">
            Review, approve, and track academic leave applications submitted by students or parents.
          </p>
        </div>
      </div>

      

      <div className="student-leave-approvals-row-2">
        {(['Pending', 'Approved', 'Rejected'] as const).map(tab => (
          <button
            key={tab}
            className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab} Leaves
          </button>
        ))}
      </div>

      <div className="card student-leave-approvals-card">
        {loading ? <p>Loading leave inbox...</p> : (
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Academic Program</th>
                <th>Leave Range</th>
                <th>Days</th>
                <th>Reason / Applied By</th>
                <th>Status</th>
                {activeTab === 'Pending' && <th className="student-leave-approvals-th-4">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredLeaves.map((l) => (
                <tr key={l.id}>
                  <td>
                    <strong>{l.first_name} {l.last_name}</strong>
                    <div className="student-leave-approvals-div-5">Roll: {l.roll_number || '-'} | Adm: {l.admission_number}</div>
                  </td>
                  <td>{l.course_name}</td>
                  <td>
                    <div className="student-leave-approvals-row-6">
                      <Calendar size={14} /> {l.from_date} to {l.to_date}
                    </div>
                  </td>
                  <td>{l.days_count} days</td>
                  <td>
                    <p className="student-leave-approvals-text-7">{l.reason}</p>
                    <span className="student-leave-approvals-span-8">
                      Applied by {l.applied_by}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${l.status === 'Approved' ? 'badge-success' : l.status === 'Rejected' ? 'badge-danger' : 'badge-warning'}`}>
                      {l.status}
                    </span>
                    {l.remarks && <div className="student-leave-approvals-div-9">Notes: {l.remarks}</div>}
                  </td>
                  {activeTab === 'Pending' && (
                    <td className="student-leave-approvals-td-10">
                      <div className="student-leave-approvals-row-11">
                        <button className="btn btn-sm btn-success" onClick={() => handleApprove(l.id)}>
                          <Check size={12} /> Approve
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleRejectClick(l.id)}>
                          <X size={12} /> Reject
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredLeaves.length === 0 && (
                <tr>
                  <td colSpan={activeTab === 'Pending' ? 7 : 6} className="student-leave-approvals-td-12">
                    No {activeTab.toLowerCase()} leave requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showRejectModal && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reject Leave Request</h3>
              <button onClick={() => setShowRejectModal(false)}>✕</button>
            </div>
            <form onSubmit={handleRejectSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Remarks / Reason for Rejection</label>
                  <textarea rows={3} placeholder="Enter reason for rejection..." value={reviewRemarks} onChange={(e) => setReviewRemarks(e.target.value)} required className="student-leave-approvals-textarea-13"  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowRejectModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-danger">Confirm Reject</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
