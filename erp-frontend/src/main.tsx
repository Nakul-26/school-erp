import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { subscribeToPushNotifications } from './services/pushNotification'

// Register Service Worker
if ('serviceWorker' in navigator) {
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
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

