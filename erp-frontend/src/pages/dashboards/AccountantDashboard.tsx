import React from 'react';
import { Link } from 'react-router-dom';
import { IndianRupee, AlertCircle, FileText, CheckCircle, ArrowUpRight } from 'lucide-react';

interface AccountantDashboardProps {
  stats: any;
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
};

export default function AccountantDashboard({ stats }: AccountantDashboardProps) {
  return (
    <div className="portal-dashboard accountant-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="stats-grid">
        {/* Today's Collections */}
        <div className="stat-card card">
          <div className="icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
            <IndianRupee size={24} />
          </div>
          <div className="info">
            <h3>Today's Collections</h3>
            <div className="value">{formatCurrency(stats?.todayCollections || 0)}</div>
          </div>
        </div>

        {/* Pending Dues */}
        <div className="stat-card card">
          <div className="icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
            <AlertCircle size={24} />
          </div>
          <div className="info">
            <h3>Pending Dues</h3>
            <div className="value">{formatCurrency(stats?.pendingDues || 0)}</div>
            <span className="sub-text">{stats?.pendingDuesStudents || 0} students with outstanding fees</span>
          </div>
        </div>

        {/* Receipts Issued Today */}
        <div className="stat-card card">
          <div className="icon" style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)' }}>
            <FileText size={24} />
          </div>
          <div className="info">
            <h3>Receipts Issued Today</h3>
            <div className="value">{stats?.receiptsIssuedToday || 0}</div>
          </div>
        </div>

        {/* Online Payments to Verify */}
        <div className="stat-card card">
          <div className="icon" style={{ background: 'rgba(245, 185, 11, 0.1)', color: 'var(--warning)' }}>
            <CheckCircle size={24} />
          </div>
          <div className="info">
            <h3>Online Payments Today</h3>
            <div className="value">{stats?.onlinePaymentsToVerify || 0}</div>
            <span className="sub-text">Completed online transactions</span>
          </div>
        </div>
      </div>

      {/* Accountant Quick Actions */}
      <div className="accountant-actions card" style={{ marginTop: '1rem' }}>
        <h3>Finance Quick Actions</h3>
        <div className="quick-actions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginTop: '1.25rem' }}>
          <Link to="/student-fees" className="action-btn" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.5rem',
            background: '#f8fafc',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-main)',
            textDecoration: 'none',
            transition: 'all 0.2s',
            fontWeight: 600
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <IndianRupee size={20} style={{ color: 'var(--primary)' }} />
              <span>Collect Student Fees</span>
            </div>
            <ArrowUpRight size={16} style={{ color: 'var(--text-muted)' }} />
          </Link>

          <Link to="/fee-structures" className="action-btn" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.5rem',
            background: '#f8fafc',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-main)',
            textDecoration: 'none',
            transition: 'all 0.2s',
            fontWeight: 600
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FileText size={20} style={{ color: 'var(--success)' }} />
              <span>Manage Fee Plans</span>
            </div>
            <ArrowUpRight size={16} style={{ color: 'var(--text-muted)' }} />
          </Link>

          <Link to="/reports?tab=fees" className="action-btn" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.5rem',
            background: '#f8fafc',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-main)',
            textDecoration: 'none',
            transition: 'all 0.2s',
            fontWeight: 600
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FileText size={20} style={{ color: 'var(--warning)' }} />
              <span>View Fee Reports</span>
            </div>
            <ArrowUpRight size={16} style={{ color: 'var(--text-muted)' }} />
          </Link>
        </div>
      </div>
    </div>
  );
}
