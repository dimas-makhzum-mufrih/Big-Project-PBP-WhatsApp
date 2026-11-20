/**
 * NGUMPUL - Efek tema (dashboard saja, dimuat otomatis oleh theme.js)
 *  - efek saat pesan terkirim (bintang, riak, kelopak, kilat, konfeti)
 *  - paralaks Nebula mengikuti kursor
 *  - arah bunga Sunflower mengikuti jam
 *  - animasi "boot" saat memilih Terminal
 * Tidak mengubah logika chat: pesan terkirim dikenali dari DOM daftar pesan.
 */
(function () {
    "use strict";

    var html = document.documentElement;
    var room = document.getElementById("panel-chat-aktif");
    var daftar = document.getElementById("box-list-pesan");
    if (!room) return;

    function def() {
        var T = window.NgumpulTheme;
        return T ? T.daftar[T.getTheme()] : null;
    }

    function penuh() {
        return html.getAttribute("data-hiasan") === "penuh" &&
            !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }

    function acak(a, b) { return a + Math.random() * (b - a); }

    // ---------- efek kirim ----------
    function buatEfek(jenis) {
        var w = document.createElement("div");
        w.className = "efek-kirim";
        w.setAttribute("aria-hidden", "true");
        var i, el;

        if (jenis === "bintang") {
            el = document.createElement("i"); el.className = "bintang"; w.appendChild(el);
        } else if (jenis === "riak") {
            for (i = 0; i < 3; i++) {
                el = document.createElement("i"); el.className = "riak";
                el.style.setProperty("--d", (i * 0.28) + "s"); w.appendChild(el);
            }
        } else if (jenis === "kelopak") {
            for (i = 0; i < 12; i++) {
                el = document.createElement("i"); el.className = "kelopak";
                el.style.setProperty("--x", acak(5, 95).toFixed(0) + "%");
                el.style.setProperty("--dx", acak(-60, 60).toFixed(0) + "px");
                el.style.setProperty("--r", acak(180, 540).toFixed(0) + "deg");
                el.style.setProperty("--d", acak(0, 0.7).toFixed(2) + "s"); w.appendChild(el);
            }
        } else if (jenis === "kilat") {
            el = document.createElement("i"); el.className = "kilat"; w.appendChild(el);
        } else if (jenis === "konfeti") {
            for (i = 0; i < 18; i++) {
                el = document.createElement("i"); el.className = "konfeti";
                el.style.setProperty("--dx", acak(-260, -20).toFixed(0) + "px");
                el.style.setProperty("--dy", acak(-280, -40).toFixed(0) + "px");
                el.style.setProperty("--r", acak(-300, 300).toFixed(0) + "deg"); w.appendChild(el);
            }
        } else {
            return;
        }

        room.appendChild(w);
        setTimeout(function () { w.remove(); }, 3200);
    }

    // Pesan terkirim = satu baris "kirim" baru muncul di akhir daftar pada chat yang sama
    var sebelumnya = 0;
    if (daftar) {
        new MutationObserver(function () {
            var baris = daftar.querySelectorAll(".message-row");
            var n = baris.length;
            var akhir = baris[n - 1];

            if (sebelumnya > 0 && n === sebelumnya + 1 && akhir && akhir.classList.contains("kirim") && penuh()) {
                var d = def();
                if (d && d.efek) buatEfek(d.efek);
            }
            sebelumnya = n;
        }).observe(daftar, { childList: true });
    }

    // ---------- paralaks Nebula ----------
    var tunggu = false;
    document.addEventListener("mousemove", function (e) {
        if (html.getAttribute("data-theme") !== "nebula" || !penuh() || tunggu) return;
        tunggu = true;
        requestAnimationFrame(function () {
            room.style.setProperty("--px", ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3));
            room.style.setProperty("--py", ((e.clientY / window.innerHeight) * 2 - 1).toFixed(3));
            tunggu = false;
        });
    }, { passive: true });

    // ---------- Sunflower menghadap matahari ----------
    function arahMatahari() {
        var d = new Date();
        var jam = d.getHours() + d.getMinutes() / 60;
        var deg = Math.max(-80, Math.min(80, ((jam - 6) / 12) * 160 - 80));
        html.style.setProperty("--sun", deg.toFixed(0) + "deg");
    }
    arahMatahari();
    setInterval(arahMatahari, 60000);

    // ---------- boot Terminal ----------
    var temaTerakhir = html.getAttribute("data-theme");
    document.addEventListener("ngumpul:tema-berubah", function (e) {
        var t = e.detail && e.detail.tema;
        if (t === "terminal" && temaTerakhir !== "terminal" && penuh()) {
            html.classList.remove("efek-boot");
            void html.offsetWidth;
            html.classList.add("efek-boot");
            setTimeout(function () { html.classList.remove("efek-boot"); }, 1000);
        }
        temaTerakhir = t;
    });
})();
