import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { PrerequisiteLink } from '../classes.types';

interface PrerequisitesPanelProps {
  links: PrerequisiteLink[];
  subjects: any[];
  canManage: boolean;
  onAdd: (subjectId: string, prerequisiteSubjectId: string) => Promise<void> | void;
  onDelete: (id: string) => void;
}

export function PrerequisitesPanel({ links, subjects, canManage, onAdd, onDelete }: PrerequisitesPanelProps) {
  const [subjectId, setSubjectId] = useState('');
  const [prereqId, setPrereqId] = useState('');

  const handleAdd = async () => {
    if (!subjectId || !prereqId) return;
    await onAdd(subjectId, prereqId);
    setSubjectId('');
    setPrereqId('');
  };

  return (
    <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color, #e5e7eb)', paddingTop: '1rem' }}>
      <h4 style={{ margin: '0 0 0.5rem 0' }}>Subject Prerequisites</h4>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
        Define which subjects a student must have already passed before taking another subject in this program.
      </p>

      {canManage && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.25rem' }}>
              Subject
            </label>
            <select value={subjectId} onChange={e => setSubjectId(e.target.value)}>
              <option value="">Select subject...</option>
              {subjects.map((s: any) => (
                <option key={s.id} value={s.id}>{s.subject_code} — {s.subject_name}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.25rem' }}>
              Requires (Prerequisite)
            </label>
            <select value={prereqId} onChange={e => setPrereqId(e.target.value)}>
              <option value="">Select prerequisite...</option>
              {subjects.filter((s: any) => s.id !== subjectId).map((s: any) => (
                <option key={s.id} value={s.id}>{s.subject_code} — {s.subject_name}</option>
              ))}
            </select>
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleAdd} disabled={!subjectId || !prereqId}>
            <Plus size={14} /> Add Link
          </button>
        </div>
      )}

      {links.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No prerequisite links defined for this program.</p>
      ) : (
        <table className="table classes-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Requires</th>
              {canManage && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {links.map(link => (
              <tr key={link.id}>
                <td><code>{link.subject_code}</code> {link.subject_name}</td>
                <td><code>{link.prerequisite_code}</code> {link.prerequisite_name}</td>
                {canManage && (
                  <td>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => onDelete(link.id)}>
                      <X size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
