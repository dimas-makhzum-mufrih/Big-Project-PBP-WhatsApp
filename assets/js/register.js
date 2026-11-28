(() => {
  const form = document.getElementById('daftar-email');
  const tombol = document.getElementById('btn-daftar');
  const sandi = document.getElementById('sandi');
  const ulang = document.getElementById('ulang');
  const errorUlang = document.getElementById('error-ulang');
  const errorDaftar = document.getElementById('error-daftar');

  ulang.addEventListener('input', () => {
    errorUlang.textContent = '';
    ulang.removeAttribute('aria-invalid');
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    errorDaftar.textContent = '';
    if (sandi.value !== ulang.value) {
      errorUlang.textContent = 'Sandi tidak sama.';
      ulang.setAttribute('aria-invalid', 'true');
      ulang.focus();
      return;
    }
    errorUlang.textContent = '';
    ulang.removeAttribute('aria-invalid');

    const name = document.getElementById('nama').value.trim();
    const email = document.getElementById('email').value.trim().toLowerCase();
    if (!name) {
      errorDaftar.textContent = 'Nama wajib diisi.';
      document.getElementById('nama').focus();
      return;
    }

    prosesForm(form, tombol, 'Mendaftar…', async () => {
      try {
        await NgumpulAuth.kirim('sign-up/email', { name, email, password: sandi.value });
        NgumpulAuth.mulaiVerifikasi(email);
        form.reset();
        location.assign('pages/auth/otp.html');
      } catch (error) {
        errorDaftar.textContent = NgumpulAuth.pesanError(error, 'Pendaftaran gagal. Coba lagi.');
      }
    });
  });
})();
