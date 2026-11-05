const KUNCI_DRAFT = 'draft_profil_edit';

document.addEventListener('DOMContentLoaded', () => {
    // harus login; profil dibaca dan ditulis per akun
    const user = getUserAktif();
    if (!user) { location.replace('../auth/login.html'); return; }
    const profil = getProfil(user.id);

    const inputNama = document.getElementById('input-nama-user');
    const valEl = {
        username: document.getElementById('val-username'),
        bio: document.getElementById('val-bio'),
        phone: document.getElementById('val-phone')
    };

    // ===== Draft: simpan sementara & pulihkan =====
    function simpanDraft() {
        try {
            sessionStorage.setItem(KUNCI_DRAFT, JSON.stringify({
                nama: inputNama.value,
                username: valEl.username.textContent,
                bio: valEl.bio.textContent,
                phone: valEl.phone.textContent
            }));
        } catch (e) {}
    }
    function hapusDraft() {
        try { sessionStorage.removeItem(KUNCI_DRAFT); } catch (e) {}
    }

    // ===== Muat data: draft dulu, kalau tidak ada pakai data tersimpan =====
    let draft = null;
    try { draft = JSON.parse(sessionStorage.getItem(KUNCI_DRAFT)); } catch (e) {}

    function ambil(field) {
        if (draft && draft[field] != null) return draft[field];
        return profil[field];
    }

    const namaAwal = ambil('nama');
    if (namaAwal && inputNama) inputNama.value = namaAwal;

    ['username', 'bio', 'phone'].forEach(field => {
        const nilai = ambil(field);
        if (nilai && valEl[field]) valEl[field].textContent = nilai;
    });

    // Nama diketik -> draft ikut diperbarui
    if (inputNama) inputNama.addEventListener('input', simpanDraft);

    // ===== Tombol kembali ke Panel Pengaturan (draft dibuang) =====
    const btnBack = document.getElementById('btn-back-dashboard');
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            hapusDraft();
            window.location.href = '../dashboard/dashboard.html#settings';
        });
    }

    // ===== Menuju Tautan Media Sosial (draft dipertahankan) =====
    const navToSocial = document.getElementById('nav-to-social');
    if (navToSocial) {
        navToSocial.addEventListener('click', () => {
            simpanDraft();
            window.location.href = 'social-links.html';
        });
    }

    // ===== Preview Banner & Avatar =====
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

    // ===== Edit langsung di tempat (inline) =====
    document.querySelectorAll('.info-row-item[data-field]').forEach(row => {
        const field = row.getAttribute('data-field');
        const span = row.querySelector('.field-value');

        row.addEventListener('click', () => {
            if (row.querySelector('input')) return; // sudah aktif

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'social-input-field';
            input.value = span.textContent;
            if (field === 'phone') input.inputMode = 'tel';

            span.style.display = 'none';
            span.after(input);
            input.focus();
            input.select();

            let selesai = false;
            const tutup = (terima) => {
                if (selesai) return;
                selesai = true;
                let baru = input.value.trim();
                if (terima && baru) {
                    if (field === 'username' && !baru.startsWith('@')) baru = '@' + baru;
                    span.textContent = baru;
                    simpanDraft();
                }
                input.remove();
                span.style.display = '';
            };

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') tutup(true);
                if (e.key === 'Escape') tutup(false);
            });
            input.addEventListener('blur', () => tutup(true));
        });
    });

    // ===== Notifikasi toast =====
    let timerToast;
    function tampilkanToast() {
        const toast = document.getElementById('toast-simpan');
        if (!toast) return;
        clearTimeout(timerToast);
        toast.classList.remove('tampil');
        void toast.offsetWidth;
        toast.classList.add('tampil');
        timerToast = setTimeout(() => toast.classList.remove('tampil'), 3000);
    }

    // ===== Simpan semua data profil =====
    const btnSave = document.getElementById('btn-save-profile');
    if (btnSave) {
        btnSave.addEventListener('click', () => {
            // tutup kolom ketik yang masih aktif supaya nilainya ikut terambil
            if (document.activeElement) document.activeElement.blur();

            simpanProfil(user.id, {
                nama: inputNama.value.trim() || user.nama,
                username: valEl.username.textContent,
                bio: valEl.bio.textContent,
                phone: valEl.phone.textContent
            });

            hapusDraft(); // sudah resmi tersimpan, draft tidak diperlukan lagi
            tampilkanToast();
        });
    }
});