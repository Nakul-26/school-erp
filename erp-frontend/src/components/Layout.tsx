import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { Menu, X, ArrowDownToLine, Bell, BellOff, X as CloseIcon } from 'lucide-react';
import BottomNav from './BottomNav';
import { subscribeToPushNotifications, unsubscribeFromPushNotifications } from '../services/pushNotification';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const userStr = localStorage.getItem('erp_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const roles: string[] = user?.roles || (user?.role ? [user.role] : []);

  // PWA Install Prompt state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // Push Notifications state
  const [showPushBanner, setShowPushBanner] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [window.location.pathname]);

  // Prevent body scroll when sidebar open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  // Listen for PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Check if already installed
      if (!window.matchMedia('(display-mode: standalone)').matches) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // Check if push notifications are enabled on mount
  useEffect(() => {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      if (Notification.permission === 'granted') {
        setPushEnabled(true);
      } else if (Notification.permission === 'default' && user) {
        // Only show push notification subscription prompt if they are logged in
        setShowPushBanner(true);
      }
    }
  }, [user]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the PWA install prompt');
    }
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const handleSubscribePush = async () => {
    await subscribeToPushNotifications();
    if (Notification.permission === 'granted') {
      setPushEnabled(true);
      setShowPushBanner(false);
    }
  };

  const handleDismissPush = () => {
    setShowPushBanner(false);
  };

  return (
    <div className="layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </aside>

      {/* Main area */}
      <div className="layout-body">
        {/* Mobile topbar */}
        <header className="mobile-topbar" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <span className="mobile-topbar-title">ERP Portal</span>
          </div>

          {/* Quick toggle push notifications in topbar */}
          {user && 'Notification' in window && (
            <button
              onClick={pushEnabled ? unsubscribeFromPushNotifications : handleSubscribePush}
              style={{
                background: 'none',
                border: 'none',
                color: pushEnabled ? 'var(--primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={pushEnabled ? 'Push notifications enabled' : 'Enable push notifications'}
            >
              {pushEnabled ? <Bell size={18} /> : <BellOff size={18} />}
            </button>
          )}
        </header>

        {/* Global PWA Install & Push Notification Banner Area */}
        {(showInstallBanner || showPushBanner) && (
          <div className="alert-banners-container" style={{ padding: '0.75rem 1rem 0 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {showInstallBanner && (
              <div className="install-banner" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                color: 'white',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)',
                fontSize: '0.8rem',
                fontWeight: 500,
                animation: 'slideUp 0.3s ease-out'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ArrowDownToLine size={16} />
                  <span>Install School ERP app on your phone for a native experience!</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={handleInstallClick}
                    style={{
                      background: 'white',
                      color: '#4f46e5',
                      border: 'none',
                      padding: '0.35rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    Install
                  </button>
                  <button
                    onClick={() => setShowInstallBanner(false)}
                    style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex' }}
                  >
                    <CloseIcon size={16} />
                  </button>
                </div>
              </div>
            )}

            {showPushBanner && (
              <div className="push-banner" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-card)',
                borderLeft: '4px solid var(--primary)',
                color: 'var(--text-main)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)',
                fontSize: '0.8rem',
                fontWeight: 500,
                animation: 'slideUp 0.3s ease-out'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Bell size={16} style={{ color: 'var(--primary)' }} />
                  <span>Never miss homework, results or alerts. Enable push notifications!</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={handleSubscribePush}
                    style={{
                      background: 'var(--primary)',
                      color: 'white',
                      border: 'none',
                      padding: '0.35rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    Allow
                  </button>
                  <button
                    onClick={handleDismissPush}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
                  >
                    <CloseIcon size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <main className="main-content">
          {children}
        </main>
      </div>

      {/* Bottom Navigation for Mobile */}
      <BottomNav roles={roles} />
    </div>
  );
}

