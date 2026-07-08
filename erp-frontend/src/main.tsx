import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { subscribeToPushNotifications } from './services/pushNotification'

const clearLocalServiceWorker = async () => {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map(registration => registration.unregister()));

  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith('school-erp-'))
        .map(key => caches.delete(key))
    );
  }
};

// Register Service Worker only for production builds.
// In Vite dev, a previously registered worker can serve stale app bundles.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('Service Worker registered successfully:', reg.scope);
        // Auto subscribe if logged in and permission is already granted
        if (localStorage.getItem('erp_token') && Notification.permission === 'granted') {
          subscribeToPushNotifications();
        }
      })
      .catch(err => {
        console.error('Service Worker registration failed:', err);
      });
  });
} else if ('serviceWorker' in navigator && import.meta.env.DEV) {
  window.addEventListener('load', () => {
    clearLocalServiceWorker().catch(err => {
      console.error('Failed to clear local Service Worker:', err);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

