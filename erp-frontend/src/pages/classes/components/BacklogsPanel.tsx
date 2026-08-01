import React from 'react';
import type { StudentBacklogs } from '../classes.types';

interface BacklogsPanelProps {
  loading: boolean;
  backlogs: StudentBacklogs[];
}

export function BacklogsPanel({ loading, backlogs }: BacklogsPanelProps) {
  if (loading) {
    return <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Scanning transcripts for open backlogs...</p>;
  }

  if (backlogs.length === 0) {
    return (
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        No open backlogs found — every student with recorded results has cleared all subjects so far.
      </p>
    );
  }

  return (
    <div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
        {backlogs.length} student{backlogs.length === 1 ? '' : 's'} with unresolved failing subjects.
        To clear a backlog, create a supplementary exam for the same semester dated after the original —
        the transcript automatically keeps the latest attempt per subject.
      </p>
      {backlogs.map(sb => (
        <div key={sb.student_id} style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', gap: '0.75rem' }}>
            <strong>{sb.student_name}</strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Roll {sb.roll_number || '-'} &middot; Adm# {sb.admission_number}
            </span>
            <span className="badge badge-danger">{sb.open_backlog_count} open</span>
          </div>
          <table className="table classes-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Semester</th>
                <th>Academic Year</th>
                <th>Marks</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              {sb.open_backlogs.map(b => (
                <tr key={`${sb.student_id}-${b.subject_id}`}>
                  <td><code>{b.subject_code}</code> {b.subject_name}</td>
                  <td>{b.semester}</td>
                  <td>{b.academic_year_name}</td>
                  <td>{b.marks_obtained} / {b.max_marks}</td>
                  <td><span className="badge badge-danger">{b.grade}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
