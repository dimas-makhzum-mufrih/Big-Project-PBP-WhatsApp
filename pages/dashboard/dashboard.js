// ===== Penjaga: harus login dulu =====
const userAktif = getUserAktif();

if (!userAktif) {
    location.replace('../auth/login.html');
}

// ===== Fitur Chat =====
const KEY_CHAT = 'ngumpul_pesan';
const panelChatKosong = document.getElementById('panel-chat-kosong');
const panelChatAktif = document.getElementById('panel-chat-aktif');
const boxListPesan = document.getElementById('box-list-pesan');
const inputTeksKirim = document.getElementById('input-teks-kirim');
const btnKirimPesan = document.getElementById('btn-kirim-pesan');
const inputCariChat = document.getElementById('input-cari-chat');
const chatScrollArea = document.querySelector('.chat-scroll-area');
const avatarHeaderKanan = document.getElementById('avatar-header-kanan');
const namaHeaderKanan = document.getElementById('nama-header-kanan');
let chatAktifId = null;

function buatIdPesan() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
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
    container.textContent = inisial;
    container.removeAttribute('aria-label');
}

function bacaSemuaChat() {
    try {
        return JSON.parse(localStorage.getItem(KEY_CHAT)) || {};
    } catch (error) {
        return {};
    }
}

function simpanSemuaChat(data) {
    try {
        localStorage.setItem(KEY_CHAT, JSON.stringify(data));
        return true;
    } catch (error) {
        console.warn('Tidak dapat menyimpan chat:', error);
        return false;
    }
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
    return {
        id: idLawan,
        nama: (kontak && kontak.nama) || profil.nama || 'Kontak',
        hp: profil.phone || (kontak && kontak.hp) || '',
        username: profil.username || '@pengguna'
    };
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

    if (chatAktifId && !isKontakPengguna(chatAktifId)) {
        chatAktifId = null;
        if (panelChatAktif) panelChatAktif.style.display = 'none';
        if (panelChatKosong) panelChatKosong.style.display = 'flex';
    }

    const query = (inputCariChat ? inputCariChat.value : '').trim().toLowerCase();
    const daftarKontak = NgumpulKontakData && typeof NgumpulKontakData.search === 'function'
        ? NgumpulKontakData.search(userAktif.id, query)
        : [];

    const hasil = daftarKontak
        .map(item => {
            const user = getUsers().find(pengguna => samakanHp(pengguna.hp, item.phone));
            if (!user || user.id === userAktif.id) return null;
            const pesan = ambilPesanChat(user.id);
            const terakhir = pesan.length ? pesan[pesan.length - 1] : null;
            return {
                id: user.id,
                nama: getProfilChat(user.id).nama,
                preview: terakhir ? terakhir.text : 'Mulai chat baru',
                waktu: terakhir ? terakhir.time : null,
                hp: user.hp
            };
        })
        .filter(Boolean)
        .sort((a, b) => {
            const waktuA = a.waktu ? new Date(a.waktu).getTime() : 0;
            const waktuB = b.waktu ? new Date(b.waktu).getTime() : 0;
            return waktuB - waktuA;
        });

    chatScrollArea.replaceChildren();

    if (!hasil.length) {
        const kosong = document.createElement('div');
        kosong.className = 'contact-empty';
        kosong.textContent = query
            ? 'Tidak ada chat yang cocok.'
            : 'Belum ada chat. Tambahkan kontak dari tab Kontak untuk mulai ngobrol.';
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
        preview.textContent = item.preview;

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

    pesan.forEach(item => {
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble ' + (item.sender === userAktif.id ? 'kirim' : 'terima');

        const text = document.createElement('span');
        text.textContent = item.text;

        const waktu = document.createElement('span');
        waktu.className = 'timestamp';
        waktu.textContent = formatJamPesan(item.time);

        bubble.appendChild(text);
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
        boxListPesan.appendChild(bubble);
    });

    boxListPesan.scrollTop = boxListPesan.scrollHeight;
}

function bukaChat(idLawan) {
    if (!idLawan || !userAktif) return;

    if (!isKontakPengguna(idLawan)) {
        chatAktifId = null;
        if (panelChatAktif) panelChatAktif.style.display = 'none';
        if (panelChatKosong) panelChatKosong.style.display = 'flex';
        renderChatList();
        return;
    }

    chatAktifId = idLawan;
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

    tandaiPesanDiterima(idLawan);
    tandaiPesanDibaca(idLawan);
    renderPesanAktif();
    renderChatList();

    if (inputTeksKirim) {
        inputTeksKirim.focus();
    }
}

function kirimPesanAktif() {
    if (!chatAktifId || !userAktif) return;

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

    renderPesanAktif();
    renderChatList();
}

window.addEventListener('storage', event => {
    if (event.key !== KEY_CHAT) return;
    prosesPesanMasuk();
    if (chatAktifId) renderPesanAktif();
    renderChatList();
});

if (inputCariChat) {
    inputCariChat.addEventListener('input', renderChatList);
}

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
