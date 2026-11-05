// Login: cek email/nomor HP + sandi ke akun yang terdaftar (assets/js/storage.js),
// lalu simpan sesi per tab dan masuk ke dashboard.
document.addEventListener("DOMContentLoaded", () => {
  // --- Lihat / sembunyikan sandi ---
  document.querySelectorAll(".lihat").forEach((tombol) => {
    tombol.addEventListener("click", function () {
      const input = document.getElementById(this.getAttribute("data-target"));
      if (!input) return;
      if (input.type === "password") {
        input.type = "text";
        this.textContent = "Sembunyi";
      } else {
        input.type = "password";
        this.textContent = "Lihat";
      }
    });
  });

  // --- Elemen form ---
  const tombolMasuk = document.querySelector(".tombol");
  const inputIdentifier = document.getElementById("login-identifier");
  const inputSandi = document.getElementById("login-sandi");
  const errIdentifier = document.getElementById("error-login-identifier");
  const errSandi = document.getElementById("error-login-sandi");

  // --- Toast ---
  let timerToast;
  function tampilkanToast(pesan) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = pesan;
    el.classList.add("tampil");
    clearTimeout(timerToast);
    timerToast = setTimeout(() => el.classList.remove("tampil"), 3000);
  }

  // --- Proses masuk ---
  async function masuk() {
    errIdentifier.textContent = "";
    errSandi.textContent = "";

    const identitas = inputIdentifier.value.trim();
    let valid = true;
    if (!identitas) {
      errIdentifier.textContent = "Email atau Nomor HP tidak boleh kosong.";
      valid = false;
    }
    if (!inputSandi.value) {
      errSandi.textContent = "Kata sandi tidak boleh kosong.";
      valid = false;
    }
    if (!valid) {
      tampilkanToast("Silakan periksa kembali data Anda.");
      return;
    }

    tombolMasuk.disabled = true;
    const user = cariUser(identitas);
    const hash = await hashSandi(inputSandi.value);

    // pesan sengaja disamakan, supaya tidak membocorkan akun mana yang ada
    if (!user || user.sandi !== hash) {
      errSandi.textContent = "Akun tidak ditemukan atau sandi salah.";
      tampilkanToast("Gagal masuk.");
      tombolMasuk.disabled = false;
      return;
    }

    // akun belum lolos OTP -> arahkan ke halaman verifikasi
    if (!sudahVerifikasi(user)) {
      try {
        sessionStorage.setItem("ngumpul_pending", JSON.stringify({
          nama: user.nama,
          hp: user.hp,
          kode: user.hp.indexOf("+62") === 0 ? "+62" : "",
          email: user.email
        }));
      } catch (e) {}
      tampilkanToast("Akun belum diverifikasi. Mengalihkan ke OTP...");
      setTimeout(() => { window.location.href = "otp.html"; }, 1000);
      return;
    }

    setSesi(user.id);
    tampilkanToast("Berhasil masuk! Mengalihkan...");
    setTimeout(() => { window.location.href = "../dashboard/dashboard.html"; }, 800);
  }

  if (tombolMasuk) tombolMasuk.addEventListener("click", masuk);
  [inputIdentifier, inputSandi].forEach((el) => {
    el.addEventListener("keydown", (e) => { if (e.key === "Enter") masuk(); });
  });

  // sudah login di tab ini -> langsung ke dashboard
  if (getUserAktif()) window.location.replace("../dashboard/dashboard.html");
});