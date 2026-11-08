// ===== Penjaga: harus login dulu =====
const userAktif = getUserAktif();
if (!userAktif) { location.replace('../auth/login.html'); }

// ===== Elemen utama =====
const triggerMenuUtama = document.getElementById('trigger-menu-utama'),
    boxDropdownUtama = document.getElementById('box-dropdown-utama'),
    optBukaSetelan = document.getElementById('opt-buka-setelan'),
    panelLayerSetelan = document.getElementById('panel-layer-setelan'),
    btnKembaliKeChat = document.getElementById('btn-kembali-ke-chat');

// ===== Menu titik tiga =====
triggerMenuUtama.addEventListener('click', e => {
    e.stopPropagation();
    boxDropdownUtama.style.display = boxDropdownUtama.style.display === 'none' ? 'block' : 'none';
});
document.addEventListener('click', () => { boxDropdownUtama.style.display = 'none'; });

// ===== Panel Pengaturan =====
function bukaSetelan() {
    panelLayerSetelan.style.display = 'flex';
    // untuk layar mobile: panel ada di dalam .sisi-kanan yang disembunyikan CSS
    document.getElementById('panel-sisi-kiri').classList.add('room-open');
    document.getElementById('panel-sisi-kanan').classList.add('room-open');
    function bukaSetelan() {
    panelLayerSetelan.style.display = 'flex';
    // untuk layar mobile: panel ada di dalam .sisi-kanan yang disembunyikan CSS
    document.getElementById('panel-sisi-kiri').classList.add('room-open');
    document.getElementById('panel-sisi-kanan').classList.add('room-open');
    perbaruiEfekKartuProfil(); // <-- BARIS BARU
}
}
function tutupSetelan() {
    panelLayerSetelan.style.display = 'none';
    document.getElementById('panel-sisi-kiri').classList.remove('room-open');
    document.getElementById('panel-sisi-kanan').classList.remove('room-open');
    // bersihkan hash supaya refresh tidak membuka panel lagi
    history.replaceState(null, '', location.pathname + location.search);
}

optBukaSetelan.addEventListener('click', () => {
    bukaSetelan();
    boxDropdownUtama.style.display = 'none';
});
btnKembaliKeChat.addEventListener('click', tutupSetelan);

// buka otomatis jika datang dari halaman lain dengan #settings
if (location.hash === '#settings') bukaSetelan();

// ===== Keluar akun: hanya menghapus sesi tab ini, data akun tetap aman =====
document.getElementById('btn-keluar-akun').addEventListener('click', () => {
    hapusSesi();
    window.location.href = '../auth/login.html';
});

// ===== Menu "Akun" -> halaman akun =====
const btnMenuAkun = document.querySelector('.settings-row-item[data-fitur="akun"]');
if (btnMenuAkun) {
    btnMenuAkun.style.cursor = 'pointer';
    btnMenuAkun.addEventListener('click', () => {
        window.location.href = '../account/account.html';
    });
}

// ===== Kartu "Edit Profil" -> halaman edit-profile =====
document.addEventListener('click', (e) => {
    const targetEdit = e.target.closest('[data-fitur="edit-profil"], #btn-buka-edit-profil, .profile-card-trigger');
    if (targetEdit) {
        window.location.href = '../profile/edit-profile.html';
    }
});

// ===== Isi kartu profil dengan data AKUN YANG SEDANG LOGIN =====
// ===== Foto profil hasil crop & banner (disimpan di localStorage oleh halaman Edit Profil) =====
const KUNCI_MEDIA = 'ngumpul_media_';
function bacaMedia(idUser) {
    try { return JSON.parse(localStorage.getItem(KUNCI_MEDIA + idUser)) || {}; }
    catch (e) { return {}; }
}

// ===== Isi kartu profil dengan data AKUN YANG SEDANG LOGIN =====
if (userAktif) {
    const profil = getProfil(userAktif.id);
    const kartu = document.getElementById('btn-buka-edit-profil');
    if (kartu) {
        const elemNama = kartu.querySelector('#setting-display-name') || kartu.querySelector('b');
        const elemUsername = kartu.querySelector('#setting-display-username') || kartu.querySelector('.profil-username');
        const elemBio = kartu.querySelector('#setting-display-bio') || kartu.querySelector('.profil-bio');
        
        if (elemNama) elemNama.textContent = profil.nama;
        if (elemUsername) elemUsername.textContent = profil.username;
        if (elemBio) elemBio.textContent = profil.bio || 'Mahasiswa Teknik Informatika';

        // Ambil data gambar (avatar & banner) dari localStorage
        const media = bacaMedia(userAktif.id);
        
        // 1. Render Avatar / Foto Profil di Dashboard
        const imgAvatarOutput = document.getElementById('setting-img-avatar-output');
        const defaultUserIcon = document.getElementById('setting-default-user-icon') || kartu.querySelector('.settings-default-user-icon');
        if (media.avatar && typeof media.avatar === 'string' && media.avatar.startsWith('data:image/')) {
            if (imgAvatarOutput) {
                imgAvatarOutput.src = media.avatar;
                imgAvatarOutput.style.display = 'block';
            }
            if (defaultUserIcon) {
                defaultUserIcon.style.display = 'none';
            }
        }

        // 2. Render Banner di Dashboard
        const bannerPreview = document.getElementById('setting-banner-preview');
        if (media.banner && typeof media.banner === 'string' && media.banner.startsWith('data:image/')) {
            if (bannerPreview) {
                bannerPreview.style.backgroundImage = 'url("' + media.banner + '")';
                bannerPreview.style.backgroundSize = 'cover';
                bannerPreview.style.backgroundPosition = 'center';
            }
        }
    }

    // isi menu ganti akun
    const mNama = document.getElementById('akun-menu-nama');
    const mUser = document.getElementById('akun-menu-username');
    if (mNama) mNama.textContent = profil.nama;
    if (mUser) mUser.textContent = profil.username;
}

// kartu juga bisa dibuka lewat keyboard (Enter / Spasi)
const kartuProfil = document.getElementById('btn-buka-edit-profil');
if (kartuProfil) {
    kartuProfil.addEventListener('keydown', (e) => {
        if (e.target !== kartuProfil) return; // abaikan tombol di dalam kartu (panah v)
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            window.location.href = '../profile/edit-profile.html';
        }
    });
}

// Buang draft Edit Profil yang belum disimpan
try { sessionStorage.removeItem('draft_profil_edit'); } catch (e) {}

// ===== Kontak tersimpan per akun =====
if (userAktif) {
    const KEY_KONTAK = 'ngumpul_kontak_';
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

    function bacaKontak() {
        try {
            const data = localStorage.getItem(KEY_KONTAK + userAktif.id);
            if (!data) return [];
            const daftar = JSON.parse(data);
            if (!Array.isArray(daftar)) throw new Error('Format daftar kontak tidak valid.');
            return daftar.filter(item =>
                typeof item === 'string' ||
                (item && typeof item.phone === 'string')
            );
        } catch (error) {
            tampilkanStatusKontak('Daftar kontak tidak dapat dibaca dari penyimpanan lokal.', true);
            return null;
        }
    }

    function normalisasiNomorKontak(nomor) {
        const nomorBersih = String(nomor || '').replace(/[^\d+]/g, '');
        if (nomorBersih.startsWith('+')) return '+' + nomorBersih.slice(1).replace(/\D/g, '');
        if (nomorBersih.startsWith('00')) return '+' + nomorBersih.slice(2).replace(/\D/g, '');
        if (nomorBersih.startsWith('0')) return '+62' + nomorBersih.slice(1).replace(/\D/g, '');
        if (nomorBersih.startsWith('62')) return '+' + nomorBersih;
        return '+62' + nomorBersih.replace(/\D/g, '');
    }

    function nomorDariKontak(item) {
        if (typeof item === 'string') {
            const user = getUserById(item);
            return user ? normalisasiNomorKontak(user.hp) : '';
        }
        return normalisasiNomorKontak(item.phone);
    }

    function userDenganNomorKontak(nomor) {
        const pengguna = getUsers();
        for (let i = 0; i < pengguna.length; i++) {
            if (samakanHp(pengguna[i].hp, nomor)) return pengguna[i];
        }
        return null;
    }

    function kunciKontak(item) {
        return typeof item === 'string' ? 'id:' + item : 'phone:' + nomorDariKontak(item);
    }

    function simpanKontak(daftar) {
        try {
            localStorage.setItem(KEY_KONTAK + userAktif.id, JSON.stringify(daftar));
            return true;
        } catch (error) {
            tampilkanStatusKontak('Kontak gagal disimpan. Periksa ruang penyimpanan browser.', true);
            return false;
        }
    }

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
                phone: profil && profil.phone ? profil.phone : phone
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
            tombolTelepon.textContent = 'Telepon';
            tombolTelepon.setAttribute('aria-label', 'Telepon suara ' + item.nama);

            const tombolVideo = document.createElement('button');
            tombolVideo.className = 'contact-call-button';
            tombolVideo.type = 'button';
            tombolVideo.textContent = 'Video call';
            tombolVideo.setAttribute('aria-label', 'Video call ' + item.nama);

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
        inputNomorKontak.value = inputNomorKontak.value.replace(/\D/g, '').slice(0, 15);
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
        const jumlahDigit = nomor.replace(/\D/g, '').length;
        if (!/^\d{8,15}$/.test(nomor) || jumlahDigit < 8 || jumlahDigit > 15) {
            tampilkanStatusKontak('Masukkan nomor HP yang valid (8–15 digit).', true);
            inputNomorKontak.focus();
            return;
        }

        const nomorTersimpan = normalisasiNomorKontak(nomor);
        const user = userDenganNomorKontak(nomorTersimpan);
        if (user && user.id === userAktif.id) {
            tampilkanStatusKontak('Kamu tidak dapat menambahkan akun sendiri.', true);
            inputNomorKontak.focus();
            return;
        }

        const daftar = bacaKontak();
        if (daftar === null) return;
        const indexSudahAda = daftar.findIndex(item =>
            (user && typeof item === 'string' && item === user.id) ||
            nomorDariKontak(item) === nomorTersimpan
        );
        const kontakBaru = { phone: nomorTersimpan, userId: user ? user.id : null, name: nama };
        let pesanSukses = 'Kontak berhasil disimpan di browser.';
        if (indexSudahAda !== -1) {
            daftar[indexSudahAda] = kontakBaru;
            pesanSukses = 'Nama kontak berhasil diperbarui.';
        } else {
            daftar.push(kontakBaru);
        }
        if (!simpanKontak(daftar)) return;

        inputNamaKontak.value = '';
        inputNomorKontak.value = '';
        tampilkanStatusKontak(pesanSukses, false);
        renderKontak();
    });

    daftarKontak.addEventListener('click', event => {
        const tombolChatKontak = event.target.closest('[data-chat-kontak]');
        if (tombolChatKontak) {
            aturTampilanKontak(false);
            return;
        }

        const tombol = event.target.closest('[data-hapus-kontak]');
        if (!tombol) return;
        const daftar = bacaKontak();
        if (daftar === null) return;
        const daftarBaru = daftar.filter(item => kunciKontak(item) !== tombol.dataset.hapusKontak);
        if (daftarBaru.length === daftar.length) return;
        if (!simpanKontak(daftarBaru)) return;
        tampilkanStatusKontak('Kontak berhasil dihapus dari browser.', false);
        renderKontak();
    });

    window.addEventListener('storage', event => {
        if (event.key === KEY_KONTAK + userAktif.id && !areaKontak.hidden) renderKontak();
    });
}

// ===== Panah (v) di kartu profil: menu ganti akun =====
const btnGantiAkun = document.getElementById('btn-ganti-akun');
const menuGantiAkun = document.getElementById('menu-ganti-akun');

function tutupMenuGantiAkun() {
    if (!menuGantiAkun) return;
    menuGantiAkun.hidden = true;
    if (btnGantiAkun) btnGantiAkun.setAttribute('aria-expanded', 'false');
}
if (btnGantiAkun && menuGantiAkun) {
    btnGantiAkun.addEventListener('click', (e) => {
        e.stopPropagation(); // jangan ikut membuka halaman Edit Profil
        const buka = menuGantiAkun.hidden;
        menuGantiAkun.hidden = !buka;
        btnGantiAkun.setAttribute('aria-expanded', String(buka));
    });
    // klik di luar menu = tutup
    document.addEventListener('click', (e) => {
        if (!menuGantiAkun.contains(e.target)) tutupMenuGantiAkun();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') tutupMenuGantiAkun();
    });
    // beralih akun: akhiri sesi tab ini lalu masuk dengan akun lain
    document.getElementById('btn-masuk-akun-lain').addEventListener('click', () => {
        hapusSesi();
        window.location.href = '../auth/login.html';
    });
}


// ===== Efek scroll KHUSUS kartu profil =====
// Kartu ada di paling atas daftar pengaturan: saat digulir ke bawah ia memudar & hilang,
// saat digulir ke atas muncul lagi. Menu pengaturan di bawahnya tidak disentuh.
function perbaruiEfekKartuProfil() {
    const profilAtas = document.getElementById('profil-atas');
    const daftar = document.querySelector('.settings-list-flow');
    if (!profilAtas || !daftar) return;
    const tinggi = profilAtas.offsetHeight || 1;
    const p = Math.min(Math.max(daftar.scrollTop / tinggi, 0), 1); // 0 = terlihat, 1 = hilang
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        profilAtas.style.opacity = p >= 1 ? '0' : '1';
        profilAtas.style.transform = '';
    } else {
        profilAtas.style.opacity = String(1 - p);
        profilAtas.style.transform = 'scale(' + (1 - 0.05 * p) + ')';
    }
    profilAtas.style.pointerEvents = p >= 0.9 ? 'none' : '';
    if (p >= 0.9) tutupMenuGantiAkun();
}

let sedangMenjadwalkan = false;
const daftarSetelanScroll = document.querySelector('.settings-list-flow');
if (daftarSetelanScroll) {
    daftarSetelanScroll.addEventListener('scroll', () => {
        if (sedangMenjadwalkan) return;
        sedangMenjadwalkan = true;
        requestAnimationFrame(() => {
            sedangMenjadwalkan = false;
            perbaruiEfekKartuProfil();
        });
    }, { passive: true });
}