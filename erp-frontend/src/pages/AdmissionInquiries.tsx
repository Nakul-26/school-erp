import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Plus, ArrowRight, Eye, UserPlus, Filter } from 'lucide-react';

interface AcademicYear {
  id: string;
  name: string;
}

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

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  New:       { bg: '#eff6ff', color: '#3b82f6' },
  Contacted: { bg: '#f5f3ff', color: '#8b5cf6' },
  Applied:   { bg: '#fffbeb', color: '#f59e0b' },
  Admitted:  { bg: '#f0fdf4', color: '#16a34a' },
  Rejected:  { bg: '#fef2f2', color: '#dc2626' },
};

const ALL_STATUSES = ['New', 'Contacted', 'Applied', 'Admitted', 'Rejected'] as const;

export default function AdmissionInquiries() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('All');

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    student_name: '', parent_name: '', parent_phone: '', parent_email: '',
    date_of_birth: '', applying_for_class: '', source: 'Walk-in', notes: '', academic_year_id: '',
  });
  const [addLoading, setAddLoading] = useState(false);

  // Convert modal
  const [convertInquiry, setConvertInquiry] = useState<Inquiry | null>(null);
  const [convertLoading, setConvertLoading] = useState(false);

  // Detail modal
  const [detailInquiry, setDetailInquiry] = useState<Inquiry | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [inqs, years] = await Promise.all([
        api.get('/admissions/inquiries'),
        api.get('/academic-years'),
      ]);
      setInquiries(inqs);
      setAcademicYears(years);
    } catch (err) {
      console.error('Error fetching admission inquiries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      await api.post('/admissions/inquiries', {
        ...addForm,
        parent_email: addForm.parent_email || undefined,
        date_of_birth: addForm.date_of_birth || undefined,
        academic_year_id: addForm.academic_year_id || undefined,
        notes: addForm.notes || undefined,
      });
      setShowAdd(false);
      setAddForm({
        student_name: '', parent_name: '', parent_phone: '', parent_email: '',
        date_of_birth: '', applying_for_class: '', source: 'Walk-in', notes: '', academic_year_id: '',
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create inquiry');
    } finally {
      setAddLoading(false);
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
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to convert inquiry');
    } finally {
      setConvertLoading(false);
    }
  };

  // Stat counts
  const counts = ALL_STATUSES.reduce((acc, s) => {
    acc[s] = inquiries.filter(i => i.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const filtered = activeTab === 'All' ? inquiries : inquiries.filter(i => i.status === activeTab);

  const StatusBadge = ({ status }: { status: string }) => {
    const style = STATUS_COLORS[status] || { bg: '#f3f4f6', color: '#374151' };
    return (
      <span style={{
        display: 'inline-block',
        padding: '0.2rem 0.65rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        background: style.bg,
        color: style.color,
      }}>{status}</span>
    );
  };

  return (
    <Layout>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2>Admission Inquiries</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Track and manage prospective student inquiries and leads
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Plus size={16} /> Add Inquiry
        </button>
      </div>

      <div style={{
        padding: '1rem 1.25rem',
        backgroundColor: '#eff6ff',
        borderLeft: '4px solid #3b82f6',
        borderRadius: '6px',
        fontSize: '0.875rem',
        color: '#1e3a8a',
        lineHeight: '1.5'
      }}>
        <strong>💡 Page Guidance:</strong> Admission Inquiry portal tracks all walk-in, phone, or online admission leads. Click <em>Add Inquiry</em> to record basic student and parent details. Once checked or contacted, click the action buttons in the list to update status or <em>Convert</em> the inquiry into a formal student application.
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {ALL_STATUSES.map(status => {
          const style = STATUS_COLORS[status];
          return (
            <div key={status} className="card" style={{ padding: '1rem 1.25rem', borderLeft: `4px solid ${style.color}`, margin: 0 }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: style.color }}>{counts[status] || 0}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{status}</div>
            </div>
          );
        })}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {['All', ...ALL_STATUSES].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: '9999px',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              fontSize: '0.85rem',
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
              {filtered.map(inq => (
                <tr key={inq.id}>
                  <td><strong>{inq.student_name}</strong></td>
                  <td>{inq.parent_name}</td>
                  <td>{inq.parent_phone}</td>
                  <td>{inq.applying_for_class}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{inq.source}</td>
                  <td><StatusBadge status={inq.status} /></td>
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
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <UserPlus size={32} style={{ marginBottom: '0.5rem' }} />
                    <p>No inquiries found{activeTab !== 'All' ? ` with status "${activeTab}"` : ''}.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Inquiry Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Add Admission Inquiry</h3>
              <button className="modal-close" onClick={() => setShowAdd(false)}>×</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Student Name *</label>
                  <input
                    required value={addForm.student_name}
                    onChange={e => setAddForm(f => ({ ...f, student_name: e.target.value }))}
                    placeholder="Full name of the student"
                  />
                </div>
                <div className="form-group">
                  <label>Parent / Guardian Name *</label>
                  <input
                    required value={addForm.parent_name}
                    onChange={e => setAddForm(f => ({ ...f, parent_name: e.target.value }))}
                    placeholder="Parent's full name"
                  />
                </div>
                <div className="form-group">
                  <label>Parent Phone *</label>
                  <input
                    required value={addForm.parent_phone}
                    onChange={e => setAddForm(f => ({ ...f, parent_phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div className="form-group">
                  <label>Parent Email</label>
                  <input
                    type="email" value={addForm.parent_email}
                    onChange={e => setAddForm(f => ({ ...f, parent_email: e.target.value }))}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date" value={addForm.date_of_birth}
                    onChange={e => setAddForm(f => ({ ...f, date_of_birth: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Applying For Class *</label>
                  <input
                    required value={addForm.applying_for_class}
                    onChange={e => setAddForm(f => ({ ...f, applying_for_class: e.target.value }))}
                    placeholder="e.g. Grade 5, Class X"
                  />
                </div>
                <div className="form-group">
                  <label>Source</label>
                  <select value={addForm.source} onChange={e => setAddForm(f => ({ ...f, source: e.target.value }))}>
                    <option>Walk-in</option>
                    <option>Phone</option>
                    <option>Website</option>
                    <option>Referral</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Academic Year</label>
                  <select value={addForm.academic_year_id} onChange={e => setAddForm(f => ({ ...f, academic_year_id: e.target.value }))}>
                    <option value="">— Select Year —</option>
                    {academicYears.map(y => (
                      <option key={y.id} value={y.id}>{y.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Notes</label>
                  <textarea
                    value={addForm.notes}
                    onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))}
                    rows={3}
                    placeholder="Any additional notes or observations..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={addLoading}>
                  {addLoading ? 'Adding...' : 'Add Inquiry'}
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
                This will create an application record and mark this inquiry as <strong>Applied</strong>. You can review and approve the application from the Applications page.
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

      {/* Detail Modal */}
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
                        {label === 'Status' ? <StatusBadge status={String(value)} /> : value}
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
    </Layout>
  );
}
