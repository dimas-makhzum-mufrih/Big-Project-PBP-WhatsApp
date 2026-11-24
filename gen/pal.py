# id: (tone, bg,kotak,teks,abu,garis,acc,hover,tipis,aksenTeks,input,onAcc,hdrBg,hdrTeks,bubK,bubT,teksBub,chat,notif,extra)
T={
'gameboy':('light','#9bbc0f','#a9c42a','#0f380f','#306230','#306230','#306230','#0f380f','#8bac0f','#0f380f','#8bac0f','#9bbc0f','#0f380f','#9bbc0f','#b3cf3c','#c8dc5a','#0f380f','#8bac0f','#0f380f',''),
'terminal':('dark','#000000','#050a05','#33ff66','#1fa84a','#0f4a1f','#33ff66','#22cc50','#07200f','#33ff66','#0a140a','#001a07','#031a0a','#33ff66','#06240f','#050a05','#33ff66','#000000','#000000',''),
'synthwave':('dark','#140826','#1f0f3a','#f6e8ff','#b79ad9','#3a1a66','#ff3cac','#d92b91','#3a1550','#ff7bd0','#2a1450','#1a0630','#ff3cac','#ffffff','#5a1a8a','#1f0f3a','#f6e8ff','#140826','#0a0316','--grad-header:linear-gradient(110deg,#ff3cac 0%,#ff7a3c 60%,#ffd23c 100%);'),
'nebula':('dark','#0b0a1f','#15133a','#ece9ff','#a6a2dd','#2a2870','#9d7bff','#7d5be0','#221f58','#b9a2ff','#1c1a4a','#0a0820','#9d7bff','#0a0820','#3a2f8f','#15133a','#ece9ff','#08071a','#05040f','--grad-header:linear-gradient(110deg,#7d5be0 0%,#9d7bff 55%,#6fb0ff 100%);'),
'supernova':('dark','#14060f','#2a0c22','#ffeaf6','#e0a1c6','#5a1a48','#ff4fa8','#e0338d','#4a1038','#ff8cc8','#38112d','#2a0620','#ff4fa8','#2a0620','#a8216a','#2a0c22','#ffeaf6','#0e040a','#080206','--grad-header:linear-gradient(110deg,#ff4fa8 0%,#ff8a4a 100%);'),
'stardust':('dark','#07070c','#12121a','#f4f1e6','#aaa79a','#25252f','#e8c874','#c9a84a','#2a2512','#f0d68a','#1a1a24','#1a1405','#e8c874','#1a1405','#3a3320','#12121a','#f4f1e6','#05050a','#030306','--grad-header:linear-gradient(110deg,#c9a84a 0%,#f0d68a 55%,#d9dbe4 100%);'),
'lavender':('light','#f6f2fc','#fdfbff','#33284a','#6f6390','#e3d9f4','#9b7fd6','#7f62c0','#ebe2fa','#6b46b8','#eee7f9','#1f1236','#9b7fd6','#1f1236','#dccdf7','#fdfbff','#33284a','#efe8fa','#33284a',''),
'sunflower':('light','#fff8e1','#fffdf4','#3a2f0a','#7a6a2a','#f0e2a8','#f5b800','#d99f00','#fdeeb0','#8a6200','#fbefc0','#2a1f00','#f5b800','#2a1f00','#fbe08a','#fffdf4','#3a2f0a','#fdf1c2','#3a2f0a',''),
'lotus':('light','#fff3f7','#fffafc','#4a1f33','#8f5f78','#f6d6e3','#f08fb0','#dc6f96','#fde0ea','#b02e63','#fbe4ec','#3a0f22','#f08fb0','#3a0f22','#fbc9dc','#fffafc','#4a1f33','#e3f3ea','#4a1f33',''),
'rainy':('dark','#0b1118','#141d27','#e6eef5','#93a8ba','#223140','#7fb6d9','#5f9cc4','#18283a','#9fcbe8','#1b2937','#07131d','#1c2d3d','#e6eef5','#274760','#141d27','#e6eef5','#0b1118','#05090d','--grad-header:linear-gradient(110deg,#1c2d3d,#34526d);'),
'ocean':('dark','#031a24','#072a38','#dff8fb','#7fbac4','#0f4558','#3dd6d0','#25b3ae','#0a3a4a','#6fe8e2','#0b3344','#02222c','#0a5a6e','#dff8fb','#0e6a80','#072a38','#dff8fb','#031a24','#010f15','--grad-header:linear-gradient(110deg,#0a5a6e,#1aa0a8);'),
'campfire':('dark','#120a06','#201109','#ffeedd','#c9a283','#3a2012','#ff8a2a','#e06d12','#331a0c','#ffa24d','#2a160b','#1a0b02','#7a2e0c','#ffeedd','#6a2f10','#201109','#ffeedd','#0d0603','#080301','--grad-header:linear-gradient(110deg,#7a2e0c,#c9531a 60%,#ff8a2a);'),
}
def block(sel,v,extra_dark=False):
    (tone,bg,k,t,ab,g,acc,h,tp,at,inp,on,hb,ht,bk,bt,tb,ch,nt,ex)=v
    d=f"""{sel} {{
    --bg:{bg}; --kotak:{k}; --teks:{t}; --abu:{ab}; --garis:{g};
    --hijau:{acc}; --hijau-tua:{h}; --warna-utama:{acc}; --warna-utama-hover:{h}; --warna-tipis:{tp}; --aksen-teks:{at};
    --bg-putih:{k}; --bg-abu-terang:{bg}; --bg-abu-input:{inp};
    --teks-gelap:{t}; --teks-redup:{ab}; --teks-di-utama:{on}; --teks-kontras:{on}; --teks-header:{ht}; --header-bg:{hb};
    --bub-kirim:{bk}; --bub-terima:{bt}; --teks-bubble:{tb};
    --border-warna:{g}; --bg-chat:{ch}; --notif-bg:{nt};
"""
    if tone=='dark':
        d+="    --merah:#ff7b6b; --merah-tipis:#3a2528; --bg-hover-merah:#3a2528; --overlay:rgba(0,0,0,.7);\n    --bayangan-dropdown:0 8px 24px rgba(0,0,0,.38); --bg-hover-header:rgba(255,255,255,.12);\n"
    else:
        d+=f"    --overlay:rgba(40,30,50,.5);\n"
    if ex: d+="    "+ex+"\n"
    return d+"}\n"
EOF=0
