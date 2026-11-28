/* Menu aksi pesan gaya WhatsApp (ikon SVG, dropdown).
 *
 * Satu menu untuk chat pribadi dan chat grup: Salin, Sematkan, Teruskan, Edit.
 * Dimuat otomatis oleh theme.js, jadi dashboard.html tidak perlu diubah.
 * Tidak mengubah file milik teman: hanya membaca DOM + memakai fungsi global yang
 * sudah ada (ambilPesanChat, simpanPesanChat, bukaDialogTeruskanPesan, ...).
 */
(function () {
    "use strict";
    if (window.__ngumpulAksiPesan) return;
    window.__ngumpulAksiPesan = true;

    // pastikan CSS-nya terpasang walau dashboard.html / theme.js versi lama (tampilan tidak boleh polos)
    (function () {
        var src = document.currentScript && document.currentScript.src;
        if (!src || document.querySelector('link[href*="aksi-pesan.css"]')) return;
        var l = document.createElement("link");
        l.rel = "stylesheet"; l.id = "aksi-pesan-css";
        l.href = src.replace(/js\/aksi-pesan\.js(\?.*)?$/, "css/aksi-pesan.css");
        document.head.appendChild(l);
    })();

    var BATAS = 5 * 60 * 1000;
    try { if (typeof BATAS_WAKTU_EDIT_PESAN === "number") BATAS = BATAS_WAKTU_EDIT_PESAN; else window.BATAS_WAKTU_EDIT_PESAN = BATAS; } catch (e) {}

    var NS = "http://www.w3.org/2000/svg";
    var IKON = {
        chevron: '<path d="m6 9 6 6 6-6"/>',
        salin: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
        pin: '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
        lepas: '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/><line x1="3" y1="3" x2="21" y2="21"/>',
        balas: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 6 6v2"/>',
        teruskan: '<polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/>',
        edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
        tutup: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
        hapus: '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>'
    };

    function svg(nama, kelas) {
        var s = document.createElementNS(NS, "svg");
        s.setAttribute("viewBox", "0 0 24 24");
        s.setAttribute("fill", "none");
        s.setAttribute("stroke", "currentColor");
        s.setAttribute("stroke-width", "2");
        s.setAttribute("stroke-linecap", "round");
        s.setAttribute("stroke-linejoin", "round");
        s.setAttribute("aria-hidden", "true");
        s.setAttribute("class", "ap-ikon" + (kelas ? " " + kelas : ""));
        s.innerHTML = IKON[nama];
        return s;
    }
    window.NgumpulIkonAksi = { svg: svg };

    function el(tag, kelas, teks) {
        var e = document.createElement(tag);
        if (kelas) e.className = kelas;
        if (teks) e.textContent = teks;
        return e;
    }

    /* ---------- toast ---------- */
    var toast, timerToast;
    function kabar(teks) {
        if (!toast) {
            toast = el("div", "ap-toast");
            toast.setAttribute("role", "status");
            document.body.appendChild(toast);
        }
        toast.textContent = teks;
        toast.classList.add("tampil");
        clearTimeout(timerToast);
        timerToast = setTimeout(function () { toast.classList.remove("tampil"); }, 2200);
    }

    function salinTeks(teks) {
        function cadangan() {
            var t = el("textarea");
            t.value = teks; t.style.cssText = "position:fixed;opacity:0;top:0;left:0";
            document.body.appendChild(t); t.select();
            var ok = false;
            try { ok = document.execCommand("copy"); } catch (e) {}
            t.remove();
            kabar(ok ? "Pesan disalin" : "Tidak bisa menyalin pesan");
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(teks).then(function () { kabar("Pesan disalin"); }, cadangan);
        } else cadangan();
    }

    /* ---------- menu ---------- */
    var menu = el("div", "ap-menu");
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "Aksi pesan");
    menu.hidden = true;
    var pemicuAktif = null;

    function item(ikon, label, aksi, bahaya, redup) {
        var b = el("button", "ap-item" + (bahaya ? " bahaya" : "") + (redup ? " redup" : ""));
        if (redup) b.setAttribute("aria-disabled", "true");
        b.type = "button";
        b.setAttribute("role", "menuitem");
        b.appendChild(svg(ikon));
        b.appendChild(el("span", "", label));
        b.addEventListener("click", function () {
            var kembali = pemicuAktif;
            tutupMenu(false);
            try { aksi(); } catch (e) { console.error(e); kabar("Gagal: " + (e && e.message ? e.message : "terjadi kesalahan")); }
            if (kembali && kembali.focus && document.contains(kembali) && !document.querySelector("dialog[open]")) {
                try { kembali.focus({ preventScroll: true }); } catch (e) {}
            }
        });
        return b;
    }

    function tutupMenu(fokus) {
        if (menu.hidden) return;
        menu.hidden = true;
        document.querySelectorAll(".ap-pemicu[aria-expanded='true']").forEach(function (p) { p.setAttribute("aria-expanded", "false"); });
        document.querySelectorAll(".ap-bubble-aktif").forEach(function (b) { b.classList.remove("ap-bubble-aktif"); });
        if (fokus && pemicuAktif && document.contains(pemicuAktif)) pemicuAktif.focus({ preventScroll: true });
    }

    function bukaMenu(daftar, bubble, pemicu, x, y) {
        if (!daftar.length) return;
        tutupMenu(false);
        menu.replaceChildren.apply(menu, daftar);
        menu.hidden = false;
        pemicuAktif = pemicu || null;
        if (pemicu) pemicu.setAttribute("aria-expanded", "true");
        bubble.classList.add("ap-bubble-aktif");

        var lebar = menu.offsetWidth, tinggi = menu.offsetHeight, jarak = 8;
        var kiri, atas;
        if (pemicu) {
            var r = pemicu.getBoundingClientRect();
            kiri = bubble.classList.contains("kirim") ? r.right - lebar : r.left;
            atas = r.bottom + 6;
            if (atas + tinggi > innerHeight - jarak) atas = r.top - tinggi - 6;
        } else {
            kiri = x; atas = y;
            if (atas + tinggi > innerHeight - jarak) atas = y - tinggi;
        }
        menu.style.left = Math.max(jarak, Math.min(kiri, innerWidth - lebar - jarak)) + "px";
        menu.style.top = Math.max(jarak, Math.min(atas, innerHeight - tinggi - jarak)) + "px";
        var pertama = menu.querySelector(".ap-item");
        if (pertama) pertama.focus({ preventScroll: true });
    }

    menu.addEventListener("keydown", function (e) {
        var daftar = Array.prototype.slice.call(menu.querySelectorAll(".ap-item"));
        var i = daftar.indexOf(document.activeElement);
        if (e.key === "ArrowDown") { e.preventDefault(); daftar[(i + 1) % daftar.length].focus(); }
        else if (e.key === "ArrowUp") { e.preventDefault(); daftar[(i - 1 + daftar.length) % daftar.length].focus(); }
        else if (e.key === "Home") { e.preventDefault(); daftar[0].focus(); }
        else if (e.key === "End") { e.preventDefault(); daftar[daftar.length - 1].focus(); }
        else if (e.key === "Tab") { e.preventDefault(); tutupMenu(true); }
    });
    document.addEventListener("keydown", function (e) {
        if (!menu.hidden && e.key === "Escape") { e.preventDefault(); e.stopPropagation(); tutupMenu(true); }
    }, true);
    document.addEventListener("pointerdown", function (e) {
        if (!menu.hidden && !menu.contains(e.target) && !e.target.closest(".ap-pemicu")) tutupMenu(false);
    }, true);
    window.addEventListener("resize", function () { tutupMenu(false); });
    window.addEventListener("blur", function () { tutupMenu(false); });

    /* ---------- dialog edit (dipakai chat pribadi) ---------- */
    var dlg = el("dialog", "ap-dialog");
    dlg.setAttribute("aria-labelledby", "ap-judul-edit");
    dlg.innerHTML =
        '<form class="ap-form" method="dialog">' +
        '<header class="ap-kepala"><h2 id="ap-judul-edit">Edit pesan</h2>' +
        '<button type="button" class="ap-tutup" aria-label="Tutup"></button></header>' +
        '<div class="ap-badan"><label class="sr-only" for="ap-isi-edit">Isi pesan</label>' +
        '<textarea id="ap-isi-edit" rows="4" maxlength="4000"></textarea>' +
        '<p class="ap-ket">Pesan hanya bisa diedit 5 menit sejak dikirim. Enter untuk simpan, Shift+Enter untuk baris baru.</p>' +
        '<p class="ap-galat" role="alert"></p></div>' +
        '<footer class="ap-kaki"><button type="button" class="ap-batal">Batal</button>' +
        '<button type="submit" class="ap-simpan">Simpan</button></footer></form>';
    document.body.appendChild(dlg);
    dlg.querySelector(".ap-tutup").appendChild(svg("tutup"));
    var formEdit = dlg.querySelector("form"), isiEdit = dlg.querySelector("textarea"), galatEdit = dlg.querySelector(".ap-galat");
    var targetEdit = null;

    function dalamBatas(waktu) {
        var t = Date.parse(waktu), umur = Date.now() - t;
        return isFinite(t) && umur >= 0 && umur <= BATAS;
    }

    function simpanEditPribadi(idLawan, idPesan, teksBaru) {
        if (typeof window.editPesanChat === "function") return window.editPesanChat(idLawan, idPesan, teksBaru);
        var teks = String(teksBaru || "").trim();
        if (!teks) return { berhasil: false, pesan: "Pesan tidak boleh kosong." };
        var daftar = ambilPesanChat(idLawan);
        var p = daftar.find(function (i) { return String(i.id) === String(idPesan); });
        if (!p || p.sender !== userAktif.id) return { berhasil: false, pesan: "Pesan tidak ditemukan atau bukan milik kamu." };
        if (!dalamBatas(p.time)) return { berhasil: false, pesan: "Batas waktu edit 5 menit sudah habis." };
        if (teks === p.text) return { berhasil: true, berubah: false };
        p.text = teks;
        p.editedAt = new Date().toISOString();
        if (!simpanPesanChat(idLawan, daftar)) return { berhasil: false, pesan: "Perubahan gagal disimpan." };
        return { berhasil: true, berubah: true };
    }

    function bukaEditPribadi(p) {
        targetEdit = { idLawan: chatAktifId, idPesan: p.id };
        isiEdit.value = p.text || "";
        galatEdit.textContent = "";
        dlg.showModal();
        isiEdit.focus();
        isiEdit.setSelectionRange(isiEdit.value.length, isiEdit.value.length);
    }

    formEdit.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!targetEdit) return;
        var h = simpanEditPribadi(targetEdit.idLawan, targetEdit.idPesan, isiEdit.value);
        if (!h.berhasil) { galatEdit.textContent = h.pesan; isiEdit.focus(); return; }
        dlg.close();
        if (h.berubah) {
            var kotak = document.getElementById("box-list-pesan"), pos = kotak ? kotak.scrollTop : 0;
            if (typeof renderPesanAktif === "function") renderPesanAktif();
            if (kotak) kotak.scrollTop = pos;
            if (typeof renderPinPesanAktif === "function") renderPinPesanAktif();
            if (typeof renderChatList === "function") renderChatList();
            if (typeof pencarianPesanTerbuka === "function" && pencarianPesanTerbuka() && typeof renderHasilPencarianPesan === "function") renderHasilPencarianPesan();
            kabar("Pesan diedit");
        }
    });
    isiEdit.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); formEdit.requestSubmit(); }
    });
    isiEdit.addEventListener("input", function () { galatEdit.textContent = ""; });
    dlg.querySelector(".ap-batal").addEventListener("click", function () { dlg.close(); });
    dlg.querySelector(".ap-tutup").addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("close", function () { targetEdit = null; });

    /* ---------- teruskan pesan ---------- */
    // Dialog teruskan milik teman (chat-teruskan.js) dipakai kalau ada. Kalau belum di-merge,
    // dialog sederhana di bawah ini yang dipakai, supaya menu tetap lengkap.
    function adaTeruskanBawaan() {
        return typeof window.bukaDialogTeruskanPesan === "function" && !!document.getElementById("dialog-teruskan-pesan");
    }
    function bisaTeruskan() {
        return adaTeruskanBawaan() || (typeof NgumpulKontakData !== "undefined" && typeof bacaSemuaChat === "function" && typeof simpanSemuaChat === "function");
    }

    var fw = null;
    function bangunFw() {
        var d = el("dialog", "ap-dialog");
        d.setAttribute("aria-labelledby", "ap-judul-fw");
        d.innerHTML =
            '<form class="ap-form" method="dialog">' +
            '<header class="ap-kepala"><h2 id="ap-judul-fw">Teruskan pesan</h2><button type="button" class="ap-tutup" aria-label="Tutup"></button></header>' +
            '<p class="forward-message-instruction">Pilih satu atau beberapa kontak tujuan.</p>' +
            '<label class="forward-message-search"><span class="sr-only">Cari kontak</span><input type="search" placeholder="Cari kontak..." autocomplete="off"></label>' +
            '<p class="forward-list-status" role="status" aria-live="polite"></p>' +
            '<div class="forward-contact-list"></div>' +
            '<footer class="ap-kaki"><button type="button" class="ap-batal">Batal</button><button type="submit" class="ap-simpan ap-fw-kirim">Teruskan</button></footer></form>';
        document.body.appendChild(d);
        var o = { d: d, pesan: null, cari: d.querySelector("input"), daftar: d.querySelector(".forward-contact-list"),
                  status: d.querySelector(".forward-list-status"), kirim: d.querySelector(".ap-fw-kirim") };
        d.querySelector(".ap-tutup").appendChild(svg("tutup"));
        d.querySelector(".ap-tutup").addEventListener("click", function () { d.close(); });
        d.querySelector(".ap-batal").addEventListener("click", function () { d.close(); });
        d.addEventListener("click", function (e) { if (e.target === d) d.close(); });
        o.kirim.insertAdjacentHTML("afterbegin", "");
        function segar() { o.kirim.classList.toggle("belum", !o.daftar.querySelector("input:checked")); if (o.daftar.querySelector("input:checked")) o.status.textContent = ""; }
        o.daftar.addEventListener("change", segar);
        o.cari.addEventListener("input", function () {
            var q = o.cari.value.trim().toLocaleLowerCase("id"), cocok = 0;
            Array.prototype.forEach.call(o.daftar.children, function (b) {
                var ok = b.textContent.toLocaleLowerCase("id").indexOf(q) >= 0; b.hidden = !ok; if (ok) cocok++;
            });
            o.status.textContent = q && !cocok ? "Kontak tidak ditemukan." : "";
        });
        d.querySelector("form").addEventListener("submit", function (e) {
            e.preventDefault();
            var tujuan = Array.prototype.map.call(o.daftar.querySelectorAll("input:checked"), function (i) { return i.value; })
                .filter(function (id) { return id !== String(userAktif.id) && getUserById(id) && !chatTerblokir(id); });
            if (!tujuan.length) { o.status.textContent = "Pilih dulu kontak tujuannya (centang di kanan nama)."; return; }
            try {
            var semua = bacaSemuaChat(), waktu = new Date().toISOString();
            tujuan.forEach(function (id) {
                var kunci = kunciKonversasi(userAktif.id, id);
                var arr = Array.isArray(semua[kunci]) ? semua[kunci].slice() : [];
                arr.push(Object.assign({}, o.pesan, { id: buatIdPesan(), sender: userAktif.id, time: waktu, status: "terkirim", forwarded: true }));
                semua[kunci] = arr;
            });
            if (!simpanSemuaChat(semua)) { o.status.textContent = "Pesan gagal diteruskan. Penyimpanan browser tidak dapat digunakan."; return; }
            if (typeof renderChatList === "function") renderChatList();
            if (typeof chatAktifId !== "undefined" && tujuan.some(function (id) { return String(id) === String(chatAktifId); }) && typeof renderPesanAktif === "function") renderPesanAktif();
            d.close();
            kabar("Pesan diteruskan ke " + tujuan.length + " kontak");
            } catch (err) { console.error(err); o.status.textContent = "Gagal meneruskan: " + (err && err.message ? err.message : "terjadi kesalahan"); }
        });
        return o;
    }

    function teruskan(pesan, pemicu) {
        // salinan bersih: tanda "Diedit" dan sematan milik pesan asal tidak ikut terbawa
        pesan = Object.assign({}, pesan);
        delete pesan.editedAt;
        if (adaTeruskanBawaan()) { window.bukaDialogTeruskanPesan(pesan, pemicu); return; }
        if (!fw) fw = bangunFw();
        fw.pesan = Object.assign({}, pesan);
        fw.cari.value = ""; fw.kirim.classList.add("belum"); fw.status.textContent = "";
        fw.daftar.replaceChildren();
        var teks = String((pesan && pesan.text) || "").trim();
        var lama = fw.d.querySelector(".ap-cuplikan"); if (lama) lama.remove();
        var cup = el("blockquote", "ap-cuplikan");
        cup.appendChild(svg("teruskan"));
        cup.appendChild(el("span", "", teks ? (teks.length > 140 ? teks.slice(0, 140) + "…" : teks) : "Gambar"));
        fw.d.querySelector(".forward-message-instruction").after(cup);
        var users = getUsers(), warna = [210, 280, 24, 160, 340, 45];
        var daftar = NgumpulKontakData.list(userAktif.id).filter(function (k) { return k && k.phone; }).map(function (k) {
            return { k: k, u: users.find(function (u) { return u && u.hp && samakanHp(u.hp, k.phone); }) };
        }).filter(function (x) { return !x.u || String(x.u.id) !== String(userAktif.id); });
        daftar.forEach(function (x) {
            var nama = x.k.name || (x.u ? getProfil(x.u.id).nama : "") || x.k.phone;
            var b = el("label", "forward-contact");
            var cb = el("input"); cb.type = "checkbox"; cb.value = String(x.u ? x.u.id : "");
            var det = el("span", "forward-contact-details");
            var nomor = el("span", "forward-contact-subtitle", x.k.phone);
            det.append(el("span", "forward-contact-name", nama), nomor);
            if (!x.u) { cb.disabled = true; b.classList.add("forward-contact-unavailable"); nomor.textContent += " (belum terdaftar)"; }
            else if (chatTerblokir(x.u.id)) { cb.disabled = true; b.classList.add("forward-contact-unavailable"); nomor.textContent += " (diblokir)"; }
            var jum = 0; for (var i = 0; i < nama.length; i++) jum += nama.charCodeAt(i);
            var av = el("span", "ap-avatar", nama.trim().charAt(0).toUpperCase());
            av.style.setProperty("--ap-hue", String(warna[jum % warna.length])); av.setAttribute("aria-hidden", "true");
            b.dataset.ap = "1";
            b.append(av, det, cb);
            fw.daftar.appendChild(b);
        });
        if (!daftar.length) fw.status.textContent = "Belum ada kontak tujuan yang bisa dipilih.";
        fw.d.showModal();
        fw.cari.focus();
    }

    /* ---------- chat pribadi ---------- */
    var boxPribadi = document.getElementById("box-list-pesan");

    function pesanPribadi(baris) {
        if (typeof ambilPesanChat !== "function" || typeof chatAktifId === "undefined" || !chatAktifId) return null;
        var id = baris && baris.dataset.messageId;
        if (!id) return null;
        return ambilPesanChat(chatAktifId).find(function (i) { return String(i.id) === id; }) || null;
    }

    function daftarPribadi(baris) {
        var p = pesanPribadi(baris);
        if (!p) return [];
        var daftar = [];
        var teks = String(p.text || "").trim();
        var hapusItem = typeof mintaHapusPesan === "function" && p.id
            ? item("hapus", "Hapus", function () { mintaHapusPesan(p.id); }, true) : null;
        // pesan yang sudah dihapus untuk semua: hanya boleh disembunyikan dari tampilan sendiri
        if (p.dihapusSemua) return hapusItem ? [hapusItem] : [];
        if (p.id && typeof mulaiBalasPesan === "function" && !(typeof chatTerblokir === "function" && chatTerblokir(chatAktifId))) {
            daftar.push(item("balas", "Balas", function () { mulaiBalasPesan(p.id); }));
        }
        if (teks) daftar.push(item("salin", "Salin", function () { salinTeks(teks); }));
        // kartu papan gambar: cukup Balas dan Hapus (tidak ada teks untuk disalin/diedit/diteruskan)
        if (p.papanId) { if (hapusItem) daftar.push(hapusItem); return daftar; }
        var btnPin = baris.querySelector(".btn-pin-message");
        if (btnPin && p.id) {
            var tersemat = typeof ambilPinPesan === "function" && ambilPinPesan(chatAktifId) === p.id;
            daftar.push(item(tersemat ? "lepas" : "pin", tersemat ? "Lepas sematan" : "Sematkan", function () { btnPin.click(); }));
        }
        if (bisaTeruskan() && p.id) {
            var btnTerus = baris.querySelector("[data-teruskan-pesan]");
            daftar.push(item("teruskan", "Teruskan", function () { teruskan(p, btnTerus); }));
        }
        var milikku = typeof userAktif !== "undefined" && userAktif && p.sender === userAktif.id;
        var blokir = typeof chatTerblokir === "function" && chatTerblokir(chatAktifId);
        if (milikku && teks) {
            if (blokir) daftar.push(item("edit", "Edit", function () { kabar("Pesan tidak dapat diedit saat pengguna diblokir."); }, false, true));
            else if (!dalamBatas(p.time)) daftar.push(item("edit", "Edit", function () { kabar("Batas waktu edit 5 menit sudah habis."); }, false, true));
            else daftar.push(item("edit", "Edit", function () { bukaEditPribadi(p); }));
        }
        if (hapusItem) daftar.push(hapusItem);
        return daftar;
    }

    /* ---------- chat grup ---------- */
    var boxGrup = document.getElementById("ruang-messages");
    var alihkanKeGrup = false;

    function teksGrup(baris) {
        var isi = baris.querySelector(".grup-pesan-isi");
        return isi ? (isi.dataset.text || isi.textContent || "").trim() : "";
    }

    function editGrup(bubble) {
        // memakai menu edit milik grup.js (ia yang tahu grup/channel aktif dan batas 5 menit)
        var r = bubble.getBoundingClientRect();
        var m = document.getElementById("menu-edit-pesan-grup");
        if (!m) return;
        alihkanKeGrup = true;
        m.classList.add("ap-sembunyi");
        bubble.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: r.left + 10, clientY: r.top + 10 }));
        alihkanKeGrup = false;
        var coba = 0;
        (function tunggu() {
            var tombol = !m.hidden && m.querySelector("button");
            if (tombol) { tombol.click(); m.classList.remove("ap-sembunyi"); return; }
            if (++coba > 30) { m.classList.remove("ap-sembunyi"); kabar("Batas waktu edit 5 menit sudah habis."); return; }
            setTimeout(tunggu, 30);
        })();
    }

    /* sematan pesan grup: disimpan lokal per akun (id pesan unik), satu sematan per channel yang sedang tampil */
    function kunciG() { return "ngumpul_grup_sematan_" + (typeof userAktif !== "undefined" && userAktif ? userAktif.id : "x"); }
    function bacaG() { try { var a = JSON.parse(localStorage.getItem(kunciG()) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
    function tulisG(a) { try { localStorage.setItem(kunciG(), JSON.stringify(a.slice(-300))); } catch (e) {} }
    var barG = null;
    function sematG(id, pasang) {
        var tampil = {};
        if (boxGrup) boxGrup.querySelectorAll("[data-message]").forEach(function (b) { tampil[b.dataset.message] = 1; });
        var a = bacaG().filter(function (x) { return x !== id && !tampil[x]; });
        if (pasang) a.push(id);
        tulisG(a);
        segarG();
        kabar(pasang ? "Pesan disematkan" : "Sematan dilepas");
    }
    function segarG() {
        if (!boxGrup) return;
        var rows = {};
        boxGrup.querySelectorAll("[data-message]").forEach(function (b) { rows[b.dataset.message] = b; });
        var a = bacaG(), aktif = null;
        for (var i = a.length - 1; i >= 0; i--) if (rows[a[i]]) { aktif = a[i]; break; }
        boxGrup.querySelectorAll(".ap-tersemat").forEach(function (b) { b.classList.remove("ap-tersemat"); });
        if (!barG) {
            barG = el("div", "pinned-message-container ap-bar-grup");
            barG.setAttribute("role", "button"); barG.tabIndex = 0;
            barG.setAttribute("aria-label", "Lompat ke pesan yang disematkan");
            var ic = el("div", "pinned-message-icon"); ic.appendChild(svg("pin"));
            var info = el("div", "pinned-message-info");
            info.append(el("span", "pinned-message-title", "Pesan Disematkan"), el("p"));
            var x = el("button", "ap-unpin"); x.type = "button"; x.title = "Lepas sematan"; x.setAttribute("aria-label", "Lepas sematan"); x.appendChild(svg("tutup"));
            barG.append(ic, info, x);
            function lompat() {
                var id = barG.dataset.id, r = id && boxGrup.querySelector('[data-message="' + id + '"]');
                if (!r) return;
                r.scrollIntoView({ behavior: "smooth", block: "center" });
                r.classList.remove("pesan-cari-terpilih"); void r.offsetWidth; r.classList.add("pesan-cari-terpilih");
                setTimeout(function () { r.classList.remove("pesan-cari-terpilih"); }, 1100);
            }
            barG.addEventListener("click", function (e) {
                if (e.target.closest(".ap-unpin")) { sematG(barG.dataset.id, false); return; }
                lompat();
            });
            barG.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); lompat(); } });
            boxGrup.parentNode.insertBefore(barG, boxGrup);
        }
        if (!aktif) { barG.hidden = true; barG.dataset.id = ""; return; }
        barG.hidden = false; barG.dataset.id = aktif;
        rows[aktif].querySelector(".chat-bubble") && rows[aktif].querySelector(".chat-bubble").classList.add("ap-tersemat");
        barG.querySelector("p").textContent = teksGrup(rows[aktif]) || "Lampiran";
    }

    function daftarGrup(baris) {
        var bubble = baris.querySelector(".chat-bubble");
        if (!bubble) return [];
        var daftar = [], teks = teksGrup(baris);
        var idHapus = baris.dataset.message;
        var hapusG = window.NgumpulGrupHapus && idHapus
            ? item("hapus", "Hapus", function () { window.NgumpulGrupHapus.minta(idHapus); }, true) : null;
        // sisa pesan yang dihapus untuk semua: hanya bisa disembunyikan dari tampilan sendiri
        if (bubble.classList.contains("pesan-dihapus")) return hapusG ? [hapusG] : [];
        var komposer = document.getElementById("ruang-composer");
        if (window.NgumpulBalas && komposer && !komposer.hidden) {
            daftar.push(item("balas", "Balas", function () { window.NgumpulBalas.mulaiGrup(baris); }));
        }
        if (teks) daftar.push(item("salin", "Salin", function () { salinTeks(teks); }));
        if (teks) {
            var idG = baris.dataset.message;
            var tersematG = bacaG().indexOf(idG) >= 0;
            daftar.push(item(tersematG ? "lepas" : "pin", tersematG ? "Lepas sematan" : "Sematkan", function () { sematG(idG, !tersematG); }));
        }
        if (teks && bisaTeruskan()) {
            // pesan grup diteruskan sebagai teks ke kontak pribadi (lampiran tidak ikut)
            daftar.push(item("teruskan", "Teruskan", function () { teruskan({ id: "grup-" + baris.dataset.message, text: teks }, null); }));
        }
        if (bubble.classList.contains("kirim") && teks) daftar.push(item("edit", "Edit", function () { editGrup(bubble); }));
        if (hapusG) daftar.push(hapusG);
        return daftar;
    }

    /* ---------- pemasangan pemicu & label ---------- */
    function pasang(box, jenis) {
        if (!box) return;
        var obs = new MutationObserver(function () { hias(box, jenis); if (jenis === "grup") segarG(); });
        obs.observe(box, { childList: true });
        hias(box, jenis);

        function bukaDari(e, bubble, titik) {
            var baris = bubble.closest(jenis === "grup" ? "[data-message]" : ".message-row");
            if (!baris) return;
            var daftar = jenis === "grup" ? daftarGrup(baris) : daftarPribadi(baris);
            box.__apGulir = box.scrollTop;
            var pemicu = titik ? null : bubble.querySelector(".ap-pemicu");
            bukaMenu(daftar, bubble, pemicu, e && e.clientX, e && e.clientY);
        }

        // fase capture: klik gelembung punya fitur lain (mis. popup reaksi emoji) yang tidak boleh ikut terpicu
        box.addEventListener("click", function (e) {
            var p = e.target.closest(".ap-pemicu");
            if (!p) return;
            e.preventDefault(); e.stopPropagation();
            var bubble = p.closest(".chat-bubble");
            if (p.getAttribute("aria-expanded") === "true") { tutupMenu(true); return; }
            bukaDari(e, bubble, false);
        }, true);
        box.addEventListener("keydown", function (e) {
            if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
                var bubble = e.target.closest && e.target.closest(".chat-bubble");
                if (bubble) { e.preventDefault(); e.stopPropagation(); bukaDari(e, bubble, false); }
            }
        }, true);

        // tekan lama di layar sentuh
        var timer = null, awal = null;
        box.addEventListener("pointerdown", function (e) {
            if (e.pointerType !== "touch" || e.target.closest("button, a, input, textarea, .fx-spoiler")) return;
            var bubble = e.target.closest(".chat-bubble");
            if (!bubble) return;
            awal = { x: e.clientX, y: e.clientY };
            clearTimeout(timer);
            timer = setTimeout(function () { timer = null; bukaDari({ clientX: awal.x, clientY: awal.y }, bubble, false); }, 480);
        });
        box.addEventListener("pointermove", function (e) {
            if (timer && awal && Math.hypot(e.clientX - awal.x, e.clientY - awal.y) > 10) { clearTimeout(timer); timer = null; }
        });
        ["pointerup", "pointercancel"].forEach(function (n) { box.addEventListener(n, function () { clearTimeout(timer); timer = null; }); });
        box.addEventListener("scroll", function () { if (!menu.hidden && Math.abs(box.scrollTop - (box.__apGulir || 0)) > 3) tutupMenu(false); }, { passive: true });

        // klik kanan: ganti menu bawaan browser / menu lama dengan menu ini
        document.addEventListener("contextmenu", function (e) {
            if (alihkanKeGrup && jenis === "grup") return;
            if (!box.contains(e.target)) return;
            var bubble = e.target.closest(".chat-bubble");
            if (!bubble || e.target.closest("a, input, textarea")) return;
            e.preventDefault(); e.stopPropagation();
            bukaDari(e, bubble, true);
        }, true);
    }

    var galat = false;
    function hias(box, jenis) {
        var baris = box.querySelectorAll(jenis === "grup" ? "[data-message]" : ".message-row");
        var pesanById = null;
        if (jenis === "pribadi" && typeof ambilPesanChat === "function" && typeof chatAktifId !== "undefined" && chatAktifId) {
            pesanById = {};
            try { ambilPesanChat(chatAktifId).forEach(function (p) { pesanById[String(p.id)] = p; }); } catch (e) { galat = true; }
        }
        baris.forEach(function (b) {
            var bubble = b.querySelector(".chat-bubble");
            if (!bubble || bubble.querySelector(".ap-pemicu")) return;
            var pemicu = el("button", "ap-pemicu");
            pemicu.type = "button";
            pemicu.setAttribute("aria-label", "Opsi pesan");
            pemicu.setAttribute("aria-haspopup", "menu");
            pemicu.setAttribute("aria-expanded", "false");
            pemicu.appendChild(svg("chevron"));
            bubble.appendChild(pemicu);
            if (jenis === "pribadi" && pesanById) {
                var p = pesanById[b.dataset.messageId];
                var footer = bubble.querySelector(".message-footer");
                if (p && p.editedAt && footer && !footer.querySelector(".message-edited")) {
                    footer.insertBefore(el("span", "timestamp message-edited", "Diedit"), footer.firstChild);
                }
            }
        });
    }

    function mulai() {
        pasang(boxPribadi, "pribadi");
        // chat grup dibangun belakangan oleh grup.js; tunggu sampai ada
        if (boxGrup) pasang(boxGrup, "grup");
        else {
            var tunggu = new MutationObserver(function () {
                var g = document.getElementById("ruang-messages");
                if (g) { tunggu.disconnect(); boxGrup = g; pasang(g, "grup"); }
            });
            tunggu.observe(document.body, { childList: true, subtree: true });
        }
        document.body.appendChild(menu);
        // ikon menu edit milik grup.js: PNG -> SVG
        var ganti = new MutationObserver(function () {
            var m = document.getElementById("menu-edit-pesan-grup") || document.getElementById("menu-edit-pesan");
            document.querySelectorAll(".message-context-menu img").forEach(function (im) { im.replaceWith(svg("edit")); });
            if (m) ganti.disconnect();
        });
        ganti.observe(document.body, { childList: true, subtree: true });
        document.querySelectorAll(".message-context-menu img").forEach(function (im) { im.replaceWith(svg("edit")); });
    }

    /* ---------- dialog teruskan: cuplikan pesan + avatar kontak ---------- */
    function hiasTeruskan() {
        var dialog = document.getElementById("dialog-teruskan-pesan");
        if (!dialog) return;
        var tutup = document.getElementById("btn-tutup-teruskan-pesan");
        if (tutup && !tutup.querySelector("svg")) tutup.replaceChildren(svg("tutup"));
        var daftar = document.getElementById("daftar-tujuan-teruskan");
        if (daftar) {
            var warna = [210, 280, 24, 160, 340, 45];
            new MutationObserver(function () {
                daftar.querySelectorAll(".forward-contact:not([data-ap])").forEach(function (baris) {
                    baris.dataset.ap = "1";
                    var nama = (baris.querySelector(".forward-contact-name") || {}).textContent || "?";
                    var jum = 0;
                    for (var i = 0; i < nama.length; i++) jum += nama.charCodeAt(i);
                    var av = el("span", "ap-avatar", nama.trim().charAt(0).toUpperCase());
                    av.style.setProperty("--ap-hue", String(warna[jum % warna.length]));
                    av.setAttribute("aria-hidden", "true");
                    baris.insertBefore(av, baris.querySelector(".forward-contact-details"));
                });
            }).observe(daftar, { childList: true });
        }
        var kakiTeman = dialog.querySelector(".forward-message-footer");
        if (kakiTeman) kakiTeman.addEventListener("click", function (e) {
            var k = document.getElementById("btn-konfirmasi-teruskan-pesan"), st = document.getElementById("status-daftar-tujuan");
            if (k && k.disabled && !k.hidden && (e.target === kakiTeman || e.target === k) && st) st.textContent = "Pilih dulu kontak tujuannya (centang di kanan nama).";
        });
        var asli = window.bukaDialogTeruskanPesan;
        if (typeof asli === "function" && !asli.__ap) {
            var bungkus = function (pesan, pemicu) {
                var r = asli.apply(this, arguments);
                try {
                    var lama = dialog.querySelector(".ap-cuplikan");
                    if (lama) lama.remove();
                    var teks = String((pesan && pesan.text) || "").trim();
                    var cup = el("blockquote", "ap-cuplikan");
                    cup.appendChild(svg("teruskan"));
                    cup.appendChild(el("span", "", teks ? (teks.length > 140 ? teks.slice(0, 140) + "…" : teks) : (pesan && (pesan.image || pesan.imageId) ? "Gambar" : "Pesan")));
                    var ins = document.getElementById("instruksi-teruskan-pesan");
                    if (ins) ins.after(cup);
                } catch (e) {}
                return r;
            };
            bungkus.__ap = true;
            window.bukaDialogTeruskanPesan = bungkus;
        }
    }

    /* reaksi emoji (chat-footer.js) merender ulang semua pesan dan melompat ke bawah: jaga posisi gulir */
    function jagaGulirReaksi() {
        var asli = window.toggleReaksiPesan;
        if (typeof asli !== "function" || asli.__ap) return;
        var bungkus = function () {
            var kotak = document.getElementById("box-list-pesan"), pos = kotak ? kotak.scrollTop : 0;
            var r = asli.apply(this, arguments);
            if (kotak) kotak.scrollTop = pos;
            return r;
        };
        bungkus.__ap = true;
        window.toggleReaksiPesan = bungkus;
    }

    function init() { mulai(); hiasTeruskan(); jagaGulirReaksi(); }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
})();
