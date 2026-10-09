const VERSION = '__BUILD_VERSION__';
const PREFIX = `wedding:${encodeURIComponent(self.registration.scope)}:`;
const CACHE = `${PREFIX}${VERSION}`;
const url = relative => new URL(relative, self.registration.scope).href;
const SHELL = ['./', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
  `css/style.css?v=${VERSION}`, ...['app', 'gallery', 'lightbox', 'audio', 'utils'].map(name => `js/${name}.js?v=${VERSION}`), 'data/album.json'].map(url);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL.map(src => new Request(src, { cache: 'reload' })))).catch(async error => {
    await caches.delete(CACHE); throw error;
  }));
  // An existing viewer stays on its current worker until choosing Update.
});
self.addEventListener('message', event => { if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting(); });
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
async function networkFirst(request, key) {
  const cache = await caches.open(CACHE);
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(request, { cache: 'no-cache', signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await cache.put(key, response.clone()); return response;
  } catch {
    return await cache.match(key) || new Response('Tạm thời chưa có kết nối. Hãy mở lại khi có mạng.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  } finally { clearTimeout(timer); }
}
self.addEventListener('fetch', event => {
  const request = event.request; const target = new URL(request.url); const scope = new URL(self.registration.scope);
  if (request.method !== 'GET' || target.origin !== scope.origin || !target.pathname.startsWith(scope.pathname)) return;
  if (request.mode === 'navigate') { event.respondWith(networkFirst(request, url('./'))); return; }
  if (target.pathname === new URL('data/album.json', scope).pathname) { event.respondWith(networkFirst(request, url('data/album.json'))); return; }
  if (SHELL.includes(target.href)) event.respondWith(caches.open(CACHE).then(async cache => await cache.match(request) || fetch(request)));
  // Photos and audio use browser/HTTP caching only. Never precache the album's media.
});
