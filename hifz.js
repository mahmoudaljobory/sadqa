/* features/hifz.js — «المحفّظ الذكي»: منظومة تحفيظ مبتكرة بثلاث ركائز:
   ١) طريقة الكتّاب (المحو التدريجي): تُمحى كلمات الآيات تدريجياً (٣٠٪ ثم ٦٠٪ ثم ١٠٠٪)
      كما كان يُمحى اللوح في الكتاتيب، ولمس أي كلمة ممحوّة يكشفها مؤقتاً.
   ٢) التسميع الذاتي: تُخفى الآيات كاملة وتُكشف كلمةً كلمة للتثبّت من الحفظ.
   ٣) المراجعة المتباعدة (SRS): جدولة علمية للمراجعة (١، ٣، ٧، ١٤، ٣٠ يوماً)
      مع لوحة «مراجعة اليوم» التي تعرض ما حان وقته. */
import { $, $$, store, toast, ar } from '../core.js';
import { quranState } from '../state.js';
import { loadSurah } from './quran.js';

const LEVELS_DAYS = [1, 3, 7, 14, 30];
const session = { active:false, mode:null, stage:0, words:[], hiddenOrder:[], revealPtr:0, from:1, to:1 };

export function initHifz(){
  $('#hifzTalqinBtn') && $('#hifzTalqinBtn').addEventListener('click', () => startSession('talqin'));
  $('#hifzTasmeeBtn') && $('#hifzTasmeeBtn').addEventListener('click', () => startSession('tasmee'));
  $('#hsStage')  && $('#hsStage').addEventListener('click', nextStage);
  $('#hsReveal') && $('#hsReveal').addEventListener('click', revealNext);
  $('#hsGood')   && $('#hsGood').addEventListener('click', () => finish(true));
  $('#hsAgain')  && $('#hsAgain').addEventListener('click', () => finish(false));
  $('#hsExit')   && $('#hsExit').addEventListener('click', exitSession);
  renderReviewList();
}

/* ---------- بدء الجلسة: لفّ كلمات الآيات في المدى ---------- */
function rangeVals(){
  let from = +($('#rangeFrom') && $('#rangeFrom').value) || 1;
  let to   = +($('#rangeTo') && $('#rangeTo').value) || from;
  if(to < from){ const t = from; from = to; to = t; }
  return { from, to };
}
function startSession(mode){
  if(!quranState.current){ toast('حمّل سورة أولاً'); return; }
  const { from, to } = rangeVals();
  session.active = true; session.mode = mode; session.stage = 0;
  session.from = from; session.to = to;
  session.words = []; session.hiddenOrder = []; session.revealPtr = 0;

  $$('#quranArea .aya').forEach(el => {
    const n = +el.dataset.aya;
    if(n < from || n > to){ el.classList.add('hifz-dim'); return; }
    el.classList.add('hifz-on');
    const a = quranState.current.ayahs.find(x => x.numberInSurah === n);
    if(!a) return;
    const parts = a.text.split(/\s+/).filter(Boolean);
    const wordsHtml = parts.map((w, i) =>
      `<span class="w" data-aya="${n}" data-i="${i}">${w}</span>`).join(' ');
    el.innerHTML = wordsHtml + `<span class="aya-num">${ar(n)}</span>`;
    $$('.w', el).forEach(w => {
      session.words.push(w);
      w.addEventListener('click', ev => { ev.stopPropagation(); if(w.classList.contains('hid')) w.classList.toggle('peek'); });
    });
  });

  if(mode === 'tasmee'){ hideFraction(1); shuffleRevealOrder(); }
  updateBar();
  const bar = $('#hifzSessionBar'); if(bar){ bar.style.display = 'block'; bar.scrollIntoView({ block:'nearest', behavior:'smooth' }); }
  toast(mode === 'talqin' ? 'طريقة الكتّاب: اقرأ ثم امحُ تدريجياً 🎯' : 'التسميع: استرجع ثم اكشف كلمةً كلمة 🎯');
}

/* ---------- طريقة الكتّاب: محوٌ تدريجي ---------- */
const STAGES = [0, 0.3, 0.6, 1];
function hideFraction(frac){
  const words = session.words;
  words.forEach(w => { w.classList.remove('hid','peek'); });
  if(frac <= 0) return;
  const idx = words.map((_, i) => i);
  for(let i = idx.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
  const count = Math.round(words.length * frac);
  idx.slice(0, count).forEach(i => words[i].classList.add('hid'));
}
function nextStage(){
  if(!session.active || session.mode !== 'talqin') return;
  session.stage = Math.min(session.stage + 1, STAGES.length - 1);
  hideFraction(STAGES[session.stage]);
  if(session.stage === STAGES.length - 1){ shuffleRevealOrder(); }
  updateBar();
}

/* ---------- التسميع: كشف كلمة كلمة بالترتيب ---------- */
function shuffleRevealOrder(){
  session.hiddenOrder = session.words.filter(w => w.classList.contains('hid'));
  session.hiddenOrder.sort((a, b) => {
    const d = (+a.dataset.aya) - (+b.dataset.aya);
    return d !== 0 ? d : ((+a.dataset.i) - (+b.dataset.i));
  });
  session.revealPtr = 0;
}
function revealNext(){
  if(!session.active) return;
  const w = session.hiddenOrder[session.revealPtr];
  if(!w){ toast('اكتمل الكشف — بارك الله في حفظك'); return; }
  w.classList.remove('hid','peek');
  session.revealPtr++;
  updateBar();
}

function updateBar(){
  const st = $('#hsInfo'); if(!st) return;
  if(session.mode === 'talqin'){
    const pct = Math.round(STAGES[session.stage] * 100);
    st.textContent = 'طريقة الكتّاب — المحو: ' + ar(pct) + '٪ (آيات ' + ar(session.from) + '–' + ar(session.to) + ')';
    $('#hsStage').style.display = session.stage < STAGES.length - 1 ? '' : 'none';
    $('#hsReveal').style.display = session.stage === STAGES.length - 1 ? '' : 'none';
  } else {
    const left = session.hiddenOrder.length - session.revealPtr;
    st.textContent = 'التسميع الذاتي — كلمات متبقية: ' + ar(Math.max(left, 0)) + ' (آيات ' + ar(session.from) + '–' + ar(session.to) + ')';
    $('#hsStage').style.display = 'none';
    $('#hsReveal').style.display = '';
  }
}

/* ---------- الإنهاء + المراجعة المتباعدة ---------- */
export function scheduleSRS(surah, from, to, mastered, name){
  const map = store.get('srs', {});
  const key = surah + ':' + from + '-' + to;
  const item = map[key] || { surah, from, to, level: -1 };
  if(mastered){ item.level = Math.min((item.level ?? -1) + 1, LEVELS_DAYS.length - 1); }
  else { item.level = 0; }
  item.due = Date.now() + LEVELS_DAYS[item.level] * 86400000;
  item.name = name;
  map[key] = item; store.set('srs', map);
  toast(mastered
    ? 'ما شاء الله! المراجعة القادمة بعد ' + ar(LEVELS_DAYS[item.level]) + (LEVELS_DAYS[item.level] === 1 ? ' يوم' : ' أيام') + ' 🌿'
    : 'لا بأس — أعد غداً، فالتكرار يثبّت الحفظ');
  renderReviewList();
}
function finish(mastered){
  if(!session.active) return;
  scheduleSRS(quranState.current.number, session.from, session.to, mastered, quranState.current.name);
  exitSession();
}
function exitSession(){
  session.active = false;
  const bar = $('#hifzSessionBar'); if(bar) bar.style.display = 'none';
  if(quranState.current) loadSurah(quranState.current.number, null, false);
  renderReviewList();
}

/* ---------- لوحة «مراجعة اليوم» ---------- */
export function renderReviewList(){
  const box = $('#reviewList'); if(!box) return;
  const map = store.get('srs', {});
  const now = Date.now();
  const due = Object.values(map).filter(x => x.due <= now)
    .sort((a, b) => a.due - b.due);
  if(!due.length){
    const total = Object.keys(map).length;
    box.innerHTML = total
      ? '<div class="review-empty">✓ لا مراجعات مستحقة اليوم — استمر في حفظ الجديد</div>'
      : '<div class="review-empty">بعد إتقان مقطع بالمحفّظ الذكي تُجدول مراجعته هنا تلقائياً</div>';
    return;
  }
  box.innerHTML = '<div class="review-head">🔁 مراجعة اليوم (' + ar(due.length) + ')</div>' +
    due.map(x => `<button class="review-item" data-s="${x.surah}" data-f="${x.from}" data-t="${x.to}">
      ${x.name || ('سورة ' + ar(x.surah))} · الآيات ${ar(x.from)}–${ar(x.to)}</button>`).join('');
  $$('#reviewList .review-item').forEach(b => b.addEventListener('click', async () => {
    const s = +b.dataset.s;
    const sel = $('#surahSelect'); if(sel) sel.value = s;
    await loadSurah(s, null, false);
    if($('#rangeFrom')) $('#rangeFrom').value = b.dataset.f;
    if($('#rangeTo')) $('#rangeTo').value = b.dataset.t;
    const panel = $('#hifzPanel'); if(panel && !panel.classList.contains('open')) panel.classList.add('open');
    startSession('tasmee');
  }));
}
