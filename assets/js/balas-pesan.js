/* Balas pesan Ngumpul: geser bubble untuk membalas (sentuh & mouse), bar pratinjau balasan di grup,
   dan perekat dengan fitur balas chat pribadi (chat-data.js). Item "Balas" ada di menu aksi-pesan.js. */
(function () {
    if (window.__ngumpulBalas) return;
    window.__ngumpulBalas = true;

    (function () {
        var src = document.currentScript && document.currentScript.src;
        if (!src || document.querySelector('link[href*="balas-pesan.css"]')) return;
        var l = document.createElement("link");
        l.rel = "stylesheet"; l.id = "balas-pesan-css";
        l.href = src.replace(/js\/balas-pesan\.js(\?.*)?$/, "css/balas-pesan.css");
        document.head.appendChild(l);
    })();

    var NS = "http://www.w3.org/2000/svg";
    var JARAK_AKTIF = 56;     // px geseran sampai balasan terpicu
    var JARAK_MAKS = 84;
    var boxPribadi = document.getElementById("box-list-pesan");
    var boxGrup = document.getElementById("ruang-messages");

    function ikon(d, kelas) {
        var s = document.createElementNS(NS, "svg");
        s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("width", "18"); s.setAttribute("height", "18");
        s.setAttribute("fill", "none"); s.setAttribute("stroke", "currentColor"); s.setAttribute("stroke-width", "2");
        s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round");
        s.setAttribute("aria-hidden", "true"); s.setAttribute("focusable", "false");
        if (kelas) s.setAttribute("class", kelas);
        d.split("|").forEach(function (x) { var p = document.createElementNS(NS, "path"); p.setAttribute("d", x); s.appendChild(p); });
        return s;
    }
    var D_BALAS = "M9 14 4 9l5-5|M4 9h10a6 6 0 0 1 6 6v2";
    var D_TUTUP = "M18 6 6 18|M6 6l12 12";

    function ringkas(t, maks) {
        t = String(t || "").replace(/\s+/g, " ").trim();
        return t.length > (maks || 140) ? t.slice(0, (maks || 140) - 1) + "…" : t;
    }

    /* ---------- balasan di grup: status + bar pratinjau ---------- */
    var targetGrup = null;   // {kunci, id, nama, teks}
    var bar = null;

    function kunciGrup() { return typeof window.NgumpulGrupKunci === "function" ? window.NgumpulGrupKunci() : ""; }

    function namaPengirimGrup(baris) {
        var bubble = baris.querySelector(".chat-bubble");
        if (bubble && bubble.classList.contains("kirim")) return "Kamu";
        var n = baris.querySelector(".grup-pesan-pengirim");
        if (n) return n.textContent.trim();
        // pesan lanjutan: nama ada di pesan pertama dari pengirim yang sama
        var b = baris.previousElementSibling;
        while (b) {
            if (b.dataset && b.dataset.message) {
                var nn = b.querySelector(".grup-pesan-pengirim");
                if (nn) return nn.textContent.trim();
                if (!b.classList.contains("lanjutan")) break;
            }
            b = b.previousElementSibling;
        }
        return "Anggota";
    }

    function teksBaris(baris) {
        var isi = baris.querySelector(".grup-pesan-isi");
        var t = isi ? (isi.dataset.text || isi.textContent || "").trim() : "";
        if (t) return ringkas(t);
        var m = baris.querySelector(".chat-bubble img, .chat-bubble video, .chat-bubble audio");
        if (!m) return "Lampiran";
        return m.tagName === "IMG" ? "Foto" : m.tagName === "VIDEO" ? "Video" : "Pesan suara";
    }

    function pastikanBar() {
        if (bar && document.contains(bar)) return bar;
        var komposer = document.getElementById("ruang-composer");
        if (!komposer || !komposer.parentNode) return null;
        bar = document.createElement("div");
        bar.className = "reply-composer-preview ba-bar-grup";
        bar.hidden = true;
        var q = document.createElement("div"); q.className = "reply-composer-quote";
        var s = document.createElement("strong"); s.id = "ba-grup-nama";
        var t = document.createElement("span"); t.id = "ba-grup-teks";
        q.append(s, t);
        var x = document.createElement("button");
        x.type = "button"; x.className = "reply-composer-close"; x.setAttribute("aria-label", "Batalkan balasan");
        x.appendChild(ikon(D_TUTUP));
        x.addEventListener("click", function () { batalGrup(); });
        bar.append(q, x);
        komposer.parentNode.insertBefore(bar, komposer);
        return bar;
    }

    function segarBar() {
        var b = pastikanBar();
        if (!b) return;
        var komposer = document.getElementById("ruang-composer");
        var tampil = !!targetGrup && targetGrup.kunci === kunciGrup() && !(komposer && komposer.hidden);
        b.hidden = !tampil;
        if (tampil) {
            document.getElementById("ba-grup-nama").textContent = targetGrup.nama;
            document.getElementById("ba-grup-teks").textContent = targetGrup.teks;
        }
    }

    function mulaiGrup(baris) {
        if (!baris || !baris.dataset.message) return;
        var komposer = document.getElementById("ruang-composer");
        if (komposer && komposer.hidden) return;
        targetGrup = { kunci: kunciGrup(), id: baris.dataset.message, nama: namaPengirimGrup(baris), teks: teksBaris(baris) };
        segarBar();
        var i = document.getElementById("ruang-input");
        if (i) i.focus({ preventScroll: true });
    }
    function batalGrup() { targetGrup = null; segarBar(); }
    function ambilGrup() {
        if (!targetGrup || targetGrup.kunci !== kunciGrup()) return null;
        return { id: targetGrup.id, nama: targetGrup.nama, teks: targetGrup.teks };
    }

    window.NgumpulBalas = { mulaiGrup: mulaiGrup, batalGrup: batalGrup, ambilGrup: ambilGrup };

    if (boxGrup) {
        // pindah channel/grup = isi pesan dirender ulang; sembunyikan bar bila bukan ruangnya
        new MutationObserver(function () { segarBar(); }).observe(boxGrup, { childList: true });
    }

    /* ---------- geser untuk membalas ---------- */
    var terakhirGeser = 0;
    document.addEventListener("click", function (e) {
        if (Date.now() - terakhirGeser < 350) { e.stopPropagation(); e.preventDefault(); }
    }, true);

    function pasangGeser(box, jenis) {
        if (!box) return;
        var st = null;

        function baris(el) { return el.closest(jenis === "grup" ? "[data-message]" : ".message-row"); }
        function pembungkus(r) {
            return jenis === "grup" ? r.querySelector(".chat-bubble") : (r.querySelector(".message-content") || r.querySelector(".chat-bubble"));
        }
        function bisaBalas(r) {
            if (jenis === "grup") {
                var k = document.getElementById("ruang-composer");
                return !!(k && !k.hidden && r.querySelector(".chat-bubble") && !r.querySelector(".pesan-dihapus"));
            }
            return typeof window.mulaiBalasPesan === "function" && !(typeof chatTerblokir === "function" && chatTerblokir(chatAktifId)) && !!r.dataset.messageId && !r.querySelector(".pesan-dihapus");
        }
        function bersihkan() {
            if (!st) return;
            var w = st.wadah;
            w.style.transition = "transform .18s ease";
            w.style.transform = "";
            setTimeout(function () { w.style.transition = ""; w.classList.remove("ba-geser"); }, 200);
            if (st.pita) { st.pita.classList.remove("tampil", "siap"); st.pita.style.opacity = ""; }
            box.classList.remove("ba-menggeser");
            if (st.pid != null) { try { box.releasePointerCapture(st.pid); } catch (e) {} }
            st = null;
        }

        box.addEventListener("pointerdown", function (e) {
            if (e.button != null && e.button !== 0) return;
            if (e.target.closest("button, a, input, textarea, video, audio, .chat-image-wrapper, .ap-pemicu, .btn-react-trigger")) return;
            // mouse di atas teks = memilih/menyalin teks; geser lewat tepi bubble/jam. Sentuhan boleh di mana saja.
            if (e.pointerType === "mouse" && e.target.closest(".grup-pesan-isi, .chat-caption-text, .chat-bubble > span:not(.timestamp):not(.message-edited):not(.message-forwarded-label)")) return;
            var r = baris(e.target);
            if (!r || !e.target.closest(".chat-bubble, .message-content") || !bisaBalas(r)) return;
            st = { r: r, wadah: pembungkus(r), x: e.clientX, y: e.clientY, aktif: false, siap: false, pid: e.pointerId, mouse: e.pointerType === "mouse", pita: null };
        });

        box.addEventListener("pointermove", function (e) {
            if (!st || e.pointerId !== st.pid) return;
            var dx = e.clientX - st.x, dy = e.clientY - st.y;
            if (!st.aktif) {
                if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { st = null; return; }
                if (dx < 10 || dx < Math.abs(dy) * 1.5) return;
                if (st.mouse && window.getSelection && String(window.getSelection()).length) {
                    // sedang menyeleksi teks, bukan menggeser
                    st = null; return;
                }
                st.aktif = true;
                try { box.setPointerCapture(st.pid); } catch (er) {}
                box.classList.add("ba-menggeser");
                st.wadah.classList.add("ba-geser");
                var pita = st.r.querySelector(".ba-pita");
                if (!pita) {
                    pita = document.createElement("span");
                    pita.className = "ba-pita";
                    pita.setAttribute("aria-hidden", "true");
                    pita.appendChild(ikon(D_BALAS));
                    st.r.appendChild(pita);
                }
                st.pita = pita;
                pita.classList.add("tampil");
                if (window.getSelection) window.getSelection().removeAllRanges();
            }
            e.preventDefault();
            var gerak = Math.min(JARAK_MAKS, (dx - 10) * 0.75);
            if (gerak < 0) gerak = 0;
            st.wadah.style.transform = "translateX(" + gerak + "px)";
            var p = Math.min(1, gerak / JARAK_AKTIF);
            st.pita.style.opacity = String(p);
            st.pita.style.transform = "translateY(-50%) scale(" + (0.6 + 0.4 * p) + ")";
            var siap = gerak >= JARAK_AKTIF;
            if (siap !== st.siap) {
                st.siap = siap;
                st.pita.classList.toggle("siap", siap);
                if (siap && navigator.vibrate) { try { navigator.vibrate(12); } catch (er) {} }
            }
        });

        function selesai(e, batal) {
            if (!st || (e && e.pointerId !== st.pid)) return;
            var picu = st.aktif && st.siap && !batal, r = st.r, adaGeser = st.aktif;
            if (adaGeser) terakhirGeser = Date.now();
            bersihkan();
            if (picu) {
                if (jenis === "grup") mulaiGrup(r);
                else window.mulaiBalasPesan(r.dataset.messageId);
            }
        }
        box.addEventListener("pointerup", function (e) { selesai(e, false); });
        box.addEventListener("pointercancel", function (e) { selesai(e, true); });
        // Esc saat menggeser membatalkan
        document.addEventListener("keydown", function (e) { if (e.key === "Escape" && st && st.aktif) selesai(null, true); });
    }

    pasangGeser(boxPribadi, "pribadi");
    pasangGeser(boxGrup, "grup");

    /* ---------- Esc di kolom ketik membatalkan balasan ---------- */
    document.addEventListener("keydown", function (e) {
        if (e.key !== "Escape") return;
        var t = e.target;
        if (t && t.id === "ruang-input" && ambilGrup()) { e.preventDefault(); batalGrup(); }
        else if (t && t.id === "input-teks-kirim" && typeof window.batalkanBalasanPesan === "function" && typeof idBalasanAktif !== "undefined" && idBalasanAktif) {
            e.preventDefault(); window.batalkanBalasanPesan();
        }
    }, true);
})();
