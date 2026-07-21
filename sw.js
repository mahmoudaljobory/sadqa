/* عامل الخدمة — يمكّن تثبيت التطبيق (PWA) ويخزّن واجهته مؤقتاً */
const CACHE = 'sadaqah-v5';
const SHELL = ['./', './index.html', './app.js', './manifest.json',
  './logo.svg', './logo-mark.svg', './logo-192.png', './logo-512.png', './favicon-64.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // طلبات المحتوى الخارجي (القرآن/التفسير/الصلاة): من الشبكة أولاً
  if (url.origin !== self.location.origin) {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  // واجهة التطبيق: من الكاش أولاً ثم الشبكة
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => cached))
  );
});
