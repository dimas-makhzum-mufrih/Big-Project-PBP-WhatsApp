/**
 * NGUMPUL - Papan Gambar (drawboard bersama)
 * Dimuat otomatis oleh theme.js. Berjalan lokal tanpa backend:
 *  - data papan: meta di localStorage (ngumpul_papan_<id>), goresan di IndexedDB (ngumpul_papan_db)
 *  - sinkron langsung antar tab/akun lewat BroadcastChannel (goresan live, kursor, kehadiran)
 *  - izin menggambar dicek di sisi klien (pembuat, berdua/hanya aku, semua anggota/pilih anggota)
 * Dipakai chat pribadi (kartu pesan di chat-tampil.js) dan grup (lampiran mime papan).
 */
(function () {
    'use strict';
    if (window.NgumpulPapan) return;

    var skrip = document.currentScript && document.currentScript.src;
    if (skrip && !document.getElementById('papan-gambar-css')) {
        var lk = document.createElement('link');
        lk.rel = 'stylesheet';
        lk.id = 'papan-gambar-css';
        lk.href = skrip.replace(/js\/papan-gambar\.js.*$/, 'css/papan-gambar.css');
        document.head.appendChild(lk);
    }

    var MIME = 'application/x-ngumpul-papan';
    var KEY = 'ngumpul_papan_';
    var DB_NAMA = 'ngumpul_papan_db';
    var BW = 1600, BH = 1000, Q = 2;
    var WARNA = ['#111827', '#ffffff', '#ef4444', '#f97316', '#facc15', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#92400e', '#6b7280'];
    var WARNA_ORANG = ['#ef4444', '#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#ec4899', '#06b6d4', '#ca8a04'];
    var LATAR = [
        { id: 'putih', label: 'Putih' },
        { id: 'kotak', label: 'Kotak-kotak' },
        { id: 'titik', label: 'Titik' },
        { id: 'gelap', label: 'Gelap' }
    ];
    var ALAT = [
        ['geser', 'Geser', '<path d="M8 13V5a1.5 1.5 0 0 1 3 0v6"/><path d="M11 11V3.5a1.5 1.5 0 0 1 3 0V11"/><path d="M14 11V5a1.5 1.5 0 0 1 3 0v8"/><path d="M17 9.5a1.5 1.5 0 0 1 3 0V15a7 7 0 0 1-7 7h-1a7 7 0 0 1-5.4-2.6L3 14.5a1.6 1.6 0 0 1 2.4-2L8 15"/>'],
        ['pena', 'Pena', '<path d="m16 3 5 5L8 21l-5 1 1-5L16 3z"/><path d="m14 5 5 5"/>'],
        ['sorot', 'Sorot', '<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>'],
        ['hapus', 'Hapus', '<path d="m7 21-4-4a2 2 0 0 1 0-2.8l10-10a2 2 0 0 1 2.8 0l5 5a2 2 0 0 1 0 2.8L12 21H7z"/><path d="m8 9 7 7"/>'],
        ['garis', 'Garis lurus', '<path d="M5 19 19 5"/>'],
        ['panah', 'Panah', '<path d="M5 19 19 5"/><path d="M9 5h10v10"/>'],
        ['persegi', 'Persegi', '<rect x="4" y="5" width="16" height="14" rx="2"/>'],
        ['elips', 'Elips', '<ellipse cx="12" cy="12" rx="9" ry="7"/>'],
        ['teks', 'Teks', '<path d="M5 6V4h14v2"/><path d="M12 4v16"/><path d="M9 20h6"/>']
    ];
    var IK = {
        tutup: '<path d="M6 6l12 12M18 6 6 18"/>',
        undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
        redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        minus: '<path d="M5 12h14"/>',
        fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
        unduh: '<path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M4 21h16"/>',
        kunci: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
        orang: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
        sampah: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
        papan: '<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.6 7.6"/><circle cx="11" cy="11" r="2"/>',
        cek: '<path d="m5 12 4 4L19 6"/>',
        dot: '<path d="M12 6v.01M12 12v.01M12 18v.01"/>'
    };
    function ik(n, u) {
        u = u || 20;
        return '<svg class="pgm-ik" viewBox="0 0 24 24" width="' + u + '" height="' + u + '" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IK[n] + '</svg>';
    }
    function ikAlat(d, u) {
        u = u || 20;
        return '<svg class="pgm-ik" viewBox="0 0 24 24" width="' + u + '" height="' + u + '" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
    }

    // ---------- util ----------
    function sayaId() { try { return userAktif && String(userAktif.id); } catch (e) { return null; } }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function acak() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
    function namaDari(id) {
        id = String(id);
        if (id === sayaId()) return 'Kamu';
        try { if (window.NgumpulGrupDasar && NgumpulGrupDasar.nama) { var n = NgumpulGrupDasar.nama(id); if (n) return n; } } catch (e) { }
        try { var p = getProfilChat(id); if (p && p.nama) return p.nama; } catch (e) { }
        return 'Pengguna';
    }
    function warnaOrang(id) {
        var h = 0, s = String(id);
        for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
        return WARNA_ORANG[h % WARNA_ORANG.length];
    }
    function isiAvatar(node, id) {
        node.replaceChildren();
        var foto = '';
        try { foto = ambilFotoProfilChat(id) || ''; } catch (e) { }
        if (foto) { var im = document.createElement('img'); im.src = foto; im.alt = ''; node.appendChild(im); return; }
        var n = namaDari(id);
        node.textContent = (n.trim().charAt(0) || '?').toUpperCase();
    }
    function toast(t) {
        var d = document.createElement('div');
        d.className = 'pgm-toast';
        d.textContent = t;
        d.setAttribute('role', 'status');
        document.body.appendChild(d);
        setTimeout(function () { d.classList.add('hilang'); }, 2400);
        setTimeout(function () { d.remove(); }, 2900);
    }

    // ---------- meta ----------
    function bacaMeta(id) {
        try { var m = JSON.parse(localStorage.getItem(KEY + id)); return m && m.id === id ? m : null; } catch (e) { return null; }
    }
    function tulisMeta(m) {
        try { localStorage.setItem(KEY + m.id, JSON.stringify(m)); return true; } catch (e) {
            if (m.thumb) { var c = Object.assign({}, m, { thumb: '' }); try { localStorage.setItem(KEY + m.id, JSON.stringify(c)); return true; } catch (e2) { } }
            return false;
        }
    }
    function bolehLihat(m, uid) { return !!m && m.peserta.indexOf(String(uid)) >= 0; }
    function bolehGambar(m, uid) {
        if (!m || !bolehLihat(m, uid)) return false;
        uid = String(uid);
        if (uid === String(m.pembuat)) return true;
        var a = m.akses || {};
        if (m.jenis === 'pribadi') return a.mode === 'berdua';
        return a.mode === 'semua' ? true : (a.ids || []).indexOf(uid) >= 0;
    }
    function labelAkses(m) {
        var a = m.akses || {};
        if (m.jenis === 'pribadi') return a.mode === 'berdua' ? 'Kalian berdua bisa menggambar' : 'Hanya pembuat yang menggambar';
        if (a.mode === 'semua') return 'Semua anggota bisa menggambar';
        return (a.ids || []).length + ' anggota terpilih bisa menggambar';
    }

    // ---------- IndexedDB ----------
    var dbJanji = null;
    function db() {
        if (dbJanji) return dbJanji;
        dbJanji = new Promise(function (ok, gagal) {
            var r = indexedDB.open(DB_NAMA, 1);
            r.onupgradeneeded = function () {
                var s = r.result.createObjectStore('ops', { keyPath: 'id' });
                s.createIndex('papan', 'papan');
            };
            r.onsuccess = function () { ok(r.result); };
            r.onerror = function () { gagal(r.error); };
        });
        return dbJanji;
    }
    function idbSemua(papanId) {
        return db().then(function (d) {
            return new Promise(function (ok, gagal) {
                var q = d.transaction('ops').objectStore('ops').index('papan').getAll(papanId);
                q.onsuccess = function () { ok(q.result || []); };
                q.onerror = function () { gagal(q.error); };
            });
        });
    }
    function idbTambah(op) {
        return db().then(function (d) {
            return new Promise(function (ok, gagal) {
                var t = d.transaction('ops', 'readwrite');
                t.objectStore('ops').put(op);
                t.oncomplete = function () { ok(); };
                t.onerror = function () { gagal(t.error); };
            });
        });
    }

    // ---------- BroadcastChannel ----------
    var bc = null;
    try { bc = new BroadcastChannel('ngumpul-papan'); } catch (e) { }
    function siar(pesan) { if (bc) try { bc.postMessage(pesan); } catch (e) { } }

    // ---------- keadaan papan terbuka ----------
    var P = null; // papan aktif
    var el = {};
    var tsTerakhir = 0;
    function tsBaru() { tsTerakhir = Math.max(Date.now(), tsTerakhir + 1); return tsTerakhir; }

    // ---------- gambar op ----------
    function gambarOp(c, o) {
        c.save();
        c.lineCap = 'round';
        c.lineJoin = 'round';
        if (o.t === 's') {
            var p = o.p;
            if (!p || !p.length) { c.restore(); return; }
            c.lineWidth = o.w;
            if (o.e) { c.globalCompositeOperation = 'destination-out'; c.strokeStyle = '#000'; }
            else { c.strokeStyle = o.c; if (o.h) { c.globalAlpha = 0.4; c.lineCap = 'butt'; } }
            c.beginPath();
            c.moveTo(p[0][0], p[0][1]);
            if (p.length === 1) c.lineTo(p[0][0] + 0.01, p[0][1]);
            else {
                for (var i = 1; i < p.length - 1; i++) c.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2);
                c.lineTo(p[p.length - 1][0], p[p.length - 1][1]);
            }
            c.stroke();
        } else if (o.t === 'l' || o.t === 'a') {
            c.lineWidth = o.w; c.strokeStyle = o.c; c.fillStyle = o.c;
            c.beginPath(); c.moveTo(o.x1, o.y1); c.lineTo(o.x2, o.y2); c.stroke();
            if (o.t === 'a') {
                var ang = Math.atan2(o.y2 - o.y1, o.x2 - o.x1), kp = Math.max(14, o.w * 3.4);
                c.beginPath();
                c.moveTo(o.x2, o.y2);
                c.lineTo(o.x2 - kp * Math.cos(ang - 0.45), o.y2 - kp * Math.sin(ang - 0.45));
                c.lineTo(o.x2 - kp * Math.cos(ang + 0.45), o.y2 - kp * Math.sin(ang + 0.45));
                c.closePath(); c.fill();
            }
        } else if (o.t === 'r' || o.t === 'o') {
            c.lineWidth = o.w; c.strokeStyle = o.c; c.fillStyle = o.c;
            var x = Math.min(o.x1, o.x2), y = Math.min(o.y1, o.y2), w = Math.abs(o.x2 - o.x1), h = Math.abs(o.y2 - o.y1);
            c.beginPath();
            if (o.t === 'r') { if (c.roundRect) c.roundRect(x, y, w, h, Math.min(10, w / 4, h / 4)); else c.rect(x, y, w, h); }
            else c.ellipse(x + w / 2, y + h / 2, Math.max(0.5, w / 2), Math.max(0.5, h / 2), 0, 0, Math.PI * 2);
            if (o.f) { c.globalAlpha = 0.9; c.fill(); c.globalAlpha = 1; }
            c.stroke();
        } else if (o.t === 't') {
            c.fillStyle = o.c;
            c.font = '600 ' + o.s + 'px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
            c.textBaseline = 'top';
            String(o.txt || '').split('\n').forEach(function (b, i) { c.fillText(b, o.x, o.y + i * o.s * 1.25); });
        }
        c.restore();
    }

    // ---------- turunan dari daftar op ----------
    function hitungTampil() {
        var ops = P.ops, m = P.meta;
        var urut = ops.slice().sort(function (a, b) { return a.ts - b.ts || (a.id < b.id ? -1 : 1); });
        var byId = {};
        urut.forEach(function (o) { byId[o.id] = o; });
        var tomb = {}, lastClear = 0;
        urut.forEach(function (o) {
            if (o.t === 'x') {
                var t = byId[o.ref];
                if (t && (String(o.uid) === String(t.uid) || String(o.uid) === String(m.pembuat)) && bolehLihat(m, o.uid)) tomb[o.ref] = true;
            } else if (o.t === 'c') {
                if (String(o.uid) === String(m.pembuat)) lastClear = Math.max(lastClear, o.ts);
            }
        });
        return urut.filter(function (o) {
            return o.t !== 'x' && o.t !== 'c' && !tomb[o.id] && o.ts > lastClear && bolehLihat(m, o.uid);
        });
    }
    function bangunLayer() {
        P.lc.setTransform(1, 0, 0, 1, 0, 0);
        P.lc.clearRect(0, 0, P.layer.width, P.layer.height);
        P.lc.setTransform(Q, 0, 0, Q, 0, 0);
        P.tampil = hitungTampil();
        P.tampil.forEach(function (o) { gambarOp(P.lc, o); });
        P.kotor = false;
    }

    function gambarLatar(c, latar) {
        c.save();
        if (latar === 'gelap') c.fillStyle = '#1f242c'; else c.fillStyle = '#ffffff';
        c.fillRect(0, 0, BW, BH);
        if (latar === 'kotak') {
            c.strokeStyle = 'rgba(100,116,139,.22)'; c.lineWidth = 1; c.beginPath();
            for (var x = 0; x <= BW; x += 40) { c.moveTo(x + .5, 0); c.lineTo(x + .5, BH); }
            for (var y = 0; y <= BH; y += 40) { c.moveTo(0, y + .5); c.lineTo(BW, y + .5); }
            c.stroke();
        } else if (latar === 'titik' || latar === 'gelap') {
            c.fillStyle = latar === 'gelap' ? 'rgba(255,255,255,.12)' : 'rgba(100,116,139,.35)';
            for (var xx = 20; xx < BW; xx += 40) for (var yy = 20; yy < BH; yy += 40) { c.beginPath(); c.arc(xx, yy, 1.8, 0, 6.3); c.fill(); }
        }
        c.restore();
    }

    function jadwal() {
        if (!P || P.raf) return;
        P.raf = requestAnimationFrame(function () { if (P) { P.raf = 0; render(); } });
    }
    function render() {
        if (!P) return;
        if (P.kotor) bangunLayer();
        var c = el.kvs.getContext('2d');
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.clearRect(0, 0, el.kvs.width, el.kvs.height);
        var d = P.dpr, v = P.view;
        c.setTransform(v.s * d, 0, 0, v.s * d, v.tx * d, v.ty * d);
        c.shadowColor = 'rgba(0,0,0,.28)'; c.shadowBlur = 18 / v.s;
        c.fillStyle = '#fff'; c.fillRect(0, 0, BW, BH);
        c.shadowColor = 'transparent';
        gambarLatar(c, P.meta.latar);
        var layerPakai = P.layer;
        var a = P.aktif;
        if (a && a.e) {
            if (!P.tmp) { P.tmp = document.createElement('canvas'); P.tmp.width = P.layer.width; P.tmp.height = P.layer.height; P.tc = P.tmp.getContext('2d'); }
            P.tc.setTransform(1, 0, 0, 1, 0, 0); P.tc.clearRect(0, 0, P.tmp.width, P.tmp.height);
            P.tc.drawImage(P.layer, 0, 0);
            P.tc.setTransform(Q, 0, 0, Q, 0, 0);
            gambarOp(P.tc, a);
            layerPakai = P.tmp;
        }
        c.drawImage(layerPakai, 0, 0, BW, BH);
        if (a && !a.e) gambarOp(c, a);
        P.remote.forEach(function (r) { if (r.op && !r.op.e) gambarOp(c, r.op); });
        el.zoomLabel.textContent = Math.round(v.s * 100) + '%';
        posisiKursor();
    }

    // ---------- tampilan ----------
    function bangunDom() {
        if (el.root) return;
        var r = document.createElement('div');
        r.className = 'pgm';
        r.id = 'papan-gambar';
        r.hidden = true;
        r.setAttribute('role', 'dialog');
        r.setAttribute('aria-modal', 'true');
        r.innerHTML =
            '<header class="pgm-atas">' +
            '<button type="button" class="pgm-tbl" data-p="tutup" title="Tutup (Esc)" aria-label="Tutup papan">' + ik('tutup') + '</button>' +
            '<div class="pgm-judul"><strong class="pgm-nama"></strong><small class="pgm-sub"></small></div>' +
            '<div class="pgm-hadir" aria-label="Peserta"></div>' +
            '<div class="pgm-aksi">' +
            '<button type="button" class="pgm-tbl" data-p="undo" title="Urungkan (Ctrl+Z)" aria-label="Urungkan">' + ik('undo') + '</button>' +
            '<button type="button" class="pgm-tbl" data-p="redo" title="Ulangi (Ctrl+Y)" aria-label="Ulangi">' + ik('redo') + '</button>' +
            '<button type="button" class="pgm-tbl" data-p="menu" title="Lainnya" aria-label="Menu papan" aria-haspopup="menu">' + ik('dot') + '</button>' +
            '</div>' +
            '<div class="pgm-menu" hidden role="menu">' +
            '<button type="button" role="menuitem" data-p="unduh">' + ik('unduh', 18) + 'Unduh sebagai gambar</button>' +
            '<button type="button" role="menuitem" data-p="akses" data-pemilik>' + ik('kunci', 18) + 'Atur siapa yang boleh menggambar</button>' +
            '<button type="button" role="menuitem" data-p="bersih" data-pemilik class="bahaya">' + ik('sampah', 18) + 'Bersihkan papan</button>' +
            '</div>' +
            '</header>' +
            '<div class="pgm-badan">' +
            '<nav class="pgm-alat" aria-label="Alat papan">' +
            ALAT.map(function (a) { return '<button type="button" class="pgm-alat-tbl" data-alat="' + a[0] + '" title="' + a[1] + '" aria-label="' + a[1] + '">' + ikAlat(a[2], 22) + '</button>'; }).join('') +
            '</nav>' +
            '<div class="pgm-stage"><canvas class="pgm-kvs"></canvas><div class="pgm-kursor-lapis"></div><div class="pgm-lihat" hidden>' + ik('kunci', 16) + '<span>Hanya lihat · kamu tidak punya izin menggambar</span></div>' +
            '<div class="pgm-zoom"><button type="button" data-p="zoom-" aria-label="Perkecil">' + ik('minus', 16) + '</button><span class="pgm-zoom-label">100%</span><button type="button" data-p="zoom+" aria-label="Perbesar">' + ik('plus', 16) + '</button><button type="button" data-p="fit" aria-label="Pas layar" title="Pas layar">' + ik('fit', 16) + '</button></div>' +
            '</div></div>' +
            '<div class="pgm-opsi"></div>';
        document.body.appendChild(r);
        el.root = r;
        el.kvs = r.querySelector('.pgm-kvs');
        el.stage = r.querySelector('.pgm-stage');
        el.kursor = r.querySelector('.pgm-kursor-lapis');
        el.lihat = r.querySelector('.pgm-lihat');
        el.zoomLabel = r.querySelector('.pgm-zoom-label');
        el.opsi = r.querySelector('.pgm-opsi');
        el.hadir = r.querySelector('.pgm-hadir');
        el.menu = r.querySelector('.pgm-menu');
        el.undo = r.querySelector('[data-p="undo"]');
        el.redo = r.querySelector('[data-p="redo"]');

        r.addEventListener('click', function (e) {
            var b = e.target.closest('[data-p]');
            if (b) { aksi(b.getAttribute('data-p')); return; }
            var a = e.target.closest('[data-alat]');
            if (a) { pilihAlat(a.getAttribute('data-alat')); return; }
            if (!e.target.closest('.pgm-menu')) el.menu.hidden = true;
        });
        el.kvs.addEventListener('pointerdown', tekan);
        el.kvs.addEventListener('pointermove', geser);
        el.kvs.addEventListener('pointerup', lepas);
        el.kvs.addEventListener('pointercancel', lepas);
        el.kvs.addEventListener('pointerleave', function () { siarKursor(null); });
        el.kvs.addEventListener('wheel', function (e) {
            if (!P) return;
            e.preventDefault();
            var rc = el.kvs.getBoundingClientRect();
            zoomDi(e.clientX - rc.left, e.clientY - rc.top, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016)));
        }, { passive: false });
        if (window.ResizeObserver) new ResizeObserver(function () { if (P) ukuranKanvas(); }).observe(el.stage);
        window.addEventListener('resize', function () { if (P) ukuranKanvas(); });
        document.addEventListener('keydown', function (e) {
            if (!P) return;
            var ketik = /^(INPUT|TEXTAREA)$/.test((e.target || {}).tagName || '');
            if (e.key === 'Escape') {
                e.preventDefault(); e.stopPropagation();
                if (!el.menu.hidden) { el.menu.hidden = true; return; }
                if (ketik) { e.target.blur(); return; }
                tutup(); return;
            }
            if (ketik) return;
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
            else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
            else if (e.key === ' ') { P.spasi = true; e.preventDefault(); }
        }, true);
        document.addEventListener('keyup', function (e) { if (P && e.key === ' ') P.spasi = false; });
        window.addEventListener('pagehide', function () { if (P) siar({ k: 'pergi', papan: P.meta.id, uid: sayaId() }); });
    }

    function ukuranKanvas() {
        var rc = el.stage.getBoundingClientRect();
        P.dpr = Math.min(window.devicePixelRatio || 1, 2);
        el.kvs.style.width = rc.width + 'px';
        el.kvs.style.height = rc.height + 'px';
        el.kvs.width = Math.max(1, Math.round(rc.width * P.dpr));
        el.kvs.height = Math.max(1, Math.round(rc.height * P.dpr));
        if (!P.sudahFit) { fit(); P.sudahFit = true; }
        jadwal();
    }
    function fit() {
        var rc = el.stage.getBoundingClientRect();
        var s = Math.min((rc.width - 32) / BW, (rc.height - 32) / BH);
        s = Math.max(0.05, s);
        P.view = { s: s, tx: (rc.width - BW * s) / 2, ty: (rc.height - BH * s) / 2 };
        jadwal();
    }
    function zoomDi(cx, cy, f) {
        var v = P.view, ns = Math.max(0.1, Math.min(6, v.s * f));
        f = ns / v.s;
        v.tx = cx - (cx - v.tx) * f; v.ty = cy - (cy - v.ty) * f; v.s = ns;
        jadwal();
    }
    function titikBoard(e) {
        var rc = el.kvs.getBoundingClientRect();
        var x = e.clientX - rc.left, y = e.clientY - rc.top;
        return { x: (x - P.view.tx) / P.view.s, y: (y - P.view.ty) / P.view.s, cx: x, cy: y };
    }

    // ---------- opsi (palet, ukuran) ----------
    function bisa() { return P && bolehGambar(P.meta, sayaId()); }
    function gambarOpsi() {
        var t = P.alat;
        var h = '';
        if (!bisa()) { el.opsi.innerHTML = '<div class="pgm-baris pgm-redup">Kamu bisa melihat dan menggeser/zoom papan. Pemilik papan bisa memberimu izin menggambar.</div>'; return; }
        if (t === 'geser') {
            h = '<div class="pgm-baris pgm-redup">Seret papan untuk menggeser · roda mouse / cubit untuk zoom · tahan Spasi untuk menggeser sementara</div>';
        } else {
            var pakaiWarna = t !== 'hapus';
            if (pakaiWarna) h += '<div class="pgm-palet">' + WARNA.map(function (w) {
                return '<button type="button" class="pgm-warna' + (w === P.warna ? ' aktif' : '') + '" data-warna="' + w + '" style="--w:' + w + '" aria-label="Warna ' + w + '"></button>';
            }).join('') + '<label class="pgm-warna pgm-warna-bebas" title="Warna lain"><input type="color" value="' + P.warna + '" data-warna-bebas aria-label="Warna lain"></label></div>';
            h += '<div class="pgm-baris"><span>' + (t === 'teks' ? 'Ukuran' : 'Tebal') + '</span><input type="range" min="1" max="40" value="' + P.ukuran + '" data-ukuran aria-label="Ukuran">' +
                '<i class="pgm-contoh" style="--u:' + Math.max(3, P.ukuran) + 'px;--w:' + (pakaiWarna ? P.warna : '#94a3b8') + '"></i>' +
                ((t === 'persegi' || t === 'elips') ? '<button type="button" class="pgm-chip' + (P.isi ? ' aktif' : '') + '" data-isi>Isi warna</button>' : '') +
                '</div>';
        }
        el.opsi.innerHTML = h;
        el.opsi.querySelectorAll('[data-warna]').forEach(function (b) {
            b.onclick = function () { P.warna = b.getAttribute('data-warna'); gambarOpsi(); };
        });
        var bebas = el.opsi.querySelector('[data-warna-bebas]');
        if (bebas) {
            bebas.oninput = function () { P.warna = bebas.value; var c = el.opsi.querySelector('.pgm-contoh'); if (c) c.style.setProperty('--w', bebas.value); };
            bebas.onchange = function () { P.warna = bebas.value; gambarOpsi(); };
        }
        var ur = el.opsi.querySelector('[data-ukuran]');
        if (ur) ur.oninput = function () { P.ukuran = Number(ur.value); var c = el.opsi.querySelector('.pgm-contoh'); if (c) c.style.setProperty('--u', Math.max(3, P.ukuran) + 'px'); };
        var isi = el.opsi.querySelector('[data-isi]');
        if (isi) isi.onclick = function () { P.isi = !P.isi; gambarOpsi(); };
    }
    function pilihAlat(a) {
        if (P.editTeks) selesaiTeks(true);
        P.alat = a;
        el.root.querySelectorAll('[data-alat]').forEach(function (b) { b.classList.toggle('aktif', b.getAttribute('data-alat') === a); });
        el.kvs.style.cursor = a === 'geser' ? 'grab' : (a === 'teks' ? 'text' : 'crosshair');
        gambarOpsi();
    }
    function segarkanIzin() {
        var boleh = bisa();
        el.root.classList.toggle('pgm-lihat-saja', !boleh);
        el.lihat.hidden = boleh;
        el.root.querySelectorAll('[data-alat]').forEach(function (b) {
            b.disabled = !boleh && b.getAttribute('data-alat') !== 'geser';
        });
        el.root.querySelectorAll('[data-pemilik]').forEach(function (b) { b.hidden = String(P.meta.pembuat) !== sayaId(); });
        if (!boleh && P.alat !== 'geser') P.alat = 'geser';
        pilihAlat(P.alat);
        segarkanTombolUndo();
        el.root.querySelector('.pgm-nama').textContent = P.meta.nama;
        el.root.querySelector('.pgm-sub').textContent = labelAkses(P.meta);
        segarkanHadir();
    }
    function segarkanTombolUndo() {
        var uid = sayaId();
        var adaMilik = P.tampil && P.tampil.some(function (o) { return String(o.uid) === uid; });
        el.undo.disabled = !bisa() || !adaMilik;
        el.redo.disabled = !bisa() || !P.redoTumpuk.length;
    }

    // ---------- kehadiran & kursor ----------
    function segarkanHadir() {
        var m = P.meta, nu = Date.now();
        var urut = m.peserta.slice().sort(function (a, b) {
            var aa = (a === sayaId() ? 2 : P.hadir[a] && nu - P.hadir[a] < 9000 ? 1 : 0);
            var bb = (b === sayaId() ? 2 : P.hadir[b] && nu - P.hadir[b] < 9000 ? 1 : 0);
            return bb - aa;
        });
        var tampil = urut.slice(0, 6), sisa = urut.length - tampil.length;
        el.hadir.replaceChildren();
        tampil.forEach(function (id) {
            var d = document.createElement('span');
            var aktif = id === sayaId() || (P.hadir[id] && nu - P.hadir[id] < 9000);
            d.className = 'pgm-av' + (aktif ? ' aktif' : '') + (bolehGambar(m, id) ? ' penulis' : '');
            d.style.setProperty('--o', warnaOrang(id));
            d.title = namaDari(id) + (aktif ? ' · di papan' : ' · tidak aktif') + (bolehGambar(m, id) ? ' · bisa menggambar' : ' · hanya lihat');
            isiAvatar(d, id);
            el.hadir.appendChild(d);
        });
        if (sisa > 0) { var s = document.createElement('span'); s.className = 'pgm-av pgm-av-sisa'; s.textContent = '+' + sisa; el.hadir.appendChild(s); }
    }
    function posisiKursor() {
        if (!P) return;
        var nu = Date.now();
        P.kursor.forEach(function (k, uid) {
            if (nu - k.ts > 4000) { k.node.hidden = true; return; }
            k.node.hidden = false;
            k.node.style.transform = 'translate(' + (k.x * P.view.s + P.view.tx) + 'px,' + (k.y * P.view.s + P.view.ty) + 'px)';
        });
    }
    function tampilKursor(uid, x, y) {
        var k = P.kursor.get(uid);
        if (!k) {
            var n = document.createElement('div');
            n.className = 'pgm-kursor';
            n.style.setProperty('--o', warnaOrang(uid));
            n.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 2l16 9-7 2-3 7z" fill="currentColor" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg><span></span>';
            n.querySelector('span').textContent = namaDari(uid);
            el.kursor.appendChild(n);
            k = { node: n, x: 0, y: 0, ts: 0 };
            P.kursor.set(uid, k);
        }
        k.x = x; k.y = y; k.ts = Date.now();
        jadwal();
    }
    var tKursor = 0;
    function siarKursor(p) {
        if (!P) return;
        if (!p) { siar({ k: 'kursor', papan: P.meta.id, uid: sayaId(), x: null }); return; }
        var n = Date.now();
        if (n - tKursor < 45) return;
        tKursor = n;
        siar({ k: 'kursor', papan: P.meta.id, uid: sayaId(), x: Math.round(p.x), y: Math.round(p.y) });
    }

    // ---------- pointer ----------
    function tekan(e) {
        if (!P) return;
        e.preventDefault();
        el.kvs.setPointerCapture && el.kvs.setPointerCapture(e.pointerId);
        P.ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (P.editTeks) selesaiTeks(true);
        if (P.ptr.size === 2) {
            P.aktif = null;
            var ps = Array.from(P.ptr.values());
            P.cubit = { d: Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) || 1, mx: (ps[0].x + ps[1].x) / 2, my: (ps[0].y + ps[1].y) / 2 };
            P.geser = null;
            return;
        }
        if (P.ptr.size > 1) return;
        var p = titikBoard(e);
        var alat = P.alat;
        if (alat === 'geser' || P.spasi || e.button === 1 || !bisa()) {
            P.geser = { x: e.clientX, y: e.clientY, tx: P.view.tx, ty: P.view.ty };
            el.kvs.style.cursor = 'grabbing';
            return;
        }
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        if (alat === 'teks') { mulaiTeks(p); return; }
        var base = { id: acak(), papan: P.meta.id, uid: sayaId() };
        var w = Math.max(1, P.ukuran) * (alat === 'sorot' ? 2.6 : alat === 'hapus' ? 2 : 0.7);
        if (alat === 'pena' || alat === 'sorot' || alat === 'hapus') {
            P.aktif = Object.assign(base, { t: 's', c: P.warna, w: w, h: alat === 'sorot', e: alat === 'hapus', p: [[r1(p.x), r1(p.y)]] });
            P.kirimDari = 0;
        } else {
            var tipe = { garis: 'l', panah: 'a', persegi: 'r', elips: 'o' }[alat];
            P.aktif = Object.assign(base, { t: tipe, c: P.warna, w: Math.max(1.5, P.ukuran * 0.7), x1: r1(p.x), y1: r1(p.y), x2: r1(p.x), y2: r1(p.y), f: P.isi && (tipe === 'r' || tipe === 'o') });
        }
        P.lurusShift = false;
        siarLive(true);
        jadwal();
    }
    function r1(n) { return Math.round(n * 10) / 10; }
    function geser(e) {
        if (!P) return;
        var p0 = P.ptr.get(e.pointerId);
        var p = titikBoard(e);
        if (!p0) { if (P.meta && bisa()) siarKursor(p); return; }
        P.ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (P.cubit && P.ptr.size === 2) {
            var ps = Array.from(P.ptr.values());
            var d = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) || 1;
            var mx = (ps[0].x + ps[1].x) / 2, my = (ps[0].y + ps[1].y) / 2;
            var rc = el.kvs.getBoundingClientRect();
            P.view.tx += mx - P.cubit.mx; P.view.ty += my - P.cubit.my;
            zoomDi(mx - rc.left, my - rc.top, d / P.cubit.d);
            P.cubit = { d: d, mx: mx, my: my };
            return;
        }
        if (P.geser) {
            P.view.tx = P.geser.tx + (e.clientX - P.geser.x);
            P.view.ty = P.geser.ty + (e.clientY - P.geser.y);
            jadwal();
            return;
        }
        siarKursor(p);
        var a = P.aktif;
        if (!a) return;
        if (a.t === 's') {
            var last = a.p[a.p.length - 1];
            if (Math.hypot(p.x - last[0], p.y - last[1]) * P.view.s >= 1.5) {
                a.p.push([r1(p.x), r1(p.y)]);
                siarLive(false);
            }
        } else {
            var x2 = p.x, y2 = p.y;
            if (e.shiftKey && a.t !== 'r' && a.t !== 'o') {
                var ang = Math.round(Math.atan2(y2 - a.y1, x2 - a.x1) / (Math.PI / 4)) * (Math.PI / 4), dd = Math.hypot(x2 - a.x1, y2 - a.y1);
                x2 = a.x1 + Math.cos(ang) * dd; y2 = a.y1 + Math.sin(ang) * dd;
            } else if (e.shiftKey) {
                var sz = Math.max(Math.abs(x2 - a.x1), Math.abs(y2 - a.y1));
                x2 = a.x1 + Math.sign(x2 - a.x1 || 1) * sz; y2 = a.y1 + Math.sign(y2 - a.y1 || 1) * sz;
            }
            a.x2 = r1(x2); a.y2 = r1(y2);
            siarLive(false);
        }
        jadwal();
    }
    function lepas(e) {
        if (!P || !P.ptr.has(e.pointerId)) return;
        P.ptr.delete(e.pointerId);
        if (P.ptr.size < 2) P.cubit = null;
        if (P.geser) { P.geser = null; el.kvs.style.cursor = P.alat === 'geser' ? 'grab' : 'crosshair'; return; }
        var a = P.aktif;
        if (a) {
            P.aktif = null;
            if (a.t !== 's' && Math.hypot((a.x2 || 0) - (a.x1 || 0), (a.y2 || 0) - (a.y1 || 0)) < 2) { siar({ k: 'live-batal', papan: P.meta.id, uid: sayaId(), id: a.id }); jadwal(); return; }
            a.ts = tsBaru();
            komitOp(a, true);
        }
    }

    var tLive = 0;
    function siarLive(awal) {
        var a = P.aktif;
        if (!a) return;
        var n = Date.now();
        if (!awal && n - tLive < 40) return;
        tLive = n;
        if (a.t === 's') {
            var pts = a.p.slice(P.kirimDari || 0);
            var hdr = { id: a.id, t: a.t, c: a.c, w: a.w, h: a.h, e: a.e };
            siar({ k: 'live', papan: P.meta.id, uid: sayaId(), hdr: hdr, dari: P.kirimDari || 0, p: pts });
            P.kirimDari = a.p.length;
        } else {
            siar({ k: 'live', papan: P.meta.id, uid: sayaId(), hdr: a });
        }
    }

    function komitOp(op, siarkan) {
        P.ops.push(op);
        P.idSet.add(op.id);
        if (op.t !== 'x' && op.t !== 'c' && !op.e) { gambarOp(P.lc, op); if (!P.tampil) P.tampil = []; P.tampil.push(op); }
        else P.kotor = true;
        if (op.t === 'x' || op.t === 'c') P.kotor = true;
        if (siarkan) siar({ k: 'op', papan: P.meta.id, op: op });
        idbTambah(op).catch(function () { toast('Gagal menyimpan ke penyimpanan lokal.'); });
        if (op.t !== 'x' && op.t !== 'c' && String(op.uid) === sayaId() && siarkan && !op.__redo) P.redoTumpuk = [];
        if (op.t === 'x' || op.t === 'c' || op.e) P.kotor = true;
        if (P.kotor) bangunLayer();
        jadwalThumb();
        segarkanTombolUndo();
        jadwal();
    }

    // ---------- teks ----------
    function mulaiTeks(p) {
        var ta = document.createElement('textarea');
        ta.className = 'pgm-teks-edit';
        ta.rows = 1;
        ta.placeholder = 'Ketik...';
        var s = Math.max(24, P.ukuran * 3 + 16);
        var px = p.x * P.view.s + P.view.tx, py = p.y * P.view.s + P.view.ty;
        ta.style.left = px + 'px'; ta.style.top = py + 'px';
        ta.style.fontSize = (s * P.view.s) + 'px';
        ta.style.color = P.warna;
        el.stage.appendChild(ta);
        P.editTeks = { ta: ta, x: p.x, y: p.y, s: s, c: P.warna };
        var tinggi = function () { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; ta.style.width = Math.max(60, Math.min(500, ta.value.length * s * P.view.s * 0.6 + 30)) + 'px'; };
        ta.addEventListener('input', tinggi);
        ta.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); selesaiTeks(true); } if (e.key === 'Escape') { e.preventDefault(); selesaiTeks(false); } });
        ta.addEventListener('blur', function () { setTimeout(function () { if (P && P.editTeks && P.editTeks.ta === ta) selesaiTeks(true); }, 120); });
        tinggi();
        setTimeout(function () { ta.focus(); }, 30);
    }
    function selesaiTeks(simpan) {
        var t = P.editTeks;
        if (!t) return;
        P.editTeks = null;
        var v = t.ta.value;
        t.ta.remove();
        if (!simpan || !v.trim()) return;
        komitOp({ id: acak(), papan: P.meta.id, uid: sayaId(), t: 't', x: r1(t.x), y: r1(t.y), s: t.s, c: t.c, txt: v, ts: tsBaru() }, true);
    }

    // ---------- undo / redo ----------
    function undo() {
        if (!bisa()) return;
        var uid = sayaId();
        var daftar = (P.tampil || []).filter(function (o) { return String(o.uid) === uid; });
        var o = daftar[daftar.length - 1];
        if (!o) return;
        P.redoTumpuk.push(o);
        komitOp({ id: acak(), papan: P.meta.id, uid: uid, t: 'x', ref: o.id, ts: tsBaru() }, true);
    }
    function redo() {
        if (!bisa() || !P.redoTumpuk.length) return;
        var o = P.redoTumpuk.pop();
        var salin = JSON.parse(JSON.stringify(o));
        salin.id = acak(); salin.ts = tsBaru(); salin.__redo = true;
        var sisa = P.redoTumpuk.slice();
        komitOp(salin, true);
        delete salin.__redo;
        P.redoTumpuk = sisa;
        segarkanTombolUndo();
    }

    // ---------- thumbnail ----------
    var timerThumb = 0;
    function jadwalThumb() { clearTimeout(timerThumb); timerThumb = setTimeout(simpanThumb, 700); }
    function bikinThumb() {
        if (P.kotor) bangunLayer();
        var tw = 520, th = Math.round(tw * BH / BW);
        var cv = document.createElement('canvas');
        cv.width = tw; cv.height = th;
        var c = cv.getContext('2d');
        c.scale(tw / BW, tw / BW);
        gambarLatar(c, P.meta.latar);
        c.drawImage(P.layer, 0, 0, BW, BH);
        return cv;
    }
    function simpanThumb() {
        if (!P) return;
        var m = bacaMeta(P.meta.id) || P.meta;
        try { m.thumb = bikinThumb().toDataURL('image/jpeg', 0.72); } catch (e) { return; }
        m.rev = (m.rev || 0) + 1;
        P.meta = Object.assign(P.meta, { thumb: m.thumb, rev: m.rev });
        tulisMeta(m);
        siar({ k: 'meta', papan: m.id });
        perbaruiKartu(m.id);
    }

    // ---------- aksi menu ----------
    function aksi(a) {
        if (a === 'tutup') tutup();
        else if (a === 'undo') undo();
        else if (a === 'redo') redo();
        else if (a === 'menu') { el.menu.hidden = !el.menu.hidden; }
        else if (a === 'fit') fit();
        else if (a === 'zoom+' || a === 'zoom-') { var rc = el.kvs.getBoundingClientRect(); zoomDi(rc.width / 2, rc.height / 2, a === 'zoom+' ? 1.25 : 0.8); }
        else if (a === 'unduh') { el.menu.hidden = true; unduh(); }
        else if (a === 'akses') { el.menu.hidden = true; dialogAkses(); }
        else if (a === 'bersih') {
            el.menu.hidden = true;
            if (String(P.meta.pembuat) !== sayaId()) return;
            if (!window.confirm('Bersihkan semua gambar di papan ini untuk semua orang?')) return;
            komitOp({ id: acak(), papan: P.meta.id, uid: sayaId(), t: 'c', ts: tsBaru() }, true);
        }
    }
    function unduh() {
        if (P.kotor) bangunLayer();
        var cv = document.createElement('canvas');
        cv.width = BW * Q; cv.height = BH * Q;
        var c = cv.getContext('2d');
        c.scale(Q, Q);
        gambarLatar(c, P.meta.latar);
        c.drawImage(P.layer, 0, 0, BW, BH);
        cv.toBlob(function (b) {
            if (!b) return;
            var u = URL.createObjectURL(b), a = document.createElement('a');
            a.href = u; a.download = (P.meta.nama || 'papan').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') + '.png';
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function () { URL.revokeObjectURL(u); }, 3000);
        }, 'image/png');
    }

    // ---------- buka / tutup ----------
    function buka(id) {
        var m = bacaMeta(id);
        if (!m) { toast('Papan ini tidak tersedia di perangkat ini.'); return Promise.resolve(); }
        var uid = sayaId();
        if (!uid || !bolehLihat(m, uid)) { toast('Kamu bukan peserta papan ini.'); return Promise.resolve(); }
        if (P) tutup();
        bangunDom();
        el.kursor.replaceChildren();
        var layer = document.createElement('canvas');
        layer.width = BW * Q; layer.height = BH * Q;
        P = {
            meta: m, ops: [], idSet: new Set(), tampil: [], layer: layer, lc: layer.getContext('2d'), kotor: true,
            view: { s: 1, tx: 0, ty: 0 }, dpr: 1, alat: bolehGambar(m, uid) ? 'pena' : 'geser', warna: m.latar === 'gelap' ? '#ffffff' : '#111827', ukuran: 6, isi: false,
            ptr: new Map(), aktif: null, remote: new Map(), kursor: new Map(), hadir: {}, redoTumpuk: [], raf: 0, sudahFit: false
        };
        P.hadir[uid] = Date.now();
        el.root.hidden = false;
        document.documentElement.classList.add('pgm-terbuka');
        segarkanIzin();
        ukuranKanvas();
        return idbSemua(m.id).then(function (ops) {
            if (!P || P.meta.id !== m.id) return;
            ops.forEach(function (o) { if (!P.idSet.has(o.id)) { P.ops.push(o); P.idSet.add(o.id); } });
            P.kotor = true;
            segarkanTombolUndo();
            jadwal();
            siar({ k: 'hadir', papan: m.id, uid: uid });
            P.hb = setInterval(function () {
                if (!P) return;
                siar({ k: 'hadir', papan: P.meta.id, uid: sayaId() });
                P.hadir[sayaId()] = Date.now();
                segarkanHadir(); posisiKursor();
            }, 3500);
        });
    }
    function tutup() {
        if (!P) return;
        if (P.editTeks) selesaiTeks(true);
        clearTimeout(timerThumb);
        if (P.ops.length) { try { simpanThumb(); } catch (e) { } }
        siar({ k: 'pergi', papan: P.meta.id, uid: sayaId() });
        clearInterval(P.hb);
        el.root.hidden = true;
        el.menu.hidden = true;
        document.documentElement.classList.remove('pgm-terbuka');
        P = null;
    }

    // ---------- pesan masuk dari tab lain ----------
    if (bc) bc.onmessage = function (ev) {
        var d = ev.data || {};
        if (d.k === 'meta') { perbaruiKartu(d.papan); if (P && P.meta.id === d.papan) muatUlangMeta(); return; }
        if (!P || d.papan !== P.meta.id) return;
        var uid = String(d.uid || '');
        if (uid === sayaId()) return;
        if (d.k === 'hadir') { P.hadir[uid] = Date.now(); segarkanHadir(); return; }
        if (d.k === 'pergi') { delete P.hadir[uid]; var kk = P.kursor.get(uid); if (kk) kk.node.hidden = true; segarkanHadir(); return; }
        if (!bolehLihat(P.meta, uid)) return;
        P.hadir[uid] = Date.now();
        if (d.k === 'kursor') { if (d.x == null) { var k2 = P.kursor.get(uid); if (k2) k2.node.hidden = true; } else tampilKursor(uid, d.x, d.y); return; }
        if (d.k === 'live') {
            if (!bolehGambar(P.meta, uid)) return;
            var r = P.remote.get(uid);
            var h = d.hdr || {};
            if (!r || r.id !== h.id) { r = { id: h.id, op: null }; P.remote.set(uid, r); }
            if (h.t === 's') {
                if (!r.op || d.dari === 0) r.op = Object.assign({}, h, { p: [] });
                if (r.op.p.length === d.dari) r.op.p = r.op.p.concat(d.p || []);
            } else r.op = h;
            jadwal();
            return;
        }
        if (d.k === 'live-batal') { P.remote.delete(uid); jadwal(); return; }
        if (d.k === 'op') {
            var o = d.op;
            if (!o || P.idSet.has(o.id) || !bolehGambar(P.meta, uid) || String(o.uid) !== uid) return;
            P.remote.delete(uid);
            P.ops.push(o); P.idSet.add(o.id);
            if (o.t === 'x' || o.t === 'c' || o.e) P.kotor = true;
            else { gambarOp(P.lc, o); P.tampil.push(o); }
            if (P.kotor) bangunLayer();
            segarkanTombolUndo();
            jadwal();
        }
    };
    function muatUlangMeta() {
        var m = bacaMeta(P.meta.id);
        if (!m) return;
        var thumb = m.thumb;
        P.meta = m; P.meta.thumb = thumb;
        P.kotor = true;
        segarkanIzin();
        jadwal();
    }
    window.addEventListener('storage', function (e) {
        if (!e.key || e.key.indexOf(KEY) !== 0) return;
        var id = e.key.slice(KEY.length);
        perbaruiKartu(id);
        if (P && P.meta.id === id) {
            var m = bacaMeta(id);
            if (m && (JSON.stringify(m.akses) !== JSON.stringify(P.meta.akses) || m.nama !== P.meta.nama)) muatUlangMeta();
        }
    });

    // ---------- kartu di pesan ----------
    function perbaruiKartu(id) {
        var m = bacaMeta(id);
        document.querySelectorAll('.pgm-kartu[data-papan="' + id + '"]').forEach(function (k) { isiKartu(k, m); });
    }
    function isiKartu(k, m) {
        var thumb = k.querySelector('.pgm-kartu-thumb');
        var judul = k.querySelector('.pgm-kartu-judul');
        var sub = k.querySelector('.pgm-kartu-sub');
        if (!m) { thumb.innerHTML = '<span class="pgm-kartu-kosong">' + ik('papan', 30) + '</span>'; sub.textContent = 'Papan tidak tersedia di perangkat ini'; k.classList.add('pgm-kartu-mati'); return; }
        k.classList.remove('pgm-kartu-mati');
        judul.textContent = m.nama;
        if (m.thumb) {
            var im = thumb.querySelector('img');
            if (!im) { thumb.replaceChildren(); im = document.createElement('img'); im.alt = 'Pratinjau papan ' + m.nama; thumb.appendChild(im); }
            if (im.src !== m.thumb) im.src = m.thumb;
        } else if (!thumb.querySelector('.pgm-kartu-kosong')) {
            thumb.innerHTML = '<span class="pgm-kartu-kosong">' + ik('papan', 30) + '</span>';
        }
        sub.textContent = labelAkses(m);
        thumb.classList.toggle('gelap', m.latar === 'gelap');
    }
    function kartu(opsi) {
        var k = document.createElement('div');
        k.className = 'pgm-kartu';
        k.setAttribute('role', 'button');
        k.tabIndex = 0;
        k.setAttribute('data-papan', opsi.id);
        k.innerHTML = '<div class="pgm-kartu-thumb"></div><div class="pgm-kartu-info"><strong class="pgm-kartu-judul"></strong><span class="pgm-kartu-sub"></span></div>' +
            '<span class="pgm-kartu-buka">' + ik('papan', 16) + 'Buka papan</span>';
        k.querySelector('.pgm-kartu-judul').textContent = opsi.nama || 'Papan gambar';
        isiKartu(k, bacaMeta(opsi.id));
        var buka2 = function (e) { e.stopPropagation(); buka(opsi.id); };
        k.addEventListener('click', buka2);
        k.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); buka2(e); } });
        return k;
    }

    // ---------- dialog buat / akses ----------
    function anggotaLain(konteks) { return (konteks.peserta || []).filter(function (x) { return x !== sayaId(); }); }
    function bangunDialog(judul, tombol, konteks, awal, untukBuat) {
        return new Promise(function (ok) {
            var uid = sayaId();
            var d = document.createElement('div');
            d.className = 'pgm-dlg-latar';
            var pribadi = konteks.jenis === 'pribadi';
            var mode = awal.akses.mode;
            var terpilih = new Set((awal.akses.ids || []).filter(function (x) { return x !== uid; }));
            var latar = awal.latar;
            var html = '<form class="pgm-dlg" role="dialog" aria-modal="true" aria-label="' + esc(judul) + '">' +
                '<h2>' + esc(judul) + '</h2>';
            if (untukBuat) html += '<label class="pgm-f"><span>Nama papan</span><input type="text" class="pgm-in-nama" maxlength="60" value="' + esc(awal.nama) + '" autocomplete="off"></label>' +
                '<div class="pgm-f"><span>Latar</span><div class="pgm-latar">' + LATAR.map(function (l) { return '<button type="button" class="pgm-chip' + (l.id === latar ? ' aktif' : '') + '" data-latar="' + l.id + '">' + l.label + '</button>'; }).join('') + '</div></div>';
            html += '<div class="pgm-f"><span>Siapa yang boleh menggambar?</span><div class="pgm-pilihan">';
            if (pribadi) {
                html += '<label class="pgm-radio"><input type="radio" name="pgm-mode" value="berdua"' + (mode === 'berdua' ? ' checked' : '') + '><b>Kami berdua</b><small>Kalian bisa menggambar bersama secara langsung.</small></label>' +
                    '<label class="pgm-radio"><input type="radio" name="pgm-mode" value="saya"' + (mode !== 'berdua' ? ' checked' : '') + '><b>Hanya aku</b><small>Lawan chat hanya bisa melihat.</small></label>';
            } else {
                html += '<label class="pgm-radio"><input type="radio" name="pgm-mode" value="semua"' + (mode === 'semua' ? ' checked' : '') + '><b>Semua anggota</b><small>Setiap anggota grup boleh menggambar.</small></label>' +
                    '<label class="pgm-radio"><input type="radio" name="pgm-mode" value="pilih"' + (mode !== 'semua' ? ' checked' : '') + '><b>Pilih anggota</b><small>Hanya anggota yang kamu pilih; yang lain melihat saja.</small></label>' +
                    '<div class="pgm-anggota"' + (mode === 'semua' ? ' hidden' : '') + '></div>';
            }
            html += '</div></div><div class="pgm-dlg-aksi"><button type="button" class="pgm-chip" data-batal>Batal</button><button type="submit" class="pgm-chip aktif pgm-utama">' + esc(tombol) + '</button></div></form>';
            d.innerHTML = html;
            document.body.appendChild(d);
            var daftar = d.querySelector('.pgm-anggota');
            function gambarAnggota() {
                if (!daftar) return;
                daftar.replaceChildren();
                anggotaLain(konteks).forEach(function (id) {
                    var b = document.createElement('label');
                    b.className = 'pgm-ang';
                    b.innerHTML = '<input type="checkbox"><span class="pgm-av"></span><span class="pgm-ang-nama"></span>';
                    var cb = b.querySelector('input');
                    cb.checked = terpilih.has(id);
                    cb.onchange = function () { cb.checked ? terpilih.add(id) : terpilih.delete(id); };
                    b.querySelector('.pgm-ang-nama').textContent = namaDari(id);
                    var av = b.querySelector('.pgm-av'); av.style.setProperty('--o', warnaOrang(id)); isiAvatar(av, id);
                    daftar.appendChild(b);
                });
            }
            gambarAnggota();
            d.querySelectorAll('input[name="pgm-mode"]').forEach(function (r) {
                r.onchange = function () { mode = r.value; if (daftar) daftar.hidden = mode === 'semua'; };
            });
            d.querySelectorAll('[data-latar]').forEach(function (b) {
                b.onclick = function () { latar = b.getAttribute('data-latar'); d.querySelectorAll('[data-latar]').forEach(function (x) { x.classList.toggle('aktif', x === b); }); };
            });
            function tutupDlg(hasil) { d.remove(); document.removeEventListener('keydown', esc2, true); ok(hasil); }
            function esc2(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); tutupDlg(null); } }
            document.addEventListener('keydown', esc2, true);
            d.addEventListener('mousedown', function (e) { if (e.target === d) tutupDlg(null); });
            d.querySelector('[data-batal]').onclick = function () { tutupDlg(null); };
            d.querySelector('form').onsubmit = function (e) {
                e.preventDefault();
                var nm = untukBuat ? (d.querySelector('.pgm-in-nama').value.trim() || 'Papan gambar') : awal.nama;
                tutupDlg({ nama: nm, latar: latar, akses: { mode: mode, ids: Array.from(terpilih) } });
            };
            setTimeout(function () { var f = d.querySelector('.pgm-in-nama') || d.querySelector('input'); if (f) { f.focus(); if (f.select && f.type === 'text') f.select(); } }, 30);
        });
    }
    function dialogAkses() {
        var m = P.meta;
        bangunDialog('Siapa yang boleh menggambar?', 'Simpan', m, { nama: m.nama, latar: m.latar, akses: m.akses }, false).then(function (h) {
            if (!h || !P) return;
            var baru = bacaMeta(m.id) || m;
            baru.akses = h.akses;
            tulisMeta(baru);
            P.meta = Object.assign(P.meta, { akses: baru.akses });
            P.kotor = true;
            segarkanIzin();
            siar({ k: 'meta', papan: m.id });
            jadwal();
            toast('Izin menggambar diperbarui.');
        });
    }

    function mulaiBuat(konteks) {
        var uid = sayaId();
        if (!uid) return Promise.resolve(null);
        var pribadi = konteks.jenis === 'pribadi';
        var awal = { nama: 'Papan gambar', latar: 'putih', akses: pribadi ? { mode: 'berdua', ids: [] } : { mode: 'semua', ids: [] } };
        return bangunDialog('Papan gambar baru', 'Buat & kirim', konteks, awal, true).then(function (h) {
            if (!h) return null;
            var peserta = konteks.peserta.map(String);
            if (peserta.indexOf(uid) < 0) peserta.push(uid);
            var ids = (h.akses.ids || []).filter(function (x) { return peserta.indexOf(x) >= 0; });
            var m = {
                id: 'pg_' + acak(), nama: h.nama, pembuat: uid, jenis: konteks.jenis, peserta: peserta,
                akses: { mode: h.akses.mode, ids: ids }, latar: h.latar, dibuat: Date.now(), rev: 0, thumb: ''
            };
            if (!tulisMeta(m)) { toast('Penyimpanan penuh, papan gagal dibuat.'); return null; }
            return m;
        });
    }

    // ---------- sambungan chat pribadi ----------
    function kirimPribadi() {
        if (typeof chatAktifId === 'undefined' || !chatAktifId || !userAktif) return;
        try { if (chatTerblokir(chatAktifId)) return; } catch (e) { }
        mulaiBuat({ jenis: 'pribadi', peserta: [String(userAktif.id), String(chatAktifId)] }).then(function (m) {
            if (!m) return;
            var tujuan = chatAktifId;
            var daftar = ambilPesanChat(tujuan);
            daftar.push({ id: buatIdPesan(), sender: userAktif.id, text: '', papanId: m.id, papanNama: m.nama, time: new Date().toISOString(), status: 'terkirim' });
            if (!simpanPesanChat(tujuan, daftar)) return;
            renderPesanAktif();
            renderChatList();
            buka(m.id);
        });
    }

    // ---------- sambungan grup ----------
    function menuGrup(tombol, bukaBerkas) {
        var lama = document.querySelector('.pgm-pop');
        if (lama) { lama.remove(); return; }
        var p = document.createElement('div');
        p.className = 'pgm-pop';
        p.setAttribute('role', 'menu');
        p.innerHTML = '<button type="button" role="menuitem" data-a="berkas">' + ik('unduh', 18).replace('M12 3v12', 'M12 15V3') + 'Foto &amp; berkas</button><button type="button" role="menuitem" data-a="papan">' + ik('papan', 18) + 'Papan gambar</button>';
        document.body.appendChild(p);
        var rc = tombol.getBoundingClientRect();
        p.style.left = Math.max(8, rc.left) + 'px';
        p.style.top = Math.max(8, rc.top - p.offsetHeight - 8) + 'px';
        function bersih() { p.remove(); document.removeEventListener('mousedown', luar, true); document.removeEventListener('keydown', kunci, true); }
        function luar(e) { if (!p.contains(e.target) && e.target !== tombol) bersih(); }
        function kunci(e) { if (e.key === 'Escape') bersih(); }
        document.addEventListener('mousedown', luar, true);
        document.addEventListener('keydown', kunci, true);
        p.addEventListener('click', function (e) {
            var b = e.target.closest('[data-a]');
            if (!b) return;
            bersih();
            if (b.getAttribute('data-a') === 'berkas') bukaBerkas();
            else buatGrup();
        });
        var pertama = p.querySelector('button'); if (pertama) pertama.focus();
    }
    function buatGrup() {
        var k = window.NgumpulGrupPapan && NgumpulGrupPapan.konteks();
        if (!k) return;
        mulaiBuat({ jenis: 'grup', peserta: k.anggotaIds.map(String) }).then(function (m) {
            if (!m) return;
            NgumpulGrupPapan.kirim({ nama: 'Papan gambar: ' + m.nama, mime: MIME, papanId: m.id, papanNama: m.nama, ukuran: 0 }).then(function () { buka(m.id); }).catch(function (er) { toast((er && er.message) || 'Gagal mengirim papan.'); });
        });
    }

    // ---------- pasang item di panel lampiran ----------
    function pasangLampiran() {
        var grid = document.querySelector('#panel-lampiran .lampiran-grid');
        if (!grid || grid.querySelector('[data-fitur="lampir-papan"]')) return;
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'lampiran-item';
        b.setAttribute('data-fitur', 'lampir-papan');
        b.innerHTML = '<span class="lampiran-ikon" style="background:#8b5cf6">' + ik('papan', 22).replace('class="pgm-ik"', 'class="ikon pgm-ik"') + '</span>Papan gambar';
        b.addEventListener('click', function () {
            try { tutupPanelLampiran(); } catch (e) { }
            kirimPribadi();
        });
        var kamera = grid.querySelector('[data-fitur="lampir-kamera"]');
        if (kamera && kamera.nextSibling) grid.insertBefore(b, kamera.nextSibling); else grid.appendChild(b);
    }
    function init() { pasangLampiran(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

    window.NgumpulPapan = {
        MIME: MIME, kartu: kartu, buka: buka, tutup: tutup, menuGrup: menuGrup, mulaiBuat: mulaiBuat,
        ringkas: function (id, nama) { return 'Papan gambar: ' + (nama || (bacaMeta(id) || {}).nama || ''); },
        meta: bacaMeta,
        _jumlahTampil: function () { return P ? (P.kotor && bangunLayer(), P.tampil.length) : 0; }
    };
})();
