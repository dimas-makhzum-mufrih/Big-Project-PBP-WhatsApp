/* Tampilan emoji Ngumpul: ikon kategori SVG (ikut warna tema), "Terakhir dipakai", data emoji lengkap,
   dan picker yang sama untuk chat pribadi maupun grup. Dimuat otomatis oleh theme.js. */
(function () {
    if (window.__ngumpulEmojiUI) return;
    window.__ngumpulEmojiUI = true;

    // pastikan CSS-nya terpasang walau dashboard.html / theme.js versi lama (tampilan tidak boleh polos)
    (function () {
        var src = document.currentScript && document.currentScript.src;
        if (!src || document.querySelector('link[href*="emoji-ui.css"]')) return;
        var l = document.createElement("link");
        l.rel = "stylesheet"; l.id = "emoji-ui-css";
        l.href = src.replace(/js\/emoji-ui\.js(\?.*)?$/, "css/emoji-ui.css");
        document.head.appendChild(l);
    })();

    var SRC = (document.currentScript && document.currentScript.src) || "";
    var KUNCI_TERAKHIR = "ngumpul_emoji_terakhir";
    var MAKS_TERAKHIR = 32;

    function svgIkon(isi) {
        return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + isi + "</svg>";
    }
    var IKON = {
        recent: svgIkon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>'),
        smileys: svgIkon('<circle cx="12" cy="12" r="9"/><path d="M8.5 14.2a4 4 0 0 0 7 0"/><path d="M9 9.5h.01M15 9.5h.01" stroke-width="2.6"/>'),
        gestures: svgIkon('<path d="M8 12V6.5a1.5 1.5 0 0 1 3 0V11"/><path d="M11 10.5v-6a1.5 1.5 0 0 1 3 0V11"/><path d="M14 6.5a1.5 1.5 0 0 1 3 0V13"/><path d="M8 12.5 6.6 11a1.5 1.5 0 0 0-2.2 2l3.3 4.7A5 5 0 0 0 11.8 20H13a4 4 0 0 0 4-4v-3"/>'),
        people: svgIkon('<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>'),
        animals: svgIkon('<circle cx="6.5" cy="10" r="2"/><circle cx="17.5" cy="10" r="2"/><circle cx="10" cy="5.6" r="2"/><circle cx="14" cy="5.6" r="2"/><path d="M8 17.2c0-2.5 1.8-4.6 4-4.6s4 2.1 4 4.6c0 1.6-1.2 2.3-2.4 2.3-.7 0-1 -.3-1.6-.3s-.9.3-1.6.3C9.2 19.5 8 18.8 8 17.2z"/>'),
        food: svgIkon('<path d="M12 7.5c-1.6-1.2-4.6-1-6 1.2-1.6 2.5-.8 6.3 1.2 8.7 1.1 1.3 2.4 2 3.4 1.6.9-.3 1-.4 1.4-.4s.5.1 1.4.4c1 .4 2.3-.3 3.4-1.6 2-2.4 2.8-6.2 1.2-8.7-1.4-2.2-4.4-2.4-6-1.2z"/><path d="M12 7.5c0-2 .9-3.4 2.6-4"/>'),
        travel: svgIkon('<path d="M21 3 10.5 13.5"/><path d="m21 3-6.5 18-3.6-7.9L3 9.5z"/>'),
        activities: svgIkon('<circle cx="12" cy="12" r="9"/><path d="M12 3c2.4 2.2 3.6 5.2 3.6 9s-1.2 6.8-3.6 9M12 3C9.6 5.2 8.4 8.2 8.4 12s1.2 6.8 3.6 9M3 12h18"/>'),
        objects: svgIkon('<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>'),
        symbols: svgIkon('<path d="M12 20.5s-7.5-4.4-7.5-10A4.4 4.4 0 0 1 12 7.7a4.4 4.4 0 0 1 7.5 2.8c0 5.6-7.5 10-7.5 10z"/>'),
        flags: svgIkon('<path d="M5 21V4"/><path d="M5 4.5c3-1.6 5 1.6 8 0s4.2-.6 6 0v8c-1.8-.6-3-1.6-6 0s-5-1.6-8 0"/>')
    };
    var LABEL = {
        recent: "Terakhir dipakai", smileys: "Wajah & Emosi", gestures: "Tangan & Isyarat", people: "Orang",
        animals: "Hewan & Alam", food: "Makanan & Minuman", travel: "Perjalanan & Tempat",
        activities: "Aktivitas", objects: "Objek", symbols: "Simbol", flags: "Bendera"
    };
    var URUT = ["recent", "smileys", "gestures", "people", "animals", "food", "travel", "activities", "objects", "symbols", "flags"];
    var KATEGORI_NYATA = URUT.slice(1);

    window.NgumpulIkonEmoji = IKON;

    /* ---------- penyimpanan "terakhir dipakai" ---------- */
    function bacaTerakhir() {
        try {
            var a = JSON.parse(localStorage.getItem(KUNCI_TERAKHIR) || "[]");
            return Array.isArray(a) ? a.filter(function (x) { return typeof x === "string"; }).slice(0, MAKS_TERAKHIR) : [];
        } catch (e) { return []; }
    }
    function simpanTerakhir(daftar) {
        try { localStorage.setItem(KUNCI_TERAKHIR, JSON.stringify(daftar)); } catch (e) { /* abaikan */ }
    }

    window.DATA_EMOJI = window.DATA_EMOJI || {};
    window.DATA_PENCARIAN_EMOJI = window.DATA_PENCARIAN_EMOJI || {};
    var DATA = window.DATA_EMOJI;
    var KATA = window.DATA_PENCARIAN_EMOJI;
    DATA.recent = { label: LABEL.recent, list: bacaTerakhir() };

    function catatTerakhir(emoji) {
        if (!emoji) return;
        var lama = DATA.recent.list.filter(function (x) { return x !== emoji; });
        lama.unshift(emoji);
        DATA.recent.list.length = 0;
        lama.slice(0, MAKS_TERAKHIR).forEach(function (x) { DATA.recent.list.push(x); });
        simpanTerakhir(DATA.recent.list);
    }
    window.NgumpulCatatEmoji = catatTerakhir;

    /* ---------- data lengkap digabung dengan data bawaan ---------- */
    function tanpaVS(e) { return e.replace(/️/g, ""); }

    function gabungData() {
        var penuh = window.DATA_EMOJI_LENGKAP, kata = window.DATA_EMOJI_KATA;
        if (!penuh) return false;
        var sudah = {};
        KATEGORI_NYATA.forEach(function (k) {
            if (!DATA[k]) DATA[k] = { label: LABEL[k], list: [] };
            DATA[k].label = LABEL[k];
        });
        // "nature" dari data lama (kalau ada) digabung ke hewan & alam
        if (DATA.nature) { DATA.nature.list.forEach(function (e) { DATA.animals.list.push(e); }); delete DATA.nature; }
        KATEGORI_NYATA.forEach(function (k) { DATA[k].list.forEach(function (e) { sudah[tanpaVS(e)] = 1; }); });
        KATEGORI_NYATA.forEach(function (k) {
            var tambahan = (penuh[k] || "").split(" ");
            tambahan.forEach(function (e) {
                if (!e || sudah[tanpaVS(e)]) return;
                sudah[tanpaVS(e)] = 1;
                DATA[k].list.push(e);
            });
        });
        if (kata) {
            Object.keys(kata).forEach(function (e) {
                var baru = kata[e].split(" ");
                var lama = KATA[e] || KATA[tanpaVS(e)] || [];
                var hasil = lama.slice();
                baru.forEach(function (w) { if (w && hasil.indexOf(w) < 0) hasil.push(w); });
                KATA[e] = hasil;
            });
        }
        return true;
    }

    function muatDataLengkap(sesudah) {
        if (window.DATA_EMOJI_LENGKAP) { gabungData(); sesudah(); return; }
        if (!SRC) return;
        var s = document.createElement("script");
        s.src = SRC.replace(/emoji-ui\.js(\?.*)?$/, "data-emoji-lengkap.js");
        s.onload = function () { if (gabungData()) sesudah(); };
        document.head.appendChild(s);
    }

    /* ---------- tab kategori (SVG) ---------- */
    function buatTab(kategori, aktif) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "emoji-tab" + (aktif ? " aktif" : "");
        b.dataset.kategori = kategori;
        b.title = LABEL[kategori];
        b.setAttribute("aria-label", LABEL[kategori]);
        b.innerHTML = IKON[kategori];
        return b;
    }

    function pasangTabUtama() {
        var tabs = document.getElementById("emoji-tabs");
        if (!tabs || tabs.dataset.euSiap) return;
        tabs.dataset.euSiap = "1";
        tabs.classList.add("eu-tabs");
        var awal = DATA.recent.list.length ? "recent" : "smileys";
        tabs.replaceChildren.apply(tabs, URUT.map(function (k) { return buatTab(k, k === awal); }));
        var label = document.getElementById("emoji-kategori-label");
        if (label) label.textContent = LABEL[awal];
        try { kategoriEmojiAktif = awal; } catch (e) { /* variabel milik chat-footer.js */ }
        var panel = document.getElementById("panel-emoji-popup");
        if (panel) panel.classList.add("eu-picker");
        if (typeof window.renderPilihanEmoji === "function") window.renderPilihanEmoji("");
    }

    /* Catat emoji yang dipilih dari grid utama dan dari reaksi cepat */
    document.addEventListener("click", function (e) {
        var t = e.target.closest && e.target.closest("#emoji-grid button, .reaksi-cepat[data-emoji]");
        if (!t) return;
        var emoji = t.dataset.emoji || t.textContent;
        if (emoji) catatTerakhir(emoji.trim());
    }, true);

    /* ---------- picker untuk ruang grup ---------- */
    function pasangGrup() {
        var panel = document.getElementById("ruang-emoji");
        var area = document.getElementById("ruang-input");
        if (!panel || !area || panel.dataset.euSiap) return;
        panel.dataset.euSiap = "1";
        panel.classList.add("eu-grup");
        panel.replaceChildren();

        var cari = document.createElement("input");
        cari.type = "search"; cari.className = "eu-cari"; cari.placeholder = "Cari emoji...";
        cari.setAttribute("aria-label", "Cari emoji"); cari.autocomplete = "off";
        var tabs = document.createElement("div");
        tabs.className = "emoji-tabs eu-tabs";
        var label = document.createElement("div");
        label.className = "emoji-kategori-label";
        var grid = document.createElement("div");
        grid.className = "emoji-grid eu-grid";
        panel.append(cari, tabs, label, grid);

        var aktif = DATA.recent.list.length ? "recent" : "smileys";

        function gambar() {
            var q = cari.value.trim().toLocaleLowerCase("id-ID");
            var sumber = q ? KATEGORI_NYATA.reduce(function (a, k) { return a.concat(DATA[k] ? DATA[k].list : []); }, []) : (DATA[aktif] ? DATA[aktif].list : []);
            var unik = [], lihat = {};
            sumber.forEach(function (e) { if (!lihat[e]) { lihat[e] = 1; unik.push(e); } });
            if (q) {
                unik = unik.filter(function (e) {
                    if (e.indexOf(q) >= 0) return true;
                    var ks = KATA[e] || KATA[tanpaVS(e)] || [];
                    if (q.length === 1) return ks.some(function (w) { return w.toLocaleLowerCase("id-ID").indexOf(q) === 0; });
                    return ks.join(" ").toLocaleLowerCase("id-ID").indexOf(q) >= 0;
                });
            }
            label.textContent = q ? "Hasil pencarian" : LABEL[aktif];
            var frag = document.createDocumentFragment();
            unik.forEach(function (e) {
                var b = document.createElement("button");
                b.type = "button"; b.className = "ruang-emoji-item"; b.textContent = e;
                b.setAttribute("aria-label", "Sisipkan emoji " + e);
                frag.appendChild(b);
            });
            grid.replaceChildren(frag);
            grid.scrollTop = 0;
        }
        function tabs_() {
            tabs.replaceChildren.apply(tabs, URUT.map(function (k) { return buatTab(k, k === aktif); }));
        }
        tabs.addEventListener("click", function (ev) {
            var t = ev.target.closest(".emoji-tab");
            if (!t) return;
            aktif = t.dataset.kategori; cari.value = "";
            tabs.querySelectorAll(".emoji-tab").forEach(function (x) { x.classList.toggle("aktif", x === t); });
            gambar();
        });
        grid.addEventListener("click", function (ev) {
            var b = ev.target.closest("button");
            if (!b) return;
            var emoji = b.textContent;
            var a = area.selectionStart == null ? area.value.length : area.selectionStart;
            var z = area.selectionEnd == null ? a : area.selectionEnd;
            area.setRangeText(emoji, a, z, "end");
            area.focus();
            area.dispatchEvent(new Event("input", { bubbles: true }));
            catatTerakhir(emoji);
        });
        cari.addEventListener("input", gambar);
        panel.__euGambar = function () { aktif = DATA.recent.list.length && aktif === "recent" ? "recent" : aktif; tabs_(); gambar(); };
        tabs_(); gambar();
        // buang tombol bawaan grup.js yang ditambahkan setelah panel ini dirakit
        new MutationObserver(function () {
            Array.prototype.slice.call(panel.children).forEach(function (c) {
                if (c.classList.contains("ruang-emoji-item")) c.remove();
            });
        }).observe(panel, { childList: true });
    }


    /* ---------- bendera negara di Windows ----------
       Windows tidak punya gambar bendera (🇮🇩 tampil sebagai huruf "ID"). Kalau terdeteksi begitu,
       dipasang font bendera (Twemoji Country Flags) yang hanya dipakai untuk karakter bendera.
       Urutan sumber: assets/fonts/TwemojiCountryFlags.woff2 (kalau kamu simpan sendiri), lalu CDN. */
    function benderaDidukung() {
        try {
            var c = document.createElement("canvas"); c.width = 48; c.height = 48;
            var x = c.getContext("2d", { willReadFrequently: true });
            x.textBaseline = "top"; x.font = "32px sans-serif";
            x.fillText("\uD83C\uDDEE\uD83C\uDDE9", 0, 4);
            var d = x.getImageData(0, 0, 48, 48).data;
            for (var i = 0; i < d.length; i += 4) {
                if (d[i + 3] > 200 && (Math.abs(d[i] - d[i + 1]) > 40 || Math.abs(d[i + 1] - d[i + 2]) > 40)) return true;
            }
            return false;
        } catch (e) { return true; }
    }
    function pasangFontBendera(paksa) {
        if (document.getElementById("eu-font-bendera")) return;
        if (!paksa && benderaDidukung()) return;
        var lokal = SRC ? SRC.replace(/js\/emoji-ui\.js(\?.*)?$/, "fonts/TwemojiCountryFlags.woff2") : "";
        var cdn = "https://cdn.jsdelivr.net/npm/country-flag-emoji-polyfill@0.1/dist/TwemojiCountryFlags.woff2";
        var tumpuk = (getComputedStyle(document.body).fontFamily || "sans-serif");
        var st = document.createElement("style");
        st.id = "eu-font-bendera";
        st.textContent =
            '@font-face{font-family:"Twemoji Country Flags";unicode-range:U+1F1E6-1F1FF,U+1F3F4,U+E0062-E007F;' +
            'src:' + (lokal ? 'url("' + lokal + '") format("woff2"),' : "") + 'url("' + cdn + '") format("woff2");font-display:swap}' +
            'body,#emoji-grid button,.ruang-emoji-item,.eu-grid button,.reaksi-cepat,textarea,.message-bubble,.grup-pesan-isi' +
            '{font-family:"Twemoji Country Flags",' + tumpuk + '}';
        document.head.appendChild(st);
    }
    window.NgumpulBendera = { pasang: pasangFontBendera, didukung: benderaDidukung };

    /* ---------- kapan dipasang ---------- */
    function pasang() {
        pasangTabUtama();
        pasangGrup();
    }
    function ulang() {
        var p = document.getElementById("ruang-emoji");
        if (p && p.__euGambar) p.__euGambar();
        if (typeof window.renderPilihanEmoji === "function") {
            var c = document.getElementById("input-cari-emoji");
            try { window.renderPilihanEmoji(c ? c.value : ""); } catch (e) { /* abaikan */ }
        }
    }

    function mulai() {
        pasangFontBendera(false);
        pasang();
        muatDataLengkap(ulang);
        // grup.js merakit panelnya sendiri saat dashboard siap; coba lagi sampai elemennya ada
        var coba = 0;
        var t = setInterval(function () {
            pasang();
            if ((document.getElementById("ruang-emoji") && document.getElementById("ruang-emoji").dataset.euSiap && document.getElementById("emoji-tabs") && document.getElementById("emoji-tabs").dataset.euSiap) || ++coba > 40) clearInterval(t);
        }, 250);
    }
    // Panel grup di-render ulang? grup.js mengisi tombolnya sekali saja, jadi cukup pasang sekali lalu bersihkan sisa tombol lama
    // letakkan panel grup melayang tepat di atas tombol emoji (sama seperti picker chat pribadi)
    function posisiGrup() {
        var p = document.getElementById("ruang-emoji"), b = document.getElementById("ruang-btn-emoji");
        if (!p || !b || p.hidden) return;
        var r = b.getBoundingClientRect();
        var lebar = Math.min(372, window.innerWidth - 24);
        p.style.left = Math.max(12, Math.min(r.left - 8, window.innerWidth - lebar - 12)) + "px";
        p.style.bottom = Math.max(8, window.innerHeight - r.top + 10) + "px";
    }
    document.addEventListener("click", function (e) {
        var t = e.target.closest && e.target.closest("#ruang-btn-emoji");
        if (t) { pasangGrup(); setTimeout(posisiGrup, 0); return; }
        var p = document.getElementById("ruang-emoji");
        if (p && !p.hidden && !e.target.closest("#ruang-emoji")) p.hidden = true;
    }, true);
    window.addEventListener("resize", posisiGrup);

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mulai);
    else mulai();
})();
