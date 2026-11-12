// ===== Penjaga: harus login dulu =====
const userAktif = getUserAktif();
if (!userAktif) { location.replace('../auth/login.html'); }

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
        document.dispatchEvent(new CustomEvent('ngumpul:buka-chat', {
            detail: { idLawan: idChatTertunda }
        }));
        history.replaceState(null, '', location.pathname + location.search);
    }, 0);
}

// ===== Elemen utama =====
const triggerMenuUtama = document.getElementById('trigger-menu-utama'),
    boxDropdownUtama = document.getElementById('box-dropdown-utama'),
    optBukaSetelan = document.getElementById('opt-buka-setelan'),
    panelLayerSetelan = document.getElementById('panel-layer-setelan'),
    btnKembaliKeChat = document.getElementById('btn-kembali-ke-chat');

// ===== Menu titik tiga =====
triggerMenuUtama.addEventListener('click', e => {
    e.stopPropagation();
    boxDropdownUtama.style.display = boxDropdownUtama.style.display === 'none' ? 'block' : 'none';
});
document.addEventListener('click', () => { boxDropdownUtama.style.display = 'none'; });

// ===== Panel Pengaturan =====
function bukaSetelan() {
    panelLayerSetelan.style.display = 'flex';
    // untuk layar mobile: panel ada di dalam .sisi-kanan yang disembunyikan CSS
    document.getElementById('panel-sisi-kiri').classList.add('room-open');
    document.getElementById('panel-sisi-kanan').classList.add('room-open');
    function bukaSetelan() {
    panelLayerSetelan.style.display = 'flex';
    // untuk layar mobile: panel ada di dalam .sisi-kanan yang disembunyikan CSS
    document.getElementById('panel-sisi-kiri').classList.add('room-open');
    document.getElementById('panel-sisi-kanan').classList.add('room-open');
    perbaruiEfekKartuProfil(); // <-- BARIS BARU
}
}
function tutupSetelan() {
    panelLayerSetelan.style.display = 'none';
    document.getElementById('panel-sisi-kiri').classList.remove('room-open');
    document.getElementById('panel-sisi-kanan').classList.remove('room-open');
    // bersihkan hash supaya refresh tidak membuka panel lagi
    history.replaceState(null, '', location.pathname + location.search);
}

optBukaSetelan.addEventListener('click', () => {
    bukaSetelan();
    boxDropdownUtama.style.display = 'none';
});
btnKembaliKeChat.addEventListener('click', tutupSetelan);

// buka otomatis jika datang dari halaman lain dengan #settings
if (location.hash === '#settings') bukaSetelan();

// ===== Keluar akun: hanya menghapus sesi tab ini, data akun tetap aman =====
document.getElementById('btn-keluar-akun').addEventListener('click', () => {
    hapusSesi();
    window.location.href = '../auth/login.html';
});

// ===== Menu "Akun" -> halaman akun =====
const btnMenuAkun = document.querySelector('.settings-row-item[data-fitur="akun"]');
if (btnMenuAkun) {
    btnMenuAkun.style.cursor = 'pointer';
    btnMenuAkun.addEventListener('click', () => {
        window.location.href = '../account/account.html';
    });
}

// ===== Kartu "Edit Profil" -> halaman edit-profile =====
document.addEventListener('click', (e) => {
    const targetEdit = e.target.closest('[data-fitur="edit-profil"], #btn-buka-edit-profil, .profile-card-trigger');
    if (targetEdit) {
        window.location.href = '../profile/edit-profile.html';
    }
});

// ===== Isi kartu profil dengan data AKUN YANG SEDANG LOGIN =====
// ===== Foto profil hasil crop & banner (disimpan di localStorage oleh halaman Edit Profil) =====
const KUNCI_MEDIA = 'ngumpul_media_';
function bacaMedia(idUser) {
    try { return JSON.parse(localStorage.getItem(KUNCI_MEDIA + idUser)) || {}; }
    catch (e) { return {}; }
}

// ===== Isi kartu profil dengan data AKUN YANG SEDANG LOGIN =====
if (userAktif) {
    const profil = getProfil(userAktif.id);
    const kartu = document.getElementById('btn-buka-edit-profil');
    if (kartu) {
        const elemNama = kartu.querySelector('#setting-display-name') || kartu.querySelector('b');
        const elemUsername = kartu.querySelector('#setting-display-username') || kartu.querySelector('.profil-username');
        const elemBio = kartu.querySelector('#setting-display-bio') || kartu.querySelector('.profil-bio');
        
        if (elemNama) elemNama.textContent = profil.nama;
        if (elemUsername) elemUsername.textContent = profil.username;
        if (elemBio) elemBio.textContent = profil.bio || 'Mahasiswa Teknik Informatika';

        // Ambil data gambar (avatar & banner) dari localStorage
        const media = bacaMedia(userAktif.id);
        
        // 1. Render Avatar / Foto Profil di Dashboard
        const imgAvatarOutput = document.getElementById('setting-img-avatar-output');
        const defaultUserIcon = document.getElementById('setting-default-user-icon') || kartu.querySelector('.settings-default-user-icon');
        if (media.avatar && typeof media.avatar === 'string' && media.avatar.startsWith('data:image/')) {
            if (imgAvatarOutput) {
                imgAvatarOutput.src = media.avatar;
                imgAvatarOutput.style.display = 'block';
            }
            if (defaultUserIcon) {
                defaultUserIcon.style.display = 'none';
            }
        }

        // 2. Render Banner di Dashboard
        const bannerPreview = document.getElementById('setting-banner-preview');
        if (media.banner && typeof media.banner === 'string' && media.banner.startsWith('data:image/')) {
            if (bannerPreview) {
                bannerPreview.style.backgroundImage = 'url("' + media.banner + '")';
                bannerPreview.style.backgroundSize = 'cover';
                bannerPreview.style.backgroundPosition = 'center';
            }
        }
    }

    // isi menu ganti akun
    const mNama = document.getElementById('akun-menu-nama');
    const mUser = document.getElementById('akun-menu-username');
    if (mNama) mNama.textContent = profil.nama;
    if (mUser) mUser.textContent = profil.username;
}

// kartu juga bisa dibuka lewat keyboard (Enter / Spasi)
const kartuProfil = document.getElementById('btn-buka-edit-profil');
if (kartuProfil) {
    kartuProfil.addEventListener('keydown', (e) => {
        if (e.target !== kartuProfil) return; // abaikan tombol di dalam kartu (panah v)
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            window.location.href = '../profile/edit-profile.html';
        }
    });
}

// Buang draft Edit Profil yang belum disimpan
try { sessionStorage.removeItem('draft_profil_edit'); } catch (e) {}

// ===== Panah (v) di kartu profil: menu ganti akun =====
const btnGantiAkun = document.getElementById('btn-ganti-akun');
const menuGantiAkun = document.getElementById('menu-ganti-akun');

function tutupMenuGantiAkun() {
    if (!menuGantiAkun) return;
    menuGantiAkun.hidden = true;
    if (btnGantiAkun) btnGantiAkun.setAttribute('aria-expanded', 'false');
}
if (btnGantiAkun && menuGantiAkun) {
    btnGantiAkun.addEventListener('click', (e) => {
        e.stopPropagation(); // jangan ikut membuka halaman Edit Profil
        const buka = menuGantiAkun.hidden;
        menuGantiAkun.hidden = !buka;
        btnGantiAkun.setAttribute('aria-expanded', String(buka));
    });
    // klik di luar menu = tutup
    document.addEventListener('click', (e) => {
        if (!menuGantiAkun.contains(e.target)) tutupMenuGantiAkun();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') tutupMenuGantiAkun();
    });
    // beralih akun: akhiri sesi tab ini lalu masuk dengan akun lain
    document.getElementById('btn-masuk-akun-lain').addEventListener('click', () => {
        hapusSesi();
        window.location.href = '../auth/login.html';
    });
}


// ===== Efek scroll KHUSUS kartu profil =====
// Kartu ada di paling atas daftar pengaturan: saat digulir ke bawah ia memudar & hilang,
// saat digulir ke atas muncul lagi. Menu pengaturan di bawahnya tidak disentuh.
function perbaruiEfekKartuProfil() {
    const profilAtas = document.getElementById('profil-atas');
    const daftar = document.querySelector('.settings-list-flow');
    if (!profilAtas || !daftar) return;
    const tinggi = profilAtas.offsetHeight || 1;
    const p = Math.min(Math.max(daftar.scrollTop / tinggi, 0), 1); // 0 = terlihat, 1 = hilang
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        profilAtas.style.opacity = p >= 1 ? '0' : '1';
        profilAtas.style.transform = '';
    } else {
        profilAtas.style.opacity = String(1 - p);
        profilAtas.style.transform = 'scale(' + (1 - 0.05 * p) + ')';
    }
    profilAtas.style.pointerEvents = p >= 0.9 ? 'none' : '';
    if (p >= 0.9) tutupMenuGantiAkun();
}

let sedangMenjadwalkan = false;
const daftarSetelanScroll = document.querySelector('.settings-list-flow');
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
