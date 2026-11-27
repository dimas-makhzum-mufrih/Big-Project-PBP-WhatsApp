import re
from pal import T,block
names=list(T)+['goldenhour','pastelparty']
out=["""/* =====================================================================
   NGUMPUL - TEMA BERGAYA (palet + bentuk + hiasan + gerak)
   Dimuat otomatis oleh theme.js hanya saat tema bergaya dipakai.
   Tema: gameboy, terminal, synthwave, nebula, supernova, stardust,
         lavender, sunflower, lotus, goldenhour (+ gaya Pastel Party).
   Tingkat hiasan (atribut html[data-hiasan]): penuh | ringan | polos
   ===================================================================== */
"""]
for k,v in T.items():
    out.append("/* %s */\n"%k+block('html[data-theme="%s"]'%k,v))
# golden hour: dua palet mengikuti nada (terang / gelap); langit dihitung theme.js
gl=('light','#fff6e8','#fffdf8','#3a2410','#85684a','#f0dcc0','#e8892b','#c46f1b','#fde5c8','#9a4a08','#f8ead4','#2a1305','var(--gh-hdr, #f08a6a)','#2a1305','#ffe0b0','#fffdf8','#3a2410','#ffe9c8','#3a2410','')
gd=('dark','#130d22','#201535','#f6ebff','#c0a8d8','#3a2860','#ff9a5a','#e07a3a','#3a2438','#ffb07a','#2a1b45','#2a1005','var(--gh-hdr, #1a2250)','#ffffff','#7a3a5a','#201535','#f6ebff','#130d22','#0a0616','')
out.append("/* goldenhour */\n"+block('html[data-theme="goldenhour"][data-tone="light"]',gl)+block('html[data-theme="goldenhour"][data-tone="dark"]',gd))
s=open('gaya.in',encoding='utf-8').read()
def rep(m):
    pen=m.group(1)=='@'; n=m.group(2)
    return 'html[data-theme="%s"]%s'%(n,'[data-hiasan="penuh"]' if pen else ':not([data-hiasan="polos"])')
s=re.sub(r'\[(@?)(%s)\]'%'|'.join(names),rep,s)
out.append(s)
open('tema-gaya.css','w',encoding='utf-8').write('\n'.join(out))
# preview kartu (masuk tema-premium.css)
pv={'gameboy':'#9bbc0f|#306230|#0f380f|#0f380f','terminal':'#000|#0f4a1f|#1fa84a|#33ff66','synthwave':'linear-gradient(180deg,#140826,#5a1a6a)|#3a1a66|#2de2e6|#ff3cac',
'nebula':'linear-gradient(150deg,#08071a,#3a2f8f)|#2a2870|#6a5ad0|#9d7bff','supernova':'linear-gradient(150deg,#14060f,#a8216a 70%,#ff8a4a)|#5a1a48|#a8216a|#ff4fa8',
'stardust':'#07070c|#25252f|#3a3320|#e8c874','lavender':'#f6f2fc|#e3d9f4|#dccbff|#9b7fd6','sunflower':'#fff8e1|#f0e2a8|#fbe08a|#f5b800',
'lotus':'linear-gradient(180deg,#fff3f7,#cfe9d9)|#f6d6e3|#fbc9dc|#f08fb0','rainy':'linear-gradient(150deg,#0d1620,#34526d)|#223140|#4a6a85|#7fb6d9','ocean':'linear-gradient(180deg,#0a6f86,#021c28)|#0f4558|#1aa0a8|#3dd6d0','campfire':'linear-gradient(180deg,#0d0603,#6a2f10)|#3a2012|#6a2f10|#ff8a2a','goldenhour':'linear-gradient(160deg,#3b2a5e,#f08a6a 45%,#4aa8ec 75%,#0b1640)|#8a5a7a|#ffe0b0|#ffd27a'}
p=["\n\n/* ---------- Preview kartu tema bergaya ---------- */"]
for k,v in pv.items():
    bg,bd,ln,ac=v.split('|')
    p.append(".pv-%s { --pv-bg: %s; --pv-border: %s; --pv-line: %s; --pv-acc: %s; }"%(k,bg,bd,ln,ac))
open('pv.css','w').write('\n'.join(p)+'\n')
