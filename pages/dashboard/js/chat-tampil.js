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

function renderPesanAktif() {
    if (!boxListPesan || !chatAktifId) return;

    boxListPesan.replaceChildren();
    const pesan = ambilPesanChat(chatAktifId);
    const target = getProfilChat(chatAktifId);

    if (!pesan.length) {
        const kosong = document.createElement('p');
        kosong.className = 'contact-empty';
        kosong.textContent = 'Belum ada pesan dengan ' + target.nama + '. Mulai percakapan baru.';
        boxListPesan.appendChild(kosong);
        return;
    }

    pesan.forEach((item, index) => {
        const baris = document.createElement('div');
        baris.className = 'message-row';
        baris.classList.add(item.sender === userAktif.id ? 'kirim' : 'terima');
        baris.dataset.messageIndex = String(index);
        baris.dataset.messageId = item.id;

        const punyaGambar = isPesanBergambar(item);
        const teksIsi = String(item.text || '').trim();
        const adaTeks = Boolean(teksIsi);

        const bubble = document.createElement('div');
        bubble.className =
            'chat-bubble ' +
            (item.sender === userAktif.id ? 'kirim' : 'terima') +
            (punyaGambar ? ' ada-gambar' : '') +
            (punyaGambar && !adaTeks ? ' hanya-gambar' : '');

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

        const waktu = document.createElement('span');
        waktu.className = 'timestamp';
        waktu.textContent = formatJamPesan(item.time);

        bubble.appendChild(btnPin);
        const footer = document.createElement('div');
        footer.className = 'message-footer';
        footer.appendChild(waktu);
        if (item.sender === userAktif.id) {
            footer.appendChild(buatIndikatorStatusPesan(item.status));
        }
        bubble.appendChild(footer);
        baris.appendChild(bubble);
        boxListPesan.appendChild(baris);
    });

    boxListPesan.scrollTop = boxListPesan.scrollHeight;
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
        .filter(entry => String(entry.item.text || '').toLowerCase().includes(query))
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
        tutupPreviewGambar();
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
