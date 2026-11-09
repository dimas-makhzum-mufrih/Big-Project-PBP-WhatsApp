var negaraTerpilih = NEGARA[0]; // default: Indonesia (+62)

(function () {
  var tombol = document.getElementById('btn-negara');
  var panel = document.getElementById('daftar-negara');
  var cari = document.getElementById('cari-negara');
  var isi = document.getElementById('isi-negara');
  var inputHp = document.getElementById('hp');

  function render(filter) {
    var q = (filter || '').toLowerCase().replace('+', '').trim();
    isi.innerHTML = '';
    var ada = 0;
    NEGARA.forEach(function (n) {
      if (q && n[1].toLowerCase().indexOf(q) === -1 && n[2].indexOf(q) !== 0) return;
      ada++;
      var li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.dataset.kode = n[0];
      if (n === negaraTerpilih) li.className = 'dipilih';
      var img = document.createElement('img');
      img.className = 'bendera';
      img.loading = 'lazy';
      img.alt = '';
      img.src = 'assets/img/flags/' + n[0] + '.svg';
      var nama = document.createElement('span');
      nama.className = 'nama-negara';
      nama.textContent = n[1];
      var kode = document.createElement('span');
      kode.className = 'kode-negara';
      kode.textContent = '+' + n[2];
      li.appendChild(img);
      li.appendChild(nama);
      li.appendChild(kode);
      isi.appendChild(li);
    });
    if (ada === 0) {
      var kosong = document.createElement('li');
      kosong.className = 'kosong';
      kosong.textContent = 'Negara tidak ditemukan';
      isi.appendChild(kosong);
    }
  }

  function buka() {
    cari.value = '';
    render('');
    panel.hidden = false;
    tombol.setAttribute('aria-expanded', 'true');
    // di hp jangan langsung fokus, nanti keyboard menutupi daftar
    if (window.matchMedia('(hover: hover)').matches) cari.focus();
    var dipilih = isi.querySelector('.dipilih');
    if (dipilih) dipilih.scrollIntoView({ block: 'center' });
  }

  function tutup() {
    panel.hidden = true;
    tombol.setAttribute('aria-expanded', 'false');
  }

  function pilih(kodeBendera) {
    for (var i = 0; i < NEGARA.length; i++) {
      if (NEGARA[i][0] === kodeBendera) negaraTerpilih = NEGARA[i];
    }
    document.getElementById('bendera-terpilih').src = 'assets/img/flags/' + negaraTerpilih[0] + '.svg';
    document.getElementById('kode-terpilih').textContent = '+' + negaraTerpilih[2];
    inputHp.placeholder = negaraTerpilih[2] === '62' ? '81234567890' : 'Nomor telepon';
    tutup();
    inputHp.focus();
    // nomor yang sudah diketik dicek ulang sesuai negara baru
    if (inputHp.value !== '' && typeof cekKolom === 'function') cekKolom('hp');
  }

  tombol.addEventListener('click', function () {
    if (panel.hidden) buka(); else tutup();
  });

  cari.addEventListener('input', function () { render(cari.value); });

  cari.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      var pertama = isi.querySelector('li[data-kode]');
      if (pertama) pilih(pertama.dataset.kode);
    }
  });

  isi.addEventListener('click', function (e) {
    var li = e.target.closest('li[data-kode]');
    if (li) pilih(li.dataset.kode);
  });

  // klik di luar atau tekan Esc = tutup
  document.addEventListener('click', function (e) {
    if (!panel.hidden && !e.target.closest('.kolom-hp')) tutup();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) { tutup(); tombol.focus(); }
  });
})();