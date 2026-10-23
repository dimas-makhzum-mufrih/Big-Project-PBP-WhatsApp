/* ------------------------------------------------------------
   1. BADGE UNREAD
   Pasang: tepat di atas `const cn=(s,v)=>...`
   ------------------------------------------------------------ */
// jumlah unread grup = total angka di semua channel teks
const bd = s => s.cats.reduce(
  (a, c) => a + c.ch.reduce((b, h) => b + (typeof h[2] == 'number' ? h[2] : 0), 0),
  0
);

/* Pasang: tepat di atas `function render()`.
   Chat yang dibuka otomatis dianggap sudah dibaca. */
function markRead() {
  const k = st.cur;
  if (!k) return;
  if (k.includes('/')) {                       // channel grup: "idGrup/idChannel"
    const [a, b] = k.split('/'), g = S.find(x => x.id == a);
    if (g) g.cats.forEach(c => c.ch.forEach(h => {
      if (h[0] == b && typeof h[2] == 'number') h[2] = 0;
    }));
  } else {                                     // chat pribadi
    const d = DM.find(x => x.id == k);
    if (d) d.u = 0;
  }
}

/* Ubah render() jadi: */
function render() {
  markRead();                                  // <-- baris tambahan
  /* ...isi render() yang lama tetap... */
}

/* Ubah pemakaian badge lama (s.badge) menjadi bd(s):
   - rail():        const tot = S.reduce((a, s) => a + bd(s), 0);
   - groupPicker(): ${bd(s) ? `<span class="n2">${bd(s)}</span>` : ''}
   - badge DM di rail(): ['dm','💬','Chat', DM.filter(d => d.u).length]
*/

/* Data DM: tambahkan u:1 (belum dibaca) pada Zaka dan Lina.
   {id:'zaka', n:'Zaka', c:4, l:'Deadline Minggu depan', u:1}
   {id:'lina', n:'Lina', c:0, l:'Aku kirim filenya ya', u:1}

   Di list() (daftar chat), tampilkan badge DM:
   ...</span>${d.u ? `<span class="n2">${d.u}</span>` : ''}</button>
*/


/* ------------------------------------------------------------
   2. LAYAR TELEPON: timer tidak render ulang layar
   Pasang: di dalam startCall(), ganti bagian lama
   ------------------------------------------------------------ */
const tm = () =>
  String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');

// di template layar telepon, tulis waktunya begini:
//   ${video ? 'Video call' : 'Panggilan suara'} · <span id="ctm">${tm()}</span>

// saat telepon diakhiri (catat durasi ke chat):
//   if (st.cur) (MSG[st.cur] = MSG[st.cur] || []).push(
//     ['__call', (video ? 'Video call' : 'Panggilan suara') + ' · ' + tm()]);
//   render();

// timer: hanya angka waktu yang diperbarui, tombol tidak ikut dibuat ulang
st.timer = setInterval(() => {
  sec++;
  const e = $('#ctm');
  if (e) e.textContent = tm();
}, 1000);


/* ------------------------------------------------------------
   3. ANTI-XSS: bungkus teks user dengan esc()
   (esc() sudah ada di chatku.html)
   ------------------------------------------------------------ */
// init(): inisial avatar juga di-escape
function init(a) { return esc(String(a || '?')[0].toUpperCase()); }

// ask(): isi kolom dan opsi dropdown
//   placeholder='${esc(f.p || '')}' value='${esc(f.v || '')}'
//   <option value='${i}'>${esc(x)}</option>

// showInfo():
//   <h2>${esc(s.n)}</h2>
//   <p>${s.desc ? esc(s.desc) : 'Belum ada deskripsi.'}</p>
//   ... ${esc(h[1])} ...            (nama channel)
//   ... ${esc(c.t)} ...             (nama kategori)
//   ... ${m[0] == 'Saiya' ? 'Kamu' : esc(m[0])} ...   (nama anggota)

// list() / groupPicker():
//   <b>${esc(d.n)}</b><small>${esc(prev(MSG[d.id].slice(-1)[0], d.l))}</small>
//   ${esc(s.n)}   ${esc(h[1])}   ${esc(u)}   ${esc(c.t)}

// main() (judul header & ruang suara):
//   title = esc(dm.n)   |   title = (isV ? '🔊 ' : '# ') + esc(chn[1]);  sub = esc(srv.n)
//   <h3>${esc(chn[1])}</h3> ... ${esc(chn[3].join(', '))}

// startCall():
//   <h2>${esc(name)}</h2>   ...   <em>${esc(p)}</em>