import React, { useEffect, useState } from 'react';
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Filters card */}
          <div className="card filters" style={{ padding: '1rem', minHeight: 'fit-content' }}>
            <div className="search-container">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Search requester, remarks, type..." 
                value={searchText} 
                onChange={e => setSearchText(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Request Type</label>
              <select 
                style={{ padding: '0.45rem 1.5rem 0.45rem 0.75rem', width: 'auto' }}
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
              >
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
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Refreshing inbox data...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flex: 1 }}>
                      <div style={{ background: '#f8fafc', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText className="text-secondary" size={20} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-main)' }}>
                            {appr.approval_type.replace(/_/g, ' ')}
                          </span>
                          <span className={`badge ${isPending ? 'badge-warning' : isApproved ? 'badge-success' : 'badge-danger'}`}>
                            {appr.status}
                          </span>
                        </div>
                        
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                          Requested by: <strong>{appr.requester_name}</strong> ({appr.requester_email})
                        </p>

                        {appr.remarks && (
                          <p style={{ fontSize: '0.8rem', background: '#f8fafc', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid var(--border)', marginTop: '0.5rem', fontStyle: 'italic', color: '#475569' }}>
                            &ldquo;{appr.remarks}&rdquo;
                          </p>
                        )}

                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                          Submitted: {new Date(appr.created_at).toLocaleString()}
                        </div>

                        {!isPending && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600, marginTop: '0.25rem' }}>
                            Reviewed by {appr.approver_name} on {new Date(appr.approved_rejected_at || appr.updated_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Panel */}
                    {isPending && isAdminOrHOD && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn btn-sm btn-success" 
                          onClick={() => handleOpenActionModal(appr, 'Approved')}
                          style={{ background: 'var(--success)', color: '#ffffff' }}
                        >
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
                <div style={{ textAlign: 'center', padding: '4rem 1.5rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
                  <CheckCircle2 className="text-success" size={36} style={{ margin: '0 auto 1rem' }} />
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>All caught up!</h4>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
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
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <h3>Confirm {actionStatus === 'Approved' ? 'Approval' : 'Rejection'}</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              You are about to <strong>{actionStatus.toLowerCase()}</strong> the {targetApproval.approval_type.toLowerCase().replace(/_/g, ' ')} submitted by {targetApproval.requester_name}.
            </p>

            <form onSubmit={handleProcessActionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                <div style={{ color: 'var(--danger)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
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
