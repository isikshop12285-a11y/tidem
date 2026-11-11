/* Tidem Gıda · çevrimdışı çalışma
   Uygulama dosyası internet varken her açılışta güncellenir, internet yokken kayıtlı kopyadan açılır.
   Verileriniz bu dosyada değil, telefonun kendi hafızasında (localStorage) durur. */
const CACHE = 'tidem-v2';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-192.png', './icon-maskable-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Uygulama sayfası: önce internet (güncel sürüm), yoksa kayıtlı kopya
  if (req.mode === 'navigate' || (url.origin === location.origin && url.pathname.endsWith('.html'))){
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return res; })
      .catch(() => caches.match('./index.html').then(r => r || caches.match('./'))));
    return;
  }
  // Simgeler, yazı tipleri vb.: önce kayıtlı kopya, yoksa internetten alıp sakla
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaque')){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => hit)));
});
