import React, { useEffect, useState } from 'react';
import { Upload, Download, FileText } from 'lucide-react';
import { authFetch, getAuthenticatedUrl } from '../../../services/api';

interface AdmissionAttachmentsProps {
  entityType: 'AdmissionInquiry' | 'AdmissionApplication';
  entityId: string;
}

interface DocRow {
  id: string;
  original_filename: string;
  created_at: string;
}

// Reuses the generic document-storage system (documents.routes.ts's
// entity_type/entity_id attachment convention - the same one Document
// Center itself uses) rather than building a separate admissions-only
// upload path. Staff-only visibility, matching how admissions is handled
// entirely by staff today (no applicant self-service portal exists).
export function AdmissionAttachments({ entityType, entityId }: AdmissionAttachmentsProps) {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`/documents?entity_type=${encodeURIComponent(entityType)}&entity_id=${encodeURIComponent(entityId)}`);
      if (res.ok) {
        const data = await res.json();
        setDocs(data.documents || []);
      }
    } catch {
      // Leave the list empty; the section still renders with an upload option.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'Admission');
      formData.append('entityType', entityType);
      formData.append('entityId', entityId);
      formData.append('visibility', 'staff');

      const res = await authFetch('/documents/upload', { method: 'POST', body: formData });
      if (res.ok) {
        fetchDocs();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Upload failed.');
      }
    } catch {
      setError('Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>Attached Documents</h4>
        <label className="btn btn-sm btn-outline" style={{ cursor: uploading ? 'default' : 'pointer' }}>
          <Upload size={12} /> {uploading ? 'Uploading...' : 'Upload'}
          <input type="file" style={{ display: 'none' }} onChange={handleFileChange} disabled={uploading} />
        </label>
      </div>

      {error && <p style={{ fontSize: '0.8rem', color: 'var(--danger)', marginBottom: '0.5rem' }}>{error}</p>}

      {loading ? (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading...</p>
      ) : docs.length === 0 ? (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          No documents attached yet (birth certificate, photo ID, previous marksheets, etc.)
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {docs.map((doc) => (
            <div
              key={doc.id}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontSize: '0.82rem', padding: '0.4rem 0.6rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <FileText size={14} /> {doc.original_filename}
              </span>
              <a href={getAuthenticatedUrl(`/documents/${doc.id}/download`)} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline">
                <Download size={12} />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
