// ===== Tema bergaya: kartu dibuat dari data, supaya dashboard.html tidak perlu diubah =====
const PACK_BARU = [
    {
        id: 'retro', judul: 'Retro Pixel', ket: 'LCD, terminal, dan neon \u00b7 3 tema',
        tema: [
            ['gameboy', 'Gameboy', 'Empat tingkat hijau LCD, bubble piksel'],
            ['terminal', 'Terminal', 'Hijau fosfor, scanline, kursor blok'],
            ['synthwave', 'Synthwave', 'Matahari neon dan grid bergerak']
        ]
    },
    {
        id: 'cosmos', judul: 'Cosmos', ket: 'Gelap berbintang, ada bintang jatuh \u00b7 3 tema',
        tema: [
            ['nebula', 'Nebula', 'Awan ungu, latar mengikuti kursor'],
            ['supernova', 'Supernova', 'Magenta menyala, bubble berpendar'],
            ['stardust', 'Stardust', 'Debu bintang emas yang berkelip']
        ]
    },
    {
        id: 'bunga', judul: 'Bunga', ket: 'Terang, ada hiasan tanaman \u00b7 3 tema',
        tema: [
            ['lavender', 'Lavender Field', 'Hamparan lavender, kelopak jatuh'],
            ['sunflower', 'Sunflower', 'Bunga menghadap matahari sesuai jam'],
            ['lotus', 'Lotus Pond', 'Kolam teratai, riak saat kirim']
        ]
    },
    {
        id: 'elemen', judul: 'Elemen', ket: 'Hujan, laut, dan api \u00b7 3 tema',
        tema: [
            ['rainy', 'Rainy Window', 'Kaca berembun, bisa diusap dengan kursor'],
            ['ocean', 'Deep Ocean', 'Gelembung, ubur-ubur, sinar dari permukaan'],
            ['campfire', 'Campfire', 'Api unggun dan bara beterbangan']
        ]
    }
];

function htmlKartuTema(id, nama, ket, kompak) {
    return '<button type="button" class="theme-option premium' + (kompak ? ' kompak' : '') + '" data-set-theme="' + id + '" aria-pressed="false">' +
        '<span class="theme-preview pv pv-' + id + '"><span></span><span></span><span></span></span>' +
        '<span class="theme-option-info"><b>' + nama + '</b><small>' + ket + '</small></span>' +
        '<span class="theme-lock" aria-hidden="true"><svg class="ikon"><use href="#i-lock" /></svg></span>' +
        '<span class="theme-check">\u2713</span></button>';
}

function bangunTemaBaru() {
    const single = document.querySelector('.tema-pack[data-pack="single"]');
    if (!single || document.querySelector('.tema-pack[data-pack="retro"]')) return;

    PACK_BARU.forEach(p => {
        const d = document.createElement('details');
        d.className = 'tema-pack';
        d.dataset.pack = p.id;
        d.innerHTML =
            '<summary class="tema-pack-kepala"><span class="tema-pack-judul"><b>' + p.judul + '</b><small>' + p.ket + '</small></span>' +
            '<span class="badge-plus">Plus</span>' +
            '<span class="tema-pack-chevron" aria-hidden="true"><svg class="ikon"><use href="#i-chevron-down" /></svg></span></summary>' +
            '<div class="tema-pack-isi"><div class="tema-grid">' +
            p.tema.map(t => htmlKartuTema(t[0], t[1], t[2], true)).join('') + '</div></div>';
        single.parentNode.insertBefore(d, single);
    });

    // Golden Hour masuk ke pack Single, lengkap dengan panel mode
    const daftarSatu = single.querySelector('.tema-daftar-satu');
    if (daftarSatu) {
        daftarSatu.insertAdjacentHTML('beforeend',
            htmlKartuTema('goldenhour', 'Golden Hour', 'Langit berganti lima fase, halus mengikuti jam', false) +
            '<div class="sky-cycle" id="panel-golden" hidden>' +
            '<div class="sky-cycle-kepala"><b>Golden Hour</b><small id="golden-status"></small></div>' +
            '<div class="sky-segmen golden" role="group" aria-label="Mode Golden Hour">' +
            [['auto', 'Ikuti waktu'], ['reverse', 'Terbalik'], ['fajar', 'Fajar'], ['siang', 'Siang'], ['sore', 'Sore'], ['senja', 'Senja'], ['malam', 'Malam']]
                .map(m => '<button type="button" data-golden="' + m[0] + '">' + m[1] + '</button>').join('') +
            '</div><p class="sky-ket">Langit berubah pelan setiap menit. Pilih satu fase untuk mengunci tampilannya.</p></div>');
    }
}

bangunTemaBaru();

// ===== Elemen utama =====
const triggerMenuUtama = document.getElementById('trigger-menu-utama');
const boxDropdownUtama = document.getElementById('box-dropdown-utama');
const optBukaSetelan = document.getElementById('opt-buka-setelan');

const panelLayerSetelan = document.getElementById('panel-layer-setelan');
const btnKembaliKeChat = document.getElementById('btn-kembali-ke-chat');

const daftarPengaturan = document.querySelector('.settings-list-flow');
const panelPengaturanTema = document.getElementById('panel-setelan-tema');
const panelPengaturanNotifikasi = document.getElementById('panel-setelan-notifikasi');
const judulPanelSetelan = document.getElementById('judul-panel-setelan');

const tombolPilihanTema = document.querySelectorAll('[data-set-theme]');
const menuTema = document.querySelector(
    '.settings-row-item[data-fitur="tema"]'
);

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

    // Untuk layar mobile: panel ada di dalam .sisi-kanan yang disembunyikan CSS
    document.getElementById('panel-sisi-kiri')
        ?.classList.add('room-open');

    document.getElementById('panel-sisi-kanan')
        ?.classList.add('room-open');

    perbaruiEfekKartuProfil();
}

// Pintasan seperti WhatsApp: saat panel pengaturan terbuka, memilih chat/grup/kontak langsung membuka percakapan
document.addEventListener('click', event => {
    if (!panelLayerSetelan || getComputedStyle(panelLayerSetelan).display === 'none') return;
    if (event.target.closest('.chat-card, .ruang-channel-row, .contact-chat-button')) tutupSetelan();
}, true);
document.addEventListener('ngumpul:buka-chat', () => {
    if (panelLayerSetelan && getComputedStyle(panelLayerSetelan).display !== 'none') tutupSetelan();
});

function tutupSetelan() {
    if (panelLayerSetelan) {
        panelLayerSetelan.style.display = 'none';
    }

    document.getElementById('panel-sisi-kiri')
        ?.classList.remove('room-open');

    document.getElementById('panel-sisi-kanan')
        ?.classList.remove('room-open');

    // Bersihkan hash supaya refresh tidak membuka panel lagi
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

// ===== Tombol kembali: navigasi subpanel tema =====
if (btnKembaliKeChat) {
    btnKembaliKeChat.addEventListener('click', () => {
        if (panelPengaturanNotifikasi && !panelPengaturanNotifikasi.hidden) {
            panelPengaturanNotifikasi.hidden = true;
            daftarPengaturan.style.display = 'block';
            judulPanelSetelan.textContent = 'Pengaturan';
            const menuNotifikasi = document.getElementById('btn-setelan-notifikasi');
            menuNotifikasi.setAttribute('aria-expanded', 'false');
            menuNotifikasi.focus();
            return;
        }
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

// ===== Buka otomatis jika URL menggunakan #settings =====
if (location.hash === '#settings') {
    bukaSetelan();
}

// ===== Keluar akun: pertahankan tema, hapus sesi =====
const btnKeluarAkun = document.getElementById('btn-keluar-akun');

if (btnKeluarAkun) {
    btnKeluarAkun.addEventListener('click', () => {
        try {
            // Pertahankan preferensi tema ketika keluar
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

    bukaPackAktif();
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

// ===== Toast kecil untuk tema =====
let timerToastTema;

function tampilToastTema(teks) {
    let el = document.getElementById('tema-toast');

    if (!el) {
        el = document.createElement('div');
        el.id = 'tema-toast';
        el.className = 'tema-toast';
        el.setAttribute('role', 'status');
        document.body.appendChild(el);
    }

    el.textContent = teks;
    el.classList.add('tampil');

    clearTimeout(timerToastTema);
    timerToastTema = setTimeout(() => el.classList.remove('tampil'), 2500);
}

// ===== Tanda kunci di kartu tema premium =====
function perbaruiKunciTema() {
    if (!window.NgumpulTheme || !NgumpulTheme.daftar) return;

    const premium = NgumpulTheme.isPremium();

    tombolPilihanTema.forEach(button => {
        const def = NgumpulTheme.daftar[button.dataset.setTheme];
        button.classList.toggle('terkunci', !!(def && def.premium && !premium));
    });

}

// ===== Panel Sky Cycle (hanya tampil untuk tema Celeste) =====
const panelSky = document.getElementById('panel-sky-cycle');

function perbaruiPanelSky() {
    if (!panelSky || !window.NgumpulTheme || !NgumpulTheme.daftar) return;

    const def = NgumpulTheme.daftar[NgumpulTheme.getTheme()];
    panelSky.hidden = !(def && def.sky);

    const mode = NgumpulTheme.getSkyMode();
    panelSky.querySelectorAll('[data-sky-mode]').forEach(b => {
        const aktif = b.dataset.skyMode === mode;
        b.classList.toggle('aktif', aktif);
        b.setAttribute('aria-pressed', String(aktif));
    });

    const malam = NgumpulTheme.getPhase() === 'night';
    const status = document.getElementById('sky-status');

    if (status) status.textContent = 'Sekarang tampil ' + (malam ? 'malam' : 'siang');
}

if (panelSky) {
    panelSky.querySelectorAll('[data-sky-mode]').forEach(b => {
        b.addEventListener('click', () => {
            if (window.NgumpulTheme) NgumpulTheme.setSkyMode(b.dataset.skyMode);
        });
    });
}

// ===== Panel Aurora: gerak latar (hanya tampil untuk tema Aurora) =====
const panelAurora = document.getElementById('panel-aurora-gerak');

function perbaruiPanelAurora() {
    if (!panelAurora || !window.NgumpulTheme || !NgumpulTheme.daftar) return;

    const def = NgumpulTheme.daftar[NgumpulTheme.getTheme()];
    panelAurora.hidden = !(def && def.aurora);

    const mode = NgumpulTheme.getGerak();
    panelAurora.querySelectorAll('[data-aurora-mode]').forEach(b => {
        const aktif = b.dataset.auroraMode === mode;
        b.classList.toggle('aktif', aktif);
        b.setAttribute('aria-pressed', String(aktif));
    });

    const status = document.getElementById('aurora-status');
    if (status) {
        status.textContent = { jalan: 'Bergerak', pelan: 'Pelan', diam: 'Diam' }[mode] || 'Bergerak';
    }
}

if (panelAurora) {
    panelAurora.querySelectorAll('[data-aurora-mode]').forEach(b => {
        b.addEventListener('click', () => {
            if (window.NgumpulTheme) NgumpulTheme.setGerak(b.dataset.auroraMode);
        });
    });
}

// ===== Panel Golden Hour (hanya tampil untuk tema Golden Hour) =====
const panelGolden = document.getElementById('panel-golden');

function perbaruiPanelGolden() {
    if (!panelGolden || !window.NgumpulTheme) return;

    const aktif = NgumpulTheme.getTheme() === 'goldenhour';
    panelGolden.hidden = !aktif;

    const mode = NgumpulTheme.getGhMode();
    panelGolden.querySelectorAll('[data-golden]').forEach(b => {
        const on = b.dataset.golden === mode;
        b.classList.toggle('aktif', on);
        b.setAttribute('aria-pressed', String(on));
    });

    const status = document.getElementById('golden-status');
    const fase = document.documentElement.getAttribute('data-phase');
    if (status && fase) status.textContent = 'Sekarang ' + fase;
}

if (panelGolden) {
    panelGolden.querySelectorAll('[data-golden]').forEach(b => {
        b.addEventListener('click', () => NgumpulTheme.setGhMode(b.dataset.golden));
    });
}

// ===== Pengaturan tema umum (hiasan, objek, efek, kecepatan, kerapatan, hujan) =====
const BARIS_PREF = [
    { k: 'hiasan', judul: 'Tingkat hiasan', pil: [['penuh', 'Penuh'], ['ringan', 'Ringan'], ['polos', 'Polos']],
      ket: 'Penuh: hiasan, gerak, dan efek. Ringan: hiasan diam, hemat baterai. Polos: hanya warna.' },
    { k: 'objek', judul: 'Objek hiasan', pil: [['tampil', 'Tampil'], ['sembunyi', 'Sembunyi']],
      ket: 'Sembunyikan matahari, bunga matahari, serbuk sari, plankton, dan objek lain. Warna dan latar tetap.' },
    { k: 'efek', judul: 'Efek kirim', pil: [['nyala', 'Nyala'], ['mati', 'Mati']] },
    { k: 'kecepatan', judul: 'Kecepatan gerak', pil: [['pelan', 'Pelan'], ['normal', 'Normal'], ['cepat', 'Cepat']] },
    { k: 'rapat', judul: 'Kerapatan hiasan', pil: [['sedikit', 'Sedikit'], ['normal', 'Normal'], ['banyak', 'Banyak']] },
    { k: 'hujan', judul: 'Hujan', pil: [['mati', 'Mati'], ['gerimis', 'Gerimis'], ['deras', 'Deras']], hanya: 'rainy' }
];

function buatPanelHiasan() {
    const bar = document.getElementById('bar-genre-tema');
    if (!bar || !window.NgumpulTheme || document.getElementById('panel-hiasan')) return;

    const p = document.createElement('div');
    p.id = 'panel-hiasan';
    p.className = 'sky-cycle hiasan';
    p.innerHTML = '<div class="sky-cycle-kepala"><b>Pengaturan tema</b><small>Disimpan per akun</small></div>' +
        BARIS_PREF.map(r =>
            '<div class="pref-baris" data-pref-baris="' + r.k + '"' + (r.hanya ? ' data-hanya="' + r.hanya + '"' : '') + '>' +
            '<span class="pref-judul">' + r.judul + '</span>' +
            '<div class="sky-segmen" role="group" aria-label="' + r.judul + '">' +
            r.pil.map(o => '<button type="button" data-pref="' + r.k + '" data-nilai="' + o[0] + '">' + o[1] + '</button>').join('') +
            '</div>' + (r.ket ? '<p class="sky-ket">' + r.ket + '</p>' : '') + '</div>'
        ).join('');
    bar.after(p);

    p.querySelectorAll('[data-pref]').forEach(b => {
        b.addEventListener('click', () => NgumpulTheme.setPref(b.dataset.pref, b.dataset.nilai));
    });
}

function perbaruiPanelHiasan() {
    const p = document.getElementById('panel-hiasan');
    if (!p || !window.NgumpulTheme) return;
    const tema = NgumpulTheme.getTheme();
    p.querySelectorAll('[data-pref]').forEach(b => {
        const on = NgumpulTheme.getPref(b.dataset.pref) === b.dataset.nilai;
        b.classList.toggle('aktif', on);
        b.setAttribute('aria-pressed', String(on));
    });
    p.querySelectorAll('[data-hanya]').forEach(r => { r.hidden = r.dataset.hanya !== tema; });
}

// ===== Pack tema: satu pack terbuka sekaligus =====
const packTema = document.querySelectorAll('.tema-pack');

let filterGenre = 'semua';

packTema.forEach(pack => {
    pack.addEventListener('toggle', () => {
        // saat filter genre aktif, semua pack yang cocok dibiarkan terbuka
        if (!pack.open || filterGenre !== 'semua') return;
        packTema.forEach(lain => {
            if (lain !== pack) lain.open = false;
        });
    });
});

// Buka pack yang berisi tema aktif (tema dasar tidak punya pack: semua tertutup)
function bukaPackAktif() {
    if (!window.NgumpulTheme) return;

    const id = NgumpulTheme.getTheme();
    const tombol = document.querySelector('.tema-pack [data-set-theme="' + id + '"]');
    const pack = tombol ? tombol.closest('.tema-pack') : null;

    packTema.forEach(p => { p.open = (p === pack); });
}

// ===== Label genre di kartu tema + filter =====
// Label diambil dari NgumpulTheme.daftar[id].genre (theme.js), jadi HTML tidak perlu diubah.
function pasangLabelGenre() {
    if (!window.NgumpulTheme || !NgumpulTheme.genre) return;

    tombolPilihanTema.forEach(button => {
        const def = NgumpulTheme.daftar[button.dataset.setTheme];
        const info = button.querySelector('.theme-option-info');
        if (!def || !def.genre || !info || info.querySelector('.genre-label')) return;

        const baris = document.createElement('span');
        baris.className = 'genre-label';
        def.genre.forEach(g => {
            const chip = document.createElement('i');
            chip.textContent = NgumpulTheme.genre[g] || g;
            baris.appendChild(chip);
        });
        info.appendChild(baris);
    });
}

function terapkanFilterGenre() {
    const adaMode = filterGenre !== 'semua';

    tombolPilihanTema.forEach(button => {
        const def = NgumpulTheme.daftar[button.dataset.setTheme];
        const cocok = !adaMode || (def && def.genre && def.genre.indexOf(filterGenre) !== -1);
        button.hidden = !cocok;
    });

    document.querySelectorAll('.tema-dasar, .tema-pack').forEach(wadah => {
        const adaIsi = wadah.querySelector('[data-set-theme]:not([hidden])');
        wadah.hidden = !adaIsi;
        if (adaMode && adaIsi && wadah.tagName === 'DETAILS') wadah.open = true;
    });

    if (!adaMode) bukaPackAktif();

    document.querySelectorAll('#bar-genre-tema [data-genre]').forEach(c => {
        const aktif = c.dataset.genre === filterGenre;
        c.classList.toggle('aktif', aktif);
        c.setAttribute('aria-pressed', String(aktif));
    });
}

function buatBarGenre() {
    const wadah = document.querySelector('#panel-setelan-tema .theme-options');
    if (!wadah || !window.NgumpulTheme || document.getElementById('bar-genre-tema')) return;

    const bar = document.createElement('div');
    bar.id = 'bar-genre-tema';
    bar.className = 'genre-bar';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Filter genre tema');

    const dipakai = new Set();
    Object.keys(NgumpulTheme.daftar).forEach(id => {
        (NgumpulTheme.daftar[id].genre || []).forEach(g => dipakai.add(g));
    });

    const urut = ['semua'].concat(Object.keys(NgumpulTheme.genre).filter(g => dipakai.has(g)));
    urut.forEach(g => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'genre-chip';
        b.dataset.genre = g;
        b.textContent = g === 'semua' ? 'Semua' : NgumpulTheme.genre[g];
        b.addEventListener('click', () => {
            filterGenre = g;
            terapkanFilterGenre();
        });
        bar.appendChild(b);
    });

    wadah.parentNode.insertBefore(bar, wadah);
    terapkanFilterGenre();
}

pasangLabelGenre();
buatBarGenre();
buatPanelHiasan();
perbaruiPanelHiasan();

// ===== Memilih tema =====
tombolPilihanTema.forEach(button => {
    button.addEventListener('click', () => {
        if (!window.NgumpulTheme) return;

        const berhasil = NgumpulTheme.setTheme(button.dataset.setTheme);

        if (!berhasil) {
            tampilToastTema('Tema ini khusus Ngumpul Plus');
        }

        perbaruiPilihanTema();
    });
});

// ===== Ngumpul Plus (Premium) =====
// Tidak lagi memakai kode rahasia. Aktivasi lewat Pengaturan > Premium (premium.js).
const KUNCI_PREMIUM = 'ngumpul_premium_';

function bukaNgumpulPlus() {
    try {
        localStorage.setItem(KUNCI_PREMIUM + userAktif.id, '1');
    } catch (e) {
        return;
    }

    perbaruiPilihanTema();
    perbaruiKunciTema();
    perbaruiPanelSky();
    perbaruiPanelAurora();
    perbaruiPanelGolden();
    perbaruiPanelHiasan();
    tampilPopupPlus();
}

function tampilPopupPlus() {
    if (document.getElementById('plus-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'plus-overlay';
    overlay.className = 'plus-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'plus-judul');

    const dialog = document.createElement('div');
    dialog.className = 'plus-dialog';

    // Riak garis emas. Isinya konstanta, bukan input pengguna.
    const riak = document.createElement('div');
    riak.className = 'plus-riak';
    riak.setAttribute('aria-hidden', 'true');
    riak.innerHTML =
        '<span></span><span></span><span></span>' +
        '<i class="plus-pusat"><svg viewBox="0 0 24 24">' +
        '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>' +
        '</svg></i>';

    const judul = document.createElement('h3');
    judul.id = 'plus-judul';
    judul.className = 'plus-judul';
    judul.textContent = 'Ngumpul Plus terbuka';

    const teks = document.createElement('p');
    teks.className = 'plus-teks';
    teks.textContent = 'Semua tema Plus sekarang bisa kamu pakai, termasuk Celeste dengan Sky Cycle.';

    const aksi = document.createElement('div');
    aksi.className = 'plus-aksi';

    const btnLihat = document.createElement('button');
    btnLihat.type = 'button';
    btnLihat.className = 'plus-btn';
    btnLihat.textContent = 'Lihat tema';

    const btnTutup = document.createElement('button');
    btnTutup.type = 'button';
    btnTutup.className = 'plus-btn plus-btn-garis';
    btnTutup.textContent = 'Nanti saja';

    aksi.append(btnLihat, btnTutup);
    dialog.append(riak, judul, teks, aksi);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    function tutup() {
        overlay.classList.remove('tampil');
        document.removeEventListener('keydown', saatTekan);
        setTimeout(() => overlay.remove(), 300);
    }

    function saatTekan(e) {
        if (e.key === 'Escape') tutup();
    }

    btnTutup.addEventListener('click', tutup);
    btnLihat.addEventListener('click', () => {
        tutup();
        bukaSetelan();
        bukaPengaturanTema();
    });
    overlay.addEventListener('click', e => {
        if (e.target === overlay) tutup();
    });
    document.addEventListener('keydown', saatTekan);

    // Dua frame supaya transisi muncul terpicu
    requestAnimationFrame(() => requestAnimationFrame(() => {
        overlay.classList.add('tampil');
        btnLihat.focus();
    }));
}

// Setiap tema berubah (termasuk ganti fase otomatis), segarkan UI
document.addEventListener('ngumpul:tema-berubah', () => {
    perbaruiPilihanTema();
    perbaruiKunciTema();
    perbaruiPanelSky();
    perbaruiPanelAurora();
    perbaruiPanelGolden();
    perbaruiPanelHiasan();
});

// Inisialisasi pilihan tema
bukaPackAktif();
perbaruiPilihanTema();
perbaruiKunciTema();
perbaruiPanelSky();
    perbaruiPanelAurora();
    perbaruiPanelGolden();
    perbaruiPanelHiasan();

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
    // Jangan anggap klik menu ganti akun sebagai klik kartu profil
    if (e.target.closest('#btn-ganti-akun, #menu-ganti-akun')) {
        return;
    }

    const targetEdit = e.target.closest(
        '[data-fitur="edit-profil"], #btn-buka-edit-profil, .profile-card-trigger'
    );

    if (targetEdit) {
        window.location.href = '../profile/edit-profile.html';
    }
});


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

// ===== Kartu profil bisa dibuka dengan keyboard (Enter / Spasi) =====
const kartuProfil = document.getElementById('btn-buka-edit-profil');

if (kartuProfil) {
    kartuProfil.addEventListener('keydown', e => {
        // Abaikan tombol di dalam kartu (panah v)
        if (e.target !== kartuProfil) return;

        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            window.location.href = '../profile/edit-profile.html';
        }
    });
}

// ===== Buang draft Edit Profil yang belum disimpan =====
try {
    sessionStorage.removeItem('draft_profil_edit');
} catch (e) {}

// ===== Panah (v) di kartu profil: menu ganti akun =====
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
        // Jangan ikut membuka halaman Edit Profil
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

    // Beralih akun: akhiri sesi tab ini lalu masuk dengan akun lain
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
// Kartu ada di paling atas daftar pengaturan: saat digulir ke bawah ia
// memudar & hilang, saat digulir ke atas muncul lagi.
function perbaruiEfekKartuProfil() {
    const profilAtas = document.getElementById('profil-atas');
    const daftar = document.querySelector('.settings-list-flow');

    if (!profilAtas || !daftar) return;

    const tinggi = profilAtas.offsetHeight || 1;

    // 0 = terlihat, 1 = hilang
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
