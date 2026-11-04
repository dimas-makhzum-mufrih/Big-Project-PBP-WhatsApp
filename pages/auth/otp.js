/* Ngumpul - verifikasi OTP
   Alur: register.js menyimpan data ke sessionStorage["ngumpul_pending"]
         lalu pindah ke otp.html. Halaman ini membuat & memeriksa kode,
         lalu menandai akun terverifikasi. */
(function () {
  'use strict';

  // ===== Pengaturan =====
  var PANJANG_KODE   = 6;
  var MASA_BERLAKU   = 5 * 60 * 1000;  // kode kedaluwarsa setelah 5 menit
  var JEDA_KIRIM     = 60;             // detik sebelum boleh kirim ulang
  var MAKS_SALAH     = 5;              // batas salah input per kode
  var HALAMAN_TUJUAN = 'login.html';   // tujuan setelah berhasil
  var HALAMAN_DAFTAR = '../../index.html';   // tujuan jika data pendaftaran tidak ada

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
  var timerKirim, timerExp, timerNotif;

  // ===== Helper storage =====
  function baca(store, k) {
    try { return JSON.parse(store.getItem(k)); } catch (e) { return null; }
  }
  function tulis(store, k, v) {
    try { store.setItem(k, JSON.stringify(v)); } catch (e) {}
  }

  var data = baca(sessionStorage, KUNCI_PENDING);
  if (!data || !data.hp) { location.replace(HALAMAN_DAFTAR); return; }

  // Tampilkan nomor tersamar, contoh: +62 ••••••789
  var hp = String(data.hp).replace(/\D/g, '');
  document.getElementById('nomor-tersamar').textContent =
    (data.kode || '+62') + ' ' + '••••••' + hp.slice(-3);

  // ===== Buat & kirim kode =====
  function buatKode() {
    var acak = new Uint32Array(1);
    (window.crypto || window.msCrypto).getRandomValues(acak);
    return String(acak[0] % 1000000).padStart(PANJANG_KODE, '0');
  }

  function kirimKode() {
    var kode = buatKode();
    tulis(sessionStorage, KUNCI_OTP, {
      kode: kode, dibuat: Date.now(), salah: 0
    });
    bersihkan();
    tampilkanNotif(kode);
    mulaiTimerKirim();
    mulaiTimerExp();
  }

  // Simulasi SMS: tanpa server, kode ditampilkan di notifikasi.
  // Saat memakai backend/SMS gateway, hapus tampilkanNotif() dan
  // panggil API kirim OTP di sini.
  function tampilkanNotif(kode) {
    notif.innerHTML = 'Pesan masuk dari Ngumpul:<br>Kode verifikasi kamu <b>' + kode + '</b>';
    notif.classList.add('tampil');
    clearTimeout(timerNotif);
    timerNotif = setTimeout(function () { notif.classList.remove('tampil'); }, 8000);
  }

  // ===== Timer =====
  function mulaiTimerKirim() {
    var sisa = JEDA_KIRIM;
    clearInterval(timerKirim);
    btnUlang.hidden = true; infoTimer.hidden = false; detikEl.textContent = sisa;
    timerKirim = setInterval(function () {
      sisa--; detikEl.textContent = sisa;
      if (sisa <= 0) {
        clearInterval(timerKirim);
        infoTimer.hidden = true; btnUlang.hidden = false;
      }
    }, 1000);
  }

  function mulaiTimerExp() {
    clearInterval(timerExp);
    function tik() {
      var rec = baca(sessionStorage, KUNCI_OTP);
      if (!rec) return;
      var sisa = MASA_BERLAKU - (Date.now() - rec.dibuat);
      if (sisa <= 0) {
        infoExp.textContent = 'Kode sudah kedaluwarsa. Kirim ulang kode baru.';
        clearInterval(timerExp);
        return;
      }
      var m = Math.floor(sisa / 60000), d = Math.floor(sisa % 60000 / 1000);
      infoExp.textContent = 'Kode berlaku ' + m + ':' + String(d).padStart(2, '0');
    }
    tik(); timerExp = setInterval(tik, 1000);
  }

  // ===== Input kotak OTP =====
  function nilai() { return digits.map(function (d) { return d.value; }).join(''); }

  function perbarui() {
    btnOk.disabled = nilai().length !== PANJANG_KODE;
  }

  function bersihkan() {
    digits.forEach(function (d) { d.value = ''; });
    kotak.classList.remove('salah');
    tampilPesan('');
    perbarui();
    digits[0].focus();
  }

  function tampilPesan(teks, ok) {
    pesan.textContent = teks;
    pesan.className = 'pesan' + (ok ? ' ok' : '');
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

    // Berhasil
    // Berhasil
    var daftar = baca(localStorage, KUNCI_OK) || {};

    daftar[hp] = {
    nama: data.nama,
    email: data.email,
    waktu: Date.now()
    };

    tulis(localStorage, KUNCI_OK, daftar);

    sessionStorage.removeItem(KUNCI_OTP);
    sessionStorage.removeItem(KUNCI_PENDING);

    clearInterval(timerKirim);
    clearInterval(timerExp);

    btnOk.disabled = true;

    tampilPesan('Akun berhasil diverifikasi. Mengalihkan ke halaman login...', true);

    setTimeout(function () {
    window.location.href = HALAMAN_TUJUAN;
    }, 1200);

  }

  // Mulai: pakai kode lama jika masih berlaku (mis. halaman di-refresh)
  var lama = baca(sessionStorage, KUNCI_OTP);
  if (lama && Date.now() - lama.dibuat < MASA_BERLAKU) {
    mulaiTimerExp(); mulaiTimerKirim(); digits[0].focus();
  } else {
    kirimKode();
  }
})();