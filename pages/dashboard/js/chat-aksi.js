if (btnBlokirPengguna) btnBlokirPengguna.addEventListener('click', () => {
    if (!chatAktifId) return;
    ubahBlokir(chatAktifId, !penggunaDiblokir(userAktif.id, chatAktifId));
});

function tutupInfoPengguna() {
    if (!panelInfoPengguna) return;
    panelInfoPengguna.setAttribute('aria-hidden', 'true');
}

function tampilkanInfoPengguna() {
    if (!chatAktifId || !panelInfoPengguna) return;
    perkayaPanelInfoPengguna(chatAktifId);
    perbaruiKontrolBlokir();
}

if (btnInfoPengguna) btnInfoPengguna.addEventListener('click', () => {
    if (!chatAktifId || !panelInfoPengguna) return;
    panelInfoPengguna.setAttribute('aria-hidden', 'false');
    tampilkanInfoPengguna();
});

document.getElementById('btn-tutup-info-pengguna').addEventListener('click', tutupInfoPengguna);
document.addEventListener('keydown', event => { if (event.key === 'Escape') tutupInfoPengguna(); });

if (inputCariChat) {
    inputCariChat.addEventListener('input', renderChatList);
}

// ----- Cari pesan di dalam chat: tombol, input, tutup (X / Escape) -----
if (inputCariPesan) {
    inputCariPesan.addEventListener('input', renderHasilPencarianPesan);
}

if (btnToggleCariPesan && inputCariPesan) {
    btnToggleCariPesan.addEventListener('click', () => {
        if (!chatAktifId) return;
        const terbuka = !pencarianPesanTerbuka();
        aturPencarianPesanTerbuka(terbuka);
        if (!terbuka) btnToggleCariPesan.focus();
    });
}

if (btnTutupCariPesan) {
    btnTutupCariPesan.addEventListener('click', () => {
        aturPencarianPesanTerbuka(false);
        if (btnToggleCariPesan) btnToggleCariPesan.focus();
    });
}

// Escape menutup panel walau fokus ada di tombol hasil; lightbox & pratinjau gambar didahulukan
document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !pencarianPesanTerbuka()) return;
    if (lightboxGambar && !lightboxGambar.hidden) return;
    if (panelPreviewGambar && !panelPreviewGambar.hidden) return;
    aturPencarianPesanTerbuka(false);
    if (btnToggleCariPesan) btnToggleCariPesan.focus();
});

if (btnKirimPesan && inputTeksKirim) {
    btnKirimPesan.addEventListener('click', kirimPesanAktif);
    inputTeksKirim.addEventListener('keydown', event => {
        if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && !event.repeat) {
            event.preventDefault();
            kirimPesanAktif();
        }
    });
}

document.addEventListener('ngumpul:buka-chat', event => {
    const idLawan = event && event.detail ? event.detail.idLawan : null;
    if (idLawan) {
        pilihTabDashboard('chat');
        bukaChat(idLawan);
    }
});

if (userAktif) {
    renderChatList();
    if (panelChatKosong && panelChatAktif) {
        panelChatAktif.style.display = 'none';
        panelChatKosong.style.display = 'flex';
    }
}

// ===== Tab Chat / Grup / Teman di dalam dashboard =====
const tabChat = document.getElementById('tab-chat');
const tabGrup = document.getElementById('tab-grup');
const tabTeman = document.getElementById('tab-teman');
const tabTelepon = document.getElementById('tab-telepon');
const panelTabChat = document.getElementById('panel-tab-chat');
const panelTabGrup = document.getElementById('panel-tab-grup');
const panelTabTeman = document.getElementById('panel-tab-teman');

function pilihTabDashboard(tabAktif) {
    window.NgumpulRuang?.sinkronSidebarGrup(tabAktif);
    panelTabChat.hidden = tabAktif !== 'chat';
    panelTabGrup.hidden = tabAktif !== 'grup';
    panelTabTeman.hidden = tabAktif !== 'teman';
    document.getElementById('panel-tab-telepon').hidden = tabAktif !== 'telepon';
    [[tabChat, 'chat'], [tabGrup, 'grup'], [tabTeman, 'teman'], [tabTelepon, 'telepon']].forEach(([tombol, nama]) => {
        tombol.classList.toggle('aktif', tabAktif === nama);
        tombol.setAttribute('aria-pressed', String(tabAktif === nama));
    });
    if (tabAktif === 'chat') renderChatList();
    if (tabAktif === 'grup') document.dispatchEvent(new CustomEvent('ngumpul:tab-grup'));
    document.dispatchEvent(new CustomEvent('ngumpul:tab-dashboard', { detail: { tabAktif } }));
}

tabChat.addEventListener('click', () => pilihTabDashboard('chat'));
tabGrup.addEventListener('click', () => pilihTabDashboard('grup'));
tabTeman.addEventListener('click', () => pilihTabDashboard('teman'));
tabTelepon.addEventListener('click', () => pilihTabDashboard('telepon'));
document.getElementById('btn-kembali-dari-teman').addEventListener('click', () => {
    pilihTabDashboard('chat');
    tabChat.focus();
});
// Buka chat tertunda setelah daftar teman tersedia.
const idChatTertunda = new URLSearchParams(location.hash.slice(1)).get('buka-chat');
function bukaChatTertunda() {
    if (!idChatTertunda || !NgumpulTeman.get(idChatTertunda)) return;
    document.removeEventListener('ngumpul:teman-berubah', bukaChatTertunda);
    document.dispatchEvent(new CustomEvent('ngumpul:buka-chat', { detail: { idLawan: idChatTertunda } }));
    history.replaceState(null, '', location.pathname + location.search);
}
if (idChatTertunda) {
    document.addEventListener('ngumpul:teman-berubah', bukaChatTertunda);
    if (NgumpulTeman.get(idChatTertunda)) setTimeout(bukaChatTertunda, 0);
}

document.addEventListener('ngumpul:teman-berubah', () => {
    renderChatList();
    if (!chatAktifId) return;
    if (NgumpulTeman.get(chatAktifId)) {
        const profil = getProfilChat(chatAktifId);
        tampilkanAvatarChat(avatarHeaderKanan, chatAktifId, profil.nama);
        return;
    }
    tutupEditPesan();
    tutupPreviewGambar();
    batalkanBalasanPesan(false);
    NgumpulDM.open(null);
    aturPencarianPesanTerbuka(false, true, false);
    tutupInfoPengguna();
    chatAktifId = null;
    panelChatAktif.style.display = 'none';
    panelChatKosong.style.display = 'flex';
    document.getElementById('panel-sisi-kiri').classList.remove('room-open');
    document.getElementById('panel-sisi-kanan').classList.remove('room-open');
});

// ===== Hapus pesan: dialog pilihan + toast Urungkan =====
// Dipakai chat pribadi (di bawah) dan chat grup (grup.js lewat window.NgumpulHapus).
const dialogHapusPesan = document.getElementById('dialog-hapus-pesan');
const btnHapusSemua = document.getElementById('btn-hapus-semua');
const btnHapusSaya = document.getElementById('btn-hapus-saya');
const btnBatalHapus = document.getElementById('btn-batal-hapus');
const cuplikanHapusPesan = document.getElementById('cuplikan-hapus-pesan');
const toastHapusPesan = document.getElementById('toast-hapus-pesan');
const teksToastHapus = document.getElementById('teks-toast-hapus');
const btnUrungkanHapus = document.getElementById('btn-urungkan-hapus');
let opsiHapusAktif = null;
let aksiUrungkanHapus = null;
let timerToastHapus = null;

function sembunyikanToastHapus() {
    if (timerToastHapus) window.clearTimeout(timerToastHapus);
    timerToastHapus = null;
    aksiUrungkanHapus = null;
    if (toastHapusPesan) toastHapusPesan.hidden = true;
}

function tampilkanToastHapus(teks, urungkan) {
    if (!toastHapusPesan) return;
    aksiUrungkanHapus = typeof urungkan === 'function' ? urungkan : null;
    teksToastHapus.textContent = teks;
    btnUrungkanHapus.hidden = !aksiUrungkanHapus;
    toastHapusPesan.hidden = false;
    if (timerToastHapus) window.clearTimeout(timerToastHapus);
    timerToastHapus = window.setTimeout(sembunyikanToastHapus, 6000);
}

// opsi: { bisaSemua, cuplikan, hapusSaya(), hapusSemua(), urungkan() }
async function jalankanHapusPesan(opsi, untukSemua) {
    try {
        const berhasil = untukSemua ? await opsi.hapusSemua() : await opsi.hapusSaya();
        if (berhasil === false) {
            tampilkanToastHapus('Pesan tidak bisa dihapus', null);
            return;
        }
        tampilkanToastHapus(
            untukSemua ? 'Pesan dihapus untuk semua orang' : 'Pesan dihapus untuk saya',
            untukSemua ? null : opsi.urungkan
        );
    } catch (error) {
        tampilkanToastHapus(error && error.message ? error.message : 'Pesan gagal dihapus', null);
    }
}

function bukaDialogHapusPesan(opsi) {
    if (!dialogHapusPesan || !opsi) return;
    // sisa pesan "dihapus untuk semua": langsung hilang dari tampilan sendiri, tanpa konfirmasi
    if (opsi.langsung) {
        jalankanHapusPesan(opsi, false);
        return;
    }
    opsiHapusAktif = opsi;
    btnHapusSemua.hidden = !opsi.bisaSemua;
    const ringkas = String(opsi.cuplikan || '').trim();
    cuplikanHapusPesan.textContent = ringkas.length > 120 ? ringkas.slice(0, 120) + '…' : ringkas;
    cuplikanHapusPesan.hidden = !ringkas;
    dialogHapusPesan.showModal();
    btnBatalHapus.focus();
}
window.NgumpulHapus = { dialog: bukaDialogHapusPesan, toast: tampilkanToastHapus };

function mintaHapusPesan(idPesan) {
    if (!chatAktifId || !dialogHapusPesan) return;
    const idLawan = chatAktifId;
    const pesan = ambilPesanChat(idLawan).find(item => String(item.id) === String(idPesan));
    if (!pesan) return;
    bukaDialogHapusPesan({
        langsung: Boolean(pesan.dihapusSemua),
        bisaSemua: pesan.sender === userAktif.id && !pesan.dihapusSemua,
        cuplikan: pesan.dihapusSemua ? '' : ringkasanPesan(pesan),
        hapusSaya: () => NgumpulDM.remove(idLawan, pesan.id, 'me'),
        hapusSemua: () => NgumpulDM.remove(idLawan, pesan.id, 'everyone')
    });
}

if (dialogHapusPesan) {
    const tutupDialogHapus = () => dialogHapusPesan.close();
    btnBatalHapus.addEventListener('click', tutupDialogHapus);
    // klik di luar kartu dialog = batal
    dialogHapusPesan.addEventListener('click', event => {
        if (event.target === dialogHapusPesan) tutupDialogHapus();
    });
    dialogHapusPesan.addEventListener('close', () => { opsiHapusAktif = null; });

    btnHapusSemua.addEventListener('click', () => {
        const opsi = opsiHapusAktif;
        tutupDialogHapus();
        if (opsi) jalankanHapusPesan(opsi, true);
    });
    btnHapusSaya.addEventListener('click', () => {
        const opsi = opsiHapusAktif;
        tutupDialogHapus();
        if (opsi) jalankanHapusPesan(opsi, false);
    });
}

if (btnUrungkanHapus) {
    btnUrungkanHapus.addEventListener('click', () => {
        const aksi = aksiUrungkanHapus;
        sembunyikanToastHapus();
        if (aksi) Promise.resolve().then(aksi).catch(() => {});
    });
}
