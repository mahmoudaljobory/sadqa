#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build.py — يحوّل المعمارية المعيارية (src/js + src/styles) إلى ملف index.html
واحد مكتفٍ بذاته يعمل في كل المتصفحات (بما فيها متصفحات واتساب/تيليجرام المصغّرة).
البنية المنظّمة تبقى في src/ للتطوير؛ وهذا السكربت يولّد ملف النشر.
تشغيله:  python3 build.py
"""
import re, os, shutil, pathlib

HERE = pathlib.Path(__file__).resolve().parent          # src/
ROOT = HERE.parent                                       # جذر المشروع (مجلد النشر)

# ترتيب الوحدات حسب الاعتماديات (config/core أولاً ... ثم main أخيراً)
ORDER = [
    'config.js','core.js','state.js',
    'data/surahs.js','data/reciters.js','data/content.js',
    'features/player.js','features/tafsir.js','features/quran.js','features/prayer.js',
    'features/adhkar.js','features/tasbih.js','features/share.js','features/install.js',
    'ui/theme.js','ui/nav.js','ui/dedication.js',
    'main.js',
]

def strip_module(src):
    out = []
    for line in src.split('\n'):
        s = line.strip()
        if s.startswith('import '):                      # إزالة الاستيرادات
            continue
        if re.match(r'^export\s*\{[^}]*\}\s*;?\s*$', s):  # إزالة سطور التصدير
            continue
        # إزالة كلمة export من التعريفات
        line = re.sub(r'^(\s*)export\s+(?=(const|let|var|function|async|class)\b)', r'\1', line)
        out.append(line)
    return '\n'.join(out)

# 1) تجميع وحدات JS في ملف كلاسيكي واحد داخل IIFE
parts = []
for rel in ORDER:
    code = (HERE/'js'/rel).read_text(encoding='utf-8')
    parts.append('/* ===== ' + rel + ' ===== */\n' + strip_module(code).strip())
bundle = "(function(){\n'use strict';\n\n" + "\n\n".join(parts) + "\n\n})();\n"

# 2) دمج الأنماط
css = (HERE/'styles'/'tokens.css').read_text(encoding='utf-8') + '\n' \
    + (HERE/'styles'/'main.css').read_text(encoding='utf-8')

# 3) بناء index.html المكتفي بذاته من نسخة src
html = (HERE/'index.html').read_text(encoding='utf-8')
html = html.replace(
    '<link rel="stylesheet" href="styles/tokens.css" />\n<link rel="stylesheet" href="styles/main.css" />',
    '<style>\n' + css + '\n</style>')
html = html.replace(
    '<script type="module" src="js/main.js"></script>',
    '<script>\n' + bundle + '</script>')

(ROOT/'index.html').write_text(html, encoding='utf-8')
print('✔ تم توليد index.html المكتفي بذاته (' + str(len(html)//1024) + ' كيلوبايت)')

# 4) عامل خدمة مبسّط يخزّن الملف الواحد + الأصول
sw = '''/* عامل الخدمة — تثبيت (PWA) وتخزين مؤقت للملف الواحد */
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
'''
(ROOT/'sw.js').write_text(sw, encoding='utf-8')
print('✔ تم توليد sw.js (v10)')
print('اكتمل البناء. ارفع محتويات جذر المشروع إلى GitHub/Netlify.')
