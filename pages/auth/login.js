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
  const tombolMasuk = document.getElementById("btn-masuk");
  const inputIdentifier = document.getElementById("login-identifier");
  const inputSandi = document.getElementById("login-sandi");
  const errIdentifier = document.getElementById("error-login-identifier");
  const errSandi = document.getElementById("error-login-sandi");

  // --- Alur UI lupa sandi ---
  const halamanReset = ["form-login", "form-reset-nomor", "form-reset-otp", "form-sandi-baru"];
  const inputNomorReset = document.getElementById("reset-nomor");
  const inputDigitReset = Array.from(document.querySelectorAll(".digit-reset"));
  const tombolVerifikasiReset = document.getElementById("btn-verifikasi-reset");
  let userReset = null;
  let kodeOtpReset = "";
  let timerNotifOtpReset;

  function tampilkanNotifOtpReset(kode) {
    const notif = document.getElementById("notif-otp-reset");
    document.getElementById("kode-otp-reset").textContent = kode;
    notif.classList.add("tampil");
    clearTimeout(timerNotifOtpReset);
    timerNotifOtpReset = setTimeout(() => notif.classList.remove("tampil"), 8000);
  }

  function bukaHalaman(id) {
    halamanReset.forEach((halaman) => {
      document.getElementById(halaman).classList.toggle("aktif", halaman === id);
    });
  }

  document.getElementById("tautan-lupa-sandi").addEventListener("click", (event) => {
    event.preventDefault();
    bukaHalaman("form-reset-nomor");
    inputNomorReset.focus();
  });

  document.querySelectorAll(".tombol-kembali").forEach((tombol) => {
    tombol.addEventListener("click", () => bukaHalaman(tombol.dataset.kembali));
  });

  document.getElementById("btn-kirim-otp-reset").addEventListener("click", () => {
    const error = document.getElementById("error-reset-nomor");
    const kontakReset = inputNomorReset.value.trim();
    error.textContent = "";

    if (!kontakReset) {
      error.textContent = "Nomor HP atau Gmail tidak boleh kosong.";
      inputNomorReset.focus();
      return;
    }
    const gmailValid = /^[^\s@]+@gmail\.com$/i.test(kontakReset);
    const nomorValid = /^[+\d][\d\s()-]{7,18}$/.test(kontakReset);
    if (!gmailValid && !nomorValid) {
      error.textContent = "Masukkan nomor HP yang valid atau alamat Gmail @gmail.com.";
      inputNomorReset.focus();
      return;
    }

    userReset = cariUser(kontakReset);
    if (!userReset) {
      error.textContent = "Akun dengan nomor HP atau Gmail tersebut tidak ditemukan.";
      inputNomorReset.focus();
      return;
    }

    const kontakTersamar = gmailValid
      ? kontakReset[0] + "•••@gmail.com"
      : "••••••" + kontakReset.replace(/\D/g, "").slice(-3);
    document.getElementById("reset-nomor-tersamar").textContent = kontakTersamar;
    kodeOtpReset = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
    inputDigitReset.forEach((input) => { input.value = ""; });
    document.getElementById("error-reset-otp").textContent = "";
    tampilkanNotifOtpReset(kodeOtpReset);
    tombolVerifikasiReset.disabled = true;
    bukaHalaman("form-reset-otp");
    inputDigitReset[0].focus();
  });

  function kodeResetTerisi() {
    tombolVerifikasiReset.disabled = inputDigitReset.some((input) => !input.value);
  }

  inputDigitReset.forEach((input, index) => {
    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "").slice(-1);
      document.getElementById("error-reset-otp").textContent = "";
      document.getElementById("kotak-otp-reset").classList.remove("salah");
      if (input.value && index < inputDigitReset.length - 1) {
        inputDigitReset[index + 1].focus();
      }
      kodeResetTerisi();
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Backspace" && !input.value && index > 0) {
        inputDigitReset[index - 1].focus();
      }
      if (event.key === "Enter" && !tombolVerifikasiReset.disabled) {
        tombolVerifikasiReset.click();
      }
    });
    input.addEventListener("paste", (event) => {
      event.preventDefault();
      const kode = (event.clipboardData || window.clipboardData)
        .getData("text").replace(/\D/g, "").slice(0, 6);
      inputDigitReset.forEach((digit, digitIndex) => {
        digit.value = kode[digitIndex] || "";
      });
      inputDigitReset[Math.min(kode.length, inputDigitReset.length - 1)].focus();
      kodeResetTerisi();
    });
  });

  tombolVerifikasiReset.addEventListener("click", () => {
    const kodeMasuk = inputDigitReset.map((input) => input.value).join("");
    if (kodeMasuk !== kodeOtpReset) {
      document.getElementById("error-reset-otp").textContent = "Kode OTP tidak sesuai.";
      document.getElementById("kotak-otp-reset").classList.add("salah");
      return;
    }
    document.getElementById("kotak-otp-reset").classList.remove("salah");
    bukaHalaman("form-sandi-baru");
    document.getElementById("reset-sandi-baru").focus();
  });

  document.getElementById("btn-simpan-sandi").addEventListener("click", async () => {
    const sandiBaru = document.getElementById("reset-sandi-baru");
    const konfirmasi = document.getElementById("reset-sandi-konfirmasi");
    const errorSandiBaru = document.getElementById("error-reset-sandi-baru");
    const errorKonfirmasi = document.getElementById("error-reset-sandi-konfirmasi");
    errorSandiBaru.textContent = "";
    errorKonfirmasi.textContent = "";

    if (!sandiBaru.value) {
      errorSandiBaru.textContent = "Sandi baru tidak boleh kosong.";
      sandiBaru.focus();
      return;
    }
    if (sandiBaru.value !== konfirmasi.value) {
      errorKonfirmasi.textContent = "Ulangi sandi dengan sama persis.";
      konfirmasi.focus();
      return;
    }

    const users = getUsers();
    const indexUser = users.findIndex((user) => user.id === userReset?.id);
    if (indexUser === -1) {
      errorSandiBaru.textContent = "Akun tidak ditemukan. Ulangi proses lupa sandi.";
      return;
    }

    users[indexUser].sandi = await hashSandi(sandiBaru.value);
    if (!simpanUsers(users)) {
      tampilkanToast("Sandi gagal disimpan. Silakan coba lagi.");
      return;
    }

    tampilkanToast("Sandi berhasil diubah. Silakan masuk dengan sandi baru.");
    sandiBaru.value = "";
    konfirmasi.value = "";
    inputNomorReset.value = "";
    inputDigitReset.forEach((input) => { input.value = ""; });
    userReset = null;
    kodeOtpReset = "";
    bukaHalaman("form-login");
  });

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