if (btnBlokirPengguna) btnBlokirPengguna.addEventListener('click', () => {
    if (!chatAktifId) return;
    ubahBlokir(chatAktifId, !penggunaDiblokir(userAktif.id, chatAktifId));
});

if (btnSimpanKontakChat) btnSimpanKontakChat.addEventListener('click', () => {
    if (!chatAktifId || !userAktif || namaKontakTersimpan(chatAktifId)) return;
    const target = getProfilChat(chatAktifId);
    const nama = (window.prompt('Nama untuk kontak ini:', String(getProfil(chatAktifId).nama || target.hp).trim()) || '').trim();
    if (!nama) return;
    try {
        NgumpulKontakData.add(userAktif.id, target.hp, nama);
        perbaruiKontrolKontak();
        renderChatList();
        // Perbarui judul dengan nama kontak yang baru disimpan.
        if (namaHeaderKanan) namaHeaderKanan.textContent = nama;
        const nomorHeaderBaru = document.getElementById('nomor-header-kanan');
        if (nomorHeaderBaru) {
            nomorHeaderBaru.textContent = target.hp || 'Nomor tidak tersedia';
            nomorHeaderBaru.hidden = false;
        }
        tampilkanAvatarChat(avatarHeaderKanan, chatAktifId, nama);
        if (panelInfoPengguna && panelInfoPengguna.getAttribute('aria-hidden') === 'false') tampilkanInfoPengguna();
    } catch (error) {
        window.alert(error.message || 'Kontak gagal disimpan.');
    }
});

function tutupInfoPengguna() {
    if (!panelInfoPengguna) return;
    panelInfoPengguna.setAttribute('aria-hidden', 'true');
}

function tampilkanInfoPengguna() {
    if (!chatAktifId || !panelInfoPengguna) return;
    const target = getProfilChat(chatAktifId);
    document.getElementById('nama-info-pengguna').textContent = target.nama;
    document.getElementById('nomor-info-pengguna').textContent = target.hp || 'Nomor tidak tersedia';
    document.getElementById('username-info-pengguna').textContent = target.username || '';
    tampilkanAvatarChat(document.getElementById('avatar-info-pengguna'), chatAktifId, target.nama);
    const banner = document.getElementById('banner-info-pengguna');
    const urlBanner = ambilBannerProfilChat(chatAktifId);
    banner.hidden = !urlBanner;
    banner.style.backgroundImage = urlBanner ? 'url("' + urlBanner + '")' : '';
    perbaruiKontrolBlokir();
    perbaruiKontrolKontak();
    if (typeof perkayaPanelInfoPengguna === 'function') perkayaPanelInfoPengguna(chatAktifId);
}

if (btnInfoPengguna) btnInfoPengguna.addEventListener('click', () => {
    if (!chatAktifId || !panelInfoPengguna) return;
    tampilkanInfoPengguna();
    panelInfoPengguna.setAttribute('aria-hidden', 'false');
});

document.getElementById('btn-tutup-info-pengguna').addEventListener('click', tutupInfoPengguna);
document.addEventListener('keydown', event => { if (event.key === 'Escape') tutupInfoPengguna(); });

window.addEventListener('storage', event => {
    if (event.key !== KEY_CHAT) return;
    prosesPesanMasuk();
    if (chatAktifId) renderPesanAktif();
    if (pencarianPesanTerbuka()) renderHasilPencarianPesan();
    renderChatList();
});

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
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            kirimPesanAktif();
        }
    });
}

document.addEventListener('ngumpul:buka-chat', event => {
    const idLawan = event && event.detail ? event.detail.idLawan : null;
    if (idLawan) {
        pilihTabDashboard(false);
        bukaChat(idLawan);
    }
});

if (userAktif) {
    prosesPesanMasuk();
    renderChatList();
    if (panelChatKosong && panelChatAktif) {
        panelChatAktif.style.display = 'none';
        panelChatKosong.style.display = 'flex';
    }
}

// ===== Tab Chat / Grup / Kontak di dalam dashboard =====
const tabChat = document.getElementById('tab-chat');
const tabGrup = document.getElementById('tab-grup');
const tabKontak = document.getElementById('tab-kontak');
const tabTelepon = document.getElementById('tab-telepon');
const panelTabChat = document.getElementById('panel-tab-chat');
const panelTabGrup = document.getElementById('panel-tab-grup');
const panelTabKontak = document.getElementById('panel-tab-kontak');

function pilihTabDashboard(tabTujuan) {
    // Tetap mendukung pemanggilan boolean dari alur Chat dan Kontak yang sudah ada.
    const tabAktif = typeof tabTujuan === 'boolean' ? (tabTujuan ? 'kontak' : 'chat') : tabTujuan;
    window.NgumpulRuang?.sinkronSidebarGrup(tabAktif);
    panelTabChat.hidden = tabAktif !== 'chat';
    panelTabGrup.hidden = tabAktif !== 'grup';
    panelTabKontak.hidden = tabAktif !== 'kontak';
    document.getElementById('panel-tab-telepon').hidden = tabAktif !== 'telepon';
    [[tabChat, 'chat'], [tabGrup, 'grup'], [tabKontak, 'kontak'], [tabTelepon, 'telepon']].forEach(([tombol, nama]) => {
        tombol.classList.toggle('aktif', tabAktif === nama);
        tombol.setAttribute('aria-pressed', String(tabAktif === nama));
    });
    if (tabAktif === 'chat') renderChatList();
    if (tabAktif === 'grup') document.dispatchEvent(new CustomEvent('ngumpul:tab-grup'));
    document.dispatchEvent(new CustomEvent('ngumpul:tab-dashboard', { detail: { tabAktif } }));
}

tabChat.addEventListener('click', () => pilihTabDashboard(false));
tabGrup.addEventListener('click', () => pilihTabDashboard('grup'));
tabKontak.addEventListener('click', () => pilihTabDashboard(true));
tabTelepon.addEventListener('click', () => pilihTabDashboard('telepon'));
document.getElementById('btn-kembali-dari-kontak').addEventListener('click', () => {
    pilihTabDashboard(false);
    tabChat.focus();
});
document.addEventListener('ngumpul:buka-chat', () => pilihTabDashboard(false));

// Continue a contact-originated chat request after the dashboard page loads.
const idChatTertunda = new URLSearchParams(location.hash.slice(1)).get('buka-chat');
if (userAktif && idChatTertunda) {
    window.setTimeout(() => {
        document.dispatchEvent(
            new CustomEvent('ngumpul:buka-chat', {
                detail: { idLawan: idChatTertunda }
            })
        );

        // Bersihkan hash setelah permintaan chat diteruskan
        history.replaceState(
            null,
            '',
            location.pathname + location.search
        );
    }, 0);
}
