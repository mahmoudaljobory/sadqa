/* عامل الخدمة — تثبيت (PWA) وتخزين مؤقت للملف الواحد */
const CACHE = 'sadaqah-v10';
const SHELL = ['./','./index.html','./manifest.json',
  './assets/logo.svg','./assets/logo-192.png','./assets/logo-512.png','./assets/favicon-64.png'];
self.addEventListener('install', e => { self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(()=>{})); });
self.addEventListener('activate', e => { e.waitUntil(
  caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch', e => { const req=e.request; if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin){ e.respondWith(fetch(req).catch(()=>caches.match(req))); return; }
  e.respondWith(caches.match(req).then(c=>c||fetch(req).then(res=>{const cp=res.clone();
    caches.open(CACHE).then(ch=>ch.put(req,cp)).catch(()=>{});return res;}).catch(()=>c))); });
