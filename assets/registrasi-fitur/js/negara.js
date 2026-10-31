var NEGARA = [
  ["id", "Indonesia", "62"],
  ["za", "Afrika Selatan", "27"],
  ["us", "Amerika Serikat", "1"],
  ["sa", "Arab Saudi", "966"],
  ["ar", "Argentina", "54"],
  ["au", "Australia", "61"],
  ["at", "Austria", "43"],
  ["bh", "Bahrain", "973"],
  ["bd", "Bangladesh", "880"],
  ["nl", "Belanda", "31"],
  ["be", "Belgia", "32"],
  ["br", "Brasil", "55"],
  ["bn", "Brunei", "673"],
  ["cl", "Cile", "56"],
  ["dk", "Denmark", "45"],
  ["et", "Etiopia", "251"],
  ["ph", "Filipina", "63"],
  ["fi", "Finlandia", "358"],
  ["gh", "Ghana", "233"],
  ["hk", "Hong Kong", "852"],
  ["in", "India", "91"],
  ["gb", "Inggris", "44"],
  ["ie", "Irlandia", "353"],
  ["it", "Italia", "39"],
  ["jp", "Jepang", "81"],
  ["de", "Jerman", "49"],
  ["kh", "Kamboja", "855"],
  ["ca", "Kanada", "1"],
  ["ke", "Kenya", "254"],
  ["co", "Kolombia", "57"],
  ["kr", "Korea Selatan", "82"],
  ["kw", "Kuwait", "965"],
  ["la", "Laos", "856"],
  ["my", "Malaysia", "60"],
  ["ma", "Maroko", "212"],
  ["mx", "Meksiko", "52"],
  ["eg", "Mesir", "20"],
  ["mm", "Myanmar", "95"],
  ["np", "Nepal", "977"],
  ["ng", "Nigeria", "234"],
  ["no", "Norwegia", "47"],
  ["om", "Oman", "968"],
  ["pk", "Pakistan", "92"],
  ["pe", "Peru", "51"],
  ["pl", "Polandia", "48"],
  ["pt", "Portugal", "351"],
  ["fr", "Prancis", "33"],
  ["qa", "Qatar", "974"],
  ["ru", "Rusia", "7"],
  ["nz", "Selandia Baru", "64"],
  ["sg", "Singapura", "65"],
  ["es", "Spanyol", "34"],
  ["lk", "Sri Lanka", "94"],
  ["se", "Swedia", "46"],
  ["ch", "Swiss", "41"],
  ["tw", "Taiwan", "886"],
  ["th", "Thailand", "66"],
  ["tl", "Timor Leste", "670"],
  ["cn", "Tiongkok", "86"],
  ["tr", "Turki", "90"],
  ["ua", "Ukraina", "380"],
  ["ae", "Uni Emirat Arab", "971"],
  ["vn", "Vietnam", "84"],
  ["jo", "Yordania", "962"]
];

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
      img.src = 'img/flags/' + n[0] + '.svg';
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
    document.getElementById('bendera-terpilih').src = 'img/flags/' + negaraTerpilih[0] + '.svg';
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
