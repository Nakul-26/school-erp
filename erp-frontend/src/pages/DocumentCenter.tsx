import React, { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmDialogContext';
import { authFetch } from '../services/api';
import './DocumentCenter.css';

interface DocumentMetadata {
  id: string;
  institution_id: string;
  entity_type: string;
  entity_id: string;
  category: string;
  original_filename: string;
  stored_filename: string;
  mime_type: string;
  extension: string;
  size_bytes: number;
  checksum_sha256: string;
  storage_provider: string;
  storage_key: string;
  version: number;
  status: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  visibility: 'all' | 'staff';
}

interface DocumentVersion {
  id: string;
  document_id: string;
  version: number;
  original_filename: string;
  stored_filename: string;
  size_bytes: number;
  checksum_sha256: string;
  storage_key: string;
  uploaded_by: string;
  change_summary?: string | null;
  created_at: string;
}

interface StorageStats {
  totalDocuments: number;
  totalSizeBytes: number;
  totalSizeMB: number;
  categoryBreakdown: Record<string, number>;
  largestFiles: DocumentMetadata[];
  monthlyUploadsCount: number;
}

const DocumentCenter: React.FC = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<'explorer' | 'upload' | 'analytics' | 'archive'>('explorer');
  const [loading, setLoading] = useState<boolean>(true);

  // Data States
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [totalDocs, setTotalDocs] = useState<number>(0);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [archivedDocs, setArchivedDocs] = useState<DocumentMetadata[]>([]);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Selected items
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [selectedDocVersions, setSelectedDocVersions] = useState<{ doc: DocumentMetadata; versions: DocumentVersion[] } | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentMetadata | null>(null);
  const [newVersionDoc, setNewVersionDoc] = useState<DocumentMetadata | null>(null);

  // Upload Form
  const [uploadCategory, setUploadCategory] = useState<string>('Admissions');
  const [uploadEntityType, setUploadEntityType] = useState<string>('Student');
  const [uploadEntityId, setUploadEntityId] = useState<string>('stud-101');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadChangeSummary, setUploadChangeSummary] = useState<string>('Initial document upload');
  const [uploadVisibility, setUploadVisibility] = useState<'all' | 'staff'>('all');

  // Version Form
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [versionChangeSummary, setVersionChangeSummary] = useState<string>('Updated version');

  useEffect(() => {
    fetchData();
  }, [activeTab, categoryFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const sRes = await authFetch('/documents/stats/dashboard');
      if (sRes.ok) setStats(await sRes.json());

      if (activeTab === 'explorer') {
        let url = '/documents?limit=50&status=AVAILABLE';
        if (categoryFilter) url += `&category=${categoryFilter}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
        const dRes = await authFetch(url);
        if (dRes.ok) {
          const data = await dRes.json();
          setDocuments(data.documents || []);
          setTotalDocs(data.total || 0);
        }
      }

      if (activeTab === 'archive') {
        const aRes = await authFetch('/documents?limit=50&status=ARCHIVED');
        if (aRes.ok) {
          const data = await aRes.json();
          setArchivedDocs(data.documents || []);
        }
      }
    } catch (err) {
      console.error('Failed to load Documents data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error('Please select a file to upload');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('category', uploadCategory);
      formData.append('entityType', uploadEntityType);
      formData.append('entityId', uploadEntityId);
      formData.append('changeSummary', uploadChangeSummary);
      formData.append('visibility', uploadVisibility);

      const res = await authFetch('/documents/upload', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        toast.success('Document uploaded successfully!');
        setShowUploadModal(false);
        setUploadFile(null);
        fetchData();
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Upload failed');
      }
    } catch (err) {
      toast.error('Upload error occurred');
    }
  };

  const handleVersionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionDoc || !versionFile) return;

    try {
      const buffer = await versionFile.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i] ?? 0);
      }
      const base64 = btoa(binary);

      const res = await authFetch(`/documents/${newVersionDoc.id}/version`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalFilename: versionFile.name,
          mimeType: versionFile.type || 'application/pdf',
          contentBase64: base64,
          changeSummary: versionChangeSummary
        })
      });

      if (res.ok) {
        toast.success('New document version uploaded!');
        setNewVersionDoc(null);
        setVersionFile(null);
        fetchData();
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Failed to upload version');
      }
    } catch (err) {
      toast.error('Failed to submit new version');
    }
  };

  const handleDownloadSignedUrl = async (docId: string) => {
    try {
      const res = await authFetch(`/documents/${docId}/signed-url`);
      if (res.ok) {
        const data = await res.json();
        window.open(`/documents/${docId}/download`, '_blank');
        toast.success('Generated signed download token!');
      }
    } catch (err) {
      toast.error('Failed to generate download URL');
    }
  };

  const handleFetchVersions = async (doc: DocumentMetadata) => {
    try {
      const res = await authFetch(`/documents/${doc.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedDocVersions({ doc, versions: data.versions || [] });
      }
    } catch (err) {
      toast.error('Failed to fetch version history');
    }
  };

  const handleArchive = async (docId: string) => {
    try {
      const res = await authFetch(`/documents/${docId}/archive`, { method: 'POST' });
      if (res.ok) {
        toast.info('Document moved to archive');
        fetchData();
      }
    } catch (err) {
      toast.error('Archive action failed');
    }
  };

  const handleRestore = async (docId: string) => {
    try {
      const res = await authFetch(`/documents/${docId}/restore`, { method: 'POST' });
      if (res.ok) {
        toast.success('Document restored to available items');
        fetchData();
      }
    } catch (err) {
      toast.error('Restore action failed');
    }
  };

  const handleSoftDelete = async (docId: string) => {
    if (!await confirm('Move this document to trash?')) return;
    try {
      const res = await authFetch(`/documents/${docId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.info('Document moved to trash');
        fetchData();
      }
    } catch (err) {
      toast.error('Delete action failed');
    }
  };

  const getFileBadgeClass = (ext: string) => {
    if (['pdf'].includes(ext)) return 'file-pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext)) return 'file-img';
    if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) return 'file-doc';
    return 'file-generic';
  };

  return (
    <div className="doc-center-container">
      {/* Header */}
      <div className="doc-center-header">
        <div className="doc-center-title-group">
          <h1>
            📁 Central Document & File Platform
            <span className="category-badge" style={{ background: '#dcfce7', color: '#166534' }}>
              Storage Provider: R2 / Unified
            </span>
          </h1>
          <p className="doc-center-subtitle">
            Platform-wide storage abstraction, secure signed URLs, checksum validation & version history
          </p>
        </div>
        <div className="doc-center-actions">
          <button className="btn btn-secondary" onClick={fetchData} disabled={loading}>
            🔄 Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
            + Upload Document
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      {stats && (
        <div className="doc-metrics-grid">
          <div className="doc-metric-card doc-metric-card-primary">
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>TOTAL DOCUMENTS</span>
            <span style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>{stats.totalDocuments}</span>
          </div>
          <div className="doc-metric-card doc-metric-card-success">
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>TOTAL STORAGE USED</span>
            <span style={{ fontSize: '28px', fontWeight: 800, color: '#16a34a' }}>{stats.totalSizeMB} MB</span>
          </div>
          <div className="doc-metric-card doc-metric-card-purple">
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>MONTHLY UPLOADS</span>
            <span style={{ fontSize: '28px', fontWeight: 800, color: '#9333ea' }}>{stats.monthlyUploadsCount}</span>
          </div>
          <div className="doc-metric-card doc-metric-card-orange">
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>ACTIVE CATEGORIES</span>
            <span style={{ fontSize: '28px', fontWeight: 800, color: '#ea580c' }}>
              {Object.keys(stats.categoryBreakdown).length}
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="doc-center-tabs">
        <button
          className={`doc-tab-btn ${activeTab === 'explorer' ? 'active' : ''}`}
          onClick={() => setActiveTab('explorer')}
        >
          📂 Master Document Explorer
        </button>
        <button
          className={`doc-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          📊 Storage Analytics
        </button>
        <button
          className={`doc-tab-btn ${activeTab === 'archive' ? 'active' : ''}`}
          onClick={() => setActiveTab('archive')}
        >
          🗄️ Archive ({archivedDocs.length})
        </button>
      </div>

      {/* TAB 1: MASTER DOCUMENT EXPLORER */}
      {activeTab === 'explorer' && (
        <div>
          <div className="doc-filter-bar">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All Categories</option>
              <option value="Admissions">Admissions</option>
              <option value="Certificates">Certificates</option>
              <option value="Marksheets">Marksheets</option>
              <option value="Receipts">Receipts</option>
              <option value="Assignments">Assignments</option>
              <option value="Photos">Photos</option>
              <option value="Contracts">Contracts</option>
              <option value="Medical">Medical</option>
              <option value="Finance">Finance</option>
            </select>

            <input
              type="text"
              placeholder="Search filename, entity or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchData()}
            />

            <button className="btn btn-secondary" onClick={fetchData}>
              Apply Search
            </button>
          </div>

          <div className="doc-table-container">
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Document Name</th>
                  <th>Category</th>
                  <th>Entity Target</th>
                  <th>Size (KB)</th>
                  <th>Storage Provider</th>
                  <th>Version</th>
                  <th>Uploaded At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                      No documents found in current filter.
                    </td>
                  </tr>
                ) : (
                  documents.map(d => (
                    <tr key={d.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span className={`file-type-icon ${getFileBadgeClass(d.extension)}`}>
                            {d.extension}
                          </span>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{d.original_filename}</div>
                            <div style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>{d.id}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="category-badge">{d.category}</span></td>
                      <td>{d.entity_type}: <code>{d.entity_id}</code></td>
                      <td>{Math.round(d.size_bytes / 1024)} KB</td>
                      <td><code>{d.storage_provider}</code></td>
                      <td><span style={{ fontWeight: 700, color: '#2563eb' }}>v{d.version}</span></td>
                      <td>{new Date(d.created_at).toLocaleString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-sm btn-primary" onClick={() => handleDownloadSignedUrl(d.id)}>
                            ⬇ Download
                          </button>
                          <button className="btn btn-sm btn-outline" onClick={() => handleFetchVersions(d)}>
                            History
                          </button>
                          <button className="btn btn-sm btn-secondary" onClick={() => setNewVersionDoc(d)}>
                            + Version
                          </button>
                          <button className="btn btn-sm btn-outline" onClick={() => handleArchive(d.id)}>
                            Archive
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleSoftDelete(d.id)}>
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: STORAGE ANALYTICS */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="doc-table-container" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>📈 Storage Distribution by Category</h3>
            {stats && Object.entries(stats.categoryBreakdown).map(([cat, count]) => (
              <div key={cat} style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                  <span>{cat}</span>
                  <strong>{count} file(s)</strong>
                </div>
                <div style={{ background: '#f1f5f9', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      background: '#2563eb',
                      height: '100%',
                      width: `${Math.min(100, (count / (stats.totalDocuments || 1)) * 100)}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="doc-table-container" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>🐘 Largest Stored Files</h3>
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Category</th>
                  <th>Size</th>
                </tr>
              </thead>
              <tbody>
                {stats?.largestFiles.map(f => (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 600 }}>{f.original_filename}</td>
                    <td>{f.category}</td>
                    <td>{Math.round(f.size_bytes / 1024)} KB</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ARCHIVED DOCUMENTS */}
      {activeTab === 'archive' && (
        <div className="doc-table-container">
          <table className="doc-table">
            <thead>
              <tr>
                <th>Original Name</th>
                <th>Category</th>
                <th>Version</th>
                <th>Archived Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {archivedDocs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    No archived documents found.
                  </td>
                </tr>
              ) : (
                archivedDocs.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 700 }}>{a.original_filename}</td>
                    <td><span className="category-badge">{a.category}</span></td>
                    <td>v{a.version}</td>
                    <td>{new Date(a.updated_at).toLocaleString()}</td>
                    <td>
                      <button className="btn btn-sm btn-primary" onClick={() => handleRestore(a.id)}>
                        Restore to Explorer
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: UPLOAD DOCUMENT */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">+ Upload Document to Central Repository</h3>
              <button className="modal-close-btn" onClick={() => setShowUploadModal(false)}>✕</button>
            </div>
            <form onSubmit={handleUploadSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Select File</label>
                  <input
                    type="file"
                    required
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    onChange={(e) => {
                      const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                      setUploadFile(f);
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Category</label>
                    <select
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                    >
                      <option value="Admissions">Admissions</option>
                      <option value="Certificates">Certificates</option>
                      <option value="Marksheets">Marksheets</option>
                      <option value="Receipts">Receipts</option>
                      <option value="Assignments">Assignments</option>
                      <option value="Photos">Photos</option>
                      <option value="Contracts">Contracts</option>
                      <option value="Medical">Medical</option>
                      <option value="Finance">Finance</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Entity Type</label>
                    <select
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      value={uploadEntityType}
                      onChange={(e) => setUploadEntityType(e.target.value)}
                    >
                      <option value="Student">Student</option>
                      <option value="Teacher">Teacher</option>
                      <option value="Admissions">Admissions</option>
                      <option value="Finance">Finance</option>
                      <option value="HR">HR</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Entity Target ID</label>
                  <input
                    type="text"
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    value={uploadEntityId}
                    onChange={(e) => setUploadEntityId(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={uploadVisibility === 'staff'}
                      onChange={(e) => setUploadVisibility(e.target.checked ? 'staff' : 'all')}
                    />
                    Staff only (hidden from students &amp; parents)
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowUploadModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Upload & Secure Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UPLOAD NEW VERSION */}
      {newVersionDoc && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">+ Upload New Version for {newVersionDoc.original_filename}</h3>
              <button className="modal-close-btn" onClick={() => setNewVersionDoc(null)}>✕</button>
            </div>
            <form onSubmit={handleVersionSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>New File</label>
                  <input
                    type="file"
                    required
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    onChange={(e) => {
                      const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                      setVersionFile(f);
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Version Release Notes / Change Summary</label>
                  <input
                    type="text"
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    value={versionChangeSummary}
                    onChange={(e) => setVersionChangeSummary(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setNewVersionDoc(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Upload Version v{newVersionDoc.version + 1}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER: VERSION HISTORY */}
      {selectedDocVersions && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">📜 Version History: {selectedDocVersions.doc.original_filename}</h3>
              <button className="modal-close-btn" onClick={() => setSelectedDocVersions(null)}>✕</button>
            </div>
            <div>
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Filename</th>
                    <th>Size</th>
                    <th>Change Summary</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDocVersions.versions.map(v => (
                    <tr key={v.id}>
                      <td style={{ fontWeight: 700, color: '#2563eb' }}>v{v.version}</td>
                      <td>{v.original_filename}</td>
                      <td>{Math.round(v.size_bytes / 1024)} KB</td>
                      <td>{v.change_summary || 'No summary'}</td>
                      <td>{new Date(v.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentCenter;
