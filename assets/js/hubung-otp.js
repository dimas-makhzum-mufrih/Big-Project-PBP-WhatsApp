(function () {
  var sukses = document.getElementById('halaman-sukses');
  if (!sukses) return;
  var sudah = false;

  function ambil(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function keOtp() {
    if (sudah) return;
    sudah = true;
    var kodeEl = document.getElementById('kode-terpilih');
    sessionStorage.setItem('ngumpul_pending', JSON.stringify({
      nama: ambil('nama'),
      hp: hpInternasional(negaraTerpilih[2], ambil('hp')),
      kode: kodeEl ? kodeEl.textContent.trim() : '+62',
      email: ambil('email')
    }));
    location.href = 'pages/auth/otp.html';
  }

  new MutationObserver(function () {
    if (sukses.classList.contains('aktif')) keOtp();
  }).observe(sukses, { attributes: true, attributeFilter: ['class'] });
})();