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

//jika klik skip
document.getElementById('splash').addEventListener('click', tutupSplash);
