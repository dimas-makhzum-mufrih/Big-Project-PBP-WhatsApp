/* Fitur panel "+" chat pribadi: Dokumen, Foto & video, Kamera, Kontak, Polling, Acara.
 * Pesan membawa field `lampiran`: { jenis: dokumen|video|kontak|polling|acara, ... }.
 *  - dokumen/video : berkas disimpan di IndexedDB (lewat simpanGambarIdb), kartu hanya memuat id + metadata
 *  - kontak        : { nama, phone, userId? }
 *  - polling       : { tanya, opsi[], banyak, suara:{ idAkun:[indeks] } }
 *  - acara         : { judul, tanggal, jam, tempat, ket, rsvp:{ idAkun:'ya'|'tidak' } }
 * Lokasi sengaja tidak ada. */
(() => {
  'use strict';
  if (typeof userAktif === 'undefined' || !userAktif) return;
  const $ = (s, r = document) => r.querySelector(s);
  const MAKS_BERKAS = 25 * 1024 * 1024;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const el = (tag, cls, teks) => { const n = document.createElement(tag); if (cls) n.className = cls; if (teks != null) n.textContent = teks; return n; };
  const SV = {
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    unduh: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
    kal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    tempat: '<path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  };
  const ik = (k, n = 20) => '<svg class="ikon" width="' + n + '" height="' + n + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + SV[k] + '</svg>';
  const ukuran = (b) => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(b < 10240 ? 1 : 0) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
  const toast = (t) => { try { if (typeof tampilToastTema === 'function') return tampilToastTema(t); } catch (e) { } console.warn(t); };
  const bisaKirim = () => { if (!chatAktifId) return false; try { if (chatTerblokir(chatAktifId)) { toast('Kontak ini diblokir.'); return false; } } catch (e) { } return true; };
  const idBaru = () => (typeof buatIdPesan === 'function' ? buatIdPesan() : 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));

  // ---------- kirim & ubah pesan ----------
  function kirim(lampiran, teks) {
    if (!bisaKirim()) return false;
    const tujuan = chatAktifId, daftar = ambilPesanChat(tujuan);
    const pesan = { id: idBaru(), sender: userAktif.id, text: teks || '', lampiran, time: new Date().toISOString(), status: 'terkirim' };
    if (typeof idBalasanAktif !== 'undefined' && idBalasanAktif && typeof bersihkanBalasan === 'function') { /* balasan tidak dibawa ke kartu */ }
    daftar.push(pesan);
    if (!simpanPesanChat(tujuan, daftar)) { toast('Gagal menyimpan pesan.'); return false; }
    renderPesanAktif(); renderChatList();
    return true;
  }
  function ubahLampiran(idPesan, fn) {
    const idLawan = chatAktifId; if (!idLawan) return;
    const daftar = ambilPesanChat(idLawan), p = daftar.find(x => String(x.id) === String(idPesan));
    if (!p || !p.lampiran || p.dihapusSemua) return;
    fn(p.lampiran);
    if (simpanPesanChat(idLawan, daftar)) renderPesanAktif();
  }
  const namaAkun = (id) => String(id) === String(userAktif.id) ? 'Kamu' : ((typeof getProfil === 'function' && getProfil(id).nama) || (getUserById(id) || {}).nama || 'Pengguna');

  // ---------- dialog generik ----------
  function dialog(judul, isi, { simpan = 'Kirim', onSimpan } = {}) {
    const d = el('dialog', 'lmp-dlg');
    const form = el('form', 'lmp-form'); form.method = 'dialog';
    const h = el('h3', 'lmp-judul', judul);
    const aksi = el('div', 'lmp-aksi');
    const batal = el('button', 'lmp-btn', 'Batal'); batal.type = 'button';
    const ok = el('button', 'lmp-btn lmp-utama', simpan); ok.type = 'submit';
    aksi.append(batal, ok); form.append(h, isi, aksi); d.append(form);
    const tutup = () => { try { d.close(); } catch (e) { } d.remove(); };
    batal.onclick = tutup; d.addEventListener('cancel', (e) => { e.preventDefault(); tutup(); });
    d.addEventListener('click', (e) => { if (e.target === d) tutup(); });
    form.onsubmit = async (e) => { e.preventDefault(); if (onSimpan && (await onSimpan(d)) === false) return; tutup(); };
    document.body.append(d); d.showModal();
    return { d, tutup, ok };
  }
  const medan = (label, input) => { const l = el('label', 'lmp-medan'); l.append(el('span', '', label), input); return l; };
  const input = (tipe, ph, maks) => { const i = el('input', 'lmp-input'); i.type = tipe; if (ph) i.placeholder = ph; if (maks) i.maxLength = maks; return i; };

  // ---------- DOKUMEN & VIDEO ----------
  async function kirimBerkas(file, jenis) {
    if (file.size > MAKS_BERKAS) return toast(file.name + ' melebihi 25 MB.');
    const id = 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    if (!(await simpanGambarIdb(id, file))) return toast('Penyimpanan penuh atau tidak tersedia.');
    kirim({ jenis, berkasId: id, nama: file.name, mime: file.type || 'application/octet-stream', ukuran: file.size });
  }
  function pilihBerkas(accept, jenis) {
    const i = el('input'); i.type = 'file'; i.multiple = true; if (accept) i.accept = accept; i.hidden = true;
    i.onchange = async () => { for (const f of i.files) await kirimBerkas(f, jenis || (f.type.startsWith('video/') ? 'video' : 'dokumen')); i.remove(); };
    document.body.append(i); i.click();
  }
  const tipeBerkas = (n) => (String(n).split('.').pop() || '').slice(0, 4).toUpperCase();

  // ---------- KAMERA ----------
  async function bukaKamera() {
    if (!bisaKirim()) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return toast('Browser ini tidak mendukung kamera (perlu HTTPS atau localhost).');
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false }); }
    catch (e) { return toast(e && e.name === 'NotAllowedError' ? 'Izin kamera ditolak.' : 'Kamera tidak ditemukan.'); }
    const wadah = el('div', 'lmp-kamera'), v = el('video'); v.autoplay = true; v.playsInline = true; v.muted = true; v.srcObject = stream;
    wadah.append(v);
    const h = dialog('Kamera', wadah, { simpan: 'Ambil foto', onSimpan: async () => {
      if (!v.videoWidth) { toast('Kamera belum siap.'); return false; }
      const c = el('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0);
      const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9));
      const file = new File([blob], 'kamera-' + Date.now() + '.jpg', { type: 'image/jpeg' });
      setTimeout(() => tambahFileKeAntrean([file]), 50);
    } });
    h.d.addEventListener('close', () => stream.getTracks().forEach(t => t.stop()));
    new MutationObserver((m, ob) => { if (!h.d.isConnected) { stream.getTracks().forEach(t => t.stop()); ob.disconnect(); } }).observe(document.body, { childList: true });
  }

  // ---------- KONTAK ----------
  function bukaKontak() {
    if (!bisaKirim()) return;
    let daftar = [];
    try { daftar = NgumpulKontakData.list(userAktif.id) || []; } catch (e) { }
    const isi = el('div', 'lmp-pilih'), cari = input('search', 'Cari kontak...'); cari.className += ' lmp-cari';
    const ul = el('ul', 'lmp-daftar'); let dipilih = null;
    const gambar = () => {
      const q = cari.value.trim().toLowerCase(); ul.replaceChildren();
      const hasil = daftar.filter(k => !q || String(k.name).toLowerCase().includes(q) || String(k.phone).includes(q));
      if (!hasil.length) { ul.append(el('li', 'lmp-kosong', daftar.length ? 'Tidak ada yang cocok.' : 'Belum ada kontak tersimpan.')); return; }
      hasil.forEach(k => {
        const li = el('li'), b = el('button', 'lmp-baris' + (dipilih === k ? ' dipilih' : ''));
        b.type = 'button'; b.innerHTML = '<span class="lmp-av">' + esc((k.name || '?').trim()[0] || '?').toUpperCase() + '</span><span><b>' + esc(k.name || k.phone) + '</b><small>' + esc(k.phone) + '</small></span>';
        b.onclick = () => { dipilih = k; gambar(); }; li.append(b); ul.append(li);
      });
    };
    cari.oninput = gambar; gambar(); isi.append(cari, ul);
    dialog('Kirim kontak', isi, { onSimpan: () => {
      if (!dipilih) { toast('Pilih satu kontak dulu.'); return false; }
      const u = (getUsers() || []).find(x => samakanHp(x.hp, dipilih.phone));
      kirim({ jenis: 'kontak', nama: dipilih.name || dipilih.phone, phone: dipilih.phone, userId: u ? u.id : null });
    } });
  }

  // ---------- POLLING ----------
  function bukaPolling() {
    if (!bisaKirim()) return;
    const isi = el('div', 'lmp-isi'), tanya = input('text', 'Tanyakan sesuatu...', 120), kotak = el('div', 'lmp-opsi'), tambah = el('button', 'lmp-btn lmp-tambah', '+ Tambah opsi'), banyak = el('input'); tambah.type = 'button'; banyak.type = 'checkbox';
    const barisOpsi = (ph) => { const i = input('text', ph, 60); i.className += ' lmp-opsi-in'; return i; };
    kotak.append(barisOpsi('Opsi 1'), barisOpsi('Opsi 2'));
    tambah.onclick = () => { if (kotak.children.length >= 8) return toast('Maksimal 8 opsi.'); const i = barisOpsi('Opsi ' + (kotak.children.length + 1)); kotak.append(i); i.focus(); tambah.hidden = kotak.children.length >= 8; };
    const cek = el('label', 'lmp-cek'); cek.append(banyak, el('span', '', 'Boleh pilih lebih dari satu'));
    isi.append(medan('Pertanyaan', tanya), el('div', 'lmp-label', 'Opsi'), kotak, tambah, cek);
    dialog('Buat polling', isi, { onSimpan: () => {
      const q = tanya.value.trim(), opsi = [...kotak.children].map(i => i.value.trim()).filter(Boolean);
      if (!q) { toast('Isi pertanyaannya dulu.'); tanya.focus(); return false; }
      if (opsi.length < 2) { toast('Minimal 2 opsi.'); return false; }
      if (new Set(opsi.map(o => o.toLowerCase())).size !== opsi.length) { toast('Ada opsi yang sama.'); return false; }
      kirim({ jenis: 'polling', tanya: q, opsi, banyak: banyak.checked, suara: {} });
    } });
    setTimeout(() => tanya.focus(), 30);
  }

  // ---------- ACARA ----------
  const fmtTgl = (t) => { try { return new Date(t + 'T00:00').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return t; } };
  function bukaAcara() {
    if (!bisaKirim()) return;
    const isi = el('div', 'lmp-isi'), judul = input('text', 'Nama acara', 80), tgl = input('date'), jam = input('time'), tempat = input('text', 'Lokasi (opsional)', 100), ket = el('textarea', 'lmp-input'); ket.rows = 3; ket.placeholder = 'Keterangan (opsional)'; ket.maxLength = 300;
    const hariIni = new Date(); tgl.min = hariIni.getFullYear() + '-' + String(hariIni.getMonth() + 1).padStart(2, '0') + '-' + String(hariIni.getDate()).padStart(2, '0');
    const baris = el('div', 'lmp-dua'); baris.append(medan('Tanggal', tgl), medan('Jam', jam));
    isi.append(medan('Nama acara', judul), baris, medan('Tempat', tempat), medan('Keterangan', ket));
    dialog('Buat acara', isi, { onSimpan: () => {
      if (!judul.value.trim()) { toast('Nama acara wajib diisi.'); judul.focus(); return false; }
      if (!tgl.value) { toast('Pilih tanggalnya dulu.'); tgl.focus(); return false; }
      kirim({ jenis: 'acara', judul: judul.value.trim(), tanggal: tgl.value, jam: jam.value || '', tempat: tempat.value.trim(), ket: ket.value.trim(), rsvp: {} });
    } });
    setTimeout(() => judul.focus(), 30);
  }
  function unduhIcs(l) {
    const t = l.tanggal.replace(/-/g, ''), j = (l.jam || '').replace(':', '');
    const dt = j ? ';VALUE=DATE-TIME:' + t + 'T' + j + '00' : ';VALUE=DATE:' + t;
    const sem = (s) => String(s || '').replace(/[\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');
    const isi = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ngumpul//ID', 'BEGIN:VEVENT', 'UID:' + Date.now() + '@ngumpul', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]|\.\d+/g, ''), 'DTSTART' + dt, 'SUMMARY:' + sem(l.judul), l.tempat ? 'LOCATION:' + sem(l.tempat) : '', l.ket ? 'DESCRIPTION:' + sem(l.ket) : '', 'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n');
    const a = el('a'); a.href = URL.createObjectURL(new Blob([isi], { type: 'text/calendar' })); a.download = l.judul.replace(/[^\w\- ]+/g, '').slice(0, 40) + '.ics'; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  // ---------- kartu di dalam bubble ----------
  function kartu(item) {
    const l = item.lampiran, k = el('div', 'lmp-kartu lmp-' + l.jenis);
    if (l.jenis === 'dokumen') {
      k.innerHTML = '<span class="lmp-ikon-doc">' + ik('file', 22) + '<i>' + esc(tipeBerkas(l.nama)) + '</i></span><span class="lmp-teks"><b title="' + esc(l.nama) + '">' + esc(l.nama) + '</b><small>' + ukuran(l.ukuran || 0) + '</small></span>';
      const b = el('button', 'lmp-ikonbtn'); b.type = 'button'; b.title = 'Unduh'; b.setAttribute('aria-label', 'Unduh ' + l.nama); b.innerHTML = ik('unduh', 18);
      b.onclick = async () => { const url = await ambilGambarIdb(l.berkasId); if (!url) return toast('Berkas tidak ada di perangkat ini.'); const a = el('a'); a.href = url; a.download = l.nama; document.body.append(a); a.click(); a.remove(); };
      k.append(b);
    } else if (l.jenis === 'video') {
      const v = el('video'); v.controls = true; v.preload = 'metadata'; v.playsInline = true; k.append(v, el('small', 'lmp-vinfo', l.nama + ' · ' + ukuran(l.ukuran || 0)));
      ambilGambarIdb(l.berkasId).then(u => { if (u) v.src = u; else k.replaceChildren(el('small', '', 'Video tidak ada di perangkat ini.')); });
    } else if (l.jenis === 'kontak') {
      const lawan = l.userId && String(l.userId) !== String(userAktif.id) ? l.userId : null;
      k.innerHTML = '<span class="lmp-av">' + esc((l.nama || '?').trim()[0] || '?').toUpperCase() + '</span><span class="lmp-teks"><b>' + esc(l.nama) + '</b><small>' + esc(l.phone) + '</small></span>';
      const a = el('div', 'lmp-aksi-kartu');
      if (lawan) { const c = el('button', 'lmp-btn', 'Chat'); c.type = 'button'; c.onclick = () => document.dispatchEvent(new CustomEvent('ngumpul:buka-chat', { detail: { idLawan: lawan } })); a.append(c); }
      const s = el('button', 'lmp-btn', 'Salin nomor'); s.type = 'button';
      s.onclick = () => { const ok = () => { s.textContent = 'Tersalin'; setTimeout(() => s.textContent = 'Salin nomor', 1400); }; if (navigator.clipboard) navigator.clipboard.writeText(l.phone).then(ok, () => { }); else ok(); };
      a.append(s);
      let sudah = false; try { sudah = NgumpulKontakData.list(userAktif.id).some(x => samakanHp(x.phone, l.phone)); } catch (e) { }
      if (!sudah) { const t = el('button', 'lmp-btn', 'Simpan'); t.type = 'button'; t.onclick = () => { try { NgumpulKontakData.add(userAktif.id, l.phone, l.nama); t.textContent = 'Tersimpan'; t.disabled = true; } catch (e) { toast((e && e.message) || 'Tidak bisa menyimpan kontak.'); } }; a.append(t); }
      k.append(a);
    } else if (l.jenis === 'polling') {
      const suara = l.suara || {}, milik = suara[userAktif.id] || [], total = Object.values(suara).reduce((n, a) => n + a.length, 0), pemilih = Object.keys(suara).filter(i => suara[i].length).length;
      k.append(el('b', 'lmp-tanya', l.tanya), el('small', 'lmp-sub', l.banyak ? 'Pilih satu atau lebih' : 'Pilih satu'));
      l.opsi.forEach((o, i) => {
        const jml = Object.values(suara).filter(a => a.includes(i)).length, persen = total ? Math.round(jml / total * 100) : 0;
        const b = el('button', 'lmp-opsi-btn' + (milik.includes(i) ? ' dipilih' : '')); b.type = 'button'; b.setAttribute('aria-pressed', String(milik.includes(i)));
        b.innerHTML = '<span class="lmp-bar" style="width:' + persen + '%"></span><span class="lmp-cekbul">' + (milik.includes(i) ? '✓' : '') + '</span><span class="lmp-o">' + esc(o) + '</span><span class="lmp-n">' + jml + '</span>';
        b.onclick = () => ubahLampiran(item.id, (x) => {
          x.suara = x.suara || {}; let a = (x.suara[userAktif.id] || []).slice();
          if (a.includes(i)) a = a.filter(n => n !== i); else a = x.banyak ? a.concat(i) : [i];
          if (a.length) x.suara[userAktif.id] = a; else delete x.suara[userAktif.id];
        });
        k.append(b);
      });
      k.append(el('small', 'lmp-sub', pemilih + ' suara'));
    } else if (l.jenis === 'acara') {
      const r = l.rsvp || {}, ya = Object.keys(r).filter(i => r[i] === 'ya'), tdk = Object.keys(r).filter(i => r[i] === 'tidak'), saya = r[userAktif.id];
      k.innerHTML = '<div class="lmp-acara-kepala"><span class="lmp-tglbox"><b>' + esc(new Date(l.tanggal + 'T00:00').getDate() || '') + '</b><i>' + esc(new Date(l.tanggal + 'T00:00').toLocaleDateString('id-ID', { month: 'short' })) + '</i></span><span class="lmp-teks"><b>' + esc(l.judul) + '</b><small>' + esc(fmtTgl(l.tanggal) + (l.jam ? ' · ' + l.jam : '')) + '</small></span></div>' +
        (l.tempat ? '<p class="lmp-baris-info">' + ik('tempat', 15) + esc(l.tempat) + '</p>' : '') + (l.ket ? '<p class="lmp-ket">' + esc(l.ket) + '</p>' : '');
      const a = el('div', 'lmp-aksi-kartu');
      [['ya', 'Ikut'], ['tidak', 'Tidak']].forEach(([v, t]) => { const b = el('button', 'lmp-btn' + (saya === v ? ' lmp-utama' : ''), t); b.type = 'button'; b.setAttribute('aria-pressed', String(saya === v)); b.onclick = () => ubahLampiran(item.id, (x) => { x.rsvp = x.rsvp || {}; if (x.rsvp[userAktif.id] === v) delete x.rsvp[userAktif.id]; else x.rsvp[userAktif.id] = v; }); a.append(b); });
      const kal = el('button', 'lmp-btn', 'Kalender'); kal.type = 'button'; kal.title = 'Tambahkan ke kalender (.ics)'; kal.onclick = () => unduhIcs(l); a.append(kal);
      k.append(a);
      if (ya.length || tdk.length) k.append(el('small', 'lmp-sub', (ya.length ? 'Ikut: ' + ya.map(namaAkun).join(', ') : '') + (ya.length && tdk.length ? ' · ' : '') + (tdk.length ? 'Tidak: ' + tdk.map(namaAkun).join(', ') : '')));
    }
    return k;
  }
  const ringkas = (item) => {
    const l = item && item.lampiran; if (!l) return '';
    return { dokumen: 'Dokumen: ' + l.nama, video: 'Video: ' + l.nama, kontak: 'Kontak: ' + l.nama, polling: 'Polling: ' + l.tanya, acara: 'Acara: ' + l.judul }[l.jenis] || 'Lampiran';
  };

  // ---------- pasang ke panel + ----------
  function pasang() {
    const panel = $('#panel-lampiran'); if (!panel) return;
    const lok = panel.querySelector('[data-fitur="lampir-lokasi"]'); if (lok) lok.remove();
    const aksi = { 'lampir-dokumen': () => pilihBerkas('', 'dokumen'), 'lampir-kamera': bukaKamera, 'lampir-kontak': bukaKontak, 'lampir-polling': bukaPolling, 'lampir-acara': bukaAcara };
    Object.keys(aksi).forEach(f => { const b = panel.querySelector('[data-fitur="' + f + '"]'); if (b) b.addEventListener('click', () => { if (!chatAktifId) return; tutupPanelLampiran(); aksi[f](); }); });
    const media = $('#input-file-gambar');
    if (media) {
      media.accept = 'image/*,video/*';
      media.addEventListener('change', (e) => {
        const semua = [...media.files], video = semua.filter(f => f.type.startsWith('video/')); if (!video.length) return;
        const gambar = semua.filter(f => !f.type.startsWith('video/')), dt = new DataTransfer(); gambar.forEach(f => dt.items.add(f)); media.files = dt.files;
        video.forEach(f => kirimBerkas(f, 'video'));
        if (!gambar.length) { e.stopImmediatePropagation(); media.value = ''; }
      }, true);
    }
  }
  window.NgumpulLampiran = { kartu, ringkas };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pasang); else pasang();
})();
