/**
 * NGUMPUL - Efek & latar hidup tema (dashboard saja, dimuat otomatis oleh theme.js)
 *  - latar hidup di belakang chat: Nebula/Stardust (paralaks berlapis), Lavender (ladang + kupu-kupu),
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
            var w = ["#f0a6d8", "#ffd27a", "#9fd0ff"];
            for (i = 0; i < Math.max(2, Math.round(3 * m)); i++) {
                var k = el("div", "kupu");
                k.style.setProperty("--y", acak(15, 60).toFixed(0) + "%");
                k.style.setProperty("--w", w[i % w.length]);
                k.style.setProperty("--t", acak(24, 38).toFixed(0) + "s");
                k.style.setProperty("--d", (-acak(0, 30)).toFixed(0) + "s");
                k.appendChild(el("i")); k.appendChild(el("i"));
                host.appendChild(k);
            }
        }
        return null;
    }

    // ---- Lotus Pond (kanvas) ----
    var lotusApi = null;
    function lotus(host, W, H) {
        var C = kanvas(host, W, H), x = C.x;
        var m = rapat();
        var ripples = [], drops = [], pads = [], flowers = [], koi = [], i;

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
            koi = [{ ph: 0, c: "#ff8a3d", b: 1.0 }, { ph: 3.4, c: "#ffd9b0", b: 0.85 }];
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
        function ikan(k, t) {
            var a = t * 0.00017 + k.ph, b = t * 0.00023 + k.ph * 1.7;
            var px = W * (0.5 + 0.42 * Math.sin(a)), py = H * (0.62 + 0.28 * Math.sin(b));
            var dx = Math.cos(a) * 0.42 * W * 0.00017, dy = Math.cos(b) * 0.28 * H * 0.00023;
            var ang = Math.atan2(dy, dx), wig = Math.sin(t / 220 + k.ph) * 0.35;
            x.save(); x.translate(px, py); x.rotate(ang); x.globalAlpha = 0.7;
            x.fillStyle = k.c;
            x.beginPath(); x.ellipse(0, 0, 18 * k.b, 6 * k.b, 0, 0, 6.3); x.fill();
            x.save(); x.translate(-17 * k.b, 0); x.rotate(wig);
            x.beginPath(); x.moveTo(2, 0); x.lineTo(-12 * k.b, -6 * k.b); x.lineTo(-12 * k.b, 6 * k.b); x.closePath(); x.fill(); x.restore();
            x.fillStyle = "rgba(255,255,255,.75)"; x.beginPath(); x.ellipse(3, 0, 6 * k.b, 3 * k.b, 0, 0, 6.3); x.fill();
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
                koi.forEach(function (k) { ikan(k, t); });
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

    // ---- Rainy Window (kabut + tetes, bisa diusap) ----
    function hujan(host, W, H) {
        var F = kanvas(host, W, H), D = kanvas(host, W, H);
        var fx = F.x, dx = D.x, level = attr("hujan", "gerimis");
        var beads = [], tetes = [], i;
        function kabut() { fx.globalCompositeOperation = "source-over"; fx.fillStyle = "rgba(170,192,212,.42)"; fx.fillRect(0, 0, W, H); }
        kabut();
        for (i = 0; i < Math.round(55 * rapat()); i++) beads.push({ x: acak(0, W), y: acak(0, H), r: acak(1.2, 3) });

        function usap(px, py, r) {
            fx.globalCompositeOperation = "destination-out";
            var g = fx.createRadialGradient(px, py, 0, px, py, r);
            g.addColorStop(0, "rgba(0,0,0,.95)"); g.addColorStop(1, "rgba(0,0,0,0)");
            fx.fillStyle = g; fx.beginPath(); fx.arc(px, py, r, 0, 6.3); fx.fill();
            fx.globalCompositeOperation = "source-over";
        }
        function onMove(e) {
            var rr = room.getBoundingClientRect();
            usap(e.clientX - rr.left, e.clientY - rr.top, 26);
        }
        if (mode() === "penuh") room.addEventListener("pointermove", onMove, { passive: true });

        var regrow = 0;
        function tetes1(big) {
            tetes.push({ x: acak(0, W), y: acak(-10, H * 0.5), r: big ? acak(3.2, 5.2) : acak(2, 3.4), v: 0, tunggu: acak(0.2, 1.8) });
        }
        return {
            update: function (t, dt, diam) {
                var sp = kec();
                dx.clearRect(0, 0, W, H);
                // tumbuh kembali embun
                regrow -= dt;
                if (regrow <= 0 && !diam) { regrow = 0.8; fx.fillStyle = "rgba(170,192,212,.02)"; fx.fillRect(0, 0, W, H); }
                var laju = level === "deras" ? 0.5 : level === "gerimis" ? 0.1 : 0;
                if (!diam && Math.random() < laju * sp && tetes.length < 70) tetes1(level === "deras");
                beads.forEach(function (b) {
                    dx.fillStyle = "rgba(210,230,250,.3)"; dx.beginPath(); dx.arc(b.x, b.y, b.r, 0, 6.3); dx.fill();
                    dx.fillStyle = "rgba(255,255,255,.65)"; dx.beginPath(); dx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.35, 0, 6.3); dx.fill();
                });
                for (i = tetes.length - 1; i >= 0; i--) {
                    var d = tetes[i];
                    if (!diam) {
                        if (d.tunggu > 0) d.tunggu -= dt;
                        else {
                            d.v = Math.min(d.v + (Math.random() < 0.08 ? acak(80, 260) : -30) * dt, 340 * sp);
                            if (d.v < 8) { d.v = 0; d.tunggu = acak(0.1, 1.2); }
                            var oy = d.y; d.y += d.v * dt * sp;
                            // jejak: usap kabut tipis
                            fx.globalCompositeOperation = "destination-out"; fx.strokeStyle = "rgba(0,0,0,.55)"; fx.lineWidth = d.r * 1.3; fx.lineCap = "round";
                            fx.beginPath(); fx.moveTo(d.x, oy); fx.lineTo(d.x, d.y); fx.stroke(); fx.globalCompositeOperation = "source-over";
                        }
                    }
                    if (d.y > H + 10) { tetes.splice(i, 1); continue; }
                    dx.fillStyle = "rgba(215,235,255,.35)"; dx.beginPath(); dx.ellipse(d.x, d.y, d.r * 0.85, d.r * 1.25, 0, 0, 6.3); dx.fill();
                    dx.strokeStyle = "rgba(255,255,255,.5)"; dx.lineWidth = 1; dx.stroke();
                    dx.fillStyle = "rgba(255,255,255,.8)"; dx.beginPath(); dx.arc(d.x - d.r * 0.25, d.y - d.r * 0.4, d.r * 0.3, 0, 6.3); dx.fill();
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
            for (i = 0; i < Math.max(1, Math.round(2 * m)); i++) {
                var u = el("div", "ubur");
                u.style.setProperty("--x", acak(8, 88).toFixed(0) + "%");
                u.style.setProperty("--y", acak(30, 75).toFixed(0) + "%");
                u.style.setProperty("--t", acak(8, 13).toFixed(0) + "s");
                host.appendChild(u);
            }
            for (i = 0; i < Math.round(4 * m); i++) {
                var f = el("div", "ikan");
                f.style.setProperty("--y", acak(15, 85).toFixed(0) + "%");
                f.style.setProperty("--t", acak(24, 44).toFixed(0) + "s");
                f.style.setProperty("--d", (-acak(0, 40)).toFixed(0) + "s");
                host.appendChild(f);
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

    var PEMBANGUN = { nebula: nebula, stardust: stardust, lavender: lavender, lotus: lotus, hujan: hujan, laut: laut, api: api };

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
    setInterval(posisiMatahari, 60000);

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

    var kamar = [["panel-chat-aktif", "box-list-pesan"], ["ruang-channel-grup", "ruang-messages"]];
    kamar.forEach(function (k, n) {
        var r = document.getElementById(k[0]);
        if (r) pasang(r, document.getElementById(k[1]), n === 0);
    });
})();
