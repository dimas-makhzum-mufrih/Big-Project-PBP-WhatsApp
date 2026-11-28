const userAktif = getUserAktif();

function buatIndikatorStatusPesan(nilai) {
    const item = { status: nilai };
    const status = document.createElement('span');
    status.className = 'message-status' + (item.status === 'dibaca' ? ' dibaca' : '');
    const sudahDiterima = item.status === 'diterima' || item.status === 'dibaca';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('message-status-icon');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', sudahDiterima
        ? 'M2.305,11.235a1,1,0,0,1,1.414.024l3.206,3.319L14.3,7.289A1,1,0,0,1,15.7,8.711l-8.091,8a1,1,0,0,1-.7.289H6.9a1,1,0,0,1-.708-.3L2.281,12.649A1,1,0,0,1,2.305,11.235ZM20.3,7.289l-7.372,7.289-.263-.273a1,1,0,1,0-1.438,1.39l.966,1a1,1,0,0,0,.708.3h.011a1,1,0,0,0,.7-.289l8.091-8A1,1,0,0,0,20.3,7.289Z'
        : 'M2.305,11.235a1,1,0,0,1,1.414.024l3.206,3.319L14.3,7.289A1,1,0,0,1,15.7,8.711l-8.091,8a1,1,0,0,1-.7.289H6.9a1,1,0,0,1-.708-.3L2.281,12.649A1,1,0,0,1,2.305,11.235Z');
    svg.appendChild(path);
    status.appendChild(svg);
    status.setAttribute('aria-label', 'Status pesan: ' + (
        item.status === 'dibaca' ? 'Dibaca' : sudahDiterima ? 'Diterima' : 'Terkirim'
    ));
    return status;
}

// ===== Fitur Chat =====
const panelChatKosong = document.getElementById('panel-chat-kosong');
const panelChatAktif = document.getElementById('panel-chat-aktif');
const boxListPesan = document.getElementById('box-list-pesan');
const btnUnpinMessage = document.getElementById('btn-unpin-message');
const inputTeksKirim = document.getElementById('input-teks-kirim');
const btnKirimPesan = document.getElementById('btn-kirim-pesan');
const inputCariChat = document.getElementById('input-cari-chat');
const inputCariPesan = document.getElementById('input-cari-pesan');
const panelCariPesan = document.getElementById('panel-cari-pesan');
const hasilCariPesan = document.getElementById('hasil-cari-pesan');
const panelPratinjauBalasan = document.getElementById('reply-composer-preview');
const namaPengirimBalasan = document.getElementById('reply-composer-sender');
const teksPratinjauBalasan = document.getElementById('reply-composer-text');
const btnBatalBalasan = document.getElementById('btn-cancel-reply');
const btnToggleCariPesan = document.getElementById('btn-toggle-cari-pesan');
const btnTutupCariPesan = document.getElementById('btn-tutup-cari-pesan');
const chatScrollArea = document.querySelector('.chat-scroll-area');
const avatarHeaderKanan = document.getElementById('avatar-header-kanan');
const namaHeaderKanan = document.getElementById('nama-header-kanan');
const btnBlokirPengguna = document.getElementById('btn-blokir-pengguna');
const btnInfoPengguna = document.getElementById('btn-info-pengguna');
const panelInfoPengguna = document.getElementById('panel-info-pengguna');
let chatAktifId = null;
let timerSorotPesanCari = null;

// ===== Data komposer per percakapan =====
function bacaDrafChat(peer) {
    const draft = NgumpulDM.getDraft(peer);
    return draft?.teks?.trim() || draft?.reply ? draft : null;
}

function simpanDrafChat(peer, teks, reply = idBalasanAktif) {
    NgumpulDM.draft(peer, teks, reply);
}

let idBalasanAktif = null;

// ===== Balas pesan (chat pribadi) =====
function ringkasanPesan(item) {
    if (item && item.dihapusSemua) return 'Pesan ini telah dihapus';
    if (item?.encrypted) return 'Pesan terenkripsi';
    const teks = String(item && item.text || '').trim();
    if (teks) return teks;
    if (isPesanBergambar(item)) return 'Foto';
    if (item?.attachmentId) return item.file?.fileName || 'Lampiran';
    if (item?.location) return item.location.label || 'Lokasi';
    return item?.poll?.question || '';
}

function namaPengirimPesan(item) {
    return String(item.sender) === String(userAktif.id) ? 'Anda' : getProfilChat(chatAktifId).nama;
}

function renderPratinjauBalasan() {
    if (!panelPratinjauBalasan) return;
    const pesanBalasan = chatAktifId && idBalasanAktif
        ? ambilPesanChat(chatAktifId).find(item => String(item.id) === String(idBalasanAktif))
        : null;
    if (!pesanBalasan || pesanBalasan.dihapusSemua) {
        panelPratinjauBalasan.hidden = true;
        return;
    }
    namaPengirimBalasan.textContent = namaPengirimPesan(pesanBalasan);
    teksPratinjauBalasan.textContent = ringkasanPesan(pesanBalasan);
    panelPratinjauBalasan.hidden = false;
}

function mulaiBalasPesan(idPesan) {
    const pesan = ambilPesanChat(chatAktifId).find(item => String(item.id) === String(idPesan));
    if (!pesan || pesan.dihapusSemua) return;
    idBalasanAktif = pesan.id;
    simpanDrafChat(chatAktifId, inputTeksKirim.value);
    renderPratinjauBalasan();
    if (inputTeksKirim) inputTeksKirim.focus();
}

function batalkanBalasanPesan(simpan = true) {
    idBalasanAktif = null;
    if (simpan && chatAktifId) simpanDrafChat(chatAktifId, inputTeksKirim.value);
    renderPratinjauBalasan();
}

if (btnBatalBalasan) btnBatalBalasan.addEventListener('click', batalkanBalasanPesan);

if (btnUnpinMessage) {
    btnUnpinMessage.addEventListener('click', async event => {
        event.stopPropagation();
        const peer = chatAktifId;
        const pinned = ambilPinPesan(peer);
        if (!pinned) return;
        btnUnpinMessage.disabled = true;
        try { await NgumpulDM.pin(peer, pinned, false); }
        catch (error) { setStatusDM(peer, NgumpulDM.label(error)); }
        finally { btnUnpinMessage.disabled = false; }
    });
}
// Klik bilah "Pesan Disematkan" = lompat ke pesan aslinya
const barSematan = document.getElementById('pinned-message-container');
async function lompatKePesanSemat() {
    if (!chatAktifId) return;
    const peer = chatAktifId;
    const pinned = ambilPinPesan(peer);
    if (pinned) await lompatKePesanDM(peer, pinned);
}

barSematan.addEventListener('click', lompatKePesanSemat);
barSematan.addEventListener('keydown', event => {
    if (event.target === barSematan && ['Enter', ' '].includes(event.key)) {
        event.preventDefault();
        lompatKePesanSemat();
    }
});

function buatIdPesan() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function ambilFotoProfilChat(id) {
    const teman = NgumpulTeman.get(id);
    if (teman) return NgumpulTeman.foto(teman);
    const member = window.NgumpulGrupData?.member(id);
    if (id === userAktif.id) {
        return NgumpulAvatar.url(member?.avatar) || bacaMedia(id).avatar || NgumpulAvatar.url(userAktif.avatar);
    }
    return NgumpulAvatar.url(member?.avatar);
}

function tampilkanAvatarChat(container, id, nama, foto = ambilFotoProfilChat(id)) {
    NgumpulAvatar.render(container, nama, foto, id === userAktif.id);
}

function isPesanBergambar(item) {
    return Boolean(item && (item.hasImage || item.image || item.imageId));
}

function formatPreviewPesan(terakhir) {
    if (!terakhir) return 'Mulai chat baru';
    if (terakhir.dihapusSemua) {
        return userAktif && String(terakhir.sender) === String(userAktif.id)
            ? 'Kamu menghapus pesan ini'
            : 'Pesan ini telah dihapus';
    }
    const teks = (terakhir.text || '').trim();
    if (isPesanBergambar(terakhir)) {
        return teks || 'Foto';
    }
    return teks || 'Mulai chat baru';
}

function penggunaDiblokir(idPengguna, idLawan) {
    return idPengguna === userAktif.id && NgumpulDM.isBlocked(idLawan);
}

function chatTerblokir(peer) {
    return NgumpulDM.isBlocked(peer);
}

async function ubahBlokir(peer, blokir) {
    try {
        await NgumpulDM.block(peer, blokir);
        await NgumpulTeman.muat();
        tampilToastTema(blokir ? 'Pengguna diblokir.' : 'Blokir dibuka.');
    } catch (error) {
        tampilToastTema(NgumpulDM.label(error));
    }
}

function perbaruiKontrolBlokir() {
    if (!btnBlokirPengguna || !chatAktifId) return;
    const diblokir = penggunaDiblokir(userAktif.id, chatAktifId);
    const memblokir = penggunaDiblokir(chatAktifId, userAktif.id);
    btnBlokirPengguna.textContent = diblokir ? 'Buka blokir' : 'Blokir';
    btnBlokirPengguna.disabled = !diblokir && memblokir;
    btnBlokirPengguna.title = memblokir && !diblokir ? 'Pengguna ini memblokir kamu' : '';
    if (inputTeksKirim) inputTeksKirim.disabled = diblokir || memblokir;
    if (btnKirimPesan) btnKirimPesan.disabled = diblokir || memblokir;
    // plus (lampiran) dan mic ikut mati saat diblokir
    ['btn-lampir', 'btn-mic'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = diblokir || memblokir;
    });
    if (diblokir || memblokir) {
        const panel = document.getElementById('panel-lampiran');
        if (panel) panel.hidden = true;
    }
}

function formatJamPesan(isoString) {
    if (!isoString) return '';
    const waktu = new Date(isoString);
    if (Number.isNaN(waktu.getTime())) return '';
    return waktu.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function kunciKonversasi(idA, idB) {
    return [String(idA), String(idB)].sort().join('_');
}

function ambilPesanChat(peer) {
    return NgumpulDM.list(peer);
}

function ambilReaksiPesan(peer, id) {
    return NgumpulDM.reactions(peer, id);
}

function ambilPinPesan(peer) {
    return NgumpulDM.readPins(peer)[0]?.id || null;
}

function perbaruiTombolPin() {
    boxListPesan.querySelectorAll('.message-row').forEach(baris => {
        const tombol = baris.querySelector('.btn-pin-message');
        if (!tombol) return;
        const aktif = NgumpulDM.readPins(chatAktifId).some(item => item.id === baris.dataset.messageId);
        tombol.classList.toggle('tersemat', aktif);
        tombol.setAttribute('aria-pressed', String(aktif));
        const label = aktif ? 'Lepas sematan' : 'Sematkan pesan';
        tombol.title = label;
        tombol.setAttribute('aria-label', label);
    });
}

function renderPinPesanAktif() {
    renderBarSematan();
    perbaruiTombolPin();
}

function renderBarSematan() {
    const container = document.getElementById('pinned-message-container');
    const teksPesan = document.getElementById('pinned-message-text');
    if (!container || !teksPesan || !chatAktifId) return;
    const pins = NgumpulDM.readPins(chatAktifId);
    const pesan = pins[0];
    container.style.display = pesan ? 'flex' : 'none';
    teksPesan.textContent = pesan ? ringkasanPesan(pesan) + (pins.length > 1 ? ' · +' + (pins.length - 1) : '') : '';
}

function tandaiPesanDibaca(peer) {
    NgumpulDM.acknowledge(peer).catch(() => {});
}

function getProfilChat(idLawan) {
    const teman = NgumpulTeman.get(idLawan);
    const profil = getProfil(idLawan);
    return {
        nama: teman ? NgumpulTeman.nama(teman) : profil.nama || 'Pengguna Ngumpul',
        username: teman ? NgumpulTeman.username(teman) : profil.username
    };
}

function isKontakPengguna(idLawan) {
    return !!NgumpulTeman.get(idLawan);
}

// ===== Hapus pesan (untuk saya / untuk semua) =====
// Berlaku untuk semua jenis pesan: teks, gambar, teruskan, balasan.
function ambilPesanTampil(peer) {
    return ambilPesanChat(peer);
}
