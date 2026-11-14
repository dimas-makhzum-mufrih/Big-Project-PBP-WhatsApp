// ===== Penjaga: harus login dulu =====
const userAktif = getUserAktif();

if (!userAktif) {
    location.replace('../auth/login.html');
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
}

tabChat.addEventListener('click', () => {
    pilihTabDashboard(false);
    catatLangkahTab('chat');
});
tabKontak.addEventListener('click', () => {
    pilihTabDashboard(true);
    catatLangkahTab('kontak');
});
document.getElementById('btn-kembali-dari-kontak').addEventListener('click', () => {
    pilihTabDashboard(false);
    tabChat.focus();
    catatLangkahTab('chat');
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

// ===== Toast kecil untuk tema =====
let timerToastTema;

function tampilToastTema(teks) {
    let el = document.getElementById('tema-toast');

    if (!el) {
        el = document.createElement('div');
        el.id = 'tema-toast';
        el.className = 'tema-toast';
        el.setAttribute('role', 'status');
        document.body.appendChild(el);
    }

    el.textContent = teks;
    el.classList.add('tampil');

    clearTimeout(timerToastTema);
    timerToastTema = setTimeout(() => el.classList.remove('tampil'), 2500);
}

// ===== Tanda kunci di kartu tema premium =====
function perbaruiKunciTema() {
    if (!window.NgumpulTheme || !NgumpulTheme.daftar) return;

    const premium = NgumpulTheme.isPremium();

    tombolPilihanTema.forEach(button => {
        const def = NgumpulTheme.daftar[button.dataset.setTheme];
        button.classList.toggle('terkunci', !!(def && def.premium && !premium));
    });

}

// ===== Panel Sky Cycle (hanya tampil untuk tema Celeste) =====
const panelSky = document.getElementById('panel-sky-cycle');

function perbaruiPanelSky() {
    if (!panelSky || !window.NgumpulTheme || !NgumpulTheme.daftar) return;

    const def = NgumpulTheme.daftar[NgumpulTheme.getTheme()];
    panelSky.hidden = !(def && def.sky);

    const mode = NgumpulTheme.getSkyMode();
    panelSky.querySelectorAll('[data-sky-mode]').forEach(b => {
        const aktif = b.dataset.skyMode === mode;
        b.classList.toggle('aktif', aktif);
        b.setAttribute('aria-pressed', String(aktif));
    });

    const malam = NgumpulTheme.getPhase() === 'night';
    const status = document.getElementById('sky-status');

    if (status) status.textContent = 'Sekarang tampil ' + (malam ? 'malam' : 'siang');
}

if (panelSky) {
    panelSky.querySelectorAll('[data-sky-mode]').forEach(b => {
        b.addEventListener('click', () => {
            if (window.NgumpulTheme) NgumpulTheme.setSkyMode(b.dataset.skyMode);
        });
    });
}

// ===== Memilih tema =====
tombolPilihanTema.forEach(button => {
    button.addEventListener('click', () => {
        if (!window.NgumpulTheme) return;

        const berhasil = NgumpulTheme.setTheme(button.dataset.setTheme);

        if (!berhasil) {
            tampilToastTema('Tema ini khusus Ngumpul Plus');
        }

        perbaruiPilihanTema();
    });
});

// ===== Buka kunci Ngumpul Plus (rahasia) =====
// Syarat: foto profil + banner sudah dipasang.
// Lalu di dashboard klik tab Chat, tab Kontak, kembali ke tab Chat.
const KUNCI_PREMIUM = 'ngumpul_premium_';
let urutanTab = [];

function syaratPlusTerpenuhi() {
    if (!userAktif) return false;

    const media = bacaMedia(userAktif.id);
    const adaGambar = v => typeof v === 'string' && v.startsWith('data:image/');

    return adaGambar(media.avatar) && adaGambar(media.banner);
}

function catatLangkahTab(langkah) {
    if (!userAktif || !window.NgumpulTheme || NgumpulTheme.isPremium()) return;

    urutanTab.push(langkah);
    urutanTab = urutanTab.slice(-3);

    if (urutanTab.join(',') === 'chat,kontak,chat' && syaratPlusTerpenuhi()) {
        urutanTab = [];
        bukaNgumpulPlus();
    }
}

function bukaNgumpulPlus() {
    try {
        localStorage.setItem(KUNCI_PREMIUM + userAktif.id, '1');
    } catch (e) {
        return;
    }

    perbaruiPilihanTema();
    perbaruiKunciTema();
    perbaruiPanelSky();
    tampilPopupPlus();
}

function tampilPopupPlus() {
    if (document.getElementById('plus-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'plus-overlay';
    overlay.className = 'plus-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'plus-judul');

    const dialog = document.createElement('div');
    dialog.className = 'plus-dialog';

    // Riak garis emas. Isinya konstanta, bukan input pengguna.
    const riak = document.createElement('div');
    riak.className = 'plus-riak';
    riak.setAttribute('aria-hidden', 'true');
    riak.innerHTML =
        '<span></span><span></span><span></span>' +
        '<i class="plus-pusat"><svg viewBox="0 0 24 24">' +
        '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>' +
        '</svg></i>';

    const judul = document.createElement('h3');
    judul.id = 'plus-judul';
    judul.className = 'plus-judul';
    judul.textContent = 'Ngumpul Plus terbuka';

    const teks = document.createElement('p');
    teks.className = 'plus-teks';
    teks.textContent = 'Semua tema Plus sekarang bisa kamu pakai, termasuk Celeste dengan Sky Cycle.';

    const aksi = document.createElement('div');
    aksi.className = 'plus-aksi';

    const btnLihat = document.createElement('button');
    btnLihat.type = 'button';
    btnLihat.className = 'plus-btn';
    btnLihat.textContent = 'Lihat tema';

    const btnTutup = document.createElement('button');
    btnTutup.type = 'button';
    btnTutup.className = 'plus-btn plus-btn-garis';
    btnTutup.textContent = 'Nanti saja';

    aksi.append(btnLihat, btnTutup);
    dialog.append(riak, judul, teks, aksi);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    function tutup() {
        overlay.classList.remove('tampil');
        document.removeEventListener('keydown', saatTekan);
        setTimeout(() => overlay.remove(), 300);
    }

    function saatTekan(e) {
        if (e.key === 'Escape') tutup();
    }

    btnTutup.addEventListener('click', tutup);
    btnLihat.addEventListener('click', () => {
        tutup();
        bukaSetelan();
        bukaPengaturanTema();
    });
    overlay.addEventListener('click', e => {
        if (e.target === overlay) tutup();
    });
    document.addEventListener('keydown', saatTekan);

    // Dua frame supaya transisi muncul terpicu
    requestAnimationFrame(() => requestAnimationFrame(() => {
        overlay.classList.add('tampil');
        btnLihat.focus();
    }));
}

// Setiap tema berubah (termasuk ganti fase otomatis), segarkan UI
document.addEventListener('ngumpul:tema-berubah', () => {
    perbaruiPilihanTema();
    perbaruiKunciTema();
    perbaruiPanelSky();
});

// Inisialisasi pilihan tema
perbaruiPilihanTema();
perbaruiKunciTema();
perbaruiPanelSky();

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