import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Bell, Check, Award, Clock, Megaphone, CheckSquare } from 'lucide-react';

interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  type: 'exam' | 'attendance' | 'result' | 'announcement' | 'general';
  is_read: number;
  created_at: string;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);

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
        return <Award size={20} style={{ color: 'var(--success)' }} />;
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
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            In-app alerts and live updates for academic and administrative schedules
          </p>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={handleMarkAllRead}>
            <CheckSquare size={16} /> Mark all as read
          </button>
        )}
      </div>

      <div className="notifications-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading ? <p>Loading notifications...</p> : notifications.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <Bell size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>All Caught Up!</h3>
            <p style={{ color: 'var(--text-muted)' }}>You have no notifications right now.</p>
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
              
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ 
                    margin: 0, 
                    fontSize: '1rem', 
                    fontWeight: n.is_read === 0 ? '700' : '600',
                    color: 'var(--text-main)' 
                  }}>
                    {n.title}
                  </h4>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
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
                <div 
                  style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    background: 'var(--primary)',
                    flexShrink: 0 
                  }} 
                />
              )}
            </div>
          ))
        )}
      </div>
    </Layout>
  );
}
