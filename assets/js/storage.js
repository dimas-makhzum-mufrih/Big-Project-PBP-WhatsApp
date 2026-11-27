var KEY_USERS = 'ngumpul_users';

function akunTeman(teman) {
  return {
    id: teman.userId,
    nama: NgumpulTeman.nama(teman),
    username: teman.username
  };
}

// Akun lokal lama tetap bisa dipakai untuk membaca riwayat chat dan grup.
function getUsers() {
  var daftar = new Map();
  try {
    var lokal = JSON.parse(localStorage.getItem(KEY_USERS));
    if (Array.isArray(lokal)) lokal.forEach(user => { if (user?.id) daftar.set(user.id, user); });
  } catch (e) {}

  if (typeof NgumpulTeman !== 'undefined') {
    NgumpulTeman.list().forEach(teman => daftar.set(teman.userId, akunTeman(teman)));
  }
  return Array.from(daftar.values());
}

function buatId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}


// bersihkan nomor hp
function digitNomor(teks, kode) {
  var x = teks.replace(/[^\d+]/g, '');
  if (x.startsWith('+' + kode)) {
    x = x.slice(kode.length + 1);
  } else if (x.startsWith('00' + kode)) {
    x = x.slice(kode.length + 2);
  } else if (kode === '62' && x.startsWith('62')) {
    x = x.slice(2);
  }
  return x.replace(/\D/g, '').replace(/^0+/, '');
}

// disimpan di akun: +6281234567890
function hpInternasional(kode, teks) {
  return '+' + kode + digitNomor(teks, kode);
}

// bandingkan 2 nomor, akun lama yang tersimpan "0812..." dianggap +62812...
function samakanHp(a, b) {
  if (!a || !b) return false;
  function baku(h) {
    if (h.charAt(0) === '+') return h;
    if (h.charAt(0) === '0') return '+62' + h.slice(1);
    return '+' + h;
  }
  return baku(a) === baku(b);
}


// =====================================================================
//  PROFIL PER AKUN
// =====================================================================
var KEY_PROFIL = 'ngumpul_profil';

function getUserById(id) {
  var aktif = getUserAktif();
  if (aktif?.id === id) return aktif;
  if (typeof NgumpulTeman !== 'undefined') {
    var teman = NgumpulTeman.get(id);
    if (teman) return akunTeman(teman);
  }
  return getUsers().find(user => user.id === id) || null;
}

function getUserAktif() {
  return NgumpulAuth.pengguna;
}

function bacaSemuaProfil() {
  try { return JSON.parse(localStorage.getItem(KEY_PROFIL)) || {}; } catch (e) { return {}; }
}

// profil akun; yang belum pernah diisi memakai nilai bawaan dari data akun
function getProfil(id) {
  var user = getUserById(id);
  var p = bacaSemuaProfil()[id] || {};
  var nama = p.nama || (user ? user.nama : '');
  var username = user?.username ? '@' + user.username : '';
  var akunApi = id === getUserAktif()?.id || (typeof NgumpulTeman !== 'undefined' && NgumpulTeman.get(id));
  if (!username && !akunApi) {
    var slug = String(nama).toLowerCase().replace(/[^a-z0-9]/g, '') || 'pengguna';
    username = p.username || '@' + slug;
  }
  return {
    nama: nama,
    username: username,
    bio: p.bio || 'Halo, aku pakai Ngumpul',
    phone: p.phone || user?.hp || ''
  };
}

function simpanProfil(id, data) {
  var semua = bacaSemuaProfil();
  semua[id] = data;
  try { localStorage.setItem(KEY_PROFIL, JSON.stringify(semua)); return true; } catch (e) { return false; }
}

// ===== Media profil (avatar & banner) + tautan sosmed: dipakai dashboard, kontak, edit profil =====
var KUNCI_MEDIA = 'ngumpul_media_';   // + id user -> { avatar, banner } (data URL hasil crop)
var KUNCI_SOSMED = 'ngumpul_sosmed_'; // + id user -> [{ id, nama, platform, url }]

function bacaMedia(idUser) {
  try { return JSON.parse(localStorage.getItem(KUNCI_MEDIA + idUser)) || {}; }
  catch (e) { return {}; }
}
