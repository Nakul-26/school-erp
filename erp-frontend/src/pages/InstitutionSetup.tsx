import './InstitutionSetup.css';
import React, { useState, useEffect } from 'react';
import { PageGuidance } from '../components/PageGuidance';
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

  if (loading) return <Layout>
      <PageGuidance
        title="School Profile"
        description="Use this page to enter and update your school's general details, contact information, and logo."
        steps={["Fill in the school's official name, address, phone number, and email.","Upload the school logo that will appear on receipts and report cards.","Click \"Save Changes\" to update the details."]}
      /><p>Loading institution profile...</p></Layout>;

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h2>Institution Setup</h2>
          <p className="institution-setup-text-1">
            Manage your organization's public profile, address, and contact details.
          </p>
        </div>
      </div>

      <div className="institution-setup-grid-2">
        
        {/* Left Card: Summary/Logo */}
        <div className="card institution-setup-card">
          <div className="institution-setup-row-4">
            <Building2 size={48} />
          </div>
          <h3 className="institution-setup-title-5">{institution?.name}</h3>
          <p className="institution-setup-text-6">
            {institution?.institution_type?.replace('_', ' ')} Profile
          </p>
          <div className="institution-setup-col-7">
            <div><strong className="institution-setup-strong-8">Institution ID:</strong> <br/><code className="institution-setup-code-9">{institution?.id}</code></div>
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

            <div className="institution-setup-grid-10">
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

            <div className="institution-setup-grid-11">
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

            {error && <p className="institution-setup-text-12">{error}</p>}
            {message && <p className="institution-setup-text-13">{message}</p>}

            <div className="institution-setup-row-14">
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
