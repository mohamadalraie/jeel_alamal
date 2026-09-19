// Service Worker for جيل العمل (Jeel Al-Amal) PWA
// VERSION: 2 — background push notifications fix
const CACHE_VERSION = 'v2';
const CACHE_NAME = `jeel-alamal-${CACHE_VERSION}`;
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/logo.png',
  '/favicon.ico',
];

// ─── Install ────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  // Skip waiting forces the new SW to activate immediately, replacing any old version
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[SW] Failed to pre-cache some assets:', err);
      });
    })
  );
});

// ─── Activate ───────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('jeel-alamal-') && name !== CACHE_NAME)
          .map((name) => {
            console.info('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.info('[SW] Activated and claiming clients');
      // Claim all open clients so the new SW takes effect immediately
      return self.clients.claim();
    })
  );
});

// ─── Fetch (Network-first, cache fallback for static assets) ────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip non-same-origin and API requests entirely
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache static file responses (images, icons, etc.)
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic' &&
          (url.pathname.endsWith('.png') ||
            url.pathname.endsWith('.jpg') ||
            url.pathname.endsWith('.svg') ||
            url.pathname.endsWith('.ico') ||
            url.pathname.endsWith('.webp'))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Offline fallback
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/');
          }
        });
      })
  );
});

// ─── Push ────────────────────────────────────────────────────────────────────
// This event fires even when the app is CLOSED, as long as:
//   1. The browser is running (or a background process for it is)
//   2. The push subscription is valid and registered with the server
//   3. The server sent a properly VAPID-signed push message
self.addEventListener('push', (event) => {
  console.info('[SW] Push event received');

  let data = {
    id: `push-${Date.now()}`,
    title: 'جيل العمل - إشعار جديد',
    message: '',
    link: '/',
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch {
      data.message = event.data.text() || '';
    }
  }

  const options = {
    body: data.message || '',
    icon: '/logo.png',
    badge: '/logo.png',
    tag: data.id,
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: data.link || '/' },
    dir: 'rtl',
    lang: 'ar',
    requireInteraction: false,
  };

  console.info('[SW] Showing notification:', data.title);

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ─── Notification Click ──────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawUrl = event.notification.data?.url || '/';
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if open
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin)) {
          if ('focus' in client) {
            client.focus();
            if ('navigate' in client) {
              client.navigate(targetUrl);
            }
            return;
          }
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ─── Push Subscription Change ────────────────────────────────────────────────
// Fired when the push subscription is invalidated (e.g. key rotation by browser)
// We can't easily re-register here since we need auth tokens,
// but we log it so the client can detect and re-subscribe on next open.
self.addEventListener('pushsubscriptionchange', (event) => {
  console.warn('[SW] Push subscription changed/expired — will re-register on next app open');
  // The app will handle re-registration via registerPushSubscription()
  // when the user opens the app again.
  event.waitUntil(Promise.resolve());
});
