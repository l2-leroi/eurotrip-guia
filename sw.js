const CACHE = 'eurotrip-v1';
const SHELL = ['./', './icon-180.png'];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); });
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
const keep = (req, res) => { if (res && (res.ok || res.type === 'opaque')) { const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)); } return res; };
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // rede primeiro, com 4 s de limite; sem resposta, usa a cópia guardada
    e.respondWith(new Promise(resolve => {
      let done = false;
      const fallback = () => caches.match(req, {ignoreSearch: true}).then(m => m || caches.match('./'));
      const net = fetch(req).then(res => keep(req, res));
      const timer = setTimeout(() => fallback().then(m => { if (m && !done) { done = true; resolve(m); } }), 4000);
      net.then(res => { clearTimeout(timer); if (!done) { done = true; resolve(res); } })
         .catch(() => { clearTimeout(timer); fallback().then(m => { if (!done) { done = true; resolve(m || Response.error()); } }); });
    }));
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.match(req).then(m => m || fetch(req).then(res => keep(req, res))));
  }
});
