import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Plus, ArrowRight, Eye, UserPlus, CheckCircle, XCircle, ClipboardList } from 'lucide-react';

// ─── Shared Interfaces ────────────────────────────────────────────────────────

interface AcademicYear {
  id: string;
  name: string;
}

// ─── Inquiry Interfaces & Constants ──────────────────────────────────────────

interface Inquiry {
  id: string;
  student_name: string;
  parent_name: string;
  parent_phone: string;
  parent_email: string | null;
  date_of_birth: string | null;
  applying_for_class: string;
  academic_year_id: string | null;
  academic_year_name: string | null;
  source: string;
  notes: string | null;
  status: 'New' | 'Contacted' | 'Applied' | 'Admitted' | 'Rejected';
  created_at: string;
}

const INQ_STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  New:       { bg: '#eff6ff', color: '#3b82f6' },
  Contacted: { bg: '#f5f3ff', color: '#8b5cf6' },
  Applied:   { bg: '#fffbeb', color: '#f59e0b' },
  Admitted:  { bg: '#f0fdf4', color: '#16a34a' },
  Rejected:  { bg: '#fef2f2', color: '#dc2626' },
};

const ALL_INQ_STATUSES = ['New', 'Contacted', 'Applied', 'Admitted', 'Rejected'] as const;

// ─── Application Interfaces & Constants ──────────────────────────────────────

interface Program { id: string; name: string; }

interface Application {
  id: string;
  institution_id: string;
  inquiry_id: string | null;
  application_number: string;
  student_first_name: string;
  student_last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  applying_for_course_id: string | null;
  course_name: string | null;
  academic_year_id: string;
  academic_year_name: string;
  parent_name: string;
  parent_phone: string;
  parent_email: string | null;
  previous_school: string | null;
  previous_class: string | null;
  status: 'Submitted' | 'Under Review' | 'Approved' | 'Rejected';
  rejection_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  converted_student_id: string | null;
  created_at: string;
}

const APP_STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  Submitted:      { bg: '#eff6ff', color: '#3b82f6' },
  'Under Review': { bg: '#f5f3ff', color: '#8b5cf6' },
  Approved:       { bg: '#f0fdf4', color: '#16a34a' },
  Rejected:       { bg: '#fef2f2', color: '#dc2626' },
};

const ALL_APP_STATUSES = ['Submitted', 'Under Review', 'Approved', 'Rejected'] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function Admissions() {
  // Page-level tab (inquiries vs applications)
  const [activeTab, setActiveTab] = useState<'inquiries' | 'applications'>('inquiries');

  // Shared state
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);

  // ── Inquiry state ──────────────────────────────────────────────────────────
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [inqLoading, setInqLoading] = useState(true);
  const [inqStatusFilter, setInqStatusFilter] = useState<string>('All');

  // Inquiry – Add modal
  const [inqShowAdd, setInqShowAdd] = useState(false);
  const [inqAddForm, setInqAddForm] = useState({
    student_name: '', parent_name: '', parent_phone: '', parent_email: '',
    date_of_birth: '', applying_for_class: '', source: 'Walk-in', notes: '', academic_year_id: '',
  });
  const [inqAddLoading, setInqAddLoading] = useState(false);

  // Inquiry – Convert modal
  const [convertInquiry, setConvertInquiry] = useState<Inquiry | null>(null);
  const [convertLoading, setConvertLoading] = useState(false);

  // Inquiry – Detail modal
  const [detailInquiry, setDetailInquiry] = useState<Inquiry | null>(null);

  // ── Application state ──────────────────────────────────────────────────────
  const [applications, setApplications] = useState<Application[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [appLoading, setAppLoading] = useState(true);
  const [appStatusFilter, setAppStatusFilter] = useState<string>('All');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Application – Add modal
  const [appShowAdd, setAppShowAdd] = useState(false);
  const [appAddForm, setAppAddForm] = useState({
    student_first_name: '', student_last_name: '', date_of_birth: '', gender: '',
    applying_for_course_id: '', academic_year_id: '',
    parent_name: '', parent_phone: '', parent_email: '',
    previous_school: '', previous_class: '',
  });
  const [appAddLoading, setAppAddLoading] = useState(false);

  // Application – Detail modal
  const [detailApp, setDetailApp] = useState<Application | null>(null);

  // Application – Approve modal
  const [approveApp, setApproveApp] = useState<Application | null>(null);
  const [approveLoading, setApproveLoading] = useState(false);

  // Application – Reject modal
  const [rejectApp, setRejectApp] = useState<Application | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetchInquiryData();
    fetchApplicationData();
  }, []);

  const fetchInquiryData = async () => {
    try {
      setInqLoading(true);
      const [inqs, years] = await Promise.all([
        api.get('/admissions/inquiries'),
        api.get('/academic-years'),
      ]);
      setInquiries(inqs);
      setAcademicYears(years);
    } catch (err) {
      console.error('Error fetching admission inquiries:', err);
    } finally {
      setInqLoading(false);
    }
  };

  const fetchApplicationData = async () => {
    try {
      setAppLoading(true);
      const [apps, years, progs] = await Promise.all([
        api.get('/admissions/applications'),
        api.get('/academic-years'),
        api.get('/programs'),
      ]);
      setApplications(apps);
      setAcademicYears(years); // shared – last writer wins (same data)
      setPrograms(progs);
    } catch (err) {
      console.error('Error fetching admission applications:', err);
    } finally {
      setAppLoading(false);
    }
  };

  // ── Inquiry handlers ───────────────────────────────────────────────────────

  const handleInqAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInqAddLoading(true);
    try {
      await api.post('/admissions/inquiries', {
        ...inqAddForm,
        parent_email: inqAddForm.parent_email || undefined,
        date_of_birth: inqAddForm.date_of_birth || undefined,
        academic_year_id: inqAddForm.academic_year_id || undefined,
        notes: inqAddForm.notes || undefined,
      });
      setInqShowAdd(false);
      setInqAddForm({
        student_name: '', parent_name: '', parent_phone: '', parent_email: '',
        date_of_birth: '', applying_for_class: '', source: 'Walk-in', notes: '', academic_year_id: '',
      });
      fetchInquiryData();
    } catch (err: any) {
      alert(err.message || 'Failed to create inquiry');
    } finally {
      setInqAddLoading(false);
    }
  };

  const handleConvert = async () => {
    if (!convertInquiry) return;
    setConvertLoading(true);
    try {
      await api.post(`/admissions/inquiries/${convertInquiry.id}/convert`, {
        academic_year_id: convertInquiry.academic_year_id || undefined,
      });
      setConvertInquiry(null);
      fetchInquiryData();
      fetchApplicationData();
    } catch (err: any) {
      alert(err.message || 'Failed to convert inquiry');
    } finally {
      setConvertLoading(false);
    }
  };

  // ── Application handlers ───────────────────────────────────────────────────

  const handleAppAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAppAddLoading(true);
    try {
      await api.post('/admissions/applications', {
        ...appAddForm,
        date_of_birth: appAddForm.date_of_birth || undefined,
        gender: appAddForm.gender || undefined,
        applying_for_course_id: appAddForm.applying_for_course_id || undefined,
        parent_email: appAddForm.parent_email || undefined,
        previous_school: appAddForm.previous_school || undefined,
        previous_class: appAddForm.previous_class || undefined,
      });
      setAppShowAdd(false);
      setAppAddForm({
        student_first_name: '', student_last_name: '', date_of_birth: '', gender: '',
        applying_for_course_id: '', academic_year_id: '',
        parent_name: '', parent_phone: '', parent_email: '',
        previous_school: '', previous_class: '',
      });
      fetchApplicationData();
    } catch (err: any) {
      alert(err.message || 'Failed to create application');
    } finally {
      setAppAddLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approveApp) return;
    setApproveLoading(true);
    try {
      const result = await api.patch(`/admissions/applications/${approveApp.id}/approve`, {});
      setApproveApp(null);
      setSuccessMsg(`Student record created! Admission No: ${result.admissionNumber}`);
      setTimeout(() => setSuccessMsg(null), 6000);
      fetchApplicationData();
    } catch (err: any) {
      alert(err.message || 'Failed to approve application');
    } finally {
      setApproveLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectApp) return;
    setRejectLoading(true);
    try {
      await api.patch(`/admissions/applications/${rejectApp.id}/reject`, { reason: rejectReason });
      setRejectApp(null);
      setRejectReason('');
      fetchApplicationData();
    } catch (err: any) {
      alert(err.message || 'Failed to reject application');
    } finally {
      setRejectLoading(false);
    }
  };

  // ── Derived data ───────────────────────────────────────────────────────────

  const inqCounts = ALL_INQ_STATUSES.reduce((acc, s) => {
    acc[s] = inquiries.filter(i => i.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const filteredInquiries = inqStatusFilter === 'All'
    ? inquiries
    : inquiries.filter(i => i.status === inqStatusFilter);

  const filteredApplications = appStatusFilter === 'All'
    ? applications
    : applications.filter(a => a.status === appStatusFilter);

  // ── Sub-components ─────────────────────────────────────────────────────────

  const InqStatusBadge = ({ status }: { status: string }) => {
    const style = INQ_STATUS_COLORS[status] || { bg: '#f3f4f6', color: '#374151' };
    return (
      <span style={{
        display: 'inline-block', padding: '0.2rem 0.65rem', borderRadius: '9999px',
        fontSize: '0.75rem', fontWeight: 600, background: style.bg, color: style.color,
      }}>{status}</span>
    );
  };

  const AppStatusBadge = ({ status }: { status: string }) => {
    const style = APP_STATUS_COLORS[status] || { bg: '#f3f4f6', color: '#374151' };
    return (
      <span style={{
        display: 'inline-block', padding: '0.2rem 0.65rem', borderRadius: '9999px',
        fontSize: '0.75rem', fontWeight: 600, background: style.bg, color: style.color,
      }}>{status}</span>
    );
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderInquiries = () => (
    <>
      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {ALL_INQ_STATUSES.map(status => {
          const style = INQ_STATUS_COLORS[status] || { bg: '#f3f4f6', color: '#374151' };
          return (
            <div key={status} className="card" style={{ padding: '1rem 1.25rem', borderLeft: `4px solid ${style.color}`, margin: 0 }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: style.color }}>{inqCounts[status] || 0}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{status}</div>
            </div>
          );
        })}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {['All', ...ALL_INQ_STATUSES].map(tab => (
          <button
            key={tab}
            onClick={() => setInqStatusFilter(tab)}
            style={{
              padding: '0.4rem 1rem', borderRadius: '9999px', border: '1px solid var(--border)',
              cursor: 'pointer', fontSize: '0.85rem',
              fontWeight: inqStatusFilter === tab ? 600 : 400,
              background: inqStatusFilter === tab ? 'var(--primary)' : 'transparent',
              color: inqStatusFilter === tab ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
          >{tab}</button>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        {inqLoading ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading inquiries...</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Parent</th>
                <th>Phone</th>
                <th>Applying For</th>
                <th>Source</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInquiries.map(inq => (
                <tr key={inq.id}>
                  <td><strong>{inq.student_name}</strong></td>
                  <td>{inq.parent_name}</td>
                  <td>{inq.parent_phone}</td>
                  <td>{inq.applying_for_class}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{inq.source}</td>
                  <td><InqStatusBadge status={inq.status} /></td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {new Date(inq.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => setDetailInquiry(inq)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <Eye size={13} /> Details
                      </button>
                      {(inq.status === 'New' || inq.status === 'Contacted') && (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => setConvertInquiry(inq)}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          Convert <ArrowRight size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredInquiries.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <UserPlus size={32} style={{ marginBottom: '0.5rem' }} />
                    <p>No inquiries found{inqStatusFilter !== 'All' ? ` with status "${inqStatusFilter}"` : ''}.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  );

  const renderApplications = () => (
    <>
      {/* Success Banner */}
      {successMsg && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #16a34a', color: '#16a34a',
          padding: '0.75rem 1.25rem', borderRadius: '8px', marginBottom: '1rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500,
        }}>
          <CheckCircle size={18} /> {successMsg}
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {['All', ...ALL_APP_STATUSES].map(tab => (
          <button
            key={tab}
            onClick={() => setAppStatusFilter(tab)}
            style={{
              padding: '0.4rem 1rem', borderRadius: '9999px', border: '1px solid var(--border)',
              cursor: 'pointer', fontSize: '0.85rem',
              fontWeight: appStatusFilter === tab ? 600 : 400,
              background: appStatusFilter === tab ? 'var(--primary)' : 'transparent',
              color: appStatusFilter === tab ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
          >{tab}</button>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        {appLoading ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading applications...</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>App No.</th>
                <th>Student Name</th>
                <th>Applying For</th>
                <th>Parent</th>
                <th>Phone</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredApplications.map(app => (
                <tr key={app.id}>
                  <td><code style={{ fontSize: '0.8rem' }}>{app.application_number}</code></td>
                  <td><strong>{app.student_first_name} {app.student_last_name}</strong></td>
                  <td>{app.course_name || '—'}</td>
                  <td>{app.parent_name}</td>
                  <td style={{ fontSize: '0.85rem' }}>{app.parent_phone}</td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {new Date(app.created_at).toLocaleDateString()}
                  </td>
                  <td><AppStatusBadge status={app.status} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => setDetailApp(app)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                      >
                        <Eye size={12} /> View
                      </button>
                      {(app.status === 'Submitted' || app.status === 'Under Review') && (
                        <>
                          <button
                            className="btn btn-sm"
                            onClick={() => setApproveApp(app)}
                            style={{ background: '#16a34a', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                          >
                            <CheckCircle size={12} /> Approve
                          </button>
                          <button
                            className="btn btn-sm"
                            onClick={() => { setRejectApp(app); setRejectReason(''); }}
                            style={{ background: '#dc2626', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                          >
                            <XCircle size={12} /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredApplications.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <ClipboardList size={32} style={{ marginBottom: '0.5rem' }} />
                    <p>No applications found{appStatusFilter !== 'All' ? ` with status "${appStatusFilter}"` : ''}.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  );

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <Layout>
      <PageGuidance
        title="Admissions"
        description="Use this page to manage the full admissions pipeline. Record new inquiries from prospective parents, track their progress, and convert them into formal applications. Once submitted, review and approve applications to create student records."
        steps={[
          'Switch to Inquiries to record walk-in, phone, or online leads.',
          'Update inquiry status and convert ready leads to Applications.',
          'Switch to Applications to review, approve, or reject submissions.',
        ]}
      />

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2>Admissions</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Manage inquiries and applications for new students
          </p>
        </div>
        {activeTab === 'inquiries' ? (
          <button
            className="btn btn-primary"
            onClick={() => setInqShowAdd(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Plus size={16} /> Add Inquiry
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={() => setAppShowAdd(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Plus size={16} /> New Application
          </button>
        )}
      </div>

      {/* Page-level Tabs */}
      <div className="page-tabs" style={{ marginBottom: '1.5rem' }}>
        <button
          className={`page-tab${activeTab === 'inquiries' ? ' active' : ''}`}
          onClick={() => setActiveTab('inquiries')}
        >
          Inquiries
        </button>
        <button
          className={`page-tab${activeTab === 'applications' ? ' active' : ''}`}
          onClick={() => setActiveTab('applications')}
        >
          Applications
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'inquiries' ? renderInquiries() : renderApplications()}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODALS — INQUIRIES
      ════════════════════════════════════════════════════════════════════════ */}

      {/* Add Inquiry Modal */}
      {inqShowAdd && (
        <div className="modal-overlay" onClick={() => setInqShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Add Admission Inquiry</h3>
              <button className="modal-close" onClick={() => setInqShowAdd(false)}>×</button>
            </div>
            <form onSubmit={handleInqAddSubmit}>
              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Student Name *</label>
                  <input
                    required value={inqAddForm.student_name}
                    onChange={e => setInqAddForm(f => ({ ...f, student_name: e.target.value }))}
                    placeholder="Full name of the student"
                  />
                </div>
                <div className="form-group">
                  <label>Parent / Guardian Name *</label>
                  <input
                    required value={inqAddForm.parent_name}
                    onChange={e => setInqAddForm(f => ({ ...f, parent_name: e.target.value }))}
                    placeholder="Parent's full name"
                  />
                </div>
                <div className="form-group">
                  <label>Parent Phone *</label>
                  <input
                    required value={inqAddForm.parent_phone}
                    onChange={e => setInqAddForm(f => ({ ...f, parent_phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div className="form-group">
                  <label>Parent Email</label>
                  <input
                    type="email" value={inqAddForm.parent_email}
                    onChange={e => setInqAddForm(f => ({ ...f, parent_email: e.target.value }))}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date" value={inqAddForm.date_of_birth}
                    onChange={e => setInqAddForm(f => ({ ...f, date_of_birth: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Applying For Class *</label>
                  <input
                    required value={inqAddForm.applying_for_class}
                    onChange={e => setInqAddForm(f => ({ ...f, applying_for_class: e.target.value }))}
                    placeholder="e.g. Grade 5, Class X"
                  />
                </div>
                <div className="form-group">
                  <label>Source</label>
                  <select value={inqAddForm.source} onChange={e => setInqAddForm(f => ({ ...f, source: e.target.value }))}>
                    <option>Walk-in</option>
                    <option>Phone</option>
                    <option>Website</option>
                    <option>Referral</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Academic Year</label>
                  <select value={inqAddForm.academic_year_id} onChange={e => setInqAddForm(f => ({ ...f, academic_year_id: e.target.value }))}>
                    <option value="">— Select Year —</option>
                    {academicYears.map(y => (
                      <option key={y.id} value={y.id}>{y.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Notes</label>
                  <textarea
                    value={inqAddForm.notes}
                    onChange={e => setInqAddForm(f => ({ ...f, notes: e.target.value }))}
                    rows={3}
                    placeholder="Any additional notes or observations..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setInqShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={inqAddLoading}>
                  {inqAddLoading ? 'Adding...' : 'Add Inquiry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert Confirmation Modal */}
      {convertInquiry && (
        <div className="modal-overlay" onClick={() => setConvertInquiry(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Convert to Application</h3>
              <button className="modal-close" onClick={() => setConvertInquiry(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem' }}>
                Convert <strong>{convertInquiry.student_name}</strong>'s inquiry into a formal admission application?
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                This will create an application record and mark this inquiry as <strong>Applied</strong>. You can review and approve the application from the Applications tab.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setConvertInquiry(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleConvert} disabled={convertLoading}>
                {convertLoading ? 'Converting...' : 'Confirm Convert'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inquiry Detail Modal */}
      {detailInquiry && (
        <div className="modal-overlay" onClick={() => setDetailInquiry(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Inquiry Details</h3>
              <button className="modal-close" onClick={() => setDetailInquiry(null)}>×</button>
            </div>
            <div className="modal-body">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <tbody>
                  {[
                    ['Student Name', detailInquiry.student_name],
                    ['Parent Name', detailInquiry.parent_name],
                    ['Phone', detailInquiry.parent_phone],
                    ['Email', detailInquiry.parent_email || '—'],
                    ['Date of Birth', detailInquiry.date_of_birth || '—'],
                    ['Applying For', detailInquiry.applying_for_class],
                    ['Source', detailInquiry.source],
                    ['Academic Year', detailInquiry.academic_year_name || '—'],
                    ['Notes', detailInquiry.notes || '—'],
                    ['Status', detailInquiry.status],
                    ['Created', new Date(detailInquiry.created_at).toLocaleString()],
                  ].map(([label, value]) => (
                    <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)', width: '40%' }}>{label}</td>
                      <td style={{ padding: '0.6rem 0.5rem', fontWeight: 500 }}>
                        {label === 'Status' ? <InqStatusBadge status={String(value)} /> : value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setDetailInquiry(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODALS — APPLICATIONS
      ════════════════════════════════════════════════════════════════════════ */}

      {/* Add Application Modal */}
      {appShowAdd && (
        <div className="modal-overlay" onClick={() => setAppShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '620px' }}>
            <div className="modal-header">
              <h3 className="modal-title">New Admission Application</h3>
              <button className="modal-close" onClick={() => setAppShowAdd(false)}>×</button>
            </div>
            <form onSubmit={handleAppAddSubmit}>
              <div className="modal-body">
                <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Student Information</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>First Name *</label>
                    <input required value={appAddForm.student_first_name} onChange={e => setAppAddForm(f => ({ ...f, student_first_name: e.target.value }))} placeholder="First name" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Last Name *</label>
                    <input required value={appAddForm.student_last_name} onChange={e => setAppAddForm(f => ({ ...f, student_last_name: e.target.value }))} placeholder="Last name" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Date of Birth</label>
                    <input type="date" value={appAddForm.date_of_birth} onChange={e => setAppAddForm(f => ({ ...f, date_of_birth: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Gender</label>
                    <select value={appAddForm.gender} onChange={e => setAppAddForm(f => ({ ...f, gender: e.target.value }))}>
                      <option value="">— Select —</option>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Academic Details</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Applying For (Course / Program)</label>
                    <select value={appAddForm.applying_for_course_id} onChange={e => setAppAddForm(f => ({ ...f, applying_for_course_id: e.target.value }))}>
                      <option value="">— Select Program —</option>
                      {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Academic Year *</label>
                    <select required value={appAddForm.academic_year_id} onChange={e => setAppAddForm(f => ({ ...f, academic_year_id: e.target.value }))}>
                      <option value="">— Select Year —</option>
                      {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                    </select>
                  </div>
                </div>

                <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Parent / Guardian</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Parent Name *</label>
                    <input required value={appAddForm.parent_name} onChange={e => setAppAddForm(f => ({ ...f, parent_name: e.target.value }))} placeholder="Full name" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Parent Phone *</label>
                    <input required value={appAddForm.parent_phone} onChange={e => setAppAddForm(f => ({ ...f, parent_phone: e.target.value }))} placeholder="+91 98765 43210" />
                  </div>
                  <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                    <label>Parent Email</label>
                    <input type="email" value={appAddForm.parent_email} onChange={e => setAppAddForm(f => ({ ...f, parent_email: e.target.value }))} placeholder="email@example.com" />
                  </div>
                </div>

                <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Previous Education</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Previous School</label>
                    <input value={appAddForm.previous_school} onChange={e => setAppAddForm(f => ({ ...f, previous_school: e.target.value }))} placeholder="Name of last school attended" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Previous Class</label>
                    <input value={appAddForm.previous_class} onChange={e => setAppAddForm(f => ({ ...f, previous_class: e.target.value }))} placeholder="e.g. Class 9" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setAppShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={appAddLoading}>
                  {appAddLoading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Application Detail Modal */}
      {detailApp && (
        <div className="modal-overlay" onClick={() => setDetailApp(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Application Details</h3>
                <code style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{detailApp.application_number}</code>
              </div>
              <button className="modal-close" onClick={() => setDetailApp(null)}>×</button>
            </div>
            <div className="modal-body">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <tbody>
                  {[
                    ['Student Name', `${detailApp.student_first_name} ${detailApp.student_last_name}`],
                    ['Date of Birth', detailApp.date_of_birth || '—'],
                    ['Gender', detailApp.gender || '—'],
                    ['Course / Program', detailApp.course_name || '—'],
                    ['Academic Year', detailApp.academic_year_name],
                    ['Parent Name', detailApp.parent_name],
                    ['Parent Phone', detailApp.parent_phone],
                    ['Parent Email', detailApp.parent_email || '—'],
                    ['Previous School', detailApp.previous_school || '—'],
                    ['Previous Class', detailApp.previous_class || '—'],
                    ['Status', detailApp.status],
                    ['Rejection Reason', detailApp.rejection_reason || '—'],
                    ['Approved At', detailApp.approved_at ? new Date(detailApp.approved_at).toLocaleString() : '—'],
                    ['Applied On', new Date(detailApp.created_at).toLocaleString()],
                  ].map(([label, value]) => (
                    <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.55rem 0.5rem', color: 'var(--text-muted)', width: '42%' }}>{label}</td>
                      <td style={{ padding: '0.55rem 0.5rem', fontWeight: 500 }}>
                        {label === 'Status' ? <AppStatusBadge status={String(value)} /> : value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setDetailApp(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {approveApp && (
        <div className="modal-overlay" onClick={() => setApproveApp(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Approve Application</h3>
              <button className="modal-close" onClick={() => setApproveApp(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '0.75rem' }}>
                Approve application for <strong>{approveApp.student_first_name} {approveApp.student_last_name}</strong>?
              </p>
              <div style={{
                background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '8px',
                padding: '0.75rem 1rem', color: '#92400e', fontSize: '0.875rem',
              }}>
                ⚠️ Approving will <strong>automatically create a student record</strong> in the system with admission number <code>{approveApp.application_number}</code>.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setApproveApp(null)}>Cancel</button>
              <button
                className="btn"
                style={{ background: '#16a34a', color: '#fff' }}
                onClick={handleApprove}
                disabled={approveLoading}
              >
                {approveLoading ? 'Approving...' : 'Approve & Create Student'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectApp && (
        <div className="modal-overlay" onClick={() => setRejectApp(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Reject Application</h3>
              <button className="modal-close" onClick={() => setRejectApp(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem' }}>
                Reject application for <strong>{rejectApp.student_first_name} {rejectApp.student_last_name}</strong>?
              </p>
              <div className="form-group">
                <label>Rejection Reason</label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Provide a reason for rejection (optional)..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setRejectApp(null)}>Cancel</button>
              <button
                className="btn"
                style={{ background: '#dc2626', color: '#fff' }}
                onClick={handleReject}
                disabled={rejectLoading}
              >
                {rejectLoading ? 'Rejecting...' : 'Reject Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
