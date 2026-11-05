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

// ===== Keluar akun =====
document.getElementById('btn-keluar-akun').addEventListener('click', () => {
    try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
    window.location.href = '../../index.html?splash=none';
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

// ===== Muat data profil ke kartu profil dashboard =====
document.addEventListener('DOMContentLoaded', () => {
    const nama = localStorage.getItem('user_nama_profil');
    const username = localStorage.getItem('user_username_profil');
    const bio = localStorage.getItem('user_bio_profil');

    if (nama) {
        const elemNama = document.querySelector('#btn-buka-edit-profil b');
        if (elemNama) elemNama.textContent = nama;

        // huruf di lingkaran avatar ikut berubah
        const elemAvatar = document.querySelector('#btn-buka-edit-profil .circle-avatar');
        if (elemAvatar) elemAvatar.textContent = nama.charAt(0).toUpperCase();
    }
    if (username) {
        const elemUsername = document.querySelector('#btn-buka-edit-profil small:nth-of-type(1)');
        if (elemUsername) elemUsername.textContent = username;
    }
    if (bio) {
        const elemBio = document.querySelector('#btn-buka-edit-profil small:nth-of-type(2)');
        if (elemBio) elemBio.textContent = bio;
    }
});

// Buang draft Edit Profil yang belum disimpan
try { sessionStorage.removeItem('draft_profil_edit'); } catch (e) {}