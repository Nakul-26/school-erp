import React from 'react';
import { Upload, Trash2 } from 'lucide-react';

interface DocumentsTabProps {
  documents: any[];
  canManageDocs: boolean;
  onUploadClick: () => void;
  onDownload: (doc: any) => void;
  onDelete: (docId: string) => void;
}

export function DocumentsTab({ documents, canManageDocs, onUploadClick, onDownload, onDelete }: DocumentsTabProps) {
  return (
    <div>
      <div className="student-details-row-170">
        <h3 className="student-details-title-171">Digital Documents Vault</h3>
        {canManageDocs && (
          <button className="btn btn-sm btn-primary" onClick={onUploadClick}>
            <Upload size={14} /> Upload Document
          </button>
        )}
      </div>

      {documents.length > 0 ? (
        <div className="student-details-grid-172">
          {documents.map(doc => (
            <div key={doc.id} className="student-details-row-173">
              <div className="student-details-row-174" onClick={() => onDownload(doc)}>
                DOC
              </div>
              <div className="student-details-div-175" onClick={() => onDownload(doc)}>
                <h5 className="student-details-title-176" title={doc.name}>
                  {doc.name}
                </h5>
                <p className="student-details-text-177">
                  {doc.document_type} • {(doc.file_size / 1024).toFixed(1)} KB
                </p>
                <p className="student-details-text-178">
                  Uploaded: {doc.uploaded_at?.split(' ')[0]}
                </p>
              </div>
              {canManageDocs && (
                <button onClick={() => onDelete(doc.id)} className="student-details-btn-179" onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'} onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="student-details-div-180">
          <p className="student-details-text-181">No documents uploaded yet.</p>
          {canManageDocs && (
            <button className="btn btn-outline btn-sm" onClick={onUploadClick}>
              <Upload size={14} /> Upload First Document
            </button>
          )}
        </div>
      )}
    </div>
  );
}
