const triggerMenuUtama=document.getElementById('trigger-menu-utama'),
boxDropdownUtama=document.getElementById('box-dropdown-utama'),
optBukaSetelan=document.getElementById('opt-buka-setelan'),
panelLayerSetelan=document.getElementById('panel-layer-setelan'),
btnKembaliKeChat=document.getElementById('btn-kembali-ke-chat');

triggerMenuUtama.addEventListener('click',e=>{e.stopPropagation();boxDropdownUtama.style.display=boxDropdownUtama.style.display==='none'?'block':'none'});
document.addEventListener('click',()=>{boxDropdownUtama.style.display='none'});
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

document.getElementById('btn-keluar-akun').addEventListener('click',()=>{
    try{localStorage.clear();sessionStorage.clear()}catch(e){}
    window.location.href='../../index.html?splash=none';
});

const btnMenuAkun = document.querySelector('.settings-row-item[data-fitur="akun"]');
if (btnMenuAkun) {
    btnMenuAkun.style.cursor = 'pointer';
    btnMenuAkun.addEventListener('click', () => {
        window.location.href = '../account/account.html';
    });
}

// 2. Menghubungkan kartu/tombol "Edit Profil" ke halaman edit-profile.html
document.addEventListener('click', (e) => {
    const targetEdit = e.target.closest('[data-fitur="edit-profil"], #btn-buka-edit-profil, .profile-card-trigger');
    if (targetEdit) {
        window.location.href = '../profile/edit-profile.html';
    }
});

// Otomatis update nama di kartu profil dashboard saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    const namaTersimpan = localStorage.getItem('user_nama_profil');
    if (namaTersimpan) {
    // Mencari elemen teks nama di kartu profil dashboard
    const elemNamaDashboard = document.querySelector('#btn-buka-edit-profil b');
    if (elemNamaDashboard) {
        elemNamaDashboard.textContent = namaTersimpan;
    }

    // Huruf di lingkaran avatar ikut berubah
    const elemAvatar = document.querySelector('#btn-buka-edit-profil .circle-avatar');
    if (elemAvatar) {
        elemAvatar.textContent = namaTersimpan.charAt(0).toUpperCase();
    }
}
});

// Muat data profil secara dinamik ke dashboard
document.addEventListener('DOMContentLoaded', () => {
    const namaTersimpan = localStorage.getItem('user_nama_profil');
    const usernameTersimpan = localStorage.getItem('user_username_profil');
    const bioTersimpan = localStorage.getItem('user_bio_profil');

    if (namaTersimpan) {
        const elemNama = document.querySelector('#btn-buka-edit-profil b');
        if (elemNama) elemNama.textContent = namaTersimpan;
    }

    if (usernameTersimpan) {
        const elemUsername = document.querySelector('#btn-buka-edit-profil small:nth-of-type(1)');
        if (elemUsername) elemUsername.textContent = usernameTersimpan;
    }

    if (bioTersimpan) {
        const elemBio = document.querySelector('#btn-buka-edit-profil small:nth-of-type(2)');
        if (elemBio) elemBio.textContent = bioTersimpan;
    }
});

// Buang draft Edit Profil yang belum disimpan
try { sessionStorage.removeItem('draft_profil_edit'); } catch (e) {}