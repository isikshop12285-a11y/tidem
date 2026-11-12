/* Tidem Gıda · çevrimdışı çalışma
   Uygulama hızlı açılsın diye: internet 1,2 saniyede cevap verirse güncel sürüm açılır,
   vermezse telefondaki kayıtlı kopya hemen açılır ve yeni sürüm arka planda indirilip bir sonraki açılışa hazırlanır.
   Verileriniz bu dosyada değil, telefonun kendi hafızasında (localStorage) durur. */
const CACHE = 'tidem-v3';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-192.png', './icon-maskable-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate' || (url.origin === location.origin && url.pathname.endsWith('.html'))){
    const net = fetch(req, { cache: 'no-cache' }).then(res => {
      if (res && res.ok){ const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); }
      return res;
    });
    e.waitUntil(net.catch(() => {}));
    e.respondWith(caches.match('./index.html').then(cached => {
      if (!cached) return net.catch(() => caches.match('./'));
      const timer = new Promise(r => setTimeout(() => r(cached), 1200));
      return Promise.race([net.then(r => (r && r.ok) ? r : cached).catch(() => cached), timer]);
    }));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaque')){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => hit)));
});
