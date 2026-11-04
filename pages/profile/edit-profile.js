document.addEventListener('DOMContentLoaded', () => {
    // Tombol kembali ke Dashboard Utama
    const btnBack = document.getElementById('btn-back-dashboard');
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            window.location.href = '../dashboard/dashboard.html';
        });
    }

    // Tombol navigasi dari Profil menuju Halaman Tautan Media Sosial (Layar 3)
    const navToSocial = document.getElementById('nav-to-social');
    if (navToSocial) {
        navToSocial.addEventListener('click', () => {
            window.location.href = 'social-links.html';
        });
    }

    // Preview Banner & Avatar
    const inputBanner = document.getElementById('input-banner');
    const bannerContainer = document.getElementById('banner-preview-container');
    if (inputBanner) {
        inputBanner.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) bannerContainer.style.backgroundImage = `url('${URL.createObjectURL(file)}')`;
        });
    }

    const inputAvatar = document.getElementById('input-avatar');
    const imgAvatarOutput = document.getElementById('img-avatar-output');
    const avatarDefaultIcon = document.querySelector('.avatar-default-icon');
    if (inputAvatar) {
        inputAvatar.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                imgAvatarOutput.src = URL.createObjectURL(file);
                imgAvatarOutput.style.display = 'block';
                if (avatarDefaultIcon) avatarDefaultIcon.style.display = 'none';
            }
        });
    }

    // Interaksi ubah data teks
    document.querySelectorAll('.info-row-item[data-field]').forEach(row => {
        row.addEventListener('click', () => {
            const field = row.getAttribute('data-field');
            const valueSpan = row.querySelector('.field-value');
            const inputBaru = prompt(`Ubah ${field.toUpperCase()}:`, valueSpan.textContent);
            if (inputBaru !== null && inputBaru.trim() !== '') {
                valueSpan.textContent = inputBaru;
            }
        });
    });
});

    // notifikasi setelah disimpan
    let timerToast;
    function tampilkanToast() {
        const toast = document.getElementById('toast-simpan');
        if (!toast) return;

        // reset supaya animasi bisa diulang kalau diklik berkali-kali
        clearTimeout(timerToast);
        toast.classList.remove('tampil');
        void toast.offsetWidth;

        toast.classList.add('tampil');
        timerToast = setTimeout(() => toast.classList.remove('tampil'), 3000);
    }

// SIMPAN SEMUA DATA PROFIL KE LOCALSTORAGE
const btnSave = document.getElementById('btn-save-profile');
if (btnSave) {
    btnSave.addEventListener('click', () => {
        const namaVal = document.getElementById('input-nama-user').value;
        const usernameVal = document.getElementById('val-username').textContent;
        const bioVal = document.getElementById('val-bio').textContent;
        const phoneVal = document.getElementById('val-phone').textContent;

        localStorage.setItem('user_nama_profil', namaVal);
        localStorage.setItem('user_username_profil', usernameVal);
        localStorage.setItem('user_bio_profil', bioVal);
        localStorage.setItem('user_phone_profil', phoneVal);

       tampilkanToast();
    });
}

const btnBack = document.getElementById('btn-back-dashboard');
if (btnBack) {
    btnBack.addEventListener('click', () => {
        window.location.href = '../dashboard/dashboard.html#settings';
    });
}