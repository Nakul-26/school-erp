// ================================================================
// School ERP – Service Worker
// Handles: offline caching + Web Push notification display
// ================================================================

const CACHE_NAME = 'school-erp-v1';
const PRECACHE_URLS = [
  '/',
  '/index.html',
];

// ── Install: pre-cache shell ─────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ───────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first for API, cache-first for assets ─────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and cross-origin requests
  if (event.request.method !== 'GET') return;

  // Handle navigation requests (browser page refreshes/direct entry) by serving index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then(cached => {
        // Fallback to caching '/' or fetching from network if not cached
        return cached || caches.match('/') || fetch(event.request);
      })
    );
    return;
  }

  // Network-first for API calls (prevent caching backend JSON responses)
  const isApiCall = url.origin.includes('localhost:8787') ||
                     url.pathname.startsWith('/auth') ||
                     url.pathname.startsWith('/dashboard') ||
                     url.pathname.startsWith('/students') ||
                     url.pathname.startsWith('/teachers') ||
                     url.pathname.startsWith('/sections') ||
                     url.pathname.startsWith('/subjects') ||
                     url.pathname.startsWith('/exams') ||
                     url.pathname.startsWith('/attendance') ||
                     url.pathname.startsWith('/homework') ||
                     url.pathname.startsWith('/announcements') ||
                     url.pathname.startsWith('/notifications') ||
                     url.pathname.startsWith('/fees') ||
                     url.pathname.startsWith('/messaging') ||
                     url.pathname.startsWith('/payroll') ||
                     url.pathname.startsWith('/leave') ||
                     url.pathname.startsWith('/library') ||
                     url.pathname.startsWith('/transport') ||
                     url.pathname.startsWith('/assets') ||
                     url.pathname.startsWith('/visitors') ||
                     url.pathname.startsWith('/alumni') ||
                     url.pathname.startsWith('/classes');

  if (isApiCall) {
    event.respondWith(
      fetch(event.request).catch(() => new Response(JSON.stringify({ error: 'offline' }), {
        headers: { 'Content-Type': 'application/json' }
      }))
    );
    return;
  }

  // Cache-first for app shell (JS/CSS/fonts)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    })
  );
});

// ── Push: show notification when a push arrives ──────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'School ERP', body: 'You have a new notification', icon: '/icons/icon-192.png', url: '/', tag: 'erp-notification' };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'erp-notification',
      data: { url: data.url || '/' },
      requireInteraction: false,
      silent: false,
      vibrate: [200, 100, 200],
    })
  );
});

// ── Notification click: open/focus the app ────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // Focus existing tab if open
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Open new tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
