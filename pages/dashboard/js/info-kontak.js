// ===== Panel profil baca-saja, dipakai chat pribadi dan anggota grup =====
// Bagian tambahan (banner, aksi cepat, statistik, tautan sosial, grup bersama, foto bersama)
// dibuat dari JS supaya dashboard.html tidak perlu diubah.
function elInfo(tag, kelas, teks) {
    const n = document.createElement(tag);
    if (kelas) n.className = kelas;
    if (teks !== undefined) n.textContent = teks;
    return n;
}

function ikonInfo(nama) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'ikon');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#' + nama);
    svg.appendChild(use);
    return svg;
}

function tombolAksiInfo(ikon, label, aksi, bahaya) {
    const b = elInfo('button', 'info-aksi' + (bahaya ? ' bahaya' : ''));
    b.type = 'button';
    b.append(ikonInfo(ikon), elInfo('span', '', label));
    b.addEventListener('click', aksi);
    return b;
}

function bagianInfo(judul, isi, kelas) {
    const s = elInfo('section', 'detail-section info-tambahan' + (kelas ? ' ' + kelas : ''));
    s.appendChild(elInfo('h3', '', judul));
    s.appendChild(isi);
    return s;
}

function tanggalPanjang(ms) {
    return new Date(ms).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ----- Data bantu -----
const KUNCI_BISU = 'ngumpul_bisu_';
function bacaBisu() {
    try { return JSON.parse(localStorage.getItem(KUNCI_BISU + (userAktif ? userAktif.id : ''))) || {}; } catch (e) { return {}; }
}
function chatDibisukan(id) { return !!bacaBisu()[id]; }
function aturBisu(id, nyala) {
    const d = bacaBisu();
    if (nyala) d[id] = true; else delete d[id];
    try { localStorage.setItem(KUNCI_BISU + userAktif.id, JSON.stringify(d)); } catch (e) { /* abaikan */ }
}

function dataPercakapan(id) {
    let pesan = [];
    try { pesan = ambilPesanChat(id); } catch (e) { pesan = []; }
    const foto = pesan.filter(p => p.imageId);
    const tautan = [];
    pesan.forEach(p => {
        (String(p.text || '').match(/https?:\/\/[^\s<>"']+/g) || []).forEach(u => tautan.push({ url: u, waktu: p.time, id: p.id }));
    });
    return { pesan, foto, tautan };
}

function pasangGambar(sel, imageId) {
    const pasang = (url) => {
        if (!url || !/^(blob:|data:image\/)/.test(url)) return;
        const img = document.createElement('img');
        img.src = url; img.alt = 'Foto dari percakapan'; img.loading = 'lazy';
        sel.appendChild(img);
    };
    const cache = typeof cacheUrlGambar !== 'undefined' ? cacheUrlGambar.get(imageId) : '';
    if (cache) pasang(cache);
    else if (typeof ambilGambarIdb === 'function') ambilGambarIdb(imageId).then(pasang).catch(() => {});
}

function barisTautan(daftar) {
    const ul = elInfo('ul', 'info-tautan');
    daftar.forEach(t => {
        const li = document.createElement('li');
        const a = elInfo('a', '', t.url.length > 52 ? t.url.slice(0, 49) + '...' : t.url);
        a.href = t.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
        li.appendChild(a);
        if (t.waktu) li.appendChild(elInfo('small', '', new Date(t.waktu).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })));
        ul.appendChild(li);
    });
    return ul;
}

// Galeri "Media, tautan" seperti WhatsApp: lapisan di dalam panel dengan tab
function bukaGaleriInfo(induk, id, tutup, tabAwal) {
    induk.querySelectorAll('.info-galeri').forEach(n => n.remove());
    if (getComputedStyle(induk).position === 'static') induk.style.position = 'relative';
    const { foto, tautan } = dataPercakapan(id);
    const g = elInfo('div', 'info-galeri');
    const kepala = elInfo('header', 'info-galeri-kepala');
    const kembali = elInfo('button', 'info-galeri-kembali');
    kembali.type = 'button'; kembali.setAttribute('aria-label', 'Kembali');
    kembali.appendChild(ikonInfo('i-back'));
    kembali.addEventListener('click', () => g.remove());
    kepala.append(kembali, elInfo('strong', '', 'Media dan tautan'));
    const tab = elInfo('div', 'info-galeri-tab');
    const isi = elInfo('div', 'info-galeri-isi');
    const tampil = (nama) => {
        tab.querySelectorAll('button').forEach(b => b.classList.toggle('aktif', b.dataset.tab === nama));
        isi.replaceChildren();
        if (nama === 'media') {
            if (!foto.length) { isi.appendChild(elInfo('p', 'info-kosong', 'Belum ada foto yang dibagikan.')); return; }
            const grid = elInfo('div', 'info-foto info-foto-besar');
            foto.slice().reverse().forEach(p => {
                const sel = elInfo('button', 'info-foto-item');
                sel.type = 'button'; sel.setAttribute('aria-label', 'Buka foto');
                pasangGambar(sel, p.imageId);
                sel.addEventListener('click', () => {
                    tutup();
                    bukaChat(id);
                    setTimeout(() => bukaLightboxGambar(p.id), 60);
                });
                grid.appendChild(sel);
            });
            isi.appendChild(grid);
        } else {
            if (!tautan.length) { isi.appendChild(elInfo('p', 'info-kosong', 'Belum ada tautan yang dibagikan.')); return; }
            isi.appendChild(barisTautan(tautan.slice().reverse()));
        }
    };
    [['media', 'Media (' + foto.length + ')'], ['tautan', 'Tautan (' + tautan.length + ')']].forEach(([k, label]) => {
        const b = elInfo('button', '', label);
        b.type = 'button'; b.dataset.tab = k;
        b.addEventListener('click', () => tampil(k));
        tab.appendChild(b);
    });
    g.append(kepala, tab, isi);
    induk.appendChild(g);
    tampil(tabAwal || 'media');
}

function barisKartu(ikon, judul, ket, aksi) {
    const b = elInfo('button', 'info-baris');
    b.type = 'button';
    const teks = elInfo('span', 'info-baris-teks');
    teks.append(elInfo('strong', '', judul));
    if (ket) teks.append(elInfo('small', '', ket));
    b.append(ikonInfo(ikon), teks, ikonInfo('i-next'));
    b.addEventListener('click', aksi);
    return b;
}

// Isi bergaya info grup WhatsApp. Dipakai panel info chat dan dialog profil anggota grup.
function bangunInfoWa(isi, id, opsi) {
    isi.querySelectorAll('.info-tambahan').forEach(n => n.remove());
    const diri = userAktif && userAktif.id === id;
    const profil = getProfil(id);
    const akun = (typeof getUserById === 'function' && getUserById(id)) || {};
    const induk = opsi.induk;
    const { foto, tautan } = dataPercakapan(id);

    // Tentang
    isi.appendChild(bagianInfo('Tentang', elInfo('p', 'info-teks', profil.bio || 'Halo, aku pakai Ngumpul')));

    if (!diri) {
        // Media, tautan, dokumen
        const media = elInfo('div', 'info-media-kartu');
        const kepala = barisKartu('i-media-grup', 'Media dan tautan',
            foto.length + ' foto · ' + tautan.length + ' tautan', () => bukaGaleriInfo(induk, id, opsi.tutup));
        media.appendChild(kepala);
        if (foto.length) {
            const strip = elInfo('div', 'info-foto info-foto-strip');
            foto.slice(-4).reverse().forEach(p => {
                const sel = elInfo('button', 'info-foto-item');
                sel.type = 'button'; sel.setAttribute('aria-label', 'Lihat media');
                pasangGambar(sel, p.imageId);
                sel.addEventListener('click', () => bukaGaleriInfo(induk, id, opsi.tutup));
                strip.appendChild(sel);
            });
            media.appendChild(strip);
        }
        isi.appendChild(bagianInfo('Media, tautan', media, 'info-tanpa-judul'));

        // Pesan disematkan
        const pin = typeof ambilPinPesan === 'function' ? ambilPinPesan(id) : null;
        const jumlahPin = typeof ambilDaftarPin === 'function' ? ambilDaftarPin(id).length : 1;
        const pesanPin = pin && dataPercakapan(id).pesan.find(p => p.id === pin);
        if (pesanPin) {
            const ket = (jumlahPin > 1 ? jumlahPin + ' pesan disematkan · ' : '') + (pesanPin.imageId ? 'Foto' : String(pesanPin.text || '').slice(0, 60));
            isi.appendChild(bagianInfo('Pesan disematkan', barisKartu('i-sematkan', 'Lihat pesan sematan', ket, () => {
                opsi.tutup(); bukaChat(id); setTimeout(() => window.lompatKePesanSemat && lompatKePesanSemat(), 120);
            }), 'info-tanpa-judul'));
        }

        // Pengaturan percakapan
        const set = elInfo('div', 'info-set');
        const bisu = elInfo('label', 'info-toggle');
        const cek = document.createElement('input');
        cek.type = 'checkbox'; cek.checked = chatDibisukan(id);
        cek.addEventListener('change', () => aturBisu(id, cek.checked));
        bisu.append(ikonInfo('i-bell-off'), elInfo('span', '', 'Bisukan notifikasi'), cek);
        set.appendChild(bisu);
        set.appendChild(barisKartu('i-search-garis', 'Cari pesan', 'Cari di percakapan ini', () => {
            opsi.tutup(); bukaChat(id); setTimeout(() => aturPencarianPesanTerbuka(true, true, true), 120);
        }));
        isi.appendChild(bagianInfo('Pengaturan', set));
    }

    // Info kontak
    const info = elInfo('div', 'info-daftar');
    const tambah = (k, v) => { if (v) { const r = elInfo('div', 'info-daftar-baris'); r.append(elInfo('span', '', k), elInfo('strong', '', v)); info.appendChild(r); } };
    tambah('Username', profil.username);
    if (akun.dibuat) tambah('Bergabung', tanggalPanjang(akun.dibuat));
    if (info.children.length) isi.appendChild(bagianInfo('Info kontak', info));

    // Tautan sosial
    let sosial = [];
    try { sosial = JSON.parse(localStorage.getItem(KUNCI_SOSMED + id)) || []; } catch (e) { sosial = []; }
    sosial = sosial.filter(t => t && typeof t.url === 'string' && /^https:\/\//i.test(t.url));
    if (sosial.length) {
        const chip = elInfo('div', 'info-sosial');
        sosial.forEach(t => {
            const a = elInfo('a', 'info-chip', t.nama || t.platform || 'Tautan');
            a.href = t.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
            chip.appendChild(a);
        });
        isi.appendChild(bagianInfo('Media sosial', chip));
    }

    // Grup bersama
    const wadah = elInfo('div', 'info-grup');
    const seksi = bagianInfo('Grup bersama', wadah, 'info-grup-bagian');
    seksi.hidden = true;
    isi.appendChild(seksi);
    const dasar = window.NgumpulGrupDasar;
    if (!diri && dasar && dasar.layanan && dasar.layanan.daftarGrup) {
        dasar.layanan.daftarGrup().then(semua => {
            if (opsi.masihAktif && !opsi.masihAktif()) return;
            const sama = semua.filter(g => !g.keluar && g.anggotaIds.includes(id));
            seksi.querySelector('h3').textContent = 'Grup bersama (' + sama.length + ')';
            sama.forEach(g => {
                const b = elInfo('button', 'info-grup-item');
                b.type = 'button';
                b.append(elInfo('span', 'info-grup-ikon', (g.nama || '?').trim().charAt(0).toUpperCase()),
                    elInfo('span', 'info-grup-nama', g.nama),
                    elInfo('small', '', g.anggotaIds.length + ' anggota'));
                b.addEventListener('click', () => {
                    opsi.tutup();
                    const tab = document.getElementById('tab-grup');
                    if (tab) tab.click();
                    if (window.NgumpulRuang) window.NgumpulRuang.open(g.id);
                });
                wadah.appendChild(b);
            });
            seksi.hidden = !sama.length;
        }).catch(() => {});
    }
}

// Baris aksi cepat: ikon bulat + label
function barisAksiCepat(daftar) {
    const baris = elInfo('div', 'info-aksi-baris');
    daftar.forEach(a => baris.appendChild(tombolAksiInfo(a[0], a[1], a[2], a[3])));
    return baris;
}

function panggil(id, video) { window.NgumpulRuang && window.NgumpulRuang.panggilPribadi(id, video); }

// ----- Dialog profil (anggota grup / pengguna lain) -----
function perkayaInfoKontak(dialog, id, akun, profil, bio) {
    const isi = dialog.querySelector('.detail-panel-content');
    isi.querySelectorAll('.info-tambahan, .info-banner, .info-username, .info-aksi-baris').forEach(n => n.remove());
    const identitas = isi.querySelector('.detail-identity');
    const media = typeof bacaMedia === 'function' ? bacaMedia(id) : {};
    const banner = elInfo('div', 'info-banner');
    if (typeof media.banner === 'string' && media.banner.startsWith('data:image/')) {
        banner.style.backgroundImage = 'url("' + media.banner + '")';
        banner.classList.add('berfoto');
    }
    isi.insertBefore(banner, identitas);
    identitas.appendChild(elInfo('p', 'info-username', profil.username || ''));
    const diri = userAktif && userAktif.id === id;
    const tutup = () => dialog.close();
    if (!diri) {
        const aksi = [
            ['i-chat', 'Chat', () => { tutup(); document.dispatchEvent(new CustomEvent('ngumpul:buka-chat', { detail: { idLawan: id } })); }],
            ['i-phone', 'Suara', () => { tutup(); panggil(id, false); }],
            ['i-video', 'Video', () => { tutup(); panggil(id, true); }]
        ];
        const baris = barisAksiCepat(aksi);
        identitas.after(baris);
    }
    const nomor = document.getElementById('nomor-info-kontak');
    if (nomor && !nomor.nextElementSibling) {
        const salin = elInfo('button', 'info-salin', 'Salin');
        salin.type = 'button';
        salin.addEventListener('click', () => {
            const selesai = () => { salin.textContent = 'Tersalin'; setTimeout(() => (salin.textContent = 'Salin'), 1400); };
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(nomor.textContent).then(selesai, () => {});
            else selesai();
        });
        nomor.after(salin);
    }
    bangunInfoWa(isi, id, { induk: dialog.querySelector('.detail-panel') || dialog, tutup, masihAktif: () => dialog.dataset.akunId === id });
    if (!diri && typeof penggunaDiblokir === 'function' && typeof ubahBlokir === 'function') {
        const blokir = penggunaDiblokir(userAktif.id, id);
        const b = elInfo('button', 'info-blokir info-tambahan', (blokir ? 'Buka blokir ' : 'Blokir ') + profil.nama);
        b.type = 'button';
        b.addEventListener('click', () => { ubahBlokir(id, !penggunaDiblokir(userAktif.id, id)); perkayaInfoKontak(dialog, id, akun, profil, bio); });
        isi.appendChild(b);
    }
}

// ----- Panel info chat pribadi (tombol info di header chat) -----
function perkayaPanelInfoPengguna(id) {
    const panel = document.getElementById('panel-info-pengguna');
    if (!panel || !id) return;
    const isi = panel.querySelector('.contact-info-content');
    isi.querySelectorAll('.info-tambahan, .info-aksi-baris').forEach(n => n.remove());
    const tutup = () => panel.setAttribute('aria-hidden', 'true');
    const profil = getProfil(id);
    const akhir = isi.querySelector('.contact-info-actions');
    akhir.before(barisAksiCepat([
        ['i-phone', 'Suara', () => panggil(id, false)],
        ['i-video', 'Video', () => panggil(id, true)],
        ['i-search-garis', 'Cari', () => { tutup(); aturPencarianPesanTerbuka(true, true, true); }]
    ]));
    // salin nomor
    const nomor = document.getElementById('nomor-info-pengguna');
    if (nomor && !nomor.nextElementSibling?.classList.contains('info-salin')) {
        const salin = elInfo('button', 'info-salin', 'Salin');
        salin.type = 'button';
        salin.addEventListener('click', () => {
            const selesai = () => { salin.textContent = 'Tersalin'; setTimeout(() => (salin.textContent = 'Salin'), 1400); };
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(nomor.textContent).then(selesai, () => {});
            else selesai();
        });
        nomor.after(salin);
    }
    bangunInfoWa(isi, id, { induk: panel, tutup, masihAktif: () => window.chatAktifId === undefined || chatAktifId === id });
    // blokir/simpan kontak asli tetap di bawah
    isi.appendChild(akhir);
}

function tampilkanInfoKontak(id) {
    const akun = getUserById(id);
    if (!akun) return;
    const profil = getProfil(id),
        wadah = document.getElementById('foto-info-kontak');
    tampilkanAvatarChat(wadah, id, profil.nama || akun.nama);
    document.getElementById('nama-info-kontak').textContent = profil.nama || akun.nama;
    document.getElementById('nomor-info-kontak').textContent =
        profil.phone || akun.hp || 'Nomor tidak tersedia';
    const bio = bacaSemuaProfil()[id]?.bio;
    document.getElementById('bio-info-kontak').textContent = bio && bio.trim() ? bio : 'Belum ada deskripsi';
    const dialog = document.getElementById('dialog-info-kontak');
    dialog.dataset.akunId = id;
    perkayaInfoKontak(dialog, id, akun, profil, bio);
    if (!dialog.open) {
        dialog.showModal();
        dialog.querySelector('.detail-panel-content').scrollTop = 0;
    }
}
(function () {
    document.getElementById('btn-telp-chat').addEventListener('click', () => { if (chatAktifId) panggil(chatAktifId, false); });
    document.getElementById('btn-video-chat').addEventListener('click', () => { if (chatAktifId) panggil(chatAktifId, true); });
    document.getElementById('btn-info-kontak-chat').addEventListener('click', () => {
        if (chatAktifId) tampilkanInfoKontak(chatAktifId);
    });
    document.querySelectorAll('[data-tutup-dialog]').forEach((tombol) => {
        tombol.addEventListener('click', () => tombol.closest('dialog').close());
    });
    document.querySelectorAll('dialog.dashboard-detail-panel, dialog.grup-dialog').forEach((dialog) => {
        dialog.addEventListener('click', (event) => {
            if (event.target !== dialog) return;
            const r = dialog.getBoundingClientRect();
            if (
                event.clientX < r.left ||
                event.clientX > r.right ||
                event.clientY < r.top ||
                event.clientY > r.bottom
            )
                dialog.close();
        });
    });
    document
        .getElementById('dialog-info-kontak')
        .addEventListener('close', () => document.dispatchEvent(new CustomEvent('ngumpul:profil-ditutup')));
    document.getElementById('btn-kembali-chat-pribadi').addEventListener('click', () => {
        document.getElementById('panel-sisi-kiri').classList.remove('room-open');
        document.getElementById('panel-sisi-kanan').classList.remove('room-open');
        document.getElementById('tab-chat').focus();
    });
    document.addEventListener('ngumpul:tab-dashboard', (event) => {
        const dialog = document.getElementById('dialog-info-kontak');
        if (dialog.open) dialog.close();
        if (event.detail.tabAktif !== 'chat') {
            document.getElementById('panel-sisi-kiri').classList.remove('room-open');
            document.getElementById('panel-sisi-kanan').classList.remove('room-open');
        }
    });
    window.addEventListener('storage', (event) => {
        const dialog = document.getElementById('dialog-info-kontak');
        if (
            dialog.open &&
            ['ngumpul_users', 'ngumpul_profil', 'ngumpul_media_' + dialog.dataset.akunId].includes(event.key)
        ) {
            if (getUserById(dialog.dataset.akunId)) tampilkanInfoKontak(dialog.dataset.akunId);
            else dialog.close();
        }
    });
})();
