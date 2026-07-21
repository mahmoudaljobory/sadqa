/* ui/dedication.js — مستطيل الإهداء الذي يظهر مرة واحدة. */
import { $, store } from '../core.js';

export function initDedication(){
  const banner=$('#dedicationBanner'),backdrop=$('#dbBackdrop');
  function close(){banner.classList.remove('show');backdrop.classList.remove('show');store.set('dedicationSeen',true);}
  if(!store.get('dedicationSeen',false)){
    setTimeout(()=>{banner.classList.add('show');backdrop.classList.add('show');},700);
  }
  $('#dedicationClose').addEventListener('click',close);
  backdrop.addEventListener('click',close);
  // لا يحجب التنقّل: يُغلق تلقائياً عند لمس أي تبويب
  document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',close,{once:false}));
}
