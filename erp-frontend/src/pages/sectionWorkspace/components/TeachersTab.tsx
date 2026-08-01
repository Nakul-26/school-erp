import React from 'react';
import { Link } from 'react-router-dom';

interface TeachersTabProps {
  section: any;
  allTeachers: any[];
  allSubjects: any[];
  allocations: any[];
  sectionId: string | undefined;
  canManageAcademic: boolean;
}

export function TeachersTab({ section, allTeachers, allSubjects, allocations, sectionId, canManageAcademic }: TeachersTabProps) {
  const uniqueTeacherIds = Array.from(new Set(allocations.map(a => a.teacher_id)));

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--primary-soft)', border: '1px solid var(--primary-border)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '500' }}>
          ℹ️ Class teaching staff assignments are managed centrally.
        </span>
        {canManageAcademic && (
          <Link to="/academic-setup?tab=assignments" style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary)' }} className="hover-underline">
            Go to Subject Assignments →
          </Link>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        <div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '0.75rem' }}>Class Teacher Advisor</h4>
          {section.class_teacher_name ? (
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', background: 'var(--bg-subtle)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>
                {section.class_teacher_name.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{section.class_teacher_name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Primary Advisor & Roster Lead</div>
              </div>
            </div>
          ) : (
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No Advisor mapped.
            </div>
          )}
        </div>

        <div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '0.75rem' }}>Subject Instructors</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {uniqueTeacherIds.map(tId => {
              const teacher = allTeachers.find(t => t.id === tId);
              if (!teacher) return null;

              const teacherAllocations = allocations.filter(a => a.teacher_id === tId && a.section_id === sectionId);
              const subjectNames = teacherAllocations.map(a => {
                const sub = allSubjects.find(s => s.id === a.subject_id);
                return sub?.subject_name;
              }).filter(Boolean).join(', ');

              return (
                <div key={tId} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-subtle)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.85rem' }}>
                    {teacher.first_name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.85rem' }}>{teacher.first_name} {teacher.last_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Teaches: {subjectNames}</div>
                  </div>
                </div>
              );
            })}
            {allocations.length === 0 && (
              <div style={{ color: 'var(--text-secondary)' }}>No instructors assigned to this class section.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
