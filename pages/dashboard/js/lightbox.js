// ===== Lightbox Peninjau Gambar Ukuran Penuh (Gaya WhatsApp) =====
const lightboxGambar = document.getElementById('lightbox-gambar');
const lightboxPengirim = document.getElementById('lightbox-pengirim');
const lightboxWaktu = document.getElementById('lightbox-waktu');
const imgLightboxUtama = document.getElementById('img-lightbox-utama');
const lightboxFooter = document.getElementById('lightbox-footer');
const lightboxCaption = document.getElementById('lightbox-caption');
const btnLightboxTutup = document.getElementById('btn-lightbox-tutup');
const btnLightboxUnduh = document.getElementById('btn-lightbox-unduh');
const btnLightboxZoomIn = document.getElementById('btn-lightbox-zoom-in');
const btnLightboxZoomOut = document.getElementById('btn-lightbox-zoom-out');
const btnLightboxPrev = document.getElementById('btn-lightbox-prev');
const btnLightboxNext = document.getElementById('btn-lightbox-next');
const lightboxStage = document.getElementById('lightbox-stage');

let daftarPesanGambarLightbox = [];
let indeksLightboxAktif = 0;
let zoomLightbox = 1;

function aturZoomLightbox(nilaiBaru) {
    zoomLightbox = Math.min(4, Math.max(0.5, nilaiBaru));
    if (imgLightboxUtama) {
        imgLightboxUtama.style.transform = 'scale(' + zoomLightbox + ')';
    }
}

async function tampilkanSlideLightbox() {
    if (!lightboxGambar || !daftarPesanGambarLightbox.length) return;
    const item = daftarPesanGambarLightbox[indeksLightboxAktif];
    if (!item) return;

    aturZoomLightbox(1);

    const namaPengirim = item.sender === userAktif.id
        ? 'Anda'
        : getProfilChat(item.sender).nama;

    if (lightboxPengirim) lightboxPengirim.textContent = namaPengirim;
    if (lightboxWaktu) {
        const tgl = item.time ? new Date(item.time) : null;
        lightboxWaktu.textContent = tgl && !Number.isNaN(tgl.getTime())
            ? tgl.toLocaleString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
            : '';
    }

    let urlTampil = item.image || '';
    if (item.imageId) {
        const urlIdb = await ambilGambarIdb(item.imageId);
        if (urlIdb) urlTampil = urlIdb;
    }

    if (imgLightboxUtama) {
        imgLightboxUtama.src = urlTampil;
        imgLightboxUtama.alt = item.text || item.imageName || 'Gambar obrolan';
    }

    const teksCaption = String(item.text || '').trim();
    if (lightboxFooter && lightboxCaption) {
        lightboxCaption.textContent = teksCaption;
        lightboxFooter.hidden = !teksCaption;
    }

    if (btnLightboxPrev) {
        btnLightboxPrev.hidden = daftarPesanGambarLightbox.length <= 1 || indeksLightboxAktif <= 0;
    }
    if (btnLightboxNext) {
        btnLightboxNext.hidden =
            daftarPesanGambarLightbox.length <= 1 ||
            indeksLightboxAktif >= daftarPesanGambarLightbox.length - 1;
    }
}

function bukaLightboxGambar(idPesan) {
    if (!lightboxGambar || !chatAktifId) return;
    daftarPesanGambarLightbox = ambilPesanChat(chatAktifId).filter(isPesanBergambar);
    if (!daftarPesanGambarLightbox.length) return;

    const idx = daftarPesanGambarLightbox.findIndex(p => p.id === idPesan);
    indeksLightboxAktif = idx !== -1 ? idx : daftarPesanGambarLightbox.length - 1;
    lightboxGambar.hidden = false;
    tampilkanSlideLightbox();
}

function tutupLightboxGambar() {
    if (!lightboxGambar) return;
    lightboxGambar.hidden = true;
    aturZoomLightbox(1);
}

if (btnLightboxTutup) {
    btnLightboxTutup.addEventListener('click', tutupLightboxGambar);
}

if (btnLightboxZoomIn) {
    btnLightboxZoomIn.addEventListener('click', () => aturZoomLightbox(zoomLightbox + 0.35));
}

if (btnLightboxZoomOut) {
    btnLightboxZoomOut.addEventListener('click', () => aturZoomLightbox(zoomLightbox - 0.35));
}

if (imgLightboxUtama) {
    imgLightboxUtama.addEventListener('dblclick', () => {
        aturZoomLightbox(zoomLightbox > 1 ? 1 : 2);
    });
}

if (lightboxStage) {
    lightboxStage.addEventListener('click', e => {
        if (e.target === lightboxStage) tutupLightboxGambar();
    });
    lightboxStage.addEventListener('wheel', e => {
        if (lightboxGambar && !lightboxGambar.hidden) {
            e.preventDefault();
            aturZoomLightbox(zoomLightbox + (e.deltaY < 0 ? 0.2 : -0.2));
        }
    }, { passive: false });
}

if (btnLightboxPrev) {
    btnLightboxPrev.addEventListener('click', () => {
        if (indeksLightboxAktif > 0) {
            indeksLightboxAktif--;
            tampilkanSlideLightbox();
        }
    });
}

if (btnLightboxNext) {
    btnLightboxNext.addEventListener('click', () => {
        if (indeksLightboxAktif < daftarPesanGambarLightbox.length - 1) {
            indeksLightboxAktif++;
            tampilkanSlideLightbox();
        }
    });
}

if (btnLightboxUnduh) {
    btnLightboxUnduh.addEventListener('click', async () => {
        const item = daftarPesanGambarLightbox[indeksLightboxAktif];
        if (!item) return;
        let urlUnduh = item.image || '';
        if (item.imageId) {
            const urlIdb = await ambilGambarIdb(item.imageId);
            if (urlIdb) urlUnduh = urlIdb;
        }
        if (!urlUnduh) return;
        const a = document.createElement('a');
        a.href = urlUnduh;
        a.download = item.imageName || ('ngumpul-foto-' + item.id + '.jpg');
        document.body.appendChild(a);
        a.click();
        a.remove();
    });
}

document.addEventListener('keydown', e => {
    if (lightboxGambar && !lightboxGambar.hidden) {
        if (e.key === 'Escape') {
            e.preventDefault();
            tutupLightboxGambar();
        } else if (e.key === 'ArrowLeft' && indeksLightboxAktif > 0) {
            indeksLightboxAktif--;
            tampilkanSlideLightbox();
        } else if (e.key === 'ArrowRight' && indeksLightboxAktif < daftarPesanGambarLightbox.length - 1) {
            indeksLightboxAktif++;
            tampilkanSlideLightbox();
        }
        return;
    }

    if (panelPreviewGambar && !panelPreviewGambar.hidden && e.key === 'Escape') {
        e.preventDefault();
        tutupPreviewGambar();
    }
});

