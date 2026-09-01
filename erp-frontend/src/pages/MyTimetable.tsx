import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { CalendarDays, AlertCircle } from 'lucide-react';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../contexts/AuthContext';
import { TimetableTab } from './sectionWorkspace/components/TimetableTab';
import type { TimetableItem } from './sectionWorkspace/sectionWorkspace.types';

interface Child {
  student_id: string;
  name: string;
  roll_number?: string;
}

// Read-only timetable view for the Student/Parent portal - reuses the same
// grid component the staff-facing section workspace uses, but the backend
// resolves "which section" server-side (the student's own section, or the
// selected child's) rather than trusting a client-supplied section_id.
export default function MyTimetable() {
  const { user } = useAuth();
  const isParent = (user?.roles || (user?.role ? [user.role] : [])).some((r) =>
    ['parent', 'Parent', 'guardian', 'Guardian'].includes(r)
  );

  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [timetable, setTimetable] = useState<TimetableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Parents pick a child first (the /dashboard/stats endpoint already
  // resolves the caller's children list, same as the Parent dashboard).
  useEffect(() => {
    if (!isParent) return;
    api.get('/dashboard/stats')
      .then((data) => {
        const kids: Child[] = data?.children || [];
        setChildren(kids);
        if (kids[0]) setSelectedChildId(kids[0].student_id);
      })
      .catch(() => setError('Could not load your linked children.'));
  }, [isParent]);

  useEffect(() => {
    if (isParent && !selectedChildId) return;

    setLoading(true);
    setError(null);
    const query = isParent ? `?student_id=${encodeURIComponent(selectedChildId)}` : '';
    api.get(`/weekly-timetable${query}`)
      .then((data) => setTimetable(Array.isArray(data) ? data : []))
      .catch(() => setError('Could not load the timetable.'))
      .finally(() => setLoading(false));
  }, [isParent, selectedChildId]);

  return (
    <Layout>
      <div style={{ padding: '1.5rem', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <CalendarDays size={22} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
            {isParent ? "Child's Timetable" : 'My Timetable'}
          </h2>
        </div>

        {isParent && children.length > 1 && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {children.map((child) => (
              <button
                key={child.student_id}
                className="btn"
                onClick={() => setSelectedChildId(child.student_id)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: selectedChildId === child.student_id ? 'var(--primary)' : 'white',
                  color: selectedChildId === child.student_id ? 'white' : 'var(--text-main)',
                  fontWeight: 600,
                }}
              >
                {child.name}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="card" style={{ padding: '1rem', marginBottom: '1rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {loading ? (
          <SkeletonLoader />
        ) : isParent && children.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No children linked"
            description="Contact your institution administration to link your parent account with your children."
          />
        ) : (
          <TimetableTab timetable={timetable} canManageAcademic={false} />
        )}
      </div>
    </Layout>
  );
}
