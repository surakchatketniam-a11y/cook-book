const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ORIGIN = 'https://example.test';
const source = fs.readFileSync(path.join(__dirname, '..', 'website', 'sw.js'), 'utf8');

function makeCaches() {
  const stores = new Map();
  const norm = (req) => (typeof req === 'string' ? new URL(req, ORIGIN + '/').href : req.url);
  const strip = (u) => u.split('?')[0];
  const open = async (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const s = stores.get(name);
    return {
      addAll: async (list) => list.forEach((u) => s.set(norm(u), new Response('x'))),
      put: async (req, res) => void s.set(norm(req), res),
      match: async (req, o = {}) => {
        const k = norm(req);
        for (const [key, v] of s) if (key === k || (o.ignoreSearch && strip(key) === strip(k))) return v.clone();
      },
      keys: async () => [...s.keys()],
    };
  };
  return {
    stores,
    open,
    keys: async () => [...stores.keys()],
    delete: async (n) => stores.delete(n),
    match: async (req, o) => {
      for (const n of stores.keys()) {
        const r = await (await open(n)).match(req, o);
        if (r) return r;
      }
    },
  };
}

function load({ online = true } = {}) {
  const listeners = {};
  const caches = makeCaches();
  const fetched = [];
  const self = {
    location: { origin: ORIGIN },
    registration: { scope: ORIGIN + '/' },
    addEventListener: (type, fn) => (listeners[type] = fn),
    skipWaiting: () => {},
    clients: { claim: async () => {} },
  };
  const ctx = vm.createContext({
    self, caches, URL, Response, Array, Promise, console,
    fetch: async (req) => {
      fetched.push(typeof req === 'string' ? req : req.url);
      if (!online) throw new Error('offline');
      return new Response('net');
    },
  });
  vm.runInContext(source, ctx);
  const dispatch = async (type, props) => {
    let p;
    await listeners[type]({ ...props, waitUntil: (x) => (p = x), respondWith: (x) => (p = x) });
    return p;
  };
  return { caches, fetched, dispatch };
}

const req = (p, mode = 'no-cors') => ({ method: 'GET', url: ORIGIN + p, mode });

test('install precaches only the app shell, not the 20 recipe photos', async () => {
  const sw = load();
  await sw.dispatch('install', {});
  const core = await (await sw.caches.open('thai-kitchen-pwa-dev')).keys();
  assert.ok(core.some((u) => u.endsWith('/js/main.js')));
  assert.ok(core.some((u) => u.endsWith('/fonts/Sarabun-Regular.woff2')));
  assert.ok(core.some((u) => u.endsWith('/icons/icon-maskable-512.png')));
  assert.ok(!core.some((u) => u.includes('/images/')));
});

test('warm-images message fills the separate image cache', async () => {
  const sw = load();
  await sw.dispatch('message', { data: 'warm-images' });
  const imgs = await (await sw.caches.open('thai-kitchen-img')).keys();
  assert.strictEqual(imgs.length, 42);
});

test('activate removes old versioned caches but keeps the image cache', async () => {
  const sw = load();
  await sw.caches.open('thai-kitchen-pwa-old');
  await sw.caches.open('thai-kitchen-img');
  await sw.dispatch('activate', {});
  assert.deepStrictEqual((await sw.caches.keys()).sort(), ['thai-kitchen-img']);
});

test('cached images are served offline', async () => {
  const sw = load();
  await sw.dispatch('message', { data: 'warm-images' });
  const offline = load({ online: false });
  offline.caches.stores.set('thai-kitchen-img', sw.caches.stores.get('thai-kitchen-img'));
  const res = await offline.dispatch('fetch', { request: req('/images/05.webp') });
  assert.strictEqual(await res.text(), 'net');
  assert.deepStrictEqual(offline.fetched.length, 1, 'tried network refresh in the background');
});

test('navigation falls back to the cached index when offline', async () => {
  const sw = load({ online: false });
  await sw.dispatch('install', {});
  const res = await sw.dispatch('fetch', { request: req('/', 'navigate') });
  assert.ok(res.ok);
});
