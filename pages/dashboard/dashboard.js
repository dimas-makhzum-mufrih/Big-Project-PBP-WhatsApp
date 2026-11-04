const triggerMenuUtama=document.getElementById('trigger-menu-utama'),
boxDropdownUtama=document.getElementById('box-dropdown-utama'),
optBukaSetelan=document.getElementById('opt-buka-setelan'),
panelLayerSetelan=document.getElementById('panel-layer-setelan'),
btnKembaliKeChat=document.getElementById('btn-kembali-ke-chat');

triggerMenuUtama.addEventListener('click',e=>{e.stopPropagation();boxDropdownUtama.style.display=boxDropdownUtama.style.display==='none'?'block':'none'});
document.addEventListener('click',()=>{boxDropdownUtama.style.display='none'});
optBukaSetelan.addEventListener('click',()=>{panelLayerSetelan.style.display='flex';boxDropdownUtama.style.display='none'});
btnKembaliKeChat.addEventListener('click',()=>{panelLayerSetelan.style.display='none'});

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

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.hash === '#settings') {
        const panelSetelan = document.getElementById('panel-layer-setelan');
        if (panelSetelan) {
            panelSetelan.classList.add('active');
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.hash === '#settings') {
        const panelSetelan = document.getElementById('panel-layer-setelan');
        if (panelSetelan) {
            panelSetelan.style.transform = 'translateX(0)';
            panelSetelan.style.display = 'block';
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.hash === '#settings') {
        const panel = document.getElementById('panel-layer-setelan');
        if (panel) {
            panel.style.visibility = 'visible';
            panel.style.transform = 'translateX(0)';
            panel.style.opacity = '1';
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.hash === '#settings' || new URLSearchParams(window.location.search).get('buka_setelan') === 'true') {
        const panelSetelan = document.getElementById('panel-layer-setelan');
        if (panelSetelan) {
            panelSetelan.style.display = 'block';
            panelSetelan.style.transform = 'translateX(0)';
            panelSetelan.style.visibility = 'visible';
            panelSetelan.style.opacity = '1';
            panelSetelan.classList.add('active', 'open', 'show');
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.hash === '#settings') {
        const panelSetelan = document.getElementById('panel-layer-setelan');
        if (panelSetelan) {
            panelSetelan.style.setProperty('display', 'block', 'important');
            panelSetelan.style.setProperty('transform', 'translateX(0)', 'important');
            panelSetelan.style.setProperty('left', '0', 'important');
            panelSetelan.style.setProperty('visibility', 'visible', 'important');
            panelSetelan.style.setProperty('opacity', '1', 'important');
            panelSetelan.style.setProperty('z-index', '9999', 'important');
        }
    }
});