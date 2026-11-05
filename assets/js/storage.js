var KEY_USERS = 'ngumpul_users';

// ambil semua akun
function getUsers() {
  try {
    var data = localStorage.getItem(KEY_USERS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

// simpan semua akun
function simpanUsers(list) {
  try {
    localStorage.setItem(KEY_USERS, JSON.stringify(list));
    return true;
  } catch (e) {
    return false;
  }
}

// sandi jangan disimpan polos
async function hashSandi(teks) {
  // crypto.subtle cuma jalan di https atau localhost
  if (!window.crypto || !crypto.subtle) {
    return 'b64:' + btoa(unescape(encodeURIComponent(teks)));
  }
  var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(teks));
  var hasil = '';
  new Uint8Array(buf).forEach(function (b) {
    hasil += b.toString(16).padStart(2, '0');
  });
  return hasil;
}

// ubah +6281.. / 6281.. / 0812-xxxx ke 0812xxxx
function rapikanHp(hp) {
  var x = hp.replace(/[\s\-().]/g, '');
  if (x.startsWith('+62')) {
    x = '0' + x.slice(3);
  } else if (x.startsWith('62')) {
    x = '0' + x.slice(2);
  }
  return x;
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
  function baku(h) {
    if (h.charAt(0) === '+') return h;
    if (h.charAt(0) === '0') return '+62' + h.slice(1);
    return '+' + h;
  }
  return baku(a) === baku(b);
}


// =====================================================================
//  SESI & PROFIL PER AKUN
//  Sesi disimpan di sessionStorage (per TAB): dua tab bisa login sebagai
//  dua akun berbeda sekaligus, dan tab yang ditutup otomatis logout.
//  Profil disimpan di localStorage, satu entri per id akun.
// =====================================================================
var KEY_SESI = 'ngumpul_sesi';             // id akun yang sedang login di tab ini
var KEY_PROFIL = 'ngumpul_profil';         // { idAkun: { nama, username, bio, phone } }
var KEY_VERIFIKASI = 'ngumpul_terverifikasi';

function getUserById(id) {
  var users = getUsers();
  for (var i = 0; i < users.length; i++) {
    if (users[i].id === id) return users[i];
  }
  return null;
}

// cari akun dari email ATAU nomor HP (0812.., 812.., +62812.. semua dikenali)
function cariUser(identitas) {
  var t = String(identitas || '').trim();
  var users = getUsers();
  var i;
  if (t.indexOf('@') !== -1) {
    var email = t.toLowerCase();
    for (i = 0; i < users.length; i++) {
      if (users[i].email === email) return users[i];
    }
    return null;
  }
  var x = t.replace(/[^\d+]/g, '');
  var hp;
  if (x.charAt(0) === '+') hp = x;
  else if (x.indexOf('00') === 0) hp = '+' + x.slice(2);
  else if (x.charAt(0) === '0') hp = '+62' + x.slice(1);
  else hp = '+62' + x;
  for (i = 0; i < users.length; i++) {
    if (samakanHp(users[i].hp, hp)) return users[i];
  }
  return null;
}

// sudah lolos OTP? (kunci = digit nomor HP internasional, tanpa +)
function sudahVerifikasi(user) {
  var daftar = {};
  try { daftar = JSON.parse(localStorage.getItem(KEY_VERIFIKASI)) || {}; } catch (e) {}
  return !!daftar[String(user.hp).replace(/\D/g, '')];
}

function setSesi(id) {
  try { sessionStorage.setItem(KEY_SESI, id); } catch (e) {}
}
function hapusSesi() {
  try { sessionStorage.removeItem(KEY_SESI); } catch (e) {}
}
// akun yang sedang login di tab ini, atau null kalau belum login
function getUserAktif() {
  var id = null;
  try { id = sessionStorage.getItem(KEY_SESI); } catch (e) {}
  return id ? getUserById(id) : null;
}

function bacaSemuaProfil() {
  try { return JSON.parse(localStorage.getItem(KEY_PROFIL)) || {}; } catch (e) { return {}; }
}

// profil akun; yang belum pernah diisi memakai nilai bawaan dari data akun
function getProfil(id) {
  var user = getUserById(id);
  var p = bacaSemuaProfil()[id] || {};
  var nama = p.nama || (user ? user.nama : '');
  var slug = String(nama).toLowerCase().replace(/[^a-z0-9]/g, '') || 'pengguna';
  return {
    nama: nama,
    username: p.username || '@' + slug,
    bio: p.bio || 'Halo, aku pakai Ngumpul',
    phone: p.phone || (user ? user.hp : '')
  };
}

function simpanProfil(id, data) {
  var semua = bacaSemuaProfil();
  semua[id] = data;
  try { localStorage.setItem(KEY_PROFIL, JSON.stringify(semua)); return true; } catch (e) { return false; }
}