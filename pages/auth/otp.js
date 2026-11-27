(() => {
  const email = NgumpulAuth.emailVerifikasi();
  if (!email) {
    location.replace('login.html');
    return;
  }

  const form = document.getElementById('verifikasi-email');
  const kode = document.getElementById('otp');
  const tombolVerifikasi = document.getElementById('btn-verifikasi');
  const kirimUlang = document.getElementById('btn-kirim-ulang');
  const statusOtp = document.getElementById('status-otp');
  const errorOtp = document.getElementById('error-otp');

  document.getElementById('email-verifikasi').textContent = email;
  form.addEventListener('submit', event => {
    event.preventDefault();
    statusOtp.textContent = '';
    errorOtp.textContent = '';
    prosesForm(form, tombolVerifikasi, 'Memverifikasi…', async () => {
      try {
        await NgumpulAuth.kirim('email-otp/verify-email', { email, otp: kode.value });
        location.replace('login.html?status=terverifikasi');
      } catch (error) {
        errorOtp.textContent = NgumpulAuth.pesanError(error, 'Verifikasi gagal. Coba lagi.');
        kode.select();
      }
    });
  });

  kirimUlang.addEventListener('click', () => {
    statusOtp.textContent = '';
    errorOtp.textContent = '';
    prosesForm(form, kirimUlang, 'Mengirim kode…', async () => {
      try {
        await NgumpulAuth.kirim('email-otp/send-verification-otp', { email, type: 'email-verification' });
        statusOtp.textContent = 'Kode baru sudah dikirim.';
        kode.value = '';
        kode.focus();
      } catch (error) {
        errorOtp.textContent = NgumpulAuth.pesanError(error, 'Kode gagal dikirim. Coba lagi.');
      }
    });
  });
})();
