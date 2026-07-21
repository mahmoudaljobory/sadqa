/* عامل الخدمة — تثبيت (PWA) + تخزين واجهة + مصحف وتلاوة يعملان دون إنترنت + إشعارات */
const CACHE = 'sadaqah-v14';
const QURAN_CACHE = 'sadaqah-quran-v1';   /* نصوص المصحف والتفسير */
const AUDIO_CACHE = 'sadaqah-audio-v1';   /* التلاوة الصوتية المحمّلة */
const KEEP = [CACHE, QURAN_CACHE, AUDIO_CACHE];
const SHELL = ['./','./index.html','./manifest.json',
  './assets/logo.svg','./assets/logo-192.png','./assets/logo-512.png','./assets/favicon-64.png'];
self.addEventListener('install', e => { self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(()=>{})); });
self.addEventListener('activate', e => { e.waitUntil(
  caches.keys().then(k=>Promise.all(k.filter(x=>KEEP.indexOf(x)===-1).map(x=>caches.delete(x)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch', e => { const req=e.request; if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin){
    const isText = url.href.indexOf('quran-json')>-1 || url.href.indexOf('tafsir_api')>-1;
    e.respondWith(caches.match(req).then(cached => cached || fetch(req).then(res=>{
      if(isText && res && res.ok){ const cp=res.clone(); caches.open(QURAN_CACHE).then(ch=>ch.put(req,cp)).catch(()=>{}); }
      return res;
    }).catch(()=>cached)));
    return;
  }
  e.respondWith(caches.match(req).then(c=>c||fetch(req).then(res=>{const cp=res.clone();
    caches.open(CACHE).then(ch=>ch.put(req,cp)).catch(()=>{});return res;}).catch(()=>c))); });
/* عند النقر على إشعار الصلاة: افتح التطبيق أو ركّز عليه */
self.addEventListener('notificationclick', e => { e.notification.close();
  e.waitUntil(clients.matchAll({type:'window', includeUncontrolled:true}).then(cl => {
    for(const c of cl){ if('focus' in c) return c.focus(); }
    if(clients.openWindow) return clients.openWindow('./');
  })); });
