/* Riwayat panggilan (tab Telepon).
 * Mendengarkan NgumpulGrupPanggilan.events: "state" (mulai/selesai), "incoming" & "cancel-invite" (tak terjawab).
 * Data per akun di localStorage: ngumpul_riwayat_panggilan:<akunId> (maks 100 entri).
 * Entri: { id, gid, cid, grup, channel, video, arah: keluar|masuk|tak, dari, mulai, durasi } */
(() => {
  'use strict';
  const P = window.NgumpulGrupPanggilan, panel = document.getElementById('panel-tab-telepon');
  if (!P || !panel || typeof userAktif === 'undefined' || !userAktif) return;
  const KEY = 'ngumpul_riwayat_panggilan:' + userAktif.id, MAKS = 100;
  const baca = () => { try { const a = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(a) ? a : []; } catch (_) { return []; } };
  const tulis = (a) => { try { localStorage.setItem(KEY, JSON.stringify(a.slice(0, MAKS))); } catch (_) { } };
  const tambah = (e) => { const a = baca(); a.unshift(Object.assign({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }, e)); tulis(a); gambar(); };
  const nama = (id) => { try { return (getProfilChat(id) || {}).nama || ''; } catch (_) { return ''; } };

  let sesi = null;       // panggilan yang sedang berlangsung
  let masuk = null;      // undangan masuk yang belum dijawab
  let timerMasuk = 0;

  function tutupSesi() {
    if (!sesi) return;
    const s = sesi; sesi = null;
    tambah({ gid: s.gid, cid: s.cid, grup: s.grup, channel: s.channel, video: s.video, arah: s.arah, dari: s.dari, mulai: s.mulai, durasi: Math.max(0, Math.round((Date.now() - s.mulai) / 1000)) });
  }
  function tandaiTakTerjawab() {
    clearTimeout(timerMasuk);
    if (!masuk) return;
    const m = masuk; masuk = null;
    tambah({ gid: m.gid, cid: m.cid, grup: m.grup, channel: m.channel, video: m.video, arah: 'tak', dari: m.dari, mulai: m.mulai, durasi: 0 });
  }

  P.events.addEventListener('incoming', async (e) => {
    const d = e.detail || {};
    let grup = '', channel = '';
    try { const g = await NgumpulGrupData.get(d.gid); grup = g.nama; channel = (g.ruang.channels.find(c => c.id === d.cid) || {}).nama || ''; } catch (_) { }
    tandaiTakTerjawab();
    masuk = { gid: d.gid, cid: d.cid, grup, channel, video: !!d.video, dari: d.akun, mulai: Date.now() };
    timerMasuk = setTimeout(tandaiTakTerjawab, 31000);
  });
  P.events.addEventListener('cancel-invite', tandaiTakTerjawab);
  P.events.addEventListener('state', (e) => {
    const cur = e.detail && e.detail.current;
    if (cur && !sesi) {
      const jawab = masuk && masuk.gid === cur.gid && masuk.cid === cur.cid;
      sesi = { gid: cur.gid, cid: cur.cid, grup: cur.grup, channel: cur.nama, video: !!(e.detail.stream && e.detail.stream.getVideoTracks().length), arah: jawab ? 'masuk' : 'keluar', dari: jawab ? masuk.dari : userAktif.id, mulai: Date.now() };
      if (jawab) { masuk = null; clearTimeout(timerMasuk); }
    } else if (cur && sesi && e.detail.stream && e.detail.stream.getVideoTracks().length) sesi.video = true;
    else if (!cur && sesi) tutupSesi();
  });
  window.addEventListener('pagehide', tutupSesi);

  const IK = {
    keluar: '<path d="M7 17 17 7M9 7h8v8"/>', masuk: '<path d="M17 7 7 17M15 17H7V9"/>', tak: '<path d="M7 7l10 10M7 14V7h7"/>',
    telp: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    video: '<rect x="3" y="6" width="12" height="12" rx="2"/><path d="m15 10 6-3v10l-6-3z"/>',
  };
  const svg = (p, n = 18) => '<svg class="ikon" width="' + n + '" height="' + n + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dur = (d) => d < 60 ? d + ' dtk' : d < 3600 ? Math.floor(d / 60) + ' mnt ' + (d % 60 ? d % 60 + ' dtk' : '').trim() : Math.floor(d / 3600) + ' j ' + Math.floor(d % 3600 / 60) + ' mnt';
  function waktu(t) {
    const d = new Date(t), n = new Date(), h = (a) => new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
    const jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
    const selisih = Math.round((h(n) - h(d)) / 864e5);
    return selisih === 0 ? 'Hari ini, ' + jam : selisih === 1 ? 'Kemarin, ' + jam : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + ', ' + jam;
  }

  function gambar() {
    const a = baca();
    if (!a.length) {
      panel.innerHTML = '<div class="rp-kosong">' + svg(IK.telp, 34) + '<p><b>Belum ada riwayat panggilan</b></p><p>Panggilan suara dan video dari channel grup akan tercatat di sini.</p></div>';
      return;
    }
    const arahTeks = { keluar: 'Keluar', masuk: 'Masuk', tak: 'Tidak terjawab' };
    panel.innerHTML = '<div class="rp-bar"><span>Panggilan terakhir</span><button type="button" class="rp-hapus" data-rp="bersih">Hapus semua</button></div><ul class="rp-daftar">' +
      a.map(e => {
        const pribadi = String(e.gid).startsWith('dm:');
        const dari = !pribadi && e.arah !== 'keluar' && e.dari ? nama(e.dari) : '';
        const sub = [arahTeks[e.arah], e.arah === 'tak' ? '' : dur(e.durasi), waktu(e.mulai)].filter(Boolean).join(' · ');
        const judul = pribadi ? (e.channel || 'Kontak') : (dari ? dari + ' di ' + e.grup : e.grup || 'Grup');
        const info = (pribadi ? (e.video ? 'Video · ' : 'Suara · ') : '#' + (e.channel || 'channel') + ' · ') + sub;
        return '<li class="rp-item rp-' + e.arah + '"><span class="rp-arah" aria-hidden="true">' + svg(IK[e.arah], 18) + '</span>' +
          '<span class="rp-teks"><b>' + esc(judul) + '</b><small>' + esc(info) + '</small></span>' +
          '<button type="button" class="rp-balik" data-rp="balik" data-id="' + esc(e.id) + '" aria-label="Telepon lagi ' + esc(e.grup) + '" title="Telepon lagi">' + svg(e.video ? IK.video : IK.telp, 18) + '</button></li>';
      }).join('') + '</ul>';
  }
  panel.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-rp]'); if (!b) return;
    if (b.dataset.rp === 'bersih') { if (confirm('Hapus semua riwayat panggilan?')) { tulis([]); gambar(); } return; }
    const e = baca().find(x => x.id === b.dataset.id); if (!e) return;
    try {
      if (String(e.gid).startsWith('dm:')) {
        const lawan = e.gid.slice(3).split('+').find(i => i !== String(userAktif.id));
        await window.NgumpulRuang.panggilPribadi(lawan, !!e.video);
      } else await P.join(e.gid, e.cid, !!e.video, true);
    } catch (_) { alert('Tidak bisa memulai panggilan. Mungkin channel atau grupnya sudah tidak ada.'); }
  });
  window.addEventListener('storage', (e) => { if (e.key === KEY) gambar(); });
  gambar();
})();
