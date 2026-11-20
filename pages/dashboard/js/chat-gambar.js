// ===== Fitur Kirim Gambar dari Galeri (Tanpa Batas Ukuran, Gaya WhatsApp) =====
const inputFileGambar = document.getElementById('input-file-gambar');
const panelPreviewGambar = document.getElementById('panel-preview-gambar');
const btnBatalPreview = document.getElementById('btn-batal-preview');
const infoNamaFilePreview = document.getElementById('info-nama-file-preview');
const infoUkuranFilePreview = document.getElementById('info-ukuran-file-preview');
const infoUrutPreview = document.getElementById('info-urut-preview');
const imgUtamaPreview = document.getElementById('img-utama-preview');
const inputCaptionGambar = document.getElementById('input-caption-gambar');
const daftarThumbPreview = document.getElementById('daftar-thumb-preview');
const btnTambahGambarLagi = document.getElementById('btn-tambah-gambar-lagi');
const btnKirimGambar = document.getElementById('btn-kirim-gambar');
const badgeJumlahGambar = document.getElementById('badge-jumlah-gambar');
const dropzoneChatGambar = document.getElementById('dropzone-chat-gambar');

let antreanGambar = [];
let indeksPreviewAktif = 0;
let sedangMengirimGambar = false;

function formatUkuranFile(bytes) {
    const n = Number(bytes) || 0;
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1).replace('.', ',') + ' KB';
    if (n < 1024 * 1024 * 1024) return (n / (1024 * 1024)).toFixed(2).replace('.', ',') + ' MB';
    return (n / (1024 * 1024 * 1024)).toFixed(2).replace('.', ',') + ' GB';
}

function adalahFileGambar(file) {
    if (!file) return false;
    if (typeof file.type === 'string' && file.type.startsWith('image/')) return true;
    return /\.(jpe?g|png|gif|webp|bmp|svg|avif|heic|heif|ico|tiff?)$/i.test(file.name || '');
}

function bersihkanAntreanGambar() {
    antreanGambar.forEach(item => {
        if (item.objectUrl) {
            try { URL.revokeObjectURL(item.objectUrl); } catch (e) {}
        }
    });
    antreanGambar = [];
    indeksPreviewAktif = 0;
}

function tutupPreviewGambar() {
    if (antreanGambar.length && inputTeksKirim && !inputTeksKirim.value && chatAktifId) {
        inputTeksKirim.value = bacaDrafChat(chatAktifId)?.teks || '';
        perbaruiTombolKirim();
    }
    bersihkanAntreanGambar();
    if (panelPreviewGambar) panelPreviewGambar.hidden = true;
    if (inputFileGambar) inputFileGambar.value = '';
    if (inputTeksKirim && chatAktifId) inputTeksKirim.focus();
}

function renderKomposerPreviewGambar() {
    if (!panelPreviewGambar) return;

    if (!antreanGambar.length) {
        tutupPreviewGambar();
        return;
    }

    if (indeksPreviewAktif >= antreanGambar.length) {
        indeksPreviewAktif = antreanGambar.length - 1;
    }
    if (indeksPreviewAktif < 0) {
        indeksPreviewAktif = 0;
    }

    panelPreviewGambar.hidden = false;
    const itemAktif = antreanGambar[indeksPreviewAktif];

    if (imgUtamaPreview) {
        imgUtamaPreview.src = itemAktif.objectUrl;
        imgUtamaPreview.alt = itemAktif.name || 'Pratinjau gambar';
    }

    if (infoNamaFilePreview) {
        infoNamaFilePreview.textContent = itemAktif.name || 'Gambar dari galeri';
    }

    if (infoUkuranFilePreview) {
        infoUkuranFilePreview.textContent = formatUkuranFile(itemAktif.size);
    }

    if (infoUrutPreview) {
        infoUrutPreview.textContent = (indeksPreviewAktif + 1) + ' / ' + antreanGambar.length;
    }

    if (inputCaptionGambar) {
        inputCaptionGambar.value = itemAktif.caption || '';
    }

    if (badgeJumlahGambar) {
        badgeJumlahGambar.textContent = String(antreanGambar.length);
        badgeJumlahGambar.hidden = antreanGambar.length <= 1;
    }

    if (daftarThumbPreview) {
        daftarThumbPreview.replaceChildren();
        antreanGambar.forEach((item, idx) => {
            const btnThumb = document.createElement('div');
            btnThumb.className = 'media-thumb-item' + (idx === indeksPreviewAktif ? ' aktif' : '');
            btnThumb.setAttribute('role', 'option');
            btnThumb.setAttribute('aria-selected', String(idx === indeksPreviewAktif));
            btnThumb.setAttribute('tabindex', '0');

            const imgThumb = document.createElement('img');
            imgThumb.src = item.objectUrl;
            imgThumb.alt = item.name || ('Gambar ' + (idx + 1));

            const btnHapus = document.createElement('button');
            btnHapus.type = 'button';
            btnHapus.className = 'media-thumb-remove';
            btnHapus.textContent = '×';
            btnHapus.setAttribute('aria-label', 'Hapus gambar ini dari antrean');
            btnHapus.addEventListener('click', e => {
                e.stopPropagation();
                hapusSatuGambarAntrean(idx);
            });

            btnThumb.addEventListener('click', () => {
                simpanCaptionSaatIni();
                indeksPreviewAktif = idx;
                renderKomposerPreviewGambar();
            });

            btnThumb.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    simpanCaptionSaatIni();
                    indeksPreviewAktif = idx;
                    renderKomposerPreviewGambar();
                }
            });

            btnThumb.append(imgThumb, btnHapus);
            daftarThumbPreview.appendChild(btnThumb);
        });
    }
}

function simpanCaptionSaatIni() {
    if (!inputCaptionGambar || !antreanGambar[indeksPreviewAktif]) return;
    antreanGambar[indeksPreviewAktif].caption = inputCaptionGambar.value;
}

function hapusSatuGambarAntrean(idx) {
    simpanCaptionSaatIni();
    const dihapus = antreanGambar.splice(idx, 1)[0];
    if (dihapus && dihapus.objectUrl) {
        try { URL.revokeObjectURL(dihapus.objectUrl); } catch (e) {}
    }
    if (!antreanGambar.length) {
        tutupPreviewGambar();
        return;
    }
    if (indeksPreviewAktif >= antreanGambar.length) {
        indeksPreviewAktif = antreanGambar.length - 1;
    }
    renderKomposerPreviewGambar();
}

function tambahFileKeAntrean(fileList) {
    if (!chatAktifId || !userAktif || !fileList || !fileList.length) return;
    if (chatTerblokir(chatAktifId)) return;

    simpanCaptionSaatIni();
    const sebelumnyaKosong = antreanGambar.length === 0;
    let adaYangMasuk = false;

    Array.from(fileList).forEach(file => {
        if (!adalahFileGambar(file)) return;
        const objectUrl = URL.createObjectURL(file);
        antreanGambar.push({
            id: buatIdPesan(),
            file: file,
            name: file.name || 'foto.jpg',
            size: file.size || 0,
            objectUrl: objectUrl,
            caption: ''
        });
        adaYangMasuk = true;
    });

    if (!adaYangMasuk) return;

    // Jika sebelumnya sudah ada teks di input utama, pindahkan ke caption gambar pertama
    if (sebelumnyaKosong && inputTeksKirim && inputTeksKirim.value.trim()) {
        antreanGambar[0].caption = inputTeksKirim.value.trim();
        inputTeksKirim.value = '';
    }

    if (sebelumnyaKosong) {
        indeksPreviewAktif = 0;
    } else {
        indeksPreviewAktif = antreanGambar.length - 1;
    }

    renderKomposerPreviewGambar();
    if (inputCaptionGambar) inputCaptionGambar.focus();
}

async function kirimSemuaGambarAntrean() {
    if (!chatAktifId || !userAktif || !antreanGambar.length || sedangMengirimGambar) return;
    if (chatTerblokir(chatAktifId)) return;

    simpanCaptionSaatIni();
    sedangMengirimGambar = true;
    if (btnKirimGambar) btnKirimGambar.disabled = true;

    const targetChatId = chatAktifId;
    const daftarPesan = ambilPesanChat(targetChatId);
    const salinanAntrean = antreanGambar.slice();

    for (let i = 0; i < salinanAntrean.length; i++) {
        const item = salinanAntrean[i];
        const idPesan = buatIdPesan();
        const imageId = 'img_' + idPesan;

        // Simpan file asli ukuran penuh ke IndexedDB (tidak ada batas ukuran)
        await simpanGambarIdb(imageId, item.file);
        // Siapkan URL lokal di memori tab ini agar langsung tampil tajam
        cacheUrlGambar.set(imageId, URL.createObjectURL(item.file));

        // Buat pratinjau ringan agar juga tersinkron instan lewat localStorage
        const previewDataUrl = await buatPreviewRinganDataUrl(item.file);

        daftarPesan.push({
            id: idPesan,
            sender: userAktif.id,
            text: (item.caption || '').trim(),
            imageId: imageId,
            image: previewDataUrl || '',
            hasImage: true,
            imageName: item.name || 'foto.jpg',
            imageSize: item.size || 0,
            time: new Date().toISOString(),
            status: 'terkirim'
        });
    }

    if (!simpanPesanChat(targetChatId, daftarPesan)) {
        sedangMengirimGambar = false;
        if (btnKirimGambar) btnKirimGambar.disabled = false;
        return;
    }
    if (!inputTeksKirim?.value) simpanDrafChat(targetChatId, '');
    sedangMengirimGambar = false;
    if (btnKirimGambar) btnKirimGambar.disabled = false;

    tutupPreviewGambar();
    renderPesanAktif();
    renderChatList();
    if (pencarianPesanTerbuka()) renderHasilPencarianPesan();
}

// Menu lampiran "Foto & video" memicu pemilih galeri (menggantikan tombol plus kedua)
const itemLampirMedia = document.querySelector('[data-fitur="lampir-media"]');
if (itemLampirMedia && inputFileGambar) {
    itemLampirMedia.addEventListener('click', () => {
        if (!chatAktifId || chatTerblokir(chatAktifId)) return;
        tutupPanelLampiran();
        inputFileGambar.click();
    });
}

if (btnTambahGambarLagi && inputFileGambar) {
    btnTambahGambarLagi.addEventListener('click', () => {
        if (!chatAktifId) return;
        inputFileGambar.click();
    });
}

if (inputFileGambar) {
    inputFileGambar.addEventListener('change', e => {
        if (e.target.files && e.target.files.length) {
            tambahFileKeAntrean(e.target.files);
        }
        inputFileGambar.value = '';
    });
}

if (btnBatalPreview) {
    btnBatalPreview.addEventListener('click', tutupPreviewGambar);
}

if (inputCaptionGambar) {
    inputCaptionGambar.addEventListener('input', simpanCaptionSaatIni);
    inputCaptionGambar.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            kirimSemuaGambarAntrean();
        }
    });
}

if (btnKirimGambar) {
    btnKirimGambar.addEventListener('click', kirimSemuaGambarAntrean);
}

// Drag & Drop gambar langsung ke ruang chat (layaknya WhatsApp Web)
if (panelChatAktif && dropzoneChatGambar) {
    let penghitungDrag = 0;

    panelChatAktif.addEventListener('dragenter', e => {
        if (!chatAktifId) return;
        const dt = e.dataTransfer;
        if (dt && dt.types && Array.from(dt.types).includes('Files')) {
            e.preventDefault();
            penghitungDrag++;
            dropzoneChatGambar.hidden = false;
        }
    });

    panelChatAktif.addEventListener('dragover', e => {
        if (!chatAktifId) return;
        const dt = e.dataTransfer;
        if (dt && dt.types && Array.from(dt.types).includes('Files')) {
            e.preventDefault();
            dt.dropEffect = 'copy';
        }
    });

    panelChatAktif.addEventListener('dragleave', () => {
        penghitungDrag = Math.max(0, penghitungDrag - 1);
        if (penghitungDrag === 0) {
            dropzoneChatGambar.hidden = true;
        }
    });

    panelChatAktif.addEventListener('drop', e => {
        penghitungDrag = 0;
        dropzoneChatGambar.hidden = true;
        if (!chatAktifId) return;
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
            e.preventDefault();
            tambahFileKeAntrean(e.dataTransfer.files);
        }
    });
}

// Paste (Ctrl+V) gambar dari clipboard langsung ke ruang chat
document.addEventListener('paste', e => {
    if (!chatAktifId || !panelChatAktif || panelChatAktif.style.display === 'none') return;
    if (panelLayerSetelan && panelLayerSetelan.style.display === 'flex') return;
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;

    const files = [];
    for (let i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.startsWith('image/')) {
            const f = items[i].getAsFile();
            if (f) files.push(f);
        }
    }
    if (files.length) {
        e.preventDefault();
        tambahFileKeAntrean(files);
    }
});
