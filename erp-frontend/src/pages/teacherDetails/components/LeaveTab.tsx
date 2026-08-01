import React from 'react';

interface LeaveTabProps {
  teacherBalances: any[];
  leaveApplications: any[];
  canApplyLeave: boolean;
  onApplyLeave: () => void;
}

export function LeaveTab({ teacherBalances, leaveApplications, canApplyLeave, onApplyLeave }: LeaveTabProps) {
  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)' }}>Leave Balances & Applications</h4>
        {canApplyLeave && (
          <button className="btn btn-primary" onClick={onApplyLeave}>
            Apply Leave
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'start' }}>
        <div>
          <h5 style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.75rem' }}>Leave Balance (Days)</h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {teacherBalances.map(bal => (
              <div key={bal.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: '600' }}>{bal.leave_type_name}</span>
                <span>Remaining: <strong style={{ color: 'var(--primary)' }}>{bal.remaining_days}</strong> / {bal.allocated_days} days</span>
              </div>
            ))}
            {teacherBalances.length === 0 && (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No leave balances seeded for this year.</div>
            )}
          </div>
        </div>

        <div>
          <h5 style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.75rem' }}>Leave History & Applications</h5>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Date Range</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Type</th>
                <th style={{ textAlign: 'center', padding: '0.5rem' }}>Days</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Reason</th>
                <th style={{ textAlign: 'right', padding: '0.5rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {leaveApplications.map(app => (
                <tr key={app.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.5rem' }}>{new Date(app.from_date).toLocaleDateString()} - {new Date(app.to_date).toLocaleDateString()}</td>
                  <td style={{ padding: '0.5rem' }}>{app.leave_type_name}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>{app.days_count}</td>
                  <td style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>{app.reason}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                    <span className={`badge badge-${app.status === 'APPROVED' ? 'success' : app.status === 'REJECTED' ? 'danger' : 'warning'}`}>
                      {app.status}
                    </span>
                  </td>
                </tr>
              ))}
              {leaveApplications.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>No leave applications logged.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
