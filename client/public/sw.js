/* JambGenius Service Worker v2 */
const CACHE_VERSION = 'v2';
const SHELL_CACHE   = `jambgenius-shell-${CACHE_VERSION}`;
const ASSET_CACHE   = `jambgenius-assets-${CACHE_VERSION}`;
const API_CACHE     = `jambgenius-api-${CACHE_VERSION}`;

// App-shell routes to pre-cache on install
const SHELL_ROUTES = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon.svg',
];

// API paths we want to cache briefly (questions, syllabus, etc.)
const CACHEABLE_API_PATTERNS = [
  /^\/api\/questions($|\?)/,
];

// API paths we should NEVER cache (auth, payments, credits, AI)
const NEVER_CACHE_API_PATTERNS = [
  /^\/api\/auth/,
  /^\/api\/login/,
  /^\/api\/logout/,
  /^\/api\/payment/,
  /^\/api\/paystack/,
  /^\/api\/get-credits/,
  /^\/api\/deduct-credits/,
  /^\/api\/chat/,
  /^\/api\/ai/,
  /^\/api\/gemini/,
];

// Max age for cached API responses (15 minutes)
const API_CACHE_MAX_AGE_MS = 15 * 60 * 1000;

// ─── Install ────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async (cache) => {
      for (const url of SHELL_ROUTES) {
        try {
          await cache.add(url);
        } catch {
          // Non-fatal: shell file may not exist yet (first deploy)
        }
      }
    })
  );
  self.skipWaiting();
});

// ─── Activate ───────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const currentCaches = new Set([SHELL_CACHE, ASSET_CACHE, API_CACHE]);
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => !currentCaches.has(name))
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only intercept GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const path = url.pathname;

  // ── API requests ──────────────────────────────────────────────────────────
  if (path.startsWith('/api/')) {
    // Never cache sensitive endpoints – always go to network
    if (NEVER_CACHE_API_PATTERNS.some((re) => re.test(path))) return;

    // For cacheable API endpoints use: network-first with short-lived cache
    if (CACHEABLE_API_PATTERNS.some((re) => re.test(path + url.search))) {
      event.respondWith(networkFirstWithApiCache(request));
      return;
    }

    // All other API calls: network only
    return;
  }

  // ── Navigation requests (HTML pages) ─────────────────────────────────────
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request));
    return;
  }

  // ── Static assets (JS, CSS, images, fonts, icons) ────────────────────────
  event.respondWith(staleWhileRevalidate(request));
});

// ─── Strategies ─────────────────────────────────────────────────────────────

/**
 * Navigation: network-first, fall back to cached shell (/), then /offline.
 */
async function navigationHandler(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    // Offline – try to serve exact URL from cache, then root shell, then offline page
    const cached =
      (await caches.match(request)) ||
      (await caches.match('/')) ||
      (await caches.match('/offline'));

    if (cached) return cached;

    return new Response(
      '<!DOCTYPE html><html><head><title>Offline – JambGenius</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb;color:#1f2937}div{text-align:center;padding:2rem}h1{font-size:2rem;margin-bottom:.5rem}p{color:#6b7280}button{margin-top:1.5rem;padding:.75rem 2rem;background:#2563eb;color:#fff;border:none;border-radius:.5rem;font-size:1rem;cursor:pointer}</style></head><body><div><div style="font-size:4rem">📶</div><h1>You\'re offline</h1><p>Check your internet connection and try again.</p><button onclick="location.reload()">Retry</button></div></body></html>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

/**
 * Static assets: serve from cache immediately, update cache in background.
 * Falls back to network if not cached yet.
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached || (await fetchPromise) || new Response('Not found', { status: 404 });
}

/**
 * API questions: network-first with a 15-minute cache fallback.
 * Cached responses include a timestamp header so we can expire them.
 */
async function networkFirstWithApiCache(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE);
      // Clone and annotate with timestamp before caching
      const body = await networkResponse.clone().arrayBuffer();
      const headers = new Headers(networkResponse.headers);
      headers.set('x-sw-cached-at', Date.now().toString());
      const annotated = new Response(body, {
        status: networkResponse.status,
        statusText: networkResponse.statusText,
        headers,
      });
      cache.put(request, annotated);
    }
    return networkResponse;
  } catch {
    // Network unavailable – check cache
    const cache = await caches.open(API_CACHE);
    const cached = await cache.match(request);
    if (cached) {
      const cachedAt = parseInt(cached.headers.get('x-sw-cached-at') || '0', 10);
      if (Date.now() - cachedAt < API_CACHE_MAX_AGE_MS) {
        return cached;
      }
      // Expired – delete it and respond with error JSON
      cache.delete(request);
    }
    return new Response(
      JSON.stringify({ success: false, error: 'You are offline. Please reconnect to load questions.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ─── Push notifications (skeleton) ──────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } catch { data = { title: 'JambGenius', body: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(data.title || 'JambGenius', {
      body: data.body || '',
      icon: '/icons/icon.svg',
      badge: '/icons/icon.svg',
      data: data.url ? { url: data.url } : undefined,
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url === targetUrl && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
