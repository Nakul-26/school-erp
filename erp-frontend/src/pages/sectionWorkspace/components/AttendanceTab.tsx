import React from 'react';
import { ClipboardCheck } from 'lucide-react';

interface AttendanceTabProps {
  attendanceSessions: any[];
  canMarkAttendance: boolean;
  onMarkAttendance: () => void;
}

export function AttendanceTab({ attendanceSessions, canMarkAttendance, onMarkAttendance }: AttendanceTabProps) {
  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)' }}>Attendance Register sessions</h4>
        {canMarkAttendance && (
          <button className="btn btn-primary" onClick={onMarkAttendance}>
            Mark Daily Attendance
          </button>
        )}
      </div>

      {attendanceSessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
          <ClipboardCheck size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
          <p>No attendance records logged for this class yet.</p>
        </div>
      ) : (
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Session Date</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Marked By</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Subject Mapped</th>
              <th style={{ textAlign: 'center', padding: '0.5rem', width: '150px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {attendanceSessions.map(session => (
              <tr key={session.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '0.65rem 0.5rem', fontWeight: '500' }}>{new Date(session.session_date).toLocaleDateString()}</td>
                <td style={{ padding: '0.65rem 0.5rem' }}>{session.marked_by_name || 'Staff Advisor'}</td>
                <td style={{ padding: '0.65rem 0.5rem' }}>{session.subject_name || 'General Attendance'}</td>
                <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                  <span className="badge badge-success" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
                    ✓ Marked
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
