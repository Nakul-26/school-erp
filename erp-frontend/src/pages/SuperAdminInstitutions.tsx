import './InstitutionSetup.css';
import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { PageGuidance } from '../components/PageGuidance';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { Building2, Plus, Trash2, Search } from 'lucide-react';

interface Institution {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  institution_type?: string;
  created_at: string;
}

const INSTITUTION_TYPES = [
  { value: 'school', label: 'School' },
  { value: 'college', label: 'College' },
  { value: 'pu_college', label: 'PU College' },
  { value: 'degree_college', label: 'Degree College' },
  { value: 'engineering_college', label: 'Engineering College' },
  { value: 'university', label: 'University' },
  { value: 'coaching', label: 'Coaching Institute' },
];

const emptyForm = { name: '', address: '', phone: '', email: '', institution_type: 'college' };

export default function SuperAdminInstitutions() {
  const toast = useToast();

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchInstitutions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchInstitutions = async (search?: string) => {
    try {
      setLoading(true);
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await api.get(`/institutions${query}`);
      setInstitutions(res.data || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load institutions.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInstitutions(searchQuery);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      await api.post('/institutions', form);
      toast.success(`Institution "${form.name}" created successfully.`);
      setShowCreateModal(false);
      setForm(emptyForm);
      fetchInstitutions(searchQuery);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create institution.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (inst: Institution) => {
    if (!confirm(`Delete institution "${inst.name}"? This cannot be undone from this screen.`)) return;
    try {
      await api.delete(`/institutions/${inst.id}`);
      toast.success(`Institution "${inst.name}" deleted.`);
      fetchInstitutions(searchQuery);
    } catch (err: any) {
      // The backend applies delete-protection safeguards (last institution,
      // or one still has active users/students/teachers) — surface that clearly.
      toast.error(err.message || 'Failed to delete institution.');
    }
  };

  return (
    <Layout>
      <PageGuidance
        title="All Institutions (Super Admin)"
        description="Create, browse, and remove institutions/tenants across the entire platform."
        steps={["Search for an existing institution by name, email, or address.", "Click \"Add Institution\" to onboard a new tenant.", "Deleting an institution is blocked while it still has active users, students, or teachers."]}
      />

      <div className="page-header">
        <div>
          <h2>All Institutions</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {total} institution{total === 1 ? '' : 's'} registered on this platform
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setShowCreateModal(true); }}>
          <Plus size={18} /> Add Institution
        </button>
      </div>

      <div className="card filters" style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', padding: '1rem' }}>
        <form onSubmit={handleSearch} className="search-container" style={{ flex: 1, maxWidth: '360px' }}>
          <Search size={14} />
          <input
            type="text"
            placeholder="Search by name, email, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
      </div>

      <div className="card">
        {loading ? <p>Loading institutions...</p> : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Contact</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {institutions.map((inst) => (
                <tr key={inst.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Building2 size={16} style={{ color: 'var(--primary)' }} />
                      <strong>{inst.name}</strong>
                    </div>
                    {inst.address && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{inst.address}</div>}
                  </td>
                  <td>{INSTITUTION_TYPES.find(t => t.value === inst.institution_type)?.label || inst.institution_type || '-'}</td>
                  <td>
                    {inst.email && <div>{inst.email}</div>}
                    {inst.phone && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{inst.phone}</div>}
                    {!inst.email && !inst.phone && '-'}
                  </td>
                  <td>{new Date(inst.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(inst)} title="Delete institution">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
              {institutions.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No institutions match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Add New Institution</h3>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Institution Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Riverside Public School"
                  required
                  minLength={2}
                />
              </div>
              <div className="form-group">
                <label>Institution Type</label>
                <select
                  value={form.institution_type}
                  onChange={(e) => setForm({ ...form, institution_type: e.target.value })}
                >
                  {INSTITUTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Institution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
