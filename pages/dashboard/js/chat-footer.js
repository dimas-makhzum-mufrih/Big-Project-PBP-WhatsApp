// ===== Footer chat: tombol plus (panel lampiran), emoji, mic =====
// Hanya tampilan. Aksi tiap tombol dipasang anggota lewat atribut data-fitur.
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

if (cariEmoji) {
    cariEmoji.addEventListener('input', () => renderPilihanEmoji(cariEmoji.value));
}

function buatBarReaksiPesan(reaksi, idLawan, pesanId) {
    const emojiTerpakai = Object.entries(reaksi)
        .filter(([, pengguna]) => Array.isArray(pengguna) && pengguna.length > 0);
    if (!emojiTerpakai.length) return null;

    const bar = document.createElement('div');
    bar.className = 'reaction-bar';
    const idPengguna = String(userAktif.id);

    emojiTerpakai.forEach(([emoji, pengguna]) => {
        const tombol = document.createElement('button');
        const sudahDipilih = pengguna.map(String).includes(idPengguna);
        tombol.type = 'button';
        tombol.className = 'reaction-badge' + (sudahDipilih ? ' mine' : '');
        tombol.textContent = emoji + ' ' + pengguna.length;
        tombol.title = sudahDipilih ? 'Klik untuk menghapus reaksi' : 'Klik untuk memberi reaksi';
        tombol.setAttribute('aria-label', `${emoji}, ${pengguna.length} reaksi`);
        tombol.addEventListener('click', event => {
            event.stopPropagation();
            toggleReaksiPesan(idLawan, pesanId, emoji);
        });
        bar.appendChild(tombol);
    });

    return bar;
}

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

function tampilkanReaksiPesanPicker(pesanId, pembungkusPesan) {
    if (!reaksiPesanEmojiPopup || !panelChatAktif || !chatAktifId) return;
    const gelembung = pembungkusPesan.querySelector('.chat-bubble');
    if (!gelembung) return;

    reaksiPesanTargetId = pesanId;
    reaksiPesanTargetChatId = chatAktifId;
    const rect = gelembung.getBoundingClientRect();
    const margin = 8;
    reaksiPesanEmojiPopup.style.display = 'flex';
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

function tutupReaksiPesanPicker() {
    if (!reaksiPesanEmojiPopup) return;
    reaksiPesanEmojiPopup.style.display = 'none';
    reaksiPesanTargetId = null;
    reaksiPesanTargetChatId = null;
}

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

document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
        if (modePemilihanReaksi) tutupReaksiPesanPicker();
        aturPanelEmoji(false);
        tutupReaksiPesanPicker();
    }
});

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

if (inputTeksKirim) inputTeksKirim.addEventListener('input', perbaruiTombolKirim);
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
        time: new Date().toISOString(),
        status: 'terkirim'
    });

    simpanPesanChat(chatAktifId, daftarPesan);

    if (inputTeksKirim) {
        inputTeksKirim.value = '';
    }
    perbaruiTombolKirim();

    renderPesanAktif();
    renderChatList();
    if (pencarianPesanTerbuka()) renderHasilPencarianPesan();
}
