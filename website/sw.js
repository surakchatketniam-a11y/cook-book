const CACHE = 'thai-kitchen-pwa-v6';
const SHELL = ['./', './index.html', './style.css', './app.js', './data.js', './pwa.js', './manifest.webmanifest',
  './fonts/Sarabun-Regular.ttf', './fonts/Sarabun-Bold.ttf', './fonts/Sriracha-Regular.ttf',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png', './images/cover.webp',
  ...Array.from({length:20}, (_, i) => `./images/${String(i+1).padStart(2,'0')}.webp`)];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('thai-kitchen-pwa-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(request);
      if (response.ok && new URL(request.url).search === '' && SHELL.some(path => new URL(path, self.registration.scope).href === request.url)) await cache.put(request, response.clone());
      return response;
    } catch (error) {
      const cached = await cache.match(request, {ignoreSearch: true});
      if (cached) return cached;
      if (request.mode === 'navigate') return (await cache.match('./index.html')) || Response.error();
      return Response.error();
    }
  })());
});
