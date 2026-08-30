import './Certificates.css';
import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { PageGuidance } from '../components/PageGuidance';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  Search, Printer, Settings, Plus, Trash2, Edit, History,
} from 'lucide-react';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
}

interface CertificateTemplate {
  id: string;
  name: string;
  type: 'ID_CARD' | 'BONAFIDE' | 'TRANSFER_CERTIFICATE' | 'CUSTOM';
  body_html: string;
}

interface CertificateIssuance {
  id: string;
  template_id: string;
  template_name?: string;
  reference_number: string;
  rendered_html: string;
  issued_at: string;
}

export default function Certificates() {
  const { user } = useAuth();
  const toastCtx = useToast();
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (type === 'success') toastCtx.success(message);
    else toastCtx.error(message);
  };

  const userPermissions: string[] = user?.permissions || [];
  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const canManageTemplates = userPermissions.includes('certificates.manage') ||
    userRoles.some(r => ['super_admin', 'Super Admin', 'admin', 'Admin', 'Principal'].includes(r));

  const [students, setStudents] = useState<Student[]>([]);
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [lastReference, setLastReference] = useState<string | null>(null);
  const [showManageTemplates, setShowManageTemplates] = useState(false);

  const [issuanceHistory, setIssuanceHistory] = useState<CertificateIssuance[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [reprintIssuance, setReprintIssuance] = useState<CertificateIssuance | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // Template editor
  const [editingTemplate, setEditingTemplate] = useState<CertificateTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({ name: '', type: 'CUSTOM', body_html: '' });
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [studentsData, templatesData] = await Promise.all([
        api.get('/students'),
        api.get('/certificates/templates'),
      ]);
      setStudents(studentsData);
      setTemplates(templatesData);
      if (studentsData.length > 0) setSelectedStudentId(studentsData[0].id);
      if (templatesData.length > 0) setSelectedTemplateId(templatesData[0].id);
    } catch (err) {
      console.error('Error fetching certificate data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStudentId && selectedTemplateId) {
      fetchPreview();
    } else {
      setPreviewHtml('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentId, selectedTemplateId]);

  useEffect(() => {
    if (selectedStudentId) {
      fetchIssuanceHistory(selectedStudentId);
    } else {
      setIssuanceHistory([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentId]);

  const fetchIssuanceHistory = async (studentId: string) => {
    try {
      setLoadingHistory(true);
      const data = await api.get(`/certificates/issuances/${studentId}`);
      setIssuanceHistory(data);
    } catch (err) {
      console.error('Error fetching certificate issuance history:', err);
      setIssuanceHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchPreview = async () => {
    try {
      setLoadingPreview(true);
      setLastReference(null);
      const res = await api.post('/certificates/preview', { templateId: selectedTemplateId, studentId: selectedStudentId });
      setPreviewHtml(res.html);
    } catch (err: any) {
      setPreviewHtml(`<p style="color:red;">${err.message || 'Failed to render certificate preview.'}</p>`);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handlePrintAndIssue = async () => {
    try {
      setIssuing(true);
      const res = await api.post('/certificates/issue', { templateId: selectedTemplateId, studentId: selectedStudentId });
      setPreviewHtml(res.html);
      setLastReference(res.reference_number);
      fetchIssuanceHistory(selectedStudentId);
      setTimeout(() => window.print(), 100);
    } catch (err: any) {
      showToast(err.message || 'Failed to issue certificate', 'error');
    } finally {
      setIssuing(false);
    }
  };

  const resetTemplateForm = () => setTemplateForm({ name: '', type: 'CUSTOM', body_html: '' });

  const handleTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTemplate) {
        await api.put(`/certificates/templates/${editingTemplate.id}`, templateForm);
        showToast('Template updated successfully');
      } else {
        await api.post('/certificates/templates', templateForm);
        showToast('Template created successfully');
      }
      setShowTemplateModal(false);
      setEditingTemplate(null);
      resetTemplateForm();
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Error saving template', 'error');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Delete this certificate template?')) return;
    try {
      await api.delete(`/certificates/templates/${id}`);
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Error deleting template', 'error');
    }
  };

  const filteredStudents = students.filter(s =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.admission_number.includes(searchQuery)
  );

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  return (
    <Layout>
      <div className="no-print">
        <PageGuidance
          title="Official Credentials &amp; Certificates"
          description="Generate ready-to-print student ID cards, bonafide enrollment certificates, and transfer certificates from configurable, editable templates."
          steps={["Select a student and a certificate template.", "Review the live preview, which is rendered from your institution's own editable template.", "Click Print & Issue to record a permanent issuance reference and open your printer options."]}
        />
      </div>

      <div className="page-header no-print">
        <div>
          <h2>Official Certificates &amp; Credentials</h2>
          <p className="certificates-text-1">
            Generate and print verified academic templates, ID badges, and leaving credentials
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" onClick={() => setShowHistory(!showHistory)} disabled={!selectedStudentId}>
            <History size={16} /> {showHistory ? 'Hide Issuance History' : 'Issuance History'}
          </button>
          {canManageTemplates && (
            <button className="btn btn-outline" onClick={() => setShowManageTemplates(!showManageTemplates)}>
              <Settings size={16} /> {showManageTemplates ? 'Hide Template Manager' : 'Manage Templates'}
            </button>
          )}
        </div>
      </div>

      {showManageTemplates && canManageTemplates && (
        <div className="card no-print certificates-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Certificate Templates</h3>
            <button className="btn btn-primary btn-sm" onClick={() => { setEditingTemplate(null); resetTemplateForm(); setShowTemplateModal(true); }}>
              <Plus size={14} /> New Template
            </button>
          </div>
          <table className="table">
            <thead><tr><th>Name</th><th>Type</th><th></th></tr></thead>
            <tbody>
              {templates.map(t => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td><code>{t.type}</code></td>
                  <td style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-sm btn-outline" onClick={() => { setEditingTemplate(t); setTemplateForm({ name: t.name, type: t.type, body_html: t.body_html }); setShowTemplateModal(true); }}>
                      <Edit size={14} />
                    </button>
                    <button className="btn btn-sm btn-outline" onClick={() => handleDeleteTemplate(t.id)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showHistory && selectedStudentId && (
        <div className="card no-print certificates-card">
          <h3 style={{ margin: '0 0 1rem' }}>
            Issuance History{selectedStudent ? ` — ${selectedStudent.first_name} ${selectedStudent.last_name}` : ''}
          </h3>
          {loadingHistory ? <p>Loading issuance history...</p> : issuanceHistory.length === 0 ? (
            <p className="no-data">No certificates have been issued to this student yet.</p>
          ) : (
            <table className="table">
              <thead><tr><th>Issued At</th><th>Credential Type</th><th>Reference Number</th><th></th></tr></thead>
              <tbody>
                {issuanceHistory.map(iss => (
                  <tr key={iss.id}>
                    <td>{new Date(iss.issued_at).toLocaleString()}</td>
                    <td>{iss.template_name || '-'}</td>
                    <td><code>{iss.reference_number}</code></td>
                    <td>
                      <button className="btn btn-sm btn-outline" onClick={() => setReprintIssuance(iss)}>
                        <Printer size={12} /> View / Reprint
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Control panel */}
      <div className="card no-print certificates-card">
        <div className="certificates-grid-3">

          {/* Student Picker */}
          <div className="form-group certificates-form-group">
            <label>Search Student</label>
            <div className="certificates-div-5">
              <Search size={14} className="certificates-Search-6" />
              <input
                type="text"
                placeholder="Type student name or admission number..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  const matches = students.filter(s =>
                    `${s.first_name} ${s.last_name}`.toLowerCase().includes(e.target.value.toLowerCase()) ||
                    (s.admission_number && s.admission_number.includes(e.target.value))
                  );
                  if (matches.length === 1 && matches[0]) setSelectedStudentId(matches[0].id);
                  else if (e.target.value === '') setSelectedStudentId('');
                }}
                style={{ paddingLeft: '2.25rem', marginBottom: searchQuery.length >= 1 ? '0.375rem' : 0 }}
              />
            </div>
            {searchQuery.length >= 1 && (
              <div className="certificates-div-7">
                {filteredStudents.length === 0 ? (
                  <div className="certificates-div-8">No students found</div>
                ) : filteredStudents.map(s => (
                  <div
                    key={s.id}
                    onClick={() => { setSelectedStudentId(s.id); setSearchQuery(`${s.first_name} ${s.last_name}`); }}
                    style={{
                      padding: '0.625rem 1rem', cursor: 'pointer', fontSize: '0.85rem',
                      backgroundColor: selectedStudentId === s.id ? 'var(--primary-soft)' : 'transparent',
                      color: selectedStudentId === s.id ? 'var(--primary)' : 'var(--text-main)',
                      fontWeight: selectedStudentId === s.id ? 700 : 400,
                      borderBottom: '1px solid var(--border)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}
                  >
                    <span>{s.first_name} {s.last_name}</span>
                    <span className="certificates-span-9">{s.admission_number}</span>
                  </div>
                ))}
              </div>
            )}
            {selectedStudentId && selectedStudent && (
              <div className="certificates-row-10">
                ✓ {selectedStudent.first_name} {selectedStudent.last_name} selected
              </div>
            )}
          </div>

          <div className="form-group certificates-form-group">
            <label>Credential Type</label>
            <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)} className="certificates-select-12">
              {templates.length === 0 && <option value="">No templates configured</option>}
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <button className="btn btn-primary certificates-btn" onClick={handlePrintAndIssue} disabled={!selectedStudentId || !selectedTemplateId || issuing}>
            <Printer size={16} /> {issuing ? 'Issuing...' : 'Print & Issue'}
          </button>
        </div>
      </div>

      {/* Preview / Print Container Area */}
      {loading ? <p>Loading students list...</p> : !selectedStudentId || !selectedTemplateId ? (
        <p className="no-data">Select a student and a template from the control panel to generate a credential.</p>
      ) : (
        <div className="print-canvas-wrapper certificates-print-canvas-wrapper">
          {lastReference && (
            <div className="no-print" style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Issued — Reference Number: <strong>{lastReference}</strong>
            </div>
          )}
          {loadingPreview ? (
            <p>Rendering preview...</p>
          ) : (
            <div id={reprintIssuance ? undefined : 'printable-certificate'} dangerouslySetInnerHTML={{ __html: previewHtml }} />
          )}
        </div>
      )}

      {/* Template Editor Modal */}
      {showTemplateModal && (
        <div className="modal no-print">
          <div className="modal-content" style={{ maxWidth: '700px' }}>
            <h3>{editingTemplate ? 'Edit Template' : 'New Certificate Template'}</h3>
            <form onSubmit={handleTemplateSubmit}>
              <div className="form-group">
                <label>Template Name</label>
                <input type="text" value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select value={templateForm.type} onChange={(e) => setTemplateForm({ ...templateForm, type: e.target.value })}>
                  <option value="ID_CARD">ID Card</option>
                  <option value="BONAFIDE">Bonafide Certificate</option>
                  <option value="TRANSFER_CERTIFICATE">Transfer Certificate</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>
              <div className="form-group">
                <label>HTML Body (supports {'{{student.full_name}}'}, {'{{student.admission_number}}'}, {'{{institution.name}}'}, {'{{guardian.name}}'}, {'{{certificate.reference_number}}'}, etc.)</label>
                <textarea
                  value={templateForm.body_html}
                  onChange={(e) => setTemplateForm({ ...templateForm, body_html: e.target.value })}
                  rows={14}
                  style={{ fontFamily: 'monospace', fontSize: '12px' }}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowTemplateModal(false); setEditingTemplate(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingTemplate ? 'Update Template' : 'Create Template'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Reprint Modal — reproduces the exact HTML recorded at issuance time */}
      {reprintIssuance && (
        <div className="modal no-print" onClick={() => setReprintIssuance(null)}>
          <div className="modal-content" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
            <h3>Reprint — Reference {reprintIssuance.reference_number}</h3>
            <div className="print-canvas-wrapper certificates-print-canvas-wrapper">
              <div id="printable-certificate" dangerouslySetInnerHTML={{ __html: reprintIssuance.rendered_html }} />
            </div>
            <div className="modal-actions no-print">
              <button type="button" className="btn btn-secondary" onClick={() => setReprintIssuance(null)}>Close</button>
              <button type="button" className="btn btn-primary" onClick={() => window.print()}>
                <Printer size={16} /> Print
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
