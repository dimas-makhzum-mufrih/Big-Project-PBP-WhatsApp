// foto.js
// Kalau img/foto.jpg ada, dia dipakai sebagai latar (menimpa latar.svg bawaan)
// dan gelembung chat hiasan disembunyikan, karena foto biasanya sudah ada chat-nya sendiri.
(function () {
  var gambar = new Image();
  gambar.onload = function () {
    document.documentElement.classList.add('ada-foto');
  };
  gambar.src = 'img/foto.jpg';
})();
