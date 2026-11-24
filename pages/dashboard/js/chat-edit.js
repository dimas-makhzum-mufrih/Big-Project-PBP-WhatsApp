const BATAS_WAKTU_EDIT_PESAN = 5 * 60 * 1000;

// Batas selalu dihitung dari waktu kirim asli, bukan waktu edit terakhir.
function dalamBatasWaktuEditPesan(pesan) {
    const waktuKirim = Date.parse(pesan?.time);
    const umur = Date.now() - waktuKirim;
    return Number.isFinite(waktuKirim) && umur >= 0 && umur <= BATAS_WAKTU_EDIT_PESAN;
}

// Baca ulang pesan saat menyimpan agar pesan baru/status dari tab lain tetap utuh.
function editPesanChat(idLawan, idPesan, teksBaru) {
    if (!userAktif || getUserAktif()?.id !== userAktif.id || !idLawan || !idPesan) {
        return { berhasil: false, pesan: 'Sesi berakhir. Silakan masuk kembali.' };
    }
    if (chatTerblokir(idLawan)) {
        return { berhasil: false, pesan: 'Pesan tidak dapat diedit saat pengguna diblokir.' };
    }
    const teks = String(teksBaru || '').trim();
    if (!teks) return { berhasil: false, pesan: 'Pesan tidak boleh kosong.' };

    const daftar = ambilPesanChat(idLawan);
    const pesan = daftar.find(item => item.id === idPesan);
    if (!pesan || pesan.sender !== userAktif.id) {
        return { berhasil: false, pesan: 'Pesan tidak ditemukan atau bukan milik kamu.' };
    }
    if (!dalamBatasWaktuEditPesan(pesan)) {
        return { berhasil: false, pesan: 'Batas waktu edit 5 menit sejak pesan dikirim sudah habis.' };
    }
    if (teks === pesan.text) return { berhasil: true, berubah: false };

    pesan.text = teks;
    pesan.editedAt = new Date().toISOString();
    if (!simpanPesanChat(idLawan, daftar)) {
        return { berhasil: false, pesan: 'Perubahan gagal disimpan. Silakan coba lagi.' };
    }
    return { berhasil: true, berubah: true };
}

// Dipanggil juga ketika beralih percakapan, agar draf tidak masuk ke chat lain.
function tutupEditPesan() {
    document.getElementById('menu-edit-pesan').hidden = true;
    document.getElementById('dialog-edit-pesan').close();
}

(function () {
    const menu = document.getElementById('menu-edit-pesan');
    const tombolEdit = document.getElementById('btn-edit-pesan');
    const dialog = document.getElementById('dialog-edit-pesan');
    const form = document.getElementById('form-edit-pesan');
    const input = document.getElementById('input-edit-pesan');
    const error = document.getElementById('error-edit-pesan');
    if (!menu || !dialog || !boxListPesan) return;

    let pilihan = null;

    function fokusPesan() {
        if (!pilihan || pilihan.idLawan !== chatAktifId) return;
        const baris = Array.from(boxListPesan.querySelectorAll('.message-row'))
            .find(item => item.dataset.messageId === pilihan.idPesan);
        baris?.querySelector('.chat-bubble')?.focus({ preventScroll: true });
    }

    function tutupMenu(kembalikanFokus) {
        if (menu.hidden) return;
        menu.hidden = true;
        if (kembalikanFokus) fokusPesan();
    }

    function bukaMenu(event, dariKeyboard) {
        const bubble = event.target.closest('.chat-bubble');
        const baris = bubble?.closest('.message-row');
        const idPesan = baris?.dataset.messageId;
        const pesan = ambilPesanChat(chatAktifId).find(item => item.id === idPesan);
        tutupMenu(false);
        if (!pesan || pesan.sender !== userAktif?.id || chatTerblokir(chatAktifId)
            || !dalamBatasWaktuEditPesan(pesan)) return;

        event.preventDefault();
        pilihan = { idLawan: chatAktifId, idPesan };
        menu.hidden = false;
        const rect = bubble.getBoundingClientRect();
        const x = dariKeyboard ? rect.left : event.clientX;
        const y = dariKeyboard ? rect.bottom : event.clientY;
        menu.style.left = Math.max(8, Math.min(x, window.innerWidth - menu.offsetWidth - 8)) + 'px';
        menu.style.top = Math.max(8, Math.min(y, window.innerHeight - menu.offsetHeight - 8)) + 'px';
        tombolEdit.focus({ preventScroll: true });
    }

    boxListPesan.addEventListener('contextmenu', event => bukaMenu(event, false));
    boxListPesan.addEventListener('keydown', event => {
        if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
            bukaMenu(event, true);
        }
    });

    tombolEdit.addEventListener('click', () => {
        tutupMenu(false);
        if (!pilihan || pilihan.idLawan !== chatAktifId) return;
        const pesan = ambilPesanChat(pilihan.idLawan).find(item => item.id === pilihan.idPesan);
        if (!pesan || pesan.sender !== userAktif.id || chatTerblokir(pilihan.idLawan)
            || !dalamBatasWaktuEditPesan(pesan)) return;
        input.value = pesan.text || '';
        error.textContent = '';
        input.removeAttribute('aria-invalid');
        dialog.showModal();
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
    });

    form.addEventListener('submit', event => {
        event.preventDefault();
        if (!pilihan || pilihan.idLawan !== chatAktifId) return;
        const hasil = editPesanChat(pilihan.idLawan, pilihan.idPesan, input.value);
        if (!hasil.berhasil) {
            error.textContent = hasil.pesan;
            input.setAttribute('aria-invalid', 'true');
            input.focus();
            return;
        }
        if (hasil.berubah) {
            const posisiScroll = boxListPesan.scrollTop;
            renderPesanAktif();
            boxListPesan.scrollTop = posisiScroll;
            renderPinPesanAktif();
            renderChatList();
            if (pencarianPesanTerbuka()) renderHasilPencarianPesan();
        }
        dialog.close();
    });

    input.addEventListener('keydown', event => {
        if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229) {
            event.preventDefault();
            form.requestSubmit();
        }
    });

    input.addEventListener('input', () => {
        error.textContent = '';
        input.removeAttribute('aria-invalid');
    });
    document.getElementById('btn-batal-edit-pesan').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
        input.value = '';
        error.textContent = '';
        fokusPesan();
        pilihan = null;
    });

    document.addEventListener('pointerdown', event => {
        if (!menu.contains(event.target)) tutupMenu(false);
    });
    document.addEventListener('contextmenu', event => {
        if (!boxListPesan.contains(event.target) && !menu.contains(event.target)) tutupMenu(false);
    });
    document.addEventListener('keydown', event => {
        // Escape menutup dialog tanpa ikut menutup pencarian di belakangnya.
        if (dialog.open && event.key === 'Escape') {
            event.stopPropagation();
        } else if (!menu.hidden && (event.key === 'Escape' || event.key === 'Tab')) {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
            }
            tutupMenu(true);
        }
    }, true);
    boxListPesan.addEventListener('scroll', () => tutupMenu(false), { passive: true });
    window.addEventListener('resize', () => tutupMenu(false));
    window.addEventListener('blur', () => tutupMenu(false));
    window.addEventListener('storage', event => {
        if (event.key !== KEY_CHAT && event.key !== null) return;
        if (chatAktifId) renderPinPesanAktif();
        tutupMenu(false);
        if (dialog.open && pilihan) {
            const pesan = ambilPesanChat(pilihan.idLawan).find(item => item.id === pilihan.idPesan);
            if (!pesan || pesan.sender !== userAktif.id) dialog.close();
        }
    });
})();
