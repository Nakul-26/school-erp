import React from 'react';
import { Link } from 'react-router-dom';

interface SubjectsTabProps {
  section: any;
  allSubjects: any[];
  allTeachers: any[];
  allocations: any[];
  sectionId: string | undefined;
  canManageAcademic: boolean;
}

export function SubjectsTab({ section, allSubjects, allTeachers, allocations, sectionId, canManageAcademic }: SubjectsTabProps) {
  const sectionSubjects = allSubjects.filter(sub => sub.course_id === section.course_id);

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--primary-soft)', border: '1px solid var(--primary-border)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '500' }}>
          ℹ️ Subject assignments are managed centrally. Edit allocations under academic setup.
        </span>
        {canManageAcademic && (
          <Link to="/academic-setup?tab=assignments" style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary)' }} className="hover-underline">
            Go to Subject Assignments →
          </Link>
        )}
      </div>

      <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '1rem' }}>Mapped Curriculum Subjects</h4>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {sectionSubjects.map(sub => {
          const alloc = allocations.find(a => a.subject_id === sub.id && a.section_id === sectionId);
          const teacher = alloc ? allTeachers.find(t => t.id === alloc.teacher_id) : null;
          const teacherName = teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Unassigned';

          return (
            <div key={sub.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1rem', background: 'var(--bg-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.9rem' }}>{sub.subject_name}</span>
                <span className="badge" style={{ fontSize: '0.7rem' }}>{sub.subject_code}</span>
              </div>
              <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Instructor:</span>
                  <span style={{ fontWeight: '600', color: teacher ? 'var(--text-main)' : 'var(--text-muted)' }}>{teacherName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Periods/Week:</span>
                  <span style={{ fontWeight: '600' }}>{sub.weekly_hours || 4} Periods</span>
                </div>
              </div>
            </div>
          );
        })}
        {sectionSubjects.length === 0 && (
          <div style={{ color: 'var(--text-secondary)', padding: '1rem 0' }}>No subjects defined for this curriculum grade.</div>
        )}
      </div>
    </div>
  );
}
