/**
 * NGUMPUL - Editor Gambar (sebelum kirim, gaya WhatsApp)
 * Dimuat otomatis oleh theme.js. Tidak mengubah file lain selain lewat tombol yang disisipkan di
 * panel pratinjau (#panel-preview-gambar) dan membaca antreanGambar milik chat-gambar.js.
 *
 * Fitur: coret (pena, sorot, penghapus, garis lurus), teks, stiker emoji, potong (rasio),
 * putar, balik, filter, undo/redo, atur ulang. Hasil jadi File baru; asli tetap disimpan
 * (item.fileAsli) supaya bisa dibuka lagi dan coretannya masih bisa diubah.
 */
(function () {
    'use strict';
    if (window.NgumpulEditorGambar) return;

    var skrip = document.currentScript && document.currentScript.src;
    if (skrip && !document.getElementById('editor-gambar-css')) {
        var l = document.createElement('link');
        l.rel = 'stylesheet';
        l.id = 'editor-gambar-css';
        l.href = skrip.replace(/js\/editor-gambar\.js.*$/, 'css/editor-gambar.css');
        document.head.appendChild(l);
    }

    var MAKS_SISI = 4096;
    var MAKS_RIWAYAT = 40;
    var WARNA = ['#ffffff', '#111111', '#ef4444', '#f97316', '#facc15', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
    var EMOJI = ['😀', '😂', '🥹', '😍', '😎', '🤩', '😭', '😡', '🥳', '🤔', '🙏', '👍', '👏', '🔥', '❤️', '💯', '✨', '🎉', '🎂', '🌈', '⭐', '🌸', '🍕', '☕', '🐱', '🐶', '🦄', '🚀', '💡', '📌', '✅', '❌', '⚠️', '💬', '👀', '💀', '🫶', '😴', '🤝', '🎓'];
    var ASPEK = [
        { id: 'bebas', label: 'Bebas', r: 0 },
        { id: 'asli', label: 'Asli', r: -1 },
        { id: '1:1', label: '1:1', r: 1 },
        { id: '4:3', label: '4:3', r: 4 / 3 },
        { id: '3:4', label: '3:4', r: 3 / 4 },
        { id: '16:9', label: '16:9', r: 16 / 9 },
        { id: '9:16', label: '9:16', r: 9 / 16 }
    ];
    // filter: matriks warna 3x3 + kecerahan/kontras/saturasi sederhana
    var FILTER = [
        { id: 'asli', label: 'Asli', f: null },
        { id: 'cerah', label: 'Cerah', f: { b: 1.08, c: 1.12, s: 1.25 } },
        { id: 'hitamputih', label: 'Mono', f: { s: 0, c: 1.1 } },
        { id: 'sepia', label: 'Sepia', f: { sepia: 1 } },
        { id: 'dingin', label: 'Dingin', f: { r: 0.92, bl: 1.1, s: 1.05 } },
        { id: 'hangat', label: 'Hangat', f: { r: 1.1, bl: 0.9, s: 1.1 } },
        { id: 'pudar', label: 'Pudar', f: { b: 1.1, c: 0.85, s: 0.75 } },
        { id: 'dramatis', label: 'Drama', f: { c: 1.35, s: 1.15, b: 0.96 } }
    ];

    var SVG = {
        tutup: '<path d="M6 6l12 12M18 6 6 18"/>',
        undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
        redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
        putarKiri: '<path d="M3 7v5h5"/><path d="M3.5 12A9 9 0 1 0 6 5.7L3 8"/>',
        putarKanan: '<path d="M21 7v5h-5"/><path d="M20.5 12A9 9 0 1 1 18 5.7L21 8"/>',
        balik: '<path d="M12 3v18"/><path d="M8 7 3 12l5 5V7z"/><path d="m16 7 5 5-5 5V7z"/>',
        reset: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
        cek: '<path d="m5 12 4 4L19 6"/>',
        pena: '<path d="m16 3 5 5L8 21l-5 1 1-5L16 3z"/><path d="m14 5 5 5"/>',
        teks: '<path d="M5 6V4h14v2"/><path d="M12 4v16"/><path d="M9 20h6"/>',
        stiker: '<path d="M20 12v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h7l6 6v3z"/><path d="M14 3v4a2 2 0 0 0 2 2h4"/><path d="M8 15c1 1.5 3.5 1.5 4.5 0"/>',
        potong: '<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M2 6h14a2 2 0 0 1 2 2v14"/>',
        filter: '<circle cx="9" cy="10" r="6"/><circle cx="15" cy="10" r="6"/><circle cx="12" cy="15" r="6"/>',
        sorot: '<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
        hapus: '<path d="m7 21-4-4a2 2 0 0 1 0-2.8l10-10a2 2 0 0 1 2.8 0l5 5a2 2 0 0 1 0 2.8L12 21H7z"/><path d="m8 9 7 7"/>',
        garis: '<path d="M5 19 19 5"/>',
        sampah: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        minus: '<path d="M5 12h14"/>',
        edit: '<path d="m16 3 5 5-12 12-6 1 1-6L16 3z"/>'
    };
    function ikon(n, ukuran) {
        return '<svg class="egm-ikon" viewBox="0 0 24 24" width="' + (ukuran || 22) + '" height="' + (ukuran || 22) +
            '" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + SVG[n] + '</svg>';
    }

    // ---------- keadaan ----------
    var el = {};
    var terbuka = false;
    var item = null;         // item antreanGambar yang sedang diedit
    var src = null;          // {w,h,base,filt}
    var st = null;           // {rot,flip,crop,filter,objs}
    var riwayat = [], idxRiwayat = -1;
    var alat = 'gambar';
    var opsiGambar = { mode: 'pena', warna: '#ef4444', ukuran: 8 };
    var opsiTeks = { warna: '#ffffff', ukuran: 9, latar: false, tebal: true };
    var aspekAktif = 'bebas';
    var cropEdit = null;
    var terpilih = null;     // id objek
    var layer = null, layerCtx = null, layerKotor = true;
    var k = 1;               // skala tampil (css px per piksel keluaran)
    var gambarAktif = null;  // coretan yang sedang digambar
    var pointers = new Map();
    var gestur = null;
    var idSeq = 1;
    var raf = 0;
    var dpr = 1;

    function sisiPanjang() { return Math.max(src.w, src.h); }
    function geom() {
        var odd = st.rot % 2 === 1;
        return { rw: odd ? src.h : src.w, rh: odd ? src.w : src.h };
    }
    function cropAktif() {
        var g = geom();
        if (alat === 'potong') return { x: 0, y: 0, w: g.rw, h: g.rh };
        return st.crop || { x: 0, y: 0, w: g.rw, h: g.rh };
    }
    function matriks(c, skala) {
        var g = geom();
        return new DOMMatrix().scale(skala).translate(-c.x, -c.y).translate(g.rw / 2, g.rh / 2)
            .rotate(st.rot * 90).scale(st.flip ? -1 : 1, 1).translate(-src.w / 2, -src.h / 2);
    }
    function klon(o) { return JSON.parse(JSON.stringify(o)); }
    function stateAwal() { return { rot: 0, flip: false, crop: null, filter: 'asli', objs: [] }; }
    function adaPerubahan(s) {
        return !!s && (s.rot !== 0 || s.flip || s.crop || s.filter !== 'asli' || s.objs.length > 0);
    }

    // ---------- DOM ----------
    function bangunDom() {
        if (el.root) return;
        var r = document.createElement('div');
        r.className = 'egm';
        r.id = 'editor-gambar';
        r.hidden = true;
        r.setAttribute('role', 'dialog');
        r.setAttribute('aria-modal', 'true');
        r.setAttribute('aria-label', 'Edit gambar');
        r.innerHTML =
            '<header class="egm-atas">' +
            '<button type="button" class="egm-tbl" data-aksi="batal" title="Batal (Esc)" aria-label="Batal">' + ikon('tutup') + '</button>' +
            '<div class="egm-grup">' +
            '<button type="button" class="egm-tbl" data-aksi="undo" title="Urungkan (Ctrl+Z)" aria-label="Urungkan">' + ikon('undo') + '</button>' +
            '<button type="button" class="egm-tbl" data-aksi="redo" title="Ulangi (Ctrl+Y)" aria-label="Ulangi">' + ikon('redo') + '</button>' +
            '<span class="egm-pemisah"></span>' +
            '<button type="button" class="egm-tbl" data-aksi="putar-kiri" title="Putar kiri" aria-label="Putar kiri">' + ikon('putarKiri') + '</button>' +
            '<button type="button" class="egm-tbl" data-aksi="putar-kanan" title="Putar kanan" aria-label="Putar kanan">' + ikon('putarKanan') + '</button>' +
            '<button type="button" class="egm-tbl" data-aksi="balik" title="Balik" aria-label="Balik">' + ikon('balik') + '</button>' +
            '<span class="egm-pemisah"></span>' +
            '<button type="button" class="egm-tbl" data-aksi="reset" title="Atur ulang semua" aria-label="Atur ulang">' + ikon('reset') + '</button>' +
            '</div>' +
            '<button type="button" class="egm-selesai" data-aksi="selesai">' + ikon('cek', 18) + '<span>Selesai</span></button>' +
            '</header>' +
            '<div class="egm-panggung"><div class="egm-bungkus">' +
            '<canvas class="egm-kanvas"></canvas>' +
            '<div class="egm-crop" hidden>' +
            ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map(function (h) { return '<i class="egm-hdl egm-hdl-' + h + '" data-h="' + h + '"></i>'; }).join('') +
            '<b class="egm-grid"></b>' +
            '</div>' +
            '<div class="egm-aksi-obj" hidden>' +
            '<button type="button" data-ob="kecil" aria-label="Perkecil" title="Perkecil">' + ikon('minus', 18) + '</button>' +
            '<button type="button" data-ob="besar" aria-label="Perbesar" title="Perbesar">' + ikon('plus', 18) + '</button>' +
            '<button type="button" data-ob="kiri" aria-label="Miringkan kiri" title="Putar kiri">' + ikon('putarKiri', 18) + '</button>' +
            '<button type="button" data-ob="kanan" aria-label="Miringkan kanan" title="Putar kanan">' + ikon('putarKanan', 18) + '</button>' +
            '<button type="button" data-ob="hapus" aria-label="Hapus objek" title="Hapus">' + ikon('sampah', 18) + '</button>' +
            '</div>' +
            '</div></div>' +
            '<div class="egm-opsi"></div>' +
            '<nav class="egm-alat" aria-label="Alat edit">' +
            [['gambar', 'pena', 'Gambar'], ['teks', 'teks', 'Teks'], ['stiker', 'stiker', 'Stiker'], ['potong', 'potong', 'Potong'], ['filter', 'filter', 'Filter']]
                .map(function (a) { return '<button type="button" class="egm-alat-tbl" data-alat="' + a[0] + '">' + ikon(a[1]) + '<span>' + a[2] + '</span></button>'; }).join('') +
            '</nav>';
        document.body.appendChild(r);
        el.root = r;
        el.kanvas = r.querySelector('.egm-kanvas');
        el.ctx = el.kanvas.getContext('2d');
        el.bungkus = r.querySelector('.egm-bungkus');
        el.panggung = r.querySelector('.egm-panggung');
        el.crop = r.querySelector('.egm-crop');
        el.aksiObj = r.querySelector('.egm-aksi-obj');
        el.opsi = r.querySelector('.egm-opsi');
        el.undo = r.querySelector('[data-aksi="undo"]');
        el.redo = r.querySelector('[data-aksi="redo"]');

        r.addEventListener('click', function (e) {
            var b = e.target.closest('[data-aksi]');
            if (b) { aksi(b.getAttribute('data-aksi')); return; }
            var a = e.target.closest('[data-alat]');
            if (a) { pilihAlat(a.getAttribute('data-alat')); return; }
            var o = e.target.closest('[data-ob]');
            if (o) aksiObjek(o.getAttribute('data-ob'));
        });
        el.kanvas.addEventListener('pointerdown', tekan);
        el.kanvas.addEventListener('pointermove', geser);
        el.kanvas.addEventListener('pointerup', lepas);
        el.kanvas.addEventListener('pointercancel', lepas);
        el.kanvas.addEventListener('wheel', function (e) {
            var o = objTerpilih();
            if (!o) return;
            e.preventDefault();
            o.s = Math.max(src.w * 0.01, Math.min(sisiPanjang(), o.s * (e.deltaY < 0 ? 1.06 : 0.94)));
            jadwalRender();
            tahan(300);
        }, { passive: false });
        el.kanvas.addEventListener('dblclick', function (e) {
            var o = objDiTitik(titikSumber(e));
            if (o && o.t === 't' && !o.emoji) { terpilih = o.id; pilihAlat('teks'); var inp = el.opsi.querySelector('.egm-input-teks'); if (inp) { inp.focus(); inp.select(); } }
        });
        el.crop.addEventListener('pointerdown', tekanCrop);
        window.addEventListener('resize', function () { if (terbuka) { hitungUkuran(); } });
        document.addEventListener('keydown', function (e) {
            if (!terbuka) return;
            var sedangMengetik = /^(INPUT|TEXTAREA)$/.test((e.target || {}).tagName || '');
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (sedangMengetik && e.target.blur) e.target.blur(); else aksi('batal'); return; }
            if ((e.ctrlKey || e.metaKey) && !sedangMengetik) {
                var kk = e.key.toLowerCase();
                if (kk === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
                else if (kk === 'y' || (kk === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
            }
            if ((e.key === 'Delete' || e.key === 'Backspace') && !sedangMengetik && terpilih) { e.preventDefault(); aksiObjek('hapus'); }
        }, true);
    }

    // ---------- muat gambar ----------
    function muatBitmap(file) {
        if (window.createImageBitmap) {
            return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(function () { return muatViaImg(file); });
        }
        return muatViaImg(file);
    }
    function muatViaImg(file) {
        return new Promise(function (ok, gagal) {
            var u = URL.createObjectURL(file);
            var im = new Image();
            im.onload = function () { URL.revokeObjectURL(u); ok(im); };
            im.onerror = function () { URL.revokeObjectURL(u); gagal(new Error('gagal memuat gambar')); };
            im.src = u;
        });
    }

    function siapkanSumber(bmp) {
        var w = bmp.width || bmp.naturalWidth, h = bmp.height || bmp.naturalHeight;
        var s = Math.min(1, MAKS_SISI / Math.max(w, h));
        var cw = Math.max(1, Math.round(w * s)), ch = Math.max(1, Math.round(h * s));
        var base = document.createElement('canvas');
        base.width = cw; base.height = ch;
        var c = base.getContext('2d');
        c.imageSmoothingQuality = 'high';
        c.drawImage(bmp, 0, 0, cw, ch);
        if (bmp.close) try { bmp.close(); } catch (e) { }
        src = { w: cw, h: ch, base: base, filt: base, filterId: 'asli' };
        layer = document.createElement('canvas');
        layer.width = cw; layer.height = ch;
        layerCtx = layer.getContext('2d');
        layerKotor = true;
    }

    function terapkanFilter(id) {
        var def = FILTER.filter(function (f) { return f.id === id; })[0];
        if (!def || !def.f) { src.filt = src.base; src.filterId = id; return; }
        var c = document.createElement('canvas');
        c.width = src.w; c.height = src.h;
        var cx = c.getContext('2d');
        cx.drawImage(src.base, 0, 0);
        var data = cx.getImageData(0, 0, src.w, src.h);
        saringPiksel(data.data, def.f);
        cx.putImageData(data, 0, 0);
        src.filt = c;
        src.filterId = id;
    }
    function saringPiksel(d, f) {
        var b = f.b == null ? 1 : f.b, c = f.c == null ? 1 : f.c, s = f.s == null ? 1 : f.s;
        var mr = f.r == null ? 1 : f.r, mb = f.bl == null ? 1 : f.bl;
        for (var i = 0; i < d.length; i += 4) {
            var r = d[i], g = d[i + 1], bl = d[i + 2];
            if (f.sepia) {
                var nr = 0.393 * r + 0.769 * g + 0.189 * bl;
                var ng = 0.349 * r + 0.686 * g + 0.168 * bl;
                var nb = 0.272 * r + 0.534 * g + 0.131 * bl;
                r = nr; g = ng; bl = nb;
            }
            var y = 0.299 * r + 0.587 * g + 0.114 * bl;
            r = y + (r - y) * s; g = y + (g - y) * s; bl = y + (bl - y) * s;
            r *= mr; bl *= mb;
            r = ((r * b) - 128) * c + 128; g = ((g * b) - 128) * c + 128; bl = ((bl * b) - 128) * c + 128;
            d[i] = r < 0 ? 0 : r > 255 ? 255 : r;
            d[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
            d[i + 2] = bl < 0 ? 0 : bl > 255 ? 255 : bl;
        }
    }

    // ---------- gambar ----------
    function gambarCoretan(c, o) {
        var p = o.p;
        if (!p || !p.length) return;
        c.save();
        c.lineCap = 'round';
        c.lineJoin = 'round';
        c.lineWidth = o.w;
        if (o.e) { c.globalCompositeOperation = 'destination-out'; c.strokeStyle = '#000'; }
        else { c.strokeStyle = o.c; if (o.h) c.globalAlpha = 0.4; }
        if (o.h && !o.e) c.lineCap = 'butt';
        c.beginPath();
        if (o.lurus && p.length > 1) {
            c.moveTo(p[0][0], p[0][1]);
            c.lineTo(p[p.length - 1][0], p[p.length - 1][1]);
        } else if (p.length === 1) {
            c.moveTo(p[0][0], p[0][1]);
            c.lineTo(p[0][0] + 0.01, p[0][1]);
        } else {
            c.moveTo(p[0][0], p[0][1]);
            for (var i = 1; i < p.length - 1; i++) {
                var mx = (p[i][0] + p[i + 1][0]) / 2, my = (p[i][1] + p[i + 1][1]) / 2;
                c.quadraticCurveTo(p[i][0], p[i][1], mx, my);
            }
            c.lineTo(p[p.length - 1][0], p[p.length - 1][1]);
        }
        c.stroke();
        c.restore();
    }
    function bangunUlangLayer() {
        layerCtx.clearRect(0, 0, layer.width, layer.height);
        st.objs.forEach(function (o) { if (o.t === 's') gambarCoretan(layerCtx, o); });
        layerKotor = false;
    }
    function teksBaris(o) { return String(o.txt || '').split('\n'); }
    function fontObj(o) { return (o.emoji ? '' : (o.tebal ? '700 ' : '500 ')) + o.s + 'px ' + (o.emoji ? '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif' : 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif'); }
    function ukurObj(c, o) {
        c.save();
        c.font = fontObj(o);
        var baris = teksBaris(o), lebar = 0;
        baris.forEach(function (b) { lebar = Math.max(lebar, c.measureText(b || ' ').width, o.s * 0.5); });
        c.restore();
        var lh = o.s * 1.22;
        var pad = o.latar ? o.s * 0.35 : 0;
        o._w = lebar + pad * 2;
        o._h = lh * baris.length + pad * 2;
        o._lh = lh; o._pad = pad;
    }
    function luminansi(hex) {
        var n = parseInt(hex.slice(1), 16);
        return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    }
    function gambarObj(c, o, pilih, skalaTampil) {
        ukurObj(c, o);
        c.save();
        c.translate(o.x, o.y);
        c.rotate((o.rot || 0) * Math.PI / 180);
        c.font = fontObj(o);
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        var baris = teksBaris(o);
        if (o.latar && !o.emoji) {
            c.fillStyle = o.c;
            var r = o.s * 0.3;
            rrect(c, -o._w / 2, -o._h / 2, o._w, o._h, r);
            c.fill();
            c.fillStyle = luminansi(o.c) > 0.6 ? '#111' : '#fff';
        } else if (!o.emoji) {
            c.fillStyle = o.c;
            c.lineJoin = 'round';
            c.lineWidth = Math.max(1, o.s * 0.08);
            c.strokeStyle = luminansi(o.c) > 0.55 ? 'rgba(0,0,0,.55)' : 'rgba(255,255,255,.55)';
        }
        var y0 = -o._h / 2 + o._pad + o._lh / 2;
        baris.forEach(function (b, i) {
            var yy = y0 + i * o._lh;
            if (!o.latar && !o.emoji) c.strokeText(b, 0, yy);
            c.fillText(b, 0, yy);
        });
        if (pilih) {
            c.strokeStyle = '#fff';
            c.lineWidth = 2 / skalaTampil;
            c.setLineDash([6 / skalaTampil, 5 / skalaTampil]);
            c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 3;
            c.strokeRect(-o._w / 2 - 6 / skalaTampil, -o._h / 2 - 6 / skalaTampil, o._w + 12 / skalaTampil, o._h + 12 / skalaTampil);
        }
        c.restore();
    }
    function rrect(c, x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        c.beginPath();
        c.moveTo(x + r, y);
        c.arcTo(x + w, y, x + w, y + h, r);
        c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r);
        c.arcTo(x, y, x + w, y, r);
        c.closePath();
    }

    function gambarSemua(c, skala, crop, interaktif) {
        c.save();
        var m = matriks(crop, skala);
        c.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
        c.imageSmoothingQuality = 'high';
        c.drawImage(src.filt, 0, 0);
        if (layerKotor) bangunUlangLayer();
        c.drawImage(layer, 0, 0);
        if (gambarAktif && !gambarAktif.e) gambarCoretan(c, gambarAktif);
        st.objs.forEach(function (o) {
            if (o.t === 't') gambarObj(c, o, interaktif && o.id === terpilih, skala);
        });
        c.restore();
    }

    function jadwalRender() {
        if (raf) return;
        raf = requestAnimationFrame(function () { raf = 0; render(); });
    }
    function render() {
        if (!terbuka || !src) return;
        var crop = cropAktif();
        var c = el.ctx;
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.clearRect(0, 0, el.kanvas.width, el.kanvas.height);
        gambarSemua(c, k * dpr, crop, true);
        posisiAksiObjek();
    }

    function hitungUkuran() {
        if (!src) return;
        var crop = cropAktif();
        var p = el.panggung.getBoundingClientRect();
        var maxW = Math.max(120, p.width - 24), maxH = Math.max(120, p.height - 24);
        k = Math.min(maxW / crop.w, maxH / crop.h);
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        var cw = Math.max(1, Math.round(crop.w * k)), ch = Math.max(1, Math.round(crop.h * k));
        k = cw / crop.w;
        el.kanvas.style.width = cw + 'px';
        el.kanvas.style.height = ch + 'px';
        el.kanvas.width = Math.round(cw * dpr);
        el.kanvas.height = Math.round(ch * dpr);
        el.bungkus.style.width = cw + 'px';
        el.bungkus.style.height = ch + 'px';
        posisiCrop();
        render();
    }

    // ---------- koordinat ----------
    function titikSumber(e) {
        var rc = el.kanvas.getBoundingClientRect();
        var x = (e.clientX - rc.left), y = (e.clientY - rc.top);
        var inv = matriks(cropAktif(), k).inverse();
        var p = inv.transformPoint({ x: x, y: y });
        return { x: p.x, y: p.y, cx: x, cy: y };
    }
    function objDiTitik(p) {
        for (var i = st.objs.length - 1; i >= 0; i--) {
            var o = st.objs[i];
            if (o.t !== 't') continue;
            if (o._w == null) ukurObj(el.ctx, o);
            var a = -(o.rot || 0) * Math.PI / 180;
            var dx = p.x - o.x, dy = p.y - o.y;
            var lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
            var pad = 10 / k;
            if (Math.abs(lx) <= o._w / 2 + pad && Math.abs(ly) <= o._h / 2 + pad) return o;
        }
        return null;
    }
    function objTerpilih() {
        if (!terpilih) return null;
        for (var i = 0; i < st.objs.length; i++) if (st.objs[i].id === terpilih) return st.objs[i];
        return null;
    }

    // ---------- pointer ----------
    function tekan(e) {
        if (alat === 'potong') return;
        e.preventDefault();
        el.kanvas.setPointerCapture && el.kanvas.setPointerCapture(e.pointerId);
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        var o = objTerpilih();
        if (pointers.size === 2 && o) {
            gambarAktif = null;
            var ps = Array.from(pointers.values());
            gestur = { jenis: 'cubit', d: jarak(ps), a: sudut(ps), s: o.s, rot: o.rot || 0 };
            return;
        }
        if (pointers.size > 1) return;
        var p = titikSumber(e);
        var kena = objDiTitik(p);
        if (alat === 'gambar' && !kena) {
            terpilih = null; tampilkanAksiObj();
            mulaiCoretan(p, e);
            return;
        }
        if (kena && (alat === 'teks' || alat === 'stiker' || alat === 'gambar')) {
            if (terpilih !== kena.id) { terpilih = kena.id; segarkanOpsiObjek(); }
            gestur = { jenis: 'geser', dx: p.x - kena.x, dy: p.y - kena.y, awal: { x: kena.x, y: kena.y }, geser: false };
            tampilkanAksiObj();
            jadwalRender();
            return;
        }
        if (alat === 'teks') {
            tambahTeks(p);
            return;
        }
        terpilih = null;
        tampilkanAksiObj();
        jadwalRender();
    }
    function jarak(ps) { return Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) || 1; }
    function sudut(ps) { return Math.atan2(ps[1].y - ps[0].y, ps[1].x - ps[0].x) * 180 / Math.PI; }

    function geser(e) {
        if (!pointers.has(e.pointerId)) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        var o = objTerpilih();
        if (gestur && gestur.jenis === 'cubit' && pointers.size === 2 && o) {
            var ps = Array.from(pointers.values());
            o.s = Math.max(src.w * 0.01, Math.min(sisiPanjang(), gestur.s * jarak(ps) / gestur.d));
            o.rot = gestur.rot + (sudut(ps) - gestur.a);
            jadwalRender();
            return;
        }
        if (gambarAktif) {
            var p = titikSumber(e);
            var pt = gambarAktif.p;
            if (gambarAktif.lurus) {
                var q = p;
                if (e.shiftKey) { q = kunciSudut(pt[0], p); }
                gambarAktif.p = [pt[0], [q.x, q.y]];
            } else {
                var last = pt[pt.length - 1];
                if (Math.hypot(p.x - last[0], p.y - last[1]) * k >= 1.5) {
                    pt.push([Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10]);
                    if (gambarAktif.e) gambarCoretan(layerCtx, { e: true, w: gambarAktif.w, p: pt.slice(-3) });
                }
            }
            jadwalRender();
            return;
        }
        if (gestur && gestur.jenis === 'geser' && o) {
            var pp = titikSumber(e);
            o.x = pp.x - gestur.dx; o.y = pp.y - gestur.dy;
            if (Math.hypot(o.x - gestur.awal.x, o.y - gestur.awal.y) * k > 3) gestur.geser = true;
            jadwalRender();
        }
    }
    function kunciSudut(a, p) {
        var dx = p.x - a[0], dy = p.y - a[1];
        var ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
        var d = Math.hypot(dx, dy);
        return { x: a[0] + Math.cos(ang) * d, y: a[1] + Math.sin(ang) * d };
    }
    function lepas(e) {
        if (!pointers.has(e.pointerId)) return;
        pointers.delete(e.pointerId);
        if (gambarAktif) {
            var o = gambarAktif;
            gambarAktif = null;
            if (o.e) {
                st.objs.push(o);
            } else {
                st.objs.push(o);
                gambarCoretan(layerCtx, o);
            }
            catatRiwayat();
            jadwalRender();
        } else if (gestur) {
            if (gestur.jenis === 'cubit' ? pointers.size < 2 : true) {
                if (gestur.jenis === 'cubit' || gestur.geser) catatRiwayat();
                gestur = null;
            }
        }
        if (pointers.size === 0) gestur = null;
    }
    var timerTahan = 0;
    function tahan(ms) { clearTimeout(timerTahan); timerTahan = setTimeout(catatRiwayat, ms); }

    function mulaiCoretan(p, e) {
        var mode = opsiGambar.mode;
        var lebar = opsiGambar.ukuran * sisiPanjang() / 700;
        if (mode === 'sorot') lebar *= 2.4;
        if (mode === 'hapus') lebar *= 1.8;
        gambarAktif = {
            id: 'o' + (idSeq++), t: 's', c: opsiGambar.warna, w: lebar,
            h: mode === 'sorot', e: mode === 'hapus', lurus: mode === 'garis',
            p: [[Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10]]
        };
        if (gambarAktif.e) gambarCoretan(layerCtx, gambarAktif);
        jadwalRender();
    }

    function tambahTeks(p) {
        var o = { id: 'o' + (idSeq++), t: 't', x: p.x, y: p.y, s: opsiTeks.ukuran * sisiPanjang() / 220, c: opsiTeks.warna, txt: '', latar: opsiTeks.latar, tebal: opsiTeks.tebal, rot: 0 };
        st.objs.push(o);
        terpilih = o.id;
        o.baru = true;
        segarkanOpsiObjek();
        tampilkanAksiObj();
        var inp = el.opsi.querySelector('.egm-input-teks');
        if (inp) { inp.value = ''; setTimeout(function () { inp.focus(); }, 30); }
        jadwalRender();
    }
    function tambahEmoji(ch) {
        var g = geom(), c = cropAktif();
        var o = { id: 'o' + (idSeq++), t: 't', emoji: true, txt: ch, x: 0, y: 0, s: sisiPanjang() / 6, rot: 0 };
        // letakkan di tengah area yang tampil (koordinat sumber)
        var inv = matriks(c, 1).inverse();
        var q = inv.transformPoint({ x: c.w / 2, y: c.h / 2 });
        o.x = q.x; o.y = q.y;
        o.s = Math.min(c.w, c.h) / 4;
        st.objs.push(o);
        terpilih = o.id;
        catatRiwayat();
        tampilkanAksiObj();
        jadwalRender();
    }

    function aksiObjek(a) {
        var o = objTerpilih();
        if (!o) return;
        if (a === 'hapus') {
            st.objs = st.objs.filter(function (x) { return x.id !== o.id; });
            terpilih = null;
            segarkanOpsiObjek();
        } else if (a === 'kecil') o.s = Math.max(src.w * 0.01, o.s * 0.88);
        else if (a === 'besar') o.s = Math.min(sisiPanjang(), o.s * 1.14);
        else if (a === 'kiri') o.rot = (o.rot || 0) - 15;
        else if (a === 'kanan') o.rot = (o.rot || 0) + 15;
        catatRiwayat();
        tampilkanAksiObj();
        jadwalRender();
    }
    function tampilkanAksiObj() {
        var o = objTerpilih();
        el.aksiObj.hidden = !o || alat === 'potong';
        posisiAksiObjek();
    }
    function posisiAksiObjek() {
        var o = objTerpilih();
        if (!o || el.aksiObj.hidden) return;
        var m = matriks(cropAktif(), k);
        var p = m.transformPoint({ x: o.x, y: o.y });
        var w = el.aksiObj.offsetWidth || 190;
        var x = Math.max(w / 2 + 4, Math.min(el.bungkus.offsetWidth - w / 2 - 4, p.x));
        var y = p.y - (o._h || 0) * k / 2 - 52;
        if (y < 4) y = p.y + (o._h || 0) * k / 2 + 16;
        el.aksiObj.style.left = x + 'px';
        el.aksiObj.style.top = Math.max(4, Math.min(el.bungkus.offsetHeight - 44, y)) + 'px';
    }

    // ---------- riwayat ----------
    function potret() {
        return JSON.stringify({ rot: st.rot, flip: st.flip, crop: st.crop, filter: st.filter, objs: st.objs.map(function (o) { var c = {}; for (var kk in o) if (kk[0] !== '_') c[kk] = o[kk]; return c; }) });
    }
    function catatRiwayat() {
        clearTimeout(timerTahan);
        if (!st) return;
        var s = potret();
        if (riwayat[idxRiwayat] === s) { segarkanTombolRiwayat(); return; }
        riwayat = riwayat.slice(0, idxRiwayat + 1);
        riwayat.push(s);
        if (riwayat.length > MAKS_RIWAYAT) riwayat.shift();
        idxRiwayat = riwayat.length - 1;
        segarkanTombolRiwayat();
    }
    function pulihkan(s) {
        var d = JSON.parse(s);
        var filterBerubah = d.filter !== st.filter;
        st.rot = d.rot; st.flip = d.flip; st.crop = d.crop; st.filter = d.filter; st.objs = d.objs;
        if (filterBerubah) terapkanFilter(st.filter);
        layerKotor = true;
        if (terpilih && !objTerpilih()) terpilih = null;
        if (alat === 'potong') { cropEdit = klon(st.crop || penuh()); }
        hitungUkuran();
        segarkanOpsi();
        tampilkanAksiObj();
        segarkanTombolRiwayat();
    }
    function undo() { if (alat === 'potong') terapkanCrop(); if (idxRiwayat > 0) { idxRiwayat--; pulihkan(riwayat[idxRiwayat]); } }
    function redo() { if (alat === 'potong') terapkanCrop(); if (idxRiwayat < riwayat.length - 1) { idxRiwayat++; pulihkan(riwayat[idxRiwayat]); } }
    function segarkanTombolRiwayat() {
        el.undo.disabled = idxRiwayat <= 0;
        el.redo.disabled = idxRiwayat >= riwayat.length - 1;
    }

    // ---------- alat & panel opsi ----------
    function pilihAlat(a) {
        if (alat === 'potong' && a !== 'potong') terapkanCrop();
        if (alat === 'teks' && a !== 'teks') bersihkanTeksKosong();
        alat = a;
        if (a === 'potong') {
            terpilih = null;
            cropEdit = klon(st.crop || penuh());
        }
        el.root.querySelectorAll('[data-alat]').forEach(function (b) {
            b.classList.toggle('aktif', b.getAttribute('data-alat') === a);
        });
        el.root.classList.toggle('egm-potong', a === 'potong');
        el.crop.hidden = a !== 'potong';
        hitungUkuran();
        segarkanOpsi();
        tampilkanAksiObj();
    }
    function penuh() { var g = geom(); return { x: 0, y: 0, w: g.rw, h: g.rh }; }
    function bersihkanTeksKosong() {
        var n = st.objs.length;
        st.objs = st.objs.filter(function (o) { return !(o.t === 't' && !o.emoji && !String(o.txt).trim()); });
        if (st.objs.length !== n) { terpilih = objTerpilih() ? terpilih : null; catatRiwayat(); }
        else {
            var o = objTerpilih();
            if (o) delete o.baru;
        }
    }

    function paletHtml(aktif, nama) {
        return '<div class="egm-palet" data-palet="' + nama + '">' + WARNA.map(function (w) {
            return '<button type="button" class="egm-warna' + (w.toLowerCase() === String(aktif).toLowerCase() ? ' aktif' : '') + '" data-warna="' + w + '" style="--w:' + w + '" aria-label="Warna ' + w + '"></button>';
        }).join('') + '<label class="egm-warna egm-warna-bebas" title="Warna lain"><input type="color" value="' + aktif + '" data-warna-bebas="' + nama + '" aria-label="Pilih warna lain"></label></div>';
    }

    function segarkanOpsiObjek() { if (alat === 'teks' || alat === 'stiker') segarkanOpsi(); }

    function segarkanOpsi() {
        var h = '';
        if (alat === 'gambar') {
            var mode = opsiGambar.mode;
            h = '<div class="egm-baris egm-baris-mode">' +
                [['pena', 'pena', 'Pena'], ['sorot', 'sorot', 'Sorot'], ['garis', 'garis', 'Garis'], ['hapus', 'hapus', 'Hapus']].map(function (m) {
                    return '<button type="button" class="egm-chip' + (mode === m[0] ? ' aktif' : '') + '" data-mode="' + m[0] + '">' + ikon(m[1], 18) + '<span>' + m[2] + '</span></button>';
                }).join('') + '</div>' +
                (mode === 'hapus' ? '' : paletHtml(opsiGambar.warna, 'gambar')) +
                '<div class="egm-baris egm-baris-ukuran"><span>Tebal</span><input type="range" min="2" max="40" value="' + opsiGambar.ukuran + '" data-ukuran="gambar" aria-label="Ketebalan"><i class="egm-contoh" style="--u:' + Math.max(3, opsiGambar.ukuran) + 'px;--w:' + (mode === 'hapus' ? '#999' : opsiGambar.warna) + '"></i></div>';
        } else if (alat === 'teks') {
            var o = objTerpilih();
            var ot = (o && o.t === 't' && !o.emoji) ? o : null;
            var wr = ot ? ot.c : opsiTeks.warna;
            h = '<div class="egm-baris egm-baris-teks">' +
                '<textarea class="egm-input-teks" rows="1" placeholder="' + (ot ? 'Ketik teks...' : 'Ketuk gambar untuk menambah teks') + '"' + (ot ? '' : ' disabled') + ' aria-label="Isi teks">' + (ot ? esc(ot.txt) : '') + '</textarea>' +
                '<button type="button" class="egm-chip' + ((ot ? ot.latar : opsiTeks.latar) ? ' aktif' : '') + '" data-teks-latar title="Latar teks">' + ikon('teks', 18) + '<span>Latar</span></button>' +
                '<button type="button" class="egm-chip' + ((ot ? ot.tebal : opsiTeks.tebal) ? ' aktif' : '') + '" data-teks-tebal title="Tebal"><b>B</b></button>' +
                '</div>' + paletHtml(wr, 'teks');
        } else if (alat === 'stiker') {
            h = '<div class="egm-emoji-grid">' + EMOJI.map(function (ch) { return '<button type="button" data-emoji="' + ch + '" aria-label="Stiker ' + ch + '">' + ch + '</button>'; }).join('') + '</div>';
        } else if (alat === 'potong') {
            h = '<div class="egm-baris egm-baris-aspek">' + ASPEK.map(function (a) {
                return '<button type="button" class="egm-chip' + (aspekAktif === a.id ? ' aktif' : '') + '" data-aspek="' + a.id + '">' + a.label + '</button>';
            }).join('') + '<button type="button" class="egm-chip" data-crop-reset>' + ikon('reset', 16) + '<span>Reset</span></button></div>';
        } else if (alat === 'filter') {
            h = '<div class="egm-filter-baris">' + FILTER.map(function (f) {
                return '<button type="button" class="egm-filter' + (st.filter === f.id ? ' aktif' : '') + '" data-filter="' + f.id + '"><canvas width="56" height="56" data-fc="' + f.id + '"></canvas><span>' + f.label + '</span></button>';
            }).join('') + '</div>';
        }
        el.opsi.innerHTML = h;
        if (alat === 'filter') gambarThumbFilter();
        pasangOpsi();
    }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    function gambarThumbFilter() {
        var kecil = document.createElement('canvas');
        var s = 56, sc = Math.max(src.w, src.h) / s;
        kecil.width = Math.round(src.w / sc); kecil.height = Math.round(src.h / sc);
        kecil.getContext('2d').drawImage(src.base, 0, 0, kecil.width, kecil.height);
        el.opsi.querySelectorAll('canvas[data-fc]').forEach(function (cv) {
            var def = FILTER.filter(function (f) { return f.id === cv.getAttribute('data-fc'); })[0];
            var tmp = document.createElement('canvas');
            tmp.width = kecil.width; tmp.height = kecil.height;
            var tc = tmp.getContext('2d');
            tc.drawImage(kecil, 0, 0);
            if (def && def.f) {
                var d = tc.getImageData(0, 0, tmp.width, tmp.height);
                saringPiksel(d.data, def.f);
                tc.putImageData(d, 0, 0);
            }
            var cx = cv.getContext('2d');
            var rs = Math.max(tmp.width, tmp.height);
            var ww = tmp.width * 56 / rs, hh = tmp.height * 56 / rs;
            cx.drawImage(tmp, 0, 0, tmp.width, tmp.height, (56 - ww) / 2, (56 - hh) / 2, ww, hh);
        });
    }

    function pasangOpsi() {
        var o = el.opsi;
        o.querySelectorAll('[data-mode]').forEach(function (b) {
            b.onclick = function () { opsiGambar.mode = b.getAttribute('data-mode'); segarkanOpsi(); };
        });
        o.querySelectorAll('[data-palet]').forEach(function (p) {
            var nama = p.getAttribute('data-palet');
            p.querySelectorAll('[data-warna]').forEach(function (b) {
                b.onclick = function () { setWarna(nama, b.getAttribute('data-warna')); };
            });
            var bebas = p.querySelector('[data-warna-bebas]');
            if (bebas) {
                bebas.oninput = function () { setWarna(nama, bebas.value, true); };
                bebas.onchange = function () { setWarna(nama, bebas.value); };
            }
        });
        var ur = o.querySelector('[data-ukuran="gambar"]');
        if (ur) ur.oninput = function () {
            opsiGambar.ukuran = Number(ur.value);
            var c = o.querySelector('.egm-contoh');
            if (c) c.style.setProperty('--u', Math.max(3, opsiGambar.ukuran) + 'px');
        };
        var it = o.querySelector('.egm-input-teks');
        if (it) {
            var fit = function () { it.style.height = 'auto'; it.style.height = Math.min(96, it.scrollHeight) + 'px'; };
            fit();
            it.oninput = function () {
                var ob = objTerpilih();
                if (ob && ob.t === 't') { ob.txt = it.value; jadwalRender(); tahan(500); }
                fit();
            };
        }
        var lt = o.querySelector('[data-teks-latar]');
        if (lt) lt.onclick = function () {
            var ob = objTerpilih();
            if (ob && ob.t === 't' && !ob.emoji) { ob.latar = !ob.latar; opsiTeks.latar = ob.latar; catatRiwayat(); } else opsiTeks.latar = !opsiTeks.latar;
            segarkanOpsi(); jadwalRender();
        };
        var tb = o.querySelector('[data-teks-tebal]');
        if (tb) tb.onclick = function () {
            var ob = objTerpilih();
            if (ob && ob.t === 't' && !ob.emoji) { ob.tebal = !ob.tebal; opsiTeks.tebal = ob.tebal; catatRiwayat(); } else opsiTeks.tebal = !opsiTeks.tebal;
            segarkanOpsi(); jadwalRender();
        };
        o.querySelectorAll('[data-emoji]').forEach(function (b) {
            b.onclick = function () { tambahEmoji(b.getAttribute('data-emoji')); };
        });
        o.querySelectorAll('[data-aspek]').forEach(function (b) {
            b.onclick = function () { setAspek(b.getAttribute('data-aspek')); };
        });
        var cr = o.querySelector('[data-crop-reset]');
        if (cr) cr.onclick = function () { aspekAktif = 'bebas'; cropEdit = penuh(); posisiCrop(); segarkanOpsi(); };
        o.querySelectorAll('[data-filter]').forEach(function (b) {
            b.onclick = function () {
                var id = b.getAttribute('data-filter');
                if (st.filter === id) return;
                st.filter = id;
                terapkanFilter(id);
                catatRiwayat();
                segarkanOpsi();
                jadwalRender();
            };
        });
    }
    function setWarna(nama, w, sementara) {
        if (nama === 'gambar') {
            opsiGambar.warna = w;
            if (opsiGambar.mode === 'hapus') opsiGambar.mode = 'pena';
        } else {
            opsiTeks.warna = w;
            var ob = objTerpilih();
            if (ob && ob.t === 't' && !ob.emoji) { ob.c = w; if (!sementara) catatRiwayat(); jadwalRender(); }
        }
        if (sementara) {
            var c = el.opsi.querySelector('.egm-contoh');
            if (c) c.style.setProperty('--w', w);
            return;
        }
        segarkanOpsi();
    }

    // ---------- potong ----------
    function setAspek(id) {
        aspekAktif = id;
        var a = ASPEK.filter(function (x) { return x.id === id; })[0];
        var g = geom();
        var r = a.r === -1 ? g.rw / g.rh : a.r;
        if (r > 0) {
            var c = cropEdit, cx = c.x + c.w / 2, cy = c.y + c.h / 2;
            var w = c.w, h = w / r;
            if (h > c.h) { h = c.h; w = h * r; }
            if (a.r === -1) { w = g.rw; h = g.rh; cx = g.rw / 2; cy = g.rh / 2; }
            cropEdit = { x: cx - w / 2, y: cy - h / 2, w: w, h: h };
            jepit(cropEdit);
        }
        posisiCrop();
        segarkanOpsi();
    }
    function jepit(c) {
        var g = geom();
        c.w = Math.min(c.w, g.rw); c.h = Math.min(c.h, g.rh);
        c.x = Math.max(0, Math.min(g.rw - c.w, c.x));
        c.y = Math.max(0, Math.min(g.rh - c.h, c.y));
    }
    function posisiCrop() {
        if (alat !== 'potong' || !cropEdit) return;
        var s = el.crop.style;
        s.left = cropEdit.x * k + 'px';
        s.top = cropEdit.y * k + 'px';
        s.width = cropEdit.w * k + 'px';
        s.height = cropEdit.h * k + 'px';
    }
    function tekanCrop(e) {
        e.preventDefault();
        var h = e.target.getAttribute && e.target.getAttribute('data-h');
        var rc = el.bungkus.getBoundingClientRect();
        var awal = klon(cropEdit);
        var px0 = (e.clientX - rc.left) / k, py0 = (e.clientY - rc.top) / k;
        var g = geom();
        var a = ASPEK.filter(function (x) { return x.id === aspekAktif; })[0];
        var rasio = a && a.r ? (a.r === -1 ? g.rw / g.rh : a.r) : 0;
        var MIN = Math.max(24, sisiPanjang() * 0.03);
        el.crop.setPointerCapture && el.crop.setPointerCapture(e.pointerId);
        function gerak(ev) {
            var px = (ev.clientX - rc.left) / k, py = (ev.clientY - rc.top) / k;
            var x1 = awal.x, y1 = awal.y, x2 = awal.x + awal.w, y2 = awal.y + awal.h;
            if (!h) {
                var dx = px - px0, dy = py - py0;
                var c = { x: awal.x + dx, y: awal.y + dy, w: awal.w, h: awal.h };
                jepit(c);
                cropEdit = c;
                posisiCrop();
                return;
            }
            var dxh = h.indexOf('w') >= 0 ? -1 : h.indexOf('e') >= 0 ? 1 : 0;
            var dyh = h.indexOf('n') >= 0 ? -1 : h.indexOf('s') >= 0 ? 1 : 0;
            px = Math.max(0, Math.min(g.rw, px)); py = Math.max(0, Math.min(g.rh, py));
            if (dxh < 0) x1 = Math.min(px, x2 - MIN); if (dxh > 0) x2 = Math.max(px, x1 + MIN);
            if (dyh < 0) y1 = Math.min(py, y2 - MIN); if (dyh > 0) y2 = Math.max(py, y1 + MIN);
            if (rasio) {
                var w = x2 - x1, hh = y2 - y1;
                if (dxh && dyh) {
                    var w2 = Math.max(w, hh * rasio);
                    var maxW = dxh < 0 ? x2 : g.rw - x1, maxH = dyh < 0 ? y2 : g.rh - y1;
                    w2 = Math.min(w2, maxW, maxH * rasio);
                    var h2 = w2 / rasio;
                    if (dxh < 0) x1 = x2 - w2; else x2 = x1 + w2;
                    if (dyh < 0) y1 = y2 - h2; else y2 = y1 + h2;
                } else if (dxh) {
                    var cyy = (awal.y + awal.h / 2);
                    var hw = w / rasio;
                    hw = Math.min(hw, g.rh);
                    var wfix = hw * rasio;
                    if (dxh < 0) x1 = x2 - wfix; else x2 = x1 + wfix;
                    y1 = Math.max(0, Math.min(g.rh - hw, cyy - hw / 2)); y2 = y1 + hw;
                } else {
                    var cxx = (awal.x + awal.w / 2);
                    var ww = hh * rasio;
                    ww = Math.min(ww, g.rw);
                    var hfix = ww / rasio;
                    if (dyh < 0) y1 = y2 - hfix; else y2 = y1 + hfix;
                    x1 = Math.max(0, Math.min(g.rw - ww, cxx - ww / 2)); x2 = x1 + ww;
                }
            }
            cropEdit = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
            posisiCrop();
        }
        function selesaiGerak() {
            el.crop.removeEventListener('pointermove', gerak);
            el.crop.removeEventListener('pointerup', selesaiGerak);
            el.crop.removeEventListener('pointercancel', selesaiGerak);
        }
        el.crop.addEventListener('pointermove', gerak);
        el.crop.addEventListener('pointerup', selesaiGerak);
        el.crop.addEventListener('pointercancel', selesaiGerak);
    }
    function terapkanCrop() {
        if (!cropEdit) return;
        var g = geom();
        var c = { x: Math.round(cropEdit.x), y: Math.round(cropEdit.y), w: Math.max(1, Math.round(cropEdit.w)), h: Math.max(1, Math.round(cropEdit.h)) };
        var penuhSemua = c.x <= 0 && c.y <= 0 && c.w >= g.rw && c.h >= g.rh;
        var baru = penuhSemua ? null : c;
        if (JSON.stringify(baru) !== JSON.stringify(st.crop)) { st.crop = baru; catatRiwayat(); }
        cropEdit = null;
    }

    // ---------- putar / balik ----------
    function transformCrop(c, jenis) {
        if (!c) return c;
        var g = geom();
        if (jenis === 'kanan') return { x: g.rh - (c.y + c.h), y: c.x, w: c.h, h: c.w };
        if (jenis === 'kiri') return { x: c.y, y: g.rw - (c.x + c.w), w: c.h, h: c.w };
        return { x: g.rw - (c.x + c.w), y: c.y, w: c.w, h: c.h };
    }
    function putar(arah) {
        if (alat === 'potong') terapkanCrop();
        st.crop = transformCrop(st.crop, arah);
        st.rot = (st.rot + (arah === 'kanan' ? 1 : 3)) % 4;
        if (alat === 'potong') cropEdit = klon(st.crop || penuh());
        catatRiwayat();
        hitungUkuran();
        tampilkanAksiObj();
    }
    function balik() {
        if (alat === 'potong') terapkanCrop();
        st.crop = transformCrop(st.crop, 'balik');
        st.flip = !st.flip;
        if (st.rot % 2 === 1) st.rot = (st.rot + 2) % 4;
        if (alat === 'potong') cropEdit = klon(st.crop || penuh());
        catatRiwayat();
        hitungUkuran();
        tampilkanAksiObj();
    }

    // ---------- aksi utama ----------
    function aksi(a) {
        if (a === 'batal') { tutup(false); }
        else if (a === 'selesai') { selesai(); }
        else if (a === 'undo') undo();
        else if (a === 'redo') redo();
        else if (a === 'putar-kiri') putar('kiri');
        else if (a === 'putar-kanan') putar('kanan');
        else if (a === 'balik') balik();
        else if (a === 'reset') {
            st.rot = 0; st.flip = false; st.crop = null; st.objs = []; terpilih = null;
            if (st.filter !== 'asli') { st.filter = 'asli'; terapkanFilter('asli'); }
            cropEdit = alat === 'potong' ? penuh() : null;
            layerKotor = true;
            catatRiwayat();
            hitungUkuran();
            segarkanOpsi();
            tampilkanAksiObj();
        }
    }

    function tutup() {
        terbuka = false;
        if (el.root) el.root.hidden = true;
        document.documentElement.classList.remove('egm-terbuka');
        src = null; st = null; item = null; riwayat = []; idxRiwayat = -1;
        pointers.clear(); gestur = null; gambarAktif = null; layer = layerCtx = null;
        var pa = document.getElementById('panel-preview-gambar');
        var cap = document.getElementById('input-caption-gambar');
        if (cap && pa && !pa.hidden) cap.focus();
    }

    function ekspor() {
        var crop = st.crop || penuh();
        var cw = Math.max(1, Math.round(crop.w)), ch = Math.max(1, Math.round(crop.h));
        var cv = document.createElement('canvas');
        cv.width = cw; cv.height = ch;
        var c = cv.getContext('2d');
        terpilih = null;
        gambarSemua(c, 1, { x: crop.x, y: crop.y, w: crop.w, h: crop.h }, false);
        return cv;
    }

    function selesai() {
        if (!item || !st) return tutup();
        if (alat === 'potong') terapkanCrop();
        if (alat === 'teks') bersihkanTeksKosong();
        var tujuan = item;
        var asli = tujuan.fileAsli || tujuan.file;
        var s = klon({ rot: st.rot, flip: st.flip, crop: st.crop, filter: st.filter, objs: st.objs.map(function (o) { var c = {}; for (var kk in o) if (kk[0] !== '_' && kk !== 'baru') c[kk] = o[kk]; return c; }) });
        if (!adaPerubahan(s)) {
            pulihkanAsli(tujuan);
            tutup();
            segarkanPanel();
            return;
        }
        var cv = ekspor();
        var tipeAsli = (asli.type || '').toLowerCase();
        var jpeg = /jpe?g/.test(tipeAsli);
        var tipe = jpeg ? 'image/jpeg' : 'image/png';
        var dasarNama = (tujuan.namaAsli || tujuan.name || 'foto').replace(/\.[a-z0-9]+$/i, '');
        var namaBaru = dasarNama + '-edit.' + (jpeg ? 'jpg' : 'png');
        var tombol = el.root.querySelector('[data-aksi="selesai"]');
        tombol.disabled = true;
        cv.toBlob(function (blob) {
            tombol.disabled = false;
            if (!blob) { alert('Gagal menyimpan hasil edit.'); return; }
            var f = new File([blob], namaBaru, { type: tipe, lastModified: Date.now() });
            if (!tujuan.fileAsli) { tujuan.fileAsli = tujuan.file; tujuan.namaAsli = tujuan.name; }
            if (tujuan.objectUrl) { try { URL.revokeObjectURL(tujuan.objectUrl); } catch (e) { } }
            tujuan.file = f;
            tujuan.name = namaBaru;
            tujuan.size = f.size;
            tujuan.objectUrl = URL.createObjectURL(f);
            tujuan.editState = s;
            tutup();
            segarkanPanel();
        }, tipe, 0.92);
    }
    function pulihkanAsli(tujuan) {
        if (!tujuan.fileAsli) { delete tujuan.editState; return; }
        if (tujuan.objectUrl) { try { URL.revokeObjectURL(tujuan.objectUrl); } catch (e) { } }
        tujuan.file = tujuan.fileAsli;
        tujuan.name = tujuan.namaAsli || tujuan.name;
        tujuan.size = tujuan.file.size;
        tujuan.objectUrl = URL.createObjectURL(tujuan.file);
        delete tujuan.fileAsli; delete tujuan.namaAsli; delete tujuan.editState;
    }
    function segarkanPanel() {
        if (typeof simpanCaptionSaatIni === 'function') simpanCaptionSaatIni();
        if (typeof renderKomposerPreviewGambar === 'function') renderKomposerPreviewGambar();
    }

    // ---------- buka ----------
    function buka(itemAntrean, alatAwal) {
        if (!itemAntrean || terbuka) return Promise.resolve();
        bangunDom();
        item = itemAntrean;
        var sumber = item.fileAsli || item.file;
        return muatBitmap(sumber).then(function (bmp) {
            siapkanSumber(bmp);
            st = item.editState ? klon(item.editState) : stateAwal();
            st.objs.forEach(function (o) { var n = parseInt(String(o.id).slice(1), 10); if (n >= idSeq) idSeq = n + 1; });
            if (st.filter !== 'asli') terapkanFilter(st.filter);
            riwayat = []; idxRiwayat = -1;
            terpilih = null; cropEdit = null; gambarAktif = null;
            terbuka = true;
            el.root.hidden = false;
            document.documentElement.classList.add('egm-terbuka');
            alat = '';
            catatRiwayat();
            pilihAlat(alatAwal || 'gambar');
            requestAnimationFrame(hitungUkuran);
        }).catch(function () {
            item = null;
            alert('Gambar ini tidak bisa dibuka di editor.');
        });
    }

    // ---------- sambungan ke panel pratinjau ----------
    function itemAktif() {
        try {
            return (typeof antreanGambar !== 'undefined' && antreanGambar[indeksPreviewAktif]) || null;
        } catch (e) { return null; }
    }
    function pasangPanel() {
        var panel = document.getElementById('panel-preview-gambar');
        if (!panel || panel.querySelector('.egm-pintas')) return;
        var header = panel.querySelector('.media-preview-header');
        var stage = panel.querySelector('.media-preview-stage');
        var bar = document.createElement('div');
        bar.className = 'egm-pintas';
        bar.innerHTML = [['potong', 'potong', 'Potong'], ['gambar', 'pena', 'Gambar'], ['teks', 'teks', 'Teks'], ['stiker', 'stiker', 'Stiker'], ['filter', 'filter', 'Filter']]
            .map(function (a) { return '<button type="button" data-edit="' + a[0] + '" title="' + a[2] + '">' + ikon(a[1], 18) + '<span>' + a[2] + '</span></button>'; }).join('');
        (stage || panel).appendChild(bar);
        bar.addEventListener('click', function (e) {
            var b = e.target.closest('[data-edit]');
            if (b) buka(itemAktif(), b.getAttribute('data-edit'));
        });
        if (header) {
            var counter = header.querySelector('.media-preview-counter');
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'egm-edit-tbl';
            btn.title = 'Edit gambar';
            btn.innerHTML = ikon('edit', 16) + '<span>Edit</span>';
            btn.addEventListener('click', function () { buka(itemAktif(), 'gambar'); });
            header.insertBefore(btn, counter || null);
        }
        var img = document.getElementById('img-utama-preview');
        if (img) {
            img.style.cursor = 'pointer';
            img.title = 'Klik dua kali untuk mengedit';
            img.addEventListener('dblclick', function () { buka(itemAktif(), 'gambar'); });
        }
        // tanda "diedit" pada info ukuran
        var info = document.getElementById('info-ukuran-file-preview');
        if (info && window.MutationObserver) {
            new MutationObserver(function () {
                var it = itemAktif();
                var tanda = info.querySelector('.egm-tanda');
                if (it && it.fileAsli) {
                    if (!tanda) { tanda = document.createElement('em'); tanda.className = 'egm-tanda'; tanda.textContent = ' · diedit'; info.appendChild(tanda); }
                } else if (tanda) tanda.remove();
            }).observe(info, { childList: true });
        }
    }
    // Esc di panel pratinjau jangan menutup panel saat editor terbuka (capture di atas sudah menangani)
    function init() { pasangPanel(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

    window.NgumpulEditorGambar = { buka: buka, tutup: tutup, apakahTerbuka: function () { return terbuka; } };
})();
