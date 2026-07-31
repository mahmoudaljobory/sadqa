/* features/tasmee.js — التسميع الصوتي: تقرأ بصوتك فيتعرّف التطبيق على تلاوتك
   (تقنية التعرف على الكلام العربي في المتصفح) ويطابقها بالنص كلمةً كلمة:
   أخضر = صحيح، أحمر = فائتة، مع نسبة الدقّة وربط النتيجة بالمراجعة المتباعدة.
   ملاحظات: يتطلب إذن الميكروفون واتصالاً بالإنترنت، ويعمل بأفضل صورة في متصفح Chrome. */
import { $, $$, store, toast, ar } from '../core.js';
import { quranState } from '../state.js';
import { loadSurah } from './quran.js';
import { scheduleSRS } from './hifz.js';

const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
const BASMALA = ['بسم','الله','الرحمن','الرحيم'];
const vt = { active:false, listening:false, rec:null, words:[], normWords:[], ptr:0,
             ok:0, miss:0, extra:0, from:1, to:1, resIdx:0, basmalaIdx:0 };

/* تطبيع النص القرآني للمقارنة: إزالة التشكيل وعلامات الضبط وتوحيد الحروف */
function norm(w){
  return String(w)
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF\u0640\u06DF\u06E0]/g,'')
    .replace(/[\u0671أإآ]/g,'ا')
    .replace(/ى/g,'ي').replace(/ة/g,'ه')
    .replace(/ؤ/g,'و').replace(/ئ/g,'ي').replace(/ء/g,'')
    .replace(/[^\u0621-\u064A]/g,'');
}
/* تشابه تقريبي (ليفنشتاين) للتسامح مع فروق النطق/التعرّف */
function sim(a,b){
  if(a===b) return 1; if(!a.length||!b.length) return 0;
  const m=a.length,n=b.length,d=[];
  for(let i=0;i<=m;i++)d[i]=[i];
  for(let j=1;j<=n;j++)d[0][j]=j;
  for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)
    d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  return 1-d[m][n]/Math.max(m,n);
}

export function initTasmee(){
  const btn=$('#voiceTasmeeBtn'); if(!btn) return;
  btn.addEventListener('click', start);
  $('#tsStop')   && $('#tsStop').addEventListener('click', toggleMic);
  $('#tsGood')   && $('#tsGood').addEventListener('click', ()=>end(true));
  $('#tsAgain')  && $('#tsAgain').addEventListener('click', ()=>end(false));
  $('#tsExit')   && $('#tsExit').addEventListener('click', exit);
}

function rangeVals(){
  let f=+($('#rangeFrom')&&$('#rangeFrom').value)||1, t=+($('#rangeTo')&&$('#rangeTo').value)||f;
  if(t<f){const x=f;f=t;t=x;} return {from:f,to:t};
}

function start(){
  if(!SR){ toast('التعرف على الصوت غير مدعوم في متصفحك — استخدم Chrome'); return; }
  if(!quranState.current){ toast('حمّل سورة أولاً'); return; }
  if(navigator.onLine===false){ toast('التسميع الصوتي يحتاج اتصالاً بالإنترنت'); return; }
  const {from,to}=rangeVals();
  vt.active=true; vt.from=from; vt.to=to; vt.ptr=0; vt.ok=0; vt.miss=0; vt.extra=0; vt.resIdx=0; vt.basmalaIdx=0;
  vt.words=[]; vt.normWords=[];
  $$('#quranArea .aya').forEach(el=>{
    const n=+el.dataset.aya;
    if(n<from||n>to){ el.classList.add('hifz-dim'); return; }
    el.classList.add('hifz-on');
    const a=quranState.current.ayahs.find(x=>x.numberInSurah===n); if(!a) return;
    const parts=a.text.split(/\s+/).filter(Boolean);
    el.innerHTML=parts.map((w,i)=>`<span class="w hid" data-aya="${n}" data-i="${i}">${w}</span>`).join(' ')
      +`<span class="aya-num">${ar(n)}</span>`;
    $$('.w',el).forEach(w=>{ vt.words.push(w); vt.normWords.push(norm(w.textContent)); });
  });
  const bar=$('#tasmeeBar'); if(bar){ bar.style.display='block'; bar.scrollIntoView({block:'nearest',behavior:'smooth'}); }
  updateUI(); startMic();
  toast('🎤 ابدأ التلاوة بتأنٍّ — سيُضيء الصحيح أخضر');
}

function startMic(){
  try{
    const rec=new SR();
    rec.lang='ar-SA'; rec.continuous=true; rec.interimResults=true; rec.maxAlternatives=1;
    rec.onresult=onResult;
    rec.onerror=e=>{
      if(e.error==='not-allowed'||e.error==='service-not-allowed'){ toast('لم يُسمح بالميكروفون — فعّله من إعدادات المتصفح'); stopMic(); }
      else if(e.error==='network'){ toast('تعذّر الاتصال بخدمة التعرف — تحقّق من الإنترنت'); }
    };
    rec.onend=()=>{ if(vt.active&&vt.listening){ try{rec.start();}catch{} } };
    rec.start(); vt.rec=rec; vt.listening=true; updateUI();
  }catch{ toast('تعذّر تشغيل الميكروفون'); }
}
function stopMic(){ vt.listening=false; try{ vt.rec&&vt.rec.stop(); }catch{} updateUI(); }
function toggleMic(){ vt.listening?stopMic():startMic(); }

function onResult(ev){
  let finalTxt='', interim='';
  for(let i=vt.resIdx;i<ev.results.length;i++){
    const r=ev.results[i];
    if(r.isFinal){ finalTxt+=' '+r[0].transcript; vt.resIdx=i+1; }
    else interim+=' '+r[0].transcript;
  }
  const live=$('#tsLive'); if(live) live.textContent=(interim||finalTxt).trim().slice(-80)||'…';
  if(finalTxt.trim()) processSpoken(finalTxt);
  updateUI();
}

function processSpoken(text){
  const spoken=text.split(/\s+/).map(norm).filter(Boolean);
  for(const sw of spoken){
    if(vt.ptr>=vt.words.length) break;
    let matched=false;
    // ١) مطابقة تامة أولاً (حتى لا تُخلط البسملة بكلمات النص)
    for(let k=0;k<=2 && vt.ptr+k<vt.words.length;k++){
      if(sw===vt.normWords[vt.ptr+k]){
        for(let j=0;j<k;j++){ markMiss(vt.words[vt.ptr+j]); vt.miss++; }
        markOk(vt.words[vt.ptr+k]); vt.ok++; vt.ptr+=k+1; matched=true; break;
      }
    }
    // ٢) بسملة مقروءة قبل بداية المقطع → تُتجاهل
    if(!matched && vt.ptr===0 && vt.basmalaIdx<BASMALA.length
       && sim(sw,BASMALA[vt.basmalaIdx])>=0.8){ vt.basmalaIdx++; continue; }
    // ٣) مطابقة تقريبية (تسامح مع فروق النطق/التعرّف)
    if(!matched){
      for(let k=0;k<=2 && vt.ptr+k<vt.words.length;k++){
        if(sim(sw,vt.normWords[vt.ptr+k])>=0.6){
          for(let j=0;j<k;j++){ markMiss(vt.words[vt.ptr+j]); vt.miss++; }
          markOk(vt.words[vt.ptr+k]); vt.ok++; vt.ptr+=k+1; matched=true; break;
        }
      }
    }
    if(!matched){
      vt.extra++;
      const cur=vt.words[vt.ptr]; if(cur){ cur.classList.add('warn'); setTimeout(()=>cur.classList.remove('warn'),700); }
    }
  }
  if(vt.ptr>=vt.words.length){ stopMic(); toast('اكتمل التسميع — ما شاء الله!'); showFinish(); }
}
function markOk(w){ w.classList.remove('hid'); w.classList.add('ok'); }
function markMiss(w){ w.classList.remove('hid'); w.classList.add('miss'); }

function accuracy(){
  const attempted=vt.ok+vt.miss+vt.extra;
  if(!attempted) return 0;
  return Math.round(vt.ok/(vt.ok+vt.miss+vt.extra)*100);
}
function updateUI(){
  const st=$('#tsStatus'), sc=$('#tsScore'), stopB=$('#tsStop');
  if(st) st.innerHTML=(vt.listening?'<span class="mic-dot"></span> يستمع… رتّل بوضوح':'⏸ الميكروفون متوقف');
  if(sc) sc.textContent='صحيح: '+ar(vt.ok)+' · فائتة: '+ar(vt.miss)+' · دخيلة: '+ar(vt.extra)+' · الدقة: '+ar(accuracy())+'٪';
  if(stopB) stopB.textContent=vt.listening?'⏸ إيقاف الميكروفون':'🎤 متابعة الاستماع';
}
function showFinish(){
  // كشف ما لم يُقرأ كفائت
  for(let i=vt.ptr;i<vt.words.length;i++){ if(vt.words[i].classList.contains('hid')){ markMiss(vt.words[i]); vt.miss++; } }
  vt.ptr=vt.words.length; updateUI();
}
function end(mastered){
  if(!vt.active) return;
  stopMic(); showFinish();
  scheduleSRS(quranState.current.number, vt.from, vt.to, mastered, quranState.current.name);
  exit();
}
function exit(){
  vt.active=false; stopMic();
  const bar=$('#tasmeeBar'); if(bar) bar.style.display='none';
  if(quranState.current) loadSurah(quranState.current.number,null,false);
}
