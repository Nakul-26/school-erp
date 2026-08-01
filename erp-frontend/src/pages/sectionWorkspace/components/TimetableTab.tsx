import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import type { TimetableItem } from '../sectionWorkspace.types';

interface TimetableTabProps {
  timetable: TimetableItem[];
  canManageAcademic: boolean;
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function TimetableTab({ timetable, canManageAcademic }: TimetableTabProps) {
  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)' }}>Weekly Timetable Schedule</h4>
        {canManageAcademic && (
          <Link to="/timetable" className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto' }}>
            Open Timetable Editor
          </Link>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        {timetable.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
            <Calendar size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
            <p>No timetable entries scheduled for this class section.</p>
          </div>
        ) : (
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Day</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Slot Time</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Subject</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Instructor</th>
              </tr>
            </thead>
            <tbody>
              {WEEKDAYS.map(day => {
                const dayEntries = timetable.filter(t => t.day_of_week === day);
                if (dayEntries.length === 0) return null;
                return dayEntries.map((entry, index) => (
                  <tr key={entry.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    {index === 0 && (
                      <td rowSpan={dayEntries.length} style={{ padding: '0.65rem 0.5rem', fontWeight: '700', background: 'var(--bg-subtle)', verticalAlign: 'top', width: '100px' }}>
                        {day}
                      </td>
                    )}
                    <td style={{ padding: '0.65rem 0.5rem' }}><code>{entry.start_time} - {entry.end_time}</code></td>
                    <td style={{ padding: '0.65rem 0.5rem', fontWeight: '600' }}>{entry.subject_name}</td>
                    <td style={{ padding: '0.65rem 0.5rem' }}>{entry.teacher_name}</td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
