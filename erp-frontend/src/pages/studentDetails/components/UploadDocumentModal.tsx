import React from 'react';

interface UploadDocumentModalProps {
  show: boolean;
  docType: string;
  setDocType: (v: string) => void;
  selectedFile: File | null;
  setSelectedFile: (f: File | null) => void;
  uploading: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function UploadDocumentModal({ show, docType, setDocType, selectedFile, setSelectedFile, uploading, onClose, onSubmit }: UploadDocumentModalProps) {
  if (!show) return null;
  return (
    <div className="modal student-details-modal">
      <div className="modal-content student-details-modal-content">
        <h3 className="student-details-title-203">Upload Student Document</h3>
        <form onSubmit={onSubmit}>

          <div className="form-group">
            <label>Document Type *</label>
            <select value={docType} onChange={e => setDocType(e.target.value)}>
              <option value="Transfer Certificate">Transfer Certificate</option>
              <option value="Birth Certificate">Birth Certificate</option>
              <option value="High School Marksheet">High School Marksheet</option>
              <option value="Identity Proof (Aadhaar/ID)">Identity Proof (Aadhaar/ID)</option>
              <option value="Medical Record">Medical Record</option>
              <option value="Other">Other Document</option>
            </select>
          </div>

          <div className="form-group student-details-form-group">
            <label>Choose File *</label>
            <input required type="file" onChange={e => { const files = e.target.files; if (files && files[0]) { setSelectedFile(files[0]); } else { setSelectedFile(null); } }} className="student-details-input-205" />
          </div>

          <div className="modal-actions student-details-modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={uploading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={uploading || !selectedFile}>
              {uploading ? 'Uploading...' : 'Upload File'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
