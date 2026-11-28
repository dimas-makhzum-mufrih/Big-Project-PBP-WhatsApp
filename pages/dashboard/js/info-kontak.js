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
function chatDibisukan(id) {
    return Date.parse(NgumpulDM.getPreference(id).mutedUntil) > Date.now();
}
async function aturBisu(id, input) {
    input.disabled = true;
    try {
        await NgumpulDM.preference(id, input.checked ? { muteForSeconds: 86400 } : { mutedUntil: null });
    } catch (error) {
        input.checked = chatDibisukan(id);
        tampilToastTema(NgumpulDM.label(error));
    } finally { input.disabled = false; }
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

function pasangGambar(sel, url) {
    if (!url) return;
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Foto dari percakapan';
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    sel.appendChild(img);
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
                pasangGambar(sel, p.image);
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

const permintaanProfilPengguna = new Map();

function muatProfilPengguna(id) {
    if (!permintaanProfilPengguna.has(id)) {
        const request = NgumpulAuth.api('users/' + encodeURIComponent(id) + '/profile')
            .then(({ profile }) => profile)
            .finally(() => permintaanProfilPengguna.delete(id));
        permintaanProfilPengguna.set(id, request);
    }
    return permintaanProfilPengguna.get(id);
}

function identitasPengguna(id, remote) {
    const sender = getProfilChat(id);
    const member = window.NgumpulGrupData?.member(id);
    const sendiri = id === userAktif.id;
    const username = remote ? remote.username :
        NgumpulTeman.get(id)?.username || member?.username || (sendiri ? userAktif.username : '');
    const bio = remote ? remote.bio : sendiri ? bacaSemuaProfil()[id]?.bio : '';
    const displayName = remote ? remote.displayName : NgumpulTeman.get(id)?.displayName || member?.displayName;
    return {
        nama: displayName || (sendiri ? userAktif.nama : username ? '@' + username : sender.nama),
        username: username ? '@' + username : '',
        bio: bio?.trim() || 'Belum ada deskripsi',
        foto: remote ? remote.avatar : ambilFotoProfilChat(id),
        banner: NgumpulAvatar.url(remote?.banner || (sendiri && !remote ? bacaMedia(id).banner : '')),
    };
}

function tampilkanBanner(node, url) {
    node.hidden = !url;
    node.style.backgroundImage = url ? 'url(' + JSON.stringify(url) + ')' : '';
}

// Isi bergaya info grup WhatsApp. Dipakai panel info chat dan dialog profil anggota grup.
function bangunInfoWa(isi, id, opsi) {
    isi.querySelectorAll('.info-tambahan').forEach(n => n.remove());
    const diri = userAktif && userAktif.id === id;
    const profil = identitasPengguna(id, opsi.remote);
    const akun = getUserById(id) || {};
    const induk = opsi.induk;
    const { foto, tautan } = dataPercakapan(id);

    // Tentang
    if (!isi.querySelector('#bio-info-kontak'))
        isi.appendChild(bagianInfo('Tentang', elInfo('p', 'info-teks', profil.bio)));

    if (!diri && NgumpulTeman.get(id)) {
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
                pasangGambar(sel, p.image);
                sel.addEventListener('click', () => bukaGaleriInfo(induk, id, opsi.tutup));
                strip.appendChild(sel);
            });
            media.appendChild(strip);
        }
        isi.appendChild(bagianInfo('Media, tautan', media, 'info-tanpa-judul'));

        // Pesan disematkan
        const pin = typeof ambilPinPesan === 'function' ? ambilPinPesan(id) : null;
        const pesanPin = pin && dataPercakapan(id).pesan.find(p => p.id === pin);
        if (pesanPin) {
            const ket = pesanPin.imageId ? 'Foto' : String(pesanPin.text || '').slice(0, 60);
            isi.appendChild(bagianInfo('Pesan disematkan', barisKartu('i-sematkan', 'Lihat pesan sematan', ket, () => {
                opsi.tutup(); bukaChat(id); setTimeout(() => window.lompatKePesanSemat && lompatKePesanSemat(), 120);
            }), 'info-tanpa-judul'));
        }

        // Pengaturan percakapan
        const set = elInfo('div', 'info-set');
        const bisu = elInfo('label', 'info-toggle');
        const cek = document.createElement('input');
        cek.type = 'checkbox'; cek.checked = chatDibisukan(id);
        cek.addEventListener('change', () => aturBisu(id, cek));
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
    if (info.children.length) isi.appendChild(bagianInfo('Profil pengguna', info));
    if (!diri && opsi.remote) NgumpulAuth.api('presence/' + encodeURIComponent(id)).then(({ presence }) => {
        if (!info.isConnected || opsi.masihAktif && !opsi.masihAktif()) return;
        if (presence.status === 'online') tambah('Status', 'Online');
        else if (presence.status === 'away') tambah('Status', 'Sedang tidak aktif');
        else if (presence.lastSeenAt) tambah('Terakhir dilihat', new Date(presence.lastSeenAt).toLocaleString('id-ID'));
    }).catch(() => {});

    // Tautan sosial
    let sosial = [];
    if (diri && !opsi.remote) {
        try { sosial = JSON.parse(localStorage.getItem(KUNCI_SOSMED + id)) || []; } catch (_) {}
    }
    if (Array.isArray(opsi.remote?.socialLinks)) sosial = opsi.remote.socialLinks;
    sosial = sosial.filter(t => t && NgumpulAvatar.url(t.url));
    if (sosial.length) {
        const chip = elInfo('div', 'info-sosial');
        sosial.forEach(t => {
            const a = elInfo('a', 'info-chip', t.nama || t.platform || 'Tautan');
            a.href = NgumpulAvatar.url(t.url); a.target = '_blank'; a.rel = 'noopener noreferrer';
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
        dasar.layanan.daftarGrup().then(async daftar => {
            const semua = (await Promise.allSettled(daftar.map(g => dasar.layanan.ambilGrup(g.id))))
                .filter(item => item.status === 'fulfilled').map(item => item.value);
            if (!seksi.isConnected || opsi.masihAktif && !opsi.masihAktif()) return;
            const sama = semua.filter(g => !g.keluar && g.anggotaIds.includes(id));
            seksi.querySelector('h3').textContent = 'Grup bersama (' + sama.length + ')';
            sama.forEach(g => {
                const b = elInfo('button', 'info-grup-item');
                b.type = 'button';
                const gambar = elInfo('span', 'info-grup-ikon');
                NgumpulAvatar.render(gambar, g.nama, g.foto);
                b.append(gambar, elInfo('span', 'info-grup-nama', g.nama),
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

function laporkanPengguna(id, nama) {
    const reason = fieldDM('Alasan laporan', { tag: 'select', name: 'reason', required: true });
    for (const [key, label] of Object.entries({ spam: 'Spam', harassment: 'Pelecehan',
        impersonation: 'Penyamaran identitas', inappropriate_content: 'Konten tidak pantas', other: 'Lainnya' })) {
        reason.lastElementChild.add(new Option(label, key));
    }
    dialogDM('Laporkan ' + nama, buatFormDM(reason,
        fieldDM('Detail (opsional)', { tag: 'textarea', name: 'details', maxLength: 1000, rows: 4 })
    ), 'Kirim laporan', async form => {
        try {
            await NgumpulAuth.api('users/' + encodeURIComponent(id) + '/reports', { method: 'POST', body: {
                reason: form.elements.reason.value, details: form.elements.details.value.trim()
            } });
        } catch (error) {
            if (error.status === 409) throw new Error('Kamu sudah pernah melaporkan akun ini.');
            throw error;
        }
        tampilToastTema('Laporan dikirim.');
    });
}

function panggil(id, video) { NgumpulPanggilanDM.start(id, video); }

// ----- Dialog profil (anggota grup / pengguna lain) -----
function perkayaInfoKontak(dialog, id, remote) {
    const profil = identitasPengguna(id, remote);
    const isi = dialog.querySelector('.detail-panel-content');
    isi.querySelectorAll('.info-tambahan, .info-banner, .info-username, .info-aksi-baris').forEach(n => n.remove());
    const identitas = isi.querySelector('.detail-identity');
    const banner = elInfo('div', 'info-banner');
    tampilkanBanner(banner, profil.banner);
    isi.insertBefore(banner, identitas);
    document.getElementById('nama-info-kontak').textContent = profil.nama;
    document.getElementById('bio-info-kontak').textContent = profil.bio;
    tampilkanAvatarChat(document.getElementById('foto-info-kontak'), id, profil.nama, profil.foto);
    identitas.appendChild(elInfo('p', 'info-username', profil.username));
    const diri = userAktif && userAktif.id === id;
    const tutup = () => dialog.close();
    if (!diri && NgumpulTeman.get(id)) {
        const aksi = [
            ['i-chat', 'Chat', () => { tutup(); document.dispatchEvent(new CustomEvent('ngumpul:buka-chat', { detail: { idLawan: id } })); }],
            ['i-phone', 'Suara', () => { tutup(); panggil(id, false); }],
            ['i-video', 'Video', () => { tutup(); panggil(id, true); }]
        ];
        const baris = barisAksiCepat(aksi);
        identitas.after(baris);
    }
    bangunInfoWa(isi, id, { remote, induk: dialog, tutup, masihAktif: () => dialog.open && dialog.dataset.akunId === id });
    if (!diri && typeof penggunaDiblokir === 'function' && typeof ubahBlokir === 'function') {
        const blokir = penggunaDiblokir(userAktif.id, id);
        const b = elInfo('button', 'info-blokir info-tambahan', (blokir ? 'Buka blokir ' : 'Blokir ') + profil.nama);
        b.type = 'button';
        b.addEventListener('click', async () => {
            b.disabled = true;
            await ubahBlokir(id, !penggunaDiblokir(userAktif.id, id));
            if (dialog.open && dialog.dataset.akunId === id) perkayaInfoKontak(dialog, id);
        });
        isi.append(b);
        const report = elInfo('button', 'info-blokir info-tambahan', 'Laporkan ' + profil.nama);
        report.type = 'button';
        report.onclick = () => laporkanPengguna(id, profil.nama);
        isi.append(report);
    }
}

// ----- Panel info chat pribadi (tombol info di header chat) -----
function perkayaPanelInfoPengguna(id) {
    const panel = document.getElementById('panel-info-pengguna');
    if (!panel || !id) return;
    const isi = panel.querySelector('.contact-info-content');
    const tutup = () => panel.setAttribute('aria-hidden', 'true');
    const masihAktif = () => panel.getAttribute('aria-hidden') === 'false' && chatAktifId === id;

    function render(remote) {
        const profil = identitasPengguna(id, remote);
        document.getElementById('nama-info-pengguna').textContent = profil.nama;
        document.getElementById('username-info-pengguna').textContent = profil.username;
        tampilkanAvatarChat(document.getElementById('avatar-info-pengguna'), id, profil.nama, profil.foto);
        tampilkanBanner(document.getElementById('banner-info-pengguna'), profil.banner);

        isi.querySelectorAll('.info-tambahan, .info-aksi-baris').forEach(n => n.remove());
        const akhir = isi.querySelector('.contact-info-actions');
        akhir.before(barisAksiCepat([
            ['i-phone', 'Suara', () => panggil(id, false)],
            ['i-video', 'Video', () => panggil(id, true)],
            ['i-search-garis', 'Cari', () => { tutup(); aturPencarianPesanTerbuka(true, true, true); }]
        ]));
        bangunInfoWa(isi, id, { induk: panel, tutup, masihAktif, remote });
        isi.appendChild(akhir);
    }

    render();
    muatProfilPengguna(id).then(profile => {
        if (profile && masihAktif()) render(profile);
    }).catch(() => {});
}

function tampilkanInfoKontak(id) {
    if (!id) return;
    const dialog = document.getElementById('dialog-info-kontak');
    dialog.dataset.akunId = id;
    perkayaInfoKontak(dialog, id);
    if (!dialog.open) {
        dialog.showModal();
        dialog.querySelector('.detail-panel-content').scrollTop = 0;
    }
    muatProfilPengguna(id).then(profile => {
        if (profile && dialog.open && dialog.dataset.akunId === id) perkayaInfoKontak(dialog, id, profile);
    }).catch(() => {});
}

(function () {
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
    document.addEventListener('ngumpul:teman-berubah', () => {
        const dialog = document.getElementById('dialog-info-kontak');
        if (dialog.open && !getUserById(dialog.dataset.akunId) && !window.NgumpulGrupData?.member(dialog.dataset.akunId)) dialog.close();
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
