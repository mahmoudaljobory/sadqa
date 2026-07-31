/* features/hifz.js — تبويب «الحفظ»: استوديو التحفيظ، الميزة الأساسية للتطبيق.
   منطقة نص مستقلة (#hifzArea) + لوحة إحصاءات + كل أدوات التحفيظ:
   ١) طريقة الكتّاب (المحو التدريجي ٣٠٪→٦٠٪→كامل) كما يُمحى اللوح في الكتاتيب.
   ٢) التسميع الذاتي: كشف كلمةً كلمة.
   ٣) المراجعة المتباعدة (١،٣،٧،١٤،٣٠ يوماً) مع لوحة «مراجعة اليوم».
   ويتكامل مع التكرار الصوتي والتسميع الصوتي ووضع إخفاء النص. */
import { $, $$, store, toast, ar } from '../core.js';
import { quranState } from '../state.js';
import { SURAHS_META } from '../data/surahs.js';
import { fetchSurahText } from './quran.js';

const LEVELS_DAYS = [1, 3, 7, 14, 30];
export const hifzState = { number: null, data: null };
const session = { active:false, mode:null, stage:0, words:[], hiddenOrder:[], revealPtr:0, from:1, to:1 };

/* ---------------- التهيئة وفتح التبويب ---------------- */
export function initHifz(){
  const sel = $('#hifzSurah');
  if(sel && !sel.options.length){
    sel.innerHTML = SURAHS_META.map(s=>`<option value="${s.number}">${ar(s.number)}. ${s.name}</option>`).join('');
    sel.addEventListener('change', ()=>loadHifz(+sel.value));
  }
  $('#hifzTalqinBtn') && $('#hifzTalqinBtn').addEventListener('click', ()=>startSession('talqin'));
  $('#hifzTasmeeBtn') && $('#hifzTasmeeBtn').addEventListener('click', ()=>startSession('tasmee'));
  $('#hsStage')  && $('#hsStage').addEventListener('click', nextStage);
  $('#hsReveal') && $('#hsReveal').addEventListener('click', revealNext);
  $('#hsGood')   && $('#hsGood').addEventListener('click', ()=>finish(true));
  $('#hsAgain')  && $('#hsAgain').addEventListener('click', ()=>finish(false));
  $('#hsExit')   && $('#hsExit').addEventListener('click', exitSession);
  $('#hideMode') && $('#hideMode').addEventListener('change', applyHideMode);
  $('#revealAllBtn') && $('#revealAllBtn').addEventListener('click', ()=>{ if($('#hideMode'))$('#hideMode').checked=false; applyHideMode(); });
  $('#markMemorizedBtn') && $('#markMemorizedBtn').addEventListener('click', toggleMemorized);
}

/* يُستدعى عند فتح تبويب الحفظ */
export async function openHifzTab(){
  renderStats(); renderReviewList();
  if(hifzState.data) return;
  const sel = $('#hifzSurah');
  const n = +(sel && sel.value) || store.get('lastSurah', 1) || 1;
  if(sel) sel.value = n;
  await loadHifz(n);
}

async function loadHifz(number){
  exitSessionSilent();
  const area = $('#hifzArea');
  if(area) area.innerHTML = '<div class="loader"><div class="spin"></div>جارٍ تحميل السورة…</div>';
  try{
    const data = await fetchSurahText(number);
    hifzState.number = number; hifzState.data = data;
    quranState.current = { ...data, number };           // ليعمل التكرار الصوتي على نفس السورة
    const rf=$('#rangeFrom'), rt=$('#rangeTo');
    if(rf){ rf.max=data.numberOfAyahs; rf.value=1; }
    if(rt){ rt.max=data.numberOfAyahs; rt.value=Math.min(7,data.numberOfAyahs); }
    renderHifzText();
  }catch{
    if(area) area.innerHTML='<div class="msg-err">تعذّر تحميل السورة — تحقّق من الإنترنت.<br><button class="btn btn-primary" style="margin-top:10px;" id="hifzRetry">إعادة المحاولة</button></div>';
    const r=$('#hifzRetry'); if(r) r.addEventListener('click', ()=>loadHifz(number));
  }
}

export function renderHifzText(){
  const area = $('#hifzArea'); if(!area || !hifzState.data) return;
  const d = hifzState.data, n = hifzState.number;
  const showBism = n!==1 && n!==9;
  let html='';
  d.ayahs.forEach(a=>{
    let txt=a.text;
    if(showBism && a.numberInSurah===1) txt=txt.replace(/^بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\s*/,'').replace(/^بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ\s*/,'');
    html+=`<span class="aya" data-aya="${a.numberInSurah}" data-global="${a.number}">${txt}<span class="aya-num">${ar(a.numberInSurah)}</span></span> `;
  });
  area.innerHTML=`
    <div class="surah-head"><p class="name">${d.name}</p><p class="meta">${d.revelationType==='Meccan'?'مكيّة':'مدنيّة'} · عدد الآيات ${ar(d.numberOfAyahs)}${memorized().includes(n)?' · ✓ محفوظة':''}</p>${showBism?'<p class="bism">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>':''}</div>
    <div class="ayat-wrap"><div class="ayat-flow">${html}</div></div>`;
  // إخفاء النص البسيط: لمس الآية يكشفها
  $$('#hifzArea .aya').forEach(el=>el.addEventListener('click',()=>{ if(el.classList.contains('hidden-text')) el.classList.toggle('revealed'); }));
  applyHideMode();
}

function applyHideMode(){
  const on = $('#hideMode') && $('#hideMode').checked;
  $$('#hifzArea .aya').forEach(el=>{ el.classList.toggle('hidden-text', !!on); el.classList.remove('revealed'); });
}

function memorized(){ return store.get('memorized', []); }
function toggleMemorized(){
  if(!hifzState.number) return;
  const n=hifzState.number, list=memorized();
  if(list.includes(n)){ store.set('memorized', list.filter(x=>x!==n)); toast('أُزيلت من قائمة المحفوظ'); }
  else { list.push(n); store.set('memorized', list); toast('بارك الله فيك — سُجّلت كمحفوظة ✓'); }
  renderHifzText(); renderStats();
}

/* ---------------- لوحة الإحصاءات ---------------- */
export function renderStats(){
  const box=$('#hifzStats'); if(!box) return;
  const mem=memorized().length;
  const map=store.get('srs',{}); const total=Object.keys(map).length;
  const due=Object.values(map).filter(x=>x.due<=Date.now()).length;
  box.innerHTML=`
    <div class="stat-card"><div class="st-num">${ar(mem)}</div><div class="st-lbl">سورة محفوظة</div></div>
    <div class="stat-card"><div class="st-num">${ar(total)}</div><div class="st-lbl">مقطع قيد التثبيت</div></div>
    <div class="stat-card ${due?'st-due':''}"><div class="st-num">${ar(due)}</div><div class="st-lbl">مراجعة اليوم</div></div>`;
}

/* ---------------- جلسات المحفّظ ---------------- */
function rangeVals(){
  let f=+($('#rangeFrom')&&$('#rangeFrom').value)||1, t=+($('#rangeTo')&&$('#rangeTo').value)||f;
  if(t<f){const x=f;f=t;t=x;} return {from:f,to:t};
}
function startSession(mode){
  if(!hifzState.data){ toast('حمّل سورة أولاً'); return; }
  const {from,to}=rangeVals();
  session.active=true; session.mode=mode; session.stage=0;
  session.from=from; session.to=to;
  session.words=[]; session.hiddenOrder=[]; session.revealPtr=0;
  $$('#hifzArea .aya').forEach(el=>{
    el.classList.remove('hidden-text','revealed');
    const n=+el.dataset.aya;
    if(n<from||n>to){ el.classList.add('hifz-dim'); return; }
    el.classList.add('hifz-on');
    const a=hifzState.data.ayahs.find(x=>x.numberInSurah===n); if(!a) return;
    const parts=a.text.split(/\s+/).filter(Boolean);
    el.innerHTML=parts.map((w,i)=>`<span class="w" data-aya="${n}" data-i="${i}">${w}</span>`).join(' ')
      +`<span class="aya-num">${ar(n)}</span>`;
    $$('.w',el).forEach(w=>{
      session.words.push(w);
      w.addEventListener('click',ev=>{ev.stopPropagation();if(w.classList.contains('hid'))w.classList.toggle('peek');});
    });
  });
  if(mode==='tasmee'){ hideFraction(1); buildRevealOrder(); }
  updateBar();
  const bar=$('#hifzSessionBar'); if(bar){ bar.style.display='block'; bar.scrollIntoView({block:'nearest',behavior:'smooth'}); }
  toast(mode==='talqin'?'طريقة الكتّاب: اقرأ ثم امحُ تدريجياً 🎯':'التسميع: استرجع ثم اكشف كلمةً كلمة 🎯');
}
const STAGES=[0,0.3,0.6,1];
function hideFraction(frac){
  session.words.forEach(w=>w.classList.remove('hid','peek'));
  if(frac<=0)return;
  const idx=session.words.map((_,i)=>i);
  for(let i=idx.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const t=idx[i];idx[i]=idx[j];idx[j]=t;}
  idx.slice(0,Math.round(session.words.length*frac)).forEach(i=>session.words[i].classList.add('hid'));
}
function nextStage(){
  if(!session.active||session.mode!=='talqin')return;
  session.stage=Math.min(session.stage+1,STAGES.length-1);
  hideFraction(STAGES[session.stage]);
  if(session.stage===STAGES.length-1)buildRevealOrder();
  updateBar();
}
function buildRevealOrder(){
  session.hiddenOrder=session.words.filter(w=>w.classList.contains('hid'));
  session.hiddenOrder.sort((a,b)=>{const d=(+a.dataset.aya)-(+b.dataset.aya);return d!==0?d:((+a.dataset.i)-(+b.dataset.i));});
  session.revealPtr=0;
}
function revealNext(){
  if(!session.active)return;
  const w=session.hiddenOrder[session.revealPtr];
  if(!w){toast('اكتمل الكشف — بارك الله في حفظك');return;}
  w.classList.remove('hid','peek'); session.revealPtr++; updateBar();
}
function updateBar(){
  const st=$('#hsInfo'); if(!st)return;
  if(session.mode==='talqin'){
    st.textContent='طريقة الكتّاب — المحو: '+ar(Math.round(STAGES[session.stage]*100))+'٪ (آيات '+ar(session.from)+'–'+ar(session.to)+')';
    $('#hsStage').style.display=session.stage<STAGES.length-1?'':'none';
    $('#hsReveal').style.display=session.stage===STAGES.length-1?'':'none';
  }else{
    const left=session.hiddenOrder.length-session.revealPtr;
    st.textContent='التسميع الذاتي — كلمات متبقية: '+ar(Math.max(left,0))+' (آيات '+ar(session.from)+'–'+ar(session.to)+')';
    $('#hsStage').style.display='none'; $('#hsReveal').style.display='';
  }
}

/* ---------------- المراجعة المتباعدة ---------------- */
export function scheduleSRS(surah, from, to, mastered, name){
  const map=store.get('srs',{});
  const key=surah+':'+from+'-'+to;
  const item=map[key]||{surah,from,to,level:-1};
  if(mastered){item.level=Math.min((item.level??-1)+1,LEVELS_DAYS.length-1);}
  else{item.level=0;}
  item.due=Date.now()+LEVELS_DAYS[item.level]*86400000;
  item.name=name;
  map[key]=item; store.set('srs',map);
  toast(mastered
    ?'ما شاء الله! المراجعة القادمة بعد '+ar(LEVELS_DAYS[item.level])+(LEVELS_DAYS[item.level]===1?' يوم':' أيام')+' 🌿'
    :'لا بأس — أعد غداً، فالتكرار يثبّت الحفظ');
  renderReviewList(); renderStats();
}
function finish(mastered){
  if(!session.active)return;
  scheduleSRS(hifzState.number, session.from, session.to, mastered, hifzState.data.name);
  exitSession();
}
function exitSessionSilent(){
  session.active=false;
  const bar=$('#hifzSessionBar'); if(bar)bar.style.display='none';
}
function exitSession(){
  exitSessionSilent();
  renderHifzText(); renderReviewList(); renderStats();
}

/* ---------------- لوحة «مراجعة اليوم» ---------------- */
export function renderReviewList(){
  const box=$('#reviewList'); if(!box)return;
  const map=store.get('srs',{});
  const due=Object.values(map).filter(x=>x.due<=Date.now()).sort((a,b)=>a.due-b.due);
  if(!due.length){
    const total=Object.keys(map).length;
    box.innerHTML=total
      ?'<div class="review-empty">✓ لا مراجعات مستحقة اليوم — استمر في حفظ الجديد</div>'
      :'<div class="review-empty">بعد إتقان مقطع تُجدول مراجعته هنا تلقائياً (١، ٣، ٧، ١٤، ٣٠ يوماً)</div>';
    return;
  }
  box.innerHTML='<div class="review-head">🔁 مراجعة اليوم ('+ar(due.length)+')</div>'+
    due.map(x=>`<button class="review-item" data-s="${x.surah}" data-f="${x.from}" data-t="${x.to}">
      ${x.name||('سورة '+ar(x.surah))} · الآيات ${ar(x.from)}–${ar(x.to)}</button>`).join('');
  $$('#reviewList .review-item').forEach(b=>b.addEventListener('click',async()=>{
    const s=+b.dataset.s;
    const sel=$('#hifzSurah'); if(sel)sel.value=s;
    await loadHifz(s);
    if($('#rangeFrom'))$('#rangeFrom').value=b.dataset.f;
    if($('#rangeTo'))$('#rangeTo').value=b.dataset.t;
    startSession('tasmee');
  }));
}
