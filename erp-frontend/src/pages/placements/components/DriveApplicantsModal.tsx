import React from 'react';
import type { PlacementApplication, PlacementDrive, ApplicationStatus } from '../placements.types';

interface DriveApplicantsModalProps {
  show: boolean;
  drive: PlacementDrive | null;
  applications: PlacementApplication[];
  loading: boolean;
  onClose: () => void;
  onStatusChange: (app: PlacementApplication, status: ApplicationStatus) => void;
  onOfferChange: (app: PlacementApplication, offerPackage: number, offerDate: string) => void;
}

const STATUS_OPTIONS: ApplicationStatus[] = ['APPLIED', 'SHORTLISTED', 'INTERVIEWED', 'OFFERED', 'REJECTED'];

export function DriveApplicantsModal({ show, drive, applications, loading, onClose, onStatusChange, onOfferChange }: DriveApplicantsModalProps) {
  if (!show || !drive) return null;

  return (
    <div className="modal">
      <div className="modal-content size-lg">
        <h3>Applicants — {drive.company_name} ({drive.title})</h3>

        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading applicants...</p>
        ) : applications.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No applications yet for this drive.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Roll No.</th>
                <th>Status</th>
                <th>Offer Package</th>
                <th>Offer Date</th>
              </tr>
            </thead>
            <tbody>
              {applications.map(app => (
                <tr key={app.id}>
                  <td><strong>{app.student_name}</strong></td>
                  <td>{app.roll_number || '-'}</td>
                  <td>
                    <select value={app.status} onChange={e => onStatusChange(app, e.target.value as ApplicationStatus)}>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      defaultValue={app.offer_package ?? ''}
                      style={{ width: '100px' }}
                      onBlur={e => onOfferChange(app, Number(e.target.value), app.offer_date || '')}
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      defaultValue={app.offer_date || ''}
                      onBlur={e => onOfferChange(app, app.offer_package || 0, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
