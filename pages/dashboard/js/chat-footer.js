// ===== Footer chat: tombol plus (panel lampiran), emoji, mic =====
// Menghubungkan elemen picker, data emoji, dan target reaksi yang sedang dipilih.
const btnLampir = document.getElementById('btn-lampir');
const panelLampiran = document.getElementById('panel-lampiran');
const btnMic = document.getElementById('btn-mic');
const btnEmoji = document.getElementById('btn-emoji');
const panelEmoji = document.getElementById('panel-emoji-popup');
const cariEmoji = document.getElementById('input-cari-emoji');
const penandaEmoji = document.getElementById('emoji-tabs');
const emojiKetagoriLabel = document.getElementById('emoji-kategori-label');
const kotakPilihanEmoji = document.getElementById('emoji-grid');
const reaksiPesanEmojiPopup = document.getElementById('reaksi-popup-picker');
const btnReaksiLainnya = document.getElementById('btn-reaksi-lainnya');
const DATA_EMOJI = window.DATA_EMOJI;
const DATA_PENCARIAN_EMOJI = window.DATA_PENCARIAN_EMOJI;
let kategoriEmojiAktif = 'smileys';
let reaksiPesanTargetId = null;
let reaksiPesanTargetChatId = null;
let modePemilihanReaksi = false;

// Mengisi grid dengan emoji kategori aktif atau hasil pencarian.
function renderPilihanEmoji(filter = '') {
    if (!kotakPilihanEmoji) return;

    const query = filter.trim();
    const queryNormal = query.toLocaleLowerCase('id-ID');
    const sumber = query
        ? Object.values(DATA_EMOJI).flatMap(kategori => kategori.list)
        : (DATA_EMOJI[kategoriEmojiAktif]?.list || []);
    const daftarEmoji = [...new Set(sumber)].filter(emoji => {
        if (!query || emoji.includes(query)) return true;

        const kataKunci = DATA_PENCARIAN_EMOJI[emoji] || [];
        const teksKataKunci = kataKunci.join(' ').toLocaleLowerCase('id-ID');
        if (queryNormal.length === 1) {
            return kataKunci.some(kata =>
                kata.toLocaleLowerCase('id-ID').startsWith(queryNormal)
            );
        }
        return teksKataKunci.includes(queryNormal);
    });

    kotakPilihanEmoji.replaceChildren();
    daftarEmoji.forEach(emoji => {
        const tombol = document.createElement('button');
        tombol.type = 'button';
        tombol.textContent = emoji;
        tombol.title = emoji;
        tombol.setAttribute(
            'aria-label',
            (modePemilihanReaksi ? 'Beri reaksi ' : 'Sisipkan emoji ') + emoji
        );
        tombol.addEventListener('click', () => {
            // Dalam mode reaksi, emoji dipasang ke pesan; selain itu disisipkan ke input.
            if (modePemilihanReaksi) {
                toggleReaksiPesan(reaksiPesanTargetChatId, reaksiPesanTargetId, emoji);
                tutupReaksiPesanPicker();
                aturPanelEmoji(false);
                return;
            }
            sisipkanEmojiKePesan(emoji);
        });
        kotakPilihanEmoji.appendChild(tombol);
    });
}

// Menyisipkan emoji pada posisi kursor di kolom pesan.
function sisipkanEmojiKePesan(emoji) {
    if (!inputTeksKirim) return;

    const awal = inputTeksKirim.selectionStart ?? inputTeksKirim.value.length;
    const akhir = inputTeksKirim.selectionEnd ?? awal;
    inputTeksKirim.value =
        inputTeksKirim.value.slice(0, awal) + emoji + inputTeksKirim.value.slice(akhir);
    const posisiKursor = awal + emoji.length;
    inputTeksKirim.focus();
    inputTeksKirim.setSelectionRange(posisiKursor, posisiKursor);
    perbaruiTombolKirim();
}

// Membuka/menutup picker dan menyelaraskan ikon serta mode pilih reaksi.
function aturPanelEmoji(terbuka) {
    if (!panelEmoji || !btnEmoji) return;
    panelEmoji.style.display = terbuka ? 'flex' : 'none';
    btnEmoji.setAttribute('aria-expanded', String(terbuka));
    btnEmoji.setAttribute('aria-label', terbuka ? 'Tampilkan keyboard' : 'Pilih emoji');
    btnEmoji.title = terbuka ? 'Tampilkan keyboard' : 'Emoji';
    const ikonEmoji = btnEmoji.querySelector('use');
    if (ikonEmoji) ikonEmoji.setAttribute('href', terbuka ? '#i-keyboard' : '#i-smile');

    if (!terbuka) {
        modePemilihanReaksi = false;
        panelEmoji.classList.remove('pemilih-reaksi-aktif');
    }
}

// Membuka picker dari tombol footer dan menutupnya saat klik di luar.
if (btnEmoji && panelEmoji) {
    btnEmoji.setAttribute('aria-controls', 'panel-emoji-popup');
    btnEmoji.setAttribute('aria-expanded', 'false');
    btnEmoji.addEventListener('click', event => {
        event.stopPropagation();
        const terbuka = panelEmoji.style.display !== 'none';
        const menutupPickerReaksi = terbuka && modePemilihanReaksi;
        aturPanelEmoji(!terbuka);
        if (menutupPickerReaksi) tutupReaksiPesanPicker();
        if (!terbuka) {
            renderPilihanEmoji(cariEmoji ? cariEmoji.value : '');
            if (cariEmoji) cariEmoji.focus();
        }
    });

    document.addEventListener('click', event => {
        if (!panelEmoji.contains(event.target) && !btnEmoji.contains(event.target)) {
            if (modePemilihanReaksi && !event.target.closest('.btn-react-trigger')) {
                tutupReaksiPesanPicker();
            }
            aturPanelEmoji(false);
        }
    });
}

// Berpindah kategori emoji dan merender ulang grid.
if (penandaEmoji) {
    penandaEmoji.addEventListener('click', event => {
        const tab = event.target.closest('.emoji-tab');
        if (!tab || !DATA_EMOJI[tab.dataset.kategori]) return;

        penandaEmoji.querySelectorAll('.emoji-tab').forEach(item => {
            item.classList.toggle('aktif', item === tab);
        });
        kategoriEmojiAktif = tab.dataset.kategori;
        if (emojiKetagoriLabel) {
            emojiKetagoriLabel.textContent = DATA_EMOJI[kategoriEmojiAktif].label;
        }
        if (cariEmoji) cariEmoji.value = '';
        renderPilihanEmoji();
    });
}

// Memperbarui grid setiap kali query pencarian berubah.
if (cariEmoji) {
    cariEmoji.addEventListener('input', () => renderPilihanEmoji(cariEmoji.value));
}

// Membuat badge reaksi (gaya WhatsApp: pil kecil di sudut bawah gelembung).
function buatBarReaksiPesan(reaksi, idLawan, pesanId) {
    const emojiTerpakai = Object.entries(reaksi)
        .filter(([, pengguna]) => Array.isArray(pengguna) && pengguna.length > 0);
    if (!emojiTerpakai.length) return null;

    const bar = document.createElement('div');
    bar.className = 'reaction-bar';
    const idPengguna = String(userAktif.id);
    const total = emojiTerpakai.reduce((n, [, pengguna]) => n + pengguna.length, 0);

    emojiTerpakai.forEach(([emoji, pengguna]) => {
        const tombol = document.createElement('button');
        const sudahDipilih = pengguna.map(String).includes(idPengguna);
        tombol.type = 'button';
        tombol.className = 'reaction-badge' + (sudahDipilih ? ' mine' : '');
        const lambang = document.createElement('span');
        lambang.className = 'reaction-emoji';
        lambang.textContent = emoji;
        tombol.appendChild(lambang);
        if (pengguna.length > 1 || emojiTerpakai.length > 1) {
            const jumlah = document.createElement('span');
            jumlah.className = 'reaction-count';
            jumlah.textContent = String(pengguna.length);
            tombol.appendChild(jumlah);
        }
        tombol.title = 'Lihat siapa yang bereaksi';
        tombol.setAttribute('aria-label', `${emoji}, ${pengguna.length} reaksi. Lihat detail`);
        tombol.setAttribute('aria-haspopup', 'dialog');
        tombol.addEventListener('click', event => {
            event.stopPropagation();
            tampilkanDetailReaksi(bar, reaksi, idLawan, pesanId);
        });
        bar.appendChild(tombol);
    });
    if (total > 1 && emojiTerpakai.length > 1) bar.dataset.total = String(total);
    return bar;
}

// Rincian siapa yang bereaksi apa. Baris milik sendiri bisa diketuk untuk menghapus reaksi.
let detailReaksiEl = null;
function tutupDetailReaksi() {
    if (detailReaksiEl) { detailReaksiEl.remove(); detailReaksiEl = null; }
}
function tampilkanDetailReaksi(jangkar, reaksi, idLawan, pesanId) {
    tutupDetailReaksi();
    const idSaya = String(userAktif.id);
    const kotak = document.createElement('div');
    kotak.className = 'rx-detail';
    kotak.setAttribute('role', 'dialog');
    kotak.setAttribute('aria-label', 'Reaksi pada pesan');
    const judul = document.createElement('div');
    judul.className = 'rx-detail-judul';
    const daftar = [];
    Object.entries(reaksi).forEach(([emoji, pengguna]) => {
        if (Array.isArray(pengguna)) pengguna.forEach(id => daftar.push({ emoji, id: String(id) }));
    });
    daftar.sort((a, b) => (a.id === idSaya ? -1 : 0) - (b.id === idSaya ? -1 : 0));
    judul.textContent = daftar.length + ' reaksi';
    kotak.appendChild(judul);
    const isi = document.createElement('div');
    isi.className = 'rx-detail-daftar';
    daftar.forEach(({ emoji, id }) => {
        const milikku = id === idSaya;
        const baris = document.createElement(milikku ? 'button' : 'div');
        baris.className = 'rx-detail-baris' + (milikku ? ' milikku' : '');
        if (milikku) baris.type = 'button';
        const avatar = document.createElement('span');
        avatar.className = 'rx-detail-avatar circle-avatar';
        const nama = milikku ? 'Anda' : (getProfilChat(id).nama || 'Pengguna');
        tampilkanAvatarChat(avatar, id, nama);
        const teks = document.createElement('span');
        teks.className = 'rx-detail-teks';
        const n = document.createElement('strong');
        n.textContent = nama;
        teks.appendChild(n);
        if (milikku) {
            const ket = document.createElement('small');
            ket.textContent = 'Ketuk untuk menghapus';
            teks.appendChild(ket);
        }
        const e = document.createElement('span');
        e.className = 'rx-detail-emoji';
        e.textContent = emoji;
        baris.append(avatar, teks, e);
        if (milikku) baris.addEventListener('click', ev => {
            ev.stopPropagation();
            tutupDetailReaksi();
            toggleReaksiPesan(idLawan, pesanId, emoji);
        });
        isi.appendChild(baris);
    });
    kotak.appendChild(isi);
    document.body.appendChild(kotak);
    detailReaksiEl = kotak;
    const r = jangkar.getBoundingClientRect();
    const m = 8, w = kotak.offsetWidth, h = kotak.offsetHeight;
    let top = r.bottom + 6;
    if (top + h > window.innerHeight - m) top = Math.max(m, r.top - h - 6);
    const kiri = Math.max(m, Math.min(r.left, window.innerWidth - w - m));
    kotak.style.left = kiri + 'px';
    kotak.style.top = top + 'px';
    const pertama = kotak.querySelector('button');
    if (pertama) pertama.focus({ preventScroll: true });
}
document.addEventListener('pointerdown', event => {
    if (detailReaksiEl && !detailReaksiEl.contains(event.target) && !event.target.closest('.reaction-badge')) tutupDetailReaksi();
}, true);
document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && detailReaksiEl) { event.stopPropagation(); tutupDetailReaksi(); }
}, true);

// Mengganti reaksi pengguna pada pesan, atau menghapusnya jika emoji sama dipilih lagi.
function toggleReaksiPesan(idLawan, pesanId, emoji) {
    if (!userAktif || !idLawan || !pesanId || !emoji) return;

    const percakapanId = kunciKonversasi(userAktif.id, idLawan);
    const semuaReaksi = bacaSemuaReaksiPesan();
    const reaksiPercakapan = semuaReaksi[percakapanId] || (semuaReaksi[percakapanId] = {});
    const reaksiPesan = reaksiPercakapan[pesanId] || (reaksiPercakapan[pesanId] = {});
    const idPengguna = String(userAktif.id);
    const reaksiSebelumnya = Object.keys(reaksiPesan).find(namaEmoji =>
        Array.isArray(reaksiPesan[namaEmoji]) &&
        reaksiPesan[namaEmoji].map(String).includes(idPengguna)
    );

    if (reaksiSebelumnya) {
        reaksiPesan[reaksiSebelumnya] = reaksiPesan[reaksiSebelumnya]
            .filter(id => String(id) !== idPengguna);
        if (!reaksiPesan[reaksiSebelumnya].length) delete reaksiPesan[reaksiSebelumnya];
    }
    if (reaksiSebelumnya !== emoji) {
        if (!Array.isArray(reaksiPesan[emoji])) reaksiPesan[emoji] = [];
        if (!reaksiPesan[emoji].map(String).includes(idPengguna)) {
            reaksiPesan[emoji].push(idPengguna);
        }
    }

    if (!Object.keys(reaksiPesan).length) delete reaksiPercakapan[pesanId];
    if (!Object.keys(reaksiPercakapan).length) delete semuaReaksi[percakapanId];
    if (simpanSemuaReaksiPesan(semuaReaksi) && chatAktifId === idLawan) {
        renderPesanAktif();
    }
}

// Menempatkan popup pilihan reaksi di dekat pesan yang dipilih.
function tampilkanReaksiPesanPicker(pesanId, pembungkusPesan) {
    if (!reaksiPesanEmojiPopup || !panelChatAktif || !chatAktifId) return;
    const gelembung = pembungkusPesan.querySelector('.chat-bubble');
    if (!gelembung) return;

    reaksiPesanTargetId = pesanId;
    reaksiPesanTargetChatId = chatAktifId;
    const rect = gelembung.getBoundingClientRect();
    const margin = 8;
    reaksiPesanEmojiPopup.style.display = 'flex';
    // tandai reaksi milik sendiri (seperti WhatsApp) dan putar ulang animasi muncul
    const reaksiSaya = (() => {
        const semua = ambilReaksiPesan(chatAktifId, pesanId);
        return Object.keys(semua).find(e => Array.isArray(semua[e]) && semua[e].map(String).includes(String(userAktif.id))) || '';
    })();
    reaksiPesanEmojiPopup.querySelectorAll('.reaksi-cepat[data-emoji]').forEach(b => {
        const aktif = !!reaksiSaya && b.dataset.emoji === reaksiSaya;
        b.classList.toggle('dipilih', aktif);
        b.setAttribute('aria-pressed', String(aktif));
    });
    reaksiPesanEmojiPopup.classList.remove('rx-buka');
    void reaksiPesanEmojiPopup.offsetWidth;
    reaksiPesanEmojiPopup.classList.add('rx-buka');
    const popupW = reaksiPesanEmojiPopup.offsetWidth;
    const popupH = reaksiPesanEmojiPopup.offsetHeight;
    const left = Math.max(margin, Math.min(
        rect.left + rect.width / 2 - popupW / 2,
        window.innerWidth - popupW - margin
    ));
    let top = rect.top - popupH - margin;
    if (top < margin) top = Math.min(rect.bottom + margin, window.innerHeight - popupH - margin);
    reaksiPesanEmojiPopup.style.left = left + 'px';
    reaksiPesanEmojiPopup.style.top = Math.max(margin, top) + 'px';
}

// Menutup popup dan mengosongkan target reaksi aktif.
function tutupReaksiPesanPicker() {
    if (!reaksiPesanEmojiPopup) return;
    reaksiPesanEmojiPopup.style.display = 'none';
    reaksiPesanTargetId = null;
    reaksiPesanTargetChatId = null;
}

// Menangani pilihan cepat dari popup reaksi.
if (reaksiPesanEmojiPopup) {
    reaksiPesanEmojiPopup.querySelectorAll('.reaksi-cepat:not(.reaksi-lainnya)').forEach(btn => {
        btn.addEventListener('click', event => {
            event.stopPropagation();
            if (!reaksiPesanTargetId || !reaksiPesanTargetChatId) return;
            toggleReaksiPesan(reaksiPesanTargetChatId, reaksiPesanTargetId, btn.dataset.emoji);
            tutupReaksiPesanPicker();
        });
    });
    reaksiPesanEmojiPopup.addEventListener('click', event => event.stopPropagation());
}

// Membuka picker penuh untuk memilih emoji reaksi lainnya.
if (btnReaksiLainnya) {
    btnReaksiLainnya.addEventListener('click', event => {
        event.stopPropagation();
        if (!reaksiPesanTargetId || !reaksiPesanTargetChatId || !panelEmoji) return;
        reaksiPesanEmojiPopup.style.display = 'none';
        modePemilihanReaksi = true;
        panelEmoji.classList.add('pemilih-reaksi-aktif');
        aturPanelEmoji(true);
        renderPilihanEmoji(cariEmoji ? cariEmoji.value : '');
        if (cariEmoji) cariEmoji.focus();
    });
}

// Menutup popup reaksi jika pengguna mengeklik area lain.
document.addEventListener('click', event => {
    if (
        reaksiPesanEmojiPopup &&
        reaksiPesanEmojiPopup.style.display !== 'none' &&
        !reaksiPesanEmojiPopup.contains(event.target) &&
        !event.target.closest('.btn-react-trigger')
    ) {
        tutupReaksiPesanPicker();
    }
});

// Menutup picker dengan Escape.
document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
        if (modePemilihanReaksi) tutupReaksiPesanPicker();
        aturPanelEmoji(false);
        tutupReaksiPesanPicker();
    }
});

// Memperbarui tampilan jika reaksi berubah di tab browser lain.
window.addEventListener('storage', event => {
    if (event.key === KEY_REAKSI_PESAN && chatAktifId) renderPesanAktif();
});

function tutupPanelLampiran() {
    if (!panelLampiran || panelLampiran.hidden) return;
    panelLampiran.hidden = true;
    if (btnLampir) {
        btnLampir.setAttribute('aria-expanded', 'false');
        btnLampir.classList.remove('terbuka');
    }
}

// mic tampil kalau kolom kosong, tombol Kirim tampil kalau ada teks (seperti WhatsApp)
function perbaruiTombolKirim() {
    const adaTeks = !!(inputTeksKirim && inputTeksKirim.value.trim());
    if (btnKirimPesan) btnKirimPesan.hidden = !adaTeks;
    if (btnMic) btnMic.hidden = adaTeks;
}

if (btnLampir && panelLampiran) {
    btnLampir.addEventListener('click', event => {
        event.stopPropagation();
        const buka = panelLampiran.hidden;
        panelLampiran.hidden = !buka;
        btnLampir.setAttribute('aria-expanded', String(buka));
        btnLampir.classList.toggle('terbuka', buka);
    });
    document.addEventListener('click', event => {
        if (!event.target.closest('#panel-lampiran')) tutupPanelLampiran();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') tutupPanelLampiran();
    });
}

// draf disimpan tiap ketikan; daftar chat diperbarui dengan jeda supaya tidak berat
let timerDrafDaftarChat = null;
if (inputTeksKirim) inputTeksKirim.addEventListener('input', () => {
    perbaruiTombolKirim();
    if (!chatAktifId) return;
    simpanDrafChat(chatAktifId, inputTeksKirim.value);
    window.clearTimeout(timerDrafDaftarChat);
    timerDrafDaftarChat = window.setTimeout(renderChatList, 250);
});
perbaruiTombolKirim();

function kirimPesanAktif() {
    if (!chatAktifId || !userAktif) return;
    if (penggunaDiblokir(userAktif.id, chatAktifId) || penggunaDiblokir(chatAktifId, userAktif.id)) return;

    if (antreanGambar.length > 0) {
        kirimSemuaGambarAntrean();
        return;
    }

    const teks = (inputTeksKirim ? inputTeksKirim.value : '').trim();
    if (!teks) return;

    const daftarPesan = ambilPesanChat(chatAktifId);
    daftarPesan.push({
        id: buatIdPesan(),
        sender: userAktif.id,
        text: teks,
        ...(idBalasanAktif ? { replyTo: idBalasanAktif } : {}),
        time: new Date().toISOString(),
        status: 'terkirim'
    });

    if (!simpanPesanChat(chatAktifId, daftarPesan)) return;
    window.clearTimeout(timerDrafDaftarChat);
    simpanDrafChat(chatAktifId, '');
    batalkanBalasanPesan();

    if (inputTeksKirim) {
        inputTeksKirim.value = '';
    }
    perbaruiTombolKirim();

    renderPesanAktif();
    renderChatList();
    if (pencarianPesanTerbuka()) renderHasilPencarianPesan();
}
