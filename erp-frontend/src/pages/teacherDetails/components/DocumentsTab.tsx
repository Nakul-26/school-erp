import React from 'react';
import { Download, Trash2, Upload } from 'lucide-react';

interface DocumentsTabProps {
  teacherDocs: any[];
  canManageTeacherDocs: boolean;
  onDownload: (doc: any) => void;
  onDelete: (doc: any) => void;
  onUpload: (docId: string, label: string) => void;
}

export function DocumentsTab({ teacherDocs, canManageTeacherDocs, onDownload, onDelete, onUpload }: DocumentsTabProps) {
  return (
    <div className="card teacher-tab-panel-card">
      <h4 className="teacher-details-title-66" style={{ marginBottom: '0.25rem' }}>HR Documents Checklist</h4>
      <p className="teacher-details-text-35" style={{ marginBottom: '1.5rem' }}>
        Verify and manage crucial employee files for compliance audits.
      </p>

      <div className="teacher-details-div-96">
        <table className="teacher-details-table">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem' }}>Document Type</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem' }}>File Name</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem' }}>Uploaded Date</th>
              <th style={{ textAlign: 'right', padding: '0.75rem 0.5rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {teacherDocs.map(doc => (
              <tr key={doc.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '0.75rem 0.5rem', fontWeight: '700' }}>{doc.label}</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>
                  <span className={`badge badge-${doc.status === 'UPLOADED' ? 'success' : 'danger'}`}>
                    {doc.status}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 0.5rem', color: doc.fileName ? 'var(--text-main)' : 'var(--text-muted)' }}>
                  {doc.fileName || 'No file uploaded'}
                </td>
                <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>
                  {doc.date ? new Date(doc.date).toLocaleDateString() : '-'}
                </td>
                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                  {doc.status === 'UPLOADED' ? (
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ height: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={() => onDownload(doc)}
                      >
                        <Download size={12} /> Download
                      </button>
                      {canManageTeacherDocs && (
                        <button
                          className="btn btn-sm"
                          style={{ height: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.75rem', backgroundColor: 'var(--danger-soft)', color: 'var(--danger)', border: 'none' }}
                          onClick={() => onDelete(doc)}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      )}
                    </div>
                  ) : (
                    canManageTeacherDocs ? (
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ height: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        onClick={() => onUpload(doc.id, doc.label)}
                      >
                        <Upload size={12} /> Upload File
                      </button>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Pending</span>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
