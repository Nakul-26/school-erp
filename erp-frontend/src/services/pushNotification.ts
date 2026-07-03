import { api } from './api';

// Helper to convert base64 URL to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push messaging is not supported in this browser');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check if permission is already granted/denied
    if (Notification.permission === 'denied') {
      console.warn('Push notification permission denied by user');
      return;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Push notification permission not granted');
      return;
    }

    // Get VAPID public key from backend
    const { key: vapidPublicKey } = await api.get('/notifications/push/vapid-public-key');
    if (!vapidPublicKey) {
      console.warn('VAPID public key not configured on backend');
      return;
    }

    // Subscribe to Push Service
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as any
    });

    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
      throw new Error('Subscription structure invalid');
    }

    // Save to our backend
    await api.post('/notifications/push/subscribe', {
      endpoint: subJson.endpoint,
      p256dh: subJson.keys.p256dh,
      auth: subJson.keys.auth,
      userAgent: navigator.userAgent
    });

    console.log('Successfully subscribed to Web Push notifications');
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
  }
}

export async function unsubscribeFromPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      
      // Delete on backend
      await api.delete('/notifications/push/unsubscribe', { endpoint });
      console.log('Successfully unsubscribed from Web Push notifications');
    }
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
  }
}
