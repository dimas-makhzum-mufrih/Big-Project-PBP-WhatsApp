// ===== Footer chat: tombol plus (panel lampiran), emoji, mic =====
const btnLampir = document.getElementById('btn-lampir');
const panelLampiran = document.getElementById('panel-lampiran');
const btnMic = document.getElementById('btn-mic');
const btnEmojiChat = document.getElementById('btn-emoji');
const panelEmojiChat = document.getElementById('chat-emoji-picker');

function tutupPanelLampiran() {
    if (!panelLampiran || panelLampiran.hidden) return;
    panelLampiran.hidden = true;
    if (btnLampir) {
        btnLampir.setAttribute('aria-expanded', 'false');
        btnLampir.classList.remove('terbuka');
    }
}

function tutupPanelEmojiChat() {
    if (!panelEmojiChat || panelEmojiChat.hidden) return;
    panelEmojiChat.hidden = true;
    if (btnEmojiChat) {
        btnEmojiChat.setAttribute('aria-expanded', 'false');
        btnEmojiChat.classList.remove('terbuka');
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
        tutupPanelEmojiChat();
        const buka = panelLampiran.hidden;
        panelLampiran.hidden = !buka;
        btnLampir.setAttribute('aria-expanded', String(buka));
        btnLampir.classList.toggle('terbuka', buka);
    });
    document.addEventListener('click', event => {
        if (!event.target.closest('#panel-lampiran')) tutupPanelLampiran();
        if (!event.target.closest('#chat-emoji-picker, #btn-emoji')) tutupPanelEmojiChat();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            tutupPanelLampiran();
            tutupPanelEmojiChat();
        }
    });
}

const emojiChat = [
    '😀', '😁', '😂', '😊', '😍', '🥰', '😎',
    '🥳', '🤔', '😢', '😭', '😮', '😴', '👍',
    '👎', '👏', '🙏', '💪', '❤️', '🔥', '🎉',
    '✅', '👋', '🌟', '💯', '📚', '💻', '☕'
];

if (btnEmojiChat && panelEmojiChat) {
    emojiChat.forEach(emoji => {
        const tombol = document.createElement('button');
        tombol.type = 'button';
        tombol.className = 'chat-emoji-item';
        tombol.textContent = emoji;
        tombol.setAttribute('aria-label', 'Sisipkan ' + emoji);
        tombol.addEventListener('click', event => {
            event.stopPropagation();
            if (!inputTeksKirim) return;

            const nilai = inputTeksKirim.value;
            const awal = inputTeksKirim.selectionStart;
            const akhir = inputTeksKirim.selectionEnd;
            const posisiAwal = awal === null ? nilai.length : awal;
            const posisiAkhir = akhir === null ? posisiAwal : akhir;
            inputTeksKirim.setRangeText(emoji, posisiAwal, posisiAkhir, 'end');
            tutupPanelEmojiChat();
            inputTeksKirim.focus();
            inputTeksKirim.dispatchEvent(new Event('input', { bubbles: true }));
        });
        panelEmojiChat.appendChild(tombol);
    });

    btnEmojiChat.addEventListener('click', event => {
        event.stopPropagation();
        tutupPanelLampiran();
        const buka = panelEmojiChat.hidden;
        panelEmojiChat.hidden = !buka;
        btnEmojiChat.setAttribute('aria-expanded', String(buka));
        btnEmojiChat.classList.toggle('terbuka', buka);
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
