/* features/offline.js — مدير التحميل للعمل دون إنترنت.
   يحمّل نصوص المصحف كاملة + التلاوة الصوتية الكاملة لقارئ مختار، ويخزّنها في كاش
   يقرأ منه عامل الخدمة بلا اتصال. يدعم الإيقاف والاستئناف ومعلومات التخزين. */
import { $, store, toast, ar } from '../core.js';
import { RISAN_BASE, AUDIO_BASE } from '../config.js';
import { SURAHS_META } from '../data/surahs.js';
import { RECITERS } from '../data/reciters.js';

const TEXT_CACHE  = 'sadaqah-quran-v1';
const AUDIO_CACHE = 'sadaqah-audio-v1';
const TOTAL_AYAT  = 6236;
const DL_BITRATES = [128, 64, 48, 40, 32];
const CONCURRENCY = 6;

let textBusy = false, audioBusy = false, audioPaused = false;

export function initOffline(){
  const box = $('#offlineBox');
  if(!('caches' in window)){ if(box) box.remove(); return; }
  const sel = $('#dlReciter');
  if(sel) sel.innerHTML = RECITERS.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
  requestPersistent();
  showStorage();
  refreshTextLabel();
  refreshAudioLabel();
  $('#offlineBtn') && $('#offlineBtn').addEventListener('click', downloadText);
  $('#dlAudioBtn') && $('#dlAudioBtn').addEventListener('click', () => audioBusy ? pauseAudio() : downloadAudio());
  $('#dlReciter') && $('#dlReciter').addEventListener('change', refreshAudioLabel);
}

async function requestPersistent(){ try{ if(navigator.storage && navigator.storage.persist) await navigator.storage.persist(); }catch{} }
function mb(b){ return ar(Math.round((b||0)/1048576)); }
async function showStorage(){
  const el = $('#storageInfo'); if(!el || !(navigator.storage && navigator.storage.estimate)) return;
  try{ const est = await navigator.storage.estimate();
    el.textContent = 'المساحة المستخدمة: ' + mb(est.usage) + ' م.ب من ' + mb(est.quota) + ' م.ب المتاحة';
  }catch{}
}

/* ---------- النصوص (114 سورة) ---------- */
function refreshTextLabel(){
  const btn = $('#offlineBtn'); if(!btn) return;
  btn.textContent = store.get('quranDownloaded', false)
    ? '✓ نصوص المصحف محفوظة (اضغط لإكمال/تحديث)'
    : '⬇️ تحميل نصوص المصحف كاملة';
}
async function downloadText(){
  if(textBusy) return;
  if(navigator.onLine === false){ toast('تحتاج اتصالاً لتحميل النصوص'); return; }
  textBusy = true;
  const btn = $('#offlineBtn'), wrap = $('#offlineProgress'), bar = $('#offlineBar'), pct = $('#offlinePct');
  if(wrap) wrap.style.display = 'block'; if(btn) btn.disabled = true;
  let done = 0, failed = 0; const total = SURAHS_META.length;
  try{
    const cache = await caches.open(TEXT_CACHE);
    for(const s of SURAHS_META){
      const url = RISAN_BASE + '/' + s.number + '.json';
      try{
        if(!(await cache.match(url))){ const r = await fetch(url, { cache:'no-store' }); if(r && r.ok) await cache.put(url, r.clone()); else failed++; }
      }catch{ failed++; }
      done++;
      const p = Math.round(done/total*100);
      if(bar) bar.style.width = p + '%';
      if(pct) pct.textContent = ar(done) + '/' + ar(total) + ' (' + ar(p) + '٪)';
    }
    if(failed === 0){ store.set('quranDownloaded', true); toast('تم حفظ نصوص المصحف — تعمل دون إنترنت ✅'); }
    else toast('تعذّر ' + ar(failed) + ' سورة — اضغط الزر لإكمالها');
  }catch{ toast('تعذّر التحميل — تحقّق من الإنترنت'); }
  finally{ textBusy = false; if(btn) btn.disabled = false; refreshTextLabel(); showStorage();
    setTimeout(() => { const w = $('#offlineProgress'); if(w) w.style.display = 'none'; }, 1600); }
}

/* ---------- التلاوة الصوتية الكاملة لقارئ مختار (6236 آية) ---------- */
function currentReciter(){ const s = $('#dlReciter'); return s ? s.value : 'ar.alafasy'; }
function reciterName(id){ const r = RECITERS.find(x => x.id === id); return r ? r.name : id; }
function refreshAudioLabel(){
  const btn = $('#dlAudioBtn'); if(!btn) return;
  if(audioBusy){ btn.textContent = '⏸ إيقاف مؤقت'; return; }
  const id = currentReciter();
  const doneN = store.get('audioProgress_' + id, 0);
  if(store.get('audioDone_' + id, false)) btn.textContent = '✓ محفوظة كاملة';
  else if(doneN > 0) btn.textContent = '▶ متابعة التحميل (' + ar(Math.round(doneN/TOTAL_AYAT*100)) + '٪)';
  else btn.textContent = '⬇️ تحميل التلاوة';
}
function updateAudioBtn(){ refreshAudioLabel(); const b = $('#dlAudioBtn'); if(b) b.classList.toggle('btn-primary', !audioBusy); }
function pauseAudio(){ audioPaused = true; toast('تم الإيقاف المؤقت — يمكنك المتابعة لاحقاً'); }

async function cacheOneAudio(cache, id, global){
  const first = AUDIO_BASE + '/128/' + id + '/' + global + '.mp3';
  if(await cache.match(first)) return true;
  for(const br of DL_BITRATES){
    const url = AUDIO_BASE + '/' + br + '/' + id + '/' + global + '.mp3';
    try{
      const res = await fetch(url, { mode:'cors' });
      if(res && res.ok){ await cache.put(first, res.clone()); return true; }
    }catch{}
  }
  try{ const res = await fetch(first, { mode:'no-cors' }); if(res){ await cache.put(first, res); return true; } }catch{}
  return false;
}

async function downloadAudio(){
  if(audioBusy) return;
  if(navigator.onLine === false){ toast('تحتاج اتصالاً لتحميل التلاوة'); return; }
  const id = currentReciter();
  const startN = store.get('audioProgress_' + id, 0);
  if(startN === 0){
    const ok = window.confirm('تحميل تلاوة «' + reciterName(id) + '» كاملة قد يبلغ حوالي ١ غيغابايت ويحتاج وقتاً واتصالاً جيداً.\nيمكنك إيقافه ومتابعته لاحقاً. هل تريد البدء؟');
    if(!ok) return;
  }
  audioBusy = true; audioPaused = false; updateAudioBtn();
  const wrap = $('#dlAudioProgress'), bar = $('#dlAudioBar'), pct = $('#dlAudioPct');
  if(wrap) wrap.style.display = 'block';
  let i = startN, failed = 0;
  try{
    const cache = await caches.open(AUDIO_CACHE);
    while(i < TOTAL_AYAT && !audioPaused){
      const batch = [];
      for(let j = 0; j < CONCURRENCY && i < TOTAL_AYAT; j++, i++){
        batch.push(cacheOneAudio(cache, id, i + 1).then(ok => { if(!ok) failed++; }));
      }
      await Promise.all(batch);
      store.set('audioProgress_' + id, i);
      const p = Math.round(i/TOTAL_AYAT*100);
      if(bar) bar.style.width = p + '%';
      if(pct) pct.textContent = ar(i) + '/' + ar(TOTAL_AYAT) + ' (' + ar(p) + '٪)';
      if(i % 120 === 0) showStorage();
    }
    if(i >= TOTAL_AYAT){ store.set('audioDone_' + id, true); toast('تم تحميل تلاوة «' + reciterName(id) + '» كاملة — تعمل دون إنترنت ✅'); }
  }catch(e){
    if(e && e.name === 'QuotaExceededError') toast('امتلأت مساحة التخزين — توقّف التحميل. احذف بيانات لإكمالها.');
    else toast('تعذّر تحميل جزء من التلاوة — اضغط للمتابعة');
  }finally{
    audioBusy = false; updateAudioBtn(); showStorage();
    setTimeout(() => { const w = $('#dlAudioProgress'); if(w && store.get('audioDone_' + id, false)) w.style.display = 'none'; }, 1800);
  }
}
