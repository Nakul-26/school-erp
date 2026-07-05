import './Notifications.css';
import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Bell, Check, Award, Clock, Megaphone, CheckSquare, Plus, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  type: 'exam' | 'attendance' | 'result' | 'announcement' | 'general';
  is_read: number;
  created_at: string;
}

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Toast notification state
  const toastCtx = useToast();
  const showToast = (message: string, type: 'success'|'error' = 'success') => {
    if (type === 'success') toastCtx.success(message);
    else toastCtx.error(message);
  };

  // Broadcaster state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    message: '',
    type: 'general' as const,
    target_role: 'all' // 'all', 'Teacher', 'Student'
  });
  const [creating, setCreating] = useState(false);

  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const isAdmin = userRoles.some(r => ['admin', 'super_admin', 'Principal', 'Super Admin'].includes(r));

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim() || !createForm.message.trim()) {
      showToast('Title and message are required.', 'error');
      return;
    }
    try {
      setCreating(true);
      await api.post('/notifications', createForm);
      showToast('Alert broadcasted successfully!');
      setShowCreateModal(false);
      setCreateForm({
        title: '',
        message: '',
        type: 'general',
        target_role: 'all'
      });
      fetchNotifications();
    } catch (err) {
      console.error('Error creating notification:', err);
      showToast('Failed to send notification.', 'error');
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await api.get('/notifications');
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string, isAlreadyRead: number) => {
    if (isAlreadyRead === 1) return;
    try {
      await api.post(`/notifications/${id}/read`, {});
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, is_read: 1 } : n
      ));
      
      // Dispatch a storage event to trigger sidebar count refresh
      window.dispatchEvent(new Event('notifications_updated'));
    } catch (err) {
      console.error('Error marking notice as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all', {});
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      
      // Dispatch storage event
      window.dispatchEvent(new Event('notifications_updated'));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const getIcon = (type: NotificationRecord['type']) => {
    switch (type) {
      case 'exam':
        return <Award size={20} />;
      case 'attendance':
        return <Clock size={20} />;
      case 'result':
        return <Award size={20} className="notifications-Award-1"  />;
      case 'announcement':
        return <Megaphone size={20} />;
      default:
        return <Bell size={20} />;
    }
  };

  const getIconBackground = (type: NotificationRecord['type']) => {
    switch (type) {
      case 'exam':
        return '#f9f0ff';
      case 'attendance':
        return '#fff7e6';
      case 'result':
        return '#f6ffed';
      case 'announcement':
        return '#e6f7ff';
      default:
        return '#f1f5f9';
    }
  };

  const getIconColor = (type: NotificationRecord['type']) => {
    switch (type) {
      case 'exam':
        return '#722ed1';
      case 'attendance':
        return '#fa8c16';
      case 'result':
        return '#52c41a';
      case 'announcement':
        return '#1890ff';
      default:
        return '#64748b';
    }
  };

  const unreadCount = notifications.filter(n => n.is_read === 0).length;

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h2>Notifications</h2>
          <p className="notifications-text-2">
            In-app alerts and live updates for academic and administrative schedules
          </p>
        </div>
        <div className="notifications-row-3">
          {isAdmin && (
            <button className="btn btn-primary notifications-btn" onClick={() => setShowCreateModal(true)}>
              <Plus size={16} /> Send Alert
            </button>
          )}
          {unreadCount > 0 && (
            <button className="btn btn-outline notifications-btn" onClick={handleMarkAllRead}>
              <CheckSquare size={16} /> Mark all as read
            </button>
          )}
        </div>
      </div>

      <div className="notifications-container notifications-container">
        {loading ? <p>Loading notifications...</p> : notifications.length === 0 ? (
          <div className="card notifications-card">
            <Bell size={40} className="notifications-Bell-8"  />
            <h3 className="notifications-title-9">All Caught Up!</h3>
            <p className="notifications-text-10">You have no notifications right now.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div 
              key={n.id} 
              className="card" 
              onClick={() => handleMarkAsRead(n.id, n.is_read)}
              style={{ 
                display: 'flex', 
                gap: '1.25rem', 
                alignItems: 'center', 
                padding: '1.25rem 1.5rem',
                cursor: n.is_read === 0 ? 'pointer' : 'default',
                background: n.is_read === 0 ? 'rgba(79, 70, 229, 0.02)' : 'var(--bg-card)',
                borderColor: n.is_read === 0 ? 'rgba(79, 70, 229, 0.15)' : 'var(--border)',
                transition: 'all 0.2s ease',
              }}
            >
              <div 
                style={{ 
                  background: getIconBackground(n.type),
                  color: getIconColor(n.type),
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {getIcon(n.type)}
              </div>
              
              <div className="notifications-div-11">
                <div className="notifications-row-12">
                  <h4 style={{ 
                    margin: 0, 
                    fontSize: '1rem', 
                    fontWeight: n.is_read === 0 ? '700' : '600',
                    color: 'var(--text-main)' 
                  }}>
                    {n.title}
                  </h4>
                  <span className="notifications-span-13">
                    {new Date(n.created_at).toLocaleDateString(undefined, { dateStyle: 'short' })} {new Date(n.created_at).toLocaleTimeString(undefined, { timeStyle: 'short' })}
                  </span>
                </div>
                <p style={{ 
                  margin: '0.25rem 0 0 0', 
                  fontSize: '0.875rem', 
                  color: n.is_read === 0 ? '#334155' : 'var(--text-muted)' 
                }}>
                  {n.message}
                </p>
              </div>

              {n.is_read === 0 && (
                <div className="notifications-div-14"  />
              )}
            </div>
          ))
        )}
      </div>

      {showCreateModal && (
        <div className="modal notifications-modal">
          <div className="modal-content notifications-modal-content">
            <h3 className="notifications-title-17">Broadcast System Alert</h3>
            
            <form onSubmit={handleCreateSubmit} className="notifications-col-18">
              <div className="form-group">
                <label>Target Audience *</label>
                <select 
                  value={createForm.target_role} 
                  onChange={e => setCreateForm({...createForm, target_role: e.target.value})}
                >
                  <option value="all">All Active Users</option>
                  <option value="Teacher">All Teachers</option>
                  <option value="Student">All Students</option>
                </select>
              </div>

              <div className="form-group">
                <label>Alert Type</label>
                <select 
                  value={createForm.type} 
                  onChange={e => setCreateForm({...createForm, type: e.target.value as any})}
                >
                  <option value="general">General Broadcast</option>
                  <option value="announcement">Announcement / Memo</option>
                  <option value="exam">Academic Exam Alert</option>
                  <option value="attendance">Attendance / Attendance Note</option>
                </select>
              </div>

              <div className="form-group">
                <label>Alert Title *</label>
                <input 
                  required 
                  type="text" 
                  value={createForm.title} 
                  onChange={e => setCreateForm({...createForm, title: e.target.value})} 
                  placeholder="e.g. Scheduled Power Outage"
                />
              </div>

              <div className="form-group">
                <label>Alert Message *</label>
                <textarea 
                  required 
                  value={createForm.message} 
                  onChange={e => setCreateForm({...createForm, message: e.target.value})} 
                  placeholder="Details of the alert..."
                  rows={4}
                />
              </div>

              <div className="modal-actions notifications-modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={creating} className="btn btn-primary">
                  {creating ? 'Sending...' : 'Broadcast Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast notifications managed globally */}
    </Layout>
  );
}
