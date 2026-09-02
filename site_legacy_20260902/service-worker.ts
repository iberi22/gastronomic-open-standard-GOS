/**
 * GOS PWA Service Worker
 * Uses Workbox for intelligent caching:
 * - StaleWhileRevalidate: recipes (show cached, update in background)
 * - NetworkFirst: sync endpoints (prefer fresh data for GitHub API)
 * - Background Sync: offline review submissions
 */

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// Clean old caches on activate
cleanupOutdatedCaches();

// Precache assets from Vite build manifest
precacheAndRoute(self.__WB_MANIFEST);

// ============================================
// APP SHELL - StaleWhileRevalidate
// Core assets: HTML, JS, CSS, fonts
// ============================================
registerRoute(
  ({ request }) =>
    request.destination === 'document' ||
    request.destination === 'script' ||
    request.destination === 'style',
  new StaleWhileRevalidate({
    cacheName: 'app-shell-v1',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 7 * 24 * 60 * 60 // 1 week
      })
    ]
  })
);

// ============================================
// RECIPES - StaleWhileRevalidate
// Show cached immediately, update in background
// Priority: speed + offline availability
// ============================================
registerRoute(
  ({ url }) =>
    url.pathname.startsWith('/recipes') ||
    url.pathname.startsWith('/api/recipes') ||
    url.pathname === '/api/dishes' ||
    url.pathname === '/api/ingredients',
  new StaleWhileRevalidate({
    cacheName: 'recipes-cache-v1',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 24 * 60 * 60 // 24 hours
      })
    ]
  })
);

// ============================================
// SYNC / GITHUB API - NetworkFirst
// Prefer fresh data, fall back to cache on failure
// ============================================
registerRoute(
  ({ url }) =>
    url.hostname === 'api.github.com' ||
    url.hostname === 'raw.githubusercontent.com' ||
    url.pathname.startsWith('/api/sync'),
  new NetworkFirst({
    cacheName: 'sync-cache-v1',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 5 * 60 // 5 minutes
      })
    ]
  })
);

// ============================================
// IMAGES - StaleWhileRevalidate with long cache
// Recipe images, ingredient photos
// ============================================
registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'images-cache-v1',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
      })
    ]
  })
);

// ============================================
// EXTERNAL FONTS - CacheFirst
// Long-lived cache for Google Fonts
// ============================================
registerRoute(
  ({ url }) =>
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'fonts-cache-v1',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year
      })
    ]
  })
);

// ============================================
// OFFLINE REVIEWS - Background Sync Plugin
// Queue reviews when offline, sync when back online
// ============================================
const bgSyncPlugin = new BackgroundSyncPlugin('gos-reviews-queue', {
  maxRetentionTime: 24 * 60, // Retry for 24 hours
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request.clone());
        // Notify clients of successful sync
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({ type: 'SYNC_COMPLETE', success: true });
        });
      } catch (error) {
        // Put the request back in the queue
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
  }
});

registerRoute(
  ({ url }) =>
    url.pathname.startsWith('/api/reviews') ||
    url.pathname.startsWith('/api/sync'),
  new NetworkFirst({
    cacheName: 'reviews-write-cache-v1',
    plugins: [
      bgSyncPlugin,
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60
      })
    ]
  }),
  'POST'
);

// ============================================
// NAVIGATION - Offline Fallback
// Return offline page for navigation requests when offline
// ============================================
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Return cached app shell or offline.html
        return caches.match('/offline.html').then(response => {
          return response || caches.match('/');
        });
      })
    );
  }
});

// ============================================
// SYNC EVENT - Manual sync trigger
// ============================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-reviews') {
    event.waitUntil(syncReviews());
  }
  if (event.tag === 'sync-profile') {
    event.waitUntil(syncProfile());
  }
});

async function syncReviews() {
  // Open IndexedDB and sync pending reviews
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_STARTED' });
  });
}

async function syncProfile() {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'PROFILE_SYNC_COMPLETE' });
  });
}

// ============================================
// PUSH NOTIFICATIONS - Future feature
// ============================================
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'GOS', {
        body: data.body || 'Nueva actualización disponible',
        icon: '/icons/icon-192.svg',
        badge: '/icons/badge-72.svg',
        tag: 'gos-notification',
        data: data.url || '/'
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});

// ============================================
// MESSAGE HANDLER - Communication with main app
// ============================================
self.addEventListener('message', (event) => {
  if (!event.data) return;

  switch (event.data.type) {
    case 'SKIP_WAITING':
      // New service worker waiting - activate immediately
      self.skipWaiting();
      break;

    case 'TRIGGER_SYNC':
      // Manual sync trigger from UI
      self.dispatchEvent(new SyncEvent('sync-reviews'));
      break;

    case 'GET_VERSION':
      // Return SW version
      event.ports[0].postMessage({ version: '1.0.0' });
      break;

    case 'CLEAR_CACHE':
      // Clear specific cache
      if (event.data.cacheName) {
        caches.delete(event.data.cacheName);
      }
      break;
  }
});

// ============================================
// INSTALL - Skip waiting for faster updates
// ============================================
self.addEventListener('install', () => {
  self.skipWaiting();
});

// ============================================
// ACTIVATE - Clean up old caches
// ============================================
self.addEventListener('activate', (event) => {
  const validCaches = [
    'app-shell-v1',
    'recipes-cache-v1',
    'sync-cache-v1',
    'images-cache-v1',
    'fonts-cache-v1',
    'reviews-write-cache-v1'
  ];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => !validCaches.includes(name))
          .map(name => {
            console.log('[GOS SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[GOS SW] Activated, claiming clients');
      return self.clients.claim();
    })
  );
});

console.log('[GOS SW] Service Worker loaded');
