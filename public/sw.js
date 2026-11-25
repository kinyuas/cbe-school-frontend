/* EduNexa Service Worker — app shell precache + runtime cache */
const CACHE_VERSION = 'edunexa-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Never intercept API / auth calls — let axios + TanStack Query handle offline
  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/') || req.method !== 'GET') return;

  // Navigation requests → serve app shell (index.html) offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match('/index.html').then((r) => r || Response.error())
      )
    );
    return;
  }

  // Static assets → cache-first
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req)
          .then((res) => {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, clone));
            return res;
          })
          .catch(() => Response.error())
    )
  );
});