import './Communication.css';
import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  Megaphone, Bell, MessageSquare, Plus, Mail, CheckCircle2, ShieldAlert, 
  HelpCircle, Eye, Activity, Sparkles, Send, RefreshCw, Radio, FileText
} from 'lucide-react';
import { PageGuidance } from '../components/PageGuidance';

// Import subcomponents
import Announcements from './Announcements';
import Messaging from './Messaging';
import Notifications from './Notifications';
import Broadcasts from './Broadcasts';
import MessageTemplates from './MessageTemplates';

export default function Communication() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = searchParams.get('tab') || 'overview';

  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const isStaff = userRoles.some(r => 
    ['super_admin', 'Super Admin', 'admin', 'Admin', 'Principal', 'HOD', 'hod', 'Teacher', 'teacher', 'Accountant', 'accountant'].includes(r)
  );

  // Overall Statistics States
  const [loading, setLoading] = useState(true);
  const [announcementsCount, setAnnouncementsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [activeChattersCount, setActiveChattersCount] = useState(0);
  const [unreadBroadcastsCount, setUnreadBroadcastsCount] = useState(0);

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  useEffect(() => {
    fetchCommunicationSummary();
  }, [activeTab]);

  const fetchCommunicationSummary = async () => {
    try {
      setLoading(true);
      // Fetch basic metrics
      const [announcements, contacts, notifications, unreadBC] = await Promise.all([
        api.get('/announcements').catch(() => []),
        api.get('/messaging/contacts').catch(() => []),
        api.get('/notifications').catch(() => []),
        api.get('/broadcasts/unread-count').catch(() => ({ count: 0 }))
      ]);

      setAnnouncementsCount(announcements?.length || 0);
      setActiveChattersCount(contacts?.length || 0);
      setNotificationsCount(notifications?.length || 0);
      setUnreadBroadcastsCount(unreadBC?.count || 0);

      // Sum up unread messages from contacts list
      const totalUnread = (contacts || []).reduce((acc: number, curr: any) => acc + (curr.unreadCount || 0), 0);
      setUnreadMessagesCount(totalUnread);

    } catch (e) {
      console.error('Error loading communication statistics:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleClearNotifications = async () => {
    if (!confirm('Are you sure you want to mark all system notifications as read?')) return;
    try {
      await api.post('/notifications/read-all', {});
      alert('All notifications marked as read.');
      fetchCommunicationSummary();
    } catch (err) {
      alert('Failed to clear notifications.');
    }
  };

  return (
    <Layout>
      <PageGuidance
        title="Communication Center"
        description="Broadcast announcement notices, chat with staff/guardians, and monitor system alerts in a unified hub."
        steps={[
          "Select the Announcements tab to publish grade-level circulars.",
          "Check Direct Messages to converse with contacts.",
          "Review Notifications to track logs of student leaves or exam alerts."
        ]}
      />

      {/* Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2>Communication Center</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Consolidate institutional notices, direct chats, and system logs in a unified center.
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <div className="card summary-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', background: 'var(--bg-card)', borderLeft: '4px solid var(--primary)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-main)' }}>Communication Hub</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Broadcast Scope: All Roles (Teachers, Students, Parents)
            </div>
          </div>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Circular Notices</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>{announcementsCount}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Unread Chats</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: unreadMessagesCount > 0 ? 'var(--warning)' : 'var(--success)' }}>
                {unreadMessagesCount} Chats
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Unread Broadcasts</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: unreadBroadcastsCount > 0 ? 'var(--warning)' : 'var(--success)' }}>
                {unreadBroadcastsCount} Msg
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>System Alerts</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>{notificationsCount} Logs</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>Staff Chatters</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>{activeChattersCount} Contacts</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="card quick-actions-panel" style={{ padding: '0.75rem 1rem', marginBottom: '1.5rem', background: 'var(--bg-subtle)', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', marginRight: '0.5rem', letterSpacing: '0.05em' }}>Quick Actions:</span>
        <button className="btn btn-secondary" onClick={() => { handleTabChange('announcements'); navigate('?tab=announcements'); }} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
          <Megaphone size={13} /> Broadcast Notice
        </button>
        <button className="btn btn-secondary" onClick={() => { handleTabChange('inbox'); navigate('?tab=inbox'); }} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
          <MessageSquare size={13} /> Send Direct Message
        </button>
        <button className="btn btn-secondary" onClick={handleClearNotifications} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
          <CheckCircle2 size={13} /> Clear Notifications
        </button>
      </div>

      {/* Workspace Navigation Tabs */}
      <div className="communication-tabs" style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
        {[
          { tab: 'overview', label: 'Overview', icon: Activity },
          { tab: 'inbox', label: `Inbox (${unreadMessagesCount})`, icon: MessageSquare },
          { tab: 'broadcasts', label: `Broadcasts${unreadBroadcastsCount > 0 ? ` (${unreadBroadcastsCount})` : ''}`, icon: Radio },
          ...(isStaff ? [{ tab: 'templates', label: 'Templates', icon: FileText }] : []),
          { tab: 'announcements', label: 'Notice Board', icon: Megaphone },
          { tab: 'notifications', label: 'System Alerts', icon: Bell }
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.tab || (t.tab === 'inbox' && activeTab === 'messages');
          return (
            <button
              key={t.tab}
              type="button"
              onClick={() => handleTabChange(t.tab)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 0.25rem',
                border: 'none',
                background: 'none',
                borderBottom: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 400,
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'all 0.2s ease'
              }}
            >
              <Icon size={15} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="communication-tab-content">
        
        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
              {/* Card 1: Message volume */}
              <div className="card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageSquare size={22} />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Active Chat Channels</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '0.15rem' }}>{activeChattersCount} Conversations</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{unreadMessagesCount} unread chats</div>
                </div>
              </div>

              {/* Card 2: Broadcast Messages */}
              <div className="card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Radio size={22} />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Broadcast Messages</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '0.15rem' }}>One-To-Many Alerts</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{unreadBroadcastsCount} unread broadcasts</div>
                </div>
              </div>

              {/* Card 3: Notice Board Notices */}
              <div className="card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--success-soft)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Megaphone size={22} />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Notice Board Notices</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '0.15rem' }}>{announcementsCount} Circulars</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>General Bulletin Notices</div>
                </div>
              </div>

              {/* Card 4: Alert Logs */}
              <div className="card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--warning-soft)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bell size={22} />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>System Alert Logs</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '0.15rem' }}>{notificationsCount} Alerts</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Track academic updates</div>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '1rem' }}>Communication Hub Quick Summary</h4>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', background: 'var(--primary-soft)', color: 'var(--primary)', border: '1px solid var(--primary-border)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                <Sparkles size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                <div>
                  Toggle the tabs above to broadcast a new notice board announcement, converse with staff contacts via direct messages, or check real-time system alerts.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. ANNOUNCEMENTS TAB */}
        {activeTab === 'announcements' && (
          <Announcements isSubComponent={true} />
        )}

        {/* 3. MESSAGES / INBOX TAB */}
        {(activeTab === 'messages' || activeTab === 'inbox') && (
          <Messaging isSubComponent={true} />
        )}

        {/* 4. BROADCASTS TAB */}
        {activeTab === 'broadcasts' && (
          <Broadcasts isSubComponent={true} />
        )}

        {/* 5. TEMPLATES TAB */}
        {activeTab === 'templates' && isStaff && (
          <MessageTemplates isSubComponent={true} />
        )}

        {/* 6. NOTIFICATIONS TAB */}
        {activeTab === 'notifications' && (
          <Notifications isSubComponent={true} />
        )}
      </div>
    </Layout>
  );
}
