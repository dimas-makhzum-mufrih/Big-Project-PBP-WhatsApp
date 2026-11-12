(function () {
    const userAktif = getUserAktif();
    if (!userAktif) {
        location.replace('../auth/login.html');
        return;
    }

    const daftarKontak = document.getElementById('daftar-kontak');
    const inputCariKontak = document.getElementById('input-cari-kontak');
    const formKontak = document.getElementById('form-tambah-kontak');
    const inputNamaKontak = document.getElementById('input-nama-kontak');
    const inputNomorKontak = document.getElementById('input-nomor-kontak');
    const kodeNegaraKontak = document.getElementById('kode-negara-kontak');
    const tombolTambahKontak = document.getElementById('btn-tambah-kontak');
    const statusKontak = document.getElementById('contact-status');

    function tampilkanStatusKontak(teks, error) {
        statusKontak.textContent = teks;
        statusKontak.dataset.error = error ? 'true' : 'false';
    }

    function buatPesanKosong(teks) {
        const pesan = document.createElement('p');
        pesan.className = 'contact-empty';
        pesan.textContent = teks;
        return pesan;
    }

    // ===== Baca media profil (avatar/banner) dari localStorage =====
    const KUNCI_MEDIA = 'ngumpul_media_';
    function bacaMedia(idUser) {
        try {
            return JSON.parse(
                localStorage.getItem(KUNCI_MEDIA + idUser)
            ) || {};
        } catch (e) {
            return {};
        }
    }

    function cariPengguna(nomor) {
        const pengguna = getUsers();
        for (let i = 0; i < pengguna.length; i++) {
            if (samakanHp(pengguna[i].hp, nomor)) return pengguna[i];
        }
        return null;
    }

    function renderKontak() {
        let kontak;
        try {
            kontak = NgumpulKontakData.search(userAktif.id, inputCariKontak.value);
        } catch (error) {
            tampilkanStatusKontak(error.message || 'Daftar kontak tidak dapat dibaca.', true);
            daftarKontak.replaceChildren(buatPesanKosong('Kontak belum dapat ditampilkan.'));
            return;
        }

        const hasil = kontak.map(item => {
            const user = cariPengguna(item.phone);
            if (user && user.id === userAktif.id) return null;
            const profil = user ? getProfil(user.id) : null;
            return {
                phone: user ? user.hp : item.phone,
                name: item.name || (profil ? profil.nama : item.phone),
                user: user
            };
        })
            .filter(Boolean)
            .sort((a, b) => a.name.localeCompare(b.name, 'id'));

        daftarKontak.replaceChildren();
        if (!hasil.length) {
            daftarKontak.appendChild(buatPesanKosong(
                inputCariKontak.value.trim()
                    ? 'Kontak tidak ditemukan.'
                    : 'Belum ada kontak. Tambahkan nomor HP untuk menyimpannya di browser.'
            ));
            return;
        }

        const warnaAvatar = ['#3984bd', '#8e63aa', '#d17b45', '#368c72', '#bd5d70'];
        hasil.forEach(item => {
            const kartu = document.createElement('div');
            kartu.className = 'contact-card';

            const avatar = document.createElement('div');
            avatar.className = 'contact-avatar';

            // Cek apakah user punya foto profil (avatar) tersimpan di localStorage
            const media = item.user ? bacaMedia(item.user.id) : {};
            if (media.avatar && typeof media.avatar === 'string' && media.avatar.startsWith('data:image/')) {
                const img = document.createElement('img');
                img.src = media.avatar;
                img.alt = item.name;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '50%';
                avatar.appendChild(img);
            } else {
                avatar.textContent = item.name.trim().charAt(0).toUpperCase() || '?';
                const sumberWarna = item.user ? item.user.id : item.phone;
                let indeksWarna = 0;
                for (let i = 0; i < sumberWarna.length; i++) indeksWarna += sumberWarna.charCodeAt(i);
                avatar.style.backgroundColor = warnaAvatar[indeksWarna % warnaAvatar.length];
            }

            const detail = document.createElement('div');
            detail.className = 'contact-details';
            const nama = document.createElement('span');
            nama.className = 'contact-name';
            nama.textContent = item.name;
            const nomor = document.createElement('span');
            nomor.className = 'contact-phone';
            nomor.textContent = item.phone;
            detail.append(nama, nomor);

            const aksi = document.createElement('div');
            aksi.className = 'contact-card-actions';

            const tombolChat = document.createElement('button');
            tombolChat.className = 'contact-chat-button';
            tombolChat.type = 'button';
            tombolChat.textContent = 'Chat';
            tombolChat.setAttribute('aria-label', 'Chat dengan ' + item.name);
            tombolChat.addEventListener('click', () => {
                const user = cariPengguna(item.phone);
                if (!user) {
                    tampilkanStatusKontak('Nomor ini belum terdaftar di Ngumpul, belum bisa dichat', true);
                    return;
                }

                document.dispatchEvent(new CustomEvent('ngumpul:buka-chat', {
                    detail: { idLawan: user.id }
                }));
                if (!document.getElementById('panel-tab-kontak')) {
                    location.href = 'dashboard.html#buka-chat=' + encodeURIComponent(user.id);
                }
            });

            const tombolTelepon = document.createElement('button');
            tombolTelepon.className = 'contact-call-button';
            tombolTelepon.type = 'button';
            tombolTelepon.textContent = 'Segera hadir';
            tombolTelepon.disabled = true;
            tombolTelepon.setAttribute('aria-label', 'Telepon suara segera hadir untuk ' + item.name);

            const tombolVideo = document.createElement('button');
            tombolVideo.className = 'contact-call-button';
            tombolVideo.type = 'button';
            tombolVideo.textContent = 'Segera hadir';
            tombolVideo.disabled = true;
            tombolVideo.setAttribute('aria-label', 'Video call segera hadir untuk ' + item.name);

            const tombolHapus = document.createElement('button');
            tombolHapus.className = 'contact-remove-button';
            tombolHapus.type = 'button';
            tombolHapus.dataset.hapusKontak = item.phone;
            tombolHapus.textContent = 'Hapus';
            tombolHapus.setAttribute('aria-label', 'Hapus kontak ' + item.name);

            aksi.append(tombolChat, tombolTelepon, tombolVideo, tombolHapus);
            kartu.append(avatar, detail, aksi);
            daftarKontak.appendChild(kartu);
        });
    }

    NEGARA.forEach(negara => {
        const opsi = document.createElement('option');
        opsi.value = negara[2];
        opsi.textContent = negara[1] + ' (+' + negara[2] + ')';
        kodeNegaraKontak.appendChild(opsi);
    });
    kodeNegaraKontak.value = '62';

    tombolTambahKontak.addEventListener('click', () => {
        formKontak.hidden = !formKontak.hidden;
        tombolTambahKontak.setAttribute('aria-expanded', String(!formKontak.hidden));
        tampilkanStatusKontak('', false);
        if (!formKontak.hidden) inputNamaKontak.focus();
    });

    inputNomorKontak.addEventListener('input', () => {
        inputNomorKontak.value = inputNomorKontak.value.replace(/\D/g, '').slice(0, 15);
    });

    inputCariKontak.addEventListener('input', renderKontak);

    formKontak.addEventListener('submit', event => {
        event.preventDefault();
        const nama = inputNamaKontak.value.trim();
        const nomor = inputNomorKontak.value.trim();
        if (!nama) {
            tampilkanStatusKontak('Nama kontak tidak boleh kosong.', true);
            inputNamaKontak.focus();
            return;
        }
        const kodeNegara = kodeNegaraKontak.value;
        const angkaNomor = digitNomor(nomor, kodeNegara);
        const nomorValid = kodeNegara === '62'
            ? /^8\d{8,11}$/.test(angkaNomor)
            : /^\d{6,14}$/.test(angkaNomor);
        if (!nomorValid) {
            tampilkanStatusKontak(
                kodeNegara === '62'
                    ? 'Nomor Indonesia harus diawali 8 dan terdiri dari 9–12 digit, contoh: 81234567890.'
                    : 'Nomor HP tidak valid untuk kode negara yang dipilih.',
                true
            );
            inputNomorKontak.focus();
            return;
        }

        const phone = hpInternasional(kodeNegara, nomor);
        if (samakanHp(userAktif.hp, phone)) {
            tampilkanStatusKontak('Kamu tidak dapat menambahkan akun sendiri.', true);
            inputNomorKontak.focus();
            return;
        }

        try {
            const hasil = NgumpulKontakData.add(userAktif.id, phone, nama);
            inputNamaKontak.value = '';
            inputNomorKontak.value = '';
            tampilkanStatusKontak(
                hasil.updated ? 'Nama kontak berhasil diperbarui.' : 'Kontak berhasil disimpan di browser.',
                false
            );
            renderKontak();
        } catch (error) {
            tampilkanStatusKontak(error.message || 'Kontak gagal disimpan.', true);
        }
    });

    daftarKontak.addEventListener('click', event => {
        const tombol = event.target.closest('[data-hapus-kontak]');
        if (!tombol) return;
        try {
            if (!NgumpulKontakData.remove(userAktif.id, tombol.dataset.hapusKontak)) return;
            tampilkanStatusKontak('Kontak berhasil dihapus dari browser.', false);
            renderKontak();
        } catch (error) {
            tampilkanStatusKontak(error.message || 'Kontak gagal dihapus.', true);
        }
    });

    window.addEventListener('storage', event => {
        if (NgumpulKontakData.isContactsStorageKey(userAktif.id, event.key) ||
            event.key === 'ngumpul_users') {
            renderKontak();
        }
    });

    renderKontak();
})();
