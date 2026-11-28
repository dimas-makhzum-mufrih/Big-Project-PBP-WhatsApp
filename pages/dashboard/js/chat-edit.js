function dapatEditPesan(pesan) {
    return !!(pesan && pesan.sender === userAktif.id && !pesan.dihapusSemua && !pesan.encrypted);
}

async function editPesanChat(peer, id, teksBaru) {
    const text = String(teksBaru || '').trim();
    if (!text) return { berhasil: false, pesan: 'Pesan tidak boleh kosong.' };
    const pesan = ambilPesanChat(peer).find(item => item.id === id);
    if (!dapatEditPesan(pesan)) return { berhasil: false, pesan: 'Pesan tidak tersedia untuk diedit.' };
    if (text === pesan.text) return { berhasil: true, berubah: false };
    try {
        await NgumpulDM.edit(peer, id, text);
        return { berhasil: true, berubah: true };
    } catch (error) {
        return { berhasil: false, pesan: NgumpulDM.label(error) };
    }
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
            || !dapatEditPesan(pesan)) return;

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
            || !dapatEditPesan(pesan)) return;
        input.value = pesan.text || '';
        error.textContent = '';
        input.removeAttribute('aria-invalid');
        dialog.showModal();
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
    });

    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (!pilihan || pilihan.idLawan !== chatAktifId) return;
        const tombol = form.querySelector('[type="submit"]');
        if (tombol.disabled) return;
        tombol.disabled = true;
        const target = pilihan;
        const hasil = await editPesanChat(target.idLawan, target.idPesan, input.value);
        tombol.disabled = false;
        if (pilihan !== target) return;
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
})();
