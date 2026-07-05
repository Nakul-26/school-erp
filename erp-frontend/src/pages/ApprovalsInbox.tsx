import './ApprovalsInbox.css';
import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import WorkspaceShell from '../components/WorkspaceShell';
import type { BreadcrumbItem, KPIProps, HealthCheckItem } from '../components/WorkspaceShell';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  CheckSquare, 
  Clock, 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  AlertCircle, 
  CheckCircle2, 
  FileText, 
  Search,
  Sliders,
  History
} from 'lucide-react';

export default function ApprovalsInbox() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Page access check
  const roles = user?.roles || (user?.role ? [user.role] : []);
  const isAdminOrHOD = roles.some(r => ['admin', 'super_admin', 'Principal', 'HOD', 'Super Admin'].includes(r));

  // State
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchText, setSearchText] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('All');
  
  // Tab control
  const [activeTab, setActiveTab] = useState<string>('pending');

  // Modal / Action states
  const [showActionModal, setShowActionModal] = useState<boolean>(false);
  const [targetApproval, setTargetApproval] = useState<any | null>(null);
  const [actionStatus, setActionStatus] = useState<'Approved' | 'Rejected'>('Approved');
  const [actionRemarks, setActionRemarks] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetchApprovals();
  }, [activeTab]);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      // Map tabs to statuses
      const statusMap: Record<string, string> = {
        pending: 'Pending',
        completed: 'All' // we filter locally or get all
      };
      
      const statusFilter = statusMap[activeTab] || 'Pending';
      let path = '/approvals';
      if (statusFilter !== 'All') {
        path += `?status=${statusFilter}`;
      }
      
      const data = await api.get(path);
      setApprovals(data || []);
    } catch (err) {
      console.error('Failed to load approvals queue', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter approvals list
  const filteredApprovals = approvals.filter(item => {
    const typeMatch = selectedType === 'All' || item.approval_type === selectedType;
    const requesterName = item.requester_name?.toLowerCase() || '';
    const remarks = item.remarks?.toLowerCase() || '';
    const searchLower = searchText.toLowerCase();
    const textMatch = !searchText || 
      requesterName.includes(searchLower) ||
      remarks.includes(searchLower) ||
      item.approval_type.toLowerCase().includes(searchLower);

    // If completed tab, show both Approved & Rejected, else pending only
    const statusMatch = activeTab === 'pending' 
      ? item.status === 'Pending' 
      : ['Approved', 'Rejected'].includes(item.status);

    return typeMatch && textMatch && statusMatch;
  });

  const handleOpenActionModal = (approval: any, status: 'Approved' | 'Rejected') => {
    setTargetApproval(approval);
    setActionStatus(status);
    setActionRemarks('');
    setActionError(null);
    setShowActionModal(true);
  };

  const handleProcessActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetApproval) return;

    setActionLoading(true);
    setActionError(null);

    try {
      await api.post(`/approvals/${targetApproval.id}/action`, {
        status: actionStatus,
        remarks: actionRemarks
      });
      setShowActionModal(false);
      fetchApprovals();
    } catch (err: any) {
      setActionError(err.message || 'Failed to submit approval review.');
    } finally {
      setActionLoading(false);
    }
  };

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Administration', to: '/dashboard' },
    { label: 'Approvals Inbox' }
  ];

  // Stats calculation
  const pendingCount = approvals.filter(a => a.status === 'Pending').length;
  const approvedCount = approvals.filter(a => a.status === 'Approved').length;
  const rejectedCount = approvals.filter(a => a.status === 'Rejected').length;

  const getHealthStatus = () => {
    if (pendingCount > 5) {
      return {
        status: 'critical' as const,
        message: `High volume: There are ${pendingCount} pending requests awaiting administrative decision.`
      };
    } else if (pendingCount > 0) {
      return {
        status: 'warning' as const,
        message: `Outstanding reviews: ${pendingCount} requests require approval to proceed.`
      };
    }
    return {
      status: 'healthy' as const,
      message: 'Approvals queue is clear. No pending actions.'
    };
  };

  const healthChecks: HealthCheckItem[] = [
    {
      label: 'Leaves & HR Reviews',
      passed: approvals.filter(a => a.approval_type === 'LEAVE_REQUEST' && a.status === 'Pending').length === 0,
      message: 'All teacher leave requests processed.'
    },
    {
      label: 'Financial Refund Approvals',
      passed: approvals.filter(a => a.approval_type === 'FEE_REFUND' && a.status === 'Pending').length === 0,
      message: 'All fee waiver & refund claims signed off.'
    },
    {
      label: 'Academic Registries Corrections',
      passed: approvals.filter(a => a.approval_type === 'ATTENDANCE_CORRECTION' && a.status === 'Pending').length === 0,
      message: 'All student attendance amendments reviewed.'
    }
  ];

  const kpis: KPIProps[] = [
    {
      label: 'Pending Tasks',
      value: pendingCount,
      color: pendingCount > 0 ? 'warning' : 'success',
      description: 'Awaiting your review',
      icon: <Clock size={18} />
    },
    {
      label: 'Approved Requests',
      value: approvedCount,
      color: 'success',
      description: 'Requests signed off',
      icon: <ThumbsUp size={18} />
    },
    {
      label: 'Rejected Requests',
      value: rejectedCount,
      color: 'danger',
      description: 'Requests denied',
      icon: <ThumbsDown size={18} />
    }
  ];

  return (
    <Layout>
      <WorkspaceShell
        title="Approvals Inbox"
        breadcrumbs={breadcrumbs}
        statusBadge={{ label: 'System Queue', type: 'info' }}
        health={getHealthStatus()}
        kpis={kpis}
        tabs={[
          { id: 'pending', label: 'Pending Inbox', icon: <Clock size={16} />, ...(pendingCount > 0 ? { count: pendingCount } : {}) },
          { id: 'completed', label: 'Review Archive', icon: <CheckSquare size={16} /> }
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        loading={loading && approvals.length === 0}
      >
        {/* Roster Layout */}
        <div className="approvals-inbox-col-1">
          
          {/* Filters card */}
          <div className="card filters approvals-inbox-card">
            <div className="search-container">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Search requester, remarks, type..." 
                value={searchText} 
                onChange={e => setSearchText(e.target.value)}
              />
            </div>

            <div className="approvals-inbox-row-3">
              <label className="approvals-inbox-label-4">Request Type</label>
              <select className="approvals-inbox-select-5" value={selectedType} onChange={e => setSelectedType(e.target.value)}>
                <option value="All">All Types</option>
                <option value="LEAVE_REQUEST">Leave Requests</option>
                <option value="ATTENDANCE_CORRECTION">Attendance Corrections</option>
                <option value="FEE_REFUND">Fee Refunds</option>
                <option value="STUDENT_WITHDRAWAL">Student Withdrawals</option>
              </select>
            </div>
          </div>

          {/* Request List */}
          {loading ? (
            <p className="approvals-inbox-text-6">Refreshing inbox data...</p>
          ) : (
            <div className="approvals-inbox-col-7">
              {filteredApprovals.map(appr => {
                const isPending = appr.status === 'Pending';
                const isApproved = appr.status === 'Approved';
                
                return (
                  <div 
                    key={appr.id}
                    className="card"
                    style={{
                      padding: '1.25rem',
                      borderLeft: `4px solid ${isPending ? 'var(--warning)' : isApproved ? 'var(--success)' : 'var(--danger)'}`,
                      background: 'var(--bg-card)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '1.5rem'
                    }}
                  >
                    <div className="approvals-inbox-row-8">
                      <div className="approvals-inbox-row-9">
                        <FileText className="text-secondary" size={20} />
                      </div>
                      <div>
                        <div className="approvals-inbox-row-10">
                          <span className="approvals-inbox-span-11">
                            {appr.approval_type.replace(/_/g, ' ')}
                          </span>
                          <span className={`badge ${isPending ? 'badge-warning' : isApproved ? 'badge-success' : 'badge-danger'}`}>
                            {appr.status}
                          </span>
                        </div>
                        
                        <p className="approvals-inbox-text-12">
                          Requested by: <strong>{appr.requester_name}</strong> ({appr.requester_email})
                        </p>

                        {appr.remarks && (
                          <p className="approvals-inbox-text-13">
                            &ldquo;{appr.remarks}&rdquo;
                          </p>
                        )}

                        <div className="approvals-inbox-div-14">
                          Submitted: {new Date(appr.created_at).toLocaleString()}
                        </div>

                        {!isPending && (
                          <div className="approvals-inbox-div-15">
                            Reviewed by {appr.approver_name} on {new Date(appr.approved_rejected_at || appr.updated_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Panel */}
                    {isPending && isAdminOrHOD && (
                      <div className="approvals-inbox-row-16">
                        <button className="btn btn-sm btn-success approvals-inbox-btn" onClick={() => handleOpenActionModal(appr, 'Approved')}>
                          <ThumbsUp size={14} /> Approve
                        </button>
                        <button 
                          className="btn btn-sm btn-danger" 
                          onClick={() => handleOpenActionModal(appr, 'Rejected')}
                        >
                          <ThumbsDown size={14} /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredApprovals.length === 0 && (
                <div className="approvals-inbox-div-18">
                  <CheckCircle2 className="text-success approvals-inbox-text-success" size={36}  />
                  <h4 className="approvals-inbox-title-20">All caught up!</h4>
                  <p className="approvals-inbox-text-21">
                    No pending approval requests matching your selection.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </WorkspaceShell>

      {/* Review Modal Form */}
      {showActionModal && targetApproval && (
        <div className="modal">
          <div className="modal-content approvals-inbox-modal-content">
            <h3>Confirm {actionStatus === 'Approved' ? 'Approval' : 'Rejection'}</h3>
            <p className="approvals-inbox-text-23">
              You are about to <strong>{actionStatus.toLowerCase()}</strong> the {targetApproval.approval_type.toLowerCase().replace(/_/g, ' ')} submitted by {targetApproval.requester_name}.
            </p>

            <form onSubmit={handleProcessActionSubmit} className="approvals-inbox-col-24">
              <div className="form-group">
                <label>Review Notes / Remarks</label>
                <textarea 
                  value={actionRemarks}
                  onChange={e => setActionRemarks(e.target.value)}
                  placeholder="Provide details or reasons for this decision..."
                  rows={3}
                  required={actionStatus === 'Rejected'} // Rejection remarks mandatory
                />
              </div>

              {actionError && (
                <div className="approvals-inbox-row-25">
                  <AlertCircle size={14} /> {actionError}
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowActionModal(false)} disabled={actionLoading}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={`btn ${actionStatus === 'Approved' ? 'btn-primary' : 'btn-danger'}`}
                  disabled={actionLoading}
                  style={actionStatus === 'Approved' ? { background: 'var(--success)', color: '#ffffff' } : undefined}
                >
                  {actionLoading ? 'Saving...' : `Confirm ${actionStatus}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
