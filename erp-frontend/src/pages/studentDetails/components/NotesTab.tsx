import React from 'react';
import { Trash2 } from 'lucide-react';

interface NotesTabProps {
  notes: any[];
  newNote: string;
  setNewNote: (v: string) => void;
  addingNote: boolean;
  canWriteNotes: boolean;
  onAddNote: (e: React.FormEvent) => void;
  onDeleteNote: (noteId: string) => void;
}

export function NotesTab({ notes, newNote, setNewNote, addingNote, canWriteNotes, onAddNote, onDeleteNote }: NotesTabProps) {
  return (
    <div>
      <h3 className="student-details-title-160">Internal Student Notes</h3>

      {/* Note creation form */}
      <form onSubmit={onAddNote} className="student-details-form-161">
        <div className="form-group student-details-form-group">
          <textarea
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            placeholder="Record parent meetings, disciplinary updates, or exceptional academic behavior notes here..."
            rows={3}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary btn-sm" disabled={addingNote}>
          {addingNote ? 'Adding...' : 'Post Internal Note'}
        </button>
      </form>

      {/* Notes list */}
      <div className="student-details-col-163">
        {notes.map(note => (
          <div key={note.id} className="student-details-col-164">
            <p className="student-details-text-165">
              {note.content}
            </p>
            <div className="student-details-row-166">
              <span>Author: <strong>{note.author_name}</strong></span>
              <span>Posted: {note.created_at?.split('.')[0] || note.created_at}</span>
            </div>
            {canWriteNotes && (
              <button onClick={() => onDeleteNote(note.id)} className="student-details-btn-167" onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'} onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
        {notes.length === 0 && (
          <div className="student-details-div-168">
            <p className="student-details-text-169">No internal notes recorded for this student.</p>
          </div>
        )}
      </div>
    </div>
  );
}
