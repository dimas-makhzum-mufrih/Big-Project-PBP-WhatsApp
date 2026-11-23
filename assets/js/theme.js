/**
 * NGUMPUL - Theme Manager
 * Tema dasar (light, dark) + tema premium (Celeste & Mint) + Sky Cycle.
 *
 * Atribut yang dipasang di <html>:
 *   data-gerak  : jalan | pelan | diam (gerak latar tema Aurora)
 *   data-theme  : id tema (light, dark, skyscape, cumulus, coolmint, ...)
 *   data-tone   : light | dark  (untuk hal generik)
 *   data-phase  : day | night   (hanya tema Celeste)
 *   data-pack   : dasar | celeste | mint | ... (gaya khusus per pack)
 *
 * Kunci localStorage:
 *   ngumpul_tema (pilihan terakhir), ngumpul_tema_<idAkun> (pilihan per akun),
 *   ngumpul_sky_mode, ngumpul_aurora_gerak, ngumpul_premium_<idAkun>
 *
 * API lama tetap ada: getTheme(), setTheme(), toggleTheme().
 */
(function () {
    "use strict";

    var KEY_TEMA = "ngumpul_tema";
    var KEY_SKY = "ngumpul_sky_mode";
    var KEY_GERAK = "ngumpul_aurora_gerak";
    var JAM_SIANG = 6;   // siang mulai 06:00
    var JAM_MALAM = 18;  // malam mulai 18:00

    var TEMA = {
        light:     { nama: "Terang",     pack: "dasar",   tone: "light", genre: ["terang", "klasik"] },
        dark:      { nama: "Gelap",      pack: "dasar",   tone: "dark", genre: ["gelap", "klasik"] },
        skyscape:  { nama: "Skyscape",   pack: "celeste", premium: true, sky: true, genre: ["langit", "siklus"] },
        cumulus:   { nama: "Cumulus",    pack: "celeste", premium: true, sky: true, genre: ["langit", "siklus"] },
        coolmint:  { nama: "Cool Mint",  pack: "mint",    premium: true, tone: "light", genre: ["segar", "terang"] },
        chocomint: { nama: "Choco Mint", pack: "mint",    premium: true, tone: "dark", genre: ["gelap", "manis"] },
        windmint:  { nama: "Wind Mint",  pack: "mint",    premium: true, tone: "light", genre: ["alam", "pastel"] },
        coldmint:  { nama: "Cold Mint",  pack: "mint",    premium: true, tone: "light", genre: ["segar", "dingin", "pastel"] },
        lemonzest: { nama: "Lemon Zest", pack: "citrus",  premium: true, tone: "light", genre: ["segar", "ceria"] },
        coollemon: { nama: "Cool Lemon", pack: "citrus",  premium: true, tone: "light", genre: ["segar", "dingin"] },
        lime:      { nama: "Lime",       pack: "citrus",  premium: true, tone: "light", genre: ["segar", "alam"] },
        coldlime:  { nama: "Cold Lime",  pack: "citrus",  premium: true, tone: "light", genre: ["segar", "dingin"] },
        lemonlime: { nama: "Lemon Lime", pack: "citrus",  premium: true, tone: "light", genre: ["segar", "ceria"] },
        moonriver:     { nama: "Moon River",    pack: "single", premium: true, tone: "dark", genre: ["gelap", "langit", "gradasi"] },
        reignaissance: { nama: "Reignaissance", pack: "single", premium: true, tone: "dark", genre: ["gelap", "gradasi", "mewah"] },
        sakurabloom:   { nama: "Sakura Bloom",  pack: "single", premium: true, tone: "dark", efek: "kelopak", genre: ["gelap", "manis", "bergerak", "efek"] },
        aurora: { nama: "Aurora Borealis", pack: "aurora", premium: true, tone: "dark", aurora: true, genre: ["gelap", "bergerak", "gradasi"] },
        glacier: { nama: "Glacier", pack: "aurora", premium: true, tone: "dark", aurora: true, genre: ["gelap", "dingin", "bergerak"] },
        polardusk: { nama: "Polar Dusk", pack: "aurora", premium: true, tone: "dark", aurora: true, genre: ["gelap", "gradasi", "bergerak"] },
        matchalatte: { nama: "Matcha Latte", pack: "dessert", premium: true, tone: "light", genre: ["manis", "alam", "pastel"] },
        taromilk: { nama: "Taro Milk", pack: "dessert", premium: true, tone: "light", genre: ["manis", "pastel"] },
        strawberrymilk: { nama: "Strawberry Milk", pack: "dessert", premium: true, tone: "light", genre: ["manis", "pastel"] },
        cremebrulee: { nama: "Creme Brulee", pack: "dessert", premium: true, tone: "light", genre: ["manis", "hangat"] },
        brownsugar: { nama: "Brown Sugar Boba", pack: "dessert", premium: true, tone: "dark", genre: ["manis", "gelap", "hangat"] },
        redvelvet: { nama: "Red Velvet", pack: "dessert", premium: true, tone: "dark", genre: ["manis", "gelap", "mewah"] },
        noir: { nama: "Noir", pack: "noirgold", premium: true, tone: "dark", genre: ["gelap", "mewah"] },
        ivory: { nama: "Ivory", pack: "noirgold", premium: true, tone: "light", genre: ["terang", "mewah", "hangat"] },
        springmeadow: { nama: "Spring Meadow", pack: "musim", premium: true, tone: "light", genre: ["musim", "alam", "pastel"] },
        summersolstice: { nama: "Summer Solstice", pack: "musim", premium: true, tone: "light", genre: ["musim", "ceria", "gradasi"] },
        autumnmist: { nama: "Autumn Mist", pack: "musim", premium: true, tone: "light", genre: ["musim", "hangat"] },
        winterfrost: { nama: "Winter Frost", pack: "musim", premium: true, tone: "light", genre: ["musim", "dingin", "terang"] },
        mapleamber: { nama: "Maple Amber", pack: "single", premium: true, tone: "dark", genre: ["gelap", "hangat", "interaktif"] },
        pastelparty: { nama: "Pastel Party", pack: "single", premium: true, tone: "light", gaya: true, efek: "konfeti", genre: ["pastel", "ceria", "interaktif", "tata", "efek"] },
        goldenhour: { nama: "Golden Hour", pack: "single", premium: true, tone: "light", gaya: true, fase5: true, genre: ["waktu", "gradasi", "bergerak"] },
        gameboy: { nama: "Gameboy", pack: "retro", premium: true, tone: "light", gaya: true, genre: ["retro", "interaktif", "tata"] },
        terminal: { nama: "Terminal", pack: "retro", premium: true, tone: "dark", gaya: true, efek: "kilat", genre: ["retro", "gelap", "tata", "efek"] },
        synthwave: { nama: "Synthwave", pack: "retro", premium: true, tone: "dark", gaya: true, genre: ["retro", "gelap", "gradasi", "bergerak"] },
        nebula: { nama: "Nebula", pack: "cosmos", premium: true, tone: "dark", gaya: true, latar: "nebula", efek: "bintang", genre: ["kosmos", "gelap", "efek", "bergerak", "interaktif"] },
        supernova: { nama: "Supernova", pack: "cosmos", premium: true, tone: "dark", gaya: true, efek: "bintang", genre: ["kosmos", "gelap", "gradasi", "efek"] },
        stardust: { nama: "Stardust", pack: "cosmos", premium: true, tone: "dark", gaya: true, latar: "stardust", efek: "bintang", genre: ["kosmos", "gelap", "bergerak", "efek"] },
        lavender: { nama: "Lavender Field", pack: "bunga", premium: true, tone: "light", gaya: true, latar: "lavender", efek: "kelopak", genre: ["bunga", "terang", "pastel", "efek", "bergerak"] },
        sunflower: { nama: "Sunflower", pack: "bunga", premium: true, tone: "light", gaya: true, genre: ["bunga", "terang", "waktu", "ceria"] },
        lotus: { nama: "Lotus Pond", pack: "bunga", premium: true, tone: "light", gaya: true, latar: "lotus", efek: "air", genre: ["bunga", "pastel", "elemen", "bergerak", "efek"] },
        rainy: { nama: "Rainy Window", pack: "elemen", premium: true, tone: "dark", gaya: true, latar: "hujan", genre: ["elemen", "gelap", "interaktif", "bergerak"] },
        ocean: { nama: "Deep Ocean", pack: "elemen", premium: true, tone: "dark", gaya: true, latar: "laut", efek: "gelembung", genre: ["elemen", "gelap", "bergerak", "efek"] },
        campfire: { nama: "Campfire", pack: "elemen", premium: true, tone: "dark", gaya: true, latar: "api", efek: "percikan", genre: ["elemen", "hangat", "gelap", "bergerak", "efek"] }
    };

    // Label genre (satu tema boleh punya beberapa). Dipakai kartu tema dan filter.
    var GENRE = {
        terang: "Terang", gelap: "Gelap", klasik: "Klasik", pastel: "Pastel", langit: "Langit",
        siklus: "Siang & malam", alam: "Alam", segar: "Segar", dingin: "Dingin", manis: "Manis",
        hangat: "Hangat", mewah: "Mewah", ceria: "Ceria", musim: "Musim", gradasi: "Gradasi",
        bergerak: "Bergerak", interaktif: "Interaktif",
        retro: "Retro", kosmos: "Kosmos", bunga: "Bunga", waktu: "Bereaksi waktu", efek: "Efek kirim", tata: "Tata letak", elemen: "Elemen"
    };

    var MODE_SKY = ["auto", "day", "night", "reverse"];
    var MODE_GERAK = ["jalan", "pelan", "diam"];
    var timer;

    function baca(k) {
        try { return localStorage.getItem(k); } catch (e) { return null; }
    }

    function tulis(k, v) {
        try { localStorage.setItem(k, v); } catch (e) {
            console.warn("Gagal menyimpan tema:", e);
        }
    }

    // id akun yang sedang login di tab ini (null kalau belum login)
    function sesiId() {
        try { return sessionStorage.getItem("ngumpul_sesi"); } catch (e) { return null; }
    }

    // tema bawaan = mengikuti pengaturan perangkat
    function temaBawaan() {
        if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
            return "dark";
        }
        return "light";
    }

    // Tema aktif:
    // - sudah login : pilihan akun itu (ngumpul_tema_<id>), kalau belum ada pakai pilihan terakhir (ngumpul_tema)
    // - belum login : pilihan terakhir (ngumpul_tema), supaya halaman login ikut tema
    // - tema premium DIKUNCI untuk akun yang bukan premium, jatuh ke tema bawaan
    function getTheme() {
        var id = sesiId();
        var s = (id && baca(KEY_TEMA + "_" + id)) || baca(KEY_TEMA);

        if (!s || !TEMA[s]) return temaBawaan();
        if (TEMA[s].premium && id && !isPremium()) return temaBawaan();
        return s;
    }

    function getSkyMode() {
        var m = baca(KEY_SKY);
        return MODE_SKY.indexOf(m) !== -1 ? m : "auto";
    }

    // Gerak latar tema Aurora: jalan | pelan | diam
    function getGerak() {
        var m = baca(KEY_GERAK);
        return MODE_GERAK.indexOf(m) !== -1 ? m : "jalan";
    }

    // Simulasi premium (tanpa server): kunci per akun di localStorage
    function isPremium() {
        try {
            var id = sessionStorage.getItem("ngumpul_sesi");
            return !!id && localStorage.getItem("ngumpul_premium_" + id) === "1";
        } catch (e) {
            return false;
        }
    }

    // Fase siang/malam sesuai mode Sky Cycle
    function getPhase(mode, tgl) {
        var jam = (tgl || new Date()).getHours();
        var siang = jam >= JAM_SIANG && jam < JAM_MALAM;

        if (mode === "day") return "day";
        if (mode === "night") return "night";
        if (mode === "reverse") return siang ? "night" : "day";
        return siang ? "day" : "night"; // auto
    }

    // ---------- Pemuatan CSS gaya + pengaturan hiasan ----------
    var KEY_HIASAN = "ngumpul_hiasan";   // penuh | ringan | polos
    var KEY_GH = "ngumpul_golden_mode";  // auto | reverse | fajar | siang | sore | senja | malam
    // Pengaturan tema umum. Nilai pertama = bawaan. Dipasang sebagai atribut data-<nama> di <html>.
    var PREF = {
        hiasan: ["penuh", "ringan", "polos"],
        objek: ["tampil", "sembunyi"],
        efek: ["nyala", "mati"],
        kecepatan: ["normal", "pelan", "cepat"],
        rapat: ["normal", "sedikit", "banyak"],
        hujan: ["gerimis", "deras", "mati"]
    };
    var MODE_HIASAN = PREF.hiasan;
    var MODE_GH = ["auto", "reverse", "fajar", "siang", "sore", "senja", "malam"];

    var BASE = (function () {
        var s = document.currentScript && document.currentScript.src;
        return s ? s.replace(/js\/theme\.js.*$/, "") : "";
    })();
    var cssDimuat = {};

    function muatCss(nama) {
        if (cssDimuat[nama] || !BASE) return;
        cssDimuat[nama] = true;
        var href = BASE + "css/" + nama + ".css";
        if (document.readyState === "loading") {
            document.write('<link rel="stylesheet" id="' + nama + '-css" href="' + href + '">'); // sebelum paint pertama
        } else {
            var l = document.createElement("link");
            l.rel = "stylesheet"; l.id = nama + "-css"; l.href = href;
            document.head.appendChild(l);
        }
    }
    function muatGaya() { muatCss("tema-gaya"); }

    function muatEfek() {
        if (!BASE || window.__ngumpulEfek) return;
        window.__ngumpulEfek = true;
        var s = document.createElement("script");
        s.src = BASE + "js/tema-efek.js";
        s.defer = true;
        document.head.appendChild(s);
    }

    function kunciPref(k) { return k === "hiasan" ? KEY_HIASAN : "ngumpul_pref_" + k; }

    function getPref(k) {
        var m = baca(kunciPref(k));
        return PREF[k] && PREF[k].indexOf(m) !== -1 ? m : PREF[k][0];
    }

    function setPref(k, v) {
        if (!PREF[k] || PREF[k].indexOf(v) === -1) return false;
        tulis(kunciPref(k), v);
        apply();
        return true;
    }

    function getHiasan() { return getPref("hiasan"); }

    function getGhMode() {
        var m = baca(KEY_GH);
        return MODE_GH.indexOf(m) !== -1 ? m : "auto";
    }

    // ---------- Golden Hour: langit dihitung per menit, bukan lompat ----------
    var GH_KEY = [
        [0,    "malam", "#050a22", "#0b1640", "#1c2a5e", "#1a2250"],
        [330,  "malam", "#050a22", "#0b1640", "#1c2a5e", "#1a2250"],
        [400,  "fajar", "#3b2a5e", "#f08a6a", "#ffd9a0", "#f08a6a"],
        [540,  "siang", "#4aa8ec", "#8ccdf5", "#d9f0fd", "#4aa8ec"],
        [900,  "siang", "#4aa8ec", "#8ccdf5", "#d9f0fd", "#4aa8ec"],
        [1020, "sore",  "#f5a03a", "#ffd27a", "#fff0c4", "#f5a03a"],
        [1110, "senja", "#5a2a6a", "#d0507a", "#ff9a5a", "#8a3a7a"],
        [1230, "malam", "#050a22", "#0b1640", "#1c2a5e", "#1a2250"],
        [1440, "malam", "#050a22", "#0b1640", "#1c2a5e", "#1a2250"]
    ];
    var GH_TETAP = { fajar: 400, siang: 720, sore: 1020, senja: 1110, malam: 1380 };

    function hex2rgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
    function campur(a, b, t) {
        var x = hex2rgb(a), y = hex2rgb(b);
        return "rgb(" + [0, 1, 2].map(function (i) { return Math.round(x[i] + (y[i] - x[i]) * t); }).join(",") + ")";
    }

    function hitungGH(mode) {
        var d = new Date();
        var m = d.getHours() * 60 + d.getMinutes();
        if (GH_TETAP[mode] != null) m = GH_TETAP[mode];
        else if (mode === "reverse") m = (m + 720) % 1440;

        var i = 0;
        while (i < GH_KEY.length - 2 && m >= GH_KEY[i + 1][0]) i++;
        var a = GH_KEY[i], b = GH_KEY[i + 1];
        var t = (m - a[0]) / (b[0] - a[0]);
        var fase = t < 0.5 ? a[1] : b[1];

        var siang = m >= 360 && m < 1080;
        var p = siang ? (m - 360) / 720 : ((m - 1080 + 1440) % 1440) / 720;

        return {
            fase: fase,
            tone: (m >= 380 && m < 1050) ? "light" : "dark",
            a: campur(a[2], b[2], t), b: campur(a[3], b[3], t), c: campur(a[4], b[4], t), hdr: campur(a[5], b[5], t),
            x: (8 + p * 84).toFixed(1) + "%",
            y: (70 - Math.sin(Math.PI * p) * 55).toFixed(1) + "%",
            benda: siang ? "matahari" : "bulan",
            sun: siang ? (m > 1000 ? "#ff9a5a" : "#ffd27a") : "#cfd8ff"
        };
    }

    function apply() {
        var id = getTheme();
        var def = TEMA[id];
        var el = document.documentElement;

        var mode = getSkyMode();
        var phase = def.sky ? getPhase(mode) : "";
        var tone = def.sky ? (phase === "night" ? "dark" : "light") : def.tone;

        var ghMode = getGhMode();
        var gh = def.fase5 ? hitungGH(ghMode) : null;
        if (gh) { tone = gh.tone; phase = gh.fase; }
        if (def.gaya) muatGaya();
        if (def.premium) muatCss("tema-grup"); // gaya yang sama untuk ruang grup/server

        el.setAttribute("data-theme", id);
        el.setAttribute("data-tone", tone);
        el.setAttribute("data-pack", def.pack || "dasar"); // dipakai CSS untuk gaya per pack

        if (phase) {
            el.setAttribute("data-phase", phase);
        } else {
            el.removeAttribute("data-phase");
        }

        el.setAttribute("data-gerak", getGerak());
        Object.keys(PREF).forEach(function (k) { el.setAttribute("data-" + k, getPref(k)); });

        if (def.gaya) el.setAttribute("data-gaya", "1"); else el.removeAttribute("data-gaya");

        ["--gh-a", "--gh-b", "--gh-c", "--gh-hdr", "--gh-x", "--gh-y", "--gh-sun"].forEach(function (k) { el.style.removeProperty(k); });
        if (gh) {
            el.style.setProperty("--gh-a", gh.a); el.style.setProperty("--gh-b", gh.b);
            el.style.setProperty("--gh-c", gh.c); el.style.setProperty("--gh-hdr", gh.hdr);
            el.style.setProperty("--gh-x", gh.x); el.style.setProperty("--gh-y", gh.y);
            el.style.setProperty("--gh-sun", gh.sun);
            el.setAttribute("data-benda", gh.benda);
        } else {
            el.removeAttribute("data-benda");
        }

        el.style.colorScheme = tone;

        // Sinkronkan tombol tema sederhana (jika ada)
        document.querySelectorAll("[data-theme-toggle]").forEach(function (button) {
            button.textContent = tone === "dark" ? "☀️" : "🌙";
            button.setAttribute(
                "aria-label",
                tone === "dark" ? "Aktifkan Light Mode" : "Aktifkan Dark Mode"
            );
            button.setAttribute("aria-pressed", String(tone === "dark"));
        });

        document.dispatchEvent(new CustomEvent("ngumpul:tema-berubah", {
            detail: { tema: id, fase: phase, tone: tone, sky: !!def.sky }
        }));

        // Cek ulang tiap menit hanya jika fase mengikuti jam
        clearInterval(timer);
        if (def.sky && (mode === "auto" || mode === "reverse")) {
            timer = setInterval(apply, 60000);
        } else if (gh && (ghMode === "auto" || ghMode === "reverse")) {
            timer = setInterval(apply, 60000);
        }
    }

    // Mengembalikan true kalau berhasil, false kalau tema tidak ada / terkunci
    function setTheme(id) {
        var def = TEMA[id];
        if (!def) return false;
        if (def.premium && !isPremium()) return false;

        var akun = sesiId();
        if (akun) tulis(KEY_TEMA + "_" + akun, id); // pilihan milik akun ini
        tulis(KEY_TEMA, id);                        // pilihan terakhir (untuk halaman sebelum login)
        apply();
        return true;
    }

    function setSkyMode(mode) {
        if (MODE_SKY.indexOf(mode) === -1) return false;

        tulis(KEY_SKY, mode);
        apply();
        return true;
    }

    function setHiasan(mode) {
        if (MODE_HIASAN.indexOf(mode) === -1) return false;
        tulis(KEY_HIASAN, mode);
        apply();
        return true;
    }

    function setGhMode(mode) {
        if (MODE_GH.indexOf(mode) === -1) return false;
        tulis(KEY_GH, mode);
        apply();
        return true;
    }

    function setGerak(mode) {
        if (MODE_GERAK.indexOf(mode) === -1) return false;

        tulis(KEY_GERAK, mode);
        apply();
        return true;
    }

    // Tombol bulan/matahari: bolak-balik antara terang dan gelap dasar
    function toggleTheme() {
        var gelap = document.documentElement.getAttribute("data-tone") === "dark";
        setTheme(gelap ? "light" : "dark");
    }

    // Terapkan langsung saat script jalan (di <head>) supaya tidak berkedip
    apply();

    document.addEventListener("DOMContentLoaded", function () {
        if (document.getElementById("panel-chat-aktif")) muatEfek();
        document.querySelectorAll("[data-theme-toggle]").forEach(function (button) {
            button.addEventListener("click", toggleTheme);
        });

        apply();
    });

    // Kembali ke tab / bangun dari sleep: cek fase lagi
    document.addEventListener("visibilitychange", function () {
        if (!document.hidden) apply();
    });

    // Sinkron antar tab
    window.addEventListener("storage", function (e) {
        if (e.key && (e.key.indexOf(KEY_TEMA) === 0 || e.key === KEY_SKY || e.key === KEY_GERAK || e.key === KEY_HIASAN || e.key === KEY_GH || e.key.indexOf("ngumpul_pref_") === 0)) apply();
    });

    // API untuk halaman lain
    window.NgumpulTheme = {
        daftar: TEMA,
        genre: GENRE,
        isPremium: isPremium,
        getTheme: getTheme,
        setTheme: setTheme,
        toggleTheme: toggleTheme,
        getSkyMode: getSkyMode,
        setSkyMode: setSkyMode,
        getGerak: getGerak,
        PREF: PREF,
        getPref: getPref,
        setPref: setPref,
        getHiasan: getHiasan,
        setHiasan: setHiasan,
        getGhMode: getGhMode,
        setGhMode: setGhMode,
        setGerak: setGerak,
        getPhase: function () { return getPhase(getSkyMode()); }
    };
})();