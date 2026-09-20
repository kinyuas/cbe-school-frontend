/* Minimal service worker to enable PWA installability on Android.
   The presence of a fetch handler is required by Chrome for WebAPK installation. */

const CACHE_NAME = 'cbe-system-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network-first strategy — always try network, fall back to cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});