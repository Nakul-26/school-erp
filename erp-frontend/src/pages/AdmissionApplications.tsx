import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Plus, Eye, CheckCircle, XCircle, ClipboardList } from 'lucide-react';

interface AcademicYear { id: string; name: string; }
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
  Submitted:     { bg: '#eff6ff', color: '#3b82f6' },
  'Under Review':{ bg: '#f5f3ff', color: '#8b5cf6' },
  Approved:      { bg: '#f0fdf4', color: '#16a34a' },
  Rejected:      { bg: '#fef2f2', color: '#dc2626' },
};

const ALL_STATUSES = ['Submitted', 'Under Review', 'Approved', 'Rejected'] as const;

export default function AdmissionApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('All');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    student_first_name: '', student_last_name: '', date_of_birth: '', gender: '',
    applying_for_course_id: '', academic_year_id: '',
    parent_name: '', parent_phone: '', parent_email: '',
    previous_school: '', previous_class: '',
  });
  const [addLoading, setAddLoading] = useState(false);

  // Detail modal
  const [detailApp, setDetailApp] = useState<Application | null>(null);

  // Approve modal
  const [approveApp, setApproveApp] = useState<Application | null>(null);
  const [approveLoading, setApproveLoading] = useState(false);

  // Reject modal
  const [rejectApp, setRejectApp] = useState<Application | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [apps, years, progs] = await Promise.all([
        api.get('/admissions/applications'),
        api.get('/academic-years'),
        api.get('/programs'),
      ]);
      setApplications(apps);
      setAcademicYears(years);
      setPrograms(progs);
    } catch (err) {
      console.error('Error fetching admission applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      await api.post('/admissions/applications', {
        ...addForm,
        date_of_birth: addForm.date_of_birth || undefined,
        gender: addForm.gender || undefined,
        applying_for_course_id: addForm.applying_for_course_id || undefined,
        parent_email: addForm.parent_email || undefined,
        previous_school: addForm.previous_school || undefined,
        previous_class: addForm.previous_class || undefined,
      });
      setShowAdd(false);
      setAddForm({
        student_first_name: '', student_last_name: '', date_of_birth: '', gender: '',
        applying_for_course_id: '', academic_year_id: '',
        parent_name: '', parent_phone: '', parent_email: '',
        previous_school: '', previous_class: '',
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create application');
    } finally {
      setAddLoading(false);
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
      fetchData();
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
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to reject application');
    } finally {
      setRejectLoading(false);
    }
  };

  const filtered = activeTab === 'All' ? applications : applications.filter(a => a.status === activeTab);

  function StatusBadge({ status }: { status: string }) {
    const style = APP_STATUS_COLORS[status] || { bg: '#f3f4f6', color: '#374151' };
    return (
      <span style={{
        display: 'inline-block', padding: '0.2rem 0.65rem', borderRadius: '9999px',
        fontSize: '0.75rem', fontWeight: 600, background: style.bg, color: style.color,
      }}>{status}</span>
    );
  }

  return (
    <Layout>
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

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2>Admission Applications</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Review, approve, and manage formal admission applications
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Plus size={16} /> New Application
        </button>
      </div>

      <div style={{
        padding: '1rem 1.25rem',
        backgroundColor: '#eff6ff',
        borderLeft: '4px solid #3b82f6',
        borderRadius: '6px',
        fontSize: '0.875rem',
        color: '#1e3a8a',
        lineHeight: '1.5',
        marginBottom: '1rem'
      }}>
        <strong>💡 Page Guidance:</strong> Manage formal candidate registrations. Review submitted educational history, parent records, and courses applied. Under <em>Submitted</em> status, click <em>Approve</em> to convert the record; this creates a student profile in the system and issues a unique admission ID.
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {['All', ...ALL_STATUSES].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.4rem 1rem', borderRadius: '9999px', border: '1px solid var(--border)',
              cursor: 'pointer', fontSize: '0.85rem',
              fontWeight: activeTab === tab ? 600 : 400,
              background: activeTab === tab ? 'var(--primary)' : 'transparent',
              color: activeTab === tab ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
          >{tab}</button>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
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
              {filtered.map(app => (
                <tr key={app.id}>
                  <td><code style={{ fontSize: '0.8rem' }}>{app.application_number}</code></td>
                  <td><strong>{app.student_first_name} {app.student_last_name}</strong></td>
                  <td>{app.course_name || '—'}</td>
                  <td>{app.parent_name}</td>
                  <td style={{ fontSize: '0.85rem' }}>{app.parent_phone}</td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {new Date(app.created_at).toLocaleDateString()}
                  </td>
                  <td><StatusBadge status={app.status} /></td>
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
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <ClipboardList size={32} style={{ marginBottom: '0.5rem' }} />
                    <p>No applications found{activeTab !== 'All' ? ` with status "${activeTab}"` : ''}.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Application Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '620px' }}>
            <div className="modal-header">
              <h3 className="modal-title">New Admission Application</h3>
              <button className="modal-close" onClick={() => setShowAdd(false)}>×</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Student Information</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>First Name *</label>
                    <input required value={addForm.student_first_name} onChange={e => setAddForm(f => ({ ...f, student_first_name: e.target.value }))} placeholder="First name" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Last Name *</label>
                    <input required value={addForm.student_last_name} onChange={e => setAddForm(f => ({ ...f, student_last_name: e.target.value }))} placeholder="Last name" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Date of Birth</label>
                    <input type="date" value={addForm.date_of_birth} onChange={e => setAddForm(f => ({ ...f, date_of_birth: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Gender</label>
                    <select value={addForm.gender} onChange={e => setAddForm(f => ({ ...f, gender: e.target.value }))}>
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
                    <select value={addForm.applying_for_course_id} onChange={e => setAddForm(f => ({ ...f, applying_for_course_id: e.target.value }))}>
                      <option value="">— Select Program —</option>
                      {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Academic Year *</label>
                    <select required value={addForm.academic_year_id} onChange={e => setAddForm(f => ({ ...f, academic_year_id: e.target.value }))}>
                      <option value="">— Select Year —</option>
                      {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                    </select>
                  </div>
                </div>

                <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Parent / Guardian</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Parent Name *</label>
                    <input required value={addForm.parent_name} onChange={e => setAddForm(f => ({ ...f, parent_name: e.target.value }))} placeholder="Full name" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Parent Phone *</label>
                    <input required value={addForm.parent_phone} onChange={e => setAddForm(f => ({ ...f, parent_phone: e.target.value }))} placeholder="+91 98765 43210" />
                  </div>
                  <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                    <label>Parent Email</label>
                    <input type="email" value={addForm.parent_email} onChange={e => setAddForm(f => ({ ...f, parent_email: e.target.value }))} placeholder="email@example.com" />
                  </div>
                </div>

                <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Previous Education</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Previous School</label>
                    <input value={addForm.previous_school} onChange={e => setAddForm(f => ({ ...f, previous_school: e.target.value }))} placeholder="Name of last school attended" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Previous Class</label>
                    <input value={addForm.previous_class} onChange={e => setAddForm(f => ({ ...f, previous_class: e.target.value }))} placeholder="e.g. Class 9" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={addLoading}>
                  {addLoading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
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
                        {label === 'Status' ? <StatusBadge status={String(value)} /> : value}
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

  function StatusBadge({ status }: { status: string }) {
    const style = APP_STATUS_COLORS[status] || { bg: '#f3f4f6', color: '#374151' };
    return (
      <span style={{
        display: 'inline-block', padding: '0.2rem 0.65rem', borderRadius: '9999px',
        fontSize: '0.75rem', fontWeight: 600, background: style.bg, color: style.color,
      }}>{status}</span>
    );
  }
}
