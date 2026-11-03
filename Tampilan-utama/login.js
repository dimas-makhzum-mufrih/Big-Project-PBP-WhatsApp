document.addEventListener("DOMContentLoaded", () => {
  // --- Fitur 1: Sembunyikan / Tampilkan Kata Sandi ---
  const tombolLihat = document.querySelectorAll(".lihat");

  tombolLihat.forEach((tombol) => {
    tombol.addEventListener("click", function () {
      const targetId = this.getAttribute("data-target");
      const inputSandi = document.getElementById(targetId);

      if (inputSandi) {
        if (inputSandi.type === "password") {
          inputSandi.type = "text";
          this.textContent = "Sembunyi";
        } else {
          inputSandi.type = "password";
          this.textContent = "Lihat";
        }
      }
    });
  });

  // --- Fitur 2: Intersepsi & Validasi Form Masuk ---
  const tombolMasuk = document.querySelector(".tombol");
  const inputIdentifier = document.getElementById("login-identifier");
  const inputSandi = document.getElementById("login-sandi");
  const errIdentifier = document.getElementById("error-login-identifier");
  const errSandi = document.getElementById("error-login-sandi");

  if (tombolMasuk) {
    // Menghapus atribut inline 'onclick' bawaan HTML agar bisa diatur penuh via JS
    tombolMasuk.removeAttribute("onclick");

    tombolMasuk.addEventListener("click", (e) => {
      let valid = true;

      // Reset pesan error sebelumnya
      errIdentifier.textContent = "";
      errSandi.textContent = "";

      // Validasi Input Identitas (Email / No HP)
      if (!inputIdentifier.value.trim()) {
        errIdentifier.textContent = "Email atau Nomor HP tidak boleh kosong.";
        valid = false;
      } else if (inputIdentifier.value.trim().length < 4) {
        errIdentifier.textContent = "Masukkan identitas akun yang valid.";
        valid = false;
      }

      // Validasi Input Kata Sandi
      if (!inputSandi.value) {
        errSandi.textContent = "Kata sandi tidak boleh kosong.";
        valid = false;
      } else if (inputSandi.value.length < 6) {
        errSandi.textContent = "Kata sandi minimal berisi 6 karakter.";
        valid = false;
      }

      // Jika validasi sukses, arahkan halaman atau simpan status login jika diperlukan
      if (valid) {
        tampilkanToast("Berhasil masuk! Mengalihkan...");
        
        // Simulasi delay sedikit untuk animasi toast sebelum pindah halaman
        setTimeout(() => {
          window.location.href = "beranda.html";
        }, 1200);
      } else {
        tampilkanToast("Silakan periksa kembali data Anda.");
      }
    });
  }

  // --- Fitur Tambahan: Toast Notification System ---
  function tampilkanToast(pesan) {
    const wadahToast = document.getElementById("toast");
    if (wadahToast) {
      wadahToast.textContent = pesan;
      wadahToast.classList.add("tampil");

      // Hilangkan otomatis setelah 3 detik
      setTimeout(() => {
        wadahToast.classList.remove("tampil");
      }, 3000);
    }
  }
});
