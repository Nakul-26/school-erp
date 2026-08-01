import React from 'react';
import { Plus, Users, Trash2 } from 'lucide-react';
import type { PlacementDrive, DriveStatus } from '../placements.types';

interface DrivesPanelProps {
  loading: boolean;
  drives: PlacementDrive[];
  onAddClick: () => void;
  onStatusChange: (drive: PlacementDrive, status: DriveStatus) => void;
  onViewApplicants: (drive: PlacementDrive) => void;
  onDelete: (drive: PlacementDrive) => void;
}

const NEXT_STATUS: Record<DriveStatus, DriveStatus | null> = {
  DRAFT: 'OPEN',
  OPEN: 'CLOSED',
  CLOSED: 'COMPLETED',
  COMPLETED: null,
};

export function DrivesPanel({ loading, drives, onAddClick, onStatusChange, onViewApplicants, onDelete }: DrivesPanelProps) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button type="button" className="btn btn-primary" onClick={onAddClick}>
          <Plus size={16} /> New Drive
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading drives...</p>
      ) : drives.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No placement drives created yet.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Company / Role</th>
              <th>Program</th>
              <th>Type</th>
              <th>Package</th>
              <th>Applicants</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {drives.map(d => {
              const next = NEXT_STATUS[d.status];
              return (
                <tr key={d.id}>
                  <td><strong>{d.company_name}</strong> — {d.title}</td>
                  <td>{d.course_name}</td>
                  <td>{d.drive_type}</td>
                  <td>{d.package_amount ?? '-'}</td>
                  <td>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => onViewApplicants(d)}>
                      <Users size={14} /> {d.applicant_count ?? 0}
                    </button>
                  </td>
                  <td>
                    <span className={`badge badge-${d.status === 'OPEN' ? 'success' : d.status === 'COMPLETED' ? 'secondary' : d.status === 'CLOSED' ? 'warning' : 'info'}`}>
                      {d.status}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: '0.5rem' }}>
                    {next && (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => onStatusChange(d, next)}>
                        {next === 'OPEN' ? 'Open' : next === 'CLOSED' ? 'Close' : 'Complete'}
                      </button>
                    )}
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => onDelete(d)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
