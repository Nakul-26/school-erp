import './InstitutionSetup.css';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import Layout from '../components/Layout';
import { api, getAuthenticatedUrl } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Building2, Save, Upload, MapPin, Phone, Mail, Hash, AlertCircle } from 'lucide-react';

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
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [institution, setInstitution] = useState<Institution | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

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
      const data: Institution = await api.get(`/institutions/${user.institution_id}`);
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
      toast.error(err.message || 'Failed to fetch institution profile.');
    } finally {
      setLoading(false);
    }
  };

  // Dirty state detection
  const isDirty = useMemo(() => {
    if (!institution) return false;
    return (
      form.name !== (institution.name || '') ||
      form.address !== (institution.address || '') ||
      form.phone !== (institution.phone || '') ||
      form.email !== (institution.email || '') ||
      form.logo !== (institution.logo || '') ||
      form.institution_type !== (institution.institution_type || 'college')
    );
  }, [form, institution]);

  // Client side validation
  const validateForm = (): string | null => {
    if (!form.name || form.name.trim().length < 2) {
      return 'Institution name must be at least 2 characters long.';
    }
    if (form.email && form.email.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email.trim())) {
        return 'Please enter a valid email address.';
      }
    }
    if (form.phone && form.phone.trim().length > 0) {
      const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
      if (!phoneRegex.test(form.phone.trim())) {
        return 'Please enter a valid phone number (digits, spaces, + or -).';
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.institution_id) return;

    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSaving(true);
    try {
      await api.put(`/institutions/${user.institution_id}`, form);
      toast.success('Institution profile updated successfully!');
      fetchInstitution();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update institution profile.');
    } finally {
      setSaving(false);
    }
  };

  // Logo file upload handler
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.institution_id) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB.');
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.upload(`/institutions/${user.institution_id}/logo`, formData);
      if (res.url) {
        setForm(prev => ({ ...prev, logo: res.url }));
        toast.success('Institution logo uploaded successfully!');
        fetchInstitution();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload logo.');
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (loading) {
    return (
      <Layout>
        <PageGuidance
          title="Institution Profile"
          description="Manage your organization's public profile, logo, address, and contact details."
          steps={[
            "Fill in official institution name, type, contact details, and address.",
            "Upload institution logo for report cards and official receipts.",
            "Click \"Save Profile\" to persist changes."
          ]}
        />
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>Loading institution profile...</p>
        </div>
      </Layout>
    );
  }

  const logoPreviewUrl = form.logo ? getAuthenticatedUrl(form.logo) : '';

  return (
    <Layout>
      <PageGuidance
        title="Institution Profile"
        description="Manage your organization's public profile, logo, address, and contact details."
        steps={[
          "Fill in official institution name, type, contact details, and address.",
          "Upload institution logo for report cards and official receipts.",
          "Click \"Save Profile\" to persist changes."
        ]}
      />

      <div className="page-header">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            Institution Profile
            {isDirty && <span className="unsaved-badge"><AlertCircle size={12} /> Unsaved Changes</span>}
          </h2>
          <p className="institution-setup-text-1">
            Manage your organization's public identity, contact channels, and system branding.
          </p>
        </div>
      </div>

      <div className="institution-setup-grid-2">
        {/* Left Card: Summary/Logo */}
        <div className="card institution-setup-card">
          <div className="institution-setup-row-4">
            {logoPreviewUrl ? (
              <img 
                src={logoPreviewUrl} 
                alt="Institution Logo" 
                className="institution-logo-img" 
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <Building2 size={44} />
            )}
          </div>
          <h3 className="institution-setup-title-5">{form.name || institution?.name || 'Institution'}</h3>
          <p className="institution-setup-text-6">
            {(form.institution_type || institution?.institution_type || 'college').replace('_', ' ')}
          </p>

          <div className="institution-setup-col-7">
            {form.phone && (
              <div className="institution-contact-item">
                <Phone size={16} />
                <span>{form.phone}</span>
              </div>
            )}
            {form.email && (
              <div className="institution-contact-item">
                <Mail size={16} />
                <span>{form.email}</span>
              </div>
            )}
            {form.address && (
              <div className="institution-contact-item">
                <MapPin size={16} />
                <span>{form.address}</span>
              </div>
            )}
            <div className="institution-contact-item" style={{ marginTop: '0.5rem' }}>
              <Hash size={16} />
              <div>
                <strong className="institution-setup-strong-8">Institution ID:</strong><br />
                <code className="institution-setup-code-9">{institution?.id}</code>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Profile Form */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.35rem', display: 'block' }}>
                Institution Name *
              </label>
              <input 
                type="text" 
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
                required 
                placeholder="e.g. Oxford Academy"
                className="input"
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.35rem', display: 'block' }}>
                Address
              </label>
              <textarea 
                value={form.address} 
                onChange={(e) => setForm({ ...form, address: e.target.value })} 
                rows={3}
                placeholder="Enter street address, city, state, zip code"
                className="input"
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            <div className="institution-setup-grid-10" style={{ marginBottom: '1.25rem' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.35rem', display: 'block' }}>
                  Contact Phone
                </label>
                <input 
                  type="text" 
                  value={form.phone} 
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} 
                  placeholder="e.g. +1 555-0100"
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.35rem', display: 'block' }}>
                  Contact Email
                </label>
                <input 
                  type="email" 
                  value={form.email} 
                  onChange={(e) => setForm({ ...form, email: e.target.value })} 
                  placeholder="e.g. contact@oxford.edu"
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div className="institution-setup-grid-11" style={{ marginBottom: '1.25rem' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.35rem', display: 'block' }}>
                  Institution Type
                </label>
                <select 
                  value={form.institution_type} 
                  onChange={(e) => setForm({ ...form, institution_type: e.target.value })}
                  className="input"
                  style={{ width: '100%' }}
                >
                  <option value="school">School</option>
                  <option value="pu_college">PU College</option>
                  <option value="degree_college">Degree College</option>
                  <option value="engineering_college">Engineering College</option>
                  <option value="university">University</option>
                  <option value="coaching">Coaching / Academy</option>
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.35rem', display: 'block' }}>
                  Institution Logo
                </label>
                <div className="logo-upload-container">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                  <div className="logo-upload-actions">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="logo-upload-btn"
                      disabled={uploadingLogo}
                    >
                      <Upload size={14} />
                      {uploadingLogo ? 'Uploading Logo...' : 'Upload Logo File'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowUrlInput(!showUrlInput)}
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      {showUrlInput ? 'Hide URL field' : 'Use custom URL'}
                    </button>
                  </div>
                  {showUrlInput && (
                    <input 
                      type="text" 
                      value={form.logo} 
                      onChange={(e) => setForm({ ...form, logo: e.target.value })} 
                      placeholder="https://example.com/logo.png"
                      className="input"
                      style={{ width: '100%', marginTop: '0.35rem', fontSize: '0.85rem' }}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="institution-setup-row-14">
              <div>
                {isDirty && (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    You have unsaved changes.
                  </span>
                )}
              </div>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={!isDirty || saving}
              >
                <Save size={16} /> {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
