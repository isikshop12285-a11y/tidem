/* Tidem Gıda · çevrimdışı çalışma ve hızlı açılış
   Uygulama HER ZAMAN telefondaki kayıtlı kopyayla hemen açılır (internet beklenmez → açılış görseli takılı kalmaz).
   Aynı anda internetten yeni sürüm arka planda kontrol edilir; yeni sürüm varsa kaydedilir ve uygulamada
   "Yeni sürüm hazır · YENİLE" çubuğu çıkar. Verileriniz bu dosyada değil, telefonun kendi hafızasında durur. */
const CACHE = 'tidem-v6';
const SHARE = 'tidem-paylasim';   // WhatsApp'tan paylaşılan dosya geçici olarak burada bekler
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-192.png', './icon-maskable-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== SHARE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Arka planda yeni sürüm kontrolü: farklıysa kaydet ve açık uygulamaya haber ver
async function refreshPage(req){
  try{
    const res = await fetch(req, { cache: 'no-cache' });
    if (!res || !res.ok) return;
    const cache = await caches.open(CACHE);
    const old = await cache.match('./index.html');
    const fresh = await res.clone().text();
    const before = old ? await old.text() : '';
    if (fresh && fresh !== before){
      await cache.put('./index.html', res);
      if (before){
        const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        list.forEach(c => c.postMessage({ type: 'tidem-yeni-surum' }));
      }
    }
  }catch(err){ /* internet yok: sorun değil, kayıtlı kopya çalışıyor */ }
}

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  // "Paylaş → TİDEM GIDA": gelen dosyayı sakla, uygulamayı aç
  if (req.method === 'POST' && url.origin === location.origin && url.pathname.endsWith('/paylas')){
    e.respondWith((async () => {
      try{
        const fd = await req.formData(), f = fd.get('file');
        if (f && typeof f !== 'string'){
          const c = await caches.open(SHARE);
          await c.put('./paylasilan-dosya', new Response(f, { headers: { 'content-type': f.type || 'application/octet-stream', 'x-name': encodeURIComponent(f.name || 'dosya') } }));
        }
      }catch(err){}
      return Response.redirect('./?paylasim=1', 303);
    })());
    return;
  }
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate' || (url.origin === location.origin && url.pathname.endsWith('.html'))){
    e.respondWith(caches.match('./index.html').then(cached => {
      if (cached){ e.waitUntil(refreshPage(req)); return cached; }     // anında aç, arka planda güncelle
      return fetch(req).then(res => {                                     // ilk kurulum: internetten al ve sakla
        if (res && res.ok){ const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); }
        return res;
      }).catch(() => caches.match('./'));
    }));
    return;
  }
  // manifest ve simgeler: önce internet (açılış görseli/simge değişince telefon görsün), yoksa kayıtlı kopya
  if (url.origin === location.origin && /(\.webmanifest|icon-[\w-]+\.png)$/.test(url.pathname)){
    e.respondWith(fetch(req).then(res => { if (res && res.ok){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; }).catch(() => caches.match(req)));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaque')){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => hit)));
});
