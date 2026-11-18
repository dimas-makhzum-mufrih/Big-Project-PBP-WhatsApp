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
const KEY_BLOKIR = 'ngumpul_blokir_';
const panelChatKosong = document.getElementById('panel-chat-kosong');
const panelChatAktif = document.getElementById('panel-chat-aktif');
const boxListPesan = document.getElementById('box-list-pesan');
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
    if (!namaKontakTersimpan(idUser)) return '';
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
    if (!namaKontakTersimpan(idUser)) return '';
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

function renderChatList() {
    if (!chatScrollArea || !userAktif) return;

    const query = (inputCariChat ? inputCariChat.value : '').trim().toLowerCase();
    const daftarKontak = NgumpulKontakData && typeof NgumpulKontakData.search === 'function'
        ? NgumpulKontakData.search(userAktif.id, query)
        : [];
    const kandidat = new Map();
    daftarKontak.forEach(item => {
            const user = getUsers().find(pengguna => samakanHp(pengguna.hp, item.phone));
            if (user && user.id !== userAktif.id) kandidat.set(String(user.id), user);
        });
    const semua = bacaSemuaChat();
    getUsers().forEach(pengguna => {
        if (!pengguna || String(pengguna.id) === String(userAktif.id)) return;
        const pesan = semua[kunciKonversasi(userAktif.id, pengguna.id)];
        if (Array.isArray(pesan) && pesan.length) kandidat.set(String(pengguna.id), pengguna);
    });
    const hasil = Array.from(kandidat.values())
        .map(user => {
            const pesan = ambilPesanChat(user.id);
            const terakhir = pesan.length ? pesan[pesan.length - 1] : null;
            const profil = getProfilChat(user.id);
            const diblokir = penggunaDiblokir(userAktif.id, user.id);
            return {
                id: user.id,
                nama: profil.nama,
                preview: diblokir ? 'Kamu memblokir pengguna ini' : formatPreviewPesan(terakhir),
                adaGambar: !diblokir && isPesanBergambar(terakhir),
                waktu: terakhir ? terakhir.time : null,
                hp: user.hp,
                diblokir
            };
        })
        .filter(item => item.nama.toLowerCase().includes(query) || String(item.hp || '').includes(query))
        .sort((a, b) => {
            const waktuA = a.waktu ? new Date(a.waktu).getTime() : 0;
            const waktuB = b.waktu ? new Date(b.waktu).getTime() : 0;
            return waktuB - waktuA;
        });

    chatScrollArea.replaceChildren();

    if (!hasil.length) {
        const kosong = document.createElement('div');
        kosong.className = 'contact-empty';
        if (query) {
            kosong.textContent = 'Tidak ada chat yang cocok.';
        } else {
            const teks = document.createElement('p');
            teks.textContent = 'Belum ada chat. Tambahkan kontak untuk mulai ngobrol.';
            const tombol = document.createElement('button');
            tombol.type = 'button';
            tombol.className = 'contact-add-button';
            tombol.textContent = '+ Tambah kontak';
            tombol.addEventListener('click', () => {
                pilihTabDashboard(true);
                const btnTambah = document.getElementById('btn-tambah-kontak');
                if (btnTambah) btnTambah.click();
            });
            kosong.append(teks, tombol);
        }
        chatScrollArea.appendChild(kosong);
        return;
    }

    hasil.forEach(item => {
        const kartu = document.createElement('button');
        kartu.type = 'button';
        kartu.className = 'chat-card' + (chatAktifId === item.id ? ' aktif' : '');
        kartu.setAttribute('data-chat-id', item.id);
        kartu.setAttribute('aria-label', 'Buka chat dengan ' + item.nama);

        const avatar = document.createElement('div');
        avatar.className = 'circle-avatar';
        tampilkanAvatarChat(avatar, item.id, item.nama);

        const warna = ['#3984bd', '#8e63aa', '#d17b45', '#368c72', '#bd5d70'];
        let total = 0;
        for (let i = 0; i < item.nama.length; i++) {
            total += item.nama.charCodeAt(i);
        }
        avatar.style.backgroundColor = warna[total % warna.length];

        const meta = document.createElement('div');
        meta.className = 'card-meta';

        const top = document.createElement('div');
        top.className = 'card-top';

        const judul = document.createElement('span');
        judul.className = 'card-title';
        judul.textContent = item.nama;

        const jam = document.createElement('small');
        jam.textContent = item.waktu ? formatJamPesan(item.waktu) : '';
        jam.style.color = 'var(--teks-redup)';
        jam.style.fontSize = '.74rem';

        const preview = document.createElement('p');
        preview.className = 'card-preview';
        if (item.adaGambar) {
            // ikon SVG inline (Font Awesome Duotone itu versi Pro, tidak tampil di CDN gratis)
            const ns = 'http://www.w3.org/2000/svg';
            const ikonGambar = document.createElementNS(ns, 'svg');
            ikonGambar.setAttribute('class', 'ikon ikon-preview-gambar');
            ikonGambar.setAttribute('aria-hidden', 'true');
            const pakai = document.createElementNS(ns, 'use');
            pakai.setAttribute('href', '#i-image');
            ikonGambar.appendChild(pakai);
            preview.appendChild(ikonGambar);
            preview.appendChild(document.createTextNode(' ' + item.preview));
        } else {
            preview.textContent = item.preview;
        }

        top.appendChild(judul);
        top.appendChild(jam);
        meta.append(top, preview);
        kartu.append(avatar, meta);

        kartu.addEventListener('click', () => {
            bukaChat(item.id);
        });

        chatScrollArea.appendChild(kartu);
    });
}

function renderPesanAktif() {
    if (!boxListPesan || !chatAktifId) return;

    boxListPesan.replaceChildren();
    const pesan = ambilPesanChat(chatAktifId);
    const target = getProfilChat(chatAktifId);

    if (!pesan.length) {
        const kosong = document.createElement('p');
        kosong.className = 'contact-empty';
        kosong.textContent = 'Belum ada pesan dengan ' + target.nama + '. Mulai percakapan baru.';
        boxListPesan.appendChild(kosong);
        return;
    }

    pesan.forEach((item, index) => {
        const baris = document.createElement('div');
        baris.className = 'message-row';
        baris.classList.add(item.sender === userAktif.id ? 'kirim' : 'terima');
        baris.dataset.messageIndex = String(index);

        const punyaGambar = isPesanBergambar(item);
        const teksIsi = String(item.text || '').trim();
        const adaTeks = Boolean(teksIsi);

        const bubble = document.createElement('div');
        bubble.className =
            'chat-bubble ' +
            (item.sender === userAktif.id ? 'kirim' : 'terima') +
            (punyaGambar ? ' ada-gambar' : '') +
            (punyaGambar && !adaTeks ? ' hanya-gambar' : '');

        if (punyaGambar) {
            const bungkusGambar = document.createElement('div');
            bungkusGambar.className = 'chat-image-wrapper';
            bungkusGambar.setAttribute('role', 'button');
            bungkusGambar.setAttribute('tabindex', '0');
            bungkusGambar.setAttribute('aria-label', 'Lihat gambar ukuran penuh');

            const img = document.createElement('img');
            img.className = 'chat-image';
            img.alt = adaTeks ? teksIsi : 'Gambar obrolan';
            img.loading = 'lazy';

            const urlCache = item.imageId ? cacheUrlGambar.get(item.imageId) : '';
            if (urlCache) {
                img.src = urlCache;
            } else if (item.image) {
                img.src = item.image;
            }

            if (item.imageId) {
                ambilGambarIdb(item.imageId).then(urlPenuh => {
                    if (urlPenuh && img.src !== urlPenuh) {
                        img.src = urlPenuh;
                    }
                });
            }

            bungkusGambar.addEventListener('click', () => {
                bukaLightboxGambar(item.id);
            });
            bungkusGambar.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    bukaLightboxGambar(item.id);
                }
            });

            bungkusGambar.appendChild(img);
            bubble.appendChild(bungkusGambar);
        }

        if (adaTeks || !punyaGambar) {
            const text = document.createElement('span');
            if (punyaGambar) text.className = 'chat-caption-text';
            text.textContent = item.text || '';
            bubble.appendChild(text);
        }

        const waktu = document.createElement('span');
        waktu.className = 'timestamp';
        waktu.textContent = formatJamPesan(item.time);

        const footer = document.createElement('div');
        footer.className = 'message-footer';
        footer.appendChild(waktu);
        if (item.sender === userAktif.id) {
            footer.appendChild(buatIndikatorStatusPesan(item.status));
        }
        bubble.appendChild(footer);
        baris.appendChild(bubble);
        boxListPesan.appendChild(baris);
    });

    boxListPesan.scrollTop = boxListPesan.scrollHeight;
}

// ===== Cari pesan di dalam chat =====
function formatTanggalPesan(isoString) {
    const waktu = new Date(isoString);
    if (Number.isNaN(waktu.getTime())) return '';
    return waktu.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function tampilkanTeksPesanCocok(container, teks, query) {
    const posisi = teks.toLowerCase().indexOf(query);
    if (posisi < 0) {
        container.textContent = teks;
        return;
    }

    container.append(
        document.createTextNode(teks.slice(0, posisi)),
        Object.assign(document.createElement('mark'), {
            textContent: teks.slice(posisi, posisi + query.length)
        }),
        document.createTextNode(teks.slice(posisi + query.length))
    );
}

function pencarianPesanTerbuka() {
    return Boolean(panelCariPesan && panelCariPesan.classList.contains('terbuka'));
}

function renderHasilPencarianPesan() {
    if (!hasilCariPesan || !inputCariPesan || !chatAktifId) return;

    hasilCariPesan.replaceChildren();
    const query = inputCariPesan.value.trim().toLowerCase();
    if (!query) {
        const kosong = document.createElement('p');
        kosong.className = 'message-search-empty';
        kosong.textContent = 'Ketik kata kunci untuk mencari pesan.';
        hasilCariPesan.appendChild(kosong);
        return;
    }

    const hasil = ambilPesanChat(chatAktifId)
        .map((item, index) => ({ item: item, index: index }))
        .filter(entry => String(entry.item.text || '').toLowerCase().includes(query))
        .reverse();

    if (!hasil.length) {
        const kosong = document.createElement('p');
        kosong.className = 'message-search-empty';
        kosong.textContent = 'Tidak ada pesan yang cocok dengan kata kunci tersebut.';
        hasilCariPesan.appendChild(kosong);
        return;
    }

    hasil.forEach(entry => {
        const tombol = document.createElement('button');
        tombol.type = 'button';
        tombol.className = 'message-search-result';
        tombol.dataset.messageIndex = String(entry.index);

        const tanggal = document.createElement('span');
        tanggal.className = 'message-search-result-date';
        tanggal.textContent = formatTanggalPesan(entry.item.time);

        const teks = document.createElement('span');
        tampilkanTeksPesanCocok(teks, String(entry.item.text || ''), query);
        tombol.append(tanggal, teks);
        tombol.addEventListener('click', () => {
            renderPesanAktif();
            const pesanTarget = boxListPesan.querySelector(
                '[data-message-index="' + entry.index + '"]'
            );
            if (pesanTarget) {
                boxListPesan.querySelectorAll('.message-row.pesan-cari-terpilih')
                    .forEach(item => item.classList.remove('pesan-cari-terpilih'));
                if (timerSorotPesanCari) window.clearTimeout(timerSorotPesanCari);
                pesanTarget.classList.add('pesan-cari-terpilih');
                pesanTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
                timerSorotPesanCari = window.setTimeout(() => {
                    pesanTarget.classList.remove('pesan-cari-terpilih');
                    timerSorotPesanCari = null;
                }, 1000);
            }
        });
        hasilCariPesan.appendChild(tombol);
    });
}

function aturPencarianPesanTerbuka(terbuka, kosongkanQuery, fokus) {
    if (!panelCariPesan || !btnToggleCariPesan || !inputCariPesan) return;

    panelCariPesan.classList.toggle('terbuka', terbuka);
    if (panelChatAktif) {
        panelChatAktif.classList.toggle('pencarian-pesan-terbuka', terbuka);
    }
    panelCariPesan.setAttribute('aria-hidden', String(!terbuka));
    btnToggleCariPesan.setAttribute('aria-expanded', String(terbuka));
    if (kosongkanQuery !== false) inputCariPesan.value = '';
    renderHasilPencarianPesan();
    if (terbuka && fokus !== false) inputCariPesan.focus();
}

function bukaChat(idLawan) {
    if (!idLawan || !userAktif) return;
    if (!getUserById(idLawan) || String(idLawan) === String(userAktif.id)) return;

    if (chatAktifId && chatAktifId !== idLawan) {
        tutupPreviewGambar();
        // pindah chat: tutup & kosongkan pencarian pesan chat sebelumnya
        aturPencarianPesanTerbuka(false, true, false);
    }

    chatAktifId = idLawan;
    tutupPanelLampiran();
    const target = getProfilChat(idLawan);

    if (panelChatKosong) panelChatKosong.style.display = 'none';
    if (panelChatAktif) panelChatAktif.style.display = 'flex';

    if (avatarHeaderKanan) {
        tampilkanAvatarChat(avatarHeaderKanan, idLawan, target.nama);
        avatarHeaderKanan.style.backgroundColor = '#3984bd';
    }

    if (namaHeaderKanan) {
        namaHeaderKanan.textContent = target.nama;
    }
    const nomorHeader = document.getElementById('nomor-header-kanan');
    if (nomorHeader) {
        nomorHeader.textContent = target.hp || 'Nomor tidak tersedia';
        nomorHeader.hidden = !namaKontakTersimpan(idLawan);
    }
    perbaruiKontrolBlokir();
    perbaruiKontrolKontak();
    if (panelInfoPengguna && panelInfoPengguna.getAttribute('aria-hidden') === 'false') tampilkanInfoPengguna();

    tandaiPesanDiterima(idLawan);
    tandaiPesanDibaca(idLawan);
    renderPesanAktif();
    renderChatList();

    document.getElementById('panel-sisi-kiri').classList.add('room-open');
    document.getElementById('panel-sisi-kanan').classList.add('room-open');
    if (inputTeksKirim && !pencarianPesanTerbuka()) {
        inputTeksKirim.focus();
    }
}

// ===== Footer chat: tombol plus (panel lampiran), emoji, mic =====
// Hanya tampilan. Aksi tiap tombol dipasang anggota lewat atribut data-fitur.
const btnLampir = document.getElementById('btn-lampir');
const panelLampiran = document.getElementById('panel-lampiran');
const btnMic = document.getElementById('btn-mic');

function tutupPanelLampiran() {
    if (!panelLampiran || panelLampiran.hidden) return;
    panelLampiran.hidden = true;
    if (btnLampir) {
        btnLampir.setAttribute('aria-expanded', 'false');
        btnLampir.classList.remove('terbuka');
    }
}

// mic tampil kalau kolom kosong, tombol Kirim tampil kalau ada teks (seperti WhatsApp)
function perbaruiTombolKirim() {
    const adaTeks = !!(inputTeksKirim && inputTeksKirim.value.trim());
    if (btnKirimPesan) btnKirimPesan.hidden = !adaTeks;
    if (btnMic) btnMic.hidden = adaTeks;
}

if (btnLampir && panelLampiran) {
    btnLampir.addEventListener('click', event => {
        event.stopPropagation();
        const buka = panelLampiran.hidden;
        panelLampiran.hidden = !buka;
        btnLampir.setAttribute('aria-expanded', String(buka));
        btnLampir.classList.toggle('terbuka', buka);
    });
    document.addEventListener('click', event => {
        if (!event.target.closest('#panel-lampiran')) tutupPanelLampiran();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') tutupPanelLampiran();
    });
}

if (inputTeksKirim) inputTeksKirim.addEventListener('input', perbaruiTombolKirim);
perbaruiTombolKirim();

function kirimPesanAktif() {
    if (!chatAktifId || !userAktif) return;
    if (penggunaDiblokir(userAktif.id, chatAktifId) || penggunaDiblokir(chatAktifId, userAktif.id)) return;

    if (antreanGambar.length > 0) {
        kirimSemuaGambarAntrean();
        return;
    }

    const teks = (inputTeksKirim ? inputTeksKirim.value : '').trim();
    if (!teks) return;

    const daftarPesan = ambilPesanChat(chatAktifId);
    daftarPesan.push({
        id: buatIdPesan(),
        sender: userAktif.id,
        text: teks,
        time: new Date().toISOString(),
        status: 'terkirim'
    });

    simpanPesanChat(chatAktifId, daftarPesan);

    if (inputTeksKirim) {
        inputTeksKirim.value = '';
    }
    perbaruiTombolKirim();

    renderPesanAktif();
    renderChatList();
    if (pencarianPesanTerbuka()) renderHasilPencarianPesan();
}

// ===== Fitur Kirim Gambar dari Galeri (Tanpa Batas Ukuran, Gaya WhatsApp) =====
const inputFileGambar = document.getElementById('input-file-gambar');
const panelPreviewGambar = document.getElementById('panel-preview-gambar');
const btnBatalPreview = document.getElementById('btn-batal-preview');
const infoNamaFilePreview = document.getElementById('info-nama-file-preview');
const infoUkuranFilePreview = document.getElementById('info-ukuran-file-preview');
const infoUrutPreview = document.getElementById('info-urut-preview');
const imgUtamaPreview = document.getElementById('img-utama-preview');
const inputCaptionGambar = document.getElementById('input-caption-gambar');
const daftarThumbPreview = document.getElementById('daftar-thumb-preview');
const btnTambahGambarLagi = document.getElementById('btn-tambah-gambar-lagi');
const btnKirimGambar = document.getElementById('btn-kirim-gambar');
const badgeJumlahGambar = document.getElementById('badge-jumlah-gambar');
const dropzoneChatGambar = document.getElementById('dropzone-chat-gambar');

let antreanGambar = [];
let indeksPreviewAktif = 0;
let sedangMengirimGambar = false;

function formatUkuranFile(bytes) {
    const n = Number(bytes) || 0;
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1).replace('.', ',') + ' KB';
    if (n < 1024 * 1024 * 1024) return (n / (1024 * 1024)).toFixed(2).replace('.', ',') + ' MB';
    return (n / (1024 * 1024 * 1024)).toFixed(2).replace('.', ',') + ' GB';
}

function adalahFileGambar(file) {
    if (!file) return false;
    if (typeof file.type === 'string' && file.type.startsWith('image/')) return true;
    return /\.(jpe?g|png|gif|webp|bmp|svg|avif|heic|heif|ico|tiff?)$/i.test(file.name || '');
}

function bersihkanAntreanGambar() {
    antreanGambar.forEach(item => {
        if (item.objectUrl) {
            try { URL.revokeObjectURL(item.objectUrl); } catch (e) {}
        }
    });
    antreanGambar = [];
    indeksPreviewAktif = 0;
}

function tutupPreviewGambar() {
    bersihkanAntreanGambar();
    if (panelPreviewGambar) panelPreviewGambar.hidden = true;
    if (inputFileGambar) inputFileGambar.value = '';
    if (inputTeksKirim && chatAktifId) inputTeksKirim.focus();
}

function renderKomposerPreviewGambar() {
    if (!panelPreviewGambar) return;

    if (!antreanGambar.length) {
        tutupPreviewGambar();
        return;
    }

    if (indeksPreviewAktif >= antreanGambar.length) {
        indeksPreviewAktif = antreanGambar.length - 1;
    }
    if (indeksPreviewAktif < 0) {
        indeksPreviewAktif = 0;
    }

    panelPreviewGambar.hidden = false;
    const itemAktif = antreanGambar[indeksPreviewAktif];

    if (imgUtamaPreview) {
        imgUtamaPreview.src = itemAktif.objectUrl;
        imgUtamaPreview.alt = itemAktif.name || 'Pratinjau gambar';
    }

    if (infoNamaFilePreview) {
        infoNamaFilePreview.textContent = itemAktif.name || 'Gambar dari galeri';
    }

    if (infoUkuranFilePreview) {
        infoUkuranFilePreview.textContent = formatUkuranFile(itemAktif.size);
    }

    if (infoUrutPreview) {
        infoUrutPreview.textContent = (indeksPreviewAktif + 1) + ' / ' + antreanGambar.length;
    }

    if (inputCaptionGambar) {
        inputCaptionGambar.value = itemAktif.caption || '';
    }

    if (badgeJumlahGambar) {
        badgeJumlahGambar.textContent = String(antreanGambar.length);
        badgeJumlahGambar.hidden = antreanGambar.length <= 1;
    }

    if (daftarThumbPreview) {
        daftarThumbPreview.replaceChildren();
        antreanGambar.forEach((item, idx) => {
            const btnThumb = document.createElement('div');
            btnThumb.className = 'media-thumb-item' + (idx === indeksPreviewAktif ? ' aktif' : '');
            btnThumb.setAttribute('role', 'option');
            btnThumb.setAttribute('aria-selected', String(idx === indeksPreviewAktif));
            btnThumb.setAttribute('tabindex', '0');

            const imgThumb = document.createElement('img');
            imgThumb.src = item.objectUrl;
            imgThumb.alt = item.name || ('Gambar ' + (idx + 1));

            const btnHapus = document.createElement('button');
            btnHapus.type = 'button';
            btnHapus.className = 'media-thumb-remove';
            btnHapus.textContent = '×';
            btnHapus.setAttribute('aria-label', 'Hapus gambar ini dari antrean');
            btnHapus.addEventListener('click', e => {
                e.stopPropagation();
                hapusSatuGambarAntrean(idx);
            });

            btnThumb.addEventListener('click', () => {
                simpanCaptionSaatIni();
                indeksPreviewAktif = idx;
                renderKomposerPreviewGambar();
            });

            btnThumb.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    simpanCaptionSaatIni();
                    indeksPreviewAktif = idx;
                    renderKomposerPreviewGambar();
                }
            });

            btnThumb.append(imgThumb, btnHapus);
            daftarThumbPreview.appendChild(btnThumb);
        });
    }
}

function simpanCaptionSaatIni() {
    if (!inputCaptionGambar || !antreanGambar[indeksPreviewAktif]) return;
    antreanGambar[indeksPreviewAktif].caption = inputCaptionGambar.value;
}

function hapusSatuGambarAntrean(idx) {
    simpanCaptionSaatIni();
    const dihapus = antreanGambar.splice(idx, 1)[0];
    if (dihapus && dihapus.objectUrl) {
        try { URL.revokeObjectURL(dihapus.objectUrl); } catch (e) {}
    }
    if (!antreanGambar.length) {
        tutupPreviewGambar();
        return;
    }
    if (indeksPreviewAktif >= antreanGambar.length) {
        indeksPreviewAktif = antreanGambar.length - 1;
    }
    renderKomposerPreviewGambar();
}

function tambahFileKeAntrean(fileList) {
    if (!chatAktifId || !userAktif || !fileList || !fileList.length) return;
    if (chatTerblokir(chatAktifId)) return;

    simpanCaptionSaatIni();
    const sebelumnyaKosong = antreanGambar.length === 0;
    let adaYangMasuk = false;

    Array.from(fileList).forEach(file => {
        if (!adalahFileGambar(file)) return;
        const objectUrl = URL.createObjectURL(file);
        antreanGambar.push({
            id: buatIdPesan(),
            file: file,
            name: file.name || 'foto.jpg',
            size: file.size || 0,
            objectUrl: objectUrl,
            caption: ''
        });
        adaYangMasuk = true;
    });

    if (!adaYangMasuk) return;

    // Jika sebelumnya sudah ada teks di input utama, pindahkan ke caption gambar pertama
    if (sebelumnyaKosong && inputTeksKirim && inputTeksKirim.value.trim()) {
        antreanGambar[0].caption = inputTeksKirim.value.trim();
        inputTeksKirim.value = '';
    }

    if (sebelumnyaKosong) {
        indeksPreviewAktif = 0;
    } else {
        indeksPreviewAktif = antreanGambar.length - 1;
    }

    renderKomposerPreviewGambar();
    if (inputCaptionGambar) inputCaptionGambar.focus();
}

async function kirimSemuaGambarAntrean() {
    if (!chatAktifId || !userAktif || !antreanGambar.length || sedangMengirimGambar) return;
    if (chatTerblokir(chatAktifId)) return;

    simpanCaptionSaatIni();
    sedangMengirimGambar = true;
    if (btnKirimGambar) btnKirimGambar.disabled = true;

    const targetChatId = chatAktifId;
    const daftarPesan = ambilPesanChat(targetChatId);
    const salinanAntrean = antreanGambar.slice();

    for (let i = 0; i < salinanAntrean.length; i++) {
        const item = salinanAntrean[i];
        const idPesan = buatIdPesan();
        const imageId = 'img_' + idPesan;

        // Simpan file asli ukuran penuh ke IndexedDB (tidak ada batas ukuran)
        await simpanGambarIdb(imageId, item.file);
        // Siapkan URL lokal di memori tab ini agar langsung tampil tajam
        cacheUrlGambar.set(imageId, URL.createObjectURL(item.file));

        // Buat pratinjau ringan agar juga tersinkron instan lewat localStorage
        const previewDataUrl = await buatPreviewRinganDataUrl(item.file);

        daftarPesan.push({
            id: idPesan,
            sender: userAktif.id,
            text: (item.caption || '').trim(),
            imageId: imageId,
            image: previewDataUrl || '',
            hasImage: true,
            imageName: item.name || 'foto.jpg',
            imageSize: item.size || 0,
            time: new Date().toISOString(),
            status: 'terkirim'
        });
    }

    simpanPesanChat(targetChatId, daftarPesan);
    sedangMengirimGambar = false;
    if (btnKirimGambar) btnKirimGambar.disabled = false;

    tutupPreviewGambar();
    renderPesanAktif();
    renderChatList();
    if (pencarianPesanTerbuka()) renderHasilPencarianPesan();
}

// Menu lampiran "Foto & video" memicu pemilih galeri (menggantikan tombol plus kedua)
const itemLampirMedia = document.querySelector('[data-fitur="lampir-media"]');
if (itemLampirMedia && inputFileGambar) {
    itemLampirMedia.addEventListener('click', () => {
        if (!chatAktifId || chatTerblokir(chatAktifId)) return;
        tutupPanelLampiran();
        inputFileGambar.click();
    });
}

if (btnTambahGambarLagi && inputFileGambar) {
    btnTambahGambarLagi.addEventListener('click', () => {
        if (!chatAktifId) return;
        inputFileGambar.click();
    });
}

if (inputFileGambar) {
    inputFileGambar.addEventListener('change', e => {
        if (e.target.files && e.target.files.length) {
            tambahFileKeAntrean(e.target.files);
        }
        inputFileGambar.value = '';
    });
}

if (btnBatalPreview) {
    btnBatalPreview.addEventListener('click', tutupPreviewGambar);
}

if (inputCaptionGambar) {
    inputCaptionGambar.addEventListener('input', simpanCaptionSaatIni);
    inputCaptionGambar.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            kirimSemuaGambarAntrean();
        }
    });
}

if (btnKirimGambar) {
    btnKirimGambar.addEventListener('click', kirimSemuaGambarAntrean);
}

// Drag & Drop gambar langsung ke ruang chat (layaknya WhatsApp Web)
if (panelChatAktif && dropzoneChatGambar) {
    let penghitungDrag = 0;

    panelChatAktif.addEventListener('dragenter', e => {
        if (!chatAktifId) return;
        const dt = e.dataTransfer;
        if (dt && dt.types && Array.from(dt.types).includes('Files')) {
            e.preventDefault();
            penghitungDrag++;
            dropzoneChatGambar.hidden = false;
        }
    });

    panelChatAktif.addEventListener('dragover', e => {
        if (!chatAktifId) return;
        const dt = e.dataTransfer;
        if (dt && dt.types && Array.from(dt.types).includes('Files')) {
            e.preventDefault();
            dt.dropEffect = 'copy';
        }
    });

    panelChatAktif.addEventListener('dragleave', () => {
        penghitungDrag = Math.max(0, penghitungDrag - 1);
        if (penghitungDrag === 0) {
            dropzoneChatGambar.hidden = true;
        }
    });

    panelChatAktif.addEventListener('drop', e => {
        penghitungDrag = 0;
        dropzoneChatGambar.hidden = true;
        if (!chatAktifId) return;
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
            e.preventDefault();
            tambahFileKeAntrean(e.dataTransfer.files);
        }
    });
}

// Paste (Ctrl+V) gambar dari clipboard langsung ke ruang chat
document.addEventListener('paste', e => {
    if (!chatAktifId || !panelChatAktif || panelChatAktif.style.display === 'none') return;
    if (panelLayerSetelan && panelLayerSetelan.style.display === 'flex') return;
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;

    const files = [];
    for (let i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.startsWith('image/')) {
            const f = items[i].getAsFile();
            if (f) files.push(f);
        }
    }
    if (files.length) {
        e.preventDefault();
        tambahFileKeAntrean(files);
    }
});

// ===== Lightbox Peninjau Gambar Ukuran Penuh (Gaya WhatsApp) =====
const lightboxGambar = document.getElementById('lightbox-gambar');
const lightboxPengirim = document.getElementById('lightbox-pengirim');
const lightboxWaktu = document.getElementById('lightbox-waktu');
const imgLightboxUtama = document.getElementById('img-lightbox-utama');
const lightboxFooter = document.getElementById('lightbox-footer');
const lightboxCaption = document.getElementById('lightbox-caption');
const btnLightboxTutup = document.getElementById('btn-lightbox-tutup');
const btnLightboxUnduh = document.getElementById('btn-lightbox-unduh');
const btnLightboxZoomIn = document.getElementById('btn-lightbox-zoom-in');
const btnLightboxZoomOut = document.getElementById('btn-lightbox-zoom-out');
const btnLightboxPrev = document.getElementById('btn-lightbox-prev');
const btnLightboxNext = document.getElementById('btn-lightbox-next');
const lightboxStage = document.getElementById('lightbox-stage');

let daftarPesanGambarLightbox = [];
let indeksLightboxAktif = 0;
let zoomLightbox = 1;

function aturZoomLightbox(nilaiBaru) {
    zoomLightbox = Math.min(4, Math.max(0.5, nilaiBaru));
    if (imgLightboxUtama) {
        imgLightboxUtama.style.transform = 'scale(' + zoomLightbox + ')';
    }
}

async function tampilkanSlideLightbox() {
    if (!lightboxGambar || !daftarPesanGambarLightbox.length) return;
    const item = daftarPesanGambarLightbox[indeksLightboxAktif];
    if (!item) return;

    aturZoomLightbox(1);

    const namaPengirim = item.sender === userAktif.id
        ? 'Anda'
        : getProfilChat(item.sender).nama;

    if (lightboxPengirim) lightboxPengirim.textContent = namaPengirim;
    if (lightboxWaktu) {
        const tgl = item.time ? new Date(item.time) : null;
        lightboxWaktu.textContent = tgl && !Number.isNaN(tgl.getTime())
            ? tgl.toLocaleString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
            : '';
    }

    let urlTampil = item.image || '';
    if (item.imageId) {
        const urlIdb = await ambilGambarIdb(item.imageId);
        if (urlIdb) urlTampil = urlIdb;
    }

    if (imgLightboxUtama) {
        imgLightboxUtama.src = urlTampil;
        imgLightboxUtama.alt = item.text || item.imageName || 'Gambar obrolan';
    }

    const teksCaption = String(item.text || '').trim();
    if (lightboxFooter && lightboxCaption) {
        lightboxCaption.textContent = teksCaption;
        lightboxFooter.hidden = !teksCaption;
    }

    if (btnLightboxPrev) {
        btnLightboxPrev.hidden = daftarPesanGambarLightbox.length <= 1 || indeksLightboxAktif <= 0;
    }
    if (btnLightboxNext) {
        btnLightboxNext.hidden =
            daftarPesanGambarLightbox.length <= 1 ||
            indeksLightboxAktif >= daftarPesanGambarLightbox.length - 1;
    }
}

function bukaLightboxGambar(idPesan) {
    if (!lightboxGambar || !chatAktifId) return;
    daftarPesanGambarLightbox = ambilPesanChat(chatAktifId).filter(isPesanBergambar);
    if (!daftarPesanGambarLightbox.length) return;

    const idx = daftarPesanGambarLightbox.findIndex(p => p.id === idPesan);
    indeksLightboxAktif = idx !== -1 ? idx : daftarPesanGambarLightbox.length - 1;
    lightboxGambar.hidden = false;
    tampilkanSlideLightbox();
}

function tutupLightboxGambar() {
    if (!lightboxGambar) return;
    lightboxGambar.hidden = true;
    aturZoomLightbox(1);
}

if (btnLightboxTutup) {
    btnLightboxTutup.addEventListener('click', tutupLightboxGambar);
}

if (btnLightboxZoomIn) {
    btnLightboxZoomIn.addEventListener('click', () => aturZoomLightbox(zoomLightbox + 0.35));
}

if (btnLightboxZoomOut) {
    btnLightboxZoomOut.addEventListener('click', () => aturZoomLightbox(zoomLightbox - 0.35));
}

if (imgLightboxUtama) {
    imgLightboxUtama.addEventListener('dblclick', () => {
        aturZoomLightbox(zoomLightbox > 1 ? 1 : 2);
    });
}

if (lightboxStage) {
    lightboxStage.addEventListener('click', e => {
        if (e.target === lightboxStage) tutupLightboxGambar();
    });
    lightboxStage.addEventListener('wheel', e => {
        if (lightboxGambar && !lightboxGambar.hidden) {
            e.preventDefault();
            aturZoomLightbox(zoomLightbox + (e.deltaY < 0 ? 0.2 : -0.2));
        }
    }, { passive: false });
}

if (btnLightboxPrev) {
    btnLightboxPrev.addEventListener('click', () => {
        if (indeksLightboxAktif > 0) {
            indeksLightboxAktif--;
            tampilkanSlideLightbox();
        }
    });
}

if (btnLightboxNext) {
    btnLightboxNext.addEventListener('click', () => {
        if (indeksLightboxAktif < daftarPesanGambarLightbox.length - 1) {
            indeksLightboxAktif++;
            tampilkanSlideLightbox();
        }
    });
}

if (btnLightboxUnduh) {
    btnLightboxUnduh.addEventListener('click', async () => {
        const item = daftarPesanGambarLightbox[indeksLightboxAktif];
        if (!item) return;
        let urlUnduh = item.image || '';
        if (item.imageId) {
            const urlIdb = await ambilGambarIdb(item.imageId);
            if (urlIdb) urlUnduh = urlIdb;
        }
        if (!urlUnduh) return;
        const a = document.createElement('a');
        a.href = urlUnduh;
        a.download = item.imageName || ('ngumpul-foto-' + item.id + '.jpg');
        document.body.appendChild(a);
        a.click();
        a.remove();
    });
}

document.addEventListener('keydown', e => {
    if (lightboxGambar && !lightboxGambar.hidden) {
        if (e.key === 'Escape') {
            e.preventDefault();
            tutupLightboxGambar();
        } else if (e.key === 'ArrowLeft' && indeksLightboxAktif > 0) {
            indeksLightboxAktif--;
            tampilkanSlideLightbox();
        } else if (e.key === 'ArrowRight' && indeksLightboxAktif < daftarPesanGambarLightbox.length - 1) {
            indeksLightboxAktif++;
            tampilkanSlideLightbox();
        }
        return;
    }

    if (panelPreviewGambar && !panelPreviewGambar.hidden && e.key === 'Escape') {
        e.preventDefault();
        tutupPreviewGambar();
    }
});

if (btnBlokirPengguna) btnBlokirPengguna.addEventListener('click', () => {
    if (!chatAktifId) return;
    ubahBlokir(chatAktifId, !penggunaDiblokir(userAktif.id, chatAktifId));
});

if (btnSimpanKontakChat) btnSimpanKontakChat.addEventListener('click', () => {
    if (!chatAktifId || !userAktif || namaKontakTersimpan(chatAktifId)) return;
    const target = getProfilChat(chatAktifId);
    const nama = (window.prompt('Nama untuk kontak ini:', target.hp) || '').trim();
    if (!nama) return;
    try {
        NgumpulKontakData.add(userAktif.id, target.hp, nama);
        perbaruiKontrolKontak();
        renderChatList();
        // Perbarui judul dengan nama kontak yang baru disimpan.
        if (namaHeaderKanan) namaHeaderKanan.textContent = nama;
        tampilkanAvatarChat(avatarHeaderKanan, chatAktifId, nama);
        if (panelInfoPengguna && panelInfoPengguna.getAttribute('aria-hidden') === 'false') tampilkanInfoPengguna();
    } catch (error) {
        window.alert(error.message || 'Kontak gagal disimpan.');
    }
});

function tutupInfoPengguna() {
    if (!panelInfoPengguna) return;
    panelInfoPengguna.setAttribute('aria-hidden', 'true');
}

function tampilkanInfoPengguna() {
    if (!chatAktifId || !panelInfoPengguna) return;
    const target = getProfilChat(chatAktifId);
    document.getElementById('nama-info-pengguna').textContent = target.nama;
    document.getElementById('nomor-info-pengguna').textContent = target.hp || 'Nomor tidak tersedia';
    document.getElementById('username-info-pengguna').textContent = target.username || '';
    tampilkanAvatarChat(document.getElementById('avatar-info-pengguna'), chatAktifId, target.nama);
    const banner = document.getElementById('banner-info-pengguna');
    const urlBanner = ambilBannerProfilChat(chatAktifId);
    banner.hidden = !urlBanner;
    banner.style.backgroundImage = urlBanner ? 'url("' + urlBanner + '")' : '';
    perbaruiKontrolBlokir();
    perbaruiKontrolKontak();
}

if (btnInfoPengguna) btnInfoPengguna.addEventListener('click', () => {
    if (!chatAktifId || !panelInfoPengguna) return;
    tampilkanInfoPengguna();
    panelInfoPengguna.setAttribute('aria-hidden', 'false');
});

document.getElementById('btn-tutup-info-pengguna').addEventListener('click', tutupInfoPengguna);
document.addEventListener('keydown', event => { if (event.key === 'Escape') tutupInfoPengguna(); });

window.addEventListener('storage', event => {
    if (event.key !== KEY_CHAT) return;
    prosesPesanMasuk();
    if (chatAktifId) renderPesanAktif();
    if (pencarianPesanTerbuka()) renderHasilPencarianPesan();
    renderChatList();
});

if (inputCariChat) {
    inputCariChat.addEventListener('input', renderChatList);
}

// ----- Cari pesan di dalam chat: tombol, input, tutup (X / Escape) -----
if (inputCariPesan) {
    inputCariPesan.addEventListener('input', renderHasilPencarianPesan);
}

if (btnToggleCariPesan && inputCariPesan) {
    btnToggleCariPesan.addEventListener('click', () => {
        if (!chatAktifId) return;
        const terbuka = !pencarianPesanTerbuka();
        aturPencarianPesanTerbuka(terbuka);
        if (!terbuka) btnToggleCariPesan.focus();
    });
}

if (btnTutupCariPesan) {
    btnTutupCariPesan.addEventListener('click', () => {
        aturPencarianPesanTerbuka(false);
        if (btnToggleCariPesan) btnToggleCariPesan.focus();
    });
}

// Escape menutup panel walau fokus ada di tombol hasil; lightbox & pratinjau gambar didahulukan
document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !pencarianPesanTerbuka()) return;
    if (lightboxGambar && !lightboxGambar.hidden) return;
    if (panelPreviewGambar && !panelPreviewGambar.hidden) return;
    aturPencarianPesanTerbuka(false);
    if (btnToggleCariPesan) btnToggleCariPesan.focus();
});

if (btnKirimPesan && inputTeksKirim) {
    btnKirimPesan.addEventListener('click', kirimPesanAktif);
    inputTeksKirim.addEventListener('keydown', event => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            kirimPesanAktif();
        }
    });
}

document.addEventListener('ngumpul:buka-chat', event => {
    const idLawan = event && event.detail ? event.detail.idLawan : null;
    if (idLawan) {
        pilihTabDashboard(false);
        bukaChat(idLawan);
    }
});

if (userAktif) {
    prosesPesanMasuk();
    renderChatList();
    if (panelChatKosong && panelChatAktif) {
        panelChatAktif.style.display = 'none';
        panelChatKosong.style.display = 'flex';
    }
}

// ===== Tab Chat / Grup / Kontak di dalam dashboard =====
const tabChat = document.getElementById('tab-chat');
const tabGrup = document.getElementById('tab-grup');
const tabKontak = document.getElementById('tab-kontak');
const tabTelepon = document.getElementById('tab-telepon');
const panelTabChat = document.getElementById('panel-tab-chat');
const panelTabGrup = document.getElementById('panel-tab-grup');
const panelTabKontak = document.getElementById('panel-tab-kontak');

function pilihTabDashboard(tabTujuan) {
    // Tetap mendukung pemanggilan boolean dari alur Chat dan Kontak yang sudah ada.
    const tabAktif = typeof tabTujuan === 'boolean' ? (tabTujuan ? 'kontak' : 'chat') : tabTujuan;
    window.NgumpulRuang?.sinkronSidebarGrup(tabAktif);
    panelTabChat.hidden = tabAktif !== 'chat';
    panelTabGrup.hidden = tabAktif !== 'grup';
    panelTabKontak.hidden = tabAktif !== 'kontak';
    document.getElementById('panel-tab-telepon').hidden = tabAktif !== 'telepon';
    [[tabChat, 'chat'], [tabGrup, 'grup'], [tabKontak, 'kontak'], [tabTelepon, 'telepon']].forEach(([tombol, nama]) => {
        tombol.classList.toggle('aktif', tabAktif === nama);
        tombol.setAttribute('aria-pressed', String(tabAktif === nama));
    });
    if (tabAktif === 'chat') renderChatList();
    if (tabAktif === 'grup') document.dispatchEvent(new CustomEvent('ngumpul:tab-grup'));
    document.dispatchEvent(new CustomEvent('ngumpul:tab-dashboard', { detail: { tabAktif } }));
}

tabChat.addEventListener('click', () => pilihTabDashboard(false));
tabGrup.addEventListener('click', () => pilihTabDashboard('grup'));
tabKontak.addEventListener('click', () => pilihTabDashboard(true));
tabTelepon.addEventListener('click', () => pilihTabDashboard('telepon'));
document.getElementById('btn-kembali-dari-kontak').addEventListener('click', () => {
    pilihTabDashboard(false);
    tabChat.focus();
});
document.addEventListener('ngumpul:buka-chat', () => pilihTabDashboard(false));

// Continue a contact-originated chat request after the dashboard page loads.
const idChatTertunda = new URLSearchParams(location.hash.slice(1)).get('buka-chat');
if (userAktif && idChatTertunda) {
    window.setTimeout(() => {
        document.dispatchEvent(
            new CustomEvent('ngumpul:buka-chat', {
                detail: { idLawan: idChatTertunda }
            })
        );

        // Bersihkan hash setelah permintaan chat diteruskan
        history.replaceState(
            null,
            '',
            location.pathname + location.search
        );
    }, 0);
}

// ===== Elemen utama =====
const triggerMenuUtama = document.getElementById('trigger-menu-utama');
const boxDropdownUtama = document.getElementById('box-dropdown-utama');
const optBukaSetelan = document.getElementById('opt-buka-setelan');

const panelLayerSetelan = document.getElementById('panel-layer-setelan');
const btnKembaliKeChat = document.getElementById('btn-kembali-ke-chat');

const daftarPengaturan = document.querySelector('.settings-list-flow');
const panelPengaturanTema = document.getElementById('panel-setelan-tema');
const panelPengaturanNotifikasi = document.getElementById('panel-setelan-notifikasi');
const judulPanelSetelan = document.getElementById('judul-panel-setelan');

const tombolPilihanTema = document.querySelectorAll('[data-set-theme]');
const menuTema = document.querySelector(
    '.settings-row-item[data-fitur="tema"]'
);

// ===== Menu titik tiga =====
if (triggerMenuUtama && boxDropdownUtama) {
    triggerMenuUtama.addEventListener('click', e => {
        e.stopPropagation();

        const sedangTerbuka =
            getComputedStyle(boxDropdownUtama).display !== 'none';

        boxDropdownUtama.style.display =
            sedangTerbuka ? 'none' : 'block';
    });

    document.addEventListener('click', () => {
        boxDropdownUtama.style.display = 'none';
    });
}

// ===== Panel Pengaturan =====
function bukaSetelan() {
    if (!panelLayerSetelan) return;

    panelLayerSetelan.style.display = 'flex';

    // Untuk layar mobile: panel ada di dalam .sisi-kanan yang disembunyikan CSS
    document.getElementById('panel-sisi-kiri')
        ?.classList.add('room-open');

    document.getElementById('panel-sisi-kanan')
        ?.classList.add('room-open');

    perbaruiEfekKartuProfil();
}

function tutupSetelan() {
    if (panelLayerSetelan) {
        panelLayerSetelan.style.display = 'none';
    }

    document.getElementById('panel-sisi-kiri')
        ?.classList.remove('room-open');

    document.getElementById('panel-sisi-kanan')
        ?.classList.remove('room-open');

    // Bersihkan hash supaya refresh tidak membuka panel lagi
    history.replaceState(
        null,
        '',
        location.pathname + location.search
    );
}

if (optBukaSetelan) {
    optBukaSetelan.addEventListener('click', () => {
        bukaSetelan();

        if (boxDropdownUtama) {
            boxDropdownUtama.style.display = 'none';
        }
    });
}

// ===== Tombol kembali: navigasi subpanel tema =====
if (btnKembaliKeChat) {
    btnKembaliKeChat.addEventListener('click', () => {
        if (panelPengaturanNotifikasi && !panelPengaturanNotifikasi.hidden) {
            panelPengaturanNotifikasi.hidden = true;
            daftarPengaturan.style.display = 'block';
            judulPanelSetelan.textContent = 'Pengaturan';

            const menuNotifikasi = document.getElementById('btn-setelan-notifikasi');
            menuNotifikasi?.setAttribute('aria-expanded', 'false');
            menuNotifikasi?.focus();
        } else if (panelPengaturanTema && !panelPengaturanTema.hidden) {
            panelPengaturanTema.hidden = true;
            daftarPengaturan.style.display = 'block';
            judulPanelSetelan.textContent = 'Pengaturan';
        } else {
            tutupSetelan();
        }
    });
}

// ===== Buka otomatis jika URL menggunakan #settings =====
if (location.hash === '#settings') {
    bukaSetelan();
}

// ===== Keluar akun: pertahankan tema, hapus sesi =====
const btnKeluarAkun = document.getElementById('btn-keluar-akun');

if (btnKeluarAkun) {
    btnKeluarAkun.addEventListener('click', () => {
        try {
            // Pertahankan preferensi tema ketika keluar
            const temaTersimpan = localStorage.getItem('ngumpul_tema');

            hapusSesi();
            sessionStorage.clear();

            if (temaTersimpan) {
                localStorage.setItem('ngumpul_tema', temaTersimpan);
            }
        } catch (error) {
            console.warn('Gagal membersihkan penyimpanan:', error);
        }

        window.location.href = '../auth/login.html';
    });
}

// ===== Membuka halaman Tema & Tampilan =====
function bukaPengaturanTema() {
    if (!daftarPengaturan || !panelPengaturanTema) return;

    daftarPengaturan.style.display = 'none';
    panelPengaturanTema.hidden = false;

    if (judulPanelSetelan) {
        judulPanelSetelan.textContent = 'Tema & Tampilan';
    }
}

if (menuTema) {
    menuTema.addEventListener('click', bukaPengaturanTema);

    menuTema.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            bukaPengaturanTema();
        }
    });
}

// ===== Memperbarui tampilan pilihan tema =====
function perbaruiPilihanTema() {
    const temaAktif = window.NgumpulTheme
        ? window.NgumpulTheme.getTheme()
        : null;

    tombolPilihanTema.forEach(button => {
        const temaButton = button.dataset.setTheme;
        const aktif = temaButton === temaAktif;

        button.classList.toggle('aktif', aktif);
        button.setAttribute('aria-pressed', String(aktif));
    });
}

// ===== Memilih tema =====
tombolPilihanTema.forEach(button => {
    button.addEventListener('click', () => {
        const tema = button.dataset.setTheme;

        if (window.NgumpulTheme) {
            window.NgumpulTheme.setTheme(tema);
        }

        perbaruiPilihanTema();
    });
});

// Inisialisasi pilihan tema
perbaruiPilihanTema();

// ===== Menu Akun -> halaman akun =====
const btnMenuAkun = document.querySelector(
    '.settings-row-item[data-fitur="akun"]'
);

if (btnMenuAkun) {
    btnMenuAkun.style.cursor = 'pointer';

    btnMenuAkun.addEventListener('click', () => {
        window.location.href = '../account/account.html';
    });
}

// ===== Kartu Edit Profil =====
document.addEventListener('click', e => {
    // Jangan anggap klik menu ganti akun sebagai klik kartu profil
    if (e.target.closest('#btn-ganti-akun, #menu-ganti-akun')) {
        return;
    }

    const targetEdit = e.target.closest(
        '[data-fitur="edit-profil"], #btn-buka-edit-profil, .profile-card-trigger'
    );

    if (targetEdit) {
        window.location.href = '../profile/edit-profile.html';
    }
});

// ===== Media profil (avatar & banner dari halaman Edit Profil) =====
const KUNCI_MEDIA = 'ngumpul_media_';

function bacaMedia(idUser) {
    try {
        return JSON.parse(
            localStorage.getItem(KUNCI_MEDIA + idUser)
        ) || {};
    } catch (e) {
        return {};
    }
}

// ===== Isi kartu profil sesuai akun yang login =====
if (userAktif) {
    const profil = getProfil(userAktif.id);
    const kartu = document.getElementById('btn-buka-edit-profil');

    if (profil && kartu) {
        const elemNama =
            kartu.querySelector('#setting-display-name') ||
            kartu.querySelector('b');

        const elemUsername =
            kartu.querySelector('#setting-display-username') ||
            kartu.querySelector('.profil-username');

        const elemBio =
            kartu.querySelector('#setting-display-bio') ||
            kartu.querySelector('.profil-bio');

        if (elemNama) elemNama.textContent = profil.nama;
        if (elemUsername) elemUsername.textContent = profil.username;

        if (elemBio) {
            elemBio.textContent =
                profil.bio || 'Mahasiswa Teknik Informatika';
        }

        // Ambil avatar dan banner dari localStorage
        const media = bacaMedia(userAktif.id);

        // Render avatar
        const imgAvatarOutput = document.getElementById(
            'setting-img-avatar-output'
        );

        const defaultUserIcon =
            document.getElementById('setting-default-user-icon') ||
            kartu.querySelector('.settings-default-user-icon');

        if (
            media.avatar &&
            typeof media.avatar === 'string' &&
            media.avatar.startsWith('data:image/')
        ) {
            if (imgAvatarOutput) {
                imgAvatarOutput.src = media.avatar;
                imgAvatarOutput.style.display = 'block';
            }

            if (defaultUserIcon) {
                defaultUserIcon.style.display = 'none';
            }
        }

        // Render banner
        const bannerPreview = document.getElementById(
            'setting-banner-preview'
        );

        if (
            media.banner &&
            typeof media.banner === 'string' &&
            media.banner.startsWith('data:image/')
        ) {
            if (bannerPreview) {
                bannerPreview.style.backgroundImage =
                    'url("' + media.banner + '")';

                bannerPreview.style.backgroundSize = 'cover';
                bannerPreview.style.backgroundPosition = 'center';
            }
        }
    }

    // Isi menu ganti akun
    const mNama = document.getElementById('akun-menu-nama');
    const mUser = document.getElementById('akun-menu-username');

    if (profil) {
        if (mNama) mNama.textContent = profil.nama;
        if (mUser) mUser.textContent = profil.username;
    }
}

// ===== Kartu profil bisa dibuka dengan keyboard (Enter / Spasi) =====
const kartuProfil = document.getElementById('btn-buka-edit-profil');

if (kartuProfil) {
    kartuProfil.addEventListener('keydown', e => {
        // Abaikan tombol di dalam kartu (panah v)
        if (e.target !== kartuProfil) return;

        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            window.location.href = '../profile/edit-profile.html';
        }
    });
}

// ===== Buang draft Edit Profil yang belum disimpan =====
try {
    sessionStorage.removeItem('draft_profil_edit');
} catch (e) {}

// ===== Panah (v) di kartu profil: menu ganti akun =====
const btnGantiAkun = document.getElementById('btn-ganti-akun');
const menuGantiAkun = document.getElementById('menu-ganti-akun');

function tutupMenuGantiAkun() {
    if (!menuGantiAkun) return;

    menuGantiAkun.hidden = true;

    if (btnGantiAkun) {
        btnGantiAkun.setAttribute('aria-expanded', 'false');
    }
}

if (btnGantiAkun && menuGantiAkun) {
    btnGantiAkun.addEventListener('click', e => {
        // Jangan ikut membuka halaman Edit Profil
        e.stopPropagation();

        const buka = menuGantiAkun.hidden;
        menuGantiAkun.hidden = !buka;

        btnGantiAkun.setAttribute('aria-expanded', String(buka));
    });

    // Klik di luar menu = tutup
    document.addEventListener('click', e => {
        if (!menuGantiAkun.contains(e.target)) {
            tutupMenuGantiAkun();
        }
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            tutupMenuGantiAkun();
        }
    });

    // Beralih akun: akhiri sesi tab ini lalu masuk dengan akun lain
    const btnMasukAkunLain = document.getElementById(
        'btn-masuk-akun-lain'
    );

    if (btnMasukAkunLain) {
        btnMasukAkunLain.addEventListener('click', () => {
            hapusSesi();
            window.location.href = '../auth/login.html';
        });
    }
}

// ===== Efek scroll khusus kartu profil =====
// Kartu ada di paling atas daftar pengaturan: saat digulir ke bawah ia
// memudar & hilang, saat digulir ke atas muncul lagi.
function perbaruiEfekKartuProfil() {
    const profilAtas = document.getElementById('profil-atas');
    const daftar = document.querySelector('.settings-list-flow');

    if (!profilAtas || !daftar) return;

    const tinggi = profilAtas.offsetHeight || 1;

    // 0 = terlihat, 1 = hilang
    const p = Math.min(
        Math.max(daftar.scrollTop / tinggi, 0),
        1
    );

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        profilAtas.style.opacity = p >= 1 ? '0' : '1';
        profilAtas.style.transform = '';
    } else {
        profilAtas.style.opacity = String(1 - p);

        profilAtas.style.transform =
            'scale(' + (1 - 0.05 * p) + ')';
    }

    profilAtas.style.pointerEvents = p >= 0.9 ? 'none' : '';

    if (p >= 0.9) {
        tutupMenuGantiAkun();
    }
}

// ===== Optimasi event scroll =====
let sedangMenjadwalkan = false;

const daftarSetelanScroll = document.querySelector(
    '.settings-list-flow'
);

if (daftarSetelanScroll) {
    daftarSetelanScroll.addEventListener('scroll', () => {
        if (sedangMenjadwalkan) return;

        sedangMenjadwalkan = true;

        requestAnimationFrame(() => {
            sedangMenjadwalkan = false;
            perbaruiEfekKartuProfil();
        });
    }, { passive: true });
}
(function () {
    const userAktif = getUserAktif();
    if (!userAktif) {
        location.replace('../auth/login.html');
        return;
    }

    const daftarKontak = document.getElementById('daftar-kontak');
    const inputCariKontak = document.getElementById('input-cari-kontak');
    const formKontak = document.getElementById('form-tambah-kontak');
    const inputNamaKontak = document.getElementById('input-nama-kontak');
    const inputNomorKontak = document.getElementById('input-nomor-kontak');
    const kodeNegaraKontak = document.getElementById('kode-negara-kontak');
    const tombolTambahKontak = document.getElementById('btn-tambah-kontak');
    const statusKontak = document.getElementById('contact-status');

    function tampilkanStatusKontak(teks, error) {
        statusKontak.textContent = teks;
        statusKontak.dataset.error = error ? 'true' : 'false';
    }

    function buatPesanKosong(teks) {
        const pesan = document.createElement('p');
        pesan.className = 'contact-empty';
        pesan.textContent = teks;
        return pesan;
    }

    // ===== Baca media profil (avatar/banner) dari localStorage =====
    const KUNCI_MEDIA = 'ngumpul_media_';
    function bacaMedia(idUser) {
        try {
            return JSON.parse(
                localStorage.getItem(KUNCI_MEDIA + idUser)
            ) || {};
        } catch (e) {
            return {};
        }
    }

    function cariPengguna(nomor) {
        const pengguna = getUsers();
        for (let i = 0; i < pengguna.length; i++) {
            if (samakanHp(pengguna[i].hp, nomor)) return pengguna[i];
        }
        return null;
    }

    function renderKontak() {
        let kontak;
        try {
            kontak = NgumpulKontakData.search(userAktif.id, inputCariKontak.value);
        } catch (error) {
            tampilkanStatusKontak(error.message || 'Daftar kontak tidak dapat dibaca.', true);
            daftarKontak.replaceChildren(buatPesanKosong('Kontak belum dapat ditampilkan.'));
            return;
        }

        const hasil = kontak.map(item => {
            const user = cariPengguna(item.phone);
            if (user && user.id === userAktif.id) return null;
            const profil = user ? getProfil(user.id) : null;
            return {
                phone: user ? user.hp : item.phone,
                name: item.name || (profil ? profil.nama : item.phone),
                user: user
            };
        })
            .filter(Boolean)
            .sort((a, b) => a.name.localeCompare(b.name, 'id'));

        daftarKontak.replaceChildren();
        if (!hasil.length) {
            daftarKontak.appendChild(buatPesanKosong(
                inputCariKontak.value.trim()
                    ? 'Kontak tidak ditemukan.'
                    : 'Belum ada kontak. Tambahkan nomor HP untuk menyimpannya di browser.'
            ));
            return;
        }

        const warnaAvatar = ['#3984bd', '#8e63aa', '#d17b45', '#368c72', '#bd5d70'];
        hasil.forEach(item => {
            const kartu = document.createElement('div');
            kartu.className = 'contact-card';

            const avatar = document.createElement('div');
            avatar.className = 'contact-avatar';

            // Cek apakah user punya foto profil (avatar) tersimpan di localStorage
            const media = item.user ? bacaMedia(item.user.id) : {};
            if (media.avatar && typeof media.avatar === 'string' && media.avatar.startsWith('data:image/')) {
                const img = document.createElement('img');
                img.src = media.avatar;
                img.alt = item.name;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '50%';
                avatar.appendChild(img);
            } else {
                avatar.textContent = item.name.trim().charAt(0).toUpperCase() || '?';
                const sumberWarna = item.user ? item.user.id : item.phone;
                let indeksWarna = 0;
                for (let i = 0; i < sumberWarna.length; i++) indeksWarna += sumberWarna.charCodeAt(i);
                avatar.style.backgroundColor = warnaAvatar[indeksWarna % warnaAvatar.length];
            }

            const detail = document.createElement('div');
            detail.className = 'contact-details';
            const nama = document.createElement('span');
            nama.className = 'contact-name';
            nama.textContent = item.name;
            const nomor = document.createElement('span');
            nomor.className = 'contact-phone';
            nomor.textContent = item.phone;
            detail.append(nama, nomor);

            const aksi = document.createElement('div');
            aksi.className = 'contact-card-actions';

            const tombolChat = document.createElement('button');
            tombolChat.className = 'contact-chat-button';
            tombolChat.type = 'button';
            tombolChat.textContent = 'Chat';
            tombolChat.setAttribute('aria-label', 'Chat dengan ' + item.name);
            tombolChat.addEventListener('click', () => {
                const user = cariPengguna(item.phone);
                if (!user) {
                    tampilkanStatusKontak('Nomor ini belum terdaftar di Ngumpul, belum bisa dichat', true);
                    return;
                }

                document.dispatchEvent(new CustomEvent('ngumpul:buka-chat', {
                    detail: { idLawan: user.id }
                }));
            });

            const tombolTelepon = document.createElement('button');
            tombolTelepon.className = 'contact-call-button';
            tombolTelepon.type = 'button';
            tombolTelepon.textContent = 'Segera hadir';
            tombolTelepon.disabled = true;
            tombolTelepon.setAttribute('aria-label', 'Telepon suara segera hadir untuk ' + item.name);

            const tombolVideo = document.createElement('button');
            tombolVideo.className = 'contact-call-button';
            tombolVideo.type = 'button';
            tombolVideo.textContent = 'Segera hadir';
            tombolVideo.disabled = true;
            tombolVideo.setAttribute('aria-label', 'Video call segera hadir untuk ' + item.name);

            const tombolHapus = document.createElement('button');
            tombolHapus.className = 'contact-remove-button';
            tombolHapus.type = 'button';
            tombolHapus.dataset.hapusKontak = item.phone;
            tombolHapus.textContent = 'Hapus';
            tombolHapus.setAttribute('aria-label', 'Hapus kontak ' + item.name);

            aksi.append(tombolChat, tombolTelepon, tombolVideo, tombolHapus);
            kartu.append(avatar, detail, aksi);
            daftarKontak.appendChild(kartu);
        });
    }

    NEGARA.forEach(negara => {
        const opsi = document.createElement('option');
        opsi.value = negara[2];
        opsi.textContent = negara[1] + ' (+' + negara[2] + ')';
        kodeNegaraKontak.appendChild(opsi);
    });
    kodeNegaraKontak.value = '62';

    tombolTambahKontak.addEventListener('click', () => {
        formKontak.hidden = !formKontak.hidden;
        tombolTambahKontak.setAttribute('aria-expanded', String(!formKontak.hidden));
        tampilkanStatusKontak('', false);
        if (!formKontak.hidden) inputNamaKontak.focus();
    });

    inputNomorKontak.addEventListener('input', () => {
        inputNomorKontak.value = inputNomorKontak.value.replace(/\D/g, '').slice(0, 15);
    });

    inputCariKontak.addEventListener('input', renderKontak);

    formKontak.addEventListener('submit', event => {
        event.preventDefault();
        const nama = inputNamaKontak.value.trim();
        const nomor = inputNomorKontak.value.trim();
        if (!nama) {
            tampilkanStatusKontak('Nama kontak tidak boleh kosong.', true);
            inputNamaKontak.focus();
            return;
        }
        const kodeNegara = kodeNegaraKontak.value;
        const angkaNomor = digitNomor(nomor, kodeNegara);
        const nomorValid = kodeNegara === '62'
            ? /^8\d{8,11}$/.test(angkaNomor)
            : /^\d{6,14}$/.test(angkaNomor);
        if (!nomorValid) {
            tampilkanStatusKontak(
                kodeNegara === '62'
                    ? 'Nomor Indonesia harus diawali 8 dan terdiri dari 9–12 digit, contoh: 81234567890.'
                    : 'Nomor HP tidak valid untuk kode negara yang dipilih.',
                true
            );
            inputNomorKontak.focus();
            return;
        }

        const phone = hpInternasional(kodeNegara, nomor);
        if (samakanHp(userAktif.hp, phone)) {
            tampilkanStatusKontak('Kamu tidak dapat menambahkan akun sendiri.', true);
            inputNomorKontak.focus();
            return;
        }

        try {
            const hasil = NgumpulKontakData.add(userAktif.id, phone, nama);
            inputNamaKontak.value = '';
            inputNomorKontak.value = '';
            tampilkanStatusKontak(
                hasil.updated ? 'Nama kontak berhasil diperbarui.' : 'Kontak berhasil disimpan di browser.',
                false
            );
            renderKontak();
        } catch (error) {
            tampilkanStatusKontak(error.message || 'Kontak gagal disimpan.', true);
        }
    });

    daftarKontak.addEventListener('click', event => {
        const tombol = event.target.closest('[data-hapus-kontak]');
        if (!tombol) return;
        try {
            if (!NgumpulKontakData.remove(userAktif.id, tombol.dataset.hapusKontak)) return;
            tampilkanStatusKontak('Kontak berhasil dihapus dari browser.', false);
            renderKontak();
        } catch (error) {
            tampilkanStatusKontak(error.message || 'Kontak gagal dihapus.', true);
        }
    });

    window.addEventListener('storage', event => {
        if (NgumpulKontakData.isContactsStorageKey(userAktif.id, event.key) ||
            event.key === 'ngumpul_users') {
            renderKontak();
        }
    });

    renderKontak();
})();


// ===== Panel profil baca-saja, dipakai chat pribadi dan anggota grup =====
function tampilkanInfoKontak(id) {
    const akun = getUserById(id);
    if (!akun) return;
    const profil = getProfil(id),
        wadah = document.getElementById('foto-info-kontak');
    tampilkanAvatarChat(wadah, id, profil.nama || akun.nama);
    document.getElementById('nama-info-kontak').textContent = profil.nama || akun.nama;
    document.getElementById('nomor-info-kontak').textContent =
        profil.phone || akun.hp || 'Nomor tidak tersedia';
    const bio = bacaSemuaProfil()[id]?.bio;
    document.getElementById('bio-info-kontak').textContent = bio && bio.trim() ? bio : 'Belum ada deskripsi';
    const dialog = document.getElementById('dialog-info-kontak');
    dialog.dataset.akunId = id;
    if (!dialog.open) {
        dialog.showModal();
        dialog.querySelector('.detail-panel-content').scrollTop = 0;
    }
}
(function () {
    document.getElementById('btn-info-kontak-chat').addEventListener('click', () => {
        if (chatAktifId) tampilkanInfoKontak(chatAktifId);
    });
    document.querySelectorAll('[data-tutup-dialog]').forEach((tombol) => {
        tombol.addEventListener('click', () => tombol.closest('dialog').close());
    });
    document.querySelectorAll('dialog.dashboard-detail-panel, dialog.grup-dialog').forEach((dialog) => {
        dialog.addEventListener('click', (event) => {
            if (event.target !== dialog) return;
            const r = dialog.getBoundingClientRect();
            if (
                event.clientX < r.left ||
                event.clientX > r.right ||
                event.clientY < r.top ||
                event.clientY > r.bottom
            )
                dialog.close();
        });
    });
    document
        .getElementById('dialog-info-kontak')
        .addEventListener('close', () => document.dispatchEvent(new CustomEvent('ngumpul:profil-ditutup')));
    document.getElementById('btn-kembali-chat-pribadi').addEventListener('click', () => {
        document.getElementById('panel-sisi-kiri').classList.remove('room-open');
        document.getElementById('panel-sisi-kanan').classList.remove('room-open');
        document.getElementById('tab-chat').focus();
    });
    document.addEventListener('ngumpul:tab-dashboard', (event) => {
        const dialog = document.getElementById('dialog-info-kontak');
        if (dialog.open) dialog.close();
        if (event.detail.tabAktif !== 'chat') {
            document.getElementById('panel-sisi-kiri').classList.remove('room-open');
            document.getElementById('panel-sisi-kanan').classList.remove('room-open');
        }
    });
    window.addEventListener('storage', (event) => {
        const dialog = document.getElementById('dialog-info-kontak');
        if (
            dialog.open &&
            ['ngumpul_users', 'ngumpul_profil', 'ngumpul_media_' + dialog.dataset.akunId].includes(event.key)
        ) {
            if (getUserById(dialog.dataset.akunId)) tampilkanInfoKontak(dialog.dataset.akunId);
            else dialog.close();
        }
    });
})();

// ===== Grup: tampilan, izin, percakapan, dan adapter lokal =====
(function () {
    if (!userAktif) return;
    const $ = (id) => document.getElementById(id);
    const KUNCI_GRUP = 'ngumpul_grup',
        PESAN = 'ngumpul_pesan_grup_',
        STATUS = 'ngumpul_status_grup_';
    const daftar = $('daftar-grup'),
        panel = $('panel-chat-grup'),
        info = $('panel-info-grup'),
        input = $('input-pesan-grup');
    const draft = new Map(),
        percobaan = new Map(),
        statusBerubah = new Set();
    let aktif = null,
        infoId = null,
        grupAktif = null,
        fotoDraft = '',
        fotoDiproses = false,
        versiFoto = 0;
    let sesiEditor = 0,
        editAktif = null,
        sedangSimpan = false,
        kirim = false;
    let versiList = 0,
        versiChat = 0,
        versiBuka = 0,
        versiInfo = 0,
        jenisBerkas = 'media';
    let jadwalSegar = null,
        dataBerubah = false,
        menuTarget = null,
        menuPemicu = null;
    let alur = null,
        versiAlur = 0;
    let menuAnggota = null,
        jadwalTanggal = null;
    const el = (tag, kelas, teks) => {
        const n = document.createElement(tag);
        if (kelas) n.className = kelas;
        if (teks !== undefined) n.textContent = teks;
        return n;
    };
    const status = (id, teks, error = false) => {
        $(id).textContent = teks;
        $(id).dataset.error = String(error);
        delete $(id).dataset.sumber;
    };
    const kosong = (teks) => el('p', 'grup-kosong', teks);
    const namaAkun = (id) => getProfil(id).nama || getUserById(id)?.nama || 'Anggota';
    const fotoAkun = (id) => ambilFotoProfilChat(id);
    const unik = (data) => [...new Set(data)];
    const admin = (g) => !g.keluar && g.adminIds.includes(userAktif.id);
    const kode = () => (window.crypto?.randomUUID ? crypto.randomUUID() : buatId() + buatId());
    const awalPesan = (id) => PESAN + encodeURIComponent(id) + ':';
    const awalStatus = (g, p, u) => STATUS + [g, p, u].map(encodeURIComponent).join(':') + ':';
    function ikon(id) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('ikon');
        svg.setAttribute('aria-hidden', 'true');
        const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        use.setAttribute('href', '#' + id);
        svg.append(use);
        return svg;
    }
    function avatar(node, nama, foto) {
        node.replaceChildren();
        if (foto && /^data:image\/(png|jpeg|webp);base64,/.test(foto)) {
            const img = el('img');
            img.src = foto;
            img.alt = '';
            node.append(img);
        } else node.textContent = (nama || '?').trim().charAt(0).toUpperCase() || '?';
    }
    function warnaUntuk(ids, lama, grupId) {
        const warna = Object.fromEntries(
            Object.entries(lama || {}).filter(([, v]) => Number.isFinite(v) && v >= 0 && v < 360)
        );
        let seed = 0;
        for (const c of grupId) seed = (seed * 31 + c.charCodeAt(0)) % 360;
        ids.forEach((id) => {
            if (Object.hasOwn(warna, id)) return;
            const used = unik(Object.values(warna)).sort((a, b) => a - b);
            let hue = seed;
            if (used.length) {
                let gap = -1;
                for (let i = 0; i < used.length; i++) {
                    const next = i === used.length - 1 ? used[0] + 360 : used[i + 1];
                    if (next - used[i] > gap) {
                        gap = next - used[i];
                        hue = (used[i] + gap / 2) % 360;
                    }
                }
            }
            warna[id] = hue;
        });
        return warna;
    }
    function avatarAnggota(node, g, id) {
        node.classList.add('grup-avatar-anggota');
        node.style.setProperty('--anggota-hue', String(g.warnaAnggota[id] ?? 0));
        avatar(node, namaAkun(id), fotoAkun(id));
    }
    function bacaKeanggotaan(g) {
        const hasil = Object.fromEntries(
            Object.entries(g.keanggotaan || {}).filter(
                ([, data]) =>
                    data &&
                    ['buat', 'tambah', 'tautan'].includes(data.cara) &&
                    Number.isFinite(data.waktu) &&
                    typeof data.oleh === 'string'
            )
        );
        for (const a of g.aktivitas || []) {
            if (!['tambah', 'gabung'].includes(a.aksi)) continue;
            if (hasil[a.anggotaId] && hasil[a.anggotaId].waktu >= a.dibuat) continue;
            hasil[a.anggotaId] = {
                cara: a.aksi === 'gabung' ? 'tautan' : 'tambah',
                waktu: a.dibuat,
                oleh: a.aktorId
            };
        }
        if (!Object.hasOwn(hasil, g.pembuatId))
            hasil[g.pembuatId] = { cara: 'buat', waktu: g.dibuat, oleh: g.pembuatId };
        return hasil;
    }
    function bacaGrup() {
        let data;
        try {
            data = JSON.parse(localStorage.getItem(KUNCI_GRUP) || '[]');
        } catch (_) {
            throw new Error('Data grup tidak bisa dibaca.');
        }
        if (!Array.isArray(data)) throw new Error('Data grup tidak valid.');
        const ids = new Set();
        return data.map((g) => {
            if (
                !g ||
                typeof g.id !== 'string' ||
                !g.id ||
                ids.has(g.id) ||
                typeof g.nama !== 'string' ||
                !g.nama.trim() ||
                typeof g.pembuatId !== 'string' ||
                !Array.isArray(g.anggotaIds) ||
                !g.anggotaIds.every((id) => typeof id === 'string' && id) ||
                !Number.isFinite(g.dibuat)
            )
                throw new Error('Data grup tidak valid.');
            ids.add(g.id);
            const anggotaIds = unik(g.anggotaIds);
            let adminIds = unik(Array.isArray(g.adminIds) ? g.adminIds : [g.pembuatId]).filter(
                (id) => anggotaIds.includes(id)
            );
            if (!adminIds.length && anggotaIds.length) adminIds = [anggotaIds[0]];
            const aktivitas = Array.isArray(g.aktivitas) ? g.aktivitas : [];
            if (
                !aktivitas.every(
                    (a) =>
                        a &&
                        typeof a.id === 'string' &&
                        a.grupId === g.id &&
                        typeof a.aksi === 'string' &&
                        typeof a.aktorId === 'string' &&
                        typeof a.anggotaId === 'string' &&
                        Number.isFinite(a.dibuat)
                )
            )
                throw new Error('Riwayat aktivitas tidak valid.');
            return {
                ...g,
                anggotaIds,
                adminIds,
                deskripsi: g.deskripsi || '',
                foto: g.foto || '',
                aktivitas,
                keanggotaan: bacaKeanggotaan({ ...g, aktivitas }),
                warnaAnggota: warnaUntuk(anggotaIds, g.warnaAnggota, g.id),
                arsipAkun: g.arsipAkun && typeof g.arsipAkun === 'object' ? g.arsipAkun : {},
                dihapusUntuk:
                    g.dihapusUntuk && typeof g.dihapusUntuk === 'object' ? g.dihapusUntuk : {},
                batasPesan: g.batasPesan && typeof g.batasPesan === 'object' ? g.batasPesan : {},
                anggotaBolehUndang: g.anggotaBolehUndang !== false
            };
        });
    }
    function grupLokal(id) {
        const g = bacaGrup().find((g) => g.id === id);
        if (!g || !g.anggotaIds.includes(userAktif.id))
            throw new Error('Kamu bukan anggota grup ini.');
        return g;
    }
    function simpanGrup(data) {
        try {
            localStorage.setItem(KUNCI_GRUP, JSON.stringify(data));
        } catch (_) {
            throw new Error('Grup gagal disimpan. Coba lagi.');
        }
    }
    function transaksiGrup(aksi) {
        return navigator.locks?.request
            ? navigator.locks.request('ngumpul:grup', aksi)
            : Promise.resolve().then(aksi);
    }
    function bacaRiwayatLokal(id) {
        let data;
        try {
            data = JSON.parse(localStorage.getItem(PESAN + id) || '[]');
            if (!Array.isArray(data)) throw new Error();
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith(awalPesan(id)))
                    data.push(JSON.parse(localStorage.getItem(key)));
            }
        } catch (_) {
            throw new Error('Riwayat pesan tidak bisa dibaca.');
        }
        if (
            !data.every(
                (p) =>
                    p &&
                    typeof p.id === 'string' &&
                    p.grupId === id &&
                    typeof p.pengirimId === 'string' &&
                    typeof p.isi === 'string' &&
                    Number.isFinite(p.dibuat)
            )
        )
            throw new Error('Riwayat pesan tidak valid.');
        return [...new Map(data.map((p) => [p.id, p])).values()];
    }
    function tetapkanPenerimaLama(g) {
        bacaRiwayatLokal(g.id)
            .filter((p) => !Array.isArray(p.penerimaIds))
            .forEach((p) => {
                const item = {
                    ...p,
                    penerimaIds: g.anggotaIds.filter((id) => id !== p.pengirimId)
                };
                try {
                    localStorage.setItem(
                        awalPesan(g.id) + encodeURIComponent(p.id),
                        JSON.stringify(item)
                    );
                } catch (_) {
                    throw new Error('Perubahan anggota gagal disimpan.');
                }
            });
    }
    function pesanUntuk(g, akunId = userAktif.id) {
        return bacaRiwayatLokal(g.id)
            .filter((p) => p.dibuat >= (g.batasPesan[akunId] || 0))
            .map((p) => {
                const penerimaIds = Array.isArray(p.penerimaIds)
                    ? p.penerimaIds
                    : g.anggotaIds.filter((id) => id !== p.pengirimId);
                const semua = (t) =>
                    penerimaIds.length > 0 &&
                    penerimaIds.every(
                        (id) => localStorage.getItem(awalStatus(g.id, p.id, id) + t) !== null
                    );
                return {
                    ...p,
                    penerimaIds,
                    status: semua('dibaca') ? 'dibaca' : semua('diterima') ? 'diterima' : 'terkirim'
                };
            });
    }
    function riwayatUntuk(g, akunId = userAktif.id) {
        return [
            ...pesanUntuk(g, akunId),
            ...g.aktivitas.filter((a) => a.dibuat >= (g.batasPesan[akunId] || 0))
        ].sort((a, b) => a.dibuat - b.dibuat || a.id.localeCompare(b.id));
    }
    function salinIdentitas(g) {
        const { arsipAkun, dihapusUntuk, batasPesan, ...identitas } = g;
        return identitas;
    }
    function arsipkan(g, id, alasan) {
        g.arsipAkun[id] = {
            grup: salinIdentitas(g),
            riwayat: riwayatUntuk(g, id),
            alasan,
            dibuat: Date.now()
        };
    }
    function terlihat(g) {
        if (g.anggotaIds.includes(userAktif.id)) return { ...g, keluar: false };
        const arsip = g.arsipAkun[userAktif.id];
        return arsip
            ? { ...arsip.grup, keluar: true, alasan: arsip.alasan, riwayat: arsip.riwayat }
            : null;
    }
    function catat(g, aksi, anggotaId) {
        const dibuat = Date.now();
        g.aktivitas.push({
            id: 'aktivitas_' + kode(),
            grupId: g.id,
            jenis: 'aktivitas',
            aksi,
            aktorId: userAktif.id,
            anggotaId,
            dibuat
        });
    }
    function ubahLokal(id, ubah, perluAdmin = true) {
        return transaksiGrup(() => {
            const semua = bacaGrup(),
                g = semua.find((g) => g.id === id);
            if (!g || !g.anggotaIds.includes(userAktif.id))
                throw new Error('Kamu bukan anggota grup ini.');
            if (perluAdmin && !admin(g))
                throw new Error('Hanya admin yang dapat melakukan tindakan ini.');
            const sebelum = { ...g, anggotaIds: [...g.anggotaIds] };
            ubah(g);
            if (sebelum.anggotaIds.join('\0') !== g.anggotaIds.join('\0'))
                tetapkanPenerimaLama(sebelum);
            simpanGrup(semua);
            return g;
        });
    }
    function kontakTerdaftar() {
        const hasil = new Map(),
            users = getUsers();
        NgumpulKontakData.list(userAktif.id).forEach((k) => {
            const akun = users.find((u) => samakanHp(u.hp, k.phone));
            if (akun && akun.id !== userAktif.id)
                hasil.set(akun.id, { id: akun.id, nama: k.name || namaAkun(akun.id), hp: akun.hp });
        });
        return [...hasil.values()].sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
    }
    function masuk(g, ids, lewatTautan = false) {
        const baru = unik(ids).filter((id) => !g.anggotaIds.includes(id));
        baru.forEach((id) => {
            const waktu = Date.now();
            g.anggotaIds.push(id);
            if (g.dihapusUntuk[id]) g.batasPesan[id] = waktu;
            g.keanggotaan[id] = {
                cara: lewatTautan ? 'tautan' : 'tambah',
                waktu,
                oleh: userAktif.id
            };
            delete g.arsipAkun[id];
            delete g.dihapusUntuk[id];
            catat(g, lewatTautan ? 'gabung' : 'tambah', id);
        });
        g.warnaAnggota = warnaUntuk(g.anggotaIds, g.warnaAnggota, g.id);
    }
    const backendGrup = null;
    const adapterLokal = {
        async inisialisasi() {
            return transaksiGrup(() => {
                const raw = JSON.parse(localStorage.getItem(KUNCI_GRUP) || '[]');
                const semua = bacaGrup();
                if (
                    raw.some(
                        (g, i) =>
                            !g.warnaAnggota ||
                            semua[i].anggotaIds.some((id) => !Object.hasOwn(g.warnaAnggota, id))
                    )
                )
                    simpanGrup(semua);
            });
        },
        async daftarGrup() {
            return bacaGrup()
                .map(terlihat)
                .filter(Boolean)
                .map((g) => {
                    const riwayat = g.keluar ? g.riwayat : riwayatUntuk(g);
                    return { ...g, terakhir: riwayat.at(-1) || null };
                });
        },
        async ambilGrup(id) {
            const g = bacaGrup().find((g) => g.id === id),
                hasil = g && terlihat(g);
            if (!hasil) throw new Error('Grup tidak tersedia.');
            return hasil;
        },
        async buatGrup({ nama, anggotaIds, foto = '' }) {
            const valid = new Set(kontakTerdaftar().map((k) => k.id)),
                ids = unik(anggotaIds);
            if (
                !nama.trim() ||
                nama.trim().length > 60 ||
                !ids.length ||
                ids.some((id) => !valid.has(id))
            )
                throw new Error('Periksa nama dan anggota grup.');
            if (foto && !/^data:image\/(png|jpeg|webp);base64,/.test(foto))
                throw new Error('Foto tidak valid.');
            return transaksiGrup(() => {
                const semua = bacaGrup();
                let id;
                do {
                    id = 'grup_' + kode();
                } while (semua.some((g) => g.id === id));
                const g = {
                    id,
                    nama: nama.trim(),
                    foto,
                    deskripsi: '',
                    pembuatId: userAktif.id,
                    adminIds: [userAktif.id],
                    anggotaIds: [userAktif.id, ...ids],
                    dibuat: Date.now(),
                    anggotaBolehUndang: true,
                    kodeUndangan: kode(),
                    aktivitas: [],
                    arsipAkun: {},
                    dihapusUntuk: {},
                    batasPesan: {}
                };
                g.warnaAnggota = warnaUntuk(g.anggotaIds, {}, id);
                g.keanggotaan = Object.fromEntries(
                    g.anggotaIds.map((akunId) => [
                        akunId,
                        {
                            cara: akunId === userAktif.id ? 'buat' : 'tambah',
                            waktu: g.dibuat,
                            oleh: userAktif.id
                        }
                    ])
                );
                simpanGrup([...semua, g]);
                return g;
            });
        },
        async ubahInfo(id, data) {
            if (!data.nama.trim() || data.nama.trim().length > 60 || data.deskripsi.length > 512)
                throw new Error('Nama maksimal 60 karakter. Deskripsi maksimal 512 karakter.');
            if (data.foto && !/^data:image\/(png|jpeg|webp);base64,/.test(data.foto))
                throw new Error('Foto tidak valid.');
            return ubahLokal(id, (g) =>
                Object.assign(g, {
                    nama: data.nama.trim(),
                    deskripsi: data.deskripsi.trim(),
                    foto: data.foto
                })
            );
        },
        async tambahAnggota(id, ids) {
            const valid = new Set(kontakTerdaftar().map((k) => k.id));
            if (!ids.length || ids.some((id) => !valid.has(id)))
                throw new Error('Pilih kontak yang sudah terdaftar.');
            return ubahLokal(id, (g) => masuk(g, ids));
        },
        async tindakanAnggota(id, target, aksi) {
            return ubahLokal(id, (g) => {
                if (!g.anggotaIds.includes(target))
                    throw new Error('Anggota sudah tidak tersedia.');
                if (aksi === 'admin') g.adminIds = unik([...g.adminIds, target]);
                else if (aksi === 'nonadmin') {
                    if (g.adminIds.length === 1 && g.adminIds.includes(target))
                        throw new Error('Tambahkan admin lain terlebih dahulu.');
                    g.adminIds = g.adminIds.filter((x) => x !== target);
                } else if (aksi === 'hapus') {
                    if (target === userAktif.id)
                        throw new Error('Gunakan Keluar grup untuk akun sendiri.');
                    tetapkanPenerimaLama(g);
                    catat(g, 'hapus', target);
                    arsipkan(g, target, 'dikeluarkan');
                    g.anggotaIds = g.anggotaIds.filter((x) => x !== target);
                    g.adminIds = g.adminIds.filter((x) => x !== target);
                } else throw new Error('Tindakan tidak tersedia.');
            });
        },
        async keluar(id, hapus = false) {
            return ubahLokal(
                id,
                (g) => {
                    if (g.anggotaIds.length > 1 && g.adminIds.includes(userAktif.id) && g.adminIds.length === 1)
                        throw new Error('Jadikan anggota lain sebagai admin sebelum keluar.');
                    tetapkanPenerimaLama(g);
                    catat(g, 'keluar', userAktif.id);
                    if (hapus) {
                        delete g.arsipAkun[userAktif.id];
                        g.dihapusUntuk[userAktif.id] = Date.now();
                    } else arsipkan(g, userAktif.id, 'keluar');
                    g.anggotaIds = g.anggotaIds.filter((x) => x !== userAktif.id);
                    g.adminIds = g.adminIds.filter((x) => x !== userAktif.id);
                },
                false
            );
        },
        async hapusGrup(id) {
            return transaksiGrup(() => {
                const semua = bacaGrup(),
                    g = semua.find((g) => g.id === id);
                if (!g || g.anggotaIds.includes(userAktif.id))
                    throw new Error('Keluar dari grup terlebih dahulu.');
                delete g.arsipAkun[userAktif.id];
                g.dihapusUntuk[userAktif.id] = Date.now();
                simpanGrup(semua);
            });
        },
        async gabung(id, token) {
            return transaksiGrup(() => {
                const semua = bacaGrup(),
                    g = semua.find((g) => g.id === id && g.anggotaIds.length);
                if (!g || !token || g.kodeUndangan !== token)
                    throw new Error('Undangan tidak tersedia.');
                if (!g.anggotaIds.includes(userAktif.id)) {
                    tetapkanPenerimaLama(g);
                    masuk(g, [userAktif.id], true);
                    simpanGrup(semua);
                }
                return g;
            });
        },
        async ambilPesan(id) {
            const g = await this.ambilGrup(id);
            return g.keluar ? g.riwayat : riwayatUntuk(g);
        },
        async kirimPesan(id, pesan) {
            return transaksiGrup(() => {
                const g = grupLokal(id),
                    riwayat = pesanUntuk(g);
                if (
                    pesan.pengirimId !== userAktif.id ||
                    (!pesan.isi.trim() && !pesan.lampiran?.length) ||
                    pesan.isi.length > 4000
                )
                    throw new Error('Pesan tidak valid.');
                if (pesan.channelId && !g.ruang?.channels.some(c => c.id === pesan.channelId && c.jenis === 'teks'))
                    throw new Error('Channel sudah tidak tersedia.');
                const lama = riwayat.find((p) => p.id === pesan.id);
                if (lama) return lama;
                const baru = {
                    ...pesan,
                    grupId: id,
                    penerimaIds: g.anggotaIds.filter((x) => x !== userAktif.id)
                };
                try {
                    localStorage.setItem(
                        awalPesan(id) + encodeURIComponent(baru.id),
                        JSON.stringify(baru)
                    );
                } catch (_) {
                    throw new Error('Pesan gagal dikirim. Coba lagi.');
                }
                return baru;
            });
        },
        async tandaiStatus(id, dibaca, channelId = null) {
            const g = grupLokal(id);
            pesanUntuk(g)
                .filter(
                    (p) => p.pengirimId !== userAktif.id && p.penerimaIds.includes(userAktif.id) &&
                        (!channelId || (p.channelId || g.ruang?.channels.find(c => c.bawaan)?.id) === channelId)
                )
                .forEach((p) => {
                    const prefix = awalStatus(id, p.id, userAktif.id);
                    ['diterima', ...(dibaca ? ['dibaca'] : [])].forEach((t) => {
                        if (localStorage.getItem(prefix + t) === null)
                            localStorage.setItem(prefix + t, String(Date.now()));
                    });
                });
        },
        async ambilBerkas(id) {
            return (await this.ambilPesan(id))
                .flatMap((p) => (Array.isArray(p.lampiran) ? p.lampiran : []))
                .filter((b) => b && typeof b === 'object');
        },
        langganan(callback) {
            const listener = (e) => {
                if (e.key === null || e.key === KUNCI_GRUP) callback({ jenis: 'grup' });
                else if (e.key.startsWith(PESAN) || e.key.startsWith(STATUS)) {
                    const jenis = e.key.startsWith(PESAN) ? 'pesan' : 'status',
                        prefix = jenis === 'pesan' ? PESAN : STATUS;
                    let id = e.key.slice(prefix.length).split(':')[0];
                    try {
                        id = decodeURIComponent(id);
                    } catch (_) {
                        return;
                    }
                    callback({ jenis, grupId: id });
                }
            };
            window.addEventListener('storage', listener);
            return () => window.removeEventListener('storage', listener);
        }
    };
    const layananGrup = backendGrup || adapterLokal;

    function teksAktivitas(a) {
        const nama = (id) => (id === userAktif.id ? 'Kamu' : namaAkun(id));
        if (a.aksi === 'tambah') return nama(a.aktorId) + ' menambahkan ' + nama(a.anggotaId);
        if (a.aksi === 'gabung') return nama(a.anggotaId) + ' bergabung melalui tautan undangan';
        if (a.aksi === 'keluar') return nama(a.anggotaId) + ' keluar';
        if (a.aksi === 'hapus') return nama(a.aktorId) + ' mengeluarkan ' + nama(a.anggotaId);
        return '';
    }
    async function renderGrup() {
        if (window.NgumpulRuang) return window.NgumpulRuang.renderList();
        const v = ++versiList;
        try {
            const semua = await layananGrup.daftarGrup();
            if (v !== versiList) return;
            if ($('status-grup').dataset.sumber === 'daftar') status('status-grup', '');
            const q = $('input-cari-grup').value.trim().toLowerCase();
            const hasil = semua
                .filter((g) => g.nama.toLowerCase().includes(q))
                .sort(
                    (a, b) => (b.terakhir?.dibuat || b.dibuat) - (a.terakhir?.dibuat || a.dibuat)
                );
            daftar.replaceChildren();
            if (!hasil.length)
                daftar.append(kosong(q ? 'Grup tidak ditemukan.' : 'Belum ada grup.'));
            hasil.forEach((g) => {
                const row = el('div', 'chat-card grup-baris' + (aktif === g.id ? ' aktif' : ''));
                row.dataset.grupId = g.id;
                const buka = el('button', 'grup-baris-buka');
                buka.type = 'button';
                buka.setAttribute('aria-pressed', String(aktif === g.id));
                const av = el('div', 'circle-avatar');
                avatar(av, g.nama, g.foto);
                const meta = el('div', 'card-meta'),
                    top = el('div', 'card-top'),
                    jam = el('small');
                jam.textContent = g.terakhir
                    ? formatJamPesan(new Date(g.terakhir.dibuat).toISOString())
                    : '';
                top.append(el('span', 'card-title', g.nama), jam);
                const cuplikan = g.terakhir
                    ? g.terakhir.jenis === 'aktivitas'
                        ? teksAktivitas(g.terakhir)
                        : (g.terakhir.pengirimId === userAktif.id
                              ? 'you'
                              : namaAkun(g.terakhir.pengirimId)) +
                          ': ' +
                          g.terakhir.isi.replace(/\s+/g, ' ')
                    : 'Mulai chat grup';
                meta.append(top, el('p', 'card-preview', cuplikan));
                buka.append(av, meta);
                buka.addEventListener('click', () => bukaChat(g.id));
                const tombol = el('button', 'grup-row-menu');
                tombol.append(ikon('i-more'));
                tombol.type = 'button';
                tombol.setAttribute('aria-label', 'Menu ' + g.nama);
                tombol.setAttribute('aria-haspopup', 'menu');
                tombol.addEventListener('click', () => {
                    const r = tombol.getBoundingClientRect();
                    bukaMenu(g.id, r.right, r.bottom, tombol);
                });
                row.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    const r = row.getBoundingClientRect();
                    bukaMenu(g.id, e.clientX || r.left + 24, e.clientY || r.top + 24, tombol);
                });
                row.append(buka, tombol);
                daftar.append(row);
            });
            if (aktif) {
                const g = semua.find((g) => g.id === aktif);
                if (!g) tutupChat();
                else {
                    grupAktif = g;
                    judulChat(g);
                    if (!info.hidden && infoId === g.id) await renderInfo(g);
                }
            }
        } catch (e) {
            if (v !== versiList) return;
            daftar.replaceChildren(kosong('Grup belum bisa ditampilkan.'));
            status('status-grup', e.message, true);
            $('status-grup').dataset.sumber = 'daftar';
        }
    }
    function judulChat(g) {
        grupAktif = g;
        $('nama-chat-grup').textContent = g.nama;
        const nama = g.anggotaIds.filter((id) => id !== userAktif.id).map(namaAkun);
        if (g.anggotaIds.includes(userAktif.id)) nama.push('you');
        $('anggota-chat-grup').textContent = nama.join(', ');
        $('anggota-chat-grup').title = nama.join(', ');
        avatar($('avatar-chat-grup'), g.nama, g.foto);
        $('form-pesan-grup').hidden = !!g.keluar;
        input.disabled = !!g.keluar;
        $('status-keanggotaan-grup').hidden = !g.keluar;
        $('status-keanggotaan-grup').textContent =
            g.alasan === 'dikeluarkan'
                ? 'Kamu telah dikeluarkan dari grup ini.'
                : 'Kamu sudah keluar dari grup ini.';
        aturTinggiInput();
    }
    function simpanDraft() {
        if (aktif && !grupAktif?.keluar) draft.set(aktif, input.value);
    }
    function tutupChat() {
        simpanDraft();
        tutupInfo(false);
        aktif = null;
        grupAktif = null;
        versiChat++;
        versiBuka++;
        panel.hidden = true;
        ['panel-sisi-kiri', 'panel-sisi-kanan'].forEach((id) =>
            $(id).classList.remove('grup-chat-open')
        );
        status('status-chat-grup', '');
    }
    function bolehBaca(id) {
        return (
            aktif === id &&
            !grupAktif?.keluar &&
            !panel.hidden &&
            !alur &&
            document.visibilityState === 'visible' &&
            document.hasFocus() &&
            getComputedStyle($('panel-layer-setelan')).display === 'none' &&
            (info.hidden || !matchMedia('(max-width: 900px)').matches) &&
            !document.querySelector('dialog[open]')
        );
    }
    function tanggalLokal(waktu) {
        const d = new Date(waktu);
        return [
            d.getFullYear(),
            String(d.getMonth() + 1).padStart(2, '0'),
            String(d.getDate()).padStart(2, '0')
        ].join('-');
    }
    function formatTanggal(waktu) {
        const sekarang = new Date(),
            kemarin = new Date(sekarang.getFullYear(), sekarang.getMonth(), sekarang.getDate() - 1),
            tanggal = tanggalLokal(waktu);
        if (tanggal === tanggalLokal(sekarang)) return 'Hari ini';
        if (tanggal === tanggalLokal(kemarin)) return 'Kemarin';
        return new Date(waktu).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }
    function pemisahTanggal(waktu) {
        const node = el('div', 'grup-date-divider'),
            time = el('time', '', formatTanggal(waktu));
        time.dateTime = tanggalLokal(waktu);
        node.dataset.kunciRiwayat = 'tanggal:' + time.dateTime;
        node.append(time);
        return node;
    }
    function teksPembuatanGrup(g) {
        const sekarang = new Date(),
            kemarin = new Date(sekarang.getFullYear(), sekarang.getMonth(), sekarang.getDate() - 1),
            hari = tanggalLokal(g.dibuat),
            tanggal = hari === tanggalLokal(sekarang)
                ? 'today'
                : hari === tanggalLokal(kemarin)
                  ? 'yesterday'
                  : 'on ' + new Date(g.dibuat).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'long', year: 'numeric'
                    });
        return 'Created ' + tanggal + ' by ' + namaAkun(g.pembuatId);
    }
    function kartuAwal(g, animasi) {
        const masuk = bacaKeanggotaan(g)[userAktif.id],
            batas = g.batasPesan?.[userAktif.id] || 0;
        if (batas && (!masuk || masuk.waktu < batas)) return null;
        const node = $('template-awal-grup').content.firstElementChild.cloneNode(true);
        node.dataset.kunciRiwayat = 'awal:' + g.id;
        if (animasi) node.classList.add('grup-intro-masuk');
        avatar(node.querySelector('.grup-intro-avatar'), g.nama, g.foto);
        node.querySelector('.grup-intro-title').textContent =
            masuk?.cara === 'buat'
                ? 'Kamu membuat grup ini'
                : masuk?.cara === 'tambah'
                  ? namaAkun(masuk.oleh) + ' menambahkan kamu ke grup ini'
                  : masuk?.cara === 'tautan'
                    ? 'Kamu bergabung menggunakan tautan undangan grup ini'
                    : 'Kamu adalah anggota grup ini';
        node.querySelector('.grup-intro-members').textContent = g.anggotaIds.length + ' anggota';
        node.querySelector('.grup-intro-created').textContent = teksPembuatanGrup(g);
        const tambah = node.querySelector('[data-aksi="tambah"]'),
            undang = node.querySelector('[data-aksi="undang"]');
        tambah.hidden = !admin(g);
        undang.hidden = !!g.keluar || (!admin(g) && !g.anggotaBolehUndang);
        tambah.addEventListener('click', () => bukaAlur('tambah', g.id));
        undang.addEventListener('click', bukaUndangan);
        node.querySelector('.grup-intro-actions').hidden = tambah.hidden && undang.hidden;
        return { node, waktu: masuk?.waktu };
    }
    function jadwalkanTanggal() {
        clearTimeout(jadwalTanggal);
        const sekarang = new Date(),
            besok = new Date(sekarang.getFullYear(), sekarang.getMonth(), sekarang.getDate() + 1);
        jadwalTanggal = setTimeout(
            () => {
                if (aktif) renderPesan();
                jadwalkanTanggal();
            },
            besok.getTime() - sekarang.getTime() + 50
        );
    }
    async function renderPesan(scroll = false) {
        if (window.NgumpulRuang) return window.NgumpulRuang.refresh();
        if (!aktif) return;
        const id = aktif,
            v = ++versiChat,
            box = $('pesan-chat-grup');
        const bawah = box.scrollTop + box.clientHeight >= box.scrollHeight - 80,
            posisi = box.scrollTop,
            tepi = box.getBoundingClientRect().top,
            jangkar = [...box.children].find((n) => n.getBoundingClientRect().bottom > tepi),
            kunciJangkar = jangkar?.dataset.kunciRiwayat,
            jarakJangkar = jangkar?.getBoundingClientRect().top - tepi,
            fokusKartu = box.contains(document.activeElement)
                ? document.activeElement.dataset.aksi
                : null;
        try {
            const g = await layananGrup.ambilGrup(id);
            if (!g.keluar) await layananGrup.tandaiStatus(id, bolehBaca(id));
            const pesan = await layananGrup.ambilPesan(id);
            if (id !== aktif || v !== versiChat) return;
            if ($('status-chat-grup').dataset.sumber === 'riwayat') status('status-chat-grup', '');
            judulChat(g);
            const kartu = kartuAwal(g, box.dataset.chatGrupId !== id),
                riwayat = [...pesan];
            if (kartu && Number.isFinite(kartu.waktu))
                riwayat.push({ id: 'awal:' + id, jenis: 'awal', dibuat: kartu.waktu });
            riwayat.sort(
                (a, b) =>
                    a.dibuat - b.dibuat ||
                    (a.jenis === 'awal' ? -1 : b.jenis === 'awal' ? 1 : a.id.localeCompare(b.id))
            );
            box.replaceChildren();
            box.dataset.chatGrupId = id;
            let sebelumnya = null,
                tanggalTerakhir = null;
            if (kartu && !Number.isFinite(kartu.waktu)) box.append(kartu.node);
            if (!riwayat.length && !kartu) box.append(kosong('Belum ada pesan.'));
            riwayat.forEach((p) => {
                const tanggal = tanggalLokal(p.dibuat);
                if (tanggal !== tanggalTerakhir) {
                    box.append(pemisahTanggal(p.dibuat));
                    tanggalTerakhir = tanggal;
                }
                if (p.jenis === 'awal') {
                    box.append(kartu.node);
                    sebelumnya = null;
                    return;
                }
                if (p.jenis === 'aktivitas') {
                    const row = el('div', 'grup-activity'),
                        time = el('time', '', formatJamPesan(new Date(p.dibuat).toISOString()));
                    time.dateTime = new Date(p.dibuat).toISOString();
                    row.dataset.kunciRiwayat = 'aktivitas:' + p.id;
                    row.append(el('span', '', teksAktivitas(p)), time);
                    box.append(row);
                    sebelumnya = null;
                    return;
                }
                const sendiri = p.pengirimId === userAktif.id;
                const rangkaian =
                    sebelumnya &&
                    sebelumnya.pengirimId === p.pengirimId &&
                    new Date(sebelumnya.dibuat).toDateString() ===
                        new Date(p.dibuat).toDateString() &&
                    p.dibuat - sebelumnya.dibuat < 300000;
                const row = el(
                    'div',
                    'grup-pesan-baris' +
                        (sendiri ? ' sendiri' : '') +
                        (rangkaian ? ' lanjutan' : '')
                );
                row.dataset.kunciRiwayat = 'pesan:' + p.id;
                row.style.setProperty('--anggota-hue', String(g.warnaAnggota?.[p.pengirimId] ?? 0));
                if (!sendiri) {
                    const av = el('button', 'grup-avatar-pengirim');
                    av.type = 'button';
                    av.setAttribute('aria-label', 'Lihat profil ' + namaAkun(p.pengirimId));
                    avatarAnggota(av, g, p.pengirimId);
                    av.addEventListener('click', () => tampilkanInfoKontak(p.pengirimId));
                    if (rangkaian) {
                        av.classList.add('avatar-kosong');
                        av.tabIndex = -1;
                        av.setAttribute('aria-hidden', 'true');
                    }
                    row.append(av);
                }
                const bubble = el(
                    'div',
                    'chat-bubble grup-pesan ' + (sendiri ? 'kirim' : 'terima')
                );
                if (!rangkaian) {
                    const nama = el(
                        'strong',
                        'grup-pesan-pengirim',
                        sendiri ? 'you' : namaAkun(p.pengirimId)
                    );
                    nama.dataset.warna = '';
                    bubble.append(nama);
                }
                bubble.append(el('span', 'grup-pesan-isi', p.isi));
                const footer = el('div', 'message-footer'),
                    time = el(
                        'span',
                        'timestamp',
                        formatJamPesan(new Date(p.dibuat).toISOString())
                    );
                footer.append(time);
                if (sendiri) footer.append(buatIndikatorStatusPesan(p.status));
                bubble.append(footer);
                row.append(bubble);
                box.append(row);
                sebelumnya = p;
            });
            if (fokusKartu)
                box.querySelector('[data-aksi="' + fokusKartu + '"]:not([hidden])')?.focus({
                    preventScroll: true
                });
            if (scroll || bawah) box.scrollTop = box.scrollHeight;
            else {
                box.scrollTop = posisi;
                const node = [...box.children].find((n) => n.dataset.kunciRiwayat === kunciJangkar);
                if (node) box.scrollTop += node.getBoundingClientRect().top - tepi - jarakJangkar;
            }
        } catch (e) {
            if (id === aktif && v === versiChat) {
                status('status-chat-grup', e.message, true);
                $('status-chat-grup').dataset.sumber = 'riwayat';
            }
        }
    }
    async function bukaChat(id) {
        if (window.NgumpulRuang) return window.NgumpulRuang.open(id);
        const v = ++versiBuka;
        try {
            const g = await layananGrup.ambilGrup(id);
            if (v !== versiBuka) return;
            tutupMenu(false);
            if (aktif !== id) tutupInfo(false);
            simpanDraft();
            aktif = id;
            grupAktif = g;
            pilihTabDashboard('grup');
            judulChat(g);
            panel.hidden = false;
            ['panel-sisi-kiri', 'panel-sisi-kanan'].forEach((x) =>
                $(x).classList.add('grup-chat-open')
            );
            input.value = g.keluar ? '' : draft.get(id) || '';
            status('status-chat-grup', '');
            status('status-grup', '');
            await renderPesan(true);
            if (aktif === id && !g.keluar) input.focus();
        } catch (e) {
            if (v === versiBuka) status('status-grup', e.message, true);
        }
    }
    async function prosesMasuk() {
        if (window.NgumpulRuang) return;
        try {
            for (const g of await layananGrup.daftarGrup())
                if (!g.keluar) await layananGrup.tandaiStatus(g.id, bolehBaca(g.id));
            if ($('status-grup').dataset.sumber === 'sinkron') status('status-grup', '');
        } catch (e) {
            status('status-grup', e.message, true);
            $('status-grup').dataset.sumber = 'sinkron';
        }
    }
    async function segarkan() {
        await renderGrup();
        if (aktif) await renderPesan();
    }
    function jadwalkanPembaruan(change) {
        if (change.jenis === 'status') statusBerubah.add(change.grupId || '*');
        else dataBerubah = true;
        if (jadwalSegar !== null) return;
        jadwalSegar = setTimeout(async () => {
            jadwalSegar = null;
            const data = dataBerubah,
                centang = statusBerubah.has('*') || statusBerubah.has(aktif);
            dataBerubah = false;
            statusBerubah.clear();
            if (data) {
                await prosesMasuk();
                await segarkan();
                if (alur) await renderPilihan();
            } else if (aktif && centang) await renderPesan();
        }, 25);
    }
    async function konfirmasi(judul, teks, label = 'Lanjutkan', bahaya = false) {
        const d = $('dialog-konfirmasi-grup');
        if (d.open) return false;
        $('judul-konfirmasi-grup').textContent = judul;
        $('isi-konfirmasi-grup').textContent = teks;
        $('btn-konfirmasi-grup').textContent = label;
        $('btn-konfirmasi-grup').classList.toggle('grup-tombol-bahaya', bahaya);
        d.returnValue = '';
        d.showModal();
        return new Promise((resolve) =>
            d.addEventListener('close', () => resolve(d.returnValue === 'lanjut'), { once: true })
        );
    }
    async function lakukan(aksi, tujuan = 'status-info-grup') {
        try {
            await aksi();
            status(tujuan, '');
            await segarkan();
            return true;
        } catch (e) {
            status(tujuan, e.message, true);
            return false;
        }
    }
    function aturPanelInfo() {
        const kecil = matchMedia('(max-width: 900px)').matches,
            infoPenuh = !info.hidden && kecil,
            alurPenuh = !!alur && kecil;
        $('panel-sisi-kiri').inert = infoPenuh && !alurPenuh;
        $('panel-sisi-kanan').inert = infoPenuh || alurPenuh;
        info.inert = alurPenuh;
        $('btn-info-grup').disabled = !!alur;
        if (
            infoPenuh &&
            !alurPenuh &&
            !info.contains(document.activeElement) &&
            !document.querySelector('dialog[open]')
        )
            $('btn-tutup-info-grup').focus({ preventScroll: true });
    }
    function tutupMenu(fokus = true) {
        $('menu-aksi-grup').hidden = true;
        menuTarget = null;
        if (fokus && menuPemicu?.isConnected) menuPemicu.focus({ preventScroll: true });
        menuPemicu = null;
    }
    function tutupMenuAnggota(fokus = false, langsung = false) {
        const data = menuAnggota;
        if (!data) return;
        if (fokus && data.pemicu.isConnected) data.pemicu.focus({ preventScroll: true });
        if (data.menutup && !langsung) return;
        data.menutup = true;
        data.pemicu.setAttribute('aria-expanded', 'false');
        data.menu.inert = true;
        data.animasi?.cancel();
        const selesai = () => {
            if (menuAnggota !== data) return;
            data.root.open = false;
            data.animasi?.cancel();
            menuAnggota = null;
        };
        if (
            langsung ||
            !data.root.isConnected ||
            matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
            selesai();
            return;
        }
        data.animasi = data.menu.animate(
            [
                { opacity: 1, transform: 'translateY(0)' },
                { opacity: 0, transform: 'translateY(-4px)' }
            ],
            { duration: 140, easing: 'ease-in', fill: 'forwards' }
        );
        data.animasi.finished.then(selesai, () => {});
    }
    function bukaMenuAnggota(root) {
        tutupMenu(false);
        tutupMenuAnggota(false, true);
        const pemicu = root.querySelector('summary'),
            menu = root.querySelector('.grup-member-menu'),
            data = { root, pemicu, menu, menutup: false };
        menuAnggota = data;
        root.open = true;
        menu.inert = false;
        delete root.dataset.posisi;
        const tepi = info.querySelector('.detail-panel-content').getBoundingClientRect();
        if (root.getBoundingClientRect().top + menu.offsetHeight > tepi.bottom)
            root.dataset.posisi = 'atas';
        pemicu.setAttribute('aria-expanded', 'true');
        if (!matchMedia('(prefers-reduced-motion: reduce)').matches)
            data.animasi = menu.animate(
                [
                    { opacity: 0, transform: 'translateY(-4px)' },
                    { opacity: 1, transform: 'translateY(0)' }
                ],
                { duration: 160, easing: 'ease-out' }
            );
    }
    async function bukaMenu(id, x, y, pemicu) {
        tutupMenuAnggota(false, true);
        try {
            const g = await layananGrup.ambilGrup(id),
                menu = $('menu-aksi-grup');
            menu.replaceChildren();
            menuTarget = id;
            menuPemicu = pemicu;
            const aksi = g.keluar
                ? [['hapus', 'Hapus grup', 'i-trash-grup']]
                : [
                      ['keluar', 'Keluar grup', 'i-out'],
                      ['keluarHapus', 'Keluar dan hapus grup', 'i-trash-grup']
                  ];
            aksi.forEach(([key, nama, ico]) => {
                const b = el('button', key === 'keluar' ? '' : 'grup-danger');
                b.type = 'button';
                b.role = 'menuitem';
                b.append(ikon(ico), el('span', '', nama));
                b.addEventListener('click', () => {
                    tutupMenu(false);
                    keluarAtauHapus(id, key);
                });
                menu.append(b);
            });
            menu.hidden = false;
            const r = menu.getBoundingClientRect();
            menu.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + 'px';
            menu.style.top = Math.max(8, Math.min(y, innerHeight - r.height - 8)) + 'px';
            menu.querySelector('button').focus({ preventScroll: true });
        } catch (e) {
            status('status-grup', e.message, true);
        }
    }
    async function keluarAtauHapus(id, aksi) {
        try {
            const g = await layananGrup.ambilGrup(id),
                hapus = aksi !== 'keluar';
            const judul =
                aksi === 'hapus'
                    ? 'Hapus grup?'
                    : hapus
                      ? 'Keluar dan hapus grup?'
                      : 'Keluar grup?';
            const teks = hapus
                ? 'Hapus ' + g.nama + ' beserta riwayatnya dari akunmu?'
                : 'Keluar dari ' + g.nama + '?';
            if (!(await konfirmasi(judul, teks, hapus ? 'Hapus' : 'Keluar', hapus))) return;
            if (aksi === 'hapus') await layananGrup.hapusGrup(id);
            else await layananGrup.keluar(id, hapus);
            if (infoId === id) tutupInfo(false);
            if (hapus) draft.delete(id);
            if (window.NgumpulRuang) window.NgumpulRuang.afterExit(id);
            await segarkan();
        } catch (e) {
            status('status-grup', e.message, true);
            if (window.NgumpulRuang) window.NgumpulRuang.toast(e.message);
        }
    }
    async function olahFoto(file) {
        if (
            !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
            file.size > 5 * 1024 * 1024
        )
            throw new Error('Gunakan foto JPG, PNG, atau WebP maksimal 5 MB.');
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file),
                img = new Image();
            img.onload = () => {
                try {
                    const scale = Math.min(1, 512 / Math.max(img.width, img.height)),
                        c = document.createElement('canvas');
                    c.width = Math.max(1, Math.round(img.width * scale));
                    c.height = Math.max(1, Math.round(img.height * scale));
                    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                    resolve(c.toDataURL('image/jpeg', 0.85));
                } catch (e) {
                    reject(e);
                } finally {
                    URL.revokeObjectURL(url);
                }
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Foto tidak dapat dibuka.'));
            };
            img.src = url;
        });
    }

    async function renderInfo(g) {
        $('nama-info-grup').textContent = g.nama;
        avatar($('foto-info-grup'), g.nama, g.foto);
        $('jumlah-info-grup').textContent = g.anggotaIds.length + ' anggota';
        $('deskripsi-info-grup').textContent = g.deskripsi || 'Belum ada deskripsi';
        $('pembuat-info-grup').textContent = teksPembuatanGrup(g);
        ['nama', 'deskripsi'].forEach((bagian) => {
            $('btn-edit-' + bagian + '-grup').hidden = !admin(g);
        });
        $('btn-edit-foto-grup').disabled = !admin(g);
        if (!admin(g) && editAktif) batalEditor();
        $('btn-undang-grup').hidden = !!g.keluar || (!admin(g) && !g.anggotaBolehUndang);
        $('btn-tambah-anggota-grup').hidden = !admin(g);
        $('btn-keluar-grup').querySelector('span').textContent = g.keluar
            ? 'Hapus grup'
            : 'Keluar grup';
        $('btn-keluar-grup')
            .querySelector('use')
            .setAttribute('href', g.keluar ? '#i-trash-grup' : '#i-out');
        $('judul-anggota-info').textContent = g.anggotaIds.length + ' anggota';
        const query = $('cari-anggota-info').value.toLowerCase().trim(),
            list = $('daftar-anggota-info');
        tutupMenuAnggota(false, true);
        list.replaceChildren();
        g.anggotaIds
            .filter((id) =>
                (namaAkun(id) + ' ' + (getUserById(id)?.hp || '')).toLowerCase().includes(query)
            )
            .forEach((id) => {
                const row = el('div', 'grup-member'),
                    profile = el('button', 'grup-member-profile');
                profile.type = 'button';
                const av = el('span', 'circle-avatar');
                avatarAnggota(av, g, id);
                const teks = el('span', 'grup-member-name');
                teks.append(
                    el('strong', '', namaAkun(id) + (id === userAktif.id ? ' (Kamu)' : ''))
                );
                profile.append(av, teks);
                profile.addEventListener('click', () => tampilkanInfoKontak(id));
                row.append(profile);
                if (g.adminIds.includes(id))
                    row.append(el('small', 'grup-admin-badge', 'Admin grup'));
                if (admin(g)) {
                    const actions = el('details', 'grup-member-actions'),
                        summary = el('summary');
                    summary.append(ikon('i-more'));
                    summary.setAttribute('aria-label', 'Tindakan untuk ' + namaAkun(id));
                    summary.setAttribute('aria-expanded', 'false');
                    summary.setAttribute('aria-haspopup', 'menu');
                    summary.addEventListener('click', (e) => {
                        e.preventDefault();
                        if (menuAnggota?.root === actions && !menuAnggota.menutup)
                            tutupMenuAnggota(true);
                        else bukaMenuAnggota(actions);
                    });
                    actions.append(summary);
                    const menu = el('div', 'grup-member-menu');
                    menu.role = 'menu';
                    menu.setAttribute('aria-label', 'Tindakan untuk ' + namaAkun(id));
                    const aksi = g.adminIds.includes(id) ? 'nonadmin' : 'admin';
                    const role = el(
                        'button',
                        '',
                        aksi === 'admin' ? 'Jadikan admin' : 'Hapus status admin'
                    );
                    role.type = 'button';
                    role.role = 'menuitem';
                    role.addEventListener('click', async () => {
                        tutupMenuAnggota(false, true);
                        if (
                            await konfirmasi(
                                role.textContent,
                                role.textContent + ' untuk ' + namaAkun(id) + '?'
                            )
                        )
                            await lakukan(() => layananGrup.tindakanAnggota(g.id, id, aksi));
                    });
                    menu.append(role);
                    if (id !== userAktif.id) {
                        const remove = el('button', 'grup-danger', 'Keluarkan');
                        remove.type = 'button';
                        remove.role = 'menuitem';
                        remove.addEventListener('click', async () => {
                            tutupMenuAnggota(false, true);
                            if (
                                await konfirmasi(
                                    'Keluarkan anggota',
                                    'Keluarkan ' + namaAkun(id) + ' dari grup?'
                                )
                            )
                                await lakukan(() => layananGrup.tindakanAnggota(g.id, id, 'hapus'));
                        });
                        menu.append(remove);
                    }
                    actions.append(menu);
                    row.append(actions);
                }
                list.append(row);
            });
        if (!list.childElementCount) list.append(kosong('Anggota tidak ditemukan.'));
        await renderBerkas(g.id);
        if (window.NgumpulRuang) await window.NgumpulRuang.extendInfo(g);
    }

    function urlBerkas(value, gambar = false) {
        if (typeof value !== 'string') return null;
        if (gambar && /^data:image\/(png|jpeg|webp);base64,/.test(value)) return value;
        try {
            const u = new URL(value, location.href);
            if (['https:', 'http:', 'blob:'].includes(u.protocol)) return u.href;
        } catch (_) {}
        return null;
    }
    async function renderBerkas(id) {
        if (window.NgumpulRuang) return window.NgumpulRuang.renderMedia(id);
        const data = await layananGrup.ambilBerkas(id);
        if (infoId !== id) return;
        const media = (b) =>
            b.jenis === 'image' ||
            b.jenis === 'media' ||
            (typeof b.mime === 'string' && b.mime.startsWith('image/'));
        const berkas = data
            .map((b) => ({ ...b, gambar: !!media(b), alamat: urlBerkas(b.url, !!media(b)) }))
            .filter((b) => b.alamat);
        const terbuka = !$('detail-berkas-grup').hidden;
        $('jumlah-berkas-grup').textContent = String(berkas.length);
        $('btn-buka-berkas-grup').setAttribute('aria-expanded', String(terbuka));
        $('tab-media-grup').setAttribute('aria-pressed', String(jenisBerkas === 'media'));
        $('tab-dokumen-grup').setAttribute('aria-pressed', String(jenisBerkas === 'dokumen'));
        const preview = $('pratinjau-media-grup');
        preview.replaceChildren();
        berkas
            .filter((b) => b.gambar)
            .slice(0, 4)
            .forEach((b) => {
                const a = el('a');
                a.href = b.alamat;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                const img = el('img');
                img.src = b.alamat;
                img.alt = b.nama || 'Media grup';
                img.loading = 'lazy';
                a.append(img);
                preview.append(a);
            });
        preview.hidden = terbuka || !preview.childElementCount;
        const target = $('berkas-info-grup');
        target.replaceChildren();
        berkas
            .filter((b) => b.gambar === (jenisBerkas === 'media'))
            .forEach((b) => {
                const link = el('a', 'grup-berkas');
                link.href = b.alamat;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                if (b.gambar) {
                    const img = el('img');
                    img.src = b.alamat;
                    img.alt = b.nama || 'Media grup';
                    img.loading = 'lazy';
                    link.append(img);
                }
                link.append(el('span', '', b.nama || 'Berkas grup'));
                target.append(link);
            });
        if (!target.childElementCount)
            target.append(
                kosong(
                    jenisBerkas === 'media'
                        ? 'Belum ada media di grup ini.'
                        : 'Belum ada dokumen di grup ini.'
                )
            );
    }

    function batalEditor() {
        sesiEditor++;
        versiFoto++;
        fotoDiproses = false;
        sedangSimpan = false;
        editAktif = null;
        ['nama', 'deskripsi', 'foto'].forEach((bagian) => {
            $('form-' + bagian + '-grup').hidden = true;
            $('simpan-' + bagian + '-grup').disabled = false;
        });
    }
    function tutupInfo(kembaliFokus = true) {
        if (kembaliFokus && !info.hidden && window.NgumpulRuang) {
            window.NgumpulRuang.dismissInfo(() => {
                tutupInfo(false);
                window.NgumpulRuang.focusHeader();
            });
            return;
        }
        window.NgumpulRuang?.cancelPanelMotion(info);
        tutupMenuAnggota(false, true);
        const terbuka = !info.hidden;
        info.hidden = true;
        infoId = null;
        versiInfo++;
        batalEditor();
        document.querySelector('.dashboard-container').classList.remove('grup-info-open');
        $('btn-info-grup').setAttribute('aria-expanded', 'false');
        aturPanelInfo();
        if (terbuka && kembaliFokus && aktif) {
            if (window.NgumpulRuang) window.NgumpulRuang.focusHeader();
            else $('btn-info-grup').focus({ preventScroll: true });
            renderPesan();
        }
    }
    async function bukaInfo(panelVersion = null) {
        if (!aktif || alur) return;
        const versiPanel = typeof panelVersion === 'number' ? panelVersion : window.NgumpulRuang?.prepareInfo();
        window.NgumpulRuang?.cancelPanelMotion(info);
        const id = aktif,
            v = ++versiInfo;
        try {
            const g = (await layananGrup.daftarGrup()).find((g) => g.id === id);
            if (v !== versiInfo || aktif !== id) return;
            if (versiPanel !== undefined && !window.NgumpulRuang.isInfoCurrent(versiPanel)) return;
            if (!g) throw new Error('Grup tidak tersedia.');
            infoId = id;
            batalEditor();
            status('status-info-grup', '');
            $('cari-anggota-info').value = '';
            $('detail-berkas-grup').hidden = true;
            jenisBerkas = 'media';
            await renderInfo(g);
            if (v !== versiInfo || aktif !== id) return;
            if (versiPanel !== undefined && !window.NgumpulRuang.isInfoCurrent(versiPanel)) return;
            info.hidden = false;
            document.querySelector('.dashboard-container').classList.add('grup-info-open');
            $('btn-info-grup').setAttribute('aria-expanded', 'true');
            info.querySelector('.detail-panel-content').scrollTop = 0;
            aturPanelInfo();
            $('btn-tutup-info-grup').focus({ preventScroll: true });
        } catch (e) {
            if (v === versiInfo) status('status-chat-grup', e.message, true);
        }
    }

    async function bukaEditor(bagian) {
        const id = infoId;
        try {
            const g = (await layananGrup.daftarGrup()).find((g) => g.id === id);
            if (!g || g.keluar || !admin(g) || info.hidden || infoId !== id || sedangSimpan) return;
            batalEditor();
            editAktif = bagian;
            status('status-info-grup', '');
            $('form-' + bagian + '-grup').hidden = false;
            if (bagian === 'foto') {
                fotoDraft = g.foto;
                $('edit-foto-grup').value = '';
                avatar($('preview-foto-grup'), g.nama, fotoDraft);
            } else $('edit-' + bagian + '-grup').value = bagian === 'nama' ? g.nama : g.deskripsi;
            $('edit-' + bagian + '-grup').focus();
        } catch (e) {
            status('status-info-grup', e.message, true);
        }
    }
    ['nama', 'deskripsi', 'foto'].forEach((bagian) => {
        $('btn-edit-' + bagian + '-grup').addEventListener('click', () => bukaEditor(bagian));
        $('form-' + bagian + '-grup').addEventListener('submit', async (e) => {
            e.preventDefault();
            if (editAktif !== bagian || sedangSimpan || (bagian === 'foto' && fotoDiproses)) return;
            const id = infoId,
                sesi = sesiEditor;
            sedangSimpan = true;
            $('simpan-' + bagian + '-grup').disabled = true;
            try {
                const g = (await layananGrup.daftarGrup()).find((g) => g.id === id);
                if (!g || !admin(g))
                    throw new Error('Hanya admin yang dapat mengubah informasi grup.');
                if (sesi !== sesiEditor || infoId !== id) return;
                await layananGrup.ubahInfo(id, {
                    nama: bagian === 'nama' ? $('edit-nama-grup').value : g.nama,
                    deskripsi:
                        bagian === 'deskripsi' ? $('edit-deskripsi-grup').value : g.deskripsi,
                    foto: bagian === 'foto' ? fotoDraft : g.foto
                });
                if (sesi === sesiEditor && infoId === id) {
                    batalEditor();
                    status('status-info-grup', 'Informasi grup disimpan.');
                    await segarkan();
                }
            } catch (e) {
                if (sesi === sesiEditor) status('status-info-grup', e.message, true);
            } finally {
                if (sesi === sesiEditor) {
                    sedangSimpan = false;
                    $('simpan-' + bagian + '-grup').disabled = false;
                }
            }
        });
    });
    info.querySelectorAll('[data-batal-edit-grup]').forEach((button) =>
        button.addEventListener('click', () => {
            const bagian = editAktif;
            batalEditor();
            if (bagian) $('btn-edit-' + bagian + '-grup').focus();
        })
    );
    $('edit-foto-grup').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file || editAktif !== 'foto') return;
        const proses = ++versiFoto,
            id = infoId;
        fotoDiproses = true;
        $('simpan-foto-grup').disabled = true;
        const terbaru = () =>
            proses === versiFoto && id === infoId && editAktif === 'foto' && !info.hidden;
        try {
            const hasil = await olahFoto(file);
            if (!terbaru()) return;
            fotoDraft = hasil;
            avatar($('preview-foto-grup'), 'Grup', fotoDraft);
            status('status-info-grup', '');
        } catch (error) {
            if (terbaru()) status('status-info-grup', error.message, true);
        } finally {
            if (terbaru()) {
                fotoDiproses = false;
                $('simpan-foto-grup').disabled = false;
            }
        }
    });

    function perbaruiPilihan() {
        if (!alur) return;
        const a = alur,
            target = $('anggota-terpilih-grup');
        target.replaceChildren();
        a.kontak
            .filter((k) => a.pilihan.has(k.id))
            .forEach((k) => {
                const chip = el('span', 'grup-selected-chip'),
                    av = el('span', 'circle-avatar');
                avatar(av, k.nama, fotoAkun(k.id));
                const hapus = el('button');
                hapus.append(ikon('i-close'));
                hapus.type = 'button';
                hapus.setAttribute('aria-label', 'Batalkan pilihan ' + k.nama);
                hapus.addEventListener('click', () => {
                    if (alur !== a || a.sibuk) return;
                    a.pilihan.delete(k.id);
                    [...$('pilihan-anggota-grup').querySelectorAll('input')].forEach((cek) => {
                        if (cek.value === k.id) cek.checked = false;
                    });
                    perbaruiPilihan();
                    $('input-cari-anggota-grup').focus();
                });
                chip.append(av, el('span', '', k.nama), hapus);
                target.append(chip);
            });
        target.hidden = !a.pilihan.size;
        $('jumlah-pilihan-grup').textContent = a.pilihan.size + ' anggota dipilih';
        target.querySelectorAll('button').forEach((b) => (b.disabled = a.sibuk));
        $('pilihan-anggota-grup')
            .querySelectorAll('input')
            .forEach((cek) => (cek.disabled = a.sibuk));
        $('btn-kembali-alur-grup').disabled = a.sibuk;
        $('btn-lanjut-grup').disabled = !a.pilihan.size || a.sibuk;
    }
    async function renderPilihan() {
        if (!alur) return;
        const a = alur;
        try {
            let exclude = [];
            if (a.mode === 'tambah') {
                const g = await layananGrup.ambilGrup(a.grupId);
                if (alur !== a) return;
                if (!admin(g)) {
                    tutupAlur(false, true);
                    throw new Error('Hanya admin yang dapat menambahkan anggota.');
                }
                exclude = g.anggotaIds;
            }
            a.kontak = kontakTerdaftar().filter((k) => !exclude.includes(k.id));
            const valid = new Set(a.kontak.map((k) => k.id));
            a.pilihan.forEach((id) => {
                if (!valid.has(id)) a.pilihan.delete(id);
            });
            const query = $('input-cari-anggota-grup').value.trim().toLowerCase();
            const hasil = a.kontak.filter((k) =>
                (k.nama + ' ' + k.hp).toLowerCase().includes(query)
            );
            const target = $('pilihan-anggota-grup');
            const fokus = document.activeElement
                ?.closest('.grup-picker-option')
                ?.querySelector('input')?.value;
            target.replaceChildren();
            let huruf = '';
            hasil.forEach((k) => {
                const awal = /^[\p{L}]/u.test(k.nama) ? k.nama.trim().charAt(0).toUpperCase() : '#';
                if (awal !== huruf) {
                    target.append(el('h3', 'grup-picker-heading', awal));
                    huruf = awal;
                }
                const row = el('label', 'grup-picker-option'),
                    av = el('span', 'circle-avatar');
                avatar(av, k.nama, fotoAkun(k.id));
                const detail = el('span', 'grup-picker-label');
                detail.append(el('strong', '', k.nama));
                const bio = bacaSemuaProfil()[k.id]?.bio;
                detail.append(el('small', '', typeof bio === 'string' && bio.trim() ? bio : k.hp));
                const cek = el('input');
                cek.type = 'checkbox';
                cek.name = 'anggota-grup';
                cek.value = k.id;
                cek.checked = a.pilihan.has(k.id);
                cek.disabled = a.sibuk;
                cek.setAttribute('aria-label', k.nama);
                cek.addEventListener('change', () => {
                    if (alur !== a) return;
                    cek.checked ? a.pilihan.add(k.id) : a.pilihan.delete(k.id);
                    status('status-pilih-anggota', '');
                    perbaruiPilihan();
                });
                row.append(av, detail, cek);
                target.append(row);
            });
            if (!hasil.length)
                target.append(
                    kosong(
                        query
                            ? 'Kontak tidak ditemukan.'
                            : 'Tidak ada kontak yang bisa ditambahkan.'
                    )
                );
            perbaruiPilihan();
            if (fokus)
                [...target.querySelectorAll('input')]
                    .find((cek) => cek.value === fokus)
                    ?.focus({ preventScroll: true });
        } catch (e) {
            status(alur ? 'status-pilih-anggota' : 'status-grup', e.message, true);
        }
    }
    function tampilTahap(tahap) {
        if (!alur) return;
        alur.tahap = tahap;
        $('form-pilih-anggota').hidden = tahap !== 1;
        $('form-buat-grup').hidden = tahap !== 2;
        $('judul-alur-grup').textContent =
            tahap === 2
                ? 'Grup baru'
                : alur.mode === 'tambah'
                  ? 'Tambah anggota'
                  : 'Tambah anggota grup';
        (tahap === 1 ? $('input-cari-anggota-grup') : $('input-nama-grup')).focus();
    }
    async function bukaAlur(mode, grupId = null) {
        if (alur) return;
        try {
            if (mode === 'tambah') {
                const g = await layananGrup.ambilGrup(grupId);
                if (!admin(g)) throw new Error('Hanya admin yang dapat menambahkan anggota.');
            }
            const kembaliInfo = !info.hidden;
            tutupMenu(false);
            tutupInfo(false);
            pilihTabDashboard('grup');
            alur = {
                mode,
                grupId,
                kembaliInfo,
                tahap: 1,
                pilihan: new Set(),
                kontak: [],
                foto: '',
                fotoProses: false,
                versiFoto: 0,
                sibuk: false,
                versi: ++versiAlur
            };
            $('form-buat-grup').reset();
            $('form-pilih-anggota').reset();
            $('foto-grup-baru').replaceChildren(ikon('i-camera-grup'));
            $('btn-simpan-grup').disabled = false;
            status('status-pilih-anggota', '');
            status('status-buat-grup', '');
            $('btn-lanjut-grup').textContent = mode === 'tambah' ? 'Tambah' : 'Lanjut';
            $('panel-alur-grup').hidden = false;
            document.querySelector('.dashboard-container').classList.add('grup-wizard-open');
            aturPanelInfo();
            await renderPilihan();
            if (alur) tampilTahap(1);
        } catch (e) {
            status('status-grup', e.message, true);
        }
    }
    function tutupAlur(kembali = true, paksa = false) {
        if (!alur || (alur.sibuk && !paksa)) return;
        const a = alur;
        alur = null;
        versiAlur++;
        $('panel-alur-grup').hidden = true;
        document.querySelector('.dashboard-container').classList.remove('grup-wizard-open');
        aturPanelInfo();
        if (kembali && a.kembaliInfo && aktif === a.grupId) bukaInfo();
        else if (kembali) $('trigger-menu-utama').focus({ preventScroll: true });
        if (aktif) renderPesan();
    }
    $('menu-grup-baru').addEventListener('click', () => bukaAlur('baru'));
    $('btn-tambah-anggota-grup').addEventListener('click', () => bukaAlur('tambah', infoId));
    $('input-cari-anggota-grup').addEventListener('input', renderPilihan);
    $('btn-kembali-alur-grup').addEventListener('click', () => {
        if (alur?.sibuk) return;
        if (alur?.tahap === 2) tampilTahap(1);
        else tutupAlur();
    });
    $('form-pilih-anggota').addEventListener('submit', async (e) => {
        e.preventDefault();
        const a = alur;
        if (!a || a.sibuk || !a.pilihan.size) return;
        if (a.mode === 'baru') {
            tampilTahap(2);
            return;
        }
        a.sibuk = true;
        perbaruiPilihan();
        try {
            await layananGrup.tambahAnggota(a.grupId, [...a.pilihan]);
            if (alur === a) {
                tutupAlur(false, true);
                await segarkan();
                if (aktif === a.grupId) await bukaInfo();
            }
        } catch (error) {
            if (alur === a) status('status-pilih-anggota', error.message, true);
        } finally {
            if (alur === a) {
                a.sibuk = false;
                perbaruiPilihan();
            }
        }
    });
    $('btn-foto-grup-baru').addEventListener('click', () => {
        if (!alur?.sibuk) $('input-foto-grup-baru').click();
    });
    $('input-foto-grup-baru').addEventListener('change', async (e) => {
        const a = alur,
            file = e.target.files[0];
        if (!a || !file || a.sibuk) return;
        const proses = ++a.versiFoto;
        a.fotoProses = true;
        $('btn-simpan-grup').disabled = true;
        try {
            const foto = await olahFoto(file);
            if (alur === a && proses === a.versiFoto) {
                a.foto = foto;
                avatar($('foto-grup-baru'), 'Grup', foto);
                status('status-buat-grup', '');
            }
        } catch (error) {
            if (alur === a && proses === a.versiFoto)
                status('status-buat-grup', error.message, true);
        } finally {
            if (alur === a && proses === a.versiFoto) {
                a.fotoProses = false;
                $('btn-simpan-grup').disabled = a.sibuk;
            }
        }
    });
    $('form-buat-grup').addEventListener('submit', async (e) => {
        e.preventDefault();
        const a = alur;
        if (!a || a.mode !== 'baru' || a.sibuk || a.fotoProses) return;
        const nama = $('input-nama-grup').value.trim();
        if (!nama) {
            status('status-buat-grup', 'Isi nama grup.', true);
            $('input-nama-grup').focus();
            return;
        }
        a.sibuk = true;
        $('btn-simpan-grup').disabled = true;
        try {
            const g = await layananGrup.buatGrup({
                nama,
                anggotaIds: [...a.pilihan],
                foto: a.foto
            });
            if (alur === a) {
                tutupAlur(false, true);
                $('input-cari-grup').value = '';
                await segarkan();
                await bukaChat(g.id);
            }
        } catch (error) {
            if (alur === a) status('status-buat-grup', error.message, true);
        } finally {
            if (alur === a) {
                a.sibuk = false;
                $('btn-simpan-grup').disabled = a.fotoProses;
            }
        }
    });
    $('input-nama-grup').addEventListener('input', () => status('status-buat-grup', ''));
    $('form-pesan-grup').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!aktif || grupAktif?.keluar || kirim) return;
        const id = aktif,
            nilai = input.value,
            isi = nilai.trim();
        if (!isi) return;
        if (isi.length > 4000) {
            status('status-chat-grup', 'Pesan maksimal 4000 karakter.', true);
            return;
        }
        kirim = true;
        $('btn-kirim-grup').disabled = true;
        simpanDraft();
        let p = percobaan.get(id);
        if (!p || p.isi !== isi) {
            p = {
                id: 'pesan_' + kode(),
                grupId: id,
                pengirimId: userAktif.id,
                isi,
                dibuat: Date.now()
            };
            percobaan.set(id, p);
        }
        try {
            await layananGrup.kirimPesan(id, p);
            percobaan.delete(id);
            if (draft.get(id) === nilai) draft.delete(id);
            if (aktif === id) {
                if (input.value === nilai) input.value = '';
                aturTinggiInput();
                status('status-chat-grup', '');
                await renderPesan(true);
            }
            await renderGrup();
        } catch (error) {
            if (aktif === id) status('status-chat-grup', error.message, true);
        } finally {
            kirim = false;
            $('btn-kirim-grup').disabled = false;
        }
    });
    function aturTinggiInput() {
        if (panel.hidden || $('form-pesan-grup').hidden) return;
        const box = $('pesan-chat-grup');
        const bawah = box.scrollTop + box.clientHeight >= box.scrollHeight - 80;
        input.style.height = 'auto';
        const tinggi = Math.min(input.scrollHeight, 120);
        input.style.height = tinggi + 'px';
        input.style.overflowY = input.scrollHeight > tinggi ? 'auto' : 'hidden';
        if (bawah) box.scrollTop = box.scrollHeight;
    }
    input.addEventListener('input', () => {
        simpanDraft();
        aturTinggiInput();
    });
    if (typeof ResizeObserver !== 'undefined') {
        let lebarInput = 0;
        const pengamatInput = new ResizeObserver(([entry]) => {
            if (entry.contentRect.width === lebarInput) return;
            lebarInput = entry.contentRect.width;
            aturTinggiInput();
        });
        pengamatInput.observe($('form-pesan-grup'));
    } else window.addEventListener('resize', aturTinggiInput);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
            e.preventDefault();
            $('form-pesan-grup').requestSubmit();
        }
    });
    $('btn-kembali-chat-grup').addEventListener('click', () => {
        tutupChat();
        pilihTabDashboard('grup');
        $('tab-grup').focus();
    });
    $('btn-info-grup').addEventListener('click', bukaInfo);
    $('btn-tutup-info-grup').addEventListener('click', () => tutupInfo());
    matchMedia('(max-width: 900px)').addEventListener('change', aturPanelInfo);
    $('opt-buka-setelan').addEventListener('click', () => {
        tutupAlur(false);
        tutupInfo(false);
    });
    $('jumlah-info-grup').addEventListener('click', () => {
        $('bagian-anggota-grup').scrollIntoView({ block: 'start' });
        $('cari-anggota-info').focus({ preventScroll: true });
    });
    function bukaUndangan() {
        if (window.NgumpulRuang) return window.NgumpulRuang.invite(infoId || aktif);
        const d = $('dialog-undangan-grup');
        if (!d.open) d.showModal();
    }
    $('btn-undang-grup').addEventListener('click', bukaUndangan);
    $('dialog-undangan-grup').addEventListener('close', () => {
        sessionStorage.removeItem('ngumpul_undangan_tertunda');
        if (location.hash.includes('undangan-grup='))
            history.replaceState(null, '', location.pathname + location.search);
        if (aktif) renderPesan();
    });
    $('btn-buka-berkas-grup').addEventListener('click', () => {
        if (window.NgumpulRuang) return window.NgumpulRuang.gallery(infoId);
        $('detail-berkas-grup').hidden = !$('detail-berkas-grup').hidden;
        lakukan(() => renderBerkas(infoId));
    });
    ['media', 'dokumen'].forEach((jenis) =>
        $('tab-' + jenis + '-grup').addEventListener('click', () => {
            jenisBerkas = jenis;
            lakukan(() => renderBerkas(infoId));
        })
    );
    $('cari-anggota-info').addEventListener('input', () =>
        lakukan(async () => {
            const g = await layananGrup.ambilGrup(infoId);
            await renderInfo(g);
        })
    );
    $('btn-keluar-grup').addEventListener('click', () => {
        if (infoId) keluarAtauHapus(infoId, grupAktif?.keluar ? 'hapus' : 'keluar');
    });
    $('input-cari-grup').addEventListener('input', renderGrup);
    document.addEventListener('pointerdown', (e) => {
        if (menuAnggota && !menuAnggota.root.contains(e.target)) tutupMenuAnggota();
        if (
            !$('menu-aksi-grup').hidden &&
            !$('menu-aksi-grup').contains(e.target) &&
            !e.target.closest('.grup-row-menu')
        )
            tutupMenu(false);
    });
    document.addEventListener('focusin', (e) => {
        if (menuAnggota && !menuAnggota.root.contains(e.target)) tutupMenuAnggota();
    });
    window.addEventListener('resize', () => tutupMenu(false));
    document.addEventListener('scroll', () => tutupMenu(false), true);
    document.addEventListener('keydown', (e) => {
        if (menuAnggota && !menuAnggota.menutup && !document.querySelector('dialog[open]')) {
            if (e.key === 'Escape') {
                e.preventDefault();
                tutupMenuAnggota(true);
                return;
            }
            if (
                menuAnggota.root.contains(e.target) &&
                ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)
            ) {
                e.preventDefault();
                const buttons = [...menuAnggota.menu.querySelectorAll('button')],
                    i = buttons.indexOf(document.activeElement),
                    next =
                        e.key === 'Home'
                            ? 0
                            : e.key === 'End'
                              ? buttons.length - 1
                              : i < 0
                                ? e.key === 'ArrowDown'
                                    ? 0
                                    : buttons.length - 1
                                : (i + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) %
                                  buttons.length;
                buttons[next]?.focus();
                return;
            }
        }
        if (
            e.target instanceof Element &&
            e.target.matches('.grup-member-actions > summary') &&
            ['ArrowDown', 'ArrowUp'].includes(e.key)
        ) {
            e.preventDefault();
            bukaMenuAnggota(e.target.parentElement);
            const buttons = [...menuAnggota.menu.querySelectorAll('button')];
            (e.key === 'ArrowDown' ? buttons[0] : buttons.at(-1))?.focus();
            return;
        }
        const menu = $('menu-aksi-grup');
        if (!menu.hidden) {
            const buttons = [...menu.querySelectorAll('button')],
                i = buttons.indexOf(document.activeElement);
            if (e.key === 'Escape') {
                e.preventDefault();
                tutupMenu();
                return;
            }
            if (e.key === 'Tab') {
                tutupMenu(false);
                return;
            }
            if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
                e.preventDefault();
                const next =
                    e.key === 'Home'
                        ? 0
                        : e.key === 'End'
                          ? buttons.length - 1
                          : (i + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) %
                            buttons.length;
                buttons[next].focus();
                return;
            }
        }
        if (document.querySelector('dialog[open]')) return;
        const kecil = matchMedia('(max-width: 900px)').matches;
        if (alur) {
            if (e.key === 'Escape') {
                e.preventDefault();
                if (alur.sibuk) return;
                if (alur.tahap === 2) tampilTahap(1);
                else tutupAlur();
                return;
            }
            if (e.key === 'Tab' && kecil) jagaFokus(e, $('panel-alur-grup'));
        } else if (!info.hidden) {
            if (e.key === 'Escape') {
                e.preventDefault();
                if (editAktif) {
                    const bagian = editAktif;
                    batalEditor();
                    $('btn-edit-' + bagian + '-grup').focus();
                } else tutupInfo();
            }
            if (e.key === 'Tab' && kecil) jagaFokus(e, info);
        }
    });
    function jagaFokus(e, root) {
        const nodes = [...root.querySelectorAll('button,input,textarea,summary,a[href]')].filter(
            (n) => !n.disabled && n.getClientRects().length
        );
        const first = nodes[0],
            last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
        }
    }
    document.addEventListener('ngumpul:tab-grup', renderGrup);
    document.addEventListener('ngumpul:tab-dashboard', (e) => {
        if (e.detail.tabAktif !== 'grup') {
            tutupAlur(false);
            tutupMenu(false);
            tutupChat();
        }
    });
    document.addEventListener('ngumpul:buka-grup', (e) => {
        if (typeof e.detail?.grupId === 'string') bukaChat(e.detail.grupId);
    });
    document.addEventListener('visibilitychange', async () => {
        jadwalkanTanggal();
        await prosesMasuk();
        if (aktif) await renderPesan();
    });
    window.addEventListener('focus', async () => {
        jadwalkanTanggal();
        await prosesMasuk();
        if (aktif) await renderPesan();
    });
    document.addEventListener('ngumpul:profil-ditutup', () => {
        if (aktif) renderPesan();
    });
    $('btn-kembali-ke-chat').addEventListener('click', () => {
        if (aktif) renderPesan();
    });
    window.addEventListener('storage', (e) => {
        if (
            ['ngumpul_users', 'ngumpul_profil', 'ngumpul_kontak_' + userAktif.id].includes(e.key) ||
            e.key?.startsWith('ngumpul_media_')
        ) {
            segarkan();
            if (alur) renderPilihan();
        }
    });
    window.NgumpulGrupDasar = {
        layanan: layananGrup, ubah: ubahLokal, nama: namaAkun, avatar, avatarAnggota,
        kontak: kontakTerdaftar, aktivitas: teksAktivitas, kartu: kartuAwal, konfirmasi,
        menu: bukaMenu, tambah: id => bukaAlur('tambah', id), tutupInfo,
        async info(id) {
            const version = window.NgumpulRuang?.prepareInfo();
            aktif = id;
            const g = await layananGrup.ambilGrup(id);
            if (version !== undefined && !window.NgumpulRuang.isInfoCurrent(version)) return;
            grupAktif = g;
            await bukaInfo(version);
        },
        async refreshInfo() { if (!info.hidden && infoId) await renderInfo(await layananGrup.ambilGrup(infoId)); },
        seleksi(id, g) { aktif = id; grupAktif = g; },
        migrasi(id) { return ubahLokal(id, g => tetapkanPenerimaLama(g), false); }
    };
    jadwalkanTanggal();
    window.addEventListener('hashchange', () => {
        if (location.hash.includes('undangan-grup=')) bukaUndangan();
    });
    (async () => {
        try {
            if (layananGrup.inisialisasi) await layananGrup.inisialisasi();
            await prosesMasuk();
            await renderGrup();
        } catch (e) {
            status('status-grup', e.message, true);
        }
        if (
            location.hash.includes('undangan-grup=') ||
            sessionStorage.getItem('ngumpul_undangan_tertunda')
        )
        bukaUndangan();
        layananGrup.langganan(jadwalkanPembaruan);
    })();
})();
(function () {
    if (!userAktif) return;
    const akunId = userAktif.id;
    const preferensiKey = 'ngumpul_notifikasi_' + akunId;
    const riwayatKey = 'ngumpul_notifikasi_riwayat_' + akunId;
    const kunciAntrean = 'ngumpul:notifikasi:' + akunId;
    const leaseKey = 'ngumpul_notifikasi_kunci_' + akunId;
    const tabId = window.crypto?.randomUUID ? crypto.randomUUID() : buatId();
    const awalKehadiran = 'ngumpul_notifikasi_tab_' + akunId + ':';
    const kehadiranKey = awalKehadiran + tabId;
    const menu = document.getElementById('btn-setelan-notifikasi');
    const tombol = document.getElementById('btn-notifikasi');
    const teksStatus = document.getElementById('status-notifikasi');
    const deskripsi = document.getElementById('deskripsi-notifikasi');
    const diketahui = new Set();
    const terbuka = new Map();
    let aktif = false;
    let berhenti = false;
    let siap = false;
    let memintaIzin = false;
    let memeriksa = false;
    let timer = null;
    let jadwal = null;
    let pesanError = '';

    function sesiSesuai() {
        return !berhenti && getUserAktif()?.id === akunId;
    }
    function izinBrowser() {
        if (!('Notification' in window)) return 'unsupported';
        if (!window.isSecureContext) return 'insecure';
        return Notification.permission;
    }
    function bacaPreferensi() {
        try {
            return JSON.parse(localStorage.getItem(preferensiKey) || 'false') === true;
        } catch (_) {
            return false;
        }
    }
    function perbaruiTampilan() {
        const izin = izinBrowser();
        tombol.setAttribute('aria-checked', String(aktif && izin === 'granted'));
        tombol.disabled = memintaIzin || ['unsupported', 'insecure', 'denied'].includes(izin);
        deskripsi.textContent =
            izin === 'denied'
                ? 'Izinkan notifikasi untuk situs ini melalui pengaturan browser.'
                : izin === 'unsupported'
                  ? 'Browser ini belum mendukung notifikasi.'
                  : izin === 'insecure'
                    ? 'Buka aplikasi melalui HTTPS atau localhost untuk mengaktifkan notifikasi.'
                    : 'Notifikasi muncul ketika kamu tidak sedang membuka percakapan pengirim.';
        const label =
            izin === 'denied'
                ? 'Diblokir browser'
                : izin === 'unsupported'
                  ? 'Tidak didukung'
                  : izin === 'insecure'
                    ? 'Koneksi belum mendukung notifikasi'
                    : aktif && izin === 'granted'
                      ? 'Aktif'
                      : izin === 'default'
                        ? 'Belum diizinkan'
                        : 'Nonaktif';
        teksStatus.textContent = memintaIzin ? 'Meminta izin browser...' : pesanError || label;
        teksStatus.dataset.error = String(!!pesanError);
    }
    function pesanMasuk() {
        const data = JSON.parse(localStorage.getItem(KEY_CHAT) || '{}');
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
        const hasil = new Map();
        getUsers().forEach((user) => {
            if (!user || user.id === akunId || !isKontakPengguna(user.id)) return;
            const percakapan = kunciKonversasi(akunId, user.id);
            const daftar = data[percakapan];
            if (daftar === undefined) return;
            if (!Array.isArray(daftar)) throw new Error();
            daftar.forEach((pesan) => {
                if (
                    !pesan ||
                    pesan.sender !== user.id ||
                    typeof pesan.id !== 'string' ||
                    !pesan.id ||
                    typeof pesan.text !== 'string' ||
                    !pesan.text.trim()
                )
                    return;
                const key = JSON.stringify([percakapan, pesan.id]);
                hasil.set(key, { key, idLawan: user.id, pesan });
            });
        });
        return hasil;
    }
    function titikAwal() {
        try {
            pesanMasuk().forEach((_, key) => diketahui.add(key));
            siap = true;
        } catch (_) {
            pesanError = 'Riwayat pesan belum dapat diperiksa. Coba lagi.';
        }
    }
    function percakapanTerlihat() {
        if (
            !sesiSesuai() ||
            document.visibilityState !== 'visible' ||
            !document.hasFocus() ||
            panelTabChat.hidden ||
            !panelChatAktif.getClientRects().length ||
            getComputedStyle(panelLayerSetelan).display !== 'none'
        )
            return null;
        return chatAktifId;
    }
    function perbaruiKehadiran() {
        try {
            if (!sesiSesuai() || !aktif || izinBrowser() !== 'granted') {
                localStorage.removeItem(kehadiranKey);
                return;
            }
            localStorage.setItem(
                kehadiranKey,
                JSON.stringify({
                    chatId: percakapanTerlihat(),
                    waktu: Date.now()
                })
            );
        } catch (_) {}
    }
    function sedangDibuka(idLawan) {
        if (percakapanTerlihat() === idLawan) return true;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key?.startsWith(awalKehadiran)) continue;
            try {
                const data = JSON.parse(localStorage.getItem(key));
                if (data?.chatId === idLawan && Date.now() - data.waktu < 10000) return true;
            } catch (_) {}
        }
        return false;
    }
    function tutupNotifikasi(idLawan) {
        const notifikasi = terbuka.get(idLawan);
        if (notifikasi) {
            terbuka.delete(idLawan);
            notifikasi.close();
        }
    }
    function tutupSemua() {
        [...terbuka.keys()].forEach(tutupNotifikasi);
    }
    function tutupYangDibaca() {
        [...terbuka.keys()].forEach((id) => {
            if (sedangDibuka(id)) tutupNotifikasi(id);
        });
    }
    function tampilkanNotifikasi(idLawan, pesan) {
        if (!sesiSesuai() || !aktif || izinBrowser() !== 'granted' || sedangDibuka(idLawan)) return;
        try {
            const terakhir = pesan[pesan.length - 1].pesan;
            const nama = getProfilChat(idLawan).nama;
            const cuplikan = terakhir.text.replace(/\s+/g, ' ').trim();
            const body =
                (pesan.length > 1 ? pesan.length + ' pesan baru: ' : '') +
                cuplikan.slice(0, 160) +
                (cuplikan.length > 160 ? '…' : '');
            const notifikasi = new Notification('Ngumpul · ' + nama, {
                body,
                tag: 'ngumpul:' + akunId + ':' + idLawan,
                icon: ambilFotoProfilChat(idLawan) || undefined
            });
            tutupNotifikasi(idLawan);
            terbuka.set(idLawan, notifikasi);
            notifikasi.addEventListener('click', () => {
                notifikasi.close();
                if (!sesiSesuai() || !isKontakPengguna(idLawan)) return;
                window.focus();
                panelPengaturanNotifikasi.hidden = true;
                panelPengaturanTema.hidden = true;
                menu.setAttribute('aria-expanded', 'false');
                daftarPengaturan.style.display = 'block';
                judulPanelSetelan.textContent = 'Pengaturan';
                tutupSetelan();
                document.dispatchEvent(
                    new CustomEvent('ngumpul:buka-chat', { detail: { idLawan } })
                );
                perbaruiKehadiran();
            });
            notifikasi.addEventListener('close', () => {
                if (terbuka.get(idLawan) === notifikasi) terbuka.delete(idLawan);
            });
            notifikasi.addEventListener('error', () => {
                pesanError = 'Notifikasi tidak dapat ditampilkan di browser ini.';
                perbaruiTampilan();
            });
        } catch (_) {
            pesanError = 'Notifikasi tidak dapat ditampilkan di browser ini.';
            perbaruiTampilan();
        }
    }
    async function denganKunci(aksi) {
        if (navigator.locks?.request) return navigator.locks.request(kunciAntrean, aksi);
        const lama = JSON.parse(localStorage.getItem(leaseKey) || 'null');
        if (lama && lama.sampai > Date.now() && lama.tab !== tabId) return false;
        const token = tabId + ':' + Date.now();
        localStorage.setItem(
            leaseKey,
            JSON.stringify({ tab: tabId, token, sampai: Date.now() + 10000 })
        );
        await new Promise((resolve) => setTimeout(resolve, 60));
        if (JSON.parse(localStorage.getItem(leaseKey) || 'null')?.token !== token) return false;
        try {
            return aksi();
        } finally {
            if (JSON.parse(localStorage.getItem(leaseKey) || 'null')?.token === token)
                localStorage.removeItem(leaseKey);
        }
    }
    async function periksaPesan() {
        if (!sesiSesuai()) {
            hentikan();
            return;
        }
        if (memeriksa) return;
        memeriksa = true;
        try {
            aktif = bacaPreferensi();
            perbaruiKehadiran();
            tutupYangDibaca();
            const semua = pesanMasuk();
            const baru = [...semua.values()].filter((item) => !diketahui.has(item.key));
            if (!siap || !aktif || izinBrowser() !== 'granted') {
                semua.forEach((_, key) => diketahui.add(key));
                siap = true;
                return;
            }
            if (!baru.length) return;
            await denganKunci(() => {
                if (!sesiSesuai() || !bacaPreferensi() || izinBrowser() !== 'granted') return false;
                const data = JSON.parse(localStorage.getItem(riwayatKey) || '[]');
                if (!Array.isArray(data) || data.some((id) => typeof id !== 'string'))
                    throw new Error();
                const ditangani = new Set(data);
                const belum = baru.filter((item) => !ditangani.has(item.key));
                pesanError = '';
                if (belum.length) {
                    belum.forEach((item) => ditangani.add(item.key));
                    localStorage.setItem(riwayatKey, JSON.stringify([...ditangani]));
                    const percakapan = new Map();
                    belum.forEach((item) => {
                        if (!percakapan.has(item.idLawan)) percakapan.set(item.idLawan, []);
                        percakapan.get(item.idLawan).push(item);
                    });
                    percakapan.forEach((pesan, idLawan) => tampilkanNotifikasi(idLawan, pesan));
                }
                baru.forEach((item) => diketahui.add(item.key));
                return true;
            });
        } catch (_) {
            pesanError = 'Notifikasi belum dapat diproses. Coba lagi.';
        } finally {
            memeriksa = false;
            perbaruiTampilan();
        }
    }
    function jadwalkanPemeriksaan() {
        if (!sesiSesuai() || jadwal !== null) return;
        jadwal = setTimeout(() => {
            jadwal = null;
            periksaPesan();
        }, 0);
    }
    function sesuaikanPemeriksaan() {
        clearInterval(timer);
        timer = null;
        aktif = bacaPreferensi();
        if (sesiSesuai() && aktif && izinBrowser() === 'granted') {
            timer = setInterval(periksaPesan, 2000);
            perbaruiKehadiran();
        } else {
            perbaruiKehadiran();
            tutupSemua();
        }
        perbaruiTampilan();
    }
    function hentikan() {
        berhenti = true;
        clearInterval(timer);
        clearTimeout(jadwal);
        timer = null;
        jadwal = null;
        tutupSemua();
        try {
            localStorage.removeItem(kehadiranKey);
        } catch (_) {}
    }
    menu.addEventListener('click', () => {
        daftarPengaturan.style.display = 'none';
        panelPengaturanTema.hidden = true;
        panelPengaturanNotifikasi.hidden = false;
        judulPanelSetelan.textContent = 'Notifikasi';
        menu.setAttribute('aria-expanded', 'true');
        sesuaikanPemeriksaan();
        document.getElementById('judul-notifikasi').focus();
    });
    tombol.addEventListener('click', async () => {
        if (!sesiSesuai() || memintaIzin || tombol.disabled) return;
        pesanError = '';
        memintaIzin = true;
        const nonaktifkan = bacaPreferensi() && izinBrowser() === 'granted';
        perbaruiTampilan();
        try {
            let izin = izinBrowser();
            if (!nonaktifkan && izin === 'default') izin = await Notification.requestPermission();
            if (!sesiSesuai()) return;
            if (nonaktifkan || izin === 'granted') {
                titikAwal();
                localStorage.setItem(preferensiKey, JSON.stringify(!nonaktifkan));
            }
        } catch (_) {
            pesanError = 'Pengaturan notifikasi gagal disimpan. Coba lagi.';
        } finally {
            memintaIzin = false;
            sesuaikanPemeriksaan();
        }
    });
    window.addEventListener('storage', (event) => {
        if (!sesiSesuai()) return hentikan();
        if (event.key === preferensiKey || event.key === null) {
            titikAwal();
            pesanError = '';
            sesuaikanPemeriksaan();
        } else if (event.key === KEY_CHAT) jadwalkanPemeriksaan();
        else if (event.key === 'ngumpul_kontak_' + akunId) titikAwal();
        else if (event.key?.startsWith(awalKehadiran)) tutupYangDibaca();
    });
    function perbaruiFokus() {
        if (!sesiSesuai()) return hentikan();
        sesuaikanPemeriksaan();
        tutupYangDibaca();
        jadwalkanPemeriksaan();
    }
    window.addEventListener('focus', perbaruiFokus);
    window.addEventListener('blur', perbaruiKehadiran);
    document.addEventListener('visibilitychange', perbaruiFokus);
    document.addEventListener('click', () => {
        queueMicrotask(() => {
            perbaruiKehadiran();
            tutupYangDibaca();
        });
    });
    ['btn-keluar-akun', 'btn-masuk-akun-lain'].forEach((id) => {
        document.getElementById(id)?.addEventListener('click', hentikan, true);
    });
    window.addEventListener('pagehide', hentikan);
    window.addEventListener('pageshow', (event) => {
        if (!event.persisted || getUserAktif()?.id !== akunId) return;
        berhenti = false;
        titikAwal();
        sesuaikanPemeriksaan();
    });
    if (navigator.permissions?.query) {
        navigator.permissions
            .query({ name: 'notifications' })
            .then((permission) => {
                permission.addEventListener('change', () => {
                    if (!sesiSesuai()) return;
                    pesanError = '';
                    titikAwal();
                    sesuaikanPemeriksaan();
                });
            })
            .catch(() => {});
    }
    aktif = bacaPreferensi();
    titikAwal();
    sesuaikanPemeriksaan();
})();
