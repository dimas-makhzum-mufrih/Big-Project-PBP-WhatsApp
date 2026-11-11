// ===== Kontak tersimpan per akun =====
if (userAktif) {
    const tabChat = document.querySelector('.tab[data-fitur="tab-chat"]');
    const tabKontak = document.getElementById('tab-kontak');
    const areaChat = document.querySelector('.chat-scroll-area');
    const areaKontak = document.getElementById('contact-list-area');
    const judulSisiKiri = document.querySelector('.header-kiri h2');
    const inputCariKontak = document.getElementById('input-cari-chat');
    const daftarKontak = document.getElementById('daftar-kontak');
    const formKontak = document.getElementById('form-tambah-kontak');
    const inputNamaKontak = document.getElementById('input-nama-kontak');
    const inputNomorKontak = document.getElementById('input-nomor-kontak');
    const tombolTambahKontak = document.getElementById('btn-tambah-kontak');
    const statusKontak = document.getElementById('contact-status');

    function tampilkanStatusKontak(teks, error) {
        statusKontak.textContent = teks;
        statusKontak.dataset.error = error ? 'true' : 'false';
    }

    function bacaKontak() { return NgumpulKontak.daftar(userAktif.id); }
    function normalisasiNomorKontak(nomor) { return NgumpulKontak.normalisasiNomor(nomor); }
    function nomorDariKontak(item) { return normalisasiNomorKontak(typeof item === 'string' ? (getUserById(item) || {}).hp : item.phone) || ''; }
    function userDenganNomorKontak(nomor) { return getUsers().find(p => samakanHp(p.hp, nomor)) || null; }
    function kunciKontak(item) { return NgumpulKontak.kunci(item); }
    function renderKontak() {
        const daftar = bacaKontak();
        daftarKontak.replaceChildren();
        if (daftar === null) {
            daftarKontak.appendChild(buatPesanKosong('Kontak belum dapat ditampilkan.'));
            return;
        }

        const kataKunci = inputCariKontak.value.trim().toLowerCase();
        const kontak = daftar.map(item => {
            const phone = nomorDariKontak(item);
            const user = typeof item === 'string' ? getUserById(item) : userDenganNomorKontak(phone);
            if (user && user.id === userAktif.id) return null;
            const profil = user ? getProfil(user.id) : null;
            return {
                key: kunciKontak(item),
                user: user,
                nama: typeof item === 'string'
                    ? (profil ? profil.nama : phone)
                    : (item.name || (profil ? profil.nama : phone)),
                phone: user && user.hp ? user.hp : phone
            };
        })
            .filter(item => item && item.phone)
            .sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
        const hasil = kontak.filter(item =>
            item.nama.toLowerCase().includes(kataKunci) ||
            item.phone.toLowerCase().includes(kataKunci)
        );

        if (!hasil.length) {
            const teks = kataKunci
                ? 'Kontak tidak ditemukan.'
                : 'Belum ada kontak. Tambahkan nomor HP untuk menyimpannya di browser.';
            daftarKontak.appendChild(buatPesanKosong(teks));
            return;
        }

        const warnaAvatar = ['#3984bd', '#8e63aa', '#d17b45', '#368c72', '#bd5d70'];
        hasil.forEach(item => {
            const kartu = document.createElement('div');
            kartu.className = 'contact-card';

            const avatar = document.createElement('div');
            avatar.className = 'contact-avatar';
            avatar.textContent = item.nama.trim().charAt(0).toUpperCase() || '?';
            let indeksWarna = 0;
            const sumberWarna = item.user ? item.user.id : item.phone;
            for (let i = 0; i < sumberWarna.length; i++) indeksWarna += sumberWarna.charCodeAt(i);
            avatar.style.backgroundColor = warnaAvatar[indeksWarna % warnaAvatar.length];

            const detail = document.createElement('div');
            detail.className = 'contact-details';
            const nama = document.createElement('span');
            nama.className = 'contact-name';
            nama.textContent = item.nama;
            const nomor = document.createElement('span');
            nomor.className = 'contact-phone';
            nomor.textContent = item.phone;
            detail.append(nama, nomor);

            const tombolHapus = document.createElement('button');
            tombolHapus.className = 'contact-remove-button';
            tombolHapus.type = 'button';
            tombolHapus.dataset.hapusKontak = item.key;
            tombolHapus.textContent = 'Hapus';
            tombolHapus.setAttribute('aria-label', 'Hapus kontak ' + item.nama);

            const aksi = document.createElement('div');
            aksi.className = 'contact-card-actions';

            const tombolChatKontak = document.createElement('button');
            tombolChatKontak.className = 'contact-chat-button';
            tombolChatKontak.type = 'button';
            tombolChatKontak.dataset.chatKontak = item.key;
            tombolChatKontak.textContent = 'Chat';
            tombolChatKontak.setAttribute('aria-label', 'Chat dengan ' + item.nama);

            const tombolTelepon = document.createElement('button');
            tombolTelepon.className = 'contact-call-button';
            tombolTelepon.type = 'button';
            tombolTelepon.textContent = 'Segera hadir';
            tombolTelepon.disabled = true;
            tombolTelepon.title = 'Fitur telepon segera hadir';
            tombolTelepon.setAttribute('aria-label', 'Telepon suara segera hadir');

            const tombolVideo = document.createElement('button');
            tombolVideo.className = 'contact-call-button';
            tombolVideo.type = 'button';
            tombolVideo.textContent = 'Segera hadir';
            tombolVideo.disabled = true;
            tombolVideo.title = 'Fitur video call segera hadir';
            tombolVideo.setAttribute('aria-label', 'Video call segera hadir');

            aksi.append(tombolChatKontak, tombolTelepon, tombolVideo, tombolHapus);
            kartu.append(avatar, detail, aksi);
            daftarKontak.appendChild(kartu);
        });
    }

    function buatPesanKosong(teks) {
        const pesan = document.createElement('p');
        pesan.className = 'contact-empty';
        pesan.textContent = teks;
        return pesan;
    }

    function aturTampilanKontak(aktif) {
        areaChat.hidden = aktif;
        areaKontak.hidden = !aktif;
        tabKontak.classList.toggle('aktif', aktif);
        tabKontak.setAttribute('aria-pressed', String(aktif));
        if (tabChat) {
            tabChat.classList.toggle('aktif', !aktif);
            tabChat.setAttribute('aria-pressed', String(!aktif));
        }
        judulSisiKiri.textContent = aktif ? 'Kontak' : 'Obrolan';
        inputCariKontak.placeholder = aktif ? 'Cari kontak...' : 'Cari atau mulai chat baru';
        inputCariKontak.setAttribute('aria-label', aktif ? 'Cari kontak' : 'Cari atau mulai chat baru');
        inputCariKontak.value = '';
        if (aktif) renderKontak();
    }

    tabKontak.addEventListener('click', () => aturTampilanKontak(true));
    if (tabChat) tabChat.addEventListener('click', () => aturTampilanKontak(false));
    inputCariKontak.addEventListener('input', () => {
        if (!areaKontak.hidden) renderKontak();
    });

    tombolTambahKontak.addEventListener('click', () => {
        formKontak.hidden = !formKontak.hidden;
        tombolTambahKontak.setAttribute('aria-expanded', String(!formKontak.hidden));
        tampilkanStatusKontak('', false);
        if (!formKontak.hidden) inputNomorKontak.focus();
    });

    inputNomorKontak.addEventListener('input', () => {
        inputNomorKontak.value = inputNomorKontak.value.replace(/[^\d+\s().-]/g, '').slice(0, 22);
    });

    formKontak.addEventListener('submit', event => {
        event.preventDefault();
        const nama = inputNamaKontak.value.trim();
        const nomor = inputNomorKontak.value.trim();
        if (!nama) {
            tampilkanStatusKontak('Nama kontak tidak boleh kosong.', true);
            inputNamaKontak.focus();
            return;
        }
        const nomorTersimpan = normalisasiNomorKontak(nomor);
        if (!nomorTersimpan) {
            tampilkanStatusKontak('Gunakan nomor lokal yang diawali 08 atau format internasional +kode negara (8–15 digit).', true);
            inputNomorKontak.focus();
            return;
        }
        const user = userDenganNomorKontak(nomorTersimpan);
        if (user && user.id === userAktif.id) {
            tampilkanStatusKontak('Kamu tidak dapat menambahkan akun sendiri.', true);
            inputNomorKontak.focus();
            return;
        }

        const sudahAda = bacaKontak().some(item => nomorDariKontak(item) === nomorTersimpan);
        const berhasil = NgumpulKontak.tambah(userAktif.id, { phone: nomorTersimpan, userId: user ? user.id : null, name: nama });
        if (!berhasil) { tampilkanStatusKontak('Kontak gagal disimpan.', true); return; }
        const pesanSukses = sudahAda ? 'Nama kontak berhasil diperbarui.' : 'Kontak berhasil disimpan di browser.';

        inputNamaKontak.value = '';
        inputNomorKontak.value = '';
        tampilkanStatusKontak(pesanSukses, false);
        renderKontak();
    });

    daftarKontak.addEventListener('click', event => {
        const tombolChatKontak = event.target.closest('[data-chat-kontak]');
        if (tombolChatKontak) {
            const item = bacaKontak().find(k => kunciKontak(k) === tombolChatKontak.dataset.chatKontak);
            const nomor = item ? nomorDariKontak(item) : '';
            const user = nomor ? userDenganNomorKontak(nomor) : null;
            if (!user) {
                tampilkanStatusKontak('Nomor ini belum terdaftar di Ngumpul, belum bisa dichat', true);
                return;
            }
            aturTampilanKontak(false);
            document.dispatchEvent(new CustomEvent('ngumpul:buka-chat', { detail: { idLawan: user.id } }));
            return;
        }

        const tombol = event.target.closest('[data-hapus-kontak]');
        if (!tombol) return;
        if (!NgumpulKontak.hapus(userAktif.id, tombol.dataset.hapusKontak)) return;
        tampilkanStatusKontak('Kontak berhasil dihapus dari browser.', false);
        renderKontak();
    });

    window.addEventListener('ngumpul:kontak-berubah', () => { if (!areaKontak.hidden) renderKontak(); });
}

