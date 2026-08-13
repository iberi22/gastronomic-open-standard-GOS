// GOS PWA Service Worker - Manual implementation
// No external dependencies = No security vulnerabilities

const CACHE_NAME = 'gos-pwa-v1';
const BASE_URL = '/gastronomic-open-standard-GOS';

const STATIC_ASSETS = [
  BASE_URL + '/',
  BASE_URL + '/index.html',
  BASE_URL + '/manifest.json',
];

// Install - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch - strategies based on resource type
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== 'GET') return;

  // Skip non-http
  if (!url.protocol.startsWith('http')) return;

  // Skip HuggingFace/WebLLM model shards and wasm files
  // Let the browser's native Cache API used by WebLLM handle them directly to avoid memory bloating
  if (url.hostname.includes('huggingface.co') ||
      url.hostname.includes('mlc-ai') ||
      url.pathname.includes('web-llm') ||
      url.pathname.includes('webllm') ||
      url.href.endsWith('.bin') ||
      url.href.endsWith('.wasm')) {
    return;
  }

  // API/GitHub - Network First
  if (url.pathname.startsWith('/api/') || 
      url.hostname.includes('github.com') ||
      url.hostname.includes('raw.githubusercontent.com')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets (JS/CSS/Images/Fonts) - Cache First
  if (request.destination === 'style' ||
      request.destination === 'script' ||
      request.destination === 'image' ||
      request.destination === 'font') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML pages - Stale While Revalidate
  event.respondWith(staleWhileRevalidate(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, response.clone());
        });
      }
      return response;
    })
    .catch(() => cached || new Response('Offline', { status: 503 }));

  return cached || fetchPromise;
}

// Message handler
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
