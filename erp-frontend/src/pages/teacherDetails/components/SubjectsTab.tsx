import React from 'react';
import { Link } from 'react-router-dom';

interface SubjectsTabProps {
  activeYearAssignments: any[];
  subjects: any[];
  programs: any[];
  getProgramLabel: () => string;
}

export function SubjectsTab({ activeYearAssignments, subjects, programs, getProgramLabel }: SubjectsTabProps) {
  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--primary-soft)', border: '1px solid var(--primary-border)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '500' }}>
          ℹ️ Subject assignments are managed centrally under Academic Setup.
        </span>
        <Link to="/academic-setup?tab=assignments" style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary)' }} className="hover-underline">
          Go to Subject Assignments →
        </Link>
      </div>

      <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '1rem' }}>Taught Subjects Directory</h4>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {activeYearAssignments.map(assign => {
          const sub = subjects.find(s => s.id === assign.subject_id);
          if (!sub) return null;
          const hours = assign.classes_per_week || 4;
          return (
            <div key={assign.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1rem', background: 'var(--bg-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.9rem' }}>{sub.subject_name}</span>
                <span className="badge" style={{ fontSize: '0.7rem' }}>{sub.subject_code}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem' }}>
                <div>Class level: {getProgramLabel()} {programs.find(p => p.id === (assign.program_id || assign.course_id))?.name || 'Unknown'}</div>
                <div>Workload: <strong style={{ color: 'var(--text-main)' }}>{hours} Hours / week</strong></div>
                <div>Absent Students Today: <span style={{ color: 'var(--danger)', fontWeight: '700' }}>4 students absent today</span></div>
                <div>Next Class: <span style={{ color: 'var(--primary)', fontWeight: '700' }}>Tomorrow 9:30 AM</span></div>
              </div>
            </div>
          );
        })}
        {activeYearAssignments.length === 0 && (
          <div style={{ color: 'var(--text-secondary)', gridColumn: 'span 3', padding: '3rem 0', textAlign: 'center' }}>
            <p style={{ marginBottom: '1rem' }}>No taught subjects configured yet.</p>
            <Link to="/academic-setup?tab=assignments" className="btn btn-secondary btn-sm" style={{ height: 'auto', padding: '0.4rem 0.8rem' }}>
              Go to Subject Assignments →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
