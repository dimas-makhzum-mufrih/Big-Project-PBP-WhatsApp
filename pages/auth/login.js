(() => {
  const byId = id => document.getElementById(id);
  const login = byId('masuk-email');
  const email = byId('login-email');
  const sandi = byId('login-sandi');
  const errorMasuk = byId('error-masuk');
  const statusMasuk = byId('status-masuk');
  const mintaReset = byId('minta-reset');
  const resetEmail = byId('reset-email');
  const resetSandi = byId('reset-sandi');
  const resetOtp = byId('reset-otp');
  const sandiBaru = byId('reset-sandi-baru');
  const konfirmasi = byId('reset-sandi-konfirmasi');
  const errorKonfirmasi = byId('error-konfirmasi');
  const errorReset = byId('error-reset-sandi');
  const statusReset = byId('status-reset');
  let emailReset = '';

  function tampilHalaman() {
    const bagian = location.hash.slice(1);
    let id = 'form-login';
    if (bagian === 'lupa-sandi' || bagian === 'sandi-baru') id = 'lupa-sandi';
    if (bagian === 'sandi-baru' && emailReset) id = 'sandi-baru';

    document.querySelectorAll('.halaman').forEach(halaman => {
      halaman.classList.toggle('aktif', halaman.id === id);
    });
    if (id === 'lupa-sandi') {
      if (!resetEmail.value) resetEmail.value = email.value;
      resetEmail.focus();
    } else if (id === 'sandi-baru') {
      resetOtp.focus();
    } else if (location.hash) {
      email.focus();
    }
  }

  const params = new URLSearchParams(location.search);
  if (params.get('status') === 'terverifikasi') {
    email.value = NgumpulAuth.emailVerifikasi() || email.value;
    NgumpulAuth.akhiriVerifikasi();
    statusMasuk.textContent = 'Email sudah terverifikasi. Silakan masuk.';
  }

  login.addEventListener('submit', event => {
    event.preventDefault();
    errorMasuk.textContent = '';
    const alamat = email.value.trim().toLowerCase();

    prosesForm(login, byId('btn-masuk'), 'Sedang masuk…', async () => {
      try {
        await NgumpulAuth.masuk(alamat, sandi.value);
        NgumpulAuth.akhiriVerifikasi();
        login.reset();
        location.replace('../dashboard/dashboard.html');
      } catch (error) {
        if (error.code === 'EMAIL_NOT_VERIFIED') {
          NgumpulAuth.mulaiVerifikasi(alamat);
          sandi.value = '';
          location.assign('otp.html');
          return;
        }
        errorMasuk.textContent = NgumpulAuth.pesanError(error, 'Gagal masuk. Coba lagi.');
      }
    });
  });

  function kirimKodeReset(email) {
    return NgumpulAuth.kirim('email-otp/request-password-reset', { email });
  }

  mintaReset.addEventListener('submit', event => {
    event.preventDefault();
    const errorEmail = byId('error-reset-email');
    errorEmail.textContent = '';
    const alamat = resetEmail.value.trim().toLowerCase();
    prosesForm(mintaReset, byId('btn-kirim-otp-reset'), 'Mengirim kode…', async () => {
      try {
        await kirimKodeReset(alamat);
        emailReset = alamat;
        byId('alamat-reset').textContent = alamat;
        resetSandi.reset();
        errorKonfirmasi.textContent = '';
        konfirmasi.removeAttribute('aria-invalid');
        errorReset.textContent = '';
        statusReset.textContent = '';
        location.hash = 'sandi-baru';
      } catch (error) {
        errorEmail.textContent = NgumpulAuth.pesanError(error, 'Kode gagal dikirim. Coba lagi.');
      }
    });
  });

  const kirimUlang = byId('btn-kirim-ulang-reset');
  kirimUlang.addEventListener('click', () => {
    errorReset.textContent = '';
    statusReset.textContent = '';
    prosesForm(resetSandi, kirimUlang, 'Mengirim kode…', async () => {
      try {
        await kirimKodeReset(emailReset);
        resetOtp.value = '';
        resetOtp.focus();
        statusReset.textContent = 'Jika email terdaftar, kode baru akan dikirim.';
      } catch (error) {
        errorReset.textContent = NgumpulAuth.pesanError(error, 'Kode gagal dikirim. Coba lagi.');
      }
    });
  });

  konfirmasi.addEventListener('input', () => {
    errorKonfirmasi.textContent = '';
    konfirmasi.removeAttribute('aria-invalid');
  });

  resetSandi.addEventListener('submit', event => {
    event.preventDefault();
    errorReset.textContent = '';
    statusReset.textContent = '';
    if (sandiBaru.value !== konfirmasi.value) {
      errorKonfirmasi.textContent = 'Sandi tidak sama.';
      konfirmasi.setAttribute('aria-invalid', 'true');
      konfirmasi.focus();
      return;
    }
    errorKonfirmasi.textContent = '';
    konfirmasi.removeAttribute('aria-invalid');

    prosesForm(resetSandi, byId('btn-simpan-sandi'), 'Menyimpan sandi…', async () => {
      try {
        await NgumpulAuth.kirim('email-otp/reset-password', {
          email: emailReset,
          otp: resetOtp.value,
          password: sandiBaru.value
        });
        email.value = emailReset;
        emailReset = '';
        resetSandi.reset();
        sandi.value = '';
        statusMasuk.textContent = 'Sandi berhasil diubah. Silakan masuk.';
        errorMasuk.textContent = '';
        location.hash = 'masuk';
      } catch (error) {
        errorReset.textContent = NgumpulAuth.pesanError(error, 'Sandi gagal diubah. Coba lagi.');
      }
    });
  });

  window.addEventListener('hashchange', tampilHalaman);
  tampilHalaman();

  if (params.get('google') === 'gagal' || params.has('error')) {
    errorMasuk.textContent = 'Masuk dengan Google gagal. Coba lagi.';
  } else if (params.get('google') === 'selesai') {
    prosesForm(login, byId('btn-masuk'), 'Memeriksa sesi…', async () => {
      try {
        if (await NgumpulAuth.selesaikanGoogle()) {
          NgumpulAuth.akhiriVerifikasi();
          location.replace('../dashboard/dashboard.html');
          return;
        }
        errorMasuk.textContent = 'Sesi Google tidak ditemukan. Izinkan cookie untuk layanan Ngumpul, lalu coba lagi.';
      } catch (error) {
        errorMasuk.textContent = NgumpulAuth.pesanError(error, 'Sesi Google gagal diperiksa. Coba lagi.');
      }
    });
  }
})();
