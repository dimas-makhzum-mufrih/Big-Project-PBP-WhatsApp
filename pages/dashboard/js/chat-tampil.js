let tampilArsipDM = false;

function renderChatList() {
    if (!chatScrollArea || !userAktif) return;

    const settings = window.NgumpulPreferensi?.get() || {};
    const query = (inputCariChat ? inputCariChat.value : '').trim().toLowerCase();
    const kandidat = new Map(NgumpulTeman.list().map(teman => [teman.userId, akunTeman(teman)]));
    const hasil = Array.from(kandidat.values())
        .map(user => {
            const pesan = ambilPesanTampil(user.id);
            const terakhir = pesan.at(-1);
            const preference = NgumpulDM.getPreference(user.id);
            const profil = getProfilChat(user.id);
            const diblokir = penggunaDiblokir(userAktif.id, user.id);
            const draf = diblokir ? null : bacaDrafChat(user.id);
            const unreadCount = pesan.filter(p =>
                p.sender !== userAktif.id && p.status !== 'dibaca' && !p.dihapusSemua
            ).length;
            return {
                id: user.id,
                favorite: preference.favorite,
                archived: preference.archived,
                unread: preference.markedUnread || unreadCount > 0,
                unreadCount,
                markedUnread: preference.markedUnread,
                nama: profil.nama,
                draf: Boolean(draf),
                preview: diblokir ? 'Kamu memblokir pengguna ini' : draf ? draf.teks : formatPreviewPesan(terakhir),
                adaGambar: !diblokir && !draf && isPesanBergambar(terakhir),
                waktu: draf?.waktu || (terakhir ? terakhir.time : null),
                username: profil.username,
                diblokir
            };
        })
        .filter(item => item.archived === true ? tampilArsipDM : !tampilArsipDM)
        .filter(item => tampilArsipDM || (settings.chatListFilter === 'favorites' ? item.favorite :
            settings.chatListFilter === 'unread' ? item.unread : true))
        .filter(item => item.nama.toLowerCase().includes(query) || item.username.toLowerCase().includes(query))
        .sort((a, b) => {
            if (settings.chatListSort === 'name') return a.nama.localeCompare(b.nama, 'id');
            if (settings.chatListSort === 'unread' && a.unread !== b.unread) return Number(b.unread) - Number(a.unread);
            if (a.favorite !== b.favorite) return Number(!!b.favorite) - Number(!!a.favorite);
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
            teks.textContent = tampilArsipDM ? 'Belum ada percakapan yang diarsipkan.' :
                settings.chatListFilter === 'favorites' ? 'Belum ada chat favorit.' :
                settings.chatListFilter === 'unread' ? 'Semua chat sudah dibaca.' :
                'Belum ada chat. Tambahkan teman untuk mulai ngobrol.';
            const tombol = document.createElement('button');
            tombol.type = 'button';
            tombol.className = 'contact-add-button';
            tombol.textContent = 'Tambah teman';
            tombol.addEventListener('click', () => {
                pilihTabDashboard('teman');
                const btnTambah = document.getElementById('btn-tambah-teman');
                if (btnTambah.getAttribute('aria-expanded') === 'false') btnTambah.click();
            });
            kosong.append(teks);
            if (!tampilArsipDM && !['favorites', 'unread'].includes(settings.chatListFilter)) kosong.append(tombol);
        }
        chatScrollArea.appendChild(kosong);
        return;
    }

    hasil.forEach(item => {
        const kartu = document.createElement('button');
        kartu.type = 'button';
        kartu.className = 'chat-card' + (chatAktifId === item.id ? ' aktif' : '');
        kartu.setAttribute('data-chat-id', item.id);
        const labelBelumDibaca = item.unreadCount
            ? ', ' + item.unreadCount + ' pesan belum dibaca'
            : item.markedUnread ? ', ditandai belum dibaca' : '';
        kartu.setAttribute('aria-label', 'Buka chat dengan ' + item.nama + labelBelumDibaca);

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

        const trailing = document.createElement('span');
        trailing.className = 'chat-card-trailing';
        trailing.appendChild(jam);
        if (item.unreadCount || item.markedUnread) {
            const badge = document.createElement('span');
            badge.className = 'chat-unread-badge' + (item.unreadCount ? '' : ' manual');
            badge.setAttribute('aria-hidden', 'true');
            badge.textContent = item.unreadCount ? (item.unreadCount > 99 ? '99+' : String(item.unreadCount)) : '';
            trailing.appendChild(badge);
        }

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
        } else if (item.draf) {
            const labelDraf = document.createElement('span');
            labelDraf.className = 'card-draf';
            labelDraf.textContent = 'Draf:';
            preview.append(labelDraf, document.createTextNode(' ' + item.preview));
        } else {
            preview.textContent = item.preview;
        }

        top.appendChild(judul);
        top.appendChild(trailing);
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

function renderPesanAktif(jagaGulir = false) {
    if (!boxListPesan || !chatAktifId) return;
    const sebelumnya = idPesanTerender.get(String(chatAktifId));

    const posisi = boxListPesan.scrollTop;
    const dekatBawah = boxListPesan.scrollHeight - boxListPesan.clientHeight - posisi < 90;
    boxListPesan.replaceChildren();
    const pesan = ambilPesanChat(chatAktifId);
    const target = getProfilChat(chatAktifId);

    if (!pesan.length) {
        const kosong = document.createElement('p');
        kosong.className = 'contact-empty';
        kosong.textContent = NgumpulDM.isLoaded(chatAktifId)
            ? 'Belum ada pesan dengan ' + target.nama + '. Mulai percakapan baru.'
            : 'Riwayat pesan belum dimuat.';
        boxListPesan.appendChild(kosong);
        renderPratinjauBalasan();
        return;
    }

    if (NgumpulDM.hasOlder(chatAktifId)) {
        const peer = chatAktifId;
        const older = document.createElement('button');
        older.type = 'button';
        older.className = 'dm-button dm-older';
        older.textContent = 'Muat pesan sebelumnya';
        older.addEventListener('click', () => muatPesanLamaDM(peer, older));
        boxListPesan.append(older);
    }

    pesan.forEach((item, index) => {
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
            const pesanAsli = pesan.find(pesanAsal => String(pesanAsal.id) === String(item.replyTo)) || item.quote;
            const dikutipDihapus = Boolean(pesanAsli && pesanAsli.dihapusSemua);
            const pesanDikutip = !dikutipDihapus ? pesanAsli : null;
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
                lompatKePesanDM(chatAktifId, pesanDikutip.id);
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

            img.referrerPolicy = 'no-referrer';
            img.src = item.image;

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

        if (item.attachmentId && !punyaGambar) bubble.append(buatLampiranDM(item));
        if (item.location) bubble.append(buatLokasiDM(item.location));
        if (item.poll) bubble.append(buatPollingDM(chatAktifId, item));
        if (adaTeks) {
            const text = document.createElement('span');
            if (punyaGambar) text.className = 'chat-caption-text';
            text.textContent = item.encrypted ? 'Pesan terenkripsi' : item.text;
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

        btnPin.addEventListener('click', async event => {
            event.stopPropagation();
            const peer = chatAktifId;
            btnPin.disabled = true;
            try {
                const sudah = NgumpulDM.readPins(peer).some(p => p.id === item.id);
                await NgumpulDM.pin(peer, item.id, !sudah);
            } catch (error) {
                setStatusDM(peer, NgumpulDM.label(error));
            } finally {
                btnPin.disabled = false;
            }
        });

        const btnTeruskan = document.createElement('button');
        btnTeruskan.type = 'button';
        btnTeruskan.className = 'btn-forward-message';
        btnTeruskan.dataset.teruskanPesan = String(item.id || '');
        btnTeruskan.title = item.id ? 'Teruskan pesan' : 'Pesan ini tidak dapat diteruskan';
        btnTeruskan.setAttribute('aria-label', btnTeruskan.title);
        btnTeruskan.disabled = !item.id || !!item.attachmentId;
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
            if (event.target.closest('.btn-pin-message, .chat-image-wrapper, .dm-content')) return;
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
    boxListPesan.scrollTop = jagaGulir && !dekatBawah ? posisi : boxListPesan.scrollHeight;
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

let waktuPencarianDM;
let urutanPencarianDM = 0;

function renderHasilPencarianPesan() {
    clearTimeout(waktuPencarianDM);
    const urutan = ++urutanPencarianDM;
    if (!pencarianPesanTerbuka() || !chatAktifId) return;
    const peer = chatAktifId;
    const query = inputCariPesan.value.trim();
    const status = document.createElement('p');
    status.className = 'message-search-empty';
    status.textContent = query ? 'Mencari pesan…' : 'Ketik kata kunci untuk mencari pesan.';
    hasilCariPesan.replaceChildren(status);
    if (!query) return;

    waktuPencarianDM = setTimeout(async () => {
        try {
            const hasil = await NgumpulDM.search(peer, query);
            if (urutan !== urutanPencarianDM || peer !== chatAktifId) return;
            if (!hasil.length) {
                status.textContent = 'Tidak ada pesan yang cocok.';
                return;
            }
            hasilCariPesan.replaceChildren(...hasil.map(item => {
                const tombol = document.createElement('button');
                tombol.type = 'button';
                tombol.className = 'message-search-result';
                const tanggal = document.createElement('span');
                tanggal.className = 'message-search-result-date';
                tanggal.textContent = formatTanggalPesan(item.time);
                const teks = document.createElement('span');
                tampilkanTeksPesanCocok(teks, item.encrypted ? 'Pesan terenkripsi' : ringkasanPesan(item), query);
                tombol.append(tanggal, teks);
                tombol.addEventListener('click', () => lompatKePesanDM(peer, item.id));
                return tombol;
            }));
        } catch (error) {
            if (urutan === urutanPencarianDM) status.textContent = NgumpulDM.label(error);
        }
    }, 250);
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
    if (!NgumpulTeman.get(idLawan)) return;

    const chatSebelumnya = chatAktifId;
    if (chatAktifId && chatAktifId !== idLawan) {
        batalRekamDM();
        tutupEditPesan();
        tutupPreviewGambar();
        simpanDrafChat(chatSebelumnya, inputTeksKirim.value);
        batalkanBalasanPesan(false);
        if (typeof sembunyikanToastHapus === 'function') sembunyikanToastHapus();
        // pindah chat: tutup & kosongkan pencarian pesan chat sebelumnya
        aturPencarianPesanTerbuka(false, true, false);
    }

    chatAktifId = idLawan;
    // buka chat: tampilkan lagi draf yang tadi belum terkirim
    if (inputTeksKirim && chatSebelumnya !== idLawan) {
        const draft = bacaDrafChat(idLawan);
        inputTeksKirim.value = draft?.teks || '';
        idBalasanAktif = draft?.reply || null;
        perbaruiTombolKirim();
    }
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
    const usernameHeader = document.getElementById('username-header-kanan');
    usernameHeader.textContent = target.username;
    usernameHeader.hidden = !target.username;
    perbaruiKontrolBlokir();
    if (panelInfoPengguna && panelInfoPengguna.getAttribute('aria-hidden') === 'false') tampilkanInfoPengguna();

    bukaPercakapanDM(idLawan);
    renderPesanAktif();
    renderPinPesanAktif();
    renderChatList();

    document.getElementById('panel-sisi-kiri').classList.add('room-open');
    document.getElementById('panel-sisi-kanan').classList.add('room-open');
    if (inputTeksKirim && !pencarianPesanTerbuka()) {
        inputTeksKirim.focus();
    }
}
