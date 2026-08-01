import React from 'react';
import { Plus } from 'lucide-react';
import type { Semester, AcademicYear } from '../classes.types';

interface SemestersPanelProps {
  academicYears: AcademicYear[];
  selectedAcademicYearId: string;
  setSelectedAcademicYearId: (id: string) => void;
  semesters: Semester[];
  loading: boolean;
  canManage: boolean;
  onAdd: () => void;
  onStatusChange: (semester: Semester, status: Semester['status']) => void;
  onDelete: (semester: Semester) => void;
}

const NEXT_STATUS: Record<Semester['status'], Semester['status'] | null> = {
  Draft: 'Active',
  Active: 'Locked',
  Locked: 'Archived',
  Archived: null,
};

export function SemestersPanel({
  academicYears, selectedAcademicYearId, setSelectedAcademicYearId,
  semesters, loading, canManage, onAdd, onStatusChange, onDelete,
}: SemestersPanelProps) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ margin: 0, minWidth: '220px' }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.25rem' }}>
            Academic Year
          </label>
          <select value={selectedAcademicYearId} onChange={e => setSelectedAcademicYearId(e.target.value)}>
            {academicYears.map(y => (
              <option key={y.id} value={y.id}>{y.name}</option>
            ))}
          </select>
        </div>
        {canManage && (
          <button type="button" className="btn btn-primary btn-sm" onClick={onAdd} disabled={!selectedAcademicYearId}>
            <Plus size={14} /> Add Semester
          </button>
        )}
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading semesters...</p>
      ) : semesters.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          No semesters defined yet for this program in the selected academic year.
        </p>
      ) : (
        <table className="table classes-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Start</th>
              <th>End</th>
              <th>Status</th>
              <th>Enrolled</th>
              {canManage && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {semesters.map(sem => {
              const next = NEXT_STATUS[sem.status];
              return (
                <tr key={sem.id}>
                  <td>{sem.semester_number}</td>
                  <td>{sem.name}</td>
                  <td>{sem.start_date || '-'}</td>
                  <td>{sem.end_date || '-'}</td>
                  <td>
                    <span className={`badge badge-${sem.status === 'Active' ? 'success' : sem.status === 'Archived' ? 'secondary' : sem.status === 'Locked' ? 'warning' : 'info'}`}>
                      {sem.status}
                    </span>
                  </td>
                  <td>{sem.enrolled_count ?? 0}</td>
                  {canManage && (
                    <td style={{ display: 'flex', gap: '0.5rem' }}>
                      {next && (
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onStatusChange(sem, next)}>
                          {next === 'Active' ? 'Activate' : next === 'Locked' ? 'Lock' : 'Archive'}
                        </button>
                      )}
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => onDelete(sem)}>
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
