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
