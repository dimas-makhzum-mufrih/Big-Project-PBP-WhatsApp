/* Halaman Premium di Pengaturan (menggantikan kode rahasia lama).
 * Status disimpan di localStorage ngumpul_premium_<idAkun> = "1" (sama dengan yang dibaca theme.js).
 * Versi demo: belum ada pembayaran; nanti diganti status dari backend. */
(() => {
  'use strict';
  if (typeof userAktif === 'undefined' || !userAktif) return;
  const $ = (id) => document.getElementById(id);
  const baris = $('baris-premium'), panel = $('panel-setelan-premium'), aksi = $('btn-premium-aksi');
  if (!baris || !panel || !aksi) return;
  const KUNCI = 'ngumpul_premium_' + userAktif.id;
  const BATAS = { gratis: 3, premium: 5 };
  const aktif = () => { try { return localStorage.getItem(KUNCI) === '1'; } catch (e) { return false; } };
  const batasPin = () => aktif() ? BATAS.premium : BATAS.gratis;
  const judul = $('judul-panel-setelan'), daftar = document.querySelector('.settings-list-flow');
  const kembali = $('btn-kembali-ke-chat');

  function segarkan() {
    const on = aktif();
    $('premium-ringkas').textContent = on ? 'Aktif · semua tema dan ' + BATAS.premium + ' sematan' : 'Tema eksklusif dan lebih banyak sematan';
    $('premium-status-teks').textContent = on ? 'Terima kasih! Semua tema dan fitur premium sudah terbuka.' : 'Buka semua tema dan ' + BATAS.premium + ' sematan pesan per chat.';
    $('premium-lencana').hidden = !on;
    aksi.textContent = on ? 'Nonaktifkan Premium' : 'Aktifkan Premium';
    aksi.classList.toggle('premium-tombol-sekunder', on);
    baris.classList.toggle('aktif', on);
    panel.classList.toggle('aktif', on);
  }
  function segarkanTema() {
    ['perbaruiPilihanTema', 'perbaruiKunciTema', 'perbaruiPanelSky', 'perbaruiPanelAurora', 'perbaruiPanelGolden', 'perbaruiPanelHiasan']
      .forEach(n => { try { if (typeof window[n] === 'function') window[n](); } catch (e) { } });
  }
  function buka() {
    if (typeof bukaSetelan === 'function') { const lyr = $('panel-layer-setelan'); if (lyr && getComputedStyle(lyr).display === 'none') bukaSetelan(); }
    [$('panel-setelan-tema'), $('panel-setelan-notifikasi')].forEach(p => { if (p) p.hidden = true; });
    if (daftar) daftar.style.display = 'none';
    panel.hidden = false; segarkan();
    if (judul) judul.textContent = 'Premium';
  }
  function tutup() {
    panel.hidden = true;
    if (daftar) daftar.style.display = 'block';
    if (judul) judul.textContent = 'Pengaturan';
  }
  baris.addEventListener('click', buka);
  baris.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); buka(); } });
  // tombol kembali: tutup halaman premium dulu sebelum handler lain
  if (kembali) kembali.addEventListener('click', (e) => { if (!panel.hidden) { e.stopImmediatePropagation(); tutup(); } }, true);

  aksi.addEventListener('click', () => {
    if (!aktif()) {
      try { localStorage.setItem(KUNCI, '1'); } catch (e) { return; }
      segarkanTema(); segarkan();
      if (typeof tampilPopupPlus === 'function') tampilPopupPlus();
    } else {
      if (!confirm('Nonaktifkan Premium? Tema premium akan diganti ke Terang dan batas sematan kembali ke ' + BATAS.gratis + '.')) return;
      try { localStorage.removeItem(KUNCI); } catch (e) { return; }
      try { if (window.NgumpulTheme) NgumpulTheme.setTheme('light'); } catch (e) { }
      segarkanTema(); segarkan();
    }
    document.dispatchEvent(new CustomEvent('ngumpul:premium-berubah', { detail: { aktif: aktif() } }));
  });
  window.addEventListener('storage', (e) => { if (e.key === KUNCI) segarkan(); });
  window.NgumpulPremium = { aktif, batasPin, buka, BATAS };
  segarkan();
})();
