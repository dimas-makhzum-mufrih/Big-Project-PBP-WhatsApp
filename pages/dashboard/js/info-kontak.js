// ===== Panel profil baca-saja, dipakai chat pribadi dan anggota grup =====
function tampilkanInfoKontak(id) {
    const akun = getUserById(id);
    if (!akun) return;
    const profil = getProfil(id),
        wadah = document.getElementById('foto-info-kontak');
    tampilkanAvatarChat(wadah, id, profil.nama || akun.nama);
    document.getElementById('nama-info-kontak').textContent = profil.nama || akun.nama;
    document.getElementById('nomor-info-kontak').textContent =
        profil.phone || akun.hp || 'Nomor tidak tersedia';
    const bio = bacaSemuaProfil()[id]?.bio;
    document.getElementById('bio-info-kontak').textContent = bio && bio.trim() ? bio : 'Belum ada deskripsi';
    const dialog = document.getElementById('dialog-info-kontak');
    dialog.dataset.akunId = id;
    if (!dialog.open) {
        dialog.showModal();
        dialog.querySelector('.detail-panel-content').scrollTop = 0;
    }
}
(function () {
    document.getElementById('btn-info-kontak-chat').addEventListener('click', () => {
        if (chatAktifId) tampilkanInfoKontak(chatAktifId);
    });
    document.querySelectorAll('[data-tutup-dialog]').forEach((tombol) => {
        tombol.addEventListener('click', () => tombol.closest('dialog').close());
    });
    document.querySelectorAll('dialog.dashboard-detail-panel, dialog.grup-dialog').forEach((dialog) => {
        dialog.addEventListener('click', (event) => {
            if (event.target !== dialog) return;
            const r = dialog.getBoundingClientRect();
            if (
                event.clientX < r.left ||
                event.clientX > r.right ||
                event.clientY < r.top ||
                event.clientY > r.bottom
            )
                dialog.close();
        });
    });
    document
        .getElementById('dialog-info-kontak')
        .addEventListener('close', () => document.dispatchEvent(new CustomEvent('ngumpul:profil-ditutup')));
    document.getElementById('btn-kembali-chat-pribadi').addEventListener('click', () => {
        document.getElementById('panel-sisi-kiri').classList.remove('room-open');
        document.getElementById('panel-sisi-kanan').classList.remove('room-open');
        document.getElementById('tab-chat').focus();
    });
    document.addEventListener('ngumpul:tab-dashboard', (event) => {
        const dialog = document.getElementById('dialog-info-kontak');
        if (dialog.open) dialog.close();
        if (event.detail.tabAktif !== 'chat') {
            document.getElementById('panel-sisi-kiri').classList.remove('room-open');
            document.getElementById('panel-sisi-kanan').classList.remove('room-open');
        }
    });
    window.addEventListener('storage', (event) => {
        const dialog = document.getElementById('dialog-info-kontak');
        if (
            dialog.open &&
            ['ngumpul_users', 'ngumpul_profil', 'ngumpul_media_' + dialog.dataset.akunId].includes(event.key)
        ) {
            if (getUserById(dialog.dataset.akunId)) tampilkanInfoKontak(dialog.dataset.akunId);
            else dialog.close();
        }
    });
})();
