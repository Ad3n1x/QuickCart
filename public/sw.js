const CACHE = 'quickcart-shell-v3';
const BASE = new URL(self.registration.scope).pathname;
const SHELL = [BASE, BASE + 'index.html'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    const url = new URL(request.url);
    const cached = await caches.match(request);
    const isAsset = /\\.(?:js|css)(?:$|\\?)/i.test(url.pathname + url.search);

    if (request.mode === 'navigate' || isAsset) {
      try {
        const fresh = await fetch(request, { cache: 'no-cache' });
        const cache = await caches.open(CACHE);
        cache.put(request, fresh.clone()).catch(() => {});
        return fresh;
      } catch {
        return cached || (request.mode === 'navigate' ? caches.match(BASE + 'index.html') : Response.error());
      }
    }

    if (cached) return cached;

    try {
      const fresh = await fetch(request);
      const cache = await caches.open(CACHE);
      cache.put(request, fresh.clone()).catch(() => {});
      return fresh;
    } catch {
      return Response.error();
    }
  })());
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
