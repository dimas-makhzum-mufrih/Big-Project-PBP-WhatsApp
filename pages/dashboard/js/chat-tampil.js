function renderChatList() {
    if (!chatScrollArea || !userAktif) return;

    const query = (inputCariChat ? inputCariChat.value : '').trim().toLowerCase();
    const daftarKontak = NgumpulKontakData && typeof NgumpulKontakData.search === 'function'
        ? NgumpulKontakData.search(userAktif.id, query)
        : [];
    const kandidat = new Map();
    daftarKontak.forEach(item => {
            const user = getUsers().find(pengguna => samakanHp(pengguna.hp, item.phone));
            if (user && user.id !== userAktif.id) kandidat.set(String(user.id), user);
        });
    const semua = bacaSemuaChat();
    getUsers().forEach(pengguna => {
        if (!pengguna || String(pengguna.id) === String(userAktif.id)) return;
        const pesan = semua[kunciKonversasi(userAktif.id, pengguna.id)];
        if (Array.isArray(pesan) && pesan.length) kandidat.set(String(pengguna.id), pengguna);
    });
    const hasil = Array.from(kandidat.values())
        .map(user => {
            const pesan = ambilPesanChat(user.id);
            const terakhir = pesan.length ? pesan[pesan.length - 1] : null;
            const profil = getProfilChat(user.id);
            const diblokir = penggunaDiblokir(userAktif.id, user.id);
            return {
                id: user.id,
                nama: profil.nama,
                preview: diblokir ? 'Kamu memblokir pengguna ini' : formatPreviewPesan(terakhir),
                adaGambar: !diblokir && isPesanBergambar(terakhir),
                waktu: terakhir ? terakhir.time : null,
                hp: user.hp,
                diblokir
            };
        })
        .filter(item => item.nama.toLowerCase().includes(query) || String(item.hp || '').includes(query))
        .sort((a, b) => {
            const waktuA = a.waktu ? new Date(a.waktu).getTime() : 0;
            const waktuB = b.waktu ? new Date(b.waktu).getTime() : 0;
            return waktuB - waktuA;
        });

    chatScrollArea.replaceChildren();

    if (!hasil.length) {
        const kosong = document.createElement('div');
        kosong.className = 'contact-empty';
        if (query) {
            kosong.textContent = 'Tidak ada chat yang cocok.';
        } else {
            const teks = document.createElement('p');
            teks.textContent = 'Belum ada chat. Tambahkan kontak untuk mulai ngobrol.';
            const tombol = document.createElement('button');
            tombol.type = 'button';
            tombol.className = 'contact-add-button';
            tombol.textContent = '+ Tambah kontak';
            tombol.addEventListener('click', () => {
                pilihTabDashboard(true);
                const btnTambah = document.getElementById('btn-tambah-kontak');
                if (btnTambah) btnTambah.click();
            });
            kosong.append(teks, tombol);
        }
        chatScrollArea.appendChild(kosong);
        return;
    }

    hasil.forEach(item => {
        const kartu = document.createElement('button');
        kartu.type = 'button';
        kartu.className = 'chat-card' + (chatAktifId === item.id ? ' aktif' : '');
        kartu.setAttribute('data-chat-id', item.id);
        kartu.setAttribute('aria-label', 'Buka chat dengan ' + item.nama);

        const avatar = document.createElement('div');
        avatar.className = 'circle-avatar';
        tampilkanAvatarChat(avatar, item.id, item.nama);

        const warna = ['#3984bd', '#8e63aa', '#d17b45', '#368c72', '#bd5d70'];
        let total = 0;
        for (let i = 0; i < item.nama.length; i++) {
            total += item.nama.charCodeAt(i);
        }
        avatar.style.backgroundColor = warna[total % warna.length];

        const meta = document.createElement('div');
        meta.className = 'card-meta';

        const top = document.createElement('div');
        top.className = 'card-top';

        const judul = document.createElement('span');
        judul.className = 'card-title';
        judul.textContent = item.nama;

        const jam = document.createElement('small');
        jam.textContent = item.waktu ? formatJamPesan(item.waktu) : '';
        jam.style.color = 'var(--teks-redup)';
        jam.style.fontSize = '.74rem';

        const preview = document.createElement('p');
        preview.className = 'card-preview';
        if (item.adaGambar) {
            // ikon SVG inline (Font Awesome Duotone itu versi Pro, tidak tampil di CDN gratis)
            const ns = 'http://www.w3.org/2000/svg';
            const ikonGambar = document.createElementNS(ns, 'svg');
            ikonGambar.setAttribute('class', 'ikon ikon-preview-gambar');
            ikonGambar.setAttribute('aria-hidden', 'true');
            const pakai = document.createElementNS(ns, 'use');
            pakai.setAttribute('href', '#i-image');
            ikonGambar.appendChild(pakai);
            preview.appendChild(ikonGambar);
            preview.appendChild(document.createTextNode(' ' + item.preview));
        } else {
            preview.textContent = item.preview;
        }

        top.appendChild(judul);
        top.appendChild(jam);
        meta.append(top, preview);
        kartu.append(avatar, meta);

        kartu.addEventListener('click', () => {
            bukaChat(item.id);
        });

        chatScrollArea.appendChild(kartu);
    });
}

// Tingkat panjang pesan (1 sampai 4). Dipakai tema (Maple Amber, Pastel Party)
// untuk mewarnai bubble milik pengirim. Pesan lawan bicara tidak diberi warna.
function tingkatPesan(item) {
    const panjang = String(item && item.text ? item.text : '').trim().length;

    if (panjang <= 30) return 1;
    if (panjang <= 80) return 2;
    if (panjang <= 160) return 3;
    return 4;
}

// id pesan yang sudah tampil per chat: hanya pesan yang benar-benar baru yang dapat animasi masuk
const idPesanTerender = new Map();

function renderPesanAktif() {
    if (!boxListPesan || !chatAktifId) return;
    const sebelumnya = idPesanTerender.get(String(chatAktifId));

    boxListPesan.replaceChildren();
    const pesan = ambilPesanChat(chatAktifId);
    const target = getProfilChat(chatAktifId);

    if (!pesan.some(item => !pesanDisembunyikan(item))) {
        const kosong = document.createElement('p');
        kosong.className = 'contact-empty';
        kosong.textContent = pesan.length
            ? 'Tidak ada pesan yang ditampilkan. Pesan baru akan muncul di sini.'
            : 'Belum ada pesan dengan ' + target.nama + '. Mulai percakapan baru.';
        boxListPesan.appendChild(kosong);
        renderPratinjauBalasan();
        return;
    }

    pesan.forEach((item, index) => {
        if (pesanDisembunyikan(item)) return; // "hapus untuk saya"
        const baris = document.createElement('div');
        baris.className = 'message-row';
        baris.classList.add(item.sender === userAktif.id ? 'kirim' : 'terima');
        baris.dataset.messageIndex = String(index);
        baris.dataset.messageId = String(item.id || '');
        if (sebelumnya && !sebelumnya.has(String(item.id))) baris.classList.add('pesan-baru');

        if (item.dihapusSemua) {
            const dariSaya = String(item.sender) === String(userAktif.id);
            const bubbleHapus = document.createElement('div');
            bubbleHapus.className = 'chat-bubble pesan-dihapus ' + (dariSaya ? 'kirim' : 'terima');

            const ns = 'http://www.w3.org/2000/svg';
            const ikon = document.createElementNS(ns, 'svg');
            ikon.setAttribute('class', 'ikon-pesan-dihapus');
            ikon.setAttribute('viewBox', '0 0 24 24');
            ikon.setAttribute('aria-hidden', 'true');
            const lingkaran = document.createElementNS(ns, 'circle');
            lingkaran.setAttribute('cx', '12');
            lingkaran.setAttribute('cy', '12');
            lingkaran.setAttribute('r', '9');
            const garis = document.createElementNS(ns, 'path');
            garis.setAttribute('d', 'M5.6 5.6l12.8 12.8');
            ikon.append(lingkaran, garis);

            const isi = document.createElement('span');
            isi.className = 'pesan-dihapus-isi';
            isi.append(ikon, document.createTextNode(
                dariSaya ? 'Kamu menghapus pesan ini' : 'Pesan ini telah dihapus'
            ));

            const waktuHapus = document.createElement('span');
            waktuHapus.className = 'timestamp';
            waktuHapus.textContent = formatJamPesan(item.time);
            const footerHapus = document.createElement('div');
            footerHapus.className = 'message-footer';
            footerHapus.appendChild(waktuHapus);

            bubbleHapus.append(isi, footerHapus);
            baris.appendChild(bubbleHapus);
            boxListPesan.appendChild(baris);
            return;
        }

        const punyaGambar = isPesanBergambar(item);
        const teksIsi = String(item.text || '').trim();
        const adaTeks = Boolean(teksIsi);

        const bubble = document.createElement('div');
        bubble.className =
            'chat-bubble ' +
            (item.sender === userAktif.id ? 'kirim' : 'terima') +
            (punyaGambar ? ' ada-gambar' : '') +
            (punyaGambar && !adaTeks ? ' hanya-gambar' : '');

        if (item.sender === userAktif.id) {
            bubble.tabIndex = 0;
            bubble.setAttribute('aria-haspopup', 'menu');
            bubble.setAttribute('aria-controls', 'menu-edit-pesan');
        }
        if (item.forwarded) {
            const labelTeruskan = document.createElement('span');
            labelTeruskan.className = 'message-forwarded-label';
            labelTeruskan.textContent = 'Diteruskan';
            bubble.appendChild(labelTeruskan);
        }

        // Atribut untuk tema: hanya pesan keluar yang berwarna
        if (item.sender === userAktif.id) {
            bubble.dataset.tingkat = String(tingkatPesan(item));
        }

        if (item.replyTo) {
            const pesanAsli = pesan.find(pesanAsal => String(pesanAsal.id) === String(item.replyTo));
            const dikutipDihapus = Boolean(pesanAsli && pesanAsli.dihapusSemua);
            const pesanDikutip = pesanAsli && !dikutipDihapus && !pesanDisembunyikan(pesanAsli) ? pesanAsli : null;
            const kutipan = document.createElement('button');
            kutipan.type = 'button';
            kutipan.className = 'message-quoted-message' + (pesanDikutip ? '' : ' hilang');
            const pengirimKutipan = document.createElement('strong');
            const teksKutipan = document.createElement('span');
            if (pesanDikutip) {
                pengirimKutipan.textContent = namaPengirimPesan(pesanDikutip);
                teksKutipan.textContent = ringkasanPesan(pesanDikutip);
                kutipan.setAttribute('aria-label', 'Lompat ke pesan dari ' + pengirimKutipan.textContent);
            } else {
                pengirimKutipan.textContent = 'Pesan asli';
                teksKutipan.textContent = dikutipDihapus ? 'Pesan ini telah dihapus' : 'Pesan tidak tersedia';
            }
            kutipan.append(pengirimKutipan, teksKutipan);
            kutipan.addEventListener('click', event => {
                event.stopPropagation();
                if (!pesanDikutip) return;
                const barisAsal = [...boxListPesan.children]
                    .find(barisPesan => String(barisPesan.dataset.messageId) === String(pesanDikutip.id));
                if (!barisAsal) return;
                barisAsal.scrollIntoView({ block: 'center', behavior: 'smooth' });
                barisAsal.classList.remove('ba-sorot');
                void barisAsal.offsetWidth;
                barisAsal.classList.add('ba-sorot');
                window.setTimeout(() => barisAsal.classList.remove('ba-sorot'), 1400);
            });
            bubble.appendChild(kutipan);
        }

        if (punyaGambar) {
            const bungkusGambar = document.createElement('div');
            bungkusGambar.className = 'chat-image-wrapper';
            bungkusGambar.setAttribute('role', 'button');
            bungkusGambar.setAttribute('tabindex', '0');
            bungkusGambar.setAttribute('aria-label', 'Lihat gambar ukuran penuh');

            const img = document.createElement('img');
            img.className = 'chat-image';
            img.alt = adaTeks ? teksIsi : 'Gambar obrolan';
            img.loading = 'lazy';

            const urlCache = item.imageId ? cacheUrlGambar.get(item.imageId) : '';
            if (urlCache) {
                img.src = urlCache;
            } else if (item.image) {
                img.src = item.image;
            }

            if (item.imageId) {
                ambilGambarIdb(item.imageId).then(urlPenuh => {
                    if (urlPenuh && img.src !== urlPenuh) {
                        img.src = urlPenuh;
                    }
                });
            }

            bungkusGambar.addEventListener('click', () => {
                bukaLightboxGambar(item.id);
            });
            bungkusGambar.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    bukaLightboxGambar(item.id);
                }
            });

            bungkusGambar.appendChild(img);
            bubble.appendChild(bungkusGambar);
        }

        if (adaTeks || !punyaGambar) {
            const text = document.createElement('span');
            if (punyaGambar) text.className = 'chat-caption-text';
            text.textContent = item.text || '';
            bubble.appendChild(text);
        }

        const btnPin = document.createElement('button');
        btnPin.type = 'button';
        btnPin.className = 'btn-pin-message';
        btnPin.title = 'Sematkan pesan';
        btnPin.setAttribute('aria-label', 'Sematkan pesan');

        const nsPin = 'http://www.w3.org/2000/svg';
        const ikonPin = document.createElementNS(nsPin, 'svg');
        ikonPin.setAttribute('class', 'ikon ikon-pin');
        ikonPin.setAttribute('aria-hidden', 'true');
        const pakaiPin = document.createElementNS(nsPin, 'use');
        pakaiPin.setAttribute('href', '#i-sematkan');
        ikonPin.appendChild(pakaiPin);
        btnPin.appendChild(ikonPin);

        btnPin.addEventListener('click', () => {
            // klik lagi pada pesan yang sedang disematkan = lepas sematan
            const sudahTersemat = ambilPinPesan(chatAktifId) === item.id;
            const berhasil = sudahTersemat
                ? hapusPinPesan(chatAktifId)
                : simpanPinPesan(chatAktifId, item.id);
            if (berhasil) {
                renderPinPesanAktif();
            }
        });

        const btnTeruskan = document.createElement('button');
        btnTeruskan.type = 'button';
        btnTeruskan.className = 'btn-forward-message';
        btnTeruskan.dataset.teruskanPesan = String(item.id || '');
        btnTeruskan.title = item.id ? 'Teruskan pesan' : 'Pesan ini tidak dapat diteruskan';
        btnTeruskan.setAttribute('aria-label', btnTeruskan.title);
        btnTeruskan.disabled = !item.id;
        const ikonTeruskan = document.createElement('img');
        ikonTeruskan.className = 'forward-message-icon';
        ikonTeruskan.src = '../../assets/img/forward-message.png';
        ikonTeruskan.alt = '';
        ikonTeruskan.setAttribute('aria-hidden', 'true');
        btnTeruskan.appendChild(ikonTeruskan);

        const footer = document.createElement('div');
        footer.className = 'message-footer';
        if (item.editedAt) {
            const diedit = document.createElement('span');
            diedit.className = 'message-edited';
            diedit.textContent = 'Diedit';
            footer.appendChild(diedit);
        }
        const waktu = document.createElement('span');
        waktu.className = 'timestamp';
        waktu.textContent = formatJamPesan(item.time);
        footer.appendChild(waktu);
        if (item.sender === userAktif.id) {
            footer.appendChild(buatIndikatorStatusPesan(item.status));
        }
        bubble.appendChild(btnPin);
        bubble.appendChild(footer);

        // Membungkus bubble dengan tombol pemicu dan badge reaksi pesan.
        const kontenPesan = document.createElement('div');
        kontenPesan.className = 'message-content';
        kontenPesan.appendChild(bubble);
        bubble.addEventListener('click', event => {
            if (event.target.closest('.btn-pin-message, .chat-image-wrapper')) return;
            event.stopPropagation();
            tampilkanReaksiPesanPicker(item.id, kontenPesan);
        });

        // Membuat tombol untuk membuka pilihan reaksi pada pesan ini.
        const tombolReaksi = document.createElement('button');
        tombolReaksi.type = 'button';
        tombolReaksi.className = 'btn-react-trigger';
        tombolReaksi.title = 'Beri reaksi';
        tombolReaksi.setAttribute('aria-label', 'Beri reaksi pada pesan');
        const nsSvg = 'http://www.w3.org/2000/svg';
        const ikonReaksi = document.createElementNS(nsSvg, 'svg');
        ikonReaksi.setAttribute('viewBox', '0 0 64 64');
        ikonReaksi.setAttribute('aria-hidden', 'true');
        ikonReaksi.classList.add('ikon-reaksi-pesan');
        const bentukBalon = document.createElementNS(nsSvg, 'path');
        bentukBalon.setAttribute(
            'd',
            'M32 5C17.1 5 5 16.9 5 31.7c0 5.4 1.6 10.5 4.4 14.8L6 58l12.4-3.8c4.1 2.3 8.7 3.5 13.6 3.5 14.9 0 27-11.8 27-26S46.9 5 32 5Z'
        );
        bentukBalon.classList.add('ikon-reaksi-latar');
        ikonReaksi.appendChild(bentukBalon);
        [22, 42].forEach(posisiX => {
            const mata = document.createElementNS(nsSvg, 'circle');
            mata.setAttribute('cx', String(posisiX));
            mata.setAttribute('cy', '27');
            mata.setAttribute('r', '3.5');
            mata.classList.add('ikon-reaksi-wajah');
            ikonReaksi.appendChild(mata);
        });
        const senyum = document.createElementNS(nsSvg, 'path');
        senyum.setAttribute('d', 'M20 36h24c-.8 7-5.3 11-12 11s-11.2-4-12-11Z');
        senyum.classList.add('ikon-reaksi-wajah');
        ikonReaksi.appendChild(senyum);
        tombolReaksi.appendChild(ikonReaksi);
        tombolReaksi.addEventListener('click', event => {
            event.stopPropagation();
            tampilkanReaksiPesanPicker(item.id, kontenPesan);
        });
        kontenPesan.appendChild(tombolReaksi);

        // Menampilkan badge reaksi yang sudah tersimpan pada pesan.
        const reaksiPesan = ambilReaksiPesan(chatAktifId, item.id);
        const barReaksi = buatBarReaksiPesan(reaksiPesan, chatAktifId, item.id);
        if (barReaksi) kontenPesan.appendChild(barReaksi);

        baris.appendChild(kontenPesan);
        baris.appendChild(btnTeruskan);
        boxListPesan.appendChild(baris);
    });

    idPesanTerender.set(String(chatAktifId), new Set(pesan.map(item => String(item.id))));
    boxListPesan.scrollTop = boxListPesan.scrollHeight;
    renderPratinjauBalasan();
}

// ===== Cari pesan di dalam chat =====
function formatTanggalPesan(isoString) {
    const waktu = new Date(isoString);
    if (Number.isNaN(waktu.getTime())) return '';
    return waktu.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function tampilkanTeksPesanCocok(container, teks, query) {
    const posisi = teks.toLowerCase().indexOf(query);
    if (posisi < 0) {
        container.textContent = teks;
        return;
    }

    container.append(
        document.createTextNode(teks.slice(0, posisi)),
        Object.assign(document.createElement('mark'), {
            textContent: teks.slice(posisi, posisi + query.length)
        }),
        document.createTextNode(teks.slice(posisi + query.length))
    );
}

function pencarianPesanTerbuka() {
    return Boolean(panelCariPesan && panelCariPesan.classList.contains('terbuka'));
}

function renderHasilPencarianPesan() {
    if (!hasilCariPesan || !inputCariPesan || !chatAktifId) return;

    hasilCariPesan.replaceChildren();
    const query = inputCariPesan.value.trim().toLowerCase();
    if (!query) {
        const kosong = document.createElement('p');
        kosong.className = 'message-search-empty';
        kosong.textContent = 'Ketik kata kunci untuk mencari pesan.';
        hasilCariPesan.appendChild(kosong);
        return;
    }

    const hasil = ambilPesanChat(chatAktifId)
        .map((item, index) => ({ item: item, index: index }))
        .filter(entry => !pesanDisembunyikan(entry.item) && !entry.item.dihapusSemua &&
            String(entry.item.text || '').toLowerCase().includes(query))
        .reverse();

    if (!hasil.length) {
        const kosong = document.createElement('p');
        kosong.className = 'message-search-empty';
        kosong.textContent = 'Tidak ada pesan yang cocok dengan kata kunci tersebut.';
        hasilCariPesan.appendChild(kosong);
        return;
    }

    hasil.forEach(entry => {
        const tombol = document.createElement('button');
        tombol.type = 'button';
        tombol.className = 'message-search-result';
        tombol.dataset.messageIndex = String(entry.index);

        const tanggal = document.createElement('span');
        tanggal.className = 'message-search-result-date';
        tanggal.textContent = formatTanggalPesan(entry.item.time);

        const teks = document.createElement('span');
        tampilkanTeksPesanCocok(teks, String(entry.item.text || ''), query);
        tombol.append(tanggal, teks);
        tombol.addEventListener('click', () => {
            renderPesanAktif();
            const pesanTarget = boxListPesan.querySelector(
                '[data-message-index="' + entry.index + '"]'
            );
            if (pesanTarget) {
                boxListPesan.querySelectorAll('.message-row.pesan-cari-terpilih')
                    .forEach(item => item.classList.remove('pesan-cari-terpilih'));
                if (timerSorotPesanCari) window.clearTimeout(timerSorotPesanCari);
                pesanTarget.classList.add('pesan-cari-terpilih');
                pesanTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
                timerSorotPesanCari = window.setTimeout(() => {
                    pesanTarget.classList.remove('pesan-cari-terpilih');
                    timerSorotPesanCari = null;
                }, 1000);
            }
        });
        hasilCariPesan.appendChild(tombol);
    });
}

function aturPencarianPesanTerbuka(terbuka, kosongkanQuery, fokus) {
    if (!panelCariPesan || !btnToggleCariPesan || !inputCariPesan) return;

    panelCariPesan.classList.toggle('terbuka', terbuka);
    if (panelChatAktif) {
        panelChatAktif.classList.toggle('pencarian-pesan-terbuka', terbuka);
    }
    panelCariPesan.setAttribute('aria-hidden', String(!terbuka));
    btnToggleCariPesan.setAttribute('aria-expanded', String(terbuka));
    if (kosongkanQuery !== false) inputCariPesan.value = '';
    renderHasilPencarianPesan();
    if (terbuka && fokus !== false) inputCariPesan.focus();
}

function bukaChat(idLawan) {
    if (!idLawan || !userAktif) return;
    if (!getUserById(idLawan) || String(idLawan) === String(userAktif.id)) return;

    if (chatAktifId && chatAktifId !== idLawan) {
        tutupEditPesan();
        tutupPreviewGambar();
        batalkanBalasanPesan();
        if (typeof sembunyikanToastHapus === 'function') sembunyikanToastHapus();
        // pindah chat: tutup & kosongkan pencarian pesan chat sebelumnya
        aturPencarianPesanTerbuka(false, true, false);
    }

    chatAktifId = idLawan;
    tutupPanelLampiran();
    const target = getProfilChat(idLawan);

    if (panelChatKosong) panelChatKosong.style.display = 'none';
    if (panelChatAktif) panelChatAktif.style.display = 'flex';

    if (avatarHeaderKanan) {
        tampilkanAvatarChat(avatarHeaderKanan, idLawan, target.nama);
        avatarHeaderKanan.style.backgroundColor = '#3984bd';
    }

    if (namaHeaderKanan) {
        namaHeaderKanan.textContent = target.nama;
    }
    const nomorHeader = document.getElementById('nomor-header-kanan');
    if (nomorHeader) {
        const namaAkunLawan = String(getProfil(idLawan).nama || '').trim();
        nomorHeader.textContent = namaKontakTersimpan(idLawan)
            ? (target.hp || 'Nomor tidak tersedia')
            : (namaAkunLawan ? '~ ' + namaAkunLawan : '');
        nomorHeader.hidden = !nomorHeader.textContent;
    }
    perbaruiKontrolBlokir();
    perbaruiKontrolKontak();
    if (panelInfoPengguna && panelInfoPengguna.getAttribute('aria-hidden') === 'false') tampilkanInfoPengguna();

    tandaiPesanDiterima(idLawan);
    tandaiPesanDibaca(idLawan);
    renderPesanAktif();
    renderPinPesanAktif();
    renderChatList();

    document.getElementById('panel-sisi-kiri').classList.add('room-open');
    document.getElementById('panel-sisi-kanan').classList.add('room-open');
    if (inputTeksKirim && !pencarianPesanTerbuka()) {
        inputTeksKirim.focus();
    }
}
