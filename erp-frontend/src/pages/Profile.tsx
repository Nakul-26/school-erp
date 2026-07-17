import './Profile.css';
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { PageGuidance } from '../components/PageGuidance';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { 
  Camera, User, Mail, Phone, Lock, Save, AlertCircle, CheckCircle, 
  Smartphone, Trash2, Bell, ShieldAlert, Laptop, Info, Download, CheckCircle2
} from 'lucide-react';
import { subscribeToPushNotifications, unsubscribeFromPushNotifications } from '../services/pushNotification';
import { canInstallPwa, isPwaInstalled, triggerPwaInstall } from '../services/pwaInstall';

function parseUserAgent(ua: string) {
  if (!ua) return 'Unknown Device';
  let browser = 'Browser';
  let os = 'Device';

  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';

  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Macintosh')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return `${browser} on ${os}`;
}

export default function Profile() {
  const auth = useAuth();
  const user = auth.user;
  const setUser = auth.setUser;
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const u = user as any;

  // Active sub-tab under Profile Settings
  const [activeTab, setActiveTab] = useState<'details' | 'notifications' | 'devices' | 'install'>('details');

  // PWA Install state
  const [installState, setInstallState] = useState<'installable' | 'installed' | 'unavailable'>(
    isPwaInstalled() ? 'installed' : canInstallPwa() ? 'installable' : 'unavailable'
  );
  const [installing, setInstalling] = useState(false);

  // States for Profile Form
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

  // Push Notifications and Devices States
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
  const [prefLoading, setPrefLoading] = useState(false);
  const [prefSuccess, setPrefSuccess] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);

  // Load profile, push state and devices
  useEffect(() => {
    if (u?.id) {
      fetchProfile();
      loadNotificationPreferences();
      loadDevices();
      if ('Notification' in window) {
        setPermissionState(Notification.permission);
      }
    }
  }, [u?.id, activeTab]);

  useEffect(() => {
    const checkPwaStatus = () => {
      if (isPwaInstalled()) {
        setInstallState('installed');
      } else if (canInstallPwa()) {
        setInstallState('installable');
      } else {
        setInstallState('unavailable');
      }
    };

    checkPwaStatus();

    const handlePrompt = () => {
      setInstallState('installable');
    };
    window.addEventListener('beforeinstallprompt', handlePrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
    };
  }, [activeTab]);

  const handleInstallClick = async () => {
    setInstalling(true);
    try {
      const outcome = await triggerPwaInstall();
      if (outcome === 'accepted') {
        setInstallState('installed');
      } else if (outcome === 'unavailable') {
        setInstallState('unavailable');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setInstalling(false);
    }
  };

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

  const loadNotificationPreferences = async () => {
    try {
      setPrefLoading(true);
      const res = await api.get('/notifications/push/preferences');
      setPreferences(res.preferences || {});
    } catch (err) {
      console.error('Failed to load push preferences:', err);
    } finally {
      setPrefLoading(false);
    }
  };

  const saveNotificationPreferences = async () => {
    try {
      setPrefLoading(true);
      setPrefSuccess(false);
      await api.post('/notifications/push/preferences', { preferences });
      setPrefSuccess(true);
      setTimeout(() => setPrefSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save push preferences:', err);
      alert('Failed to save notification preferences.');
    } finally {
      setPrefLoading(false);
    }
  };

  const loadDevices = async () => {
    try {
      setDevicesLoading(true);
      const data = await api.get('/notifications/push/devices');
      setDevices(data || []);
    } catch (err) {
      console.error('Failed to load registered devices:', err);
    } finally {
      setDevicesLoading(false);
    }
  };

  const handleUnregisterDevice = async (deviceId: string) => {
    if (!confirm('Unregister this device? You will stop receiving push notifications on it.')) return;
    try {
      await api.delete(`/notifications/push/devices/${deviceId}`);
      setDevices(prev => prev.filter(d => d.id !== deviceId));
    } catch (err) {
      alert('Failed to unregister device.');
    }
  };

  const handleEnablePush = async () => {
    if (!('Notification' in window)) {
      alert('Push notifications are not supported by this browser.');
      return;
    }
    
    // Subscribe using helper
    await subscribeToPushNotifications();
    setPermissionState(Notification.permission);
    loadDevices();
  };

  const handleDisablePush = async () => {
    await unsubscribeFromPushNotifications();
    setPermissionState(Notification.permission);
    loadDevices();
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

  // Determine user role categories for notifications
  const userRoles = u?.roles || (u?.role ? [u.role] : []);
  const isStudent = userRoles.some((r: string) => ['Student', 'student'].includes(r));
  const isParent = userRoles.some((r: string) => ['Parent', 'parent', 'Guardian', 'guardian'].includes(r));
  const isTeacher = userRoles.some((r: string) => ['Teacher', 'HOD', 'teacher', 'hod'].includes(r));

  return (
    <Layout>
      <PageGuidance
        title="My Profile & Settings"
        description="Configure your personal profile details, modify password credentials, and manage push notifications and active devices."
        steps={[
          "Account Details tab allows updating your email, phone number, and password credentials.",
          "Notifications tab allows checking your browser permission status and enabling/disabling targeted categories.",
          "Registered Devices tab lists all browsers and devices registered to receive notifications under your user ID."
        ]}
      />

      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <h2>My Profile & Settings</h2>
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
              {userRoles.map((r: string) => (
                <span key={r} className="badge badge-primary">{r}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Tabbed Interface for Settings */}
        <div className="profile-main card">
          {/* Sub-tab navigation */}
          <div className="profile-tabs" style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
            <button 
              type="button" 
              className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`} 
              onClick={() => setActiveTab('details')}
              style={{ padding: '0.75rem 0.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'details' ? '3px solid var(--primary)' : '3px solid transparent', color: activeTab === 'details' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: activeTab === 'details' ? '700' : '400', cursor: 'pointer' }}
            >
              Account Details
            </button>
            <button 
              type="button" 
              className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`} 
              onClick={() => setActiveTab('notifications')}
              style={{ padding: '0.75rem 0.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'notifications' ? '3px solid var(--primary)' : '3px solid transparent', color: activeTab === 'notifications' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: activeTab === 'notifications' ? '700' : '400', cursor: 'pointer' }}
            >
              Notifications
            </button>
            <button 
              type="button" 
              className={`tab-btn ${activeTab === 'devices' ? 'active' : ''}`} 
              onClick={() => setActiveTab('devices')}
              style={{ padding: '0.75rem 0.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'devices' ? '3px solid var(--primary)' : '3px solid transparent', color: activeTab === 'devices' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: activeTab === 'devices' ? '700' : '400', cursor: 'pointer' }}
            >
              Registered Devices
            </button>
            <button 
              type="button" 
              className={`tab-btn ${activeTab === 'install' ? 'active' : ''}`} 
              onClick={() => setActiveTab('install')}
              style={{ padding: '0.75rem 0.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'install' ? '3px solid var(--primary)' : '3px solid transparent', color: activeTab === 'install' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: activeTab === 'install' ? '700' : '400', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              📲 Install App
            </button>
          </div>

          {/* TAB 1: Account Details */}
          {activeTab === 'details' && (
            <>
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
            </>
          )}

          {/* TAB 2: Notifications Setup */}
          {activeTab === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h3>Notification Settings</h3>

              {/* Status Banner */}
              {permissionState === 'denied' ? (
                <div style={{ padding: '1.25rem', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <ShieldAlert size={24} style={{ color: '#ef4444', flexShrink: 0 }} />
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0', color: '#991b1b', fontWeight: '700' }}>Push Notifications Blocked</h4>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#7f1d1d', lineHeight: '1.4' }}>
                      You have blocked notifications for this site. You won't receive immediate attendance updates, exam marks, or fee alerts.
                    </p>
                    <div style={{ background: '#fff', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.8rem', color: '#451a03', border: '1px solid #fed7aa', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <strong>To enable notifications manually:</strong>
                      <span>1. Click the 🔒 lock icon near the address bar at the top of the browser.</span>
                      <span>2. Toggle "Notifications" setting to <strong>Allow</strong>.</span>
                      <span>3. Reload this page to apply changes.</span>
                    </div>
                  </div>
                </div>
              ) : permissionState === 'granted' ? (
                <div style={{ padding: '1rem 1.25rem', background: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '8px', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <CheckCircle size={20} style={{ color: '#22c55e' }} />
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ fontWeight: '700', color: '#166534', fontSize: '0.9rem' }}>Real-time Notifications Active</div>
                    <div style={{ fontSize: '0.75rem', color: '#15803d' }}>This browser is registered to receive alerts and notifications.</div>
                  </div>
                  <button className="btn btn-outline" onClick={handleDisablePush} style={{ padding: '0.25rem 0.5rem', height: 'auto', fontSize: '0.75rem', color: '#ef4444', borderColor: '#fca5a5' }}>
                    Disable
                  </button>
                </div>
              ) : (
                <div style={{ padding: '1.25rem', background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: '8px', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <Info size={24} style={{ color: '#3b82f6', flexShrink: 0 }} />
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0', color: '#1e40af', fontWeight: '700' }}>Stay Updated Automatically</h4>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#1e3a8a', lineHeight: '1.4' }}>
                      Enable push notifications on this browser to receive immediate attendance updates, published exam results, and pending fee alerts.
                    </p>
                    <button className="btn btn-primary" onClick={handleEnablePush} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Bell size={16} /> Enable Push Notifications
                    </button>
                  </div>
                </div>
              )}

              {/* Notification Preferences */}
              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <h4>Receive Alerts For:</h4>
                <p className="help-text">Choose the categories you want to receive push notifications for.</p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', margin: '1rem 0 1.5rem 0' }}>
                  {isStudent && (
                    <>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input type="checkbox" checked={!!preferences.attendance} onChange={(e) => setPreferences(prev => ({ ...prev, attendance: e.target.checked }))} />
                        Attendance Marking
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input type="checkbox" checked={!!preferences.exams} onChange={(e) => setPreferences(prev => ({ ...prev, exams: e.target.checked }))} />
                        Upcoming Exams
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input type="checkbox" checked={!!preferences.homework} onChange={(e) => setPreferences(prev => ({ ...prev, homework: e.target.checked }))} />
                        Homework Assignments
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input type="checkbox" checked={!!preferences.timetable} onChange={(e) => setPreferences(prev => ({ ...prev, timetable: e.target.checked }))} />
                        Timetable Changes
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input type="checkbox" checked={!!preferences.events} onChange={(e) => setPreferences(prev => ({ ...prev, events: e.target.checked }))} />
                        Institute Events
                      </label>
                    </>
                  )}

                  {isParent && (
                    <>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input type="checkbox" checked={!!preferences.attendance} onChange={(e) => setPreferences(prev => ({ ...prev, attendance: e.target.checked }))} />
                        Absence Alerts
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input type="checkbox" checked={!!preferences.fees} onChange={(e) => setPreferences(prev => ({ ...prev, fees: e.target.checked }))} />
                        Fee Reminders
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input type="checkbox" checked={!!preferences.results} onChange={(e) => setPreferences(prev => ({ ...prev, results: e.target.checked }))} />
                        Exam Results Published
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input type="checkbox" checked={!!preferences.leave} onChange={(e) => setPreferences(prev => ({ ...prev, leave: e.target.checked }))} />
                        Leave Application Status
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input type="checkbox" checked={!!preferences.ptm} onChange={(e) => setPreferences(prev => ({ ...prev, ptm: e.target.checked }))} />
                        PTM Schedules
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input type="checkbox" checked={!!preferences.events} onChange={(e) => setPreferences(prev => ({ ...prev, events: e.target.checked }))} />
                        School Events
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input type="checkbox" checked={!!preferences.transport} onChange={(e) => setPreferences(prev => ({ ...prev, transport: e.target.checked }))} />
                        Transport Delays
                      </label>
                    </>
                  )}

                  {isTeacher && (
                    <>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input type="checkbox" checked={!!preferences.leave} onChange={(e) => setPreferences(prev => ({ ...prev, leave: e.target.checked }))} />
                        Student Leave Requests
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input type="checkbox" checked={!!preferences.timetable} onChange={(e) => setPreferences(prev => ({ ...prev, timetable: e.target.checked }))} />
                        Timetable Modifications
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input type="checkbox" checked={!!preferences.announcements} onChange={(e) => setPreferences(prev => ({ ...prev, announcements: e.target.checked }))} />
                        New Announcements
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input type="checkbox" checked={!!preferences.messages} onChange={(e) => setPreferences(prev => ({ ...prev, messages: e.target.checked }))} />
                        Direct Chat Messages
                      </label>
                    </>
                  )}

                  {!isStudent && !isParent && !isTeacher && (
                    <>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input type="checkbox" checked={!!preferences.announcements} onChange={(e) => setPreferences(prev => ({ ...prev, announcements: e.target.checked }))} />
                        General Announcements
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input type="checkbox" checked={!!preferences.messages} onChange={(e) => setPreferences(prev => ({ ...prev, messages: e.target.checked }))} />
                        Direct Messages
                      </label>
                    </>
                  )}
                </div>

                <button className="btn btn-primary" onClick={saveNotificationPreferences} disabled={prefLoading}>
                  <Save size={16} />
                  {prefLoading ? 'Saving...' : 'Save Preferences'}
                </button>

                {prefSuccess && (
                  <span style={{ marginLeft: '1rem', color: 'var(--success)', fontSize: '0.85rem', fontWeight: '600' }}>
                    Preferences saved successfully!
                  </span>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Registered Devices */}
          {activeTab === 'devices' && (
            <div>
              <h3>Registered Devices</h3>
              <p className="help-text">These browsers and devices are registered to receive notifications for your account.</p>

              {devicesLoading ? (
                <p>Loading registered devices...</p>
              ) : devices.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-subtle)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                  <Smartphone size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                  <div>No registered devices found.</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Enable notifications on this browser to add it here.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                  {devices.map((dev) => (
                    <div 
                      key={dev.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '1rem', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '8px',
                        background: 'var(--bg-subtle)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {dev.user_agent?.includes('Mobi') ? (
                          <Smartphone size={24} style={{ color: 'var(--primary)' }} />
                        ) : (
                          <Laptop size={24} style={{ color: 'var(--primary)' }} />
                        )}
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{parseUserAgent(dev.user_agent)}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            Registered on: {new Date(dev.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleUnregisterDevice(dev.id)} 
                        className="btn btn-outline" 
                        style={{ padding: '0.35rem', height: 'auto', color: '#ef4444', borderColor: '#fca5a5' }}
                        title="Remove device registration"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Install App */}
          {activeTab === 'install' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h3>Download as App</h3>
              <p className="help-text">Install School ERP directly on your phone, tablet, or computer for a native experience.</p>

              {installState === 'installed' ? (
                <div style={{ padding: '1.5rem', background: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '8px', textAlign: 'center' }}>
                  <CheckCircle2 size={48} style={{ color: '#22c55e', marginBottom: '0.75rem' }} />
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#166534', fontWeight: '700' }}>Application Already Installed!</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#15803d', lineHeight: '1.4' }}>
                    You are running School ERP in standalone mode or have already installed the app on your device.
                    You can launch it directly from your home screen or application list.
                  </p>
                </div>
              ) : installState === 'installable' ? (
                <div style={{ padding: '1.5rem', background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', textAlign: 'center' }}>
                  <Smartphone size={48} style={{ color: 'var(--primary)' }} />
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0', color: '#1e40af', fontWeight: '700' }}>App Installation Available</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#1e3a8a', lineHeight: '1.4' }}>
                      Get a full-screen, fast standalone app experience without the browser search bar.
                    </p>
                  </div>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleInstallClick} 
                    disabled={installing}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}
                  >
                    <Download size={16} /> {installing ? 'Installing...' : 'Install ERP App'}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ padding: '1rem', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <Info size={20} style={{ color: '#d97706', flexShrink: 0, marginTop: '0.1rem' }} />
                    <div>
                      <span style={{ fontWeight: '700', color: '#92400e', fontSize: '0.85rem' }}>Manual Installation Required</span>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#b45309', lineHeight: '1.4' }}>
                        If you cancelled the popup previously or are using Safari/iOS, browsers prevent triggering the installation popup automatically. Follow the manual guide below to install.
                      </p>
                    </div>
                  </div>

                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ background: 'var(--bg-subtle)', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', fontWeight: '700', fontSize: '0.85rem' }}>
                      🍏 Apple iOS (Safari - iPhone / iPad)
                    </div>
                    <div style={{ padding: '1rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', lineHeight: '1.4' }}>
                      <span>1. Open this website in the <strong>Safari</strong> browser.</span>
                      <span>2. Tap the <strong>Share</strong> button (box with an upward arrow) in the bottom navigation bar.</span>
                      <span>3. Scroll down the share menu and select <strong>"Add to Home Screen"</strong>.</span>
                      <span>4. Tap <strong>"Add"</strong> in the top-right corner to complete the installation.</span>
                    </div>
                  </div>

                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ background: 'var(--bg-subtle)', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', fontWeight: '700', fontSize: '0.85rem' }}>
                      🤖 Google Chrome / Edge (Android & Desktop)
                    </div>
                    <div style={{ padding: '1rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', lineHeight: '1.4' }}>
                      <span>1. Tap/click the browser's menu icon (<strong>three vertical dots ⋮</strong> or lines) in the top-right corner.</span>
                      <span>2. Select <strong>"Install App"</strong> or <strong>"Add to Home Screen"</strong>.</span>
                      <span>3. Confirm the install dialog when prompted.</span>
                    </div>
                  </div>

                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ background: 'var(--bg-subtle)', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', fontWeight: '700', fontSize: '0.85rem' }}>
                      🦊 Firefox (Android)
                    </div>
                    <div style={{ padding: '1rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', lineHeight: '1.4' }}>
                      <span>1. Tap the menu button (three dots) next to the address bar.</span>
                      <span>2. Select <strong>"Install"</strong> or <strong>"Add to Home Screen"</strong>.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
