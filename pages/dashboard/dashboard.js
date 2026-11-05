// ===== Penjaga: harus login dulu =====
const userAktif = getUserAktif();
if (!userAktif) { location.replace('../auth/login.html'); }

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
if (userAktif) {
    const profil = getProfil(userAktif.id);
    const kartu = document.getElementById('btn-buka-edit-profil');
    if (kartu) {
        const elemNama = kartu.querySelector('b');
        const elemAvatar = kartu.querySelector('.circle-avatar');
        const elemUsername = kartu.querySelector('small:nth-of-type(1)');
        const elemBio = kartu.querySelector('small:nth-of-type(2)');
        if (elemNama) elemNama.textContent = profil.nama;
        if (elemAvatar) elemAvatar.textContent = profil.nama.charAt(0).toUpperCase();
        if (elemUsername) elemUsername.textContent = profil.username;
        if (elemBio) elemBio.textContent = profil.bio;
    }
}

// Buang draft Edit Profil yang belum disimpan
try { sessionStorage.removeItem('draft_profil_edit'); } catch (e) {}