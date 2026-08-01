import React from 'react';
import type { ElectiveOffering, StudentElectiveChoice } from '../studentDetails.types';

interface ElectivesTabProps {
  loading: boolean;
  semester: number | null;
  offerings: ElectiveOffering[];
  myElectives: StudentElectiveChoice[];
  canRegister: boolean;
  onRegister: (subjectId: string) => void;
  onWithdraw: (electiveId: string) => void;
}

export function ElectivesTab({ loading, semester, offerings, myElectives, canRegister, onRegister, onWithdraw }: ElectivesTabProps) {
  if (loading) {
    return <p className="student-details-text-118">Loading elective offerings...</p>;
  }

  const registeredBySubject = new Map(myElectives.filter(m => m.status === 'REGISTERED').map(m => [m.subject_id, m]));

  return (
    <div>
      <h3 className="student-details-title-107">Elective Subjects{semester ? ` — Semester ${semester}` : ''}</h3>

      {offerings.length === 0 ? (
        <p className="student-details-text-118">No elective subjects are offered for the current semester.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Credits</th>
              <th>Registered</th>
              <th>Eligibility</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {offerings.map(o => {
              const myChoice = registeredBySubject.get(o.subject_id);
              return (
                <tr key={o.subject_id}>
                  <td><strong>{o.subject_code}</strong> {o.subject_name}</td>
                  <td>{o.credits ?? '-'}</td>
                  <td>{o.registered_count}</td>
                  <td>
                    <span className={`badge badge-${o.is_eligible ? 'success' : 'danger'}`}>
                      {o.is_eligible ? 'Eligible' : 'Prerequisites not met'}
                    </span>
                  </td>
                  <td>
                    {canRegister && (
                      o.is_registered && myChoice ? (
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => onWithdraw(myChoice.id)}>
                          Withdraw
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={!o.is_eligible}
                          onClick={() => onRegister(o.subject_id)}
                        >
                          Register
                        </button>
                      )
                    )}
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
