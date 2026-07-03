import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Plus, Check, Clock, User, Phone, ArrowLeft, LogOut } from 'lucide-react';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';

interface Visitor {
  id: string;
  name: string;
  purpose: string;
  host_name: string;
  phone: string;
  in_time: string;
  out_time: string | null;
  created_at: string;
}

export default function Visitors() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    purpose: 'Parent Meeting',
    host_name: '',
    phone: '',
    in_time: '',
  });

  const fetchVisitors = async () => {
    try {
      setLoading(true);
      const data = await api.get('/visitors');
      setVisitors(data);
    } catch (err) {
      console.error('Error fetching visitors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitors();
    
    // Set default current time for form
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setForm(f => ({ ...f, in_time: timeStr }));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.host_name || !form.phone) {
      return alert('Please fill in all required fields.');
    }

    try {
      setSaving(true);
      await api.post('/visitors', form);
      setShowAddModal(false);
      
      // Reset form
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setForm({
        name: '',
        purpose: 'Parent Meeting',
        host_name: '',
        phone: '',
        in_time: timeStr,
      });

      alert('Visitor checked in successfully.');
      fetchVisitors();
    } catch (err: any) {
      alert(err.message || 'Failed to check in visitor.');
    } finally {
      setSaving(false);
    }
  };

  const handleCheckout = async (id: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    try {
      await api.patch(`/visitors/${id}/checkout`, { out_time: timeStr });
      alert('Visitor checked out.');
      fetchVisitors();
    } catch (err: any) {
      alert(err.message || 'Failed to check out visitor.');
    }
  };

  const getPurposeBadgeColor = (purpose: string) => {
    const p = purpose.toLowerCase();
    if (p.includes('parent')) return { bg: '#eff6ff', color: '#1e40af' };
    if (p.includes('vendor') || p.includes('delivery')) return { bg: '#fff7ed', color: '#c2410c' };
    if (p.includes('interview')) return { bg: '#f5f3ff', color: '#6d28d9' };
    return { bg: '#f1f5f9', color: '#475569' };
  };

  return (
    <Layout>
      <PageGuidance
        title="Visitor Register"
        description="Monitor and record visitor logs for security and administration. Receptionists can register new entries and record checkout times."
        steps={[
          'Click Check-In Visitor to log a new entry.',
          'Provide the visitor’s contact, host staff member, and purpose of meeting.',
          'Click Check-Out next to checked-in visitors when they exit the premises.'
        ]}
      />

      <div className="page-header">
        <div>
          <h2>Visitor Register Log</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Track guest entries and checked-out visitors
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} /> Check-In Visitor
        </button>
      </div>

      <div className="card">
        {loading ? (
          <SkeletonLoader type="table" rows={5} cols={6} />
        ) : visitors.length === 0 ? (
          <EmptyState
            title="No Visitors Logged"
            description="The guest book is empty. Log walk-in parents, vendors, or deliveries as they arrive."
            icon={User}
            action={{
              label: "Check-In Visitor",
              onClick: () => setShowAddModal(true)
            }}
          />
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Visitor Name</th>
                  <th>Phone No.</th>
                  <th>Purpose</th>
                  <th>Meeting Host</th>
                  <th>Times (In / Out)</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visitors.map((v) => {
                  const purposeStyle = getPurposeBadgeColor(v.purpose);
                  const isCheckedIn = !v.out_time;

                  return (
                    <tr key={v.id}>
                      <td><strong>{v.name}</strong></td>
                      <td>{v.phone}</td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '12px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: purposeStyle.bg,
                          color: purposeStyle.color
                        }}>
                          {v.purpose}
                        </span>
                      </td>
                      <td>{v.host_name}</td>
                      <td style={{ fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                          <span>{v.in_time} {v.out_time ? `— ${v.out_time}` : ''}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          backgroundColor: isCheckedIn ? '#e6fffa' : '#f1f5f9',
                          color: isCheckedIn ? '#0f766e' : '#475569'
                        }}>
                          {isCheckedIn ? 'Checked In' : 'Completed'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isCheckedIn ? (
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => handleCheckout(v.id)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', borderColor: '#c2410c', color: '#c2410c' }}
                          >
                            <LogOut size={12} /> Checkout
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Logged Out</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Visitor Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">New Visitor Registration</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label>Visitor Full Name *</label>
                  <input
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    required
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="e.g. +91 98765 43210"
                  />
                </div>
                <div className="form-group">
                  <label>Purpose of Visit *</label>
                  <select
                    value={form.purpose}
                    onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                  >
                    <option>Parent Meeting</option>
                    <option>Vendor / Delivery</option>
                    <option>Official Enquiry</option>
                    <option>Job Interview</option>
                    <option>Guest Speaker</option>
                    <option>Other Visit</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Meeting Host (Staff Name) *</label>
                  <input
                    required
                    value={form.host_name}
                    onChange={e => setForm(f => ({ ...f, host_name: e.target.value }))}
                    placeholder="e.g. Mr. Ram Prasad (Principal)"
                  />
                </div>
                <div className="form-group">
                  <label>Entry Time (In Time)</label>
                  <input
                    value={form.in_time}
                    onChange={e => setForm(f => ({ ...f, in_time: e.target.value }))}
                    placeholder="e.g. 10:30 AM"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Registering...' : 'Register Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
