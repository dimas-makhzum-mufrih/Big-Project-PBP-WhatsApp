// splash.js
// Splash screen: tampil sebentar waktu aplikasi dibuka, lalu hilang sendiri.

var lamaSplash = 2200; // dalam milidetik

function tutupSplash() {
  var splash = document.getElementById('splash');
  if (!splash) return;

  splash.classList.add('hilang');

  // tunggu animasi fade selesai baru dibuang dari halaman
  setTimeout(function () {
    splash.remove();
  }, 500);
}

window.addEventListener('load', function () {
  setTimeout(tutupSplash, lamaSplash);
});

// kalau di-klik / ditekan, langsung lewati
document.getElementById('splash').addEventListener('click', tutupSplash);
