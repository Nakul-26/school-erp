import React from 'react';
import { FileText } from 'lucide-react';

interface ExamsTabProps {
  filteredExams: any[];
  allSubjects: any[];
}

export function ExamsTab({ filteredExams, allSubjects }: ExamsTabProps) {
  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '1.25rem' }}>Scheduled Class Examinations</h4>

      {filteredExams.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
          <FileText size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
          <p>No active exams scheduled for this class section.</p>
        </div>
      ) : (
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Exam Name</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Term / Description</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Subject Mapped</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Dates</th>
              <th style={{ textAlign: 'right', padding: '0.5rem' }}>Max Marks</th>
            </tr>
          </thead>
          <tbody>
            {filteredExams.map(exam => (
              <tr key={exam.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '0.65rem 0.5rem', fontWeight: '600', color: 'var(--text-main)' }}>{exam.name}</td>
                <td style={{ padding: '0.65rem 0.5rem', color: 'var(--text-secondary)' }}>{exam.term || 'General Assessment'}</td>
                <td style={{ padding: '0.65rem 0.5rem' }}>{allSubjects.find(s => s.id === exam.subject_id)?.subject_name || 'All Subjects'}</td>
                <td style={{ padding: '0.65rem 0.5rem' }}><code>{new Date(exam.start_date).toLocaleDateString()} - {new Date(exam.end_date).toLocaleDateString()}</code></td>
                <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', fontWeight: '700' }}>{exam.max_marks || 100}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
