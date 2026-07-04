import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { PageGuidance } from '../components/PageGuidance';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Camera, User, Mail, Phone, Lock, Save, AlertCircle, CheckCircle } from 'lucide-react';

export default function Profile() {
  const auth = useAuth();
  const user = auth.user;
  const setUser = auth.setUser;
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const u = user as any;

  // States for form inputs
  const [name, setName] = useState(u.name || '');
  const [email, setEmail] = useState(u.email || '');
  const [phone, setPhone] = useState(u.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Status states
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load current user profile details
  useEffect(() => {
    if (u?.id) {
      fetchProfile();
    }
  }, [u?.id]);

  const fetchProfile = async () => {
    try {
      const data = await api.get(`/users/${u.id}`);
      setName(data.name || '');
      setEmail(data.email || '');
      setPhone(data.phone || '');
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch profile details.');
    }
  };

  const getPhotoUrl = (photoPath?: string) => {
    if (!photoPath) return '';
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787';
    const path = photoPath.startsWith('/') ? photoPath : `/${photoPath}`;
    return `${baseUrl}${path}`;
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (newPassword && newPassword !== confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword && !currentPassword) {
      setError('Current password is required to set a new password');
      setLoading(false);
      return;
    }

    try {
      const payload: any = { name, email, phone };
      if (newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }

      await api.post('/users/profile', payload);
      setSuccess('Profile updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Update local storage user if email/name changes
      const updatedUser = { ...u, name, email };
      localStorage.setItem('erp_user', JSON.stringify(updatedUser));
      if (setUser) {
        setUser(updatedUser);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update profile details.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (!file) return;

    setError(null);
    setSuccess(null);
    setPhotoLoading(true);

    // Simple validation
    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed');
      setPhotoLoading(false);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      setPhotoLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.upload('/users/profile-photo', formData);
      setSuccess('Profile picture updated successfully.');
      
      // Update local state / storage
      const photoUrl = response.url;
      const updatedUser = { ...u, profile_photo: photoUrl };
      localStorage.setItem('erp_user', JSON.stringify(updatedUser));
      if (setUser) {
        setUser(updatedUser);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo.');
    } finally {
      setPhotoLoading(false);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>My Profile</h1>
      </div>

      <div className="profile-container">
        {/* Left Side: Avatar / Photo Management */}
        <div className="profile-sidebar card">
          <div className="avatar-wrapper">
            {u?.profile_photo ? (
              <img 
                src={getPhotoUrl(u.profile_photo)} 
                alt={u.name} 
                className="profile-avatar"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
                }}
              />
            ) : (
              <div className="avatar-placeholder">
                <User size={64} />
              </div>
            )}
            
            <label className="upload-btn">
              <Camera size={18} />
              {photoLoading ? 'Uploading...' : 'Change Photo'}
              <input 
                type="file" 
                accept="image/*" 
                onChange={handlePhotoUpload} 
                disabled={photoLoading}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          <div className="user-meta">
            <h2>{name || u?.name}</h2>
            <p className="user-username">@{u?.username || u?.email?.split('@')[0]}</p>
            <div className="roles-tags">
              {(u?.roles || [u?.role || 'User']).map((r: string) => (
                <span key={r} className="badge badge-primary">{r}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Account Settings Form */}
        <div className="profile-main card">
          <h3>Account Settings</h3>

          {error && (
            <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <CheckCircle size={18} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleDetailsSubmit} className="profile-form">
            <div className="form-grid">
              <div className="form-group">
                <label>Full Name</label>
                <div className="input-with-icon">
                  <User size={18} className="input-icon" />
                  <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                    placeholder="Enter full name"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <div className="input-with-icon">
                  <Mail size={18} className="input-icon" />
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <div className="input-with-icon">
                  <Phone size={18} className="input-icon" />
                  <input 
                    type="tel" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
            </div>

            <div className="password-section">
              <h4>Change Password</h4>
              <p className="help-text">Leave blank if you don't want to change your password.</p>

              <div className="form-grid">
                <div className="form-group">
                  <label>Current Password</label>
                  <div className="input-with-icon">
                    <Lock size={18} className="input-icon" />
                    <input 
                      type="password" 
                      value={currentPassword} 
                      onChange={(e) => setCurrentPassword(e.target.value)} 
                      placeholder="Enter current password"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>New Password</label>
                  <div className="input-with-icon">
                    <Lock size={18} className="input-icon" />
                    <input 
                      type="password" 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)} 
                      placeholder="Enter new password"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Confirm New Password</label>
                  <div className="input-with-icon">
                    <Lock size={18} className="input-icon" />
                    <input 
                      type="password" 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content' }}>
              <Save size={18} />
              {loading ? 'Saving Changes...' : 'Save Settings'}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        .profile-container {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 2rem;
          margin-top: 1rem;
        }

        @media (max-width: 768px) {
          .profile-container {
            grid-template-columns: 1fr;
          }
        }

        .profile-sidebar {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2.5rem 1.5rem;
          text-align: center;
        }

        .avatar-wrapper {
          position: relative;
          margin-bottom: 1.5rem;
        }

        .profile-avatar {
          width: 140px;
          height: 140px;
          border-radius: 50%;
          object-fit: cover;
          border: 4px solid var(--border-color);
        }

        .avatar-placeholder {
          width: 140px;
          height: 140px;
          border-radius: 50%;
          background: #f0f2f5;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #8c8c8c;
          border: 4px solid var(--border-color);
        }

        .upload-btn {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          background: var(--primary);
          color: white;
          padding: 0.4rem 0.8rem;
          border-radius: 20px;
          font-size: 0.75rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          transition: background 0.2s;
        }

        .upload-btn:hover {
          background: #0f1c3f;
        }

        .user-meta h2 {
          font-size: 1.25rem;
          margin: 0 0 0.25rem 0;
        }

        .user-username {
          color: #8c8c8c;
          margin: 0 0 1rem 0;
          font-size: 0.9rem;
        }

        .roles-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          justify-content: center;
        }

        .profile-main {
          padding: 2rem;
        }

        .profile-main h3 {
          margin: 0 0 1.5rem 0;
          font-size: 1.25rem;
        }

        .profile-form {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #434343;
        }

        .input-with-icon {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #8c8c8c;
          pointer-events: none;
        }

        .input-with-icon input {
          width: 100%;
          padding: 0.6rem 0.6rem 0.6rem 2.5rem;
          border: 1px solid #d9d9d9;
          border-radius: 6px;
          outline: none;
          transition: all 0.2s;
          box-sizing: border-box;
        }

        .input-with-icon input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
        }

        .password-section {
          border-top: 1px solid var(--border-color);
          padding-top: 1.5rem;
        }

        .password-section h4 {
          margin: 0 0 0.25rem 0;
          font-size: 1rem;
        }

        .help-text {
          color: #8c8c8c;
          font-size: 0.8rem;
          margin: 0 0 1rem 0;
        }
      `}</style>
    </Layout>
  );
}
