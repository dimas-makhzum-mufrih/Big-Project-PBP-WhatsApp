import re,sys
M=[('.active-chat-room','.ruang-channel'),('.active-chat-header','.ruang-header'),('.active-chat-footer','.ruang-composer'),
   ('.messages-container','.ruang-messages'),('.message-row','.grup-pesan-baris'),('.chat-input-field','.ruang-composer textarea'),
   ('.send-action-btn','.ruang-composer .ruang-send'),('.btn-mic','.ruang-composer .ruang-send')]
M2=[('.active-chat-room','.ruang-call')]
def strip(c): return re.sub(r'/\*.*?\*/','',c,flags=re.S)
def blocks(c):
    i=0;n=len(c);out=[]
    while i<n:
        j=c.find('{',i)
        if j<0:break
        pre=c[i:j].strip();d=1;k=j+1
        while k<n and d:
            if c[k]=='{':d+=1
            elif c[k]=='}':d-=1
            k+=1
        out.append((pre,c[j+1:k-1]));i=k
    return out
def varian(sel,M=M):
    r=[]
    for s in [x.strip() for x in re.split(r',(?![^()]*\))',sel)]:
        if any(a in s for a,_ in M):
            t=s
            for a,b in M:t=re.sub(re.escape(a)+r'(?![\w-])',b,t)
            if t!=s:r.append(t)
    return r
def proses(c,M=M):
    out=[]
    for pre,body in blocks(c):
        if pre.startswith('@keyframes') or pre.startswith('@font'):continue
        if pre.startswith('@'):
            inner=proses(body,M)
            if inner.strip():out.append(pre+'{\n'+inner+'}\n')
            continue
        v=varian(pre,M)
        if v:out.append(',\n'.join(v)+'{'+body+'}\n')
    return ''.join(out)
src=''.join(strip(open(f,encoding='utf-8').read()) for f in sys.argv[2:])
open(sys.argv[1],'w',encoding='utf-8').write('/* Hasil otomatis: gaya tema untuk ruang grup/server dan layar panggilan (alias dari chat pribadi). Jangan diedit, ubah tema-gaya.css/themes.css lalu buat ulang. */\n'+proses(src)+'\n/* layar panggilan: latar & hiasan sama dengan ruang */\n'+proses(src,M2))
