/* ORacle service worker — offline support for OR dead-zones.
 *
 * Strategy:
 *   - App pages + scripts: NETWORK-FIRST. When you have signal you always get the
 *     freshest content (no stale-dosing risk); when you're offline you fall back to
 *     the last cached copy. Because it's network-first, content updates propagate
 *     automatically online — you do NOT need to bump the version for content edits.
 *   - Images / fonts: CACHE-FIRST (fast, and available offline once seen).
 *
 * Only bump CACHE below if you change THIS file's logic or the precache list.
 */
const CACHE = 'oracle-v1';

// Precached on install so the apps work offline even before each one is opened.
const CORE = [
  './', './index.html', './xref.js', './manifest.webmanifest',
  './procedures/index.html', './preop/index.html', './peds/index.html',
  './icon-192.png', './icon-512.png', './apple-touch-icon.png', './favicon-32.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE).catch(() => {/* tolerate a missing optional asset */}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function putInCache(req, res) {
  try { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } catch (e) {}
  return res;
}

function networkFirst(req) {
  return fetch(req)
    .then((res) => (res && res.status === 200) ? putInCache(req, res) : res)
    .catch(() => caches.match(req).then((m) => m || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())));
}

function cacheFirst(req) {
  return caches.match(req).then((m) => m || fetch(req)
    .then((res) => (res && (res.status === 200 || res.type === 'opaque')) ? putInCache(req, res) : res)
    .catch(() => m || Response.error()));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  let path = '';
  try { path = new URL(req.url).pathname; } catch (e) {}
  const fresh = req.mode === 'navigate' || path.endsWith('.js') || path.endsWith('index.html');
  event.respondWith(fresh ? networkFirst(req) : cacheFirst(req));
});
