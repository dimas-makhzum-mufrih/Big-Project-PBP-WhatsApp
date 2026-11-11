
// ===== Penjaga: harus login dulu =====
const userAktif = getUserAktif();

if (!userAktif) {
    location.replace('../auth/login.html');
}

// ===== Integrasi chat dari halaman kontak Nazwa =====
// Format URL: dashboard.html#buka-chat=ID_USER
const idChatTertunda = new URLSearchParams(
    location.hash.slice(1)
).get('buka-chat');

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
const menuTema = document.querySelector('.settings-row-item[data-fitur="tema"]');

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

    // Untuk layar mobile
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

    // Bersihkan hash
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

// Tombol kembali: pertahankan navigasi subpanel tema dari Kiki
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

// Buka otomatis jika datang dari halaman lain dengan #settings
if (location.hash === '#settings') {
    bukaSetelan();
}

// ===== Keluar akun: pertahankan tema, hapus hanya sesi =====
const btnKeluarAkun = document.getElementById('btn-keluar-akun');

if (btnKeluarAkun) {
    btnKeluarAkun.addEventListener('click', () => {
        try {
            // Pertahankan preferensi tema
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
    const targetEdit = e.target.closest(
        '[data-fitur="edit-profil"], #btn-buka-edit-profil, .profile-card-trigger'
    );

    if (targetEdit) {
        window.location.href = '../profile/edit-profile.html';
    }
});

// ===== Media profil =====
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

// ===== Kartu profil bisa dibuka dengan keyboard =====
const kartuProfil = document.getElementById('btn-buka-edit-profil');

if (kartuProfil) {
    kartuProfil.addEventListener('keydown', e => {
        if (e.target !== kartuProfil) return;

        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            window.location.href = '../profile/edit-profile.html';
        }
    });
}

// Buang draft Edit Profil yang belum disimpan
try {
    sessionStorage.removeItem('draft_profil_edit');
} catch (e) {}

// ===== Menu ganti akun =====
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

    // Beralih akun
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
function perbaruiEfekKartuProfil() {
    const profilAtas = document.getElementById('profil-atas');
    const daftar = document.querySelector('.settings-list-flow');

    if (!profilAtas || !daftar) return;

    const tinggi = profilAtas.offsetHeight || 1;

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
