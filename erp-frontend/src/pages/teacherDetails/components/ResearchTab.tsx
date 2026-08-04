import React from 'react';
import { Plus, Trash2, ExternalLink, BookMarked } from 'lucide-react';

interface Publication {
  id: string;
  title: string;
  publication_type: string;
  venue_name: string | null;
  publication_date: string | null;
  co_authors: string | null;
  doi_or_url: string | null;
  description: string | null;
}

interface ResearchTabProps {
  publications: Publication[];
  canManage: boolean;
  onAdd: () => void;
  onDelete: (id: string) => void;
}

export function ResearchTab({ publications, canManage, onAdd, onDelete }: ResearchTabProps) {
  return (
    <div className="card teacher-tab-panel-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <h4 className="teacher-details-title-66" style={{ marginBottom: '0.25rem' }}>Research &amp; Publications</h4>
          <p className="teacher-details-text-35">Journal articles, conference papers, books, and patents.</p>
        </div>
        {canManage && (
          <button className="btn btn-primary btn-sm" onClick={onAdd} style={{ height: 'auto', padding: '0.4rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <Plus size={14} /> Add Publication
          </button>
        )}
      </div>

      {publications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem 0', color: 'var(--text-muted)' }}>
          <BookMarked size={32} style={{ marginBottom: '0.5rem' }} />
          <p>No research or publication records yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {publications.map(pub => (
            <div key={pub.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span className="badge">{pub.publication_type.replace('_', ' ')}</span>
                    {pub.publication_date && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{new Date(pub.publication_date).toLocaleDateString()}</span>}
                  </div>
                  <strong style={{ fontSize: '0.95rem' }}>{pub.title}</strong>
                  {pub.venue_name && <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{pub.venue_name}</div>}
                  {pub.co_authors && <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Co-authors: {pub.co_authors}</div>}
                  {pub.description && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>{pub.description}</p>}
                  {pub.doi_or_url && (
                    <a href={pub.doi_or_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                      <ExternalLink size={12} /> View
                    </a>
                  )}
                </div>
                {canManage && (
                  <button
                    className="btn btn-sm"
                    style={{ height: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.75rem', backgroundColor: 'var(--danger-soft)', color: 'var(--danger)', border: 'none' }}
                    onClick={() => onDelete(pub.id)}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
