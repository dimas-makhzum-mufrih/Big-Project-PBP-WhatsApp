/* Ngumpul - verifikasi OTP (pages/otp.js)
   Alur: registrasi menyimpan data ke sessionStorage["ngumpul_pending"] lalu
   pindah ke halaman ini. Kode dibuat, ditampilkan di notifikasi (simulasi SMS),
   lalu diperiksa saat pengguna mengisi 6 angka. */
(function () {
  'use strict';

  // ===== Pengaturan =====
  var PANJANG_KODE   = 6;
  var MASA_BERLAKU   = 5 * 60 * 1000;  // kode kedaluwarsa setelah 5 menit
  var JEDA_KIRIM     = 60;             // detik sebelum boleh kirim ulang
  var MAKS_SALAH     = 5;              // batas salah input per kode
  var HALAMAN_TUJUAN = 'login.html';   // tujuan setelah berhasil
  // tujuan tombol Kembali, dan tujuan jika data pendaftaran tidak ada
  var HALAMAN_DAFTAR = '../../index.html?halaman=form-daftar&splash=none';

  var KUNCI_PENDING = 'ngumpul_pending';
  var KUNCI_OTP     = 'ngumpul_otp';
  var KUNCI_OK      = 'ngumpul_terverifikasi';

  var kotak   = document.getElementById('kotak-otp');
  var digits  = Array.prototype.slice.call(kotak.querySelectorAll('.digit'));
  var pesan   = document.getElementById('pesan');
  var btnOk   = document.getElementById('btn-verifikasi');
  var btnUlang= document.getElementById('btn-kirim-ulang');
  var infoTimer = document.getElementById('info-timer');
  var detikEl = document.getElementById('detik');
  var infoExp = document.getElementById('info-kadaluarsa');
  var notif   = document.getElementById('notif');
  var timerKirim, timerExp;

  // Tombol untuk memunculkan kembali kode setelah notifikasi ditutup
  var btnLihat = document.createElement('button');
  btnLihat.type = 'button';
  btnLihat.className = 'tautan lihat-kode';
  btnLihat.textContent = 'Tampilkan kode lagi';
  btnLihat.hidden = true;
  infoExp.parentNode.appendChild(btnLihat);

  // ===== Helper storage =====
  function baca(store, k) {
    try { return JSON.parse(store.getItem(k)); } catch (e) { return null; }
  }
  function tulis(store, k, v) {
    try { store.setItem(k, JSON.stringify(v)); } catch (e) {}
  }

  var data = baca(sessionStorage, KUNCI_PENDING);
  if (!data || !data.hp) { location.replace(HALAMAN_DAFTAR); return; }

  var hp = String(data.hp).replace(/\D/g, '');
  document.getElementById('nomor-tersamar').textContent =
    (data.kode || '+62') + ' ' + '••••••' + hp.slice(-3);

  // ===== Notifikasi (tetap tampil sampai ditutup, juga setelah refresh) =====
  function tampilkanNotif(kode) {
    notif.innerHTML =
      '<div class="notif-isi"><span class="notif-judul">Pesan masuk dari Ngumpul</span>' +
      '<span>Kode verifikasi kamu <b>' + kode + '</b></span></div>' +
      '<button type="button" class="notif-tutup" aria-label="Tutup pesan">&times;</button>';
    notif.querySelector('.notif-tutup').addEventListener('click', tutupNotif);
    notif.classList.add('tampil');
    document.body.classList.add('ada-notif');
    btnLihat.hidden = true;
  }

  function tutupNotif() {
    notif.classList.remove('tampil');
    document.body.classList.remove('ada-notif');
    btnLihat.hidden = false;
  }

  function sembunyikanSemuaNotif() {
    notif.classList.remove('tampil');
    document.body.classList.remove('ada-notif');
    btnLihat.hidden = true;
  }

  btnLihat.addEventListener('click', function () {
    var rec = baca(sessionStorage, KUNCI_OTP);
    if (rec) tampilkanNotif(rec.kode);
  });

  // ===== Buat & kirim kode =====
  function buatKode() {
    var acak = new Uint32Array(1);
    (window.crypto || window.msCrypto).getRandomValues(acak);
    return String(acak[0] % 1000000).padStart(PANJANG_KODE, '0');
  }

  function kirimKode() {
    var kode = buatKode(), kini = Date.now();
    tulis(sessionStorage, KUNCI_OTP, { kode: kode, dibuat: kini, dikirim: kini, salah: 0 });
    bersihkan();
    tampilkanNotif(kode);  // simulasi SMS; ganti dengan panggilan API jika ada server
    mulaiTimerKirim();
    mulaiTimerExp();
  }

  // ===== Timer (dihitung dari waktu tersimpan, jadi aman saat refresh) =====
  function mulaiTimerKirim() {
    clearInterval(timerKirim);
    function tik() {
      var rec = baca(sessionStorage, KUNCI_OTP);
      var sejak = rec ? (rec.dikirim || rec.dibuat) : 0;
      var sisa = Math.max(0, JEDA_KIRIM - Math.floor((Date.now() - sejak) / 1000));
      detikEl.textContent = sisa;
      infoTimer.hidden = sisa <= 0;
      btnUlang.hidden = sisa > 0;
      if (sisa <= 0) clearInterval(timerKirim);
    }
    tik();
    timerKirim = setInterval(tik, 1000);
  }

  function mulaiTimerExp() {
    clearInterval(timerExp);
    function tik() {
      var rec = baca(sessionStorage, KUNCI_OTP);
      if (!rec) return;
      var sisa = MASA_BERLAKU - (Date.now() - rec.dibuat);
      if (sisa <= 0) {
        infoExp.textContent = 'Kode sudah kedaluwarsa. Kirim ulang kode baru.';
        sembunyikanSemuaNotif();
        clearInterval(timerExp);
        return;
      }
      var m = Math.floor(sisa / 60000), d = Math.floor(sisa % 60000 / 1000);
      infoExp.textContent = 'Kode berlaku ' + m + ':' + String(d).padStart(2, '0');
    }
    tik();
    timerExp = setInterval(tik, 1000);
  }

  // ===== Kotak OTP =====
  function nilai() { return digits.map(function (d) { return d.value; }).join(''); }
  function perbarui() { btnOk.disabled = nilai().length !== PANJANG_KODE; }

  function tampilPesan(teks, ok) {
    pesan.textContent = teks;
    pesan.className = 'pesan' + (ok ? ' ok' : '');
  }

  function bersihkan() {
    digits.forEach(function (d) { d.value = ''; });
    kotak.classList.remove('salah');
    tampilPesan('');
    perbarui();
    digits[0].focus();
  }

  digits.forEach(function (d, i) {
    d.addEventListener('input', function () {
      d.value = d.value.replace(/\D/g, '').slice(-1);
      kotak.classList.remove('salah');
      if (d.value && i < digits.length - 1) digits[i + 1].focus();
      perbarui();
      if (nilai().length === PANJANG_KODE) verifikasi();
    });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' && !d.value && i > 0) digits[i - 1].focus();
      if (e.key === 'ArrowLeft' && i > 0) digits[i - 1].focus();
      if (e.key === 'ArrowRight' && i < digits.length - 1) digits[i + 1].focus();
      if (e.key === 'Enter') verifikasi();
    });
    d.addEventListener('focus', function () { d.select(); });
    d.addEventListener('paste', function (e) {
      e.preventDefault();
      var teks = (e.clipboardData || window.clipboardData).getData('text')
        .replace(/\D/g, '').slice(0, PANJANG_KODE);
      teks.split('').forEach(function (c, j) { digits[j].value = c; });
      digits[Math.min(teks.length, digits.length - 1)].focus();
      perbarui();
      if (teks.length === PANJANG_KODE) verifikasi();
    });
  });

  // ===== Verifikasi =====
  function gagal(teks) {
    kotak.classList.add('salah');
    tampilPesan(teks);
  }

  function verifikasi() {
    var masuk = nilai();
    if (masuk.length !== PANJANG_KODE) return;

    var rec = baca(sessionStorage, KUNCI_OTP);
    if (!rec) return gagal('Kode belum dikirim. Tekan kirim ulang.');
    if (Date.now() - rec.dibuat > MASA_BERLAKU)
      return gagal('Kode sudah kedaluwarsa. Kirim ulang kode baru.');
    if (rec.salah >= MAKS_SALAH)
      return gagal('Terlalu banyak percobaan. Kirim ulang kode baru.');

    if (masuk !== rec.kode) {
      rec.salah++;
      tulis(sessionStorage, KUNCI_OTP, rec);
      var sisa = MAKS_SALAH - rec.salah;
      return gagal(sisa > 0
        ? 'Kode salah. Sisa percobaan: ' + sisa + '.'
        : 'Terlalu banyak percobaan. Kirim ulang kode baru.');
    }

    var daftar = baca(localStorage, KUNCI_OK) || {};
    daftar[hp] = {
      nama: data.nama,
      email: data.email,
      waktu: Date.now()
    };
    tulis(localStorage, KUNCI_OK, daftar);

    sessionStorage.removeItem(KUNCI_OTP);
    sessionStorage.removeItem(KUNCI_PENDING);
    clearInterval(timerKirim); clearInterval(timerExp);
    sembunyikanSemuaNotif();
    btnOk.disabled = true;
    tampilPesan('Akun berhasil diverifikasi. Mengalihkan ke halaman login...', true);

    setTimeout(function () {
      window.location.href = HALAMAN_TUJUAN;
    }, 1200);
  }

  // ===== Tombol =====
  btnOk.addEventListener('click', verifikasi);
  btnUlang.addEventListener('click', kirimKode);
  document.getElementById('btn-kembali').addEventListener('click', function () {
    location.href = HALAMAN_DAFTAR;
  });

  // ===== Mulai =====
  // Kode lama yang masih berlaku dipakai lagi, dan notifikasinya ditampilkan lagi.
  var lama = baca(sessionStorage, KUNCI_OTP);
  if (lama && Date.now() - lama.dibuat < MASA_BERLAKU) {
    mulaiTimerExp();
    mulaiTimerKirim();
    tampilkanNotif(lama.kode);
    digits[0].focus();
  } else {
    kirimKode();
  }
})();