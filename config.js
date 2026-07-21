/* config.js — الإعدادات المركزية: عناوين الخدمات وثوابت التطبيق.
   أي تغيير لمصدر بيانات أو اسم أو مفتاح إحصاء يتم من هنا فقط. */
export const APP_NAME   = 'الباقيات الصالحات';
export const API        = 'https://api.alquran.cloud/v1';                         // نص/بحث القرآن (بديل)
export const RISAN_BASE = 'https://cdn.jsdelivr.net/gh/risan/quran-json@main/dist/chapters'; // نص القرآن (أساسي)
export const AUDIO_BASE = 'https://cdn.islamic.network/quran/audio';             // التلاوة الصوتية
export const BITRATES    = [128,64,48,40,32];
export const TAFSIR_BASE = 'https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir';
export const ALADHAN     = 'https://api.aladhan.com/v1';                          // أوقات الصلاة
/* الإحصاءات (اختياري): ضع رمز goatcounter.com هنا لتفعيل عدّاد المشاهدات والتثبيت */
export const GOATCOUNTER = 'https://sadaqah-shaker.goatcounter.com/count';
