// Kompatibilitas untuk demo lewat alamat biasa (http://192.168.x.x atau file://), bukan localhost/HTTPS.
// Di konteks tidak aman, browser menghilangkan crypto.randomUUID sehingga UI grup gagal dimuat.
// Muat file ini PALING AWAL (sebelum script lain).
(function () {
  if (window.crypto && typeof window.crypto.randomUUID !== 'function' && typeof window.crypto.getRandomValues === 'function') {
    window.crypto.randomUUID = function () {
      var b = window.crypto.getRandomValues(new Uint8Array(16));
      b[6] = (b[6] & 15) | 64;
      b[8] = (b[8] & 63) | 128;
      var h = [];
      for (var i = 0; i < 16; i++) h.push(('0' + b[i].toString(16)).slice(-2));
      return h.slice(0, 4).join('') + '-' + h.slice(4, 6).join('') + '-' + h.slice(6, 8).join('') +
        '-' + h.slice(8, 10).join('') + '-' + h.slice(10).join('');
    };
  }
})();
