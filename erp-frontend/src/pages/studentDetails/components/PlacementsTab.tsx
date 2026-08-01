import React from 'react';
import type { PlacementDriveInfo, PlacementEligibility, PlacementApplicationView } from '../studentDetails.types';

interface PlacementsTabProps {
  loading: boolean;
  openDrives: (PlacementDriveInfo & { eligibility?: PlacementEligibility })[];
  myApplications: PlacementApplicationView[];
  onApply: (driveId: string) => void;
  onWithdraw: (applicationId: string) => void;
}

const WITHDRAWABLE_STATUSES = new Set(['APPLIED', 'SHORTLISTED', 'INTERVIEWED']);

export function PlacementsTab({ loading, openDrives, myApplications, onApply, onWithdraw }: PlacementsTabProps) {
  if (loading) {
    return <p className="student-details-text-118">Loading placement drives...</p>;
  }

  const appliedDriveIds = new Set(myApplications.filter(a => a.status !== 'WITHDRAWN').map(a => a.drive_id));

  return (
    <div>
      <h3 className="student-details-title-107">Open Placement & Internship Drives</h3>
      {openDrives.length === 0 ? (
        <p className="student-details-text-118">No open drives currently available for this program.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Role</th>
              <th>Type</th>
              <th>Package</th>
              <th>Deadline</th>
              <th>Eligibility</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {openDrives.map(d => {
              const alreadyApplied = appliedDriveIds.has(d.id);
              const eligible = d.eligibility?.is_eligible ?? true;
              return (
                <tr key={d.id}>
                  <td><strong>{d.company_name}</strong></td>
                  <td>{d.title}</td>
                  <td>{d.drive_type}</td>
                  <td>{d.package_amount ?? '-'}</td>
                  <td>{d.application_deadline || '-'}</td>
                  <td>
                    <span className={`badge badge-${eligible ? 'success' : 'danger'}`}>
                      {eligible ? 'Eligible' : (d.eligibility?.reasons[0] || 'Not eligible')}
                    </span>
                  </td>
                  <td>
                    {alreadyApplied ? (
                      <span className="badge badge-info">Applied</span>
                    ) : (
                      <button type="button" className="btn btn-primary btn-sm" disabled={!eligible} onClick={() => onApply(d.id)}>
                        Apply
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <h3 className="student-details-title-107" style={{ marginTop: '2rem' }}>My Applications</h3>
      {myApplications.length === 0 ? (
        <p className="student-details-text-118">No placement applications submitted yet.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Role</th>
              <th>Status</th>
              <th>Offer</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {myApplications.map(app => (
              <tr key={app.id}>
                <td><strong>{app.company_name}</strong></td>
                <td>{app.title}</td>
                <td>
                  <span className={`badge badge-${app.status === 'OFFERED' ? 'success' : app.status === 'REJECTED' || app.status === 'WITHDRAWN' ? 'secondary' : 'info'}`}>
                    {app.status}
                  </span>
                </td>
                <td>{app.offer_package ? `${app.offer_package}${app.offer_date ? ` (${app.offer_date})` : ''}` : '-'}</td>
                <td>
                  {WITHDRAWABLE_STATUSES.has(app.status) && (
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => onWithdraw(app.id)}>
                      Withdraw
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
