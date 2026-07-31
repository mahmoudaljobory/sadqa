/* ui/fontsize.js — وضوح خط المصحف: تحكّم بالحجم واختيار الخط، بحفظ التفضيل.
   يعمل عبر متغيّرات CSS فلا يحتاج إعادة تطبيق عند إعادة عرض السورة. */
import { $, store, toast } from '../core.js';

const SIZES = [1.5, 1.7, 1.85, 2.05, 2.3, 2.6, 2.9];   // rem
const FONTS = {
  amiri: "'Amiri Quran','Scheherazade New','Amiri','Traditional Arabic',serif",
  clear: "'Scheherazade New','Amiri Quran','Amiri','Traditional Arabic',serif"
};

function apply(){
  const i = store.get('quranSizeIdx', 2);
  const f = store.get('quranFont', 'amiri');
  document.documentElement.style.setProperty('--quran-fs', SIZES[i] + 'rem');
  document.documentElement.style.setProperty('--quran-lh', (SIZES[i] * 1.5 + 0.55) + 'rem');
  document.documentElement.style.setProperty('--quran-font', FONTS[f] || FONTS.amiri);
  const lbl = $('#fontSizeLbl'); if(lbl) lbl.textContent = ['أصغر','صغير','متوسط','كبير','أكبر','ضخم','أضخم'][i];
}

export function initFontSize(){
  apply();
  const minus = $('#fontMinus'), plus = $('#fontPlus'), sel = $('#quranFontSel');
  if(minus) minus.addEventListener('click', () => {
    const i = store.get('quranSizeIdx', 2); if(i > 0){ store.set('quranSizeIdx', i - 1); apply(); }
  });
  if(plus) plus.addEventListener('click', () => {
    const i = store.get('quranSizeIdx', 2); if(i < SIZES.length - 1){ store.set('quranSizeIdx', i + 1); apply(); }
  });
  if(sel){ sel.value = store.get('quranFont', 'amiri');
    sel.addEventListener('change', () => { store.set('quranFont', sel.value); apply(); toast('تم تغيير خط المصحف'); });
  }
}
