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

function buatBarisTemanTujuan(teman) {
    const baris = document.createElement('label');
    baris.className = 'forward-contact';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = teman.userId;

    const detail = document.createElement('span');
    detail.className = 'forward-contact-details';
    const nama = document.createElement('span');
    nama.className = 'forward-contact-name';
    nama.textContent = NgumpulTeman.nama(teman);
    const username = document.createElement('span');
    username.className = 'forward-contact-subtitle';
    username.textContent = NgumpulTeman.username(teman);
    detail.append(nama, username);

    if (chatTerblokir(teman.userId)) {
        checkbox.disabled = true;
        baris.classList.add('forward-contact-unavailable');
        baris.title = 'Pesan tidak dapat diteruskan ke teman yang diblokir.';
        username.textContent += ' (diblokir)';
    }

    checkbox.addEventListener('change', perbaruiTombolTeruskan);
    baris.append(checkbox, detail);
    return baris;
}

function renderDaftarTujuanTeruskan() {
    const daftar = NgumpulTeman.list()
        .sort((a, b) => NgumpulTeman.nama(a).localeCompare(NgumpulTeman.nama(b), 'id'));
    daftarTujuanTeruskan.replaceChildren(...daftar.map(buatBarisTemanTujuan));
    inputCariTujuanTeruskan.disabled = false;
    btnKonfirmasiTeruskan.disabled = true;
    aturStatusTujuanPesan(daftar.length ? '' : 'Belum ada teman yang bisa dipilih.', false);
    filterDaftarTujuanTeruskan();
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
        aturStatusTujuanPesan('Teman tidak ditemukan.', false);
    } else if (jumlahCocok) {
        aturStatusTujuanPesan('', false);
    }
}

function bukaDialogTeruskanPesan(pesan, tombolPemicu) {
    if (!pesan || !pesan.id || !userAktif || pesan.dihapusSemua) return;
    if (pesan.attachmentId) {
        setStatusDM(chatAktifId, 'Pesan dengan lampiran tidak dapat diteruskan.');
        return;
    }
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
    formTeruskanPesan.reset();
    inputCariTujuanTeruskan.value = '';
    daftarTujuanTeruskan.replaceChildren();
    aturStatusTujuanPesan('', false);
    pesanUntukDiteruskan = null;
    if (pemicuDialogTeruskan && pemicuDialogTeruskan.isConnected) pemicuDialogTeruskan.focus();
    pemicuDialogTeruskan = null;
});

formTeruskanPesan.addEventListener('submit', async event => {
    event.preventDefault();
    if (!pesanUntukDiteruskan || btnKonfirmasiTeruskan.disabled) return;

    const tujuanDipilih = Array.from(
        daftarTujuanTeruskan.querySelectorAll('input[type="checkbox"]:checked')
    ).map(input => input.value);
    if (!tujuanDipilih.length) {
        aturStatusTujuanPesan('Pilih setidaknya satu teman.', true);
        return;
    }

    const tujuanValid = Array.from(new Set(tujuanDipilih)).filter(id =>
        id !== String(userAktif.id) &&
        NgumpulTeman.get(id) &&
        !chatTerblokir(id)
    );
    if (!tujuanValid.length) {
        aturStatusTujuanPesan('Pesan tidak dapat diteruskan ke teman yang dipilih.', true);
        renderDaftarTujuanTeruskan();
        return;
    }

    const sumber = pesanUntukDiteruskan;
    const id = sumber.id;
    btnKonfirmasiTeruskan.disabled = true;
    const berhasil = [];
    for (const targetId of tujuanValid) {
        try {
            await NgumpulAuth.api('messages/' + encodeURIComponent(id) + '/forward', {
                method: 'POST', body: { scope: 'direct', targetId }
            });
            berhasil.push(targetId);
            NgumpulDM.refresh(targetId).catch(() => {});
        } catch { /* Tujuan yang gagal tetap terpilih untuk dicoba ulang. */ }
    }
    if (!dialogTeruskanPesan.open || pesanUntukDiteruskan?.id !== id) return;
    daftarTujuanTeruskan.querySelectorAll('input[type="checkbox"]:checked').forEach(input => {
        if (berhasil.includes(input.value)) {
            input.checked = false;
            input.disabled = true;
        }
    });
    const gagal = tujuanValid.length - berhasil.length;
    aturStatusTujuanPesan('Pesan diteruskan ke ' + berhasil.length + ' teman.' +
        (gagal ? ' Gagal untuk ' + gagal + ' teman. Coba lagi.' : ''), Boolean(gagal));
    if (!gagal) {
        btnKonfirmasiTeruskan.hidden = true;
        btnBatalTeruskanPesan.textContent = 'Selesai';
    }
    perbaruiTombolTeruskan();
});

document.addEventListener('ngumpul:teman-berubah', () => {
    if (dialogTeruskanPesan.open) renderDaftarTujuanTeruskan();
});
