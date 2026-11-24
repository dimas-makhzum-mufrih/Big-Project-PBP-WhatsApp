/**
 * NGUMPUL - Efek & latar hidup tema (dashboard saja, dimuat otomatis oleh theme.js)
 *  - latar hidup di belakang chat: Nebula/Stardust (paralaks berlapis), Lavender (ladang + serbuk sari), Sunflower (ladang bunga matahari),
 *    Lotus (kolam + riak), Rainy Window (kaca berembun bisa diusap), Deep Ocean, Campfire
 *  - efek saat pesan terkirim (bintang, riak, kelopak, kilat, konfeti, gelembung, percikan, air)
 *  - matahari Sunflower mengikuti jam, boot Terminal
 * Pengaturan dibaca dari atribut <html>:
 *   data-hiasan (penuh|ringan|polos), data-objek, data-efek, data-kecepatan, data-rapat, data-hujan
 * Tidak mengubah logika chat: pesan terkirim dikenali dari DOM daftar pesan.
 */
(function () {
    "use strict";

    var html = document.documentElement;
    var instansiKe = 0;

    function pasang(room, daftar, pertama) {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function attr(k, d) { return html.getAttribute("data-" + k) || d; }
    function def() { var T = window.NgumpulTheme; return T ? T.daftar[T.getTheme()] : null; }
    function acak(a, b) { return a + Math.random() * (b - a); }
    function pilih(a) { return a[Math.floor(Math.random() * a.length)]; }
    function mode() {
        var h = attr("hiasan", "penuh");
        if (h === "polos") return "polos";
        return (h === "ringan" || reduce) ? "ringan" : "penuh";
    }
    function kec() { var k = attr("kecepatan", "normal"); return k === "pelan" ? 0.5 : k === "cepat" ? 1.8 : 1; }
    function rapat() { var r = attr("rapat", "normal"); return r === "sedikit" ? 0.5 : r === "banyak" ? 1.8 : 1; }
    function objekTampil() { return attr("objek", "tampil") !== "sembunyi"; }
    function dpr() { return Math.min(window.devicePixelRatio || 1, 2); }
    function el(tag, cls, css) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (css) e.style.cssText = css;
        return e;
    }
    function svgEl(tag, a) {
        var e = document.createElementNS("http://www.w3.org/2000/svg", tag);
        for (var k in a) e.setAttribute(k, a[k]);
        return e;
    }
    function kanvas(host, W, H) {
        var c = el("canvas"), r = dpr();
        c.width = Math.round(W * r); c.height = Math.round(H * r);
        var x = c.getContext("2d");
        x.setTransform(r, 0, 0, r, 0, 0);
        host.appendChild(c);
        return { c: c, x: x };
    }

    // =====================================================================
    // Latar hidup
    // =====================================================================
    var latar = null;      // { host, kunci, update, destroy, resik }
    var kunciLatar = "";
    var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    var scrollY = 0;

    // ---- bintang berlapis (Nebula, Stardust) ----
    function bintangBerlapis(host, W, H, o) {
        var m = rapat();
        var warna = o.warna;
        var lapis = [];
        o.lapis.forEach(function (L) {
            var d = el("div", "lapis"); d.style.setProperty("--f", L.f);
            var b = el("div", "b");
            var n = Math.round(L.n * m * (W * H) / (900 * 600)), s = [], i;
            for (i = 0; i < n; i++) {
                s.push(acak(0, W + 140).toFixed(0) + "px " + acak(0, H + 140).toFixed(0) + "px 0 " + (L.r * acak(0, 0.6)).toFixed(1) + "px " + pilih(warna));
            }
            b.style.width = L.r + "px"; b.style.height = L.r + "px";
            b.style.boxShadow = s.join(",");
            b.style.setProperty("--t", acak(3, 7).toFixed(1) + "s");
            b.style.animationDelay = (-acak(0, 6)).toFixed(1) + "s";
            d.appendChild(b); host.appendChild(d); lapis.push(d);
        });
        if (o.sparkle && objekTampil()) {
            var d2 = el("div", "lapis"); d2.style.setProperty("--f", 30);
            for (var i = 0; i < Math.round(7 * m); i++) {
                var s = el("i", "b", "left:" + acak(5, 95).toFixed(0) + "%;top:" + acak(5, 95).toFixed(0) + "%;width:3px;height:3px;background:#e8c874;box-shadow:0 0 10px 3px rgba(232,200,116,.7)");
                s.style.setProperty("--t", acak(1.6, 3.4).toFixed(1) + "s");
                d2.appendChild(s);
            }
            host.appendChild(d2);
        }
        return {
            update: function (t) {
                // mouse (lerp) + hanyut pelan saat diam
                mouse.x += (mouse.tx - mouse.x) * 0.06;
                mouse.y += (mouse.ty - mouse.y) * 0.06;
                var k = kec(), dx = Math.sin(t / 5200 * k) * 0.35, dy = Math.cos(t / 6700 * k) * 0.25;
                room.style.setProperty("--px", (mouse.x + dx).toFixed(3));
                room.style.setProperty("--py", (mouse.y + dy).toFixed(3));
                room.style.setProperty("--sc", scrollY.toFixed(0));
            },
            diam: true
        };
    }

    function nebula(host, W, H) {
        var awan = el("div", "lapis"); awan.style.setProperty("--f", 5);
        awan.innerHTML = '<div class="awan" style="background:' +
            'radial-gradient(ellipse 30% 22% at 30% 30%,rgba(190,150,255,.22),transparent 70%),' +
            'radial-gradient(ellipse 26% 20% at 72% 62%,rgba(90,170,255,.2),transparent 70%),' +
            'radial-gradient(ellipse 20% 16% at 50% 88%,rgba(255,120,200,.14),transparent 70%)"></div>';
        host.appendChild(awan);
        return bintangBerlapis(host, W, H, {
            warna: ["#ffffff", "#cfe0ff", "#d9c8ff", "#fff4d6"],
            lapis: [{ f: 10, n: 70, r: 1 }, { f: 22, n: 34, r: 2 }, { f: 40, n: 14, r: 3 }]
        });
    }
    function stardust(host, W, H) {
        return bintangBerlapis(host, W, H, {
            warna: ["#e8c874", "#fff1c2", "#ffffff", "#c9a64a"],
            lapis: [{ f: 8, n: 55, r: 1 }, { f: 18, n: 26, r: 2 }],
            sparkle: true
        });
    }

    // ---- Lavender ----
    function lavender(host, W, H) {
        var m = rapat(), tinggi = 130;
        var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + tinggi, width: W, height: tinggi, preserveAspectRatio: "none" });
        var n = Math.round(W / 15 * m), i, j;
        var ungu = ["#8b6fcf", "#9d83dc", "#7a5cc0", "#b196ea"];
        // urut dari belakang (pendek) ke depan (tinggi)
        for (i = 0; i < n; i++) {
            var x = acak(0, W), h = acak(55, 120), lean = acak(-6, 6);
            var g = svgEl("g", { "class": "goyang" });
            g.style.transformOrigin = x.toFixed(0) + "px " + tinggi + "px";
            g.style.setProperty("--d", (-acak(0, 4)).toFixed(1) + "s");
            g.style.setProperty("--t", acak(3, 5.5).toFixed(1) + "s");
            var top = tinggi - h;
            g.appendChild(svgEl("path", { d: "M" + x + "," + tinggi + " Q" + (x + lean) + "," + (tinggi - h / 2) + " " + (x + lean) + "," + top, stroke: "#5f9a62", "stroke-width": 1.6, fill: "none" }));
            var c = pilih(ungu), nb = 7;
            for (j = 0; j < nb; j++) {
                var yy = top + j * 4.2, rr = 3.6 - j * 0.28;
                g.appendChild(svgEl("ellipse", { cx: x + lean + (j % 2 ? 1.4 : -1.4), cy: yy + 3, rx: Math.max(rr, 1.6), ry: 3.2, fill: c, opacity: 0.9 }));
            }
            svg.appendChild(g);
        }
        host.appendChild(svg);
        if (objekTampil()) {
            // serbuk sari: titik cahaya kecil yang melayang naik pelan dari ladang
            for (i = 0; i < Math.round(16 * m); i++) {
                var sb = el("i", "serbuk");
                sb.style.setProperty("--x", acak(3, 97).toFixed(0) + "%");
                sb.style.setProperty("--s", acak(2, 5).toFixed(1) + "px");
                sb.style.setProperty("--t", acak(11, 22).toFixed(0) + "s");
                sb.style.setProperty("--d", (-acak(0, 22)).toFixed(0) + "s");
                sb.style.setProperty("--dx", acak(-40, 40).toFixed(0) + "px");
                host.appendChild(sb);
            }
        }
        return null;
    }

    // ---- Sunflower (ladang bunga matahari, kepala condong ke arah matahari) ----
    var kepalaSurya = [];
    function arahSurya() {
        var m = parseFloat(room.style.getPropertyValue("--mt-x"));
        return isNaN(m) ? 70 : m;
    }
    function condongkan() {
        var sx = arahSurya();
        kepalaSurya.forEach(function (k) {
            var d = Math.max(-1, Math.min(1, (sx - k.px) / 55));
            k.g.setAttribute("transform", "rotate(" + (d * 16).toFixed(1) + " " + k.cx + " " + k.cy + ")");
        });
    }
    function bunMatahari(host, W, H) {
        kepalaSurya = [];
        if (!objekTampil()) return null;
        var m = rapat(), tinggi = 210, i, j, k;
        var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + tinggi, width: W, height: tinggi, preserveAspectRatio: "none" });
        var uid = "sf" + (++instansiKe);
        var defs = svgEl("defs", {});
        var rg = svgEl("radialGradient", { id: uid });
        rg.appendChild(svgEl("stop", { offset: "0", "stop-color": "#3a2108" }));
        rg.appendChild(svgEl("stop", { offset: "0.7", "stop-color": "#6a3f10" }));
        rg.appendChild(svgEl("stop", { offset: "1", "stop-color": "#8a5618" }));
        defs.appendChild(rg); svg.appendChild(defs);
        var n = Math.max(7, Math.round(W / 52 * m));
        var daftarB = [];
        for (i = 0; i < n; i++) daftarB.push({ x: Math.min(W - 10, Math.max(10, (i + acak(0.1, 0.9)) * W / n)), d: Math.random() });
        daftarB.sort(function (a, b) { return a.d - b.d; });   // belakang (kecil) dulu

        function petal(cx, cy, r0, r1, w, jumlah, geser) {
            var d = "";
            for (var q = 0; q < jumlah; q++) {
                var a = q * 6.2832 / jumlah + geser, c = Math.cos(a), sn = Math.sin(a);
                var bx = cx + c * r0, by = cy + sn * r0, tx = cx + c * r1, ty = cy + sn * r1;
                var mx = (bx + tx) / 2, my = (by + ty) / 2, px = -sn * w, py = c * w;
                d += "M" + bx.toFixed(1) + "," + by.toFixed(1) + " Q" + (mx + px).toFixed(1) + "," + (my + py).toFixed(1) + " " + tx.toFixed(1) + "," + ty.toFixed(1) +
                    " Q" + (mx - px).toFixed(1) + "," + (my - py).toFixed(1) + " " + bx.toFixed(1) + "," + by.toFixed(1) + "Z ";
            }
            return d;
        }
        daftarB.forEach(function (b) {
            var sk = 0.55 + b.d * 0.65, x = b.x, h = (66 + b.d * 84 + acak(0, 24)), lean = acak(-7, 7);
            var cx = x + lean, cy = tinggi - h, R = 18 * sk;
            var g = svgEl("g", { "class": "goyang" });
            g.style.transformOrigin = x.toFixed(0) + "px " + tinggi + "px";
            g.style.setProperty("--d", (-acak(0, 4)).toFixed(1) + "s");
            g.style.setProperty("--t", acak(3.4, 6) .toFixed(1) + "s");
            g.style.opacity = (0.82 + b.d * 0.18).toFixed(2);
            var hijau = b.d > 0.5 ? "#4f9238" : "#5aa043";
            g.appendChild(svgEl("path", { d: "M" + x + "," + tinggi + " Q" + (x + lean * 0.3) + "," + (tinggi - h * 0.55) + " " + cx + "," + cy, stroke: hijau, "stroke-width": (2.6 * sk).toFixed(1), fill: "none", "stroke-linecap": "round" }));
            // daun
            var ly = tinggi - h * 0.42, ls = 15 * sk;
            g.appendChild(svgEl("path", { d: "M" + (x + lean * 0.2) + "," + ly + " q" + (-ls * 1.5) + "," + (-ls * 0.9) + " " + (-ls * 2) + "," + (ls * 0.2) + " q" + (ls * 1.2) + "," + (ls * 0.7) + " " + (ls * 2) + "," + (-ls * 0.2) + "z", fill: "#6cb04a" }));
            g.appendChild(svgEl("path", { d: "M" + (x + lean * 0.35) + "," + (ly - ls * 0.9) + " q" + (ls * 1.5) + "," + (-ls * 0.9) + " " + (ls * 2) + "," + (ls * 0.2) + " q" + (-ls * 1.2) + "," + (ls * 0.7) + " " + (-ls * 2) + "," + (-ls * 0.2) + "z", fill: "#5da53f" }));
            // kepala
            var kg = svgEl("g", {});
            kg.appendChild(svgEl("path", { d: petal(cx, cy, R * 0.55, R * 1.45, R * 0.34, 18, 0.1), fill: "#ee9d00" }));
            kg.appendChild(svgEl("path", { d: petal(cx, cy, R * 0.5, R * 1.28, R * 0.32, 18, 0.1 + 0.17), fill: "#ffc81a" }));
            kg.appendChild(svgEl("circle", { cx: cx, cy: cy, r: R * 0.62, fill: "url(#" + uid + ")" }));
            var biji = "";
            for (k = 1; k <= 14; k++) {
                var rr = R * 0.5 * Math.sqrt(k / 14), th = k * 2.39996;
                biji += "M" + (cx + Math.cos(th) * rr - 0.9).toFixed(1) + "," + (cy + Math.sin(th) * rr).toFixed(1) + " a0.9,0.9 0 1,0 1.8,0 a0.9,0.9 0 1,0 -1.8,0 ";
            }
            kg.appendChild(svgEl("path", { d: biji, fill: "#2a1606", opacity: 0.75 }));
            g.appendChild(kg);
            svg.appendChild(g);
            kepalaSurya.push({ g: kg, px: x / W * 100, cx: cx, cy: cy });
        });
        host.appendChild(svg);
        // serbuk sari
        for (j = 0; j < Math.round(12 * m); j++) {
            var sb = el("i", "serbuk kuning");
            sb.style.setProperty("--x", acak(3, 97).toFixed(0) + "%");
            sb.style.setProperty("--s", acak(2, 4.5).toFixed(1) + "px");
            sb.style.setProperty("--t", acak(12, 24).toFixed(0) + "s");
            sb.style.setProperty("--d", (-acak(0, 24)).toFixed(0) + "s");
            sb.style.setProperty("--dx", acak(-40, 40).toFixed(0) + "px");
            host.appendChild(sb);
        }
        condongkan();
        return null;
    }

    // ---- Lotus Pond (kanvas) ----
    var lotusApi = null;
    function lotus(host, W, H) {
        var C = kanvas(host, W, H), x = C.x;
        var m = rapat();
        var ripples = [], drops = [], pads = [], flowers = [], i;

        function posBubble(b) {
            var rr = room.getBoundingClientRect(), br = b.getBoundingClientRect();
            return { x: br.left - rr.left + br.width * acak(0.2, 0.8), y: br.bottom - rr.top + 4, atas: br.top - rr.top };
        }
        function riak(px, py, maks, tunda) {
            ripples.push({ x: px, y: py, r: 2, max: maks || acak(40, 80), t: tunda || 0 });
        }
        function jatuhkan(b) {
            var p = posBubble(b);
            if (p.y < 0 || p.y > H + 20) return;
            drops.push({ x: p.x, y: Math.max(-10, p.y - 150), ty: p.y, v: 0 });
        }
        lotusApi = { jatuh: jatuhkan };

        if (objekTampil()) {
            var np = Math.round(5 * m);
            for (i = 0; i < np; i++) {
                var sisi = i % 2 ? acak(0.04, 0.22) : acak(0.78, 0.96);
                pads.push({ x: W * sisi, y: H * acak(0.6, 0.94), rx: acak(26, 44), rot: acak(0, 6.28), ph: acak(0, 6.28) });
            }
            for (i = 0; i < Math.min(3, np); i++) flowers.push({ pad: pads[i], s: acak(0.8, 1.15), c: pilih(["#ff9dc4", "#ffc2dc", "#fff0f6"]) });
        }

        function daun(p, t) {
            var bob = Math.sin(t / 1600 + p.ph) * 1.2;
            x.save(); x.translate(p.x, p.y + bob); x.rotate(p.rot); x.scale(1, 0.42);
            var g = x.createRadialGradient(0, 0, 2, 0, 0, p.rx);
            g.addColorStop(0, "#7fc77a"); g.addColorStop(1, "#4a9a62");
            x.fillStyle = g; x.beginPath(); x.arc(0, 0, p.rx, 0.22, Math.PI * 2 - 0.22); x.lineTo(0, 0); x.closePath(); x.fill();
            x.strokeStyle = "rgba(255,255,255,.35)"; x.lineWidth = 1.2; x.stroke();
            x.restore();
        }
        function bunga(f, t) {
            var p = f.pad, bob = Math.sin(t / 1600 + p.ph) * 1.2;
            x.save(); x.translate(p.x, p.y + bob - 6); x.scale(f.s, f.s);
            for (var k = 0; k < 9; k++) {
                x.save(); x.rotate((k - 4) * 0.34);
                x.fillStyle = f.c; x.globalAlpha = 0.92;
                x.beginPath(); x.ellipse(0, -11, 5, 13, 0, 0, Math.PI * 2); x.fill();
                x.strokeStyle = "rgba(255,255,255,.7)"; x.lineWidth = 0.8; x.stroke();
                x.restore();
            }
            x.globalAlpha = 1; x.fillStyle = "#ffe27a"; x.beginPath(); x.arc(0, -4, 4, 0, 6.3); x.fill();
            x.restore();
        }
        var ambien = 0;
        return {
            update: function (t, dt, diam) {
                var sp = kec();
                x.clearRect(0, 0, W, H);
                // cahaya kaustik
                x.lineWidth = 1.4;
                for (i = 0; i < 6; i++) {
                    x.strokeStyle = "rgba(255,255,255," + (0.07 + 0.03 * Math.sin(t / 1800 + i)) + ")";
                    x.beginPath();
                    for (var px = 0; px <= W; px += 24) {
                        var py = H * (0.14 + i * 0.15) + Math.sin(px / 70 + t / (1400 / sp) + i * 1.7) * 9 + Math.sin(px / 33 - t / (900 / sp)) * 3;
                        if (px === 0) x.moveTo(px, py); else x.lineTo(px, py);
                    }
                    x.stroke();
                }
                pads.forEach(function (p) { daun(p, t); });
                flowers.forEach(function (f) { bunga(f, t); });

                if (!diam) {
                    // riak ambien di bawah bubble yang terlihat
                    ambien -= dt;
                    if (ambien <= 0) {
                        ambien = acak(1.4, 3.2) / sp;
                        var bs = room.querySelectorAll(".chat-bubble");
                        if (bs.length) {
                            var p = posBubble(pilih(Array.prototype.slice.call(bs)));
                            if (p.y > 0 && p.y < H) riak(p.x, p.y, acak(30, 60));
                        }
                    }
                }
                // tetes jatuh
                for (i = drops.length - 1; i >= 0; i--) {
                    var d = drops[i]; d.v += 900 * dt; d.y += d.v * dt;
                    if (d.y >= d.ty) { riak(d.x, d.ty, 70); riak(d.x, d.ty, 48, 0.12); riak(d.x, d.ty, 30, 0.24); drops.splice(i, 1); continue; }
                    x.fillStyle = "rgba(255,255,255,.85)"; x.beginPath(); x.ellipse(d.x, d.y, 2.2, 4, 0, 0, 6.3); x.fill();
                }
                // riak
                for (i = ripples.length - 1; i >= 0; i--) {
                    var r = ripples[i];
                    if (r.t > 0) { r.t -= dt; continue; }
                    r.r += 38 * dt * sp;
                    var a = 1 - r.r / r.max;
                    if (a <= 0) { ripples.splice(i, 1); continue; }
                    x.strokeStyle = "rgba(255,255,255," + (a * 0.7).toFixed(2) + ")"; x.lineWidth = 1.6;
                    x.beginPath(); x.ellipse(r.x, r.y, r.r, r.r * 0.36, 0, 0, 6.3); x.stroke();
                }
            },
            resik: function () { lotusApi = null; }
        };
    }

    // ---- Rainy Window (kaca berembun: tetes menyatu & meluncur, hujan di balik kaca, kilat, bisa diusap) ----
    function hujan(host, W, H) {
        var F = kanvas(host, W, H), D = kanvas(host, W, H);
        var fx = F.x, dx = D.x, level = attr("hujan", "gerimis");
        var deras = level === "deras", hidup = level !== "mati";
        var statis = [], gelincir = [], garis = [], i;
        var BOKEH = ["255,190,90", "90,200,255", "255,90,170", "255,230,140", "120,255,200"];
        var kilatEl = el("div", "kilat-hujan");
        host.appendChild(kilatEl);

        function kabut() {
            var g = fx.createLinearGradient(0, 0, 0, H);
            g.addColorStop(0, "rgba(160,184,208,.30)"); g.addColorStop(1, "rgba(176,199,219,.58)");
            fx.globalCompositeOperation = "source-over"; fx.fillStyle = g; fx.fillRect(0, 0, W, H);
        }
        kabut();
        function tetesBaru(px, py, r) { return { x: px, y: py, r: r, c: BOKEH[Math.floor(Math.random() * BOKEH.length)] }; }
        var n0 = Math.min(240, Math.round(W * H / 3600 * rapat()));
        for (i = 0; i < n0; i++) statis.push(tetesBaru(acak(0, W), acak(0, H), 1.1 + Math.pow(Math.random(), 2.1) * 5.4));
        var nGaris = hidup ? Math.round((deras ? 90 : 30) * rapat()) : 0;
        for (i = 0; i < nGaris; i++) garis.push({ x: acak(-40, W), y: acak(0, H), v: acak(900, 1500), p: acak(20, 52), a: acak(0.1, 0.3) });

        // satu tetes kaca: bayangan, badan bening, pantulan lampu kota di tepi bawah, kilau
        function gambar(d, melar) {
            var r = d.r, ry = r * (melar || 1.0);
            dx.fillStyle = "rgba(0,0,0,.16)"; dx.beginPath(); dx.ellipse(d.x, d.y + r * 0.35, r * 1.05, ry * 1.05, 0, 0, 6.3); dx.fill();
            var g = dx.createRadialGradient(d.x - r * 0.25, d.y - ry * 0.35, r * 0.1, d.x, d.y, ry * 1.1);
            g.addColorStop(0, "rgba(235,246,255,.34)"); g.addColorStop(0.7, "rgba(200,225,245,.16)"); g.addColorStop(1, "rgba(150,185,215,.3)");
            dx.fillStyle = g; dx.beginPath(); dx.ellipse(d.x, d.y, r, ry, 0, 0, 6.3); dx.fill();
            dx.strokeStyle = "rgba(255,255,255,.32)"; dx.lineWidth = 0.8; dx.stroke();
            if (r > 2) {
                dx.fillStyle = "rgba(" + d.c + ",.42)"; dx.beginPath(); dx.ellipse(d.x + r * 0.1, d.y + ry * 0.45, r * 0.5, ry * 0.26, 0, 0, 6.3); dx.fill();
            }
            dx.fillStyle = "rgba(255,255,255,.88)"; dx.beginPath(); dx.arc(d.x - r * 0.3, d.y - ry * 0.4, Math.max(0.6, r * 0.2), 0, 6.3); dx.fill();
        }

        function usap(px, py, r) {
            fx.globalCompositeOperation = "destination-out";
            var g = fx.createRadialGradient(px, py, 0, px, py, r);
            g.addColorStop(0, "rgba(0,0,0,.95)"); g.addColorStop(1, "rgba(0,0,0,0)");
            fx.fillStyle = g; fx.beginPath(); fx.arc(px, py, r, 0, 6.3); fx.fill();
            fx.globalCompositeOperation = "source-over";
        }
        function onMove(e) {
            var rr = room.getBoundingClientRect();
            usap(e.clientX - rr.left, e.clientY - rr.top, 28);
        }
        if (mode() === "penuh") room.addEventListener("pointermove", onMove, { passive: true });

        var regrow = 0, tKilat = acak(7, 16), tKilatHapus = null;
        function luncurkan() {
            gelincir.push({ x: acak(0, W), y: acak(-10, H * 0.45), r: deras ? acak(3, 5.4) : acak(2.4, 4.2), v: 0, tunggu: acak(0.1, 1.6), c: BOKEH[Math.floor(Math.random() * BOKEH.length)], jejak: 0 });
        }
        return {
            update: function (t, dt, diam) {
                var sp = kec(), a, d, k;
                dx.clearRect(0, 0, W, H);
                if (!diam && hidup) {
                    // embun tumbuh kembali pelan
                    regrow -= dt;
                    if (regrow <= 0) { regrow = 0.8; fx.fillStyle = "rgba(170,192,212,.025)"; fx.fillRect(0, 0, W, H); }
                    if (Math.random() < (deras ? 0.32 : 0.06) * sp && gelincir.length < (deras ? 38 : 12)) luncurkan();
                    // kilat (deras saja)
                    if (deras) {
                        tKilat -= dt;
                        if (tKilat <= 0) {
                            tKilat = acak(9, 22);
                            kilatEl.classList.remove("nyala"); void kilatEl.offsetWidth; kilatEl.classList.add("nyala");
                        }
                    }
                }
                // hujan di balik kaca
                if (nGaris) {
                    dx.lineWidth = 1; dx.lineCap = "round";
                    for (i = 0; i < garis.length; i++) {
                        a = garis[i];
                        if (!diam) { a.y += a.v * dt * sp; a.x -= a.v * dt * sp * 0.18; if (a.y > H + 40) { a.y = -40; a.x = acak(0, W + 80); } }
                        dx.strokeStyle = "rgba(205,228,250," + a.a.toFixed(2) + ")";
                        dx.beginPath(); dx.moveTo(a.x, a.y); dx.lineTo(a.x + a.p * 0.18, a.y - a.p); dx.stroke();
                    }
                }
                // tetes diam
                for (i = 0; i < statis.length; i++) gambar(statis[i]);
                // tetes meluncur: menyerap tetes diam, meninggalkan jejak bersih + titik kecil
                for (i = gelincir.length - 1; i >= 0; i--) {
                    d = gelincir[i];
                    if (!diam) {
                        if (d.tunggu > 0) d.tunggu -= dt;
                        else {
                            d.v = Math.min(d.v + (Math.random() < 0.1 ? acak(90, 300) : -40) * dt * 6, (deras ? 460 : 330) * sp);
                            if (d.v < 10) { d.v = 0; d.tunggu = acak(0.1, 1.1); }
                            var oy = d.y; d.y += d.v * dt * sp;
                            fx.globalCompositeOperation = "destination-out"; fx.strokeStyle = "rgba(0,0,0,.6)"; fx.lineWidth = d.r * 1.35; fx.lineCap = "round";
                            fx.beginPath(); fx.moveTo(d.x, oy); fx.lineTo(d.x, d.y); fx.stroke(); fx.globalCompositeOperation = "source-over";
                            d.jejak += d.y - oy;
                            if (d.jejak > 22 && d.r > 2.4) {
                                d.jejak = 0; d.r *= 0.985;
                                if (statis.length < n0 + 260) statis.push(tetesBaru(d.x + acak(-1, 1), d.y - d.r * 1.8, acak(0.7, 1.5)));
                            }
                            for (k = statis.length - 1; k >= 0; k--) {
                                var s = statis[k], jx = s.x - d.x, jy = s.y - d.y;
                                if (jx * jx + jy * jy < (d.r + s.r) * (d.r + s.r) * 0.8) {
                                    d.r = Math.min(7.5, Math.sqrt(d.r * d.r + s.r * s.r * 0.7)); statis.splice(k, 1);
                                }
                            }
                        }
                    }
                    if (d.y > H + 12) {
                        gelincir.splice(i, 1);
                        if (statis.length < n0 + 260) statis.push(tetesBaru(acak(0, W), acak(0, H * 0.4), 1 + Math.pow(Math.random(), 2.4) * 3));
                        continue;
                    }
                    gambar(d, 1.45);
                }
            },
            resik: function () { room.removeEventListener("pointermove", onMove); }
        };
    }

    // ---- Deep Ocean ----
    function laut(host, W, H) {
        var m = rapat(), i;
        host.appendChild(el("div", "sinar"));
        for (i = 0; i < Math.round(16 * m); i++) {
            var g = el("div", "gel");
            g.style.setProperty("--x", acak(2, 98).toFixed(0) + "%");
            g.style.setProperty("--s", acak(5, 18).toFixed(0) + "px");
            g.style.setProperty("--t", acak(9, 18).toFixed(0) + "s");
            g.style.setProperty("--d", (-acak(0, 18)).toFixed(0) + "s");
            g.style.setProperty("--dx", acak(-30, 30).toFixed(0) + "px");
            host.appendChild(g);
        }
        if (objekTampil()) {
            // plankton bercahaya: titik kecil yang hanyut pelan di arus
            for (i = 0; i < Math.round(22 * m); i++) {
                var pl = el("i", "plankton");
                pl.style.setProperty("--x", acak(2, 98).toFixed(0) + "%");
                pl.style.setProperty("--y", acak(8, 92).toFixed(0) + "%");
                pl.style.setProperty("--s", acak(2, 4.5).toFixed(1) + "px");
                pl.style.setProperty("--t", acak(7, 15).toFixed(0) + "s");
                pl.style.setProperty("--d", (-acak(0, 15)).toFixed(0) + "s");
                pl.style.setProperty("--dx", acak(-50, 50).toFixed(0) + "px");
                host.appendChild(pl);
            }
        }
        return null;
    }

    // ---- Campfire ----
    function api(host, W, H) {
        if (!objekTampil()) return null;
        for (var i = 0; i < Math.round(26 * rapat()); i++) {
            var b = el("div", "bara");
            b.style.setProperty("--x", acak(15, 85).toFixed(0) + "%");
            b.style.setProperty("--s", acak(3, 7).toFixed(0) + "px");
            b.style.setProperty("--t", acak(5, 11).toFixed(1) + "s");
            b.style.setProperty("--d", (-acak(0, 11)).toFixed(1) + "s");
            b.style.setProperty("--dx", acak(-90, 90).toFixed(0) + "px");
            host.appendChild(b);
        }
        return null;
    }

    var PEMBANGUN = { nebula: nebula, stardust: stardust, lavender: lavender, sunflower: bunMatahari, lotus: lotus, hujan: hujan, laut: laut, api: api };

    function hentikan() {
        if (latar) {
            if (latar.obj && latar.obj.resik) latar.obj.resik();
            if (latar.host.parentNode) latar.host.parentNode.removeChild(latar.host);
        }
        latar = null; lotusApi = null;
        room.style.removeProperty("--px"); room.style.removeProperty("--py"); room.style.removeProperty("--sc");
    }

    function sinkron() {
        var d = def();
        var jenis = d && d.latar, md = mode();
        var W = room.clientWidth, H = room.clientHeight;
        var kunci = [jenis, md, attr("objek"), attr("rapat"), attr("hujan"), Math.round(W / 40), Math.round(H / 40)].join("|");
        if (kunci === kunciLatar) return;
        kunciLatar = kunci;
        hentikan();
        if (!jenis || md === "polos" || !PEMBANGUN[jenis] || W < 50 || H < 50) return;
        var host = el("div", "latar-hidup");
        host.setAttribute("data-jenis", jenis);
        host.setAttribute("aria-hidden", "true");
        room.insertBefore(host, room.firstChild);
        var obj = PEMBANGUN[jenis](host, W, H) || null;
        latar = { host: host, obj: obj };
        if (obj && md === "ringan") obj.update(0, 0, true);   // satu frame diam
    }

    // satu loop rAF untuk semua latar
    var tLalu = 0;
    function tick(t) {
        requestAnimationFrame(tick);
        if (document.hidden || !latar || !latar.obj || mode() !== "penuh") { tLalu = t; return; }
        var dt = Math.min(0.05, (t - tLalu) / 1000); tLalu = t;
        latar.obj.update(t, dt, false);
    }
    requestAnimationFrame(tick);

    new MutationObserver(sinkron).observe(html, { attributes: true, attributeFilter: ["data-theme", "data-hiasan", "data-objek", "data-rapat", "data-hujan"] });
    if (window.ResizeObserver) { var rt; new ResizeObserver(function () { clearTimeout(rt); rt = setTimeout(sinkron, 200); }).observe(room); }
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(sinkron, 200); });
    sinkron();
    setTimeout(sinkron, 400);   // ukuran ruang bisa baru stabil setelah render awal

    // paralaks: kursor + gulir
    document.addEventListener("mousemove", function (e) {
        if (!latar || latar.host.getAttribute("data-jenis").search(/nebula|stardust/) < 0) return;
        mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
    room.addEventListener("scroll", function (e) {
        var t = e.target;
        if (t && typeof t.scrollTop === "number") scrollY = t.scrollTop;
    }, true);

    // =====================================================================
    // Efek kirim
    // =====================================================================
    function buatEfek(jenis, baris) {
        var w = el("div", "efek-kirim");
        w.setAttribute("aria-hidden", "true");
        var i, e;

        if (jenis === "air") {
            if (lotusApi) { var b = baris && baris.querySelector(".chat-bubble"); if (b) lotusApi.jatuh(b); }
            return;
        } else if (jenis === "bintang") {
            for (i = 0; i < 3; i++) {
                e = el("i", "bintang");
                e.style.setProperty("--x", acak(45, 92).toFixed(0) + "%");
                e.style.setProperty("--y", acak(2, 28).toFixed(0) + "%");
                e.style.setProperty("--len", acak(90, 150).toFixed(0) + "px");
                e.style.setProperty("--dur", acak(0.8, 1.2).toFixed(2) + "s");
                e.style.setProperty("--d", (i * 0.18).toFixed(2) + "s");
                w.appendChild(e);
            }
        } else if (jenis === "riak") {
            for (i = 0; i < 3; i++) { e = el("i", "riak"); e.style.setProperty("--d", (i * 0.28) + "s"); w.appendChild(e); }
        } else if (jenis === "kelopak") {
            for (i = 0; i < 12; i++) {
                e = el("i", "kelopak");
                e.style.setProperty("--x", acak(5, 95).toFixed(0) + "%");
                e.style.setProperty("--dx", acak(-60, 60).toFixed(0) + "px");
                e.style.setProperty("--r", acak(180, 540).toFixed(0) + "deg");
                e.style.setProperty("--d", acak(0, 0.7).toFixed(2) + "s"); w.appendChild(e);
            }
        } else if (jenis === "kilat") {
            w.appendChild(el("i", "kilat"));
        } else if (jenis === "konfeti") {
            for (i = 0; i < 18; i++) {
                e = el("i", "konfeti");
                e.style.setProperty("--dx", acak(-260, -20).toFixed(0) + "px");
                e.style.setProperty("--dy", acak(-280, -40).toFixed(0) + "px");
                e.style.setProperty("--r", acak(-300, 300).toFixed(0) + "deg"); w.appendChild(e);
            }
        } else if (jenis === "gelembung") {
            for (i = 0; i < 9; i++) {
                e = el("i", "gel-efek");
                e.style.setProperty("--s", acak(6, 20).toFixed(0) + "px");
                e.style.setProperty("--dx", acak(-70, 30).toFixed(0) + "px");
                e.style.setProperty("--d", acak(0, 0.5).toFixed(2) + "s"); w.appendChild(e);
            }
        } else if (jenis === "percikan") {
            for (i = 0; i < 16; i++) {
                e = el("i", "percik");
                e.style.setProperty("--dx", acak(-140, 30).toFixed(0) + "px");
                e.style.setProperty("--dy", acak(-250, -60).toFixed(0) + "px");
                e.style.animationDelay = acak(0, 0.2).toFixed(2) + "s"; w.appendChild(e);
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
            var baris = daftar.querySelectorAll(".message-row, .grup-pesan-baris");
            var n = baris.length, akhir = baris[n - 1];
            if (sebelumnya > 0 && n === sebelumnya + 1 && akhir) {
                var d = def();
                if (d && mode() === "penuh" && attr("efek", "nyala") !== "mati" && room.clientWidth > 0) {
                    // lotus: semua pesan baru (kirim & terima) jatuh ke air
                    if (d.efek === "air") buatEfek("air", akhir);
                    else if (d.efek && (akhir.classList.contains("kirim") || akhir.classList.contains("sendiri"))) buatEfek(d.efek, akhir);
                }
            }
            sebelumnya = n;
        }).observe(daftar, { childList: true });
    }

    // ---------- Sunflower: matahari sederhana mengikuti jam ----------
    function posisiMatahari() {
        var d = new Date(), jam = d.getHours() + d.getMinutes() / 60;
        var t = (jam - 6) / 12, x, y;
        if (t < 0 || t > 1) { x = 50; y = 125; }
        else { x = 10 + 80 * t; y = 60 - 52 * Math.sin(Math.PI * t); }
        room.style.setProperty("--mt-x", x.toFixed(1) + "%");
        room.style.setProperty("--mt-y", y.toFixed(1) + "%");
    }
    posisiMatahari();
    setInterval(function () { posisiMatahari(); condongkan(); }, 60000);

    // ---------- boot Terminal ----------
    var temaTerakhir = html.getAttribute("data-theme");
    if (!pertama) return;
    document.addEventListener("ngumpul:tema-berubah", function (e) {
        var t = e.detail && e.detail.tema;
        if (t === "terminal" && temaTerakhir !== "terminal" && mode() === "penuh") {
            html.classList.remove("efek-boot");
            void html.offsetWidth;
            html.classList.add("efek-boot");
            setTimeout(function () { html.classList.remove("efek-boot"); }, 1000);
        }
        temaTerakhir = t;
    });
    }

    var kamar = [["panel-chat-aktif", "box-list-pesan"], ["ruang-channel-grup", "ruang-messages"], ["ruang-call", null]];
    kamar.forEach(function (k, n) {
        var r = document.getElementById(k[0]);
        if (r) pasang(r, document.getElementById(k[1]), n === 0);
    });
})();
