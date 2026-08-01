import React from 'react';
import { Calendar } from 'lucide-react';

interface TimetableTabProps {
  timetableSlots: any[];
  timetableEntries: any[];
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function TimetableTab({ timetableSlots, timetableEntries }: TimetableTabProps) {
  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '1.25rem' }}>Weekly Teacher Schedule</h4>
      {timetableSlots.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
          <Calendar size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
          <p>No timetable configurations created yet.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Slot Time</th>
                {WEEKDAYS.map(day => (
                  <th key={day} style={{ textAlign: 'left', padding: '0.5rem' }}>{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timetableSlots
                .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
                .map(slot => (
                  <tr key={slot.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.65rem 0.5rem', fontWeight: '700' }}>
                      <div>{slot.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>{slot.start_time} - {slot.end_time}</div>
                    </td>
                    {WEEKDAYS.map(day => {
                      const entry = timetableEntries.find(e => e.slot_id === slot.id && e.day_of_week === day);
                      return (
                        <td key={day} style={{ padding: '0.65rem 0.5rem', background: entry ? 'var(--primary-soft)' : 'none' }}>
                          {entry ? (
                            <div>
                              <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{entry.subject_name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Class: {entry.section_name}</div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
