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
            if (teks.substr(i, 3) === "___" && teks[i + 3] !== "_" && teks[i - 1] !== "_") {
                // "___x___" = miring + garis bawah bertumpuk: "_" lalu "__" saat membuka, "__" lalu "_" saat menutup
                var pv = teks[i - 1], nx = teks[i + 3];
                if (!spasi(nx) && !huruf(pv)) { dorong(); out.push({ t: "tanda", v: "_", buka: true, tutup: false }, { t: "tanda", v: "__", buka: true, tutup: false }); i += 3; continue; }
                if (!spasi(pv) && !huruf(nx)) { dorong(); out.push({ t: "tanda", v: "__", buka: false, tutup: true }, { t: "tanda", v: "_", buka: false, tutup: true }); i += 3; continue; }
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

    // ---------- papan format di kotak ketik (tombol toggle) ----------
    // Tiap tombol menyalakan / mematikan format pada teks terpilih (atau kata di kursor).
    // Format bisa ditumpuk: tebal + miring + warna, dan dimatikan satu per satu.
    var GAYA = {
        b: { m: ["**", "*"], buka: "*" }, i: { m: ["_"], buka: "_" }, u: { m: ["__"], buka: "__" },
        s: { m: ["~~", "~"], buka: "~" }, sp: { m: ["||"], buka: "||" }, k: { m: ["`"], buka: "`" }
    };
    var RE_WARNA_TOKEN = /^(\d{1,2}|#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6})$/;
    var RE_KATA = /[\p{L}\p{N}]/u;

    function setTeks(input, v, a, b) {
        input.value = v;
        input.selectionStart = a; input.selectionEnd = b;
        input.focus();
        input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    // rentang kerja: pilihan tanpa spasi di tepi; kalau kosong, kata di kursor (jika ada)
    function rentang(input) {
        var v = input.value, a = input.selectionStart, b = input.selectionEnd;
        if (a !== b) {
            while (a < b && /\s/.test(v[a])) a++;
            while (b > a && /\s/.test(v[b - 1])) b--;
            return [a, b];
        }
        var x = a, y = a;
        while (x > 0 && RE_KATA.test(v[x - 1])) x--;
        while (y < v.length && RE_KATA.test(v[y])) y++;
        return [x, y];
    }
    // apakah rentang [a,b] dibungkus penanda m? -> "dalam" | "luar" | null
    function cocokTanda(v, a, b, m) {
        var L = m.length, sel = v.slice(a, b), tunggal = L === 1;
        if (b - a >= 2 * L && sel.slice(0, L) === m && sel.slice(-L) === m &&
            !(tunggal && (sel.charAt(L) === m || sel.charAt(sel.length - L - 1) === m))) return "dalam";
        if (a >= L && v.slice(a - L, a) === m && v.slice(b, b + L) === m &&
            !(tunggal && (v.charAt(a - L - 1) === m || v.charAt(b + L) === m))) return "luar";
        return null;
    }
    var SEMUA_TANDA = ["**", "__", "~~", "||", "*", "_", "~", "`"];
    // cari lapisan penanda m, boleh terhalang lapisan format lain (mis. *_x_* saat mencari "*" dari "x")
    // -> {kiri, kanan, L, dalam} (indeks penanda kiri & kanan) atau null
    function cariLapis(v, a, b, m) {
        var L = m.length, l = a, r = b, n, x, ketemu;
        for (n = 0; n < 6; n++) {
            var c = cocokTanda(v, l, r, m);
            if (c === "luar") return { kiri: l - L, kanan: r, L: L };
            if (c === "dalam") return { kiri: l, kanan: r - L, L: L };
            ketemu = false;
            for (x = 0; x < SEMUA_TANDA.length && !ketemu; x++) {
                var t = SEMUA_TANDA[x], lt = t.length;
                if (l >= lt && v.slice(l - lt, l) === t && v.slice(r, r + lt) === t) { l -= lt; r += lt; ketemu = true; }
            }
            if (!ketemu) {
                for (x = 0; x < SEMUA_TANDA.length && !ketemu; x++) {
                    var t2 = SEMUA_TANDA[x], l2 = t2.length;
                    if (r - l >= 2 * l2 && v.slice(l, l + l2) === t2 && v.slice(r - l2, r) === t2) { l += l2; r -= l2; ketemu = true; }
                }
            }
            if (!ketemu) return null;
        }
        return null;
    }
    function alihGaya(input, kunci) {
        var g = GAYA[kunci], v = input.value, r = rentang(input), a = r[0], b = r[1], k;
        if (a === b) {
            var L = g.buka.length;
            if (v.slice(a - L, a) === g.buka && v.slice(a, a + L) === g.buka) return setTeks(input, v.slice(0, a - L) + v.slice(a + L), a - L, a - L);
            return setTeks(input, v.slice(0, a) + g.buka + g.buka + v.slice(a), a + L, a + L);
        }
        for (k = 0; k < g.m.length; k++) {
            var m = g.m[k], p = cariLapis(v, a, b, m);
            if (!p) continue;
            var baru = v.slice(0, p.kiri) + v.slice(p.kiri + p.L, p.kanan) + v.slice(p.kanan + p.L);
            // penanda kiri di luar pilihan menggeser a & b; di dalam pilihan hanya menggeser b
            var na = p.kiri < a ? a - p.L : a;
            var nb = b - (p.kiri < a ? p.L : p.L) - (p.kanan >= b ? 0 : p.L);
            if (p.kiri >= a && p.kanan >= b) nb = b - p.L;
            if (p.kiri < a && p.kanan < b) nb = b - 2 * p.L;
            if (p.kiri < a && p.kanan >= b) nb = b - p.L;
            return setTeks(input, baru, na, nb);
        }
        var L3 = g.buka.length;
        setTeks(input, v.slice(0, a) + g.buka + v.slice(a, b) + g.buka + v.slice(b), a + L3, b + L3);
    }
    // cari pembungkus {spek: ...} di sekitar rentang. -> {hs, hl, spek, as, ae} atau null
    function cariKurung(v, a, b) {
        var sel = v.slice(a, b), m = /^\{([^{}:\n]{1,40}):[ \t]?/.exec(sel);
        if (m && urai(m[1]) && sel.charAt(sel.length - 1) === "}" && sel.length > m[0].length) {
            return { hs: a, hl: m[0].length, spek: m[1], as: a + m[0].length, ae: b - 1, tutupDalam: true };
        }
        var sebelum = v.slice(0, a), mm = /\{([^{}:\n]{1,40}):[ \t]?$/.exec(sebelum);
        if (mm && urai(mm[1]) && v.charAt(b) === "}") {
            return { hs: a - mm[0].length, hl: mm[0].length, spek: mm[1], as: a, ae: b, tutupDalam: false };
        }
        return null;
    }
    function alihKurung(input, fn) {
        var v = input.value, r = rentang(input), a = r[0], b = r[1];
        if (a === b) {
            var t0 = fn([]);
            var kode = "{" + t0.join(" ") + ": ";
            return setTeks(input, v.slice(0, a) + kode + "}" + v.slice(a), a + kode.length, a + kode.length);
        }
        var f = cariKurung(v, a, b);
        if (f) {
            var token = f.spek.trim().split(/\s+/), nt = fn(token.slice());
            var isi = v.slice(f.as, f.ae), awal = v.slice(0, f.hs), akhir = v.slice(f.ae + 1);
            if (!nt.length) return setTeks(input, awal + isi + akhir, awal.length, awal.length + isi.length);
            var hdr = "{" + nt.join(" ") + ": ";
            return setTeks(input, awal + hdr + isi + "}" + akhir, awal.length + hdr.length, awal.length + hdr.length + isi.length);
        }
        var nt2 = fn([]), h = "{" + nt2.join(" ") + ": ";
        setTeks(input, v.slice(0, a) + h + v.slice(a, b) + "}" + v.slice(b), a + h.length, b + h.length);
    }
    function alihWarna(input, nomor, hex) {
        var nilai = hex || String(nomor);
        alihKurung(input, function (t) {
            var idx = -1;
            t.forEach(function (x, n) { if (idx < 0 && RE_WARNA_TOKEN.test(x)) idx = n; });
            if (idx >= 0) { if (t[idx].toLowerCase() === nilai.toLowerCase()) t.splice(idx, 1); else t[idx] = nilai; }
            else t.unshift(nilai);
            return t;
        });
    }
    function alihSimbol(input, sim) {
        alihKurung(input, function (t) {
            var idx = t.indexOf(sim);
            if (idx >= 0) t.splice(idx, 1); else t.push(sim);
            return t;
        });
    }
    function alihBaris(input) {
        var v = input.value, a = input.selectionStart, b = input.selectionEnd;
        var mulai = v.lastIndexOf("\n", a - 1) + 1, akhir = v.indexOf("\n", b);
        if (akhir < 0) akhir = v.length;
        var baris = v.slice(mulai, akhir).split("\n");
        var semua = baris.every(function (x) { return /^>\s/.test(x); });
        var hasil = baris.map(function (x) { return semua ? x.replace(/^>\s/, "") : (/^>\s/.test(x) ? x : "> " + x); }).join("\n");
        setTeks(input, v.slice(0, mulai) + hasil + v.slice(akhir), mulai, mulai + hasil.length);
    }
    function sisipkan(input, awal, akhir) {   // dipertahankan untuk kompatibilitas
        var a = input.selectionStart, b = input.selectionEnd, v = input.value, pilih = v.slice(a, b);
        if (akhir == null) setTeks(input, v.slice(0, a) + awal + v.slice(b), a + awal.length, a + awal.length);
        else setTeks(input, v.slice(0, a) + awal + pilih + akhir + v.slice(b), pilih ? a : a + awal.length, pilih ? b + awal.length + akhir.length : a + awal.length);
    }

    // status: format apa yang sedang aktif di rentang kerja
    function statusAktif(input) {
        var v = input.value, r = rentang(input), a = r[0], b = r[1], st = { gaya: {}, warna: null, simbol: {} };
        if (a === b) return st;
        Object.keys(GAYA).forEach(function (k) {
            GAYA[k].m.forEach(function (m) { if (cocokTanda(v, a, b, m)) st.gaya[k] = true; });
        });
        // format bersarang di luar pilihan (mis. *_x_* saat x terpilih): periksa lapis luar berulang
        var kiri = a, kanan = b, aman = 0, f;
        while (aman++ < 6) {
            f = cariKurung(v, kiri, kanan);
            if (f) {
                f.spek.trim().split(/\s+/).forEach(function (t) {
                    if (RE_WARNA_TOKEN.test(t)) { if (!st.warna) st.warna = t.toLowerCase(); }
                    else st.simbol[t] = true;
                });
                if (f.tutupDalam) break;
                kiri = f.hs; kanan = f.ae + 1;
                continue;
            }
            var maju = false;
            Object.keys(GAYA).forEach(function (k) {
                GAYA[k].m.forEach(function (m) {
                    if (!maju && cocokTanda(v, kiri, kanan, m) === "luar") { st.gaya[k] = true; kiri -= m.length; kanan += m.length; maju = true; }
                });
            });
            if (!maju) break;
        }
        return st;
    }
    function segarkanStatus() {
        if (!papan || papan.hidden || !inputAktif) return;
        var st = statusAktif(inputAktif);
        papan.querySelectorAll("[data-gaya]").forEach(function (b) {
            var k = b.dataset.gaya, on = k.charAt(0) === "#" ? !!st.simbol[k.slice(1)] : !!st.gaya[k];
            b.classList.toggle("aktif", on); b.setAttribute("aria-pressed", String(on));
        });
        papan.querySelectorAll("[data-nomor]").forEach(function (b) {
            var on = !!st.warna && st.warna === b.dataset.nomor;
            b.classList.toggle("aktif", on); b.setAttribute("aria-pressed", String(on));
        });
    }

    var papan = null, inputAktif = null;
    function bangunPapan() {
        papan = el("div", "fx-papan");
        papan.hidden = true;
        papan.setAttribute("role", "dialog");
        papan.setAttribute("aria-label", "Format teks");
        var gaya = el("div", "fx-papan-gaya");
        [["B", "Tebal (Ctrl+B)", "b", "fx-btn-b"], ["I", "Miring (Ctrl+I)", "i", "fx-btn-i"], ["U", "Garis bawah (Ctrl+U)", "u", "fx-btn-u"],
         ["S", "Coret (Ctrl+Shift+X)", "s", "fx-btn-s"], ["Spoiler", "Sembunyikan teks", "sp", "fx-btn-sp"],
         ["</>", "Kode", "k", "fx-btn-k"], ["Blok", "Baris kode (awali dengan >)", "blok", ""],
         ["Glitch", "Teks glitch: huruf berganti-ganti acak", "#?", "fx-btn-g"], ["Pelangi", "Teks pelangi bergerak", "#%", "fx-btn-p"]
        ].forEach(function (d) {
            var b = el("button", "fx-btn " + d[3], d[0]);
            b.type = "button"; b.title = d[1]; b.setAttribute("aria-label", d[1]); b.setAttribute("aria-pressed", "false");
            if (d[2] !== "blok") b.dataset.gaya = d[2];
            b.addEventListener("mousedown", function (e) { e.preventDefault(); });
            b.addEventListener("click", function () {
                if (!inputAktif) return;
                if (d[2] === "blok") alihBaris(inputAktif);
                else if (d[2].charAt(0) === "#") alihSimbol(inputAktif, d[2].slice(1));
                else alihGaya(inputAktif, d[2]);
                segarkanStatus();
            });
            gaya.appendChild(b);
        });
        papan.appendChild(gaya);
        var judul = el("p", "fx-papan-judul", "Warna (16 x 4 = 64)");
        papan.appendChild(judul);
        var grid = el("div", "fx-grid");
        TINGKAT.forEach(function (t) {
            DASAR.forEach(function (d) {
                var nomor = TINGKAT.indexOf(t) * 16 + parseInt(d[0], 10), hex = warna(d[0], t[0]);
                var b = el("button", "fx-warna");
                b.type = "button";
                b.style.background = hex;
                b.dataset.nomor = String(nomor);
                b.title = nomor + "  " + d[1] + (t[0] ? " (" + t[1].toLowerCase() + ")" : "");
                b.setAttribute("aria-label", b.title); b.setAttribute("aria-pressed", "false");
                b.addEventListener("mousedown", function (e) { e.preventDefault(); });
                b.addEventListener("click", function () { if (inputAktif) { alihWarna(inputAktif, nomor); segarkanStatus(); } });
                grid.appendChild(b);
            });
        });
        papan.appendChild(grid);
        papan.appendChild(el("p", "fx-papan-bantu", "Pilih teks lalu ketuk tombol untuk menyalakan; ketuk lagi untuk mematikan. Format bisa ditumpuk (tebal + miring + warna + glitch). Tanpa pilihan, format dipasang pada kata di kursor."));
        document.body.appendChild(papan);
        document.addEventListener("mousedown", function (e) {
            if (!papan.hidden && !papan.contains(e.target) && !e.target.closest(".fx-tombol")) papan.hidden = true;
        });
        document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !papan.hidden) papan.hidden = true; });
        document.addEventListener("selectionchange", function () { if (!papan.hidden && document.activeElement === inputAktif) segarkanStatus(); });
    }

    function bukaPapan(tombol, input) {
        if (!papan) bangunPapan();
        if (!papan.hidden && inputAktif === input) { papan.hidden = true; return; }
        inputAktif = input;
        papan.hidden = false;
        segarkanStatus();
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

    // pintasan di kotak ketik: Ctrl+B / I / U (toggle), Ctrl+Shift+X (coret), Ctrl+E (kode)
    document.addEventListener("keydown", function (e) {
        if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
        var t = e.target;
        if (!t || (t.id !== "input-teks-kirim" && t.id !== "ruang-input")) return;
        var k = e.key.toLowerCase(), pilih = null;
        if (!e.shiftKey && (k === "b" || k === "i" || k === "u")) pilih = k;
        else if (!e.shiftKey && k === "e") pilih = "k";
        else if (e.shiftKey && k === "x") pilih = "s";
        if (pilih) { e.preventDefault(); alihGaya(t, pilih); segarkanStatus(); }
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
        alihGaya: alihGaya, alihWarna: alihWarna, alihSimbol: alihSimbol,
        daftarWarna: function () {
            var o = [];
            TINGKAT.forEach(function (t) { DASAR.forEach(function (d) { o.push({ kode: "{" + (TINGKAT.indexOf(t) * 16 + parseInt(d[0], 10)) + ": teks}", nama: d[1] + (t[0] ? " " + t[1].toLowerCase() : ""), hex: warna(d[0], t[0]) }); }); });
            return o;
        }
    };
})();
