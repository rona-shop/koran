/* Koran PWA service worker — offline reading */
const CACHE = 'koran-v1';
const SHELL = [
  './', './index.html', './manifest.json',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png',
  './data/surahs.json', './data/ranges.json', './data/markers.json',
  './data/divisions.json', './data/thumn.json', './data/asbab.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function cachePut(req, res) {
  if (res && res.ok) {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(req, copy));
  }
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);

  /* audio streams: always network, never cached */
  if (u.hostname === 'www.everyayah.com') return;

  /* navigation: network first (so updates show), cache fallback (offline) */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => cachePut(req, r)).catch(() => caches.match('./index.html'))
    );
    return;
  }

  /* app shell + Quran text CDN + fonts: stale-while-revalidate */
  if (
    u.origin === location.origin ||
    u.hostname === 'cdn.jsdelivr.net' ||
    u.hostname === 'fonts.googleapis.com' ||
    u.hostname === 'fonts.gstatic.com'
  ) {
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(r => cachePut(req, r)).catch(() => hit);
        return hit || net;
      })
    );
  }
});
