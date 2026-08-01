import React from 'react';
import { Link } from 'react-router-dom';

interface ClassesTabProps {
  activeYearAssignments: any[];
  sections: any[];
  subjects: any[];
}

export function ClassesTab({ activeYearAssignments, sections, subjects }: ClassesTabProps) {
  const uniqueSectionIds = Array.from(new Set(activeYearAssignments.map(a => a.section_id)));

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--primary-soft)', border: '1px solid var(--primary-border)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '500' }}>
          ℹ️ Class allocations are managed centrally.
        </span>
        <Link to="/academic-setup?tab=assignments" style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary)' }} className="hover-underline">
          Go to Subject Assignments →
        </Link>
      </div>

      <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '1rem' }}>Mapped Class Sections</h4>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
        {uniqueSectionIds.map(secId => {
          const sec = sections.find(s => s.id === secId);
          if (!sec) return null;
          const secAssignments = activeYearAssignments.filter(a => a.section_id === secId);
          const subNames = secAssignments.map(a => {
            const sub = subjects.find(s => s.id === a.subject_id);
            return sub?.subject_name;
          }).filter(Boolean).join(', ');

          return (
            <div key={secId} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1rem', background: 'var(--bg-subtle)' }}>
              <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '0.5rem' }}>Section {sec.name}</div>
              <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div>Room No: <strong style={{ color: 'var(--text-main)' }}>{sec.room || 'No Room Mapped'}</strong></div>
                <div>Taught Subjects: <strong style={{ color: 'var(--text-main)' }}>{subNames}</strong></div>
                <div>Enrolled Students: <strong style={{ color: 'var(--text-main)' }}>42 students</strong></div>
                <div>Weekly Periods: <strong style={{ color: 'var(--text-main)' }}>7 periods</strong></div>
              </div>
            </div>
          );
        })}
        {activeYearAssignments.length === 0 && (
          <div style={{ color: 'var(--text-secondary)', gridColumn: 'span 3', padding: '3rem 0', textAlign: 'center' }}>
            <p style={{ marginBottom: '1rem' }}>No classes mapped yet.</p>
            <Link to="/academic-setup?tab=assignments" className="btn btn-secondary btn-sm" style={{ height: 'auto', padding: '0.4rem 0.8rem' }}>
              Go to Subject Assignments →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
