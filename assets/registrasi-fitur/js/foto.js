(function () {
  var gambar = new Image();
  gambar.onload = function () {
    document.documentElement.classList.add('ada-foto');
  };
  gambar.src = 'img/foto.jpg';
})();
