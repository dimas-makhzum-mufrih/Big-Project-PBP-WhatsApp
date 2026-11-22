/* Teks berformat Ngumpul (chat pribadi + grup).
 *
 * Gaya WhatsApp / Discord
 *   *tebal*  **tebal**   _miring_   __garis bawah__   ~coret~  ~~coret~~
 *   ||spoiler||          `kode`     ```blok kode```   "> " di awal baris = baris kode
 * Warna & gaya ala Ngumpul (kurung kurawal + NOMOR, tanpa kata bahasa apa pun, jadi netral untuk semua bahasa):
 *   {12: teks}          nomor 1-64 = urutan kotak di papan warna (kiri ke kanan, atas ke bawah)
 *                       1-16 normal | 17-32 terang | 33-48 lembut (pastel) | 49-64 gelap   -> 16 x 4 = 64 warna
 *   {#ff8800: teks}     warna bebas (hex 3 / 6 digit)
 *   {?: teks} acak      {%: teks} pelangi      boleh digabung: {5 %: teks}
 *   Bisa bersarang: {1: halo {9: dunia}}
 * Semua teks dirender lewat DOM (tidak pernah innerHTML), jadi aman dari XSS.
 * Diterapkan lewat MutationObserver supaya chat-tampil.js / grup.js tidak perlu diubah.
 */
(function () {
    "use strict";
    if (window.NgumpulFormat) return;

    // ---------- warna ----------
    // urutan = nomor warna 1..16 (rona berpasangan: terang lalu tua, netral di akhir)
    var DASAR = [
        ["1", "Merah", "#ff5555"], ["2", "Merah tua", "#aa0000"], ["3", "Emas", "#ffaa00"], ["4", "Kuning", "#ffff55"],
        ["5", "Hijau", "#55ff55"], ["6", "Hijau tua", "#00aa00"], ["7", "Aqua", "#55ffff"], ["8", "Toska", "#00aaaa"],
        ["9", "Biru", "#5555ff"], ["10", "Biru tua", "#0000aa"], ["11", "Pink", "#ff55ff"], ["12", "Ungu", "#aa00aa"],
        ["13", "Putih", "#ffffff"], ["14", "Abu muda", "#aaaaaa"], ["15", "Abu tua", "#555555"], ["16", "Hitam", "#000000"]
    ];
    var TINGKAT = [["", "Normal"], ["terang", "Terang"], ["lembut", "Lembut"], ["gelap", "Gelap"]];
    var GAYA_SIMBOL = { "?": "k", "%": "p" };
    var HEX = {};
    DASAR.forEach(function (d) { HEX[d[0]] = d[2]; });
    function dariNomor(n) { return { dasar: String((n - 1) % 16 + 1), tingkat: TINGKAT[Math.floor((n - 1) / 16)][0] }; }

    function campur(hex, ke, t) {
        var r = parseInt(hex.substr(1, 2), 16), g = parseInt(hex.substr(3, 2), 16), b = parseInt(hex.substr(5, 2), 16);
        var k = ke === "w" ? 255 : 0;
        function m(c) { return Math.round(c + (k - c) * t); }
        return "#" + [m(r), m(g), m(b)].map(function (c) { return ("0" + c.toString(16)).slice(-2); }).join("");
    }
    function warna(kode, tingkat) {
        var h = HEX[kode];
        if (!h) return null;
        if (tingkat === "terang") return campur(h, "w", 0.4);
        if (tingkat === "lembut") return campur(h, "w", 0.62);
        if (tingkat === "gelap") return campur(h, "b", 0.42);
        return h;
    }
    function terang(hex) {
        var r = parseInt(hex.substr(1, 2), 16), g = parseInt(hex.substr(3, 2), 16), b = parseInt(hex.substr(5, 2), 16);
        return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    }
    function hexPanjang(h) {
        h = h.toLowerCase();
        return h.length === 3 ? "#" + h[0] + h[0] + h[1] + h[1] + h[2] + h[2] : "#" + h;
    }

    // ---------- tokenisasi ----------
    var TANDA = ["**", "__", "~~", "||", "*", "_", "~"];
    var RE_BUKA = /^\{([^{}:\n]{1,40}):[ \t]?/;
    // "12" / "#f80" / "?" / "%" / gabungan dipisah spasi -> {hex, dasar, tingkat, gaya:[..]} ; null kalau ada yang tidak dikenal
    function urai(spek) {
        var kata = spek.trim().split(/\s+/), r = { hex: null, dasar: null, tingkat: "", gaya: [] }, i, k, n;
        if (!kata[0]) return null;
        for (i = 0; i < kata.length; i++) {
            k = kata[i];
            if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(k)) r.hex = hexPanjang(k.slice(1));
            else if (/^\d{1,2}$/.test(k) && (n = parseInt(k, 10)) >= 1 && n <= 64) { var d = dariNomor(n); r.dasar = d.dasar; r.tingkat = d.tingkat; }
            else if (GAYA_SIMBOL[k]) r.gaya.push(GAYA_SIMBOL[k]);
            else return null;
        }
        return r;
    }
    var RE_URL = /^https?:\/\/[^\s<>"]+/;

    function huruf(c) { return !!c && /[\p{L}\p{N}]/u.test(c); }
    function spasi(c) { return !c || /\s/.test(c); }

    function token(teks) {
        var out = [], buf = "", i = 0, n = teks.length, m, tm;
        function dorong() { if (buf) { out.push({ t: "teks", v: buf }); buf = ""; } }
        while (i < n) {
            var c = teks[i];
            if (c === "{" && (m = RE_BUKA.exec(teks.slice(i, i + 60)))) {
                var sp = urai(m[1]);
                if (sp) { dorong(); out.push({ t: "wbuka", sp: sp, raw: m[0] }); i += m[0].length; continue; }
            }
            if (c === "`" && (m = /^`[^`\n]+`/.exec(teks.slice(i)))) { dorong(); out.push({ t: "kode", v: m[0].slice(1, -1) }); i += m[0].length; continue; }
            if (c === "}") { dorong(); out.push({ t: "wtutup" }); i++; continue; }
            if (c === "h" && (tm = RE_URL.exec(teks.slice(i)))) {
                var u = tm[0].replace(/[.,;:!?)\]]+$/, "");
                dorong(); out.push({ t: "tautan", v: u }); i += u.length; continue;
            }
            var tanda = null;
            for (var k = 0; k < TANDA.length; k++) if (teks.substr(i, TANDA[k].length) === TANDA[k]) { tanda = TANDA[k]; break; }
            if (tanda) {
                var prev = teks[i - 1], next = teks[i + tanda.length];
                var buka, tutup;
                if (tanda === "||") { buka = !!next; tutup = !!prev; }
                else if (tanda.length === 2) { buka = !spasi(next); tutup = !spasi(prev); }
                else { buka = !spasi(next) && !huruf(prev); tutup = !spasi(prev) && !huruf(next); }
                // `**` / `__` / `~~` yang tidak bisa dipasangkan ditandai literal oleh pohon
                dorong(); out.push({ t: "tanda", v: tanda, buka: buka, tutup: tutup });
                i += tanda.length; continue;
            }
            buf += c; i++;
        }
        dorong();
        return out;
    }

    // ---------- pohon (pasangkan penanda) ----------
    function pohon(tokens) {
        var akar = { anak: [] }, tumpuk = [akar], i, tk, f;
        function atas() { return tumpuk[tumpuk.length - 1]; }
        function lepas(frame) { atas().anak.push({ t: "teks", v: frame.raw || frame.tanda }); frame.anak.forEach(function (a) { atas().anak.push(a); }); }
        for (i = 0; i < tokens.length; i++) {
            tk = tokens[i];
            if (tk.t === "wbuka") { tumpuk.push({ tanda: "{", sp: tk.sp, raw: tk.raw, anak: [] }); continue; }
            if (tk.t === "wtutup") {
                var iw = -1;
                for (var q = tumpuk.length - 1; q > 0; q--) if (tumpuk[q].tanda === "{") { iw = q; break; }
                if (iw > 0) {
                    while (tumpuk.length - 1 > iw) lepas(tumpuk.pop());
                    f = tumpuk.pop();
                    atas().anak.push({ t: "warna", sp: f.sp, anak: f.anak });
                } else atas().anak.push({ t: "teks", v: "}" });
                continue;
            }
            if (tk.t !== "tanda") { atas().anak.push(tk); continue; }
            var idx = -1;
            if (tk.tutup) for (var j = tumpuk.length - 1; j > 0; j--) if (tumpuk[j].tanda === tk.v) { idx = j; break; }
            if (idx > 0) {
                while (tumpuk.length - 1 > idx) lepas(tumpuk.pop());
                f = tumpuk.pop();
                // isi kosong ("**" + "**") tidak diformat
                if (!f.anak.length) { atas().anak.push({ t: "teks", v: f.tanda + tk.v }); continue; }
                atas().anak.push({ t: "node", tanda: f.tanda, anak: f.anak });
            } else if (tk.buka) tumpuk.push({ tanda: tk.v, anak: [] });
            else atas().anak.push({ t: "teks", v: tk.v });
        }
        while (tumpuk.length > 1) { f = tumpuk.pop(); lepas(f); }
        return akar.anak;
    }

    // ---------- render ----------
    function el(tag, kelas, teks) {
        var e = document.createElement(tag);
        if (kelas) e.className = kelas;
        if (teks != null) e.textContent = teks;
        return e;
    }

    function dasarGaya() { return { warna: null, l: false, o: false, n: false, m: false, k: false, p: false }; }

    function bungkusGaya(teks, g) {
        var sama = !g.warna && !g.l && !g.o && !g.n && !g.m && !g.k && !g.p;
        if (sama) return document.createTextNode(teks);
        var s = el("span", "fx");
        if (g.warna) {
            s.className += " fx-w";
            s.style.setProperty("--fx", g.warna);
            var t = terang(g.warna);
            s.dataset.lum = t < 0.22 ? "gelap" : t > 0.8 ? "terang" : "sedang";
        }
        if (g.l) s.className += " fx-l";
        if (g.o) s.className += " fx-o";
        if (g.n) s.className += " fx-n";
        if (g.m) s.className += " fx-m";
        if (g.p) s.className += " fx-p";
        if (g.k) { s.className += " fx-k"; s.dataset.asli = teks; }
        s.textContent = teks;
        return s;
    }

    function renderAnak(anak, induk, g) {
        anak.forEach(function (a) {
            if (a.t === "teks") induk.appendChild(bungkusGaya(a.v, g));
            else if (a.t === "kode") induk.appendChild(el("code", "fx-kode", a.v));
            else if (a.t === "tautan") {
                var l = el("a", "fx-tautan", a.v);
                l.href = a.v; l.target = "_blank"; l.rel = "noopener noreferrer";
                induk.appendChild(l);
            } else if (a.t === "warna") {
                var g2 = {}; for (var kk in g) g2[kk] = g[kk];
                var sp = a.sp;
                if (sp.hex) g2.warna = sp.hex; else if (sp.dasar) g2.warna = warna(sp.dasar, sp.tingkat);
                sp.gaya.forEach(function (x) { g2[x] = true; });
                renderAnak(a.anak, induk, g2);
            } else if (a.t === "node") {
                var tag = { "*": "strong", "**": "strong", "_": "em", "__": "u", "~": "s", "~~": "s", "||": "span" }[a.tanda];
                var e = el(tag);
                if (a.tanda === "||") {
                    e.className = "fx-spoiler";
                    e.tabIndex = 0;
                    e.setAttribute("role", "button");
                    e.setAttribute("aria-label", "Spoiler, tekan untuk menampilkan");
                }
                renderAnak(a.anak, e, g);
                induk.appendChild(e);
            }
        });
    }

    function inline(teks, induk, g) {
        renderAnak(pohon(token(teks)), induk, g);
    }

    function render(teks) {
        var frag = document.createDocumentFragment();
        var g = dasarGaya();
        teks = String(teks == null ? "" : teks);
        // blok kode ```...```
        var potong = teks.split(/(```[\s\S]*?```)/g);
        potong.forEach(function (bag) {
            if (!bag) return;
            if (bag.length >= 6 && bag.slice(0, 3) === "```" && bag.slice(-3) === "```") {
                var isi = bag.slice(3, -3).replace(/^\n/, "").replace(/\n$/, "");
                var pre = el("pre", "fx-blok"), code = el("code", "", isi);
                pre.appendChild(code); frag.appendChild(pre); return;
            }
            // baris "> " = baris kode; baris berurutan digabung satu blok
            var baris = bag.split("\n"), buf = [], kutip = [];
            function sisa() {
                if (buf.length) { inline(buf.join("\n"), frag, g); buf = []; }
            }
            function tutupKutip() {
                if (kutip.length) { var p = el("div", "fx-baris-kode", kutip.join("\n")); frag.appendChild(p); kutip = []; }
            }
            baris.forEach(function (b, i) {
                var adaNext = i < baris.length - 1;
                if (/^>\s/.test(b)) { sisa(); kutip.push(b.replace(/^>\s/, "")); }
                else {
                    var sebelum = kutip.length;
                    tutupKutip();
                    buf.push(b);
                    // setelah blok kode tidak perlu baris kosong tambahan
                    if (sebelum && b === "") buf.pop();
                }
                if (!adaNext) { /* akhir */ }
            });
            tutupKutip(); sisa();
        });
        return frag;
    }

    function polos(teks) {
        var d = document.createElement("div");
        d.appendChild(render(teks));
        return d.textContent;
    }

    // ---------- pemasangan ke gelembung chat ----------
    var SUMBER = new WeakMap();

    function sudahDiformat(node) { return node.firstElementChild && node.firstElementChild.classList.contains("fx-isi"); }
    function perluFormat(teks) { return /[*_~|`{]|^>\s|\n>\s|https?:\/\//.test(teks); }

    function terapkan(node, sumber) {
        if (node.querySelector("mark")) return;          // pencarian pesan sedang menyorot: biarkan
        if (sudahDiformat(node) && SUMBER.get(node) === sumber) return;
        if (!perluFormat(sumber)) { return; }
        var bungkus = el("span", "fx-isi");
        bungkus.appendChild(render(sumber));
        SUMBER.set(node, sumber);
        node.replaceChildren(bungkus);
        node.classList.add("fx-ada");
    }

    function periksaGelembung(bubble) {
        // chat pribadi: teks adalah <span> tanpa kelas / .chat-caption-text langsung di dalam gelembung
        Array.prototype.forEach.call(bubble.children, function (c) {
            if (c.tagName === "SPAN" && (!c.className || c.className === "chat-caption-text" || c.classList.contains("fx-ada"))) {
                var sumber = sudahDiformat(c) ? SUMBER.get(c) : c.textContent;
                if (sumber != null) terapkan(c, sumber);
            }
        });
    }
    function periksaGrup(node) {
        var sumber = node.dataset.text;
        if (sumber != null) terapkan(node, sumber);
    }
    function periksaPratinjau(node) {
        if (node.children.length) return;
        var t = node.textContent, p = perluFormat(t) ? polos(t) : t;
        if (p !== t) node.textContent = p;
    }

    function pindai(akar) {
        if (!akar || akar.nodeType !== 1) return;
        var q = function (sel, fn) {
            if (akar.matches && akar.matches(sel)) fn(akar);
            Array.prototype.forEach.call(akar.querySelectorAll(sel), fn);
        };
        q("#box-list-pesan .chat-bubble", periksaGelembung);
        q(".grup-pesan-isi", periksaGrup);
        q(".card-preview, #pinned-message-text", periksaPratinjau);
    }

    var antri = false, tambahan = [];
    function jadwalkan(n) {
        tambahan.push(n);
        if (antri) return;
        antri = true;
        requestAnimationFrame(function () {
            antri = false;
            var d = tambahan; tambahan = [];
            d.forEach(pindai);
        });
    }
    var pengamat = new MutationObserver(function (daftar) {
        daftar.forEach(function (m) {
            if (m.type === "characterData") { if (m.target.parentElement) jadwalkan(m.target.parentElement.closest(".chat-bubble, .grup-pesan-isi, .card-preview, #pinned-message-text") || m.target.parentElement); return; }
            if (m.target.closest && m.target.closest(".fx-isi")) return;     // perubahan hasil render sendiri
            if (m.addedNodes.length) Array.prototype.forEach.call(m.addedNodes, jadwalkan);
            if (m.target.matches && m.target.matches(".grup-pesan-isi, .card-preview, #pinned-message-text, .chat-bubble > span")) jadwalkan(m.target);
        });
    });

    // spoiler: klik / Enter menampilkan
    document.addEventListener("click", function (e) {
        var s = e.target.closest && e.target.closest(".fx-spoiler");
        if (s) { e.preventDefault(); s.classList.toggle("buka"); }
    });
    document.addEventListener("keydown", function (e) {
        if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("fx-spoiler")) {
            e.preventDefault(); e.target.classList.toggle("buka");
        }
    });

    // teks acak ({acak: ...})
    var HURUF = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&@?!";
    var pewaktuAcak = null;
    function putarAcak() {
        var daftar = document.querySelectorAll(".fx-k");
        if (!daftar.length) { clearInterval(pewaktuAcak); pewaktuAcak = null; return; }
        Array.prototype.forEach.call(daftar, function (e) {
            var a = e.dataset.asli || "", r = "";
            for (var i = 0; i < a.length; i++) r += a[i] === " " ? " " : HURUF[Math.floor(Math.random() * HURUF.length)];
            e.textContent = r;
        });
    }
    function mulaiAcak() {
        if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        if (!pewaktuAcak && document.querySelector(".fx-k")) pewaktuAcak = setInterval(putarAcak, 90);
    }
    setInterval(mulaiAcak, 1500);

    // ---------- papan format di kotak ketik ----------
    function sisipkan(input, awal, akhir) {
        var a = input.selectionStart, b = input.selectionEnd, v = input.value;
        var pilih = v.slice(a, b);
        if (akhir == null) {
            input.value = v.slice(0, a) + awal + v.slice(b);
            input.selectionStart = input.selectionEnd = a + awal.length;
        } else {
            input.value = v.slice(0, a) + awal + pilih + akhir + v.slice(b);
            if (pilih) { input.selectionStart = a; input.selectionEnd = b + awal.length + akhir.length; }
            else input.selectionStart = input.selectionEnd = a + awal.length;
        }
        input.focus();
        input.dispatchEvent(new Event("input", { bubbles: true }));
    }

    var papan = null, inputAktif = null;
    function bangunPapan() {
        papan = el("div", "fx-papan");
        papan.hidden = true;
        papan.setAttribute("role", "dialog");
        papan.setAttribute("aria-label", "Format teks");
        var gaya = el("div", "fx-papan-gaya");
        [["B", "Tebal  *teks*", "*", "*", "fx-btn-b"], ["I", "Miring  _teks_", "_", "_", "fx-btn-i"], ["U", "Garis bawah  __teks__", "__", "__", "fx-btn-u"],
         ["S", "Coret  ~teks~", "~", "~", "fx-btn-s"], ["Spoiler", "Sembunyikan  ||teks||", "||", "||", "fx-btn-sp"],
         ["</>", "Kode  `teks`", "`", "`", "fx-btn-k"], ["Blok", "Baris kode  > teks", "> ", null, ""], ["?", "Teks acak  {?: teks}", "{?: ", "}", ""],
         ["%", "Teks pelangi  {%: teks}", "{%: ", "}", "fx-btn-p"]
        ].forEach(function (d) {
            var b = el("button", "fx-btn " + d[4], d[0]);
            b.type = "button"; b.title = d[1]; b.setAttribute("aria-label", d[1]);
            b.addEventListener("mousedown", function (e) { e.preventDefault(); });
            b.addEventListener("click", function () { if (inputAktif) sisipkan(inputAktif, d[2], d[3]); });
            gaya.appendChild(b);
        });
        papan.appendChild(gaya);
        var judul = el("p", "fx-papan-judul", "Warna (16 x 4 = 64)");
        papan.appendChild(judul);
        var grid = el("div", "fx-grid");
        TINGKAT.forEach(function (t) {
            DASAR.forEach(function (d) {
                var nomor = TINGKAT.indexOf(t) * 16 + parseInt(d[0], 10), kode = "{" + nomor + ": ", hex = warna(d[0], t[0]);
                var b = el("button", "fx-warna");
                b.type = "button";
                b.style.background = hex;
                b.title = nomor + "  " + d[1] + (t[0] ? " (" + t[1].toLowerCase() + ")" : "") + "  " + kode + "teks}";
                b.setAttribute("aria-label", b.title);
                b.addEventListener("mousedown", function (e) { e.preventDefault(); });
                b.addEventListener("click", function () { if (inputAktif) sisipkan(inputAktif, kode, "}"); });
                grid.appendChild(b);
            });
        });
        papan.appendChild(grid);
        papan.appendChild(el("p", "fx-papan-bantu", "Nomor = urutan kotak (1-64). Baris: normal, terang, lembut, gelap. Contoh: {12: Halo}. Warna bebas: {#ff8800: Halo}. Gaya: {?: acak} {%: pelangi}"));
        document.body.appendChild(papan);
        document.addEventListener("mousedown", function (e) {
            if (!papan.hidden && !papan.contains(e.target) && !e.target.closest(".fx-tombol")) papan.hidden = true;
        });
        document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !papan.hidden) papan.hidden = true; });
    }

    function bukaPapan(tombol, input) {
        if (!papan) bangunPapan();
        if (!papan.hidden && inputAktif === input) { papan.hidden = true; return; }
        inputAktif = input;
        papan.hidden = false;
        var r = tombol.getBoundingClientRect(), w = papan.offsetWidth, h = papan.offsetHeight;
        papan.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left)) + "px";
        papan.style.top = Math.max(8, r.top - h - 10) + "px";
    }

    function pasangTombol(idAnchor, idInput) {
        var anchor = document.getElementById(idAnchor), input = document.getElementById(idInput);
        if (!anchor || !input || anchor.parentNode.querySelector(".fx-tombol[data-untuk='" + idInput + "']")) return;
        var b = el("button", "fx-tombol " + (anchor.className || ""), "Aa");
        b.type = "button"; b.dataset.untuk = idInput;
        b.title = "Format teks"; b.setAttribute("aria-label", "Format teks");
        b.addEventListener("click", function (e) { e.preventDefault(); bukaPapan(b, input); });
        anchor.insertAdjacentElement("afterend", b);
    }
    function pasangSemua() {
        pasangTombol("btn-emoji", "input-teks-kirim");
        pasangTombol("ruang-btn-emoji", "ruang-input");
    }

    // pintasan: Ctrl+B / Ctrl+I / Ctrl+U di kotak ketik
    document.addEventListener("keydown", function (e) {
        if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return;
        var t = e.target;
        if (!t || (t.id !== "input-teks-kirim" && t.id !== "ruang-input")) return;
        var peta = { b: ["*", "*"], i: ["_", "_"], u: ["__", "__"] }[e.key.toLowerCase()];
        if (peta) { e.preventDefault(); sisipkan(t, peta[0], peta[1]); }
    });

    function mulai() {
        pasangSemua();
        pindai(document.body);
        pengamat.observe(document.body, { childList: true, subtree: true, characterData: true });
        // elemen grup dibuat belakangan oleh grup.js
        var ulang = 0, w = setInterval(function () { pasangSemua(); if (++ulang > 20) clearInterval(w); }, 500);
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mulai);
    else mulai();

    window.NgumpulFormat = {
        render: render, polos: polos, warna: warna,
        daftarWarna: function () {
            var o = [];
            TINGKAT.forEach(function (t) { DASAR.forEach(function (d) { o.push({ kode: "{" + (TINGKAT.indexOf(t) * 16 + parseInt(d[0], 10)) + ": teks}", nama: d[1] + (t[0] ? " " + t[1].toLowerCase() : ""), hex: warna(d[0], t[0]) }); }); });
            return o;
        }
    };
})();
