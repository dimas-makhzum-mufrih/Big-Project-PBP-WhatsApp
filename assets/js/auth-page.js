(() => {
  const status = document.getElementById('status-sesi');
  const pesan = status.querySelector('p');
  const cobaLagi = status.querySelector('button');
  cobaLagi.addEventListener('click', () => location.reload());
  window.addEventListener('pageshow', event => {
    if (event.persisted) location.reload();
  });

  async function bukaHalaman() {
    try {
      if (!(await NgumpulAuth.pulihkanSesi())) {
        if (location.hash.includes('undangan-grup=')) {
          sessionStorage.setItem('ngumpul_undangan_tertunda', location.hash);
        }
        const friendCode = new URLSearchParams(location.hash.slice(1)).get('kode-teman');
        if (friendCode && /^[A-Za-z0-9_.-]{10,2048}$/.test(friendCode))
          sessionStorage.setItem('ngumpul_kode_teman_tertunda', friendCode);
        location.replace('../auth/login.html');
        return;
      }
    } catch (error) {
      pesan.textContent = NgumpulAuth.pesanError(error, 'Sesi gagal diperiksa. Coba lagi.');
      cobaLagi.hidden = false;
      return;
    }

    window.NgumpulTheme?.apply();

    // Skrip aplikasi berjalan sesuai urutan HTML setelah sesi diperiksa.
    const skrip = document.querySelectorAll('script[data-setelah-login]');
    try {
      await Promise.all(Array.from(skrip, placeholder => new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.async = false;
        script.src = placeholder.dataset.setelahLogin;
        script.onload = resolve;
        script.onerror = reject;
        placeholder.replaceWith(script);
      })));
      document.body.classList.remove('cek-sesi');
      document.dispatchEvent(new Event('ngumpul:halaman-siap'));
    } catch {
      pesan.textContent = 'Halaman gagal dimuat. Coba lagi.';
      cobaLagi.hidden = false;
    }
  }

  bukaHalaman();
})();
