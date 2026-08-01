import React from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import type { Student } from '../sectionWorkspace.types';

interface StudentsTabProps {
  students: Student[];
  attendanceReport: any[];
  feeRecords: any[];
  atRiskStudents: string[];
  riskThreshold: number;
  studentsSearch: string;
  setStudentsSearch: (value: string) => void;
  studentsFilterRisk: boolean;
  setStudentsFilterRisk: (value: boolean) => void;
}

export function StudentsTab({
  students, attendanceReport, feeRecords, atRiskStudents, riskThreshold,
  studentsSearch, setStudentsSearch, studentsFilterRisk, setStudentsFilterRisk,
}: StudentsTabProps) {
  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.65rem', width: '320px' }}>
          <Search size={15} style={{ color: 'var(--text-secondary)', marginRight: '0.5rem' }} />
          <input
            type="text"
            placeholder="Search students by name or roll no..."
            value={studentsSearch}
            onChange={e => setStudentsSearch(e.target.value)}
            style={{ border: 'none', background: 'none', outline: 'none', width: '100%', fontSize: '0.85rem' }}
          />
        </div>

        <div>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={studentsFilterRisk}
              onChange={e => setStudentsFilterRisk(e.target.checked)}
            />
            <span>Show Students At Attendance Risk Only (&lt; 75%)</span>
          </label>
        </div>
      </div>

      <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Roll No.</th>
            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Student Name</th>
            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Admission No.</th>
            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Attendance Rate</th>
            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Fee Status</th>
            <th style={{ textAlign: 'right', padding: '0.5rem' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {students
            .filter(s => {
              const name = `${s.first_name} ${s.last_name}`.toLowerCase();
              const searchMatch = name.includes(studentsSearch.toLowerCase()) ||
                (s.roll_number?.toLowerCase() || '').includes(studentsSearch.toLowerCase()) ||
                s.admission_number.toLowerCase().includes(studentsSearch.toLowerCase());

              if (studentsFilterRisk) {
                return searchMatch && atRiskStudents.includes(s.id);
              }
              return searchMatch;
            })
            .map(s => {
              const studentRep = attendanceReport.find(r => r.student_id === s.id);
              const studentSessions = studentRep?.total_sessions || 0;
              const studentPresent = (studentRep?.present_count || 0) + (studentRep?.late_count || 0);
              const studentPct = studentSessions > 0 ? Math.round((studentPresent / studentSessions) * 100) : 95;

              const recordsForStudent = feeRecords.filter(f => f.student_id === s.id);
              const hasUnpaid = recordsForStudent.some(f => f.status !== 'PAID');

              return (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.65rem 0.5rem' }}>{s.roll_number || 'N/A'}</td>
                  <td style={{ padding: '0.65rem 0.5rem' }}>
                    <Link to={`/students/${s.id}`} style={{ fontWeight: '600', color: 'var(--primary)' }} className="hover-underline">
                      {s.first_name} {s.last_name}
                    </Link>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{s.email || 'No email mapped'}</div>
                  </td>
                  <td style={{ padding: '0.65rem 0.5rem' }}><code>{s.admission_number}</code></td>
                  <td style={{ padding: '0.65rem 0.5rem' }}>
                    <span style={{ fontWeight: '700', color: studentPct < riskThreshold ? 'var(--danger)' : 'var(--success)' }}>
                      {studentPct}%
                    </span>
                  </td>
                  <td style={{ padding: '0.65rem 0.5rem' }}>
                    <span className={`badge badge-${hasUnpaid ? 'warning' : 'success'}`} style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
                      {hasUnpaid ? 'Unpaid' : 'Paid'}
                    </span>
                  </td>
                  <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>
                    <Link to={`/students/${s.id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', height: 'auto' }}>
                      View Profile
                    </Link>
                  </td>
                </tr>
              );
            })}
          {students.length === 0 && (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                No students enrolled in this section.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
