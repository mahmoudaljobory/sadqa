/* features/offline.js — تحميل نصوص المصحف كاملة وحفظها للعمل دون إنترنت.
   يخزّن الـ 114 سورة في كاش مخصّص يقرأ منه عامل الخدمة لاحقاً بلا اتصال. */
import { $, store, toast, ar } from '../core.js';
import { RISAN_BASE } from '../config.js';
import { SURAHS_META } from '../data/surahs.js';

const QURAN_CACHE = 'sadaqah-quran-v1';
let downloading = false;

export function initOffline(){
  const btn = $('#offlineBtn'); if(!btn) return;
  if(!('caches' in window)){ btn.closest('.offline-box')?.remove(); return; }
  refreshLabel();
  btn.addEventListener('click', downloadAll);
}

function refreshLabel(){
  const btn = $('#offlineBtn'); if(!btn) return;
  btn.textContent = store.get('quranDownloaded', false)
    ? '✓ المصحف محفوظ للعمل دون إنترنت (اضغط لإكمال/تحديث)'
    : '⬇️ تحميل المصحف كاملاً للعمل دون إنترنت';
}

async function downloadAll(){
  if(downloading) return;
  if(!('caches' in window)){ toast('التخزين دون إنترنت غير مدعوم في متصفحك'); return; }
  if(navigator.onLine === false){ toast('تحتاج اتصالاً بالإنترنت لتحميل المصحف'); return; }
  downloading = true;
  const btn = $('#offlineBtn'), wrap = $('#offlineProgress'), bar = $('#offlineBar'), pct = $('#offlinePct');
  if(wrap) wrap.style.display = 'block';
  if(btn) btn.disabled = true;
  let done = 0, failed = 0; const total = SURAHS_META.length;
  try{
    const cache = await caches.open(QURAN_CACHE);
    for(const s of SURAHS_META){
      const url = RISAN_BASE + '/' + s.number + '.json';
      try{
        const hit = await cache.match(url);
        if(!hit){
          const res = await fetch(url, { cache:'no-store' });
          if(res && res.ok) await cache.put(url, res.clone()); else failed++;
        }
      }catch{ failed++; }
      done++;
      const p = Math.round(done / total * 100);
      if(bar) bar.style.width = p + '%';
      if(pct) pct.textContent = ar(done) + '/' + ar(total) + ' (' + ar(p) + '٪)';
    }
    if(failed === 0){
      store.set('quranDownloaded', true); store.set('quranDownloadedAt', Date.now());
      toast('تم حفظ المصحف كاملاً — يعمل الآن دون إنترنت ✅');
    } else {
      toast('اكتمل التحميل مع تعذّر ' + ar(failed) + ' سورة — اضغط الزر لإكمالها');
    }
  }catch{
    toast('تعذّر التحميل — تحقّق من الإنترنت وأعد المحاولة');
  }finally{
    downloading = false;
    if(btn) btn.disabled = false;
    refreshLabel();
    setTimeout(() => { const w = $('#offlineProgress'); if(w) w.style.display = 'none'; }, 1600);
  }
}
