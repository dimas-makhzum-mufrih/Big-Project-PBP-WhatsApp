// ===== Penjaga: harus login dulu =====
const userAktif = getUserAktif();

if (!userAktif) {
    location.replace('../auth/login.html');
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
        if (chatAktifId === pengguna.id) tandaiPesanDibaca(pengguna.id);
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
            footer.appendChild(status);
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

// ===== Tab Chat / Kontak di dalam dashboard =====
const tabChat = document.getElementById('tab-chat');
const tabKontak = document.getElementById('tab-kontak');
const panelTabChat = document.getElementById('panel-tab-chat');
const panelTabKontak = document.getElementById('panel-tab-kontak');

function pilihTabDashboard(kontakAktif) {
    panelTabChat.hidden = kontakAktif;
    panelTabKontak.hidden = !kontakAktif;
    tabChat.classList.toggle('aktif', !kontakAktif);
    tabKontak.classList.toggle('aktif', kontakAktif);
    tabChat.setAttribute('aria-pressed', String(!kontakAktif));
    tabKontak.setAttribute('aria-pressed', String(kontakAktif));
    if (!kontakAktif) renderChatList();
}

tabChat.addEventListener('click', () => pilihTabDashboard(false));
tabKontak.addEventListener('click', () => pilihTabDashboard(true));
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
            menuNotifikasi.setAttribute('aria-expanded', 'false');
            menuNotifikasi.focus();
            return;
        }
        if (panelPengaturanTema && !panelPengaturanTema.hidden) {
            panelPengaturanTema.hidden = true;

            if (daftarPengaturan) {
                daftarPengaturan.style.display = 'block';
            }

            if (judulPanelSetelan) {
                judulPanelSetelan.textContent = 'Pengaturan';
            }
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
