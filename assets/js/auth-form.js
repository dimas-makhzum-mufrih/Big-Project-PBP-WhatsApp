document.querySelectorAll('.lihat').forEach(tombol => {
  tombol.addEventListener('click', () => {
    const input = document.getElementById(tombol.dataset.target);
    const tampil = input.type === 'password';
    input.type = tampil ? 'text' : 'password';
    tombol.textContent = tampil ? 'Sembunyi' : 'Lihat';
  });
});

document.querySelectorAll('[data-google-login]').forEach(tautan => {
  tautan.href = NgumpulAuth.urlGoogle(tautan.dataset.googleLogin);
});

document.querySelectorAll('input[autocomplete="one-time-code"]').forEach(input => {
  input.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g, '').slice(0, 6);
  });
});

// Cegah pengiriman ganda, termasuk saat mengirim ulang kode.
async function prosesForm(form, tombol, label, tindakan) {
  if (form.getAttribute('aria-busy') === 'true') return;

  const teksAwal = tombol.textContent;
  form.setAttribute('aria-busy', 'true');
  form.querySelectorAll('button').forEach(button => { button.disabled = true; });
  tombol.textContent = label;
  try {
    await tindakan();
  } finally {
    form.removeAttribute('aria-busy');
    form.querySelectorAll('button').forEach(button => { button.disabled = false; });
    tombol.textContent = teksAwal;
  }
}
