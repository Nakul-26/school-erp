import React from 'react';
import type { TranscriptResult } from '../studentDetails.types';

interface TranscriptTabProps {
  loading: boolean;
  transcript: TranscriptResult | null;
}

export function TranscriptTab({ loading, transcript }: TranscriptTabProps) {
  if (loading) {
    return <p className="student-details-text-118">Calculating credit-weighted GPA...</p>;
  }

  if (!transcript || transcript.semesters.length === 0) {
    return (
      <div>
        <h3 className="student-details-title-107">Academic Transcript</h3>
        <p className="student-details-text-118">No published exam results recorded yet for this program.</p>
      </div>
    );
  }

  const openBacklogs = transcript.semesters.flatMap(sem =>
    sem.subjects
      .filter(sub => !sub.is_passing)
      .map(sub => ({ ...sub, semester: sem.semester, academic_year_name: sem.academic_year_name }))
  );

  return (
    <div>
      <h3 className="student-details-title-107">Academic Transcript — {transcript.course_name}</h3>

      {openBacklogs.length > 0 && (
        <div
          style={{
            background: 'var(--danger-bg, rgba(220, 38, 38, 0.08))',
            border: '1px solid var(--danger, #dc2626)',
            borderRadius: 'var(--radius-md, 6px)',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            fontSize: '0.85rem',
          }}
        >
          <strong>{openBacklogs.length} open backlog{openBacklogs.length === 1 ? '' : 's'}:</strong>{' '}
          {openBacklogs.map((b, i) => (
            <span key={b.subject_id}>
              {i > 0 && ', '}
              {b.subject_name} (Sem {b.semester})
            </span>
          ))}
          {' '}— a supplementary exam recorded for the same semester will automatically supersede these.
        </div>
      )}

      <div className="student-details-grid-110">
        <div>
          <span className="student-details-span-111">Cumulative GPA (CGPA)</span>
          <strong className="student-details-strong-112">{transcript.cgpa !== null ? transcript.cgpa.toFixed(2) : '—'}</strong>
        </div>
        <div>
          <span className="student-details-span-113">Total Credits Earned</span>
          <strong className="student-details-strong-114">{transcript.total_credits}</strong>
        </div>
      </div>

      {transcript.semesters.map(sem => (
        <div key={`${sem.academic_year_id}-${sem.semester}`} style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h4 style={{ margin: 0 }}>
              Semester {sem.semester} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>({sem.academic_year_name})</span>
            </h4>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span className={`badge badge-${sem.result === 'PASS' ? 'success' : 'danger'}`}>{sem.result}</span>
              <strong>SGPA: {sem.sgpa !== null ? sem.sgpa.toFixed(2) : '—'}</strong>
            </div>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Subject Code</th>
                <th>Subject Name</th>
                <th>Credits</th>
                <th>Marks</th>
                <th>Percent</th>
                <th>Grade</th>
                <th>Grade Point</th>
              </tr>
            </thead>
            <tbody>
              {sem.subjects.map(sub => (
                <tr key={sub.subject_id}>
                  <td><strong>{sub.subject_code}</strong></td>
                  <td>{sub.subject_name}</td>
                  <td>{sub.credits ?? '-'}</td>
                  <td>{sub.marks_obtained} / {sub.max_marks}</td>
                  <td>{sub.percent}%</td>
                  <td>
                    <span className={`badge badge-${sub.is_passing ? 'success' : 'danger'}`}>{sub.grade}</span>
                  </td>
                  <td>{sub.grade_point}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
