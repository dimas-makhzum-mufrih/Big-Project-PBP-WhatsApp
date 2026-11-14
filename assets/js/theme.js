/**
 * NGUMPUL - Theme Manager
 * Tema dasar (light, dark) + tema premium (Celeste & Mint) + Sky Cycle.
 *
 * Atribut yang dipasang di <html>:
 *   data-theme  : id tema (light, dark, skyscape, cumulus, coolmint, ...)
 *   data-tone   : light | dark  (untuk hal generik)
 *   data-phase  : day | night   (hanya tema Celeste)
 *
 * Kunci localStorage:
 *   ngumpul_tema (pilihan terakhir), ngumpul_tema_<idAkun> (pilihan per akun),
 *   ngumpul_sky_mode, ngumpul_premium_<idAkun>
 *
 * API lama tetap ada: getTheme(), setTheme(), toggleTheme().
 */
(function () {
    "use strict";

    var KEY_TEMA = "ngumpul_tema";
    var KEY_SKY = "ngumpul_sky_mode";
    var JAM_SIANG = 6;   // siang mulai 06:00
    var JAM_MALAM = 18;  // malam mulai 18:00

    var TEMA = {
        light:     { nama: "Terang",     pack: "dasar",   tone: "light" },
        dark:      { nama: "Gelap",      pack: "dasar",   tone: "dark" },
        skyscape:  { nama: "Skyscape",   pack: "celeste", premium: true, sky: true },
        cumulus:   { nama: "Cumulus",    pack: "celeste", premium: true, sky: true },
        coolmint:  { nama: "Cool Mint",  pack: "mint",    premium: true, tone: "light" },
        chocomint: { nama: "Choco Mint", pack: "mint",    premium: true, tone: "dark" },
        windmint:  { nama: "Wind Mint",  pack: "mint",    premium: true, tone: "light" },
        coldmint:  { nama: "Cold Mint",  pack: "mint",    premium: true, tone: "light" },
        lemonzest: { nama: "Lemon Zest", pack: "citrus",  premium: true, tone: "light" },
        coollemon: { nama: "Cool Lemon", pack: "citrus",  premium: true, tone: "light" },
        lime:      { nama: "Lime",       pack: "citrus",  premium: true, tone: "light" },
        coldlime:  { nama: "Cold Lime",  pack: "citrus",  premium: true, tone: "light" },
        lemonlime: { nama: "Lemon Lime", pack: "citrus",  premium: true, tone: "light" },
        moonriver:     { nama: "Moon River",    pack: "single", premium: true, tone: "dark" },
        reignaissance: { nama: "Reignaissance", pack: "single", premium: true, tone: "dark" },
        sakurabloom:   { nama: "Sakura Bloom",  pack: "single", premium: true, tone: "dark" }
    };

    var MODE_SKY = ["auto", "day", "night", "reverse"];
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

    function apply() {
        var id = getTheme();
        var def = TEMA[id];
        var el = document.documentElement;

        var mode = getSkyMode();
        var phase = def.sky ? getPhase(mode) : "";
        var tone = def.sky ? (phase === "night" ? "dark" : "light") : def.tone;

        el.setAttribute("data-theme", id);
        el.setAttribute("data-tone", tone);

        if (phase) {
            el.setAttribute("data-phase", phase);
        } else {
            el.removeAttribute("data-phase");
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

    // Tombol bulan/matahari: bolak-balik antara terang dan gelap dasar
    function toggleTheme() {
        var gelap = document.documentElement.getAttribute("data-tone") === "dark";
        setTheme(gelap ? "light" : "dark");
    }

    // Terapkan langsung saat script jalan (di <head>) supaya tidak berkedip
    apply();

    document.addEventListener("DOMContentLoaded", function () {
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
        if (e.key && (e.key.indexOf(KEY_TEMA) === 0 || e.key === KEY_SKY)) apply();
    });

    // API untuk halaman lain
    window.NgumpulTheme = {
        daftar: TEMA,
        isPremium: isPremium,
        getTheme: getTheme,
        setTheme: setTheme,
        toggleTheme: toggleTheme,
        getSkyMode: getSkyMode,
        setSkyMode: setSkyMode,
        getPhase: function () { return getPhase(getSkyMode()); }
    };
})();