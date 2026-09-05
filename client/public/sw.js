/* EliaVit service worker.
   The app shell is cached so the app opens with no signal — a rep in a
   basement pharmacy still sees their queued work. API traffic is never
   cached: stale sales figures would be worse than none. */

const SHELL_CACHE = 'eliavit-shell-v2';
const SHELL_ASSETS = ['/', '/index.html', '/manifest.webmanifest', '/apple-touch-icon.png'];

/**
 * The built JS and CSS carry content hashes in their names, so they cannot be
 * listed here. They are also requested before this worker activates, which
 * means the fetch handler never sees them on a first visit — and the app would
 * open to a blank screen offline. So read index.html at install time and
 * precache whatever it references.
 */
async function precacheShell() {
  const cache = await caches.open(SHELL_CACHE);
  await cache.addAll(SHELL_ASSETS);

  try {
    const html = await (await fetch('/index.html', { cache: 'reload' })).text();
    const assets = [...html.matchAll(/(?:src|href)="(\/[^"]+\.(?:js|css|png|webmanifest))"/g)].map(
      (match) => match[1],
    );
    await Promise.all(
      [...new Set(assets)].map((url) => cache.add(url).catch(() => undefined)),
    );
  } catch {
    // Offline at install time: the fetch handler will fill the cache later.
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // always live

  // Navigations: network first, fall back to the cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html')),
    );
    return;
  }

  // Built assets are content-hashed, so cache-first is safe and instant.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
