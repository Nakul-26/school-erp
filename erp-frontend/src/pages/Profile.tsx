import './Profile.css';
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
              <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={photoLoading} className="profile-input-1"  />
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
            <div className="alert alert-danger profile-alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert-success profile-alert">
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

            <button type="submit" className="btn btn-primary profile-btn" disabled={loading}>
              <Save size={18} />
              {loading ? 'Saving Changes...' : 'Save Settings'}
            </button>
          </form>
        </div>
      </div>

      
    </Layout>
  );
}
