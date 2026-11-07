// Tautan media sosial: validasi format URL per platform, simpan di localStorage per akun.
// Catatan: validasi memeriksa FORMAT & pola alamat akun (mis. instagram.com/namaakun).
// Keberadaan akun di platform tidak bisa dicek dari browser tanpa backend.
const KUNCI_SOSMED = 'ngumpul_sosmed_'; // + id user -> [{ id, nama, platform, url }]

// ---------- aturan per platform ----------
const reservasi = (...kata) => (h) => !kata.includes(h.toLowerCase());
const PLATFORM = {
    instagram: {
        host: ['instagram.com'], contoh: 'instagram.com/namaakun',
        path: /^\/([A-Za-z0-9._]{1,30})\/?$/, ok: reservasi('p', 'reel', 'reels', 'explore', 'stories', 'accounts', 'tv'),
        bentuk: (h) => 'https://www.instagram.com/' + h
    },
    facebook: {
        host: ['facebook.com', 'fb.com'], contoh: 'facebook.com/namaakun',
        path: /^\/([A-Za-z0-9.]{5,50})\/?$/, ok: reservasi('watch', 'groups', 'pages', 'marketplace', 'sharer.php', 'profile.php', 'events', 'gaming'),
        bentuk: (h) => 'https://www.facebook.com/' + h
    },
    linkedin: {
        host: ['linkedin.com'], contoh: 'linkedin.com/in/namaakun',
        path: /^\/(?:in|company)\/([A-Za-z0-9\-_%.]{3,100})\/?$/,
        bentuk: (h) => 'https://www.linkedin.com/in/' + h,
        kanon: (u, m) => 'https://www.linkedin.com' + u.pathname.replace(/\/$/, '')
    },
    tiktok: {
        host: ['tiktok.com'], contoh: 'tiktok.com/@namaakun',
        path: /^\/@([A-Za-z0-9._]{2,24})\/?$/,
        bentuk: (h) => 'https://www.tiktok.com/@' + h
    },
    x: {
        host: ['x.com', 'twitter.com'], contoh: 'x.com/namaakun',
        path: /^\/([A-Za-z0-9_]{1,15})\/?$/, ok: reservasi('home', 'explore', 'search', 'i', 'settings', 'intent', 'share'),
        bentuk: (h) => 'https://x.com/' + h
    },
    youtube: {
        host: ['youtube.com'], contoh: 'youtube.com/@namakanal',
        path: /^\/(?:@[A-Za-z0-9._\-]{3,}|(?:channel|c|user)\/[A-Za-z0-9._\-]+)\/?$/,
        bentuk: (h) => 'https://www.youtube.com/@' + h,
        kanon: (u) => 'https://www.youtube.com' + u.pathname.replace(/\/$/, '')
    },
    github: {
        host: ['github.com'], contoh: 'github.com/namaakun',
        path: /^\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/?$/,
        bentuk: (h) => 'https://github.com/' + h
    },
    threads: {
        host: ['threads.net', 'threads.com'], contoh: 'threads.net/@namaakun',
        path: /^\/@([A-Za-z0-9._]{1,30})\/?$/,
        bentuk: (h) => 'https://www.threads.net/@' + h
    }
};
// nama yang diketik user -> kunci platform (untuk tautan tambahan)
const ALIAS = { instagram: 'instagram', ig: 'instagram', facebook: 'facebook', fb: 'facebook', linkedin: 'linkedin', tiktok: 'tiktok', twitter: 'x', x: 'x', youtube: 'youtube', github: 'github', threads: 'threads' };

const PLACEHOLDER = ['username', 'namaakun', 'nama_akun', 'namakamu', 'yourname'];

function cocokHost(hostname, daftar) {
    const h = hostname.toLowerCase().replace(/^(www|m|mobile|web)\./, '');
    return daftar.some(d => h === d || h.endsWith('.' + d));
}

// Hasil: { ok, url, pesan }. Kolom kosong dianggap valid (url = '').
function periksaTautan(platform, nilai) {
    nilai = (nilai || '').trim();
    if (!nilai) return { ok: true, url: '' };
    if (/\s/.test(nilai)) return { ok: false, pesan: 'Tautan tidak boleh mengandung spasi.' };

    const aturan = PLATFORM[platform];
    let kandidat = nilai;

    // singkatan @namaakun / namaakun -> bentuk tautan resmi platform
    if (aturan && /^@?[A-Za-z0-9._\-]+$/.test(nilai) && (nilai.startsWith('@') || !nilai.includes('.'))) {
        kandidat = aturan.bentuk(nilai.replace(/^@/, ''));
    } else if (/^[a-z][a-z0-9+.\-]*:/i.test(nilai) && !/^https?:\/\//i.test(nilai)) {
        return { ok: false, pesan: 'Gunakan tautan http:// atau https://.' };
    } else if (!/^https?:\/\//i.test(nilai)) {
        kandidat = 'https://' + nilai;
    }

    let u;
    try { u = new URL(kandidat); } catch (e) { return { ok: false, pesan: 'Format tautan tidak valid.' }; }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return { ok: false, pesan: 'Gunakan tautan http:// atau https://.' };
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(u.hostname)) return { ok: false, pesan: 'Alamat situs tidak valid.' };

    // platform tak dikenal: cukup URL https yang benar
    if (!aturan) {
        u.protocol = 'https:';
        return { ok: true, url: u.href };
    }

    if (!cocokHost(u.hostname, aturan.host)) return { ok: false, pesan: 'Tautan harus dari ' + aturan.host[0] + '. Contoh: ' + aturan.contoh };

    // Facebook profil lama: profile.php?id=angka
    if (platform === 'facebook' && /^\/profile\.php\/?$/.test(u.pathname)) {
        const id = u.searchParams.get('id');
        if (id && /^\d{5,}$/.test(id)) return { ok: true, url: 'https://www.facebook.com/profile.php?id=' + id };
        return { ok: false, pesan: 'Tautan profil Facebook harus memuat id angka.' };
    }

    const m = u.pathname.match(aturan.path);
    if (!m) return { ok: false, pesan: 'Tautan harus mengarah ke akun. Contoh: ' + aturan.contoh };
    const handle = m[1] || '';
    if (aturan.ok && !aturan.ok(handle)) return { ok: false, pesan: 'Tautan ini bukan alamat akun. Contoh: ' + aturan.contoh };
    if (PLACEHOLDER.includes(handle.toLowerCase())) return { ok: false, pesan: 'Ganti "' + handle + '" dengan nama akun kamu yang sebenarnya.' };

    return { ok: true, url: aturan.kanon ? aturan.kanon(u, m) : aturan.bentuk(handle) };
}

document.addEventListener('DOMContentLoaded', () => {
    const user = getUserAktif();
    if (!user) { location.replace('../auth/login.html'); return; }

    const container = document.getElementById('social-links-container');
    const btnAdd = document.getElementById('btn-add-social');
    const btnSave = document.getElementById('btn-save-social');
    const btnBack = document.getElementById('btn-back-profile');

    // Tombol kembali ke Halaman Profil (sama seperti sebelumnya)
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            window.location.href = 'edit-profile.html';
        });
    }

    function platformBaris(row) {
        return row.dataset.platform || ALIAS[(row.dataset.nama || '').trim().toLowerCase()] || '';
    }

    // ---------- tampilan status & tombol "Buka tautan" ----------
    function perbaruiBaris(row, { normalisasi = false } = {}) {
        const input = row.querySelector('.social-input-field');
        const status = row.querySelector('.social-status');
        const buka = row.querySelector('.social-open');
        const hasil = periksaTautan(platformBaris(row), input.value);

        input.classList.toggle('tidak-valid', !hasil.ok);
        input.setAttribute('aria-invalid', String(!hasil.ok));
        status.classList.toggle('salah', !hasil.ok);
        status.classList.toggle('benar', hasil.ok && !!hasil.url);

        if (!hasil.ok) {
            status.textContent = hasil.pesan;
            buka.hidden = true;
        } else if (hasil.url) {
            status.textContent = 'Tautan valid';
            buka.href = hasil.url; // tautan aktif ke akun
            buka.hidden = false;
            if (normalisasi) input.value = hasil.url;
        } else {
            status.textContent = '';
            buka.hidden = true;
            buka.removeAttribute('href');
        }
        return hasil;
    }

    // ---------- membuat baris tautan tambahan (tanpa innerHTML -> aman dari injeksi) ----------
    function buatBarisTambahan(id, nama, url) {
        const row = document.createElement('div');
        row.className = 'info-row-item social-item';
        row.dataset.id = id;
        row.dataset.nama = nama;
        const kunci = ALIAS[nama.trim().toLowerCase()];
        if (kunci) row.dataset.platform = kunci;
        row.dataset.tambahan = '1';

        const ikon = document.createElement('span');
        ikon.className = 'account-item-icon';
        ikon.innerHTML = '<svg class="ikon"><use href="#i-globe"/></svg>'; // konstanta, bukan input user

        const teks = document.createElement('div');
        teks.className = 'info-row-text';

        const judul = document.createElement('span');
        judul.className = 'field-title';
        judul.textContent = nama;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'social-input-field';
        input.inputMode = 'url';
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.placeholder = kunci ? PLATFORM[kunci].contoh : 'https://alamat-akun-kamu.com';
        input.setAttribute('aria-label', 'Tautan ' + nama);
        input.value = url || '';

        const status = document.createElement('span');
        status.className = 'social-status';
        status.setAttribute('aria-live', 'polite');

        const aksi = document.createElement('div');
        aksi.className = 'social-aksi';
        const buka = document.createElement('a');
        buka.className = 'social-open';
        buka.target = '_blank';
        buka.rel = 'noopener noreferrer';
        buka.textContent = 'Buka tautan';
        buka.hidden = true;
        const hapus = document.createElement('button');
        hapus.type = 'button';
        hapus.className = 'social-hapus';
        hapus.textContent = 'Hapus';
        hapus.addEventListener('click', () => { row.remove(); });
        aksi.append(buka, hapus);

        teks.append(judul, input, status, aksi);
        row.append(ikon, teks);
        container.appendChild(row);
        return row;
    }

    // ---------- muat data tersimpan ----------
    let tersimpan = [];
    try { tersimpan = JSON.parse(localStorage.getItem(KUNCI_SOSMED + user.id)) || []; } catch (e) {}

    tersimpan.forEach(t => {
        if (!t || typeof t.url !== 'string') return;
        let row = container.querySelector('.social-item[data-id="' + CSS.escape(String(t.id)) + '"]');
        if (!row) row = buatBarisTambahan(String(t.id), String(t.nama || 'Tautan'), t.url);
        else row.querySelector('.social-input-field').value = t.url;
        perbaruiBaris(row);
    });

    // ---------- validasi langsung saat mengetik; rapikan ke URL resmi saat selesai ----------
    container.addEventListener('input', (e) => {
        if (!e.target.classList.contains('social-input-field')) return;
        perbaruiBaris(e.target.closest('.social-item'));
    });
    container.addEventListener('change', (e) => {
        if (!e.target.classList.contains('social-input-field')) return;
        perbaruiBaris(e.target.closest('.social-item'), { normalisasi: true });
    });

    // ---------- tambah tautan baru ----------
    if (btnAdd) {
        btnAdd.addEventListener('click', () => {
            const nama = (prompt('Masukkan nama platform sosial media (contoh: Twitter / YouTube):') || '').trim();
            if (!nama) return;
            if (nama.length > 30) { alert('Nama platform maksimal 30 karakter.'); return; }
            const sudahAda = [...container.querySelectorAll('.social-item')]
                .some(r => (r.dataset.nama || '').toLowerCase() === nama.toLowerCase());
            if (sudahAda) { alert('Platform "' + nama + '" sudah ada di daftar.'); return; }
            const id = 'tambahan-' + Date.now().toString(36);
            const row = buatBarisTambahan(id, nama, '');
            row.querySelector('.social-input-field').focus();
            row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
    }

    // ---------- toast ----------
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

    // ---------- simpan ----------
    if (btnSave) {
        btnSave.addEventListener('click', () => {
            const hasilSimpan = [];
            let pertamaSalah = null;

            container.querySelectorAll('.social-item').forEach(row => {
                const hasil = perbaruiBaris(row, { normalisasi: true });
                if (!hasil.ok) { if (!pertamaSalah) pertamaSalah = row; return; }
                if (hasil.url) {
                    hasilSimpan.push({
                        id: row.dataset.id,
                        nama: row.dataset.nama,
                        platform: platformBaris(row),
                        url: hasil.url
                    });
                } else if (row.dataset.tambahan) {
                    row.remove(); // baris tambahan yang dibiarkan kosong dibuang
                }
            });

            if (pertamaSalah) { // ada yang salah -> jangan simpan apa pun
                pertamaSalah.querySelector('.social-input-field').focus();
                pertamaSalah.scrollIntoView({ block: 'center', behavior: 'smooth' });
                return;
            }
            try {
                localStorage.setItem(KUNCI_SOSMED + user.id, JSON.stringify(hasilSimpan));
            } catch (e) {
                alert('Tautan gagal disimpan karena penyimpanan browser penuh atau diblokir.');
                return;
            }
            tampilkanToast();
        });
    }
});