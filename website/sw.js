const CACHE = 'thai-kitchen-pwa-dev';
const IMAGE_CACHE = 'thai-kitchen-img';
const CORE = ['./', './index.html', './style.css', './js/state.js', './js/confirm.js', './js/shopping.js', './js/sheets.js',
  './js/recipe-list.js', './js/recipe-detail.js', './js/settings.js', './js/main.js', './data.js', './pwa.js',
  './manifest.webmanifest', './fonts/Sarabun-Regular.woff2', './fonts/Sarabun-Bold.woff2', './fonts/Sriracha-Regular.woff2',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'];
const RECIPE_IMAGES = ['./images/cover.webp', './images/cover-800.webp'].concat(Array.from({length:20}, (_, i) => `./images/${String(i+1).padStart(2,'0')}-480.webp`).concat(Array.from({length:20}, (_, i) => `./images/${String(i+1).padStart(2,'0')}.webp`)));
const imagesPath = new URL('./images/', self.registration.scope).pathname;
const isCore = url => CORE.some(path => new URL(path, self.registration.scope).href === url);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('thai-kitchen-pwa-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
// Recipe photos are downloaded after install so they never block or fail it; sent by pwa.js once the worker is ready.
self.addEventListener('message', event => {
  if (event.data !== 'warm-images') return;
  event.waitUntil(caches.open(IMAGE_CACHE).then(cache => Promise.all(RECIPE_IMAGES.map(async path => {
    const url = new URL(path, self.registration.scope).href;
    if (await cache.match(url)) return;
    try { const response = await fetch(url); if (response.ok) await cache.put(url, response); } catch (error) {}
  }))));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith(imagesPath)) {
    event.respondWith((async () => {
      const cached = await caches.match(request, {ignoreSearch: true});
      const refresh = fetch(request).then(async response => {
        if (response.ok) await (await caches.open(IMAGE_CACHE)).put(request, response.clone());
        return response;
      });
      if (cached) { event.waitUntil(refresh.catch(() => {})); return cached; }
      return refresh.catch(() => Response.error());
    })());
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(request);
      if (response.ok) {
        if (request.mode === 'navigate') {
          await cache.put('./index.html', response.clone());
        } else if (url.search === '' && isCore(request.url)) {
          await cache.put(request, response.clone());
        }
      }
      return response;
    } catch (error) {
      const cached = await cache.match(request, {ignoreSearch: true});
      if (cached) return cached;
      if (request.mode === 'navigate') return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      return Response.error();
    }
  })());
});
