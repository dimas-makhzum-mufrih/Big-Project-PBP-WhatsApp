// ===== Penjaga: harus login dulu =====
const userAktif = getUserAktif();

if (!userAktif) {
    if (location.hash.includes('undangan-grup=')) sessionStorage.setItem('ngumpul_undangan_tertunda', location.hash);
    location.replace('../auth/login.html');
}

function buatIndikatorStatusPesan(nilai) {
    const item = { status: nilai };
    const status = document.createElement('span');
    status.className = 'message-status' + (item.status === 'dibaca' ? ' dibaca' : '');
    const sudahDiterima = item.status === 'diterima' || item.status === 'dibaca';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('message-status-icon');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', sudahDiterima
        ? 'M2.305,11.235a1,1,0,0,1,1.414.024l3.206,3.319L14.3,7.289A1,1,0,0,1,15.7,8.711l-8.091,8a1,1,0,0,1-.7.289H6.9a1,1,0,0,1-.708-.3L2.281,12.649A1,1,0,0,1,2.305,11.235ZM20.3,7.289l-7.372,7.289-.263-.273a1,1,0,1,0-1.438,1.39l.966,1a1,1,0,0,0,.708.3h.011a1,1,0,0,0,.7-.289l8.091-8A1,1,0,0,0,20.3,7.289Z'
        : 'M2.305,11.235a1,1,0,0,1,1.414.024l3.206,3.319L14.3,7.289A1,1,0,0,1,15.7,8.711l-8.091,8a1,1,0,0,1-.7.289H6.9a1,1,0,0,1-.708-.3L2.281,12.649A1,1,0,0,1,2.305,11.235Z');
    svg.appendChild(path);
    status.appendChild(svg);
    status.setAttribute('aria-label', 'Status pesan: ' + (
        item.status === 'dibaca' ? 'Dibaca' : sudahDiterima ? 'Diterima' : 'Terkirim'
    ));
    return status;
}

// ===== Fitur Chat =====
const KEY_CHAT = 'ngumpul_pesan';
const KEY_DRAF_CHAT = 'ngumpul_draf_chat_';
const KEY_PIN_PESAN = 'ngumpul_pesan_tersemat';
const KEY_BLOKIR = 'ngumpul_blokir_';
const panelChatKosong = document.getElementById('panel-chat-kosong');
const panelChatAktif = document.getElementById('panel-chat-aktif');
const boxListPesan = document.getElementById('box-list-pesan');
const btnUnpinMessage = document.getElementById('btn-unpin-message');
const inputTeksKirim = document.getElementById('input-teks-kirim');
const btnKirimPesan = document.getElementById('btn-kirim-pesan');
const inputCariChat = document.getElementById('input-cari-chat');
const inputCariPesan = document.getElementById('input-cari-pesan');
const panelCariPesan = document.getElementById('panel-cari-pesan');
const hasilCariPesan = document.getElementById('hasil-cari-pesan');
const btnToggleCariPesan = document.getElementById('btn-toggle-cari-pesan');
const btnTutupCariPesan = document.getElementById('btn-tutup-cari-pesan');
const chatScrollArea = document.querySelector('.chat-scroll-area');
const avatarHeaderKanan = document.getElementById('avatar-header-kanan');
const namaHeaderKanan = document.getElementById('nama-header-kanan');
const btnBlokirPengguna = document.getElementById('btn-blokir-pengguna');
const btnSimpanKontakChat = document.getElementById('btn-simpan-kontak-chat');
const btnInfoPengguna = document.getElementById('btn-info-pengguna');
const panelInfoPengguna = document.getElementById('panel-info-pengguna');
let chatAktifId = null;
let timerSorotPesanCari = null;

function kunciDrafChat(idLawan) {
    return KEY_DRAF_CHAT + JSON.stringify([String(userAktif.id), String(idLawan)]);
}

function bacaDrafChat(idLawan) {
    if (!userAktif || !idLawan) return null;
    try {
        const draf = JSON.parse(localStorage.getItem(kunciDrafChat(idLawan)));
        return draf && typeof draf.teks === 'string' && draf.teks.trim() ? draf : null;
    } catch (error) {
        return null;
    }
}

function simpanDrafChat(idLawan, teks) {
    if (!userAktif || !idLawan) return false;
    try {
        const kunci = kunciDrafChat(idLawan);
        if (!String(teks || '').trim()) localStorage.removeItem(kunci);
        else localStorage.setItem(kunci, JSON.stringify({ teks, waktu: new Date().toISOString() }));
        return true;
    } catch (error) {
        return false;
    }
}

if (btnUnpinMessage) {
    btnUnpinMessage.addEventListener('click', () => {
        if (!chatAktifId) return;
        const berhasil = hapusPinPesan(chatAktifId);
        if (berhasil) {
            renderPinPesanAktif();
        }
    });
}

// Klik bilah "Pesan Disematkan" = lompat ke pesan aslinya
const barSematan = document.getElementById('pinned-message-container');
function lompatKePesanSemat() {
    if (!chatAktifId) return;
    const idPin = ambilPinPesan(chatAktifId);
    const baris = idPin && [...boxListPesan.children].find(el => el.dataset.messageId === idPin);
    if (!baris) return;
    baris.scrollIntoView({ block: 'center', behavior: 'smooth' });
    baris.classList.remove('pesan-cari-terpilih');
    void baris.offsetWidth;
    baris.classList.add('pesan-cari-terpilih');
    baris.addEventListener('animationend', () => baris.classList.remove('pesan-cari-terpilih'), { once: true });
}
if (barSematan) {
    barSematan.addEventListener('click', event => {
        if (event.target.closest('#btn-unpin-message')) return;
        lompatKePesanSemat();
    });
    barSematan.addEventListener('keydown', event => {
        if (event.target !== barSematan || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        lompatKePesanSemat();
    });
}

function buatIdPesan() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatNomorTampil(nomor) {
    const digits = String(nomor || '').replace(/\D/g, '');
    if (digits.startsWith('62') && digits.length >= 5) {
        const lokal = digits.slice(2);
        const kelompok = lokal.match(/.{1,4}/g) || [];
        // Kelompok pertama nomor Indonesia biasanya tiga digit; sisanya empat digit.
        if (kelompok.length > 1 && kelompok[0].length === 4) {
            kelompok[0] = kelompok[0].slice(0, 3);
            kelompok[1] = lokal.slice(3, 7);
            kelompok.splice(2, kelompok.length, ...((lokal.slice(7).match(/.{1,4}/g)) || []));
        }
        return '+62 ' + kelompok.join('-');
    }
    return String(nomor || '');
}

function ambilFotoProfilChat(idUser) {
    try {
        const media = JSON.parse(localStorage.getItem('ngumpul_media_' + idUser)) || {};
        return typeof media.avatar === 'string' && media.avatar.startsWith('data:image/')
            ? media.avatar
            : '';
    } catch (error) {
        return '';
    }
}

function ambilBannerProfilChat(idUser) {
    try {
        const media = JSON.parse(localStorage.getItem('ngumpul_media_' + idUser)) || {};
        return typeof media.banner === 'string' && media.banner.startsWith('data:image/') ? media.banner : '';
    } catch (error) { return ''; }
}

function tampilkanAvatarChat(container, idUser, nama) {
    const inisial = (nama || '?').trim().charAt(0).toUpperCase() || '?';
    const foto = ambilFotoProfilChat(idUser);
    container.replaceChildren();
    if (foto) {
        const img = document.createElement('img');
        img.src = foto;
        img.alt = '';
        container.appendChild(img);
        container.setAttribute('aria-label', nama);
        return;
    }
    container.removeAttribute('aria-label');
    // nama berupa nomor (belum jadi kontak) -> ikon orang, bukan tanda "+"
    if (!/^\p{L}/u.test((nama || '').trim())) {
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('class', 'ikon');
        svg.setAttribute('aria-hidden', 'true');
        const pakai = document.createElementNS(ns, 'use');
        pakai.setAttribute('href', '#i-user');
        svg.appendChild(pakai);
        container.appendChild(svg);
        return;
    }
    container.textContent = inisial;
}

function bacaSemuaChat() {
    try {
        return JSON.parse(localStorage.getItem(KEY_CHAT)) || {};
    } catch (error) {
        return {};
    }
}

// ===== Penyimpanan Gambar Tanpa Batas Ukuran (IndexedDB + Sinkronisasi localStorage) =====
const DB_MEDIA_CHAT = 'ngumpul_chat_media_db';
const STORE_MEDIA_CHAT = 'gambar';
const cacheUrlGambar = new Map();
let janjiDbMedia = null;

function bukaDbMediaChat() {
    if (janjiDbMedia) return janjiDbMedia;
    janjiDbMedia = new Promise(resolve => {
        if (!window.indexedDB) {
            resolve(null);
            return;
        }
        try {
            const req = indexedDB.open(DB_MEDIA_CHAT, 1);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(STORE_MEDIA_CHAT)) {
                    db.createObjectStore(STORE_MEDIA_CHAT);
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        } catch (e) {
            resolve(null);
        }
    });
    return janjiDbMedia;
}

async function simpanGambarIdb(imageId, blobAtauDataUrl) {
    if (!imageId || !blobAtauDataUrl) return false;
    const db = await bukaDbMediaChat();
    if (!db) return false;
    return new Promise(resolve => {
        try {
            const tx = db.transaction(STORE_MEDIA_CHAT, 'readwrite');
            tx.objectStore(STORE_MEDIA_CHAT).put(blobAtauDataUrl, imageId);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
        } catch (e) {
            resolve(false);
        }
    });
}

async function ambilGambarIdb(imageId) {
    if (!imageId) return '';
    if (cacheUrlGambar.has(imageId)) return cacheUrlGambar.get(imageId);
    const db = await bukaDbMediaChat();
    if (!db) return '';
    return new Promise(resolve => {
        try {
            const tx = db.transaction(STORE_MEDIA_CHAT, 'readonly');
            const req = tx.objectStore(STORE_MEDIA_CHAT).get(imageId);
            req.onsuccess = () => {
                const hasil = req.result;
                if (!hasil) {
                    resolve('');
                    return;
                }
                if (typeof hasil === 'string') {
                    cacheUrlGambar.set(imageId, hasil);
                    resolve(hasil);
                    return;
                }
                if (hasil instanceof Blob) {
                    const url = URL.createObjectURL(hasil);
                    cacheUrlGambar.set(imageId, url);
                    resolve(url);
                    return;
                }
                resolve('');
            };
            req.onerror = () => resolve('');
        } catch (e) {
            resolve('');
        }
    });
}

// Buat pratinjau ringan agar langsung tampil instan lintas tab, sedangkan file asli disimpan utuh di IndexedDB
function buatPreviewRinganDataUrl(file) {
    return new Promise(resolve => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            try {
                const maksSisi = 720;
                let w = img.naturalWidth || img.width || 1;
                let h = img.naturalHeight || img.height || 1;
                if (w > maksSisi || h > maksSisi) {
                    if (w >= h) {
                        h = Math.max(1, Math.round((h * maksSisi) / w));
                        w = maksSisi;
                    } else {
                        w = Math.max(1, Math.round((w * maksSisi) / h));
                        h = maksSisi;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                URL.revokeObjectURL(url);
                resolve(canvas.toDataURL('image/jpeg', 0.72));
            } catch (e) {
                URL.revokeObjectURL(url);
                resolve('');
            }
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve('');
        };
        img.src = url;
    });
}

function simpanSemuaChat(data) {
    try {
        localStorage.setItem(KEY_CHAT, JSON.stringify(data));
        return true;
    } catch (error) {
        // Jika localStorage penuh karena banyak gambar, lepaskan data URL pratinjau
        // dari pesan yang gambar utuhnya sudah tersimpan di IndexedDB (imageId), lalu simpan ulang.
        try {
            const salinan = {};
            Object.keys(data || {}).forEach(kunci => {
                const daftar = Array.isArray(data[kunci]) ? data[kunci] : [];
                salinan[kunci] = daftar.map(pesan => {
                    if (pesan && pesan.imageId && pesan.image) {
                        const ringkas = Object.assign({}, pesan, { hasImage: true });
                        delete ringkas.image;
                        return ringkas;
                    }
                    return pesan;
                });
            });
            localStorage.setItem(KEY_CHAT, JSON.stringify(salinan));
            return true;
        } catch (errKedua) {
            console.warn('Tidak dapat menyimpan chat:', errKedua);
            return false;
        }
    }
}

function isPesanBergambar(item) {
    return Boolean(item && (item.hasImage || item.image || item.imageId));
}

function formatPreviewPesan(terakhir) {
    if (!terakhir) return 'Mulai chat baru';
    const teks = (terakhir.text || '').trim();
    if (isPesanBergambar(terakhir)) {
        return teks || 'Foto';
    }
    return teks || 'Mulai chat baru';
}

function daftarBlokir(idPengguna) {
    try {
        const data = JSON.parse(localStorage.getItem(KEY_BLOKIR + idPengguna)) || [];
        return Array.isArray(data) ? data.map(String) : [];
    } catch (error) { return []; }
}

function penggunaDiblokir(idPengguna, idLawan) {
    return daftarBlokir(idPengguna).includes(String(idLawan));
}

// true kalau salah satu pihak memblokir (dipakai untuk menahan pesan teks DAN gambar)
function chatTerblokir(idLawan) {
    if (!userAktif || !idLawan) return false;
    return penggunaDiblokir(userAktif.id, idLawan) || penggunaDiblokir(idLawan, userAktif.id);
}

function ubahBlokir(idLawan, blokir) {
    if (!userAktif || !idLawan) return;
    const daftar = daftarBlokir(userAktif.id).filter(id => id !== String(idLawan));
    if (blokir) daftar.push(String(idLawan));
    try { localStorage.setItem(KEY_BLOKIR + userAktif.id, JSON.stringify(daftar)); }
    catch (error) { return; }
    renderChatList();
    if (chatAktifId === idLawan) perbaruiKontrolBlokir();
}

function perbaruiKontrolBlokir() {
    if (!btnBlokirPengguna || !chatAktifId) return;
    const diblokir = penggunaDiblokir(userAktif.id, chatAktifId);
    const memblokir = penggunaDiblokir(chatAktifId, userAktif.id);
    btnBlokirPengguna.textContent = diblokir ? 'Buka blokir' : 'Blokir';
    btnBlokirPengguna.disabled = !diblokir && memblokir;
    btnBlokirPengguna.title = memblokir && !diblokir ? 'Pengguna ini memblokir kamu' : '';
    if (inputTeksKirim) inputTeksKirim.disabled = diblokir || memblokir;
    if (btnKirimPesan) btnKirimPesan.disabled = diblokir || memblokir;
    // plus (lampiran) dan mic ikut mati saat diblokir
    ['btn-lampir', 'btn-mic'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = diblokir || memblokir;
    });
    if (diblokir || memblokir) {
        const panel = document.getElementById('panel-lampiran');
        if (panel) panel.hidden = true;
    }
}

function perbaruiKontrolKontak() {
    if (!btnSimpanKontakChat || !chatAktifId) return;
    btnSimpanKontakChat.hidden = namaKontakTersimpan(chatAktifId);
}

function formatJamPesan(isoString) {
    if (!isoString) return '';
    const waktu = new Date(isoString);
    if (Number.isNaN(waktu.getTime())) return '';
    return waktu.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function kunciKonversasi(idA, idB) {
    return [String(idA), String(idB)].sort().join('_');
}

function ambilPesanChat(idLawan) {
    if (!userAktif || !idLawan) return [];
    const semua = bacaSemuaChat();
    const kunci = kunciKonversasi(userAktif.id, idLawan);
    const pesan = semua[kunci];
    return Array.isArray(pesan) ? pesan : [];
}

function simpanPesanChat(idLawan, daftarPesan) {
    if (!userAktif || !idLawan) return false;
    const semua = bacaSemuaChat();
    const kunci = kunciKonversasi(userAktif.id, idLawan);
    semua[kunci] = Array.isArray(daftarPesan) ? daftarPesan : [];
    return simpanSemuaChat(semua);
}

function bacaSemuaPinPesan() {
    try {
        return JSON.parse(localStorage.getItem(KEY_PIN_PESAN)) || {};
    } catch (error) {
        return {};
    }
}

function simpanSemuaPinPesan(data) {
    try {
        localStorage.setItem(KEY_PIN_PESAN, JSON.stringify(data));
        return true;
    } catch (error) {
        console.warn('Tidak dapat menyimpan pesan sematan:', error);
        return false;
    }
}

function ambilPinPesan(idLawan) {
    if (!userAktif || !idLawan) return null;
    const semuaPin = bacaSemuaPinPesan();
    const kunci = kunciKonversasi(userAktif.id, idLawan);
    return semuaPin[kunci] || null;
}

function simpanPinPesan(idLawan, idPesan) {
    if (!userAktif || !idLawan || !idPesan) return false;
    const daftarPesan = ambilPesanChat(idLawan);
    const pesanAda = daftarPesan.some(pesan => pesan.id === idPesan);

    if (!pesanAda) return false;
    const semuaPin = bacaSemuaPinPesan();
    const kunci = kunciKonversasi(userAktif.id, idLawan);
    semuaPin[kunci] = idPesan;
    return simpanSemuaPinPesan(semuaPin);
}

function hapusPinPesan(idLawan) {
    if (!userAktif || !idLawan) return false;
    const semuaPin = bacaSemuaPinPesan();
    const kunci = kunciKonversasi(userAktif.id, idLawan);

    if (!semuaPin[kunci]) return false;
    delete semuaPin[kunci];
    return simpanSemuaPinPesan(semuaPin);
}

function perbaruiTombolPin() {
    const pin = chatAktifId ? ambilPinPesan(chatAktifId) : null;
    boxListPesan.querySelectorAll('.message-row').forEach(baris => {
        const tombol = baris.querySelector('.btn-pin-message');
        if (!tombol) return;
        const aktif = Boolean(pin) && baris.dataset.messageId === pin;
        tombol.classList.toggle('tersemat', aktif);
        tombol.setAttribute('aria-pressed', String(aktif));
        const label = aktif ? 'Lepas sematan' : 'Sematkan pesan';
        tombol.title = label;
        tombol.setAttribute('aria-label', label);
    });
}

function renderPinPesanAktif() {
    renderBarSematan();
    perbaruiTombolPin();
}

function renderBarSematan() {
    const container = document.getElementById('pinned-message-container');
    const teksPesan = document.getElementById('pinned-message-text');
    if (!container || !teksPesan || !chatAktifId) return;
    const idPesanPin = ambilPinPesan(chatAktifId);
    if (!idPesanPin) {
        container.style.display = 'none';
        teksPesan.textContent = '';
        return;
    }
    const pesan = ambilPesanChat(chatAktifId)
        .find(item => item.id === idPesanPin);
    if (!pesan) {
        hapusPinPesan(chatAktifId);
        container.style.display = 'none';
        teksPesan.textContent = '';
        return;
    }
    teksPesan.textContent = String(pesan.text || '').trim() || (isPesanBergambar(pesan) ? 'Foto' : '');
    container.style.display = 'flex';
}


function perbaruiStatusPesan(idLawan, predicate, status) {
    const pesan = ambilPesanChat(idLawan);
    const urutanStatus = { terkirim: 0, diterima: 1, dibaca: 2 };
    let berubah = false;
    pesan.forEach(item => {
        const statusSekarang = urutanStatus[item.status] || 0;
        if (predicate(item) && statusSekarang < urutanStatus[status]) {
            item.status = status;
            berubah = true;
        }
    });
    if (berubah) simpanPesanChat(idLawan, pesan);
    return berubah;
}

function tandaiPesanDiterima(idLawan) {
    return perbaruiStatusPesan(idLawan, item => item.sender !== userAktif.id, 'diterima');
}

function tandaiPesanDibaca(idLawan) {
    return perbaruiStatusPesan(idLawan, item => item.sender !== userAktif.id, 'dibaca');
}

function prosesPesanMasuk() {
    if (!userAktif) return;
    getUsers().forEach(pengguna => {
        if (!pengguna || pengguna.id === userAktif.id) return;
        tandaiPesanDiterima(pengguna.id);
        if (chatAktifId === pengguna.id && !document.getElementById('panel-tab-chat').hidden &&
            document.visibilityState === 'visible' && document.hasFocus() &&
            panelChatAktif.getClientRects().length &&
            getComputedStyle(document.getElementById('panel-layer-setelan')).display === 'none')
            tandaiPesanDibaca(pengguna.id);
    });
}

function getProfilChat(idLawan) {
    const kontak = getUserById(idLawan);
    const profil = getProfil(idLawan);
    const itemKontak = userAktif && NgumpulKontakData && kontak && kontak.hp
        ? NgumpulKontakData.list(userAktif.id).find(item => samakanHp(item.phone, kontak.hp))
        : null;
    const nomor = formatNomorTampil(profil.phone || (kontak && kontak.hp) || '');
    return {
        id: idLawan,
        nama: itemKontak
            ? (itemKontak.name || (kontak && kontak.nama) || profil.nama || nomor || 'Nomor tidak tersedia')
            : (nomor || 'Nomor tidak tersedia'),
        hp: nomor,
        username: profil.username || '@pengguna'
    };
}

function namaKontakTersimpan(idLawan) {
    const user = getUserById(idLawan);
    if (!user || !user.hp || !userAktif || !NgumpulKontakData) return false;
    return NgumpulKontakData.list(userAktif.id).some(kontak => samakanHp(kontak.phone, user.hp));
}

function isKontakPengguna(idLawan) {
    if (!userAktif || !idLawan || !NgumpulKontakData || typeof NgumpulKontakData.list !== 'function') {
        return false;
    }

    const user = getUserById(idLawan);
    if (!user || !user.hp) return false;

    return NgumpulKontakData.list(userAktif.id)
        .some(kontak => samakanHp(kontak.phone, user.hp));
}
