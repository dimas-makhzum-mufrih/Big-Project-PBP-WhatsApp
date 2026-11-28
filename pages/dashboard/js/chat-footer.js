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

// Membuat badge reaksi dan jumlah pengguna untuk satu pesan.
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

async function toggleReaksiPesan(peer, id, emoji) {
    try { await NgumpulDM.react(peer, id, emoji); }
    catch (error) { setStatusDM(peer, NgumpulDM.label(error)); }
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
    const rekam = sedangMerekamDM();
    if (btnKirimPesan) btnKirimPesan.hidden = !adaTeks || rekam;
    if (btnMic) btnMic.hidden = adaTeks && !rekam;
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
    NgumpulDM.typing();
    window.clearTimeout(timerDrafDaftarChat);
    timerDrafDaftarChat = window.setTimeout(renderChatList, 250);
});
perbaruiTombolKirim();

let mengirimTeksDM = false;

async function kirimPesanAktif() {
    const peer = chatAktifId;
    if (!peer || chatTerblokir(peer) || mengirimTeksDM || sedangMerekamDM()) return;
    if (antreanGambar.length) {
        await kirimSemuaGambarAntrean();
        return;
    }
    const teksAwal = inputTeksKirim.value;
    const text = teksAwal.trim();
    const replyToMessageId = idBalasanAktif;
    if (!text) return;
    mengirimTeksDM = true;
    btnKirimPesan.disabled = true;
    setStatusDM(peer, 'Mengirim pesan…');
    try {
        await NgumpulDM.send(peer, { text, ...(replyToMessageId ? { replyToMessageId } : {}) });
        if (chatAktifId === peer && inputTeksKirim.value === teksAwal && idBalasanAktif === replyToMessageId) {
            inputTeksKirim.value = '';
            batalkanBalasanPesan(false);
            simpanDrafChat(peer, '', null);
        } else if (chatAktifId !== peer && bacaDrafChat(peer)?.teks === teksAwal &&
            bacaDrafChat(peer)?.reply === replyToMessageId) simpanDrafChat(peer, '', null);
        setStatusDM(peer, '');
        perbaruiTombolKirim();
        renderChatList();
    } catch (error) {
        setStatusDM(peer, NgumpulDM.label(error, 'Pesan gagal dikirim. Tekan Kirim untuk mencoba lagi.'));
    } finally {
        mengirimTeksDM = false;
        perbaruiKontrolBlokir();
    }
}
