// halaman awal, form daftar, atau halaman sukses
var semuaHalaman = ['halaman-awal', 'form-daftar', 'halaman-sukses'];

function tampilHalaman(id) {
  semuaHalaman.forEach(function (h) {
    document.getElementById(h).classList.toggle('aktif', h === id);
  });

  // mode form
  document.getElementById('layar').classList.toggle('mode-form', id === 'form-daftar');

  window.scrollTo(0, 0);
}

// Ambil parameter GET halaman dari URL
var params = new URLSearchParams(window.location.search);
var halaman = params.get('halaman');

// Tentukan halaman default
if (semuaHalaman.includes(halaman)) {
  tampilHalaman(halaman);
} else {
  tampilHalaman('halaman-awal');
}

// Tombol buat akun
document.getElementById('btn-buat').addEventListener('click', function () {
  tampilHalaman('form-daftar');
  document.getElementById('nama').focus();
});

// Tombol kembali
document.getElementById('btn-kembali').addEventListener('click', function () {
  tampilHalaman('halaman-awal');
});