/* عامل الخدمة — يمكّن تثبيت التطبيق (PWA) ويخزّن واجهته مؤقتاً */
const CACHE = 'sadaqah-v9';
const SHELL = [
  './', './index.html', './manifest.json',
  './styles/tokens.css', './styles/main.css',
  './js/main.js', './js/config.js', './js/core.js', './js/state.js',
  './js/data/surahs.js', './js/data/reciters.js', './js/data/content.js',
  './js/ui/theme.js', './js/ui/nav.js', './js/ui/dedication.js',
  './js/features/player.js', './js/features/quran.js', './js/features/tafsir.js',
  './js/features/prayer.js', './js/features/adhkar.js', './js/features/tasbih.js',
  './js/features/share.js', './js/features/install.js',
  './assets/logo.svg', './assets/logo-mark.svg', './assets/logo-192.png',
  './assets/logo-512.png', './assets/favicon-64.png'
];

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
  // المحتوى الخارجي (قرآن/تفسير/صلاة): من الشبكة أولاً
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
