// register.js
// Fitur 1: registrasi akun (nama, no hp, email, sandi)

var daftarKolom = ['nama', 'hp', 'email', 'sandi', 'ulang'];

// ---------- validasi ----------
// tiap fungsi return pesan error, kalau aman return string kosong
var cek = {
  nama: function (v) {
    v = v.trim();
    if (v === '') return 'Nama wajib diisi';
    if (v.length < 3) return 'Nama minimal 3 karakter';
    if (v.length > 30) return 'Nama maksimal 30 karakter';
    return '';
  },

  hp: function (v) {
    if (v.trim() === '') return 'Nomor HP wajib diisi';
    var angka = digitNomor(v, negaraTerpilih[2]);
    if (negaraTerpilih[2] === '62') {
      // Indonesia: diawali 8, total 9 sampai 12 angka (tanpa 0 / +62 di depan)
      if (!/^8\d{8,11}$/.test(angka)) return 'Nomor HP tidak valid, contoh: 81234567890';
    } else if (!/^\d{6,14}$/.test(angka)) {
      return 'Nomor HP tidak valid';
    }
    return '';
  },

  email: function (v) {
    v = v.trim();
    if (v === '') return 'Email wajib diisi';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Format email belum benar';
    return '';
  },

  sandi: function (v) {
    if (v === '') return 'Sandi wajib diisi';
    if (v.length < 8) return 'Sandi minimal 8 karakter';
    if (!/[a-zA-Z]/.test(v) || !/\d/.test(v)) return 'Sandi harus gabungan huruf dan angka';
    return '';
  },

  ulang: function (v) {
    if (v === '') return 'Ketik ulang sandi kamu';
    if (v !== document.getElementById('sandi').value) return 'Sandi tidak sama';
    return '';
  }
};

// ---------- tampilan ----------
function tampilError(id, pesan) {
  document.getElementById('error-' + id).textContent = pesan;
  document.getElementById(id).classList.toggle('salah', pesan !== '');
}

// cek 1 kolom, sekalian tampilkan errornya
function cekKolom(id) {
  var pesan = cek[id](document.getElementById(id).value);
  tampilError(id, pesan);
  return pesan;
}

var timerToast;
function toast(teks) {
  var el = document.getElementById('toast');
  el.textContent = teks;
  el.style.display = 'block';
  clearTimeout(timerToast);
  timerToast = setTimeout(function () {
    el.style.display = 'none';
  }, 2000);
}

// ---------- proses daftar ----------
async function daftar() {
  // cek semua kolom, fokus ke kolom salah yang paling atas
  var kolomSalah = null;
  daftarKolom.forEach(function (id) {
    if (cekKolom(id) !== '' && kolomSalah === null) {
      kolomSalah = id;
    }
  });

  if (kolomSalah !== null) {
    document.getElementById(kolomSalah).focus();
    toast('Cek lagi isian kamu ya');
    return;
  }

  var nama = document.getElementById('nama').value.trim();
  var hp = hpInternasional(negaraTerpilih[2], document.getElementById('hp').value);
  var email = document.getElementById('email').value.trim().toLowerCase();
  var sandi = document.getElementById('sandi').value;

  // nomor hp dan email tidak boleh kembar
  var users = getUsers();
  for (var i = 0; i < users.length; i++) {
    if (samakanHp(users[i].hp, hp)) {
      tampilError('hp', 'Nomor HP ini sudah terdaftar');
      document.getElementById('hp').focus();
      return;
    }
    if (users[i].email === email) {
      tampilError('email', 'Email ini sudah terdaftar');
      document.getElementById('email').focus();
      return;
    }
  }

  // kunci tombol biar tidak kepencet dua kali
  var tombol = document.getElementById('btn-daftar');
  tombol.disabled = true;
  tombol.textContent = 'Memproses...';

  var userBaru = {
    id: buatId(),
    nama: nama,
    hp: hp,
    negara: negaraTerpilih[0],
    email: email,
    sandi: await hashSandi(sandi),
    dibuat: Date.now()
  };
  users.push(userBaru);

  if (!simpanUsers(users)) {
    toast('Gagal menyimpan data, coba lagi');
    tombol.disabled = false;
    tombol.textContent = 'Daftar';
    return;
  }

  tampilSukses(userBaru);
}

function tampilSukses(user) {
  tampilHalaman('halaman-sukses');
  document.getElementById('pesan-sukses').textContent =
    'Halo, ' + user.nama + '! Akun kamu sudah terdaftar dengan nomor ' + user.hp + '.';
}

// ---------- pasang event ----------
daftarKolom.forEach(function (id) {
  var input = document.getElementById(id);

  // cek pas keluar dari kolom
  input.addEventListener('blur', function () {
    if (input.value !== '') cekKolom(id);
  });

  // kalau lagi merah, cek ulang biar merahnya hilang pas sudah benar
  input.addEventListener('input', function () {
    if (input.classList.contains('salah')) cekKolom(id);
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') daftar();
  });
});

// tombol lihat / sembunyikan sandi
document.querySelectorAll('.lihat').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var input = document.getElementById(btn.dataset.target);
    if (input.type === 'password') {
      input.type = 'text';
      btn.textContent = 'Sembunyi';
    } else {
      input.type = 'password';
      btn.textContent = 'Lihat';
    }
  });
});

document.getElementById('btn-daftar').addEventListener('click', daftar);

// TODO: arahkan ke halaman chat kalau halaman utamanya sudah jadi
document.getElementById('btn-mulai').addEventListener('click', function () {
  toast('Halaman chat belum dibuat');
});

