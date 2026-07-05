import './AccountantDashboard.css';
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
    <div className="portal-dashboard accountant-dashboard accountant-dashboard-portal-dashboard">
      <div className="stats-grid">
        {/* Today's Collections */}
        <div className="stat-card card">
          <div className="icon accountant-dashboard-icon">
            <IndianRupee size={24} />
          </div>
          <div className="info">
            <h3>Today's Collections</h3>
            <div className="value">{formatCurrency(stats?.todayCollections || 0)}</div>
          </div>
        </div>

        {/* Pending Dues */}
        <div className="stat-card card">
          <div className="icon accountant-dashboard-icon">
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
          <div className="icon accountant-dashboard-icon">
            <FileText size={24} />
          </div>
          <div className="info">
            <h3>Receipts Issued Today</h3>
            <div className="value">{stats?.receiptsIssuedToday || 0}</div>
          </div>
        </div>

        {/* Online Payments to Verify */}
        <div className="stat-card card">
          <div className="icon accountant-dashboard-icon">
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
      <div className="accountant-actions card accountant-dashboard-accountant-actions">
        <h3>Finance Quick Actions</h3>
        <div className="quick-actions-grid accountant-dashboard-quick-actions-grid">
          <Link to="/student-fees" className="action-btn accountant-dashboard-action-btn">
            <div className="accountant-dashboard-row-9">
              <IndianRupee size={20} className="accountant-dashboard-IndianRupee-10"  />
              <span>Collect Student Fees</span>
            </div>
            <ArrowUpRight size={16} className="accountant-dashboard-ArrowUpRight-11"  />
          </Link>

          <Link to="/fee-structures" className="action-btn accountant-dashboard-action-btn">
            <div className="accountant-dashboard-row-13">
              <FileText size={20} className="accountant-dashboard-FileText-14"  />
              <span>Manage Fee Plans</span>
            </div>
            <ArrowUpRight size={16} className="accountant-dashboard-ArrowUpRight-15"  />
          </Link>

          <Link to="/reports?tab=fees" className="action-btn accountant-dashboard-action-btn">
            <div className="accountant-dashboard-row-17">
              <FileText size={20} className="accountant-dashboard-FileText-18"  />
              <span>View Fee Reports</span>
            </div>
            <ArrowUpRight size={16} className="accountant-dashboard-ArrowUpRight-19"  />
          </Link>
        </div>
      </div>
    </div>
  );
}
