// ===== Footer chat: tombol plus (panel lampiran), emoji, mic =====
// Hanya tampilan. Aksi tiap tombol dipasang anggota lewat atribut data-fitur.
const btnLampir = document.getElementById('btn-lampir');
const panelLampiran = document.getElementById('panel-lampiran');
const btnMic = document.getElementById('btn-mic');

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
        ...(idBalasanAktif ? { replyTo: idBalasanAktif } : {}),
        time: new Date().toISOString(),
        status: 'terkirim'
    });

    simpanPesanChat(chatAktifId, daftarPesan);
    batalkanBalasanPesan();

    if (inputTeksKirim) {
        inputTeksKirim.value = '';
    }
    perbaruiTombolKirim();

    renderPesanAktif();
    renderChatList();
    if (pencarianPesanTerbuka()) renderHasilPencarianPesan();
}

const menuPesanKonteks = document.getElementById('message-context-menu');
const tombolBalasKonteks = document.getElementById('btn-context-reply');
const tombolSematkanKonteks = document.getElementById('btn-context-pin');
let pesanTerpilihUntukBalas = null;
let tombolPemicuMenuPesan = null;

function tutupMenuPesanKonteks() {
    if (menuPesanKonteks) menuPesanKonteks.hidden = true;
    if (tombolPemicuMenuPesan) tombolPemicuMenuPesan.setAttribute('aria-expanded', 'false');
    tombolPemicuMenuPesan = null;
    pesanTerpilihUntukBalas = null;
}

function bukaMenuPesanKonteks(idPesan, x, y, pemicu) {
    if (!menuPesanKonteks || !idPesan) return;
    if (tombolPemicuMenuPesan) tombolPemicuMenuPesan.setAttribute('aria-expanded', 'false');
    tombolPemicuMenuPesan = pemicu || null;
    if (tombolPemicuMenuPesan) tombolPemicuMenuPesan.setAttribute('aria-expanded', 'true');
    pesanTerpilihUntukBalas = idPesan;
    if (tombolSematkanKonteks) {
        const sudahTersemat = ambilPinPesan(chatAktifId) === idPesan;
        const labelSematan = sudahTersemat ? 'Lepas sematan' : 'Sematkan';
        tombolSematkanKonteks.querySelector('span').textContent = labelSematan;
        tombolSematkanKonteks.setAttribute('aria-label', labelSematan);
    }
    menuPesanKonteks.hidden = false;
    menuPesanKonteks.style.left = Math.max(8, x) + 'px';
    menuPesanKonteks.style.top = Math.max(8, y) + 'px';
    const batas = menuPesanKonteks.getBoundingClientRect();
    const kiriMaksimal = Math.max(8, window.innerWidth - batas.width - 8);
    const atasMaksimal = Math.max(8, window.innerHeight - batas.height - 8);
    menuPesanKonteks.style.left = Math.min(Math.max(8, x), kiriMaksimal) + 'px';
    menuPesanKonteks.style.top = Math.min(Math.max(8, y), atasMaksimal) + 'px';
}

if (boxListPesan) {
    boxListPesan.addEventListener('contextmenu', event => {
        const baris = event.target.closest('.message-row');
        if (!baris || !baris.dataset.messageId) return;
        event.preventDefault();
        bukaMenuPesanKonteks(baris.dataset.messageId, event.clientX, event.clientY);
    });
    boxListPesan.addEventListener('click', event => {
        const tombolMenu = event.target.closest('[data-message-menu-id]');
        if (!tombolMenu) return;
        event.stopPropagation();
        const batas = tombolMenu.getBoundingClientRect();
        bukaMenuPesanKonteks(tombolMenu.dataset.messageMenuId, batas.right, batas.bottom, tombolMenu);
    });
}

if (tombolBalasKonteks) {
    tombolBalasKonteks.addEventListener('click', () => {
        if (pesanTerpilihUntukBalas) mulaiBalasPesan(pesanTerpilihUntukBalas);
        tutupMenuPesanKonteks();
    });
}

if (tombolSematkanKonteks) {
    tombolSematkanKonteks.addEventListener('click', () => {
        if (pesanTerpilihUntukBalas) {
            const barisPesan = [...boxListPesan.querySelectorAll('.message-row')]
                .find(baris => String(baris.dataset.messageId) === String(pesanTerpilihUntukBalas));
            const tombolPin = barisPesan && barisPesan.querySelector('.btn-pin-message');
            if (tombolPin) tombolPin.click();
        }
        tutupMenuPesanKonteks();
    });
}

document.addEventListener('click', event => {
    if (!event.target.closest('#message-context-menu')) tutupMenuPesanKonteks();
});
document.addEventListener('keydown', event => {
    if (event.key === 'Escape') tutupMenuPesanKonteks();
});
