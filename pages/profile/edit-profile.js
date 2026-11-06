const KUNCI_DRAFT = 'draft_profil_edit';
const KUNCI_MEDIA = 'ngumpul_media_';   // + id user -> { avatar, banner } (data URL hasil crop)
const KUNCI_SOSMED = 'ngumpul_sosmed_'; // + id user -> [{ id, nama, platform, url }]

function bacaMedia(idUser) {
    try { return JSON.parse(localStorage.getItem(KUNCI_MEDIA + idUser)) || {}; }
    catch (e) { return {}; }
}
function tulisMedia(idUser, data) {
    try { localStorage.setItem(KUNCI_MEDIA + idUser, JSON.stringify(data)); return true; }
    catch (e) { return false; } // penyimpanan penuh / diblokir
}
function adaGambar(v) { return typeof v === 'string' && v.startsWith('data:image/'); }

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

    // ===== Banner & Avatar: crop -> simpan localStorage -> tampil langsung =====
    const inputBanner = document.getElementById('input-banner');
    const bannerContainer = document.getElementById('banner-preview-container');
    const inputAvatar = document.getElementById('input-avatar');
    const imgAvatarOutput = document.getElementById('img-avatar-output');
    const avatarDefaultIcon = document.querySelector('.avatar-default-icon');

    function tampilkanAvatar(dataUrl) {
        if (!adaGambar(dataUrl) || !imgAvatarOutput) return;
        imgAvatarOutput.src = dataUrl;
        imgAvatarOutput.style.display = 'block';
        if (avatarDefaultIcon) avatarDefaultIcon.style.display = 'none';
    }
    function tampilkanBanner(dataUrl) {
        if (!adaGambar(dataUrl) || !bannerContainer) return;
        bannerContainer.style.backgroundImage = 'url("' + dataUrl + '")';
    }

    // muat gambar yang pernah tersimpan
    const mediaTersimpan = bacaMedia(user.id);
    tampilkanAvatar(mediaTersimpan.avatar);
    tampilkanBanner(mediaTersimpan.banner);

    // --- Cropper (vanilla JS, tanpa library) ---
    const overlay = document.getElementById('crop-overlay');
    const canvas = document.getElementById('crop-canvas');
    const ctx = canvas.getContext('2d');
    const zoomRange = document.getElementById('crop-zoom-range');
    const judulCrop = document.getElementById('crop-judul');
    const petunjukCrop = document.getElementById('crop-petunjuk');
    const btnBatalCrop = document.getElementById('crop-batal');
    const btnTerapkanCrop = document.getElementById('crop-terapkan');

    // bentuk: 'lingkaran' (foto profil 1:1) atau 'persegi' (banner 4:1, sama dengan kotak 640x160)
    const MODE = {
        avatar: { bentuk: 'lingkaran', rasio: 1, keluar: [400, 400], judul: 'Potong foto profil', kunci: 'avatar' },
        banner: { bentuk: 'persegi', rasio: 4, keluar: [1280, 320], judul: 'Potong banner', kunci: 'banner' }
    };

    const c = {            // state cropper
        mode: null, img: null, fx: 0, fy: 0, fw: 0, fh: 0, // frame seleksi (koordinat stage)
        W: 0, H: 0, dpr: 1, minS: 1, zoom: 1, ox: 0, oy: 0, // ukuran stage, skala dasar, zoom, posisi gambar
        pointers: new Map(), jarakAwal: 0, zoomAwal: 1
    };

    const skala = () => c.minS * c.zoom;

    function batasi() { // gambar harus selalu menutup seluruh frame
        const s = skala();
        const lebar = c.img.naturalWidth * s, tinggi = c.img.naturalHeight * s;
        c.ox = Math.min(c.fx, Math.max(c.fx + c.fw - lebar, c.ox));
        c.oy = Math.min(c.fy, Math.max(c.fy + c.fh - tinggi, c.oy));
    }

    function gambar() {
        const { W, H, fx, fy, fw, fh } = c;
        ctx.setTransform(c.dpr, 0, 0, c.dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        const s = skala();
        ctx.drawImage(c.img, c.ox, c.oy, c.img.naturalWidth * s, c.img.naturalHeight * s);

        // lapisan gelap di luar seleksi (lubang berbentuk lingkaran / persegi panjang)
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, W, H);
        if (c.mode.bentuk === 'lingkaran') ctx.arc(fx + fw / 2, fy + fh / 2, fw / 2, 0, Math.PI * 2, true);
        else ctx.rect(fx, fy, fw, fh);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fill('evenodd');
        ctx.restore();

        // garis tepi seleksi
        ctx.beginPath();
        if (c.mode.bentuk === 'lingkaran') ctx.arc(fx + fw / 2, fy + fh / 2, fw / 2, 0, Math.PI * 2);
        else ctx.rect(fx, fy, fw, fh);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
    }

    function ubahZoom(zoomBaru) {
        zoomBaru = Math.min(4, Math.max(1, zoomBaru));
        // pertahankan titik di tengah frame supaya zoom terasa natural
        const px = c.fx + c.fw / 2, py = c.fy + c.fh / 2;
        const sLama = skala();
        const titikX = (px - c.ox) / sLama, titikY = (py - c.oy) / sLama;
        c.zoom = zoomBaru;
        const sBaru = skala();
        c.ox = px - titikX * sBaru;
        c.oy = py - titikY * sBaru;
        batasi();
        zoomRange.value = String(c.zoom);
        gambar();
    }

    function siapkanStage() {
        const lebarMaks = Math.min(420, window.innerWidth - 68);
        c.W = Math.max(220, lebarMaks);
        if (c.mode.bentuk === 'lingkaran') {
            c.H = c.W;
            c.fw = c.fh = Math.round(c.W * 0.8);
        } else {
            c.fw = c.W - 32;
            c.fh = Math.round(c.fw / c.mode.rasio);
            c.H = Math.round(c.W * 0.55);
        }
        c.fx = Math.round((c.W - c.fw) / 2);
        c.fy = Math.round((c.H - c.fh) / 2);
        c.dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(c.W * c.dpr);
        canvas.height = Math.round(c.H * c.dpr);
        canvas.style.width = c.W + 'px';
        canvas.style.height = c.H + 'px';

        c.minS = Math.max(c.fw / c.img.naturalWidth, c.fh / c.img.naturalHeight); // "cover"
        c.zoom = 1;
        c.ox = c.fx + (c.fw - c.img.naturalWidth * c.minS) / 2; // mulai di tengah
        c.oy = c.fy + (c.fh - c.img.naturalHeight * c.minS) / 2;
        zoomRange.value = '1';
        batasi();
        gambar();
    }

    function bukaCrop(file, kunciMode, inputEl) {
        if (!file) return;
        if (!file.type.startsWith('image/')) { alert('File harus berupa gambar (JPG, PNG, atau WebP).'); inputEl.value = ''; return; }
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            c.mode = MODE[kunciMode];
            c.img = img;
            judulCrop.textContent = c.mode.judul;
            petunjukCrop.textContent = c.mode.bentuk === 'lingkaran'
                ? 'Geser gambar agar wajah berada di dalam lingkaran, lalu atur zoom.'
                : 'Geser gambar agar bagian terbaik berada di dalam bingkai banner, lalu atur zoom.';
            overlay.hidden = false;
            document.body.style.overflow = 'hidden';
            siapkanStage();
            btnTerapkanCrop.focus();
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            alert('Gambar tidak bisa dibuka. Coba file lain.');
        };
        img.src = url;
        inputEl.value = ''; // supaya file yang sama bisa dipilih lagi
    }

    function tutupCrop() {
        overlay.hidden = true;
        document.body.style.overflow = '';
        c.img = null;
        c.pointers.clear();
    }

    function terapkanCrop() {
        if (!c.img) return;
        const [ow, oh] = c.mode.keluar;
        const out = document.createElement('canvas');
        out.width = ow; out.height = oh;
        const octx = out.getContext('2d');
        octx.fillStyle = '#fff';
        octx.fillRect(0, 0, ow, oh);
        const s = skala();
        const sx = (c.fx - c.ox) / s, sy = (c.fy - c.oy) / s; // area gambar asli di dalam frame
        octx.drawImage(c.img, sx, sy, c.fw / s, c.fh / s, 0, 0, ow, oh);
        const hasil = out.toDataURL('image/jpeg', 0.88);

        const media = bacaMedia(user.id);
        media[c.mode.kunci] = hasil;
        if (!tulisMedia(user.id, media)) {
            alert('Gambar gagal disimpan karena penyimpanan browser penuh. Hapus data situs lain atau pakai gambar yang lebih kecil.');
            return;
        }
        if (c.mode.kunci === 'avatar') tampilkanAvatar(hasil); else tampilkanBanner(hasil);
        tutupCrop();
    }

    // interaksi: geser (1 jari / mouse), pinch (2 jari), roda mouse, slider
    canvas.addEventListener('pointerdown', (e) => {
        canvas.setPointerCapture(e.pointerId);
        c.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        canvas.classList.add('menggeser');
        if (c.pointers.size === 2) {
            const [p1, p2] = [...c.pointers.values()];
            c.jarakAwal = Math.hypot(p1.x - p2.x, p1.y - p2.y);
            c.zoomAwal = c.zoom;
        }
    });
    canvas.addEventListener('pointermove', (e) => {
        const p = c.pointers.get(e.pointerId);
        if (!p || !c.img) return;
        if (c.pointers.size === 1) {
            c.ox += e.clientX - p.x;
            c.oy += e.clientY - p.y;
            batasi();
            gambar();
        }
        p.x = e.clientX; p.y = e.clientY;
        if (c.pointers.size === 2 && c.jarakAwal) {
            const [p1, p2] = [...c.pointers.values()];
            ubahZoom(c.zoomAwal * (Math.hypot(p1.x - p2.x, p1.y - p2.y) / c.jarakAwal));
        }
    });
    const lepas = (e) => {
        c.pointers.delete(e.pointerId);
        if (c.pointers.size === 0) canvas.classList.remove('menggeser');
    };
    canvas.addEventListener('pointerup', lepas);
    canvas.addEventListener('pointercancel', lepas);
    canvas.addEventListener('wheel', (e) => {
        if (!c.img) return;
        e.preventDefault();
        ubahZoom(c.zoom * (e.deltaY < 0 ? 1.06 : 1 / 1.06));
    }, { passive: false });
    zoomRange.addEventListener('input', () => { if (c.img) ubahZoom(parseFloat(zoomRange.value)); });

    btnBatalCrop.addEventListener('click', tutupCrop);
    btnTerapkanCrop.addEventListener('click', terapkanCrop);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) tutupCrop(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !overlay.hidden) tutupCrop(); });

    if (inputAvatar) inputAvatar.addEventListener('change', (e) => bukaCrop(e.target.files[0], 'avatar', inputAvatar));
    if (inputBanner) inputBanner.addEventListener('change', (e) => bukaCrop(e.target.files[0], 'banner', inputBanner));

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

        // ===== Ringkasan tautan media sosial di baris "Tautan media sosial" =====
    const ringkasanSosmed = document.querySelector('#nav-to-social .field-value');
    if (ringkasanSosmed) {
        try {
            const daftar = JSON.parse(localStorage.getItem(KUNCI_SOSMED + user.id)) || [];
            const nama = daftar.filter(t => t && t.url).map(t => t.nama);
            if (nama.length) ringkasanSosmed.textContent = nama.join(', ');
        } catch (e) {}
    }
    
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