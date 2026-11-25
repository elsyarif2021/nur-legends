const CACHE_PREFIX = 'nur-legends-shell-';
const CACHE = CACHE_PREFIX + '__BUILD_VERSION__';
const SHELL = ['/', '/manifest.webmanifest', '/icons/nur-rosette-192.png', '/icons/nur-rosette-512.png' /* BUILD_ASSETS */];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(
    SHELL.map(url => new Request(url, { cache: 'reload' })),
  )));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || request.headers.has('authorization')) return;

  if (request.mode === 'navigate' && !url.pathname.startsWith('/api/') && url.pathname !== '/ws') {
    event.respondWith(fetch(request).catch(async () => {
      const cache = await caches.open(CACHE);
      return await cache.match('/') || Response.error();
    }));
    return;
  }

  if (!SHELL.includes(url.pathname) || url.pathname === '/') return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    return await cache.match(request) || fetch(request);
  })());
});
