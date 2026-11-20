const dialogTeruskanPesan = document.getElementById('dialog-teruskan-pesan');
const formTeruskanPesan = document.getElementById('form-teruskan-pesan');
const inputCariTujuanTeruskan = document.getElementById('input-cari-tujuan-teruskan');
const daftarTujuanTeruskan = document.getElementById('daftar-tujuan-teruskan');
const statusDaftarTujuan = document.getElementById('status-daftar-tujuan');
const btnKonfirmasiTeruskan = document.getElementById('btn-konfirmasi-teruskan-pesan');
const btnTutupTeruskanPesan = document.getElementById('btn-tutup-teruskan-pesan');
const btnBatalTeruskanPesan = document.getElementById('btn-batal-teruskan-pesan');

let pesanUntukDiteruskan = null;
let pemicuDialogTeruskan = null;
let urutanRenderTujuan = 0;
let tombolAksiPesanAktif = null;
let barisAksiPesanAktif = null;
let timerTekanLamaPesan = null;
let pointerTekanLamaPesan = null;
let titikAwalTekanLamaPesan = null;

function batalkanTekanLamaPesan() {
    if (timerTekanLamaPesan !== null) {
        window.clearTimeout(timerTekanLamaPesan);
    }
    timerTekanLamaPesan = null;
    pointerTekanLamaPesan = null;
    titikAwalTekanLamaPesan = null;
}

function sembunyikanTindakanPesan(tombol) {
    const target = tombol || tombolAksiPesanAktif;
    if (!target) return;

    if (document.activeElement === target) target.blur();
    target.classList.remove('aksi-pesan-terbuka');
    target.style.left = '';
    target.style.top = '';
    if (tombolAksiPesanAktif === target) {
        tombolAksiPesanAktif = null;
        barisAksiPesanAktif = null;
    }
}

function posisikanTindakanPesan(tombol, baris) {
    if (!tombol || !baris || !baris.isConnected) {
        sembunyikanTindakanPesan(tombol);
        return;
    }

    const bubble = baris.querySelector('.chat-bubble');
    if (!bubble) {
        sembunyikanTindakanPesan(tombol);
        return;
    }

    const areaPesan = boxListPesan.getBoundingClientRect();
    const areaBubble = bubble.getBoundingClientRect();
    if (areaBubble.bottom < areaPesan.top || areaBubble.top > areaPesan.bottom) {
        sembunyikanTindakanPesan(tombol);
        return;
    }

    const ukuran = 44;
    const jarak = 8;
    const batasAtas = Math.max(jarak, areaPesan.top + jarak);
    const batasBawah = Math.max(
        batasAtas,
        Math.min(areaPesan.bottom - ukuran - jarak, window.innerHeight - ukuran - jarak)
    );
    const batasKanan = Math.max(4, window.innerWidth - ukuran - 4);

    const posisiIkon = baris.classList.contains('kirim')
        ? areaBubble.left - ukuran - jarak
        : areaBubble.right + jarak;
    const posisiKiri = Math.max(4, Math.min(posisiIkon, batasKanan));
    const posisiAtas = areaBubble.top + (areaBubble.height - ukuran) / 2;

    tombol.style.left = posisiKiri + 'px';
    tombol.style.top = Math.max(
        batasAtas,
        Math.min(posisiAtas, batasBawah)
    ) + 'px';
}

function tampilkanTindakanPesan(tombol, baris) {
    if (!tombol || tombol.disabled || !baris) return;
    if (tombolAksiPesanAktif && tombolAksiPesanAktif !== tombol) {
        sembunyikanTindakanPesan(tombolAksiPesanAktif);
    }

    tombolAksiPesanAktif = tombol;
    barisAksiPesanAktif = baris;
    tombol.classList.add('aksi-pesan-terbuka');
    posisikanTindakanPesan(tombol, baris);
}

function aturStatusTujuanPesan(teks, error) {
    statusDaftarTujuan.textContent = teks;
    statusDaftarTujuan.dataset.error = String(Boolean(error));
}

function perbaruiTombolTeruskan() {
    const dipilih = daftarTujuanTeruskan.querySelectorAll('input[type="checkbox"]:checked');
    btnKonfirmasiTeruskan.disabled = dipilih.length === 0;
}

function buatBarisKontakTujuan(kontak, pengguna) {
    const baris = document.createElement('label');
    baris.className = 'forward-contact';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = String(pengguna ? pengguna.id : '');

    const detail = document.createElement('span');
    detail.className = 'forward-contact-details';
    const nama = document.createElement('span');
    nama.className = 'forward-contact-name';
    nama.textContent = kontak.name || (pengguna ? getProfil(pengguna.id).nama : '') || kontak.phone;
    const nomor = document.createElement('span');
    nomor.className = 'forward-contact-subtitle';
    nomor.textContent = kontak.phone;
    detail.append(nama, nomor);

    if (!pengguna) {
        checkbox.disabled = true;
        baris.classList.add('forward-contact-unavailable');
        baris.title = 'Nomor ini belum terdaftar di Ngumpul.';
        nomor.textContent += ' (belum terdaftar)';
    } else if (chatTerblokir(pengguna.id)) {
        checkbox.disabled = true;
        baris.classList.add('forward-contact-unavailable');
        baris.title = 'Pesan tidak dapat diteruskan ke kontak yang diblokir.';
        nomor.textContent += ' (diblokir)';
    }

    checkbox.addEventListener('change', perbaruiTombolTeruskan);
    baris.append(checkbox, detail);
    return baris;
}

function renderDaftarTujuanTeruskan() {
    const nomorRender = ++urutanRenderTujuan;
    daftarTujuanTeruskan.replaceChildren();
    inputCariTujuanTeruskan.disabled = false;
    aturStatusTujuanPesan('Memuat daftar kontak...', false);
    btnKonfirmasiTeruskan.disabled = true;

    window.setTimeout(() => {
        if (!dialogTeruskanPesan.open || nomorRender !== urutanRenderTujuan) return;

        try {
            const kontak = NgumpulKontakData.list(userAktif.id);
            const pengguna = getUsers();
            const daftar = kontak
                .filter(item => item && item.phone)
                .map(item => {
                    const pemilik = pengguna.find(user =>
                        user && user.hp && samakanHp(user.hp, item.phone)
                    );
                    return { kontak: item, pengguna: pemilik };
                })
                .filter(item => !item.pengguna || String(item.pengguna.id) !== String(userAktif.id))
                .sort((a, b) => {
                    const namaA = a.kontak.name || (a.pengguna ? getProfil(a.pengguna.id).nama : a.kontak.phone);
                    const namaB = b.kontak.name || (b.pengguna ? getProfil(b.pengguna.id).nama : b.kontak.phone);
                    return namaA.localeCompare(namaB, 'id');
                });

            daftar.forEach(item => {
                daftarTujuanTeruskan.appendChild(buatBarisKontakTujuan(item.kontak, item.pengguna));
            });

            if (!daftar.length) {
                aturStatusTujuanPesan('Belum ada kontak tujuan yang bisa dipilih.', false);
            } else {
                aturStatusTujuanPesan('', false);
            }
            filterDaftarTujuanTeruskan();
        } catch (error) {
            inputCariTujuanTeruskan.disabled = true;
            aturStatusTujuanPesan(error.message || 'Daftar kontak tidak dapat dimuat.', true);
        }
    }, 0);
}

function filterDaftarTujuanTeruskan() {
    const query = inputCariTujuanTeruskan.value.trim().toLocaleLowerCase('id');
    const barisKontak = Array.from(daftarTujuanTeruskan.children);
    let jumlahCocok = 0;

    barisKontak.forEach(baris => {
        const cocok = baris.textContent.toLocaleLowerCase('id').includes(query);
        baris.hidden = !cocok;
        if (cocok) jumlahCocok++;
    });

    if (query && !jumlahCocok) {
        aturStatusTujuanPesan('Kontak tidak ditemukan.', false);
    } else if (jumlahCocok) {
        aturStatusTujuanPesan('', false);
    }
}

function bukaDialogTeruskanPesan(pesan, tombolPemicu) {
    if (!pesan || !pesan.id || !userAktif) return;
    pesanUntukDiteruskan = Object.assign({}, pesan);
    pemicuDialogTeruskan = tombolPemicu;
    inputCariTujuanTeruskan.value = '';
    formTeruskanPesan.reset();
    daftarTujuanTeruskan.replaceChildren();
    aturStatusTujuanPesan('', false);
    btnKonfirmasiTeruskan.hidden = false;
    btnKonfirmasiTeruskan.textContent = 'Teruskan';
    btnBatalTeruskanPesan.textContent = 'Batal';
    dialogTeruskanPesan.showModal();
    inputCariTujuanTeruskan.focus();
    renderDaftarTujuanTeruskan();
}

function tutupDialogTeruskanPesan() {
    if (dialogTeruskanPesan.open) dialogTeruskanPesan.close();
}

if (boxListPesan) {
    boxListPesan.addEventListener('click', event => {
        const tombol = event.target.closest('[data-teruskan-pesan]');
        if (tombol) {
            const pesan = ambilPesanChat(chatAktifId)
                .find(item => String(item.id) === tombol.dataset.teruskanPesan);
            bukaDialogTeruskanPesan(pesan, tombol);
            return;
        }

        const baris = event.target.closest('.message-row');
        const bubble = event.target.closest('.chat-bubble');
        if (!baris || !bubble || event.target.closest('.btn-pin-message')) {
            sembunyikanTindakanPesan();
            return;
        }

        const tombolAksi = baris.querySelector('[data-teruskan-pesan]');
        if (tombolAksiPesanAktif && tombolAksiPesanAktif !== tombolAksi) {
            sembunyikanTindakanPesan();
        }
    });

    boxListPesan.addEventListener('contextmenu', event => {
        const baris = event.target.closest('.message-row');
        const bubble = event.target.closest('.chat-bubble');
        const tombol = baris && baris.querySelector('[data-teruskan-pesan]');
        if (!baris || !bubble || !tombol || tombol.disabled ||
            event.target.closest('.btn-pin-message')) return;

        event.preventDefault();
        batalkanTekanLamaPesan();
        tampilkanTindakanPesan(tombol, baris);
    });

    boxListPesan.addEventListener('pointerdown', event => {
        if (event.button !== 0 || !event.isPrimary ||
            event.target.closest('button, a, input, textarea, select')) return;

        const baris = event.target.closest('.message-row');
        const bubble = event.target.closest('.chat-bubble');
        const tombol = baris && baris.querySelector('[data-teruskan-pesan]');
        if (!baris || !bubble || !tombol || tombol.disabled) return;

        batalkanTekanLamaPesan();
        pointerTekanLamaPesan = event.pointerId;
        titikAwalTekanLamaPesan = { x: event.clientX, y: event.clientY };
        timerTekanLamaPesan = window.setTimeout(() => {
            batalkanTekanLamaPesan();
            tampilkanTindakanPesan(tombol, baris);
        }, 550);
    });

    window.addEventListener('pointermove', event => {
        if (event.pointerId !== pointerTekanLamaPesan || !titikAwalTekanLamaPesan) return;
        if (Math.hypot(
            event.clientX - titikAwalTekanLamaPesan.x,
            event.clientY - titikAwalTekanLamaPesan.y
        ) > 12) {
            batalkanTekanLamaPesan();
        }
    });

    ['pointerup', 'pointercancel'].forEach(jenisEvent => {
        window.addEventListener(jenisEvent, event => {
            if (event.pointerId === pointerTekanLamaPesan) {
                batalkanTekanLamaPesan();
            }
        });
    });

    boxListPesan.addEventListener('focusin', event => {
        const tombol = event.target.closest('[data-teruskan-pesan]');
        if (tombol) tampilkanTindakanPesan(tombol, tombol.closest('.message-row'));
    });

    boxListPesan.addEventListener('focusout', event => {
        const tombol = event.target.closest('[data-teruskan-pesan]');
        if (tombol && !dialogTeruskanPesan.open && document.activeElement !== tombol) {
            sembunyikanTindakanPesan(tombol);
        }
    });

    boxListPesan.addEventListener('scroll', () => {
        if (tombolAksiPesanAktif) {
            posisikanTindakanPesan(tombolAksiPesanAktif, barisAksiPesanAktif);
        }
    });
}

document.addEventListener('click', event => {
    if (!dialogTeruskanPesan.open && !event.target.closest('.message-row')) {
        sembunyikanTindakanPesan();
    }
});

window.addEventListener('resize', () => {
    if (tombolAksiPesanAktif) {
        posisikanTindakanPesan(tombolAksiPesanAktif, barisAksiPesanAktif);
    }
});

inputCariTujuanTeruskan.addEventListener('input', filterDaftarTujuanTeruskan);
formTeruskanPesan.addEventListener('change', perbaruiTombolTeruskan);
btnTutupTeruskanPesan.addEventListener('click', tutupDialogTeruskanPesan);
btnBatalTeruskanPesan.addEventListener('click', tutupDialogTeruskanPesan);
dialogTeruskanPesan.addEventListener('click', event => {
    if (event.target === dialogTeruskanPesan) tutupDialogTeruskanPesan();
});
dialogTeruskanPesan.addEventListener('close', () => {
    if (dialogTeruskanPesan.open) return;
    urutanRenderTujuan++;
    formTeruskanPesan.reset();
    inputCariTujuanTeruskan.value = '';
    daftarTujuanTeruskan.replaceChildren();
    aturStatusTujuanPesan('', false);
    pesanUntukDiteruskan = null;
    if (pemicuDialogTeruskan && pemicuDialogTeruskan.isConnected) pemicuDialogTeruskan.focus();
    pemicuDialogTeruskan = null;
});

formTeruskanPesan.addEventListener('submit', event => {
    event.preventDefault();
    if (!pesanUntukDiteruskan) return;

    const tujuanDipilih = Array.from(
        daftarTujuanTeruskan.querySelectorAll('input[type="checkbox"]:checked')
    ).map(input => input.value);
    if (!tujuanDipilih.length) {
        aturStatusTujuanPesan('Pilih setidaknya satu kontak.', true);
        return;
    }

    const tujuanValid = Array.from(new Set(tujuanDipilih)).filter(id =>
        id !== String(userAktif.id) &&
        getUserById(id) &&
        !chatTerblokir(id)
    );
    if (!tujuanValid.length) {
        aturStatusTujuanPesan('Pesan tidak dapat diteruskan ke kontak yang dipilih.', true);
        renderDaftarTujuanTeruskan();
        return;
    }

    const semuaChat = bacaSemuaChat();
    const waktuKirim = new Date().toISOString();
    tujuanValid.forEach(idTujuan => {
        const kunci = kunciKonversasi(userAktif.id, idTujuan);
        const daftarPesan = Array.isArray(semuaChat[kunci]) ? semuaChat[kunci].slice() : [];
        daftarPesan.push(Object.assign({}, pesanUntukDiteruskan, {
            id: buatIdPesan(),
            sender: userAktif.id,
            time: waktuKirim,
            status: 'terkirim',
            forwarded: true
        }));
        semuaChat[kunci] = daftarPesan;
    });
    if (!simpanSemuaChat(semuaChat)) {
        aturStatusTujuanPesan('Pesan gagal diteruskan. Penyimpanan browser tidak dapat digunakan.', true);
        return;
    }

    renderChatList();
    if (tujuanValid.some(id => String(id) === String(chatAktifId))) renderPesanAktif();
    aturStatusTujuanPesan(
        'Pesan diteruskan ke ' + tujuanValid.length + ' kontak.' +
            (tujuanValid.length < tujuanDipilih.length
                ? ' ' + (tujuanDipilih.length - tujuanValid.length) + ' tujuan tidak tersedia dan dilewati.'
                : ''),
        false
    );
    daftarTujuanTeruskan.querySelectorAll('input[type="checkbox"]').forEach(input => {
        input.disabled = true;
    });
    btnKonfirmasiTeruskan.hidden = true;
    btnBatalTeruskanPesan.textContent = 'Selesai';
});

window.addEventListener('storage', event => {
    if (!userAktif) return;
    const perubahanKontak = NgumpulKontakData.isContactsStorageKey(userAktif.id, event.key);
    const perubahanBlokir = typeof event.key === 'string' && event.key.startsWith('ngumpul_blokir_');
    if (dialogTeruskanPesan.open && (perubahanKontak || perubahanBlokir || event.key === 'ngumpul_users')) {
        renderDaftarTujuanTeruskan();
    }
});
