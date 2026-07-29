import './Notifications.css';
import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { 
  Bell, Check, Award, Clock, Megaphone, CheckSquare, Plus, AlertCircle, RefreshCw,
  FileText, Activity, Settings, BarChart2, List, Send, ShieldAlert, Mail, Smartphone, MessageSquare
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  type: 'exam' | 'attendance' | 'result' | 'announcement' | 'general' | string;
  is_read: number;
  status: string;
  channel?: string;
  created_at: string;
}

interface NotificationTemplate {
  id: string;
  name: string;
  event_type: string;
  channel: string;
  subject: string;
  body: string;
  variables_json?: string;
  is_active: number;
}

interface NotificationPreference {
  email_enabled: number;
  sms_enabled: number;
  whatsapp_enabled: number;
  push_enabled: number;
  in_app_enabled: number;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

export default function Notifications({ isSubComponent = false }: { isSubComponent?: boolean }) {
  const { user } = useAuth();
  const toastCtx = useToast();
  const [activeTab, setActiveTab] = useState<'inbox' | 'templates' | 'logs' | 'preferences' | 'analytics'>('inbox');

  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreference>({
    email_enabled: 1,
    sms_enabled: 1,
    whatsapp_enabled: 1,
    push_enabled: 1,
    in_app_enabled: 1,
    quiet_hours_start: '',
    quiet_hours_end: ''
  });
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Broadcaster & Template Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const [createForm, setCreateForm] = useState({
    title: '',
    message: '',
    type: 'general',
    target_role: 'all'
  });

  const [templateForm, setTemplateForm] = useState({
    name: '',
    event_type: 'AttendanceMarkedAbsent',
    channel: 'all',
    subject: '',
    body: '',
    variables_json: ''
  });

  const [submitting, setSubmitting] = useState(false);

  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const isAdmin = userRoles.some(r => ['admin', 'super_admin', 'Principal', 'Super Admin', 'Accountant', 'HOD'].includes(r));

  useEffect(() => {
    fetchTabData();
  }, [activeTab]);

  const fetchTabData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'inbox') {
        const data = await api.get('/notifications');
        setNotifications(data || []);
      } else if (activeTab === 'templates' && isAdmin) {
        const data = await api.get('/notifications/templates');
        setTemplates(data || []);
      } else if (activeTab === 'logs' && isAdmin) {
        const [logsData, queueData] = await Promise.all([
          api.get('/notifications/logs'),
          api.get('/notifications/queue')
        ]);
        setLogs(logsData || []);
        setQueue(queueData || []);
      } else if (activeTab === 'preferences') {
        const data = await api.get('/notifications/preferences');
        if (data) setPreferences(data);
      } else if (activeTab === 'analytics' && isAdmin) {
        const data = await api.get('/notifications/analytics');
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Error fetching tab data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string, isAlreadyRead: number) => {
    if (isAlreadyRead === 1) return;
    try {
      await api.put(`/notifications/${id}/read`, {});
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      window.dispatchEvent(new Event('notifications_updated'));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all', {});
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      window.dispatchEvent(new Event('notifications_updated'));
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim() || !createForm.message.trim()) return;
    try {
      setSubmitting(true);
      await api.post('/notifications/send', {
        recipient_user_id: user?.id,
        title: createForm.title,
        message: createForm.message,
        type: createForm.type
      });
      toastCtx.success('Alert broadcasted successfully!');
      setShowCreateModal(false);
      fetchTabData();
    } catch (err: any) {
      toastCtx.error(err.message || 'Failed to send broadcast');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/notifications/templates', templateForm);
      toastCtx.success('Notification template created!');
      setShowTemplateModal(false);
      setTemplateForm({ name: '', event_type: 'AttendanceMarkedAbsent', channel: 'all', subject: '', body: '', variables_json: '' });
      fetchTabData();
    } catch (err: any) {
      toastCtx.error(err.message || 'Failed to create template');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.put('/notifications/preferences', preferences);
      toastCtx.success('Notification preferences updated!');
    } catch (err: any) {
      toastCtx.error(err.message || 'Failed to update preferences');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetryNotification = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/retry`, {});
      toastCtx.success('Notification re-queued for delivery!');
      fetchTabData();
    } catch (err: any) {
      toastCtx.error(err.message || 'Failed to retry notification');
    }
  };

  const unreadCount = notifications.filter(n => n.is_read === 0).length;

  const content = (
    <>
      <div className="page-header">
        <div>
          <h2>Notification Center</h2>
          <p className="notifications-subtitle">
            Platform event routing, channel preference rules, templates & real-time delivery logs
          </p>
        </div>
        <div className="notifications-header-actions">
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              <Send size={16} /> Send Alert
            </button>
          )}
          {activeTab === 'inbox' && unreadCount > 0 && (
            <button className="btn btn-outline" onClick={handleMarkAllRead}>
              <CheckSquare size={16} /> Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* TABS HEADER */}
      <div className="notifications-tabs-bar">
        <button 
          className={`tab-btn ${activeTab === 'inbox' ? 'active' : ''}`}
          onClick={() => setActiveTab('inbox')}
        >
          <Bell size={16} /> Inbox {unreadCount > 0 && <span className="badge badge-primary">{unreadCount}</span>}
        </button>

        {isAdmin && (
          <button 
            className={`tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveTab('templates')}
          >
            <FileText size={16} /> Templates
          </button>
        )}

        {isAdmin && (
          <button 
            className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            <List size={16} /> Queue & Audit Logs
          </button>
        )}

        <button 
          className={`tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          <Settings size={16} /> Preferences
        </button>

        {isAdmin && (
          <button 
            className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart2 size={16} /> Analytics
          </button>
        )}
      </div>

      {/* TAB 1: INBOX */}
      {activeTab === 'inbox' && (
        <div className="notifications-container">
          {loading ? <p>Loading inbox...</p> : notifications.length === 0 ? (
            <div className="card text-center p-8">
              <Bell size={40} className="mx-auto text-slate-400 mb-2" />
              <h3>All Caught Up!</h3>
              <p className="text-muted">You have no notifications in your inbox.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div 
                key={n.id} 
                className="card notification-card-item" 
                onClick={() => handleMarkAsRead(n.id, n.is_read)}
                style={{
                  display: 'flex', gap: '1.25rem', alignItems: 'center', padding: '1.25rem 1.5rem',
                  cursor: n.is_read === 0 ? 'pointer' : 'default',
                  background: n.is_read === 0 ? 'rgba(79, 70, 229, 0.02)' : 'var(--bg-card)',
                  borderColor: n.is_read === 0 ? 'rgba(79, 70, 229, 0.15)' : 'var(--border)'
                }}
              >
                <div style={{ background: '#f1f5f9', color: '#4f46e5', width: '44px', height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bell size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, fontWeight: n.is_read === 0 ? '700' : '600' }}>{n.title}</h4>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {new Date(n.created_at).toLocaleDateString()} {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: n.is_read === 0 ? '#334155' : '#64748b' }}>{n.message}</p>
                </div>
                {n.is_read === 0 && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4f46e5' }} />}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: TEMPLATES */}
      {activeTab === 'templates' && isAdmin && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3>Notification Templates</h3>
              <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>Manage reusable event-driven template blocks with variable placeholders</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowTemplateModal(true)}>
              <Plus size={16} /> New Template
            </button>
          </div>

          {loading ? <p>Loading templates...</p> : templates.length === 0 ? (
            <p className="text-muted">No custom templates defined yet. Click "New Template" to add one.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Template Name</th>
                  <th>Event Type</th>
                  <th>Channel</th>
                  <th>Subject Pattern</th>
                  <th>Body Pattern</th>
                </tr>
              </thead>
              <tbody>
                {templates.map(t => (
                  <tr key={t.id}>
                    <td><strong>{t.name}</strong></td>
                    <td><span className="badge badge-info">{t.event_type}</span></td>
                    <td><span className="badge badge-outline">{t.channel.toUpperCase()}</span></td>
                    <td><code>{t.subject}</code></td>
                    <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.body}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 3: QUEUE & AUDIT LOGS */}
      {activeTab === 'logs' && isAdmin && (
        <div className="card-grid" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h3>Background Processing Queue</h3>
            {queue.length === 0 ? <p className="text-muted">No items in the dispatch queue.</p> : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Channel</th>
                    <th>Status</th>
                    <th>Attempts</th>
                    <th>Scheduled At</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((q: any) => (
                    <tr key={q.id}>
                      <td><strong>{q.channel.toUpperCase()}</strong></td>
                      <td>
                        <span className={`badge badge-${q.status === 'DELIVERED' ? 'success' : (q.status === 'FAILED' || q.status === 'DEAD_LETTER' ? 'danger' : 'warning')}`}>
                          {q.status}
                        </span>
                      </td>
                      <td>{q.attempts} / {q.max_attempts}</td>
                      <td>{q.scheduled_at ? new Date(q.scheduled_at).toLocaleString() : 'Immediate'}</td>
                      <td>
                        {q.notification_id && (
                          <button className="btn btn-sm btn-outline" onClick={() => handleRetryNotification(q.notification_id)}>
                            <RefreshCw size={12} /> Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <h3>Immutable Provider Audit Logs</h3>
            {logs.length === 0 ? <p className="text-muted">No audit logs recorded yet.</p> : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Provider</th>
                    <th>Channel</th>
                    <th>Status</th>
                    <th>Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l: any) => (
                    <tr key={l.id}>
                      <td>{new Date(l.created_at).toLocaleTimeString()}</td>
                      <td><strong>{l.provider}</strong></td>
                      <td>{l.channel}</td>
                      <td><span className={`badge badge-${l.status === 'DELIVERED' ? 'success' : 'danger'}`}>{l.status}</span></td>
                      <td>{l.latency_ms} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: PREFERENCES */}
      {activeTab === 'preferences' && (
        <div className="card" style={{ maxWidth: '600px' }}>
          <h3>Notification Channel Preferences</h3>
          <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Configure your preferred notification channels and quiet hours</p>

          <form onSubmit={handleSavePreferences} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Mail size={18} />
                <div>
                  <strong>Email Notifications</strong>
                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>Receive updates via email</div>
                </div>
              </div>
              <input type="checkbox" checked={preferences.email_enabled === 1} onChange={e => setPreferences({...preferences, email_enabled: e.target.checked ? 1 : 0})} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Smartphone size={18} />
                <div>
                  <strong>SMS Alerts</strong>
                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>Receive SMS text notifications</div>
                </div>
              </div>
              <input type="checkbox" checked={preferences.sms_enabled === 1} onChange={e => setPreferences({...preferences, sms_enabled: e.target.checked ? 1 : 0})} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <MessageSquare size={18} />
                <div>
                  <strong>WhatsApp Messaging</strong>
                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>Receive updates on WhatsApp</div>
                </div>
              </div>
              <input type="checkbox" checked={preferences.whatsapp_enabled === 1} onChange={e => setPreferences({...preferences, whatsapp_enabled: e.target.checked ? 1 : 0})} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Bell size={18} />
                <div>
                  <strong>Push & In-App Alerts</strong>
                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>Browser push and in-app updates</div>
                </div>
              </div>
              <input type="checkbox" checked={preferences.push_enabled === 1} onChange={e => setPreferences({...preferences, push_enabled: e.target.checked ? 1 : 0})} />
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label>Quiet Hours (Start - End)</label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input type="time" value={preferences.quiet_hours_start || ''} onChange={e => setPreferences({...preferences, quiet_hours_start: e.target.value})} className="input" />
                <span style={{ alignSelf: 'center' }}>to</span>
                <input type="time" value={preferences.quiet_hours_end || ''} onChange={e => setPreferences({...preferences, quiet_hours_end: e.target.value})} className="input" />
              </div>
            </div>

            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ marginTop: '1rem' }}>
              {submitting ? 'Saving...' : 'Save Preferences'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 5: ANALYTICS */}
      {activeTab === 'analytics' && isAdmin && analytics && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="card">
              <div className="text-muted" style={{ fontSize: '0.85rem' }}>Total Sent</div>
              <h2 style={{ margin: '0.5rem 0 0 0' }}>{analytics.total_notifications}</h2>
            </div>
            <div className="card">
              <div className="text-muted" style={{ fontSize: '0.85rem' }}>Delivery Rate</div>
              <h2 style={{ margin: '0.5rem 0 0 0', color: 'var(--success)' }}>{analytics.delivery_rate_percent}%</h2>
            </div>
            <div className="card">
              <div className="text-muted" style={{ fontSize: '0.85rem' }}>Open / Read Rate</div>
              <h2 style={{ margin: '0.5rem 0 0 0', color: '#4f46e5' }}>{analytics.open_rate_percent}%</h2>
            </div>
            <div className="card">
              <div className="text-muted" style={{ fontSize: '0.85rem' }}>Dead Letter / Failed</div>
              <h2 style={{ margin: '0.5rem 0 0 0', color: 'var(--danger)' }}>{analytics.total_dead_letter + analytics.total_failed}</h2>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BROADCAST ALERT */}
      {showCreateModal && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <h3>Broadcast Alert</h3>
            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Alert Title *</label>
                <input required type="text" value={createForm.title} onChange={e => setCreateForm({...createForm, title: e.target.value})} className="input" placeholder="e.g. Schedule Update" />
              </div>
              <div className="form-group">
                <label>Alert Message *</label>
                <textarea required rows={4} value={createForm.message} onChange={e => setCreateForm({...createForm, message: e.target.value})} className="input" placeholder="Notification body text..." />
              </div>
              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? 'Sending...' : 'Send Alert'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE TEMPLATE */}
      {showTemplateModal && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '550px' }}>
            <h3>Create Notification Template</h3>
            <form onSubmit={handleCreateTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Template Name *</label>
                <input required type="text" value={templateForm.name} onChange={e => setTemplateForm({...templateForm, name: e.target.value})} className="input" placeholder="e.g. Fee Due Reminder" />
              </div>
              <div className="form-group">
                <label>Event Type *</label>
                <select value={templateForm.event_type} onChange={e => setTemplateForm({...templateForm, event_type: e.target.value})} className="input">
                  <option value="AttendanceMarkedAbsent">AttendanceMarkedAbsent</option>
                  <option value="FeeDueTomorrow">FeeDueTomorrow</option>
                  <option value="ResultsPublished">ResultsPublished</option>
                  <option value="StudentAdmitted">StudentAdmitted</option>
                  <option value="TeacherSubstituted">TeacherSubstituted</option>
                  <option value="GeneralBroadcast">GeneralBroadcast</option>
                </select>
              </div>
              <div className="form-group">
                <label>Subject Pattern (with placeholders) *</label>
                <input required type="text" value={templateForm.subject} onChange={e => setTemplateForm({...templateForm, subject: e.target.value})} className="input" placeholder="e.g. Fee Due: {{student_name}}" />
              </div>
              <div className="form-group">
                <label>Body Pattern *</label>
                <textarea required rows={4} value={templateForm.body} onChange={e => setTemplateForm({...templateForm, body: e.target.value})} className="input" placeholder="Hello {{student_name}}, your fee of ₹{{amount}} is due on {{due_date}}." />
              </div>
              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowTemplateModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? 'Creating...' : 'Save Template'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );

  if (isSubComponent) return content;
  return <Layout>{content}</Layout>;
}
