import React from 'react';

interface OverviewTabProps {
  teacher: any;
  canManageLogin: boolean;
  onProvisionLogin: () => void;
}

export function OverviewTab({ teacher, canManageLogin, onProvisionLogin }: OverviewTabProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
      <div className="card" style={{ padding: '1.5rem' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Personal Profile Info</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.875rem' }}>
          <div><span style={{ color: 'var(--text-secondary)' }}>Full Name:</span> <strong style={{ color: 'var(--text-main)' }}>{teacher.first_name} {teacher.middle_name} {teacher.last_name}</strong></div>
          <div><span style={{ color: 'var(--text-secondary)' }}>Contact Email:</span> <strong style={{ color: 'var(--text-main)' }}>{teacher.email || 'N/A'}</strong></div>
          <div><span style={{ color: 'var(--text-secondary)' }}>Mobile Phone:</span> <strong style={{ color: 'var(--text-main)' }}>{teacher.phone || 'N/A'}</strong></div>
          <div><span style={{ color: 'var(--text-secondary)' }}>Employee ID Code:</span> <strong style={{ color: 'var(--text-main)' }}>{teacher.employee_id || 'N/A'}</strong></div>
          <div><span style={{ color: 'var(--text-secondary)' }}>Current Status:</span> <span className={`badge badge-${teacher.status === 'ACTIVE' ? 'success' : 'danger'}`}>{teacher.status || 'ACTIVE'}</span></div>
          <div><span style={{ color: 'var(--text-secondary)' }}>Date of Joining:</span> <strong style={{ color: 'var(--text-main)' }}>{teacher.joining_date ? new Date(teacher.joining_date).toLocaleDateString() : 'N/A'}</strong></div>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Professional Experience & Qualifications</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.875rem' }}>
          <div><span style={{ color: 'var(--text-secondary)' }}>Educational Qualifications:</span> <strong style={{ color: 'var(--text-main)' }}>{teacher.qualification || 'No qualification listed'}</strong></div>
          <div><span style={{ color: 'var(--text-secondary)' }}>Professional Experience:</span> <strong style={{ color: 'var(--text-main)' }}>{teacher.experience || 'No experience details specified'}</strong></div>
          <div><span style={{ color: 'var(--text-secondary)' }}>Assigned Department:</span> <strong style={{ color: 'var(--text-main)' }}>{teacher.department || 'General Academics'}</strong></div>
          <div><span style={{ color: 'var(--text-secondary)' }}>Staff Designation:</span> <strong style={{ color: 'var(--text-main)' }}>{teacher.designation || 'Classroom Teacher'}</strong></div>
          <div><span style={{ color: 'var(--text-secondary)' }}>System User Portal Login:</span> {teacher.user_id ? (
            <span style={{ color: 'var(--success)', fontWeight: '700' }}>Active & Linked ✓</span>
          ) : canManageLogin ? (
            <button className="btn btn-secondary btn-sm" onClick={onProvisionLogin} style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', height: 'auto', display: 'inline-flex' }}>
              Provision Portal Login
            </button>
          ) : (
            <span style={{ color: 'var(--text-secondary)' }}>Not linked</span>
          )}</div>
        </div>
      </div>
    </div>
  );
}
