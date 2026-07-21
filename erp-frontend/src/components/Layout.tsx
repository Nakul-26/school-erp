import './Layout.css';
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu, X, ArrowDownToLine, Bell, BellOff, X as CloseIcon } from 'lucide-react';
import BottomNav from './BottomNav';
import { subscribeToPushNotifications, unsubscribeFromPushNotifications } from '../services/pushNotification';
import { capturePwaInstallPrompt, canInstallPwa, triggerPwaInstall, isPwaInstalled } from '../services/pwaInstall';
import { useAuth } from '../contexts/AuthContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const roles: string[] = user?.roles || (user?.role ? [user.role] : []);
  const permissions: string[] = user?.permissions || [];

  // PWA Install Prompt state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // Push Notifications state
  const [showPushBanner, setShowPushBanner] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when sidebar open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  // Listen for PWA install prompt — store globally so Profile page can use it later
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      capturePwaInstallPrompt(e);
      setDeferredPrompt(e);
      // Only show auto-banner if not already installed
      if (!isPwaInstalled()) {
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
        // Only show push notification subscription prompt if they are logged in and haven't dismissed it
        const isDismissed = localStorage.getItem('erp_dismissed_push_banner') === 'true';
        if (!isDismissed) {
          setShowPushBanner(true);
        }
      }
    }
  }, [user]);

  const handleInstallClick = async () => {
    const outcome = await triggerPwaInstall();
    if (outcome !== 'unavailable') {
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    }
  };

  const handleSubscribePush = async () => {
    await subscribeToPushNotifications();
    if (Notification.permission === 'granted') {
      setPushEnabled(true);
      setShowPushBanner(false);
    }
  };

  const handleDismissPush = () => {
    localStorage.setItem('erp_dismissed_push_banner', 'true');
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
        <header className="mobile-topbar layout-mobile-topbar">
          <div className="layout-row-2">
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
              className={`layout-push-toggle-btn ${pushEnabled ? 'active' : ''}`}
              title={pushEnabled ? 'Push notifications enabled' : 'Enable push notifications'}
            >
              {pushEnabled ? <Bell size={18} /> : <BellOff size={18} />}
            </button>
          )}
        </header>

        {/* Global PWA Install & Push Notification Banner Area */}
        {(showInstallBanner || showPushBanner) && (
          <div className="alert-banners-container layout-alert-banners-container">
            {showInstallBanner && (
              <div className="install-banner layout-install-banner">
                <div className="layout-row-5">
                  <ArrowDownToLine size={16} />
                  <span>Install School ERP app on your phone for a native experience!</span>
                </div>
                <div className="layout-row-6">
                  <button onClick={handleInstallClick} className="layout-btn-7">
                    Install
                  </button>
                  <button onClick={() => setShowInstallBanner(false)} className="layout-row-8">
                    <CloseIcon size={16} />
                  </button>
                </div>
              </div>
            )}

            {showPushBanner && (
              <div className="push-banner layout-push-banner">
                <div className="layout-row-10">
                  <Bell size={16} className="layout-Bell-11"  />
                  <span>Never miss homework, results or alerts. Enable push notifications!</span>
                </div>
                <div className="layout-row-12">
                  <button onClick={handleSubscribePush} className="layout-btn-13">
                    Allow
                  </button>
                  <button onClick={handleDismissPush} className="layout-row-14">
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
      <BottomNav roles={roles} permissions={permissions} />
    </div>
  );
}

