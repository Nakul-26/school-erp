import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Save } from 'lucide-react';

interface Institution {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  institution_type?: string;
}

export default function InstitutionSetup() {
  const { user } = useAuth();
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    logo: '',
    institution_type: 'college'
  });

  useEffect(() => {
    if (user?.institution_id) {
      fetchInstitution();
    }
  }, [user]);

  const fetchInstitution = async () => {
    if (!user?.institution_id) return;
    try {
      setLoading(true);
      const data = await api.get(`/institutions/${user.institution_id}`);
      setInstitution(data);
      setForm({
        name: data.name || '',
        address: data.address || '',
        phone: data.phone || '',
        email: data.email || '',
        logo: data.logo || '',
        institution_type: data.institution_type || 'college'
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch institution profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.institution_id) return;
    setError('');
    setMessage('');
    setSaving(true);
    try {
      await api.put(`/institutions/${user.institution_id}`, form);
      setMessage('Institution profile updated successfully!');
      fetchInstitution();
    } catch (err: any) {
      setError(err.message || 'Failed to update institution profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Layout><p>Loading institution profile...</p></Layout>;

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h2>Institution Setup</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Manage your organization's public profile, address, and contact details.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Card: Summary/Logo */}
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <div style={{ 
            width: '100px', 
            height: '100px', 
            borderRadius: '50%', 
            background: 'var(--primary-gradient)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: 'white',
            margin: '0 auto 1.5rem auto',
            boxShadow: 'var(--shadow-md)'
          }}>
            <Building2 size={48} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{institution?.name}</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem', textTransform: 'capitalize' }}>
            {institution?.institution_type?.replace('_', ' ')} Profile
          </p>
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem', textAlign: 'left', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div><strong style={{ color: '#475569' }}>Institution ID:</strong> <br/><code style={{ background: '#f8fafc', padding: '0.125rem 0.25rem', borderRadius: '4px', fontSize: '0.75rem' }}>{institution?.id}</code></div>
          </div>
        </div>

        {/* Right Card: Profile Form */}
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Institution Name</label>
              <input 
                type="text" 
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
                required 
                placeholder="e.g. Oxford Academy"
              />
            </div>

            <div className="form-group">
              <label>Address</label>
              <textarea 
                value={form.address} 
                onChange={(e) => setForm({ ...form, address: e.target.value })} 
                rows={3}
                placeholder="Enter street address, city, state, zip code"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Contact Phone</label>
                <input 
                  type="text" 
                  value={form.phone} 
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} 
                  placeholder="e.g. 555-0100"
                />
              </div>
              <div className="form-group">
                <label>Contact Email</label>
                <input 
                  type="email" 
                  value={form.email} 
                  onChange={(e) => setForm({ ...form, email: e.target.value })} 
                  placeholder="e.g. contact@oxford.edu"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Institution Logo URL</label>
                <input 
                  type="text" 
                  value={form.logo} 
                  onChange={(e) => setForm({ ...form, logo: e.target.value })} 
                  placeholder="e.g. https://example.com/logo.png"
                />
              </div>
              <div className="form-group">
                <label>Institution Type</label>
                <select 
                  value={form.institution_type} 
                  onChange={(e) => setForm({ ...form, institution_type: e.target.value })}
                >
                  <option value="school">School</option>
                  <option value="pu_college">PU College</option>
                  <option value="degree_college">Degree College</option>
                  <option value="engineering_college">Engineering College</option>
                </select>
              </div>
            </div>

            {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginTop: '1rem' }}>{error}</p>}
            {message && <p style={{ color: 'var(--success)', fontSize: '0.875rem', marginTop: '1rem', fontWeight: 600 }}>{message}</p>}

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Save size={16} /> {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </Layout>
  );
}
