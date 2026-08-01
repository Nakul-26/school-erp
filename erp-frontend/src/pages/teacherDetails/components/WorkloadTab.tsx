import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface WorkloadTabProps {
  activeYearAssignments: any[];
  subjects: any[];
  sections: any[];
  totalAllocatedPeriods: number;
  isOverloaded: boolean;
}

export function WorkloadTab({ activeYearAssignments, subjects, sections, totalAllocatedPeriods, isOverloaded }: WorkloadTabProps) {
  const percent = Math.min(100, Math.round((totalAllocatedPeriods / 24) * 100));
  const barBlocks = Math.min(10, Math.round(percent / 10));
  const barStr = '█'.repeat(barBlocks) + '░'.repeat(10 - barBlocks);

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '1.25rem' }}>Teacher Workload Breakdown</h4>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        <div>
          <h5 style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.75rem' }}>Weekly Workload Balance Meter</h5>

          <div style={{ padding: '1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '1.65rem', letterSpacing: '4px', color: isOverloaded ? 'var(--danger)' : 'var(--success)' }}>
              {barStr}
            </div>
            <div style={{ marginTop: '0.75rem', fontWeight: '800', fontSize: '1.25rem', color: 'var(--text-main)' }}>
              {totalAllocatedPeriods} / 24 hours
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              {percent}% Load &bull; <strong style={{ color: isOverloaded ? 'var(--danger)' : 'var(--success)' }}>{isOverloaded ? 'Overloaded' : percent > 75 ? 'Optimal Heavy' : 'Healthy'}</strong>
            </div>
          </div>

          {isOverloaded && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid var(--danger-border)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <div>
                <strong>Overload Warning:</strong> This teacher's mapped assignments exceed the healthy workload of 24 periods per week. Reallocate some subjects to other teachers in Academic Setup.
              </div>
            </div>
          )}
        </div>

        <div>
          <h5 style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.75rem' }}>Breakdown by Class & Subject</h5>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Class</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Subject</th>
                <th style={{ textAlign: 'right', padding: '0.5rem' }}>Periods</th>
              </tr>
            </thead>
            <tbody>
              {activeYearAssignments.map(assign => {
                const sub = subjects.find(s => s.id === assign.subject_id);
                const sec = sections.find(s => s.id === assign.section_id);
                const hours = assign.classes_per_week || 4;
                return (
                  <tr key={assign.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.5rem' }}>{sec?.name || 'Unknown'}</td>
                    <td style={{ padding: '0.5rem' }}>{sub?.subject_name || 'Unknown'}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '700' }}>{hours} Hours</td>
                  </tr>
                );
              })}
              {activeYearAssignments.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>No assignments recorded.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
