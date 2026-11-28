// ===== Grup: daftar, informasi, dan pengelolaan anggota =====
(function () {
    if (!userAktif) return;
    const $ = (id) => document.getElementById(id);
    const daftar = $('daftar-grup'),
        panel = $('panel-chat-grup'),
        info = $('panel-info-grup'),
        input = $('input-pesan-grup');
    const draft = new Map(),
        percobaan = new Map(),
        statusBerubah = new Set();
    let aktif = null,
        infoId = null,
        grupAktif = null;
    let sesiEditor = 0,
        editAktif = null,
        sedangSimpan = false,
        kirim = false;
    let versiList = 0,
        versiChat = 0,
        versiBuka = 0,
        versiInfo = 0,
        jenisBerkas = 'media';
    let jadwalSegar = null,
        dataBerubah = false,
        menuTarget = null,
        menuPemicu = null;
    let alur = null,
        versiAlur = 0;
    let menuAnggota = null,
        jadwalTanggal = null;
    const el = (tag, kelas, teks) => {
        const n = document.createElement(tag);
        if (kelas) n.className = kelas;
        if (teks !== undefined) n.textContent = teks;
        return n;
    };
    const status = (id, teks, error = false) => {
        $(id).textContent = teks;
        $(id).dataset.error = String(error);
        delete $(id).dataset.sumber;
    };
    const kosong = (teks) => el('p', 'grup-kosong', teks);
    const dataAnggota = (id) => window.NgumpulGrupData.member(id);
    const namaAkun = (id) => dataAnggota(id)?.displayName || getProfil(id).nama ||
        dataAnggota(id)?.username || getUserById(id)?.nama || 'Anggota';
    const admin = (g) => !g.keluar && g.adminIds.includes(userAktif.id);
    const kode = () => (window.crypto?.randomUUID ? crypto.randomUUID() : buatId() + buatId());
    function ikon(id) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('ikon');
        svg.setAttribute('aria-hidden', 'true');
        const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        use.setAttribute('href', '#' + id);
        svg.append(use);
        return svg;
    }
    const avatar = NgumpulAvatar.render;
    function avatarAnggota(node, g, id) {
        node.classList.add('grup-avatar-anggota');
        node.style.setProperty('--anggota-hue', String(g.warnaAnggota[id] ?? 0));
        tampilkanAvatarChat(node, id, namaAkun(id));
    }
    function bacaKeanggotaan(g) {
        const hasil = Object.fromEntries(
            Object.entries(g.keanggotaan || {}).filter(
                ([, data]) =>
                    data &&
                    ['buat', 'tambah', 'tautan'].includes(data.cara) &&
                    Number.isFinite(data.waktu) &&
                    typeof data.oleh === 'string'
            )
        );
        for (const a of g.aktivitas || []) {
            if (!['tambah', 'gabung'].includes(a.aksi)) continue;
            if (hasil[a.anggotaId] && hasil[a.anggotaId].waktu >= a.dibuat) continue;
            hasil[a.anggotaId] = {
                cara: a.aksi === 'gabung' ? 'tautan' : 'tambah',
                waktu: a.dibuat,
                oleh: a.aktorId
            };
        }
        if (!Object.hasOwn(hasil, g.pembuatId))
            hasil[g.pembuatId] = { cara: 'buat', waktu: g.dibuat, oleh: g.pembuatId };
        return hasil;
    }
    function temanTerdaftar() {
        return NgumpulTeman.list().map(teman => ({
            id: teman.userId,
            nama: NgumpulTeman.nama(teman),
            username: NgumpulTeman.username(teman)
        })).sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
    }
    const layananGrup = window.NgumpulGrupData.layanan;

    function teksAktivitas(a) {
        const nama = (id) => (id === userAktif.id ? 'Kamu' : namaAkun(id));
        if (a.aksi === 'tambah') return nama(a.aktorId) + ' menambahkan ' + nama(a.anggotaId);
        if (a.aksi === 'gabung') return nama(a.anggotaId) + ' bergabung melalui tautan undangan';
        if (a.aksi === 'keluar') return nama(a.anggotaId) + ' keluar';
        if (a.aksi === 'hapus') return nama(a.aktorId) + ' mengeluarkan ' + nama(a.anggotaId);
        return '';
    }
    async function renderGrup() {
        if (window.NgumpulRuang) return window.NgumpulRuang.renderList();
        const v = ++versiList;
        try {
            const semua = await layananGrup.daftarGrup();
            if (v !== versiList) return;
            if ($('status-grup').dataset.sumber === 'daftar') status('status-grup', '');
            const q = $('input-cari-grup').value.trim().toLowerCase();
            const hasil = semua
                .filter((g) => g.nama.toLowerCase().includes(q))
                .sort(
                    (a, b) => (b.terakhir?.dibuat || b.dibuat) - (a.terakhir?.dibuat || a.dibuat)
                );
            daftar.replaceChildren();
            if (!hasil.length)
                daftar.append(kosong(q ? 'Grup tidak ditemukan.' : 'Belum ada grup.'));
            hasil.forEach((g) => {
                const row = el('div', 'chat-card grup-baris' + (aktif === g.id ? ' aktif' : ''));
                row.dataset.grupId = g.id;
                const buka = el('button', 'grup-baris-buka');
                buka.type = 'button';
                buka.setAttribute('aria-pressed', String(aktif === g.id));
                const av = el('div', 'circle-avatar');
                avatar(av, g.nama, g.foto);
                const meta = el('div', 'card-meta'),
                    top = el('div', 'card-top'),
                    jam = el('small');
                jam.textContent = g.terakhir
                    ? formatJamPesan(new Date(g.terakhir.dibuat).toISOString())
                    : '';
                top.append(el('span', 'card-title', g.nama), jam);
                const cuplikan = g.terakhir
                    ? g.terakhir.jenis === 'aktivitas'
                        ? teksAktivitas(g.terakhir)
                        : (g.terakhir.pengirimId === userAktif.id
                              ? 'you'
                              : namaAkun(g.terakhir.pengirimId)) +
                          ': ' +
                          (g.terakhir.dihapus ? 'Pesan ini telah dihapus' : g.terakhir.isi.replace(/\s+/g, ' '))
                    : 'Mulai chat grup';
                meta.append(top, el('p', 'card-preview', cuplikan));
                buka.append(av, meta);
                buka.addEventListener('click', () => bukaChat(g.id));
                const tombol = el('button', 'grup-row-menu');
                tombol.append(ikon('i-more'));
                tombol.type = 'button';
                tombol.setAttribute('aria-label', 'Menu ' + g.nama);
                tombol.setAttribute('aria-haspopup', 'menu');
                tombol.addEventListener('click', () => {
                    const r = tombol.getBoundingClientRect();
                    bukaMenu(g.id, r.right, r.bottom, tombol);
                });
                row.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    const r = row.getBoundingClientRect();
                    bukaMenu(g.id, e.clientX || r.left + 24, e.clientY || r.top + 24, tombol);
                });
                row.append(buka, tombol);
                daftar.append(row);
            });
            if (aktif) {
                const g = semua.find((g) => g.id === aktif);
                if (!g) tutupChat();
                else {
                    grupAktif = g;
                    judulChat(g);
                    if (!info.hidden && infoId === g.id) await renderInfo(g);
                }
            }
        } catch (e) {
            if (v !== versiList) return;
            daftar.replaceChildren(kosong('Grup belum bisa ditampilkan.'));
            status('status-grup', e.message, true);
            $('status-grup').dataset.sumber = 'daftar';
        }
    }
    function judulChat(g) {
        grupAktif = g;
        $('nama-chat-grup').textContent = g.nama;
        const nama = g.anggotaIds.filter((id) => id !== userAktif.id).map(namaAkun);
        if (g.anggotaIds.includes(userAktif.id)) nama.push('you');
        $('anggota-chat-grup').textContent = nama.join(', ');
        $('anggota-chat-grup').title = nama.join(', ');
        avatar($('avatar-chat-grup'), g.nama, g.foto);
        $('form-pesan-grup').hidden = !!g.keluar;
        input.disabled = !!g.keluar;
        $('status-keanggotaan-grup').hidden = !g.keluar;
        $('status-keanggotaan-grup').textContent =
            g.alasan === 'dikeluarkan'
                ? 'Kamu telah dikeluarkan dari grup ini.'
                : 'Kamu sudah keluar dari grup ini.';
        aturTinggiInput();
    }
    function simpanDraft() {
        if (aktif && !grupAktif?.keluar) draft.set(aktif, input.value);
    }
    function tutupChat() {
        simpanDraft();
        tutupInfo(false);
        aktif = null;
        grupAktif = null;
        versiChat++;
        versiBuka++;
        panel.hidden = true;
        ['panel-sisi-kiri', 'panel-sisi-kanan'].forEach((id) =>
            $(id).classList.remove('grup-chat-open')
        );
        status('status-chat-grup', '');
    }
    function bolehBaca(id) {
        return (
            aktif === id &&
            !grupAktif?.keluar &&
            !panel.hidden &&
            !alur &&
            document.visibilityState === 'visible' &&
            document.hasFocus() &&
            getComputedStyle($('panel-layer-setelan')).display === 'none' &&
            (info.hidden || !matchMedia('(max-width: 900px)').matches) &&
            !document.querySelector('dialog[open]')
        );
    }
    function tanggalLokal(waktu) {
        const d = new Date(waktu);
        return [
            d.getFullYear(),
            String(d.getMonth() + 1).padStart(2, '0'),
            String(d.getDate()).padStart(2, '0')
        ].join('-');
    }
    function formatTanggal(waktu) {
        const sekarang = new Date(),
            kemarin = new Date(sekarang.getFullYear(), sekarang.getMonth(), sekarang.getDate() - 1),
            tanggal = tanggalLokal(waktu);
        if (tanggal === tanggalLokal(sekarang)) return 'Hari ini';
        if (tanggal === tanggalLokal(kemarin)) return 'Kemarin';
        return new Date(waktu).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }
    function pemisahTanggal(waktu) {
        const node = el('div', 'grup-date-divider'),
            time = el('time', '', formatTanggal(waktu));
        time.dateTime = tanggalLokal(waktu);
        node.dataset.kunciRiwayat = 'tanggal:' + time.dateTime;
        node.append(time);
        return node;
    }
    function teksPembuatanGrup(g) {
        const sekarang = new Date(),
            kemarin = new Date(sekarang.getFullYear(), sekarang.getMonth(), sekarang.getDate() - 1),
            hari = tanggalLokal(g.dibuat),
            tanggal = hari === tanggalLokal(sekarang)
                ? 'hari ini'
                : hari === tanggalLokal(kemarin)
                  ? 'kemarin'
                  : 'pada ' + new Date(g.dibuat).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'long', year: 'numeric'
                    });
        return 'Dibuat ' + tanggal + ' oleh ' + namaAkun(g.pembuatId);
    }
    function kartuAwal(g, animasi) {
        const masuk = bacaKeanggotaan(g)[userAktif.id],
            batas = g.batasPesan?.[userAktif.id] || 0;
        if (batas && (!masuk || masuk.waktu < batas)) return null;
        const node = $('template-awal-grup').content.firstElementChild.cloneNode(true);
        node.dataset.kunciRiwayat = 'awal:' + g.id;
        if (animasi) node.classList.add('grup-intro-masuk');
        avatar(node.querySelector('.grup-intro-avatar'), g.nama, g.foto);
        node.querySelector('.grup-intro-title').textContent =
            masuk?.cara === 'buat'
                ? 'Kamu membuat grup ini'
                : masuk?.cara === 'tambah'
                  ? namaAkun(masuk.oleh) + ' menambahkan kamu ke grup ini'
                  : masuk?.cara === 'tautan'
                    ? 'Kamu bergabung menggunakan tautan undangan grup ini'
                    : 'Kamu adalah anggota grup ini';
        node.querySelector('.grup-intro-members').textContent = g.anggotaIds.length + ' anggota';
        node.querySelector('.grup-intro-created').textContent = teksPembuatanGrup(g);
        const tambah = node.querySelector('[data-aksi="tambah"]'),
            undang = node.querySelector('[data-aksi="undang"]');
        tambah.hidden = !admin(g);
        undang.hidden = !!g.keluar || (!admin(g) && !g.anggotaBolehUndang);
        tambah.addEventListener('click', () => bukaAlur('tambah', g.id));
        undang.addEventListener('click', bukaUndangan);
        node.querySelector('.grup-intro-actions').hidden = tambah.hidden && undang.hidden;
        return { node, waktu: masuk?.waktu };
    }
    function jadwalkanTanggal() {
        clearTimeout(jadwalTanggal);
        const sekarang = new Date(),
            besok = new Date(sekarang.getFullYear(), sekarang.getMonth(), sekarang.getDate() + 1);
        jadwalTanggal = setTimeout(
            () => {
                if (aktif) renderPesan();
                jadwalkanTanggal();
            },
            besok.getTime() - sekarang.getTime() + 50
        );
    }
    async function renderPesan(scroll = false) {
        if (window.NgumpulRuang) return window.NgumpulRuang.refresh();
        if (!aktif) return;
        const id = aktif,
            v = ++versiChat,
            box = $('pesan-chat-grup');
        const bawah = box.scrollTop + box.clientHeight >= box.scrollHeight - 80,
            posisi = box.scrollTop,
            tepi = box.getBoundingClientRect().top,
            jangkar = [...box.children].find((n) => n.getBoundingClientRect().bottom > tepi),
            kunciJangkar = jangkar?.dataset.kunciRiwayat,
            jarakJangkar = jangkar?.getBoundingClientRect().top - tepi,
            fokusKartu = box.contains(document.activeElement)
                ? document.activeElement.dataset.aksi
                : null;
        try {
            const g = await layananGrup.ambilGrup(id);
            if (!g.keluar) await layananGrup.tandaiStatus(id, bolehBaca(id));
            const pesan = await layananGrup.ambilPesan(id);
            if (id !== aktif || v !== versiChat) return;
            if ($('status-chat-grup').dataset.sumber === 'riwayat') status('status-chat-grup', '');
            judulChat(g);
            const kartu = kartuAwal(g, box.dataset.chatGrupId !== id),
                riwayat = [...pesan];
            if (kartu && Number.isFinite(kartu.waktu))
                riwayat.push({ id: 'awal:' + id, jenis: 'awal', dibuat: kartu.waktu });
            riwayat.sort(
                (a, b) =>
                    a.dibuat - b.dibuat ||
                    (a.jenis === 'awal' ? -1 : b.jenis === 'awal' ? 1 : a.id.localeCompare(b.id))
            );
            box.replaceChildren();
            box.dataset.chatGrupId = id;
            let sebelumnya = null,
                tanggalTerakhir = null;
            if (kartu && !Number.isFinite(kartu.waktu)) box.append(kartu.node);
            if (!riwayat.length && !kartu) box.append(kosong('Belum ada pesan.'));
            riwayat.forEach((p) => {
                const tanggal = tanggalLokal(p.dibuat);
                if (tanggal !== tanggalTerakhir) {
                    box.append(pemisahTanggal(p.dibuat));
                    tanggalTerakhir = tanggal;
                }
                if (p.jenis === 'awal') {
                    box.append(kartu.node);
                    sebelumnya = null;
                    return;
                }
                if (p.jenis === 'aktivitas') {
                    const row = el('div', 'grup-activity'),
                        time = el('time', '', formatJamPesan(new Date(p.dibuat).toISOString()));
                    time.dateTime = new Date(p.dibuat).toISOString();
                    row.dataset.kunciRiwayat = 'aktivitas:' + p.id;
                    row.append(el('span', '', teksAktivitas(p)), time);
                    box.append(row);
                    sebelumnya = null;
                    return;
                }
                const sendiri = p.pengirimId === userAktif.id;
                const rangkaian =
                    sebelumnya &&
                    sebelumnya.pengirimId === p.pengirimId &&
                    new Date(sebelumnya.dibuat).toDateString() ===
                        new Date(p.dibuat).toDateString() &&
                    p.dibuat - sebelumnya.dibuat < 300000;
                const row = el(
                    'div',
                    'grup-pesan-baris' +
                        (sendiri ? ' sendiri' : '') +
                        (rangkaian ? ' lanjutan' : '')
                );
                row.dataset.kunciRiwayat = 'pesan:' + p.id;
                row.style.setProperty('--anggota-hue', String(g.warnaAnggota?.[p.pengirimId] ?? 0));
                if (!sendiri) {
                    const av = el('button', 'grup-avatar-pengirim');
                    av.type = 'button';
                    av.setAttribute('aria-label', 'Lihat profil ' + namaAkun(p.pengirimId));
                    avatarAnggota(av, g, p.pengirimId);
                    av.addEventListener('click', () => tampilkanInfoKontak(p.pengirimId));
                    if (rangkaian) {
                        av.classList.add('avatar-kosong');
                        av.tabIndex = -1;
                        av.setAttribute('aria-hidden', 'true');
                    }
                    row.append(av);
                }
                const bubble = el(
                    'div',
                    'chat-bubble grup-pesan ' + (sendiri ? 'kirim' : 'terima')
                );
                if (!rangkaian) {
                    const nama = el(
                        'strong',
                        'grup-pesan-pengirim',
                        sendiri ? 'you' : namaAkun(p.pengirimId)
                    );
                    nama.dataset.warna = '';
                    bubble.append(nama);
                }
                bubble.append(el('span', 'grup-pesan-isi', p.isi));
                const footer = el('div', 'message-footer'),
                    time = el(
                        'span',
                        'timestamp',
                        formatJamPesan(new Date(p.dibuat).toISOString())
                    );
                footer.append(time);
                if (sendiri) footer.append(buatIndikatorStatusPesan(p.status));
                bubble.append(footer);
                row.append(bubble);
                box.append(row);
                sebelumnya = p;
            });
            if (fokusKartu)
                box.querySelector('[data-aksi="' + fokusKartu + '"]:not([hidden])')?.focus({
                    preventScroll: true
                });
            if (scroll || bawah) box.scrollTop = box.scrollHeight;
            else {
                box.scrollTop = posisi;
                const node = [...box.children].find((n) => n.dataset.kunciRiwayat === kunciJangkar);
                if (node) box.scrollTop += node.getBoundingClientRect().top - tepi - jarakJangkar;
            }
        } catch (e) {
            if (id === aktif && v === versiChat) {
                status('status-chat-grup', e.message, true);
                $('status-chat-grup').dataset.sumber = 'riwayat';
            }
        }
    }
    async function bukaChat(id) {
        if (window.NgumpulRuang) return window.NgumpulRuang.open(id);
        const v = ++versiBuka;
        try {
            const g = await layananGrup.ambilGrup(id);
            if (v !== versiBuka) return;
            tutupMenu(false);
            if (aktif !== id) tutupInfo(false);
            simpanDraft();
            aktif = id;
            grupAktif = g;
            pilihTabDashboard('grup');
            judulChat(g);
            panel.hidden = false;
            ['panel-sisi-kiri', 'panel-sisi-kanan'].forEach((x) =>
                $(x).classList.add('grup-chat-open')
            );
            input.value = g.keluar ? '' : draft.get(id) || '';
            status('status-chat-grup', '');
            status('status-grup', '');
            await renderPesan(true);
            if (aktif === id && !g.keluar) input.focus();
        } catch (e) {
            if (v === versiBuka) status('status-grup', e.message, true);
        }
    }
    async function prosesMasuk() {
        if (window.NgumpulRuang) return;
        try {
            for (const g of await layananGrup.daftarGrup())
                if (!g.keluar) await layananGrup.tandaiStatus(g.id, bolehBaca(g.id));
            if ($('status-grup').dataset.sumber === 'sinkron') status('status-grup', '');
        } catch (e) {
            status('status-grup', e.message, true);
            $('status-grup').dataset.sumber = 'sinkron';
        }
    }
    async function segarkan() {
        await renderGrup();
        if (aktif) await renderPesan();
    }
    function jadwalkanPembaruan(change = {}) {
        if (change.jenis === 'status') statusBerubah.add(change.grupId || '*');
        else dataBerubah = true;
        if (jadwalSegar !== null) return;
        jadwalSegar = setTimeout(async () => {
            jadwalSegar = null;
            const data = dataBerubah,
                centang = statusBerubah.has('*') || statusBerubah.has(aktif);
            dataBerubah = false;
            statusBerubah.clear();
            if (data) {
                await prosesMasuk();
                await segarkan();
                if (alur) await renderPilihan();
            } else if (aktif && centang) await renderPesan();
        }, 25);
    }
    async function konfirmasi(judul, teks, label = 'Lanjutkan', bahaya = false) {
        const d = $('dialog-konfirmasi-grup');
        if (d.open) return false;
        $('judul-konfirmasi-grup').textContent = judul;
        $('isi-konfirmasi-grup').textContent = teks;
        $('btn-konfirmasi-grup').textContent = label;
        $('btn-konfirmasi-grup').classList.toggle('grup-tombol-bahaya', bahaya);
        d.returnValue = '';
        d.showModal();
        return new Promise((resolve) =>
            d.addEventListener('close', () => resolve(d.returnValue === 'lanjut'), { once: true })
        );
    }
    async function lakukan(aksi, tujuan = 'status-info-grup') {
        try {
            await aksi();
            status(tujuan, '');
            await segarkan();
            return true;
        } catch (e) {
            status(tujuan, e.message, true);
            return false;
        }
    }
    function aturPanelInfo() {
        const kecil = matchMedia('(max-width: 900px)').matches,
            infoPenuh = !info.hidden && kecil,
            alurPenuh = !!alur && kecil;
        $('panel-sisi-kiri').inert = infoPenuh && !alurPenuh;
        $('panel-sisi-kanan').inert = infoPenuh || alurPenuh;
        info.inert = alurPenuh;
        $('btn-info-grup').disabled = !!alur;
        if (
            infoPenuh &&
            !alurPenuh &&
            !info.contains(document.activeElement) &&
            !document.querySelector('dialog[open]')
        )
            $('btn-tutup-info-grup').focus({ preventScroll: true });
    }
    function tutupMenu(fokus = true) {
        $('menu-aksi-grup').hidden = true;
        menuTarget = null;
        if (fokus && menuPemicu?.isConnected) menuPemicu.focus({ preventScroll: true });
        menuPemicu = null;
    }
    function tutupMenuAnggota(fokus = false, langsung = false) {
        const data = menuAnggota;
        if (!data) return;
        if (fokus && data.pemicu.isConnected) data.pemicu.focus({ preventScroll: true });
        if (data.menutup && !langsung) return;
        data.menutup = true;
        data.pemicu.setAttribute('aria-expanded', 'false');
        data.menu.inert = true;
        data.animasi?.cancel();
        const selesai = () => {
            if (menuAnggota !== data) return;
            data.root.open = false;
            data.animasi?.cancel();
            menuAnggota = null;
        };
        if (
            langsung ||
            !data.root.isConnected ||
            matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
            selesai();
            return;
        }
        data.animasi = data.menu.animate(
            [
                { opacity: 1, transform: 'translateY(0)' },
                { opacity: 0, transform: 'translateY(-4px)' }
            ],
            { duration: 140, easing: 'ease-in', fill: 'forwards' }
        );
        data.animasi.finished.then(selesai, () => {});
    }
    function bukaMenuAnggota(root) {
        tutupMenu(false);
        tutupMenuAnggota(false, true);
        const pemicu = root.querySelector('summary'),
            menu = root.querySelector('.grup-member-menu'),
            data = { root, pemicu, menu, menutup: false };
        menuAnggota = data;
        root.open = true;
        menu.inert = false;
        delete root.dataset.posisi;
        const tepi = info.querySelector('.detail-panel-content').getBoundingClientRect();
        if (root.getBoundingClientRect().top + menu.offsetHeight > tepi.bottom)
            root.dataset.posisi = 'atas';
        pemicu.setAttribute('aria-expanded', 'true');
        if (!matchMedia('(prefers-reduced-motion: reduce)').matches)
            data.animasi = menu.animate(
                [
                    { opacity: 0, transform: 'translateY(-4px)' },
                    { opacity: 1, transform: 'translateY(0)' }
                ],
                { duration: 160, easing: 'ease-out' }
            );
    }
    async function bukaMenu(id, x, y, pemicu) {
        tutupMenuAnggota(false, true);
        try {
            const g = await layananGrup.ambilGrup(id),
                menu = $('menu-aksi-grup');
            menu.replaceChildren();
            menuTarget = id;
            menuPemicu = pemicu;
            const aksi = g.keluar
                ? [['hapus', 'Hapus grup', 'i-trash-grup']]
                : g.pembuatId === userAktif.id
                  ? [['hapus', 'Hapus grup', 'i-trash-grup']]
                  : [['keluar', 'Keluar grup', 'i-out']];
            aksi.forEach(([key, nama, ico]) => {
                const b = el('button', key === 'keluar' ? '' : 'grup-danger');
                b.type = 'button';
                b.role = 'menuitem';
                b.append(ikon(ico), el('span', '', nama));
                b.addEventListener('click', () => {
                    tutupMenu(false);
                    keluarAtauHapus(id, key);
                });
                menu.append(b);
            });
            menu.hidden = false;
            const r = menu.getBoundingClientRect();
            menu.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + 'px';
            menu.style.top = Math.max(8, Math.min(y, innerHeight - r.height - 8)) + 'px';
            menu.querySelector('button').focus({ preventScroll: true });
        } catch (e) {
            status('status-grup', e.message, true);
        }
    }
    async function keluarAtauHapus(id, aksi) {
        try {
            const g = await layananGrup.ambilGrup(id),
                hapus = aksi !== 'keluar';
            const judul =
                aksi === 'hapus'
                    ? 'Hapus grup?'
                    : hapus
                      ? 'Keluar dan hapus grup?'
                      : 'Keluar grup?';
            const teks = hapus
                ? 'Hapus ' + g.nama + ' beserta riwayatnya untuk semua anggota?'
                : 'Keluar dari ' + g.nama + '?';
            if (!(await konfirmasi(judul, teks, hapus ? 'Hapus' : 'Keluar', hapus))) return;
            if (aksi === 'hapus') await layananGrup.hapusGrup(id);
            else await layananGrup.keluar(id, hapus);
            if (infoId === id) tutupInfo(false);
            if (hapus) draft.delete(id);
            if (window.NgumpulRuang) window.NgumpulRuang.afterExit(id);
            await segarkan();
        } catch (e) {
            status('status-grup', e.message, true);
            if (window.NgumpulRuang) window.NgumpulRuang.toast(e.message);
        }
    }

    async function renderInfo(g) {
        $('nama-info-grup').textContent = g.nama;
        avatar($('foto-info-grup'), g.nama, g.foto);
        $('jumlah-info-grup').textContent = g.anggotaIds.length + ' anggota';
        $('deskripsi-info-grup').textContent = g.deskripsi || 'Belum ada deskripsi';
        $('pembuat-info-grup').textContent = teksPembuatanGrup(g);
        ['nama', 'deskripsi'].forEach((bagian) => {
            $('btn-edit-' + bagian + '-grup').hidden = !admin(g);
        });
        $('btn-edit-foto-grup').disabled = !admin(g);
        if (!admin(g) && editAktif) batalEditor();
        $('btn-undang-grup').hidden = !!g.keluar || (!admin(g) && !g.anggotaBolehUndang);
        $('btn-tambah-anggota-grup').hidden = !admin(g);
        const bolehHapus = g.keluar || g.pembuatId === userAktif.id;
        $('btn-keluar-grup').querySelector('span').textContent = bolehHapus
            ? 'Hapus grup'
            : 'Keluar grup';
        $('btn-keluar-grup')
            .querySelector('use')
            .setAttribute('href', bolehHapus ? '#i-trash-grup' : '#i-out');
        $('judul-anggota-info').textContent = g.anggotaIds.length + ' anggota';
        const query = $('cari-anggota-info').value.toLowerCase().trim(),
            list = $('daftar-anggota-info');
        tutupMenuAnggota(false, true);
        list.replaceChildren();
        g.anggotaIds
            .filter((id) =>
                (namaAkun(id) + ' ' + (dataAnggota(id)?.username || getUserById(id)?.username || '')).toLowerCase().includes(query)
            )
            .forEach((id) => {
                const row = el('div', 'grup-member'),
                    profile = el('button', 'grup-member-profile');
                profile.type = 'button';
                const av = el('span', 'circle-avatar');
                avatarAnggota(av, g, id);
                const teks = el('span', 'grup-member-name');
                teks.append(
                    el('strong', '', namaAkun(id) + (id === userAktif.id ? ' (Kamu)' : ''))
                );
                profile.append(av, teks);
                profile.addEventListener('click', () => tampilkanInfoKontak(id));
                row.append(profile);
                if (g.adminIds.includes(id))
                    row.append(el('small', 'grup-admin-badge', 'Admin grup'));
                const pemilik = g.pembuatId === userAktif.id;
                if (admin(g) && id !== g.pembuatId && (pemilik || !g.adminIds.includes(id))) {
                    const actions = el('details', 'grup-member-actions'),
                        summary = el('summary');
                    summary.append(ikon('i-more'));
                    summary.setAttribute('aria-label', 'Tindakan untuk ' + namaAkun(id));
                    summary.setAttribute('aria-expanded', 'false');
                    summary.setAttribute('aria-haspopup', 'menu');
                    summary.addEventListener('click', (e) => {
                        e.preventDefault();
                        if (menuAnggota?.root === actions && !menuAnggota.menutup)
                            tutupMenuAnggota(true);
                        else bukaMenuAnggota(actions);
                    });
                    actions.append(summary);
                    const menu = el('div', 'grup-member-menu');
                    menu.role = 'menu';
                    menu.setAttribute('aria-label', 'Tindakan untuk ' + namaAkun(id));
                    const aksi = g.adminIds.includes(id) ? 'nonadmin' : 'admin';
                    const role = el(
                        'button',
                        '',
                        aksi === 'admin' ? 'Jadikan admin' : 'Hapus status admin'
                    );
                    role.type = 'button';
                    role.role = 'menuitem';
                    role.addEventListener('click', async () => {
                        tutupMenuAnggota(false, true);
                        if (
                            await konfirmasi(
                                role.textContent,
                                role.textContent + ' untuk ' + namaAkun(id) + '?'
                            )
                        )
                            await lakukan(() => layananGrup.tindakanAnggota(g.id, id, aksi));
                    });
                    if (pemilik) menu.append(role);
                    if (id !== userAktif.id) {
                        const remove = el('button', 'grup-danger', 'Keluarkan');
                        remove.type = 'button';
                        remove.role = 'menuitem';
                        remove.addEventListener('click', async () => {
                            tutupMenuAnggota(false, true);
                            if (
                                await konfirmasi(
                                    'Keluarkan anggota',
                                    'Keluarkan ' + namaAkun(id) + ' dari grup?'
                                )
                            )
                                await lakukan(() => layananGrup.tindakanAnggota(g.id, id, 'hapus'));
                        });
                        menu.append(remove);
                    }
                    actions.append(menu);
                    row.append(actions);
                }
                list.append(row);
            });
        if (!list.childElementCount) list.append(kosong('Anggota tidak ditemukan.'));
        await renderBerkas(g.id);
        if (window.NgumpulRuang) await window.NgumpulRuang.extendInfo(g);
    }

    function urlBerkas(value, gambar = false) {
        if (typeof value !== 'string') return null;
        if (gambar && /^data:image\/(png|jpeg|webp);base64,/.test(value)) return value;
        try {
            const u = new URL(value, location.href);
            if (['https:', 'http:', 'blob:'].includes(u.protocol)) return u.href;
        } catch (_) {}
        return null;
    }
    async function renderBerkas(id) {
        if (window.NgumpulRuang) return window.NgumpulRuang.renderMedia(id);
        const data = await layananGrup.ambilBerkas(id);
        if (infoId !== id) return;
        const media = (b) =>
            b.jenis === 'image' ||
            b.jenis === 'media' ||
            (typeof b.mime === 'string' && b.mime.startsWith('image/'));
        const berkas = data
            .map((b) => ({ ...b, gambar: !!media(b), alamat: urlBerkas(b.url, !!media(b)) }))
            .filter((b) => b.alamat);
        const terbuka = !$('detail-berkas-grup').hidden;
        $('jumlah-berkas-grup').textContent = String(berkas.length);
        $('btn-buka-berkas-grup').setAttribute('aria-expanded', String(terbuka));
        $('tab-media-grup').setAttribute('aria-pressed', String(jenisBerkas === 'media'));
        $('tab-dokumen-grup').setAttribute('aria-pressed', String(jenisBerkas === 'dokumen'));
        const preview = $('pratinjau-media-grup');
        preview.replaceChildren();
        berkas
            .filter((b) => b.gambar)
            .slice(0, 4)
            .forEach((b) => {
                const a = el('a');
                a.href = b.alamat;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                const img = el('img');
                img.src = b.alamat;
                img.alt = b.nama || 'Media grup';
                img.loading = 'lazy';
                a.append(img);
                preview.append(a);
            });
        preview.hidden = terbuka || !preview.childElementCount;
        const target = $('berkas-info-grup');
        target.replaceChildren();
        berkas
            .filter((b) => b.gambar === (jenisBerkas === 'media'))
            .forEach((b) => {
                const link = el('a', 'grup-berkas');
                link.href = b.alamat;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                if (b.gambar) {
                    const img = el('img');
                    img.src = b.alamat;
                    img.alt = b.nama || 'Media grup';
                    img.loading = 'lazy';
                    link.append(img);
                }
                link.append(el('span', '', b.nama || 'Berkas grup'));
                target.append(link);
            });
        if (!target.childElementCount)
            target.append(
                kosong(
                    jenisBerkas === 'media'
                        ? 'Belum ada media di grup ini.'
                        : 'Belum ada dokumen di grup ini.'
                )
            );
    }

    function batalEditor() {
        sesiEditor++;
        sedangSimpan = false;
        editAktif = null;
        ['nama', 'deskripsi', 'foto'].forEach((bagian) => {
            $('form-' + bagian + '-grup').hidden = true;
            $('simpan-' + bagian + '-grup').disabled = false;
        });
    }
    function tutupInfo(kembaliFokus = true) {
        if (kembaliFokus && !info.hidden && window.NgumpulRuang) {
            window.NgumpulRuang.dismissInfo(() => {
                tutupInfo(false);
                window.NgumpulRuang.focusHeader();
            });
            return;
        }
        window.NgumpulRuang?.cancelPanelMotion(info);
        tutupMenuAnggota(false, true);
        const terbuka = !info.hidden;
        info.hidden = true;
        infoId = null;
        versiInfo++;
        batalEditor();
        document.querySelector('.dashboard-container').classList.remove('grup-info-open');
        $('btn-info-grup').setAttribute('aria-expanded', 'false');
        aturPanelInfo();
        if (terbuka && kembaliFokus && aktif) {
            if (window.NgumpulRuang) window.NgumpulRuang.focusHeader();
            else $('btn-info-grup').focus({ preventScroll: true });
            renderPesan();
        }
    }
    async function bukaInfo(panelVersion = null) {
        if (!aktif || alur) return;
        const versiPanel = typeof panelVersion === 'number' ? panelVersion : window.NgumpulRuang?.prepareInfo();
        window.NgumpulRuang?.cancelPanelMotion(info);
        const id = aktif,
            v = ++versiInfo;
        try {
            const g = (await layananGrup.daftarGrup()).find((g) => g.id === id);
            if (v !== versiInfo || aktif !== id) return;
            if (versiPanel !== undefined && !window.NgumpulRuang.isInfoCurrent(versiPanel)) return;
            if (!g) throw new Error('Grup tidak tersedia.');
            infoId = id;
            batalEditor();
            status('status-info-grup', '');
            $('cari-anggota-info').value = '';
            $('detail-berkas-grup').hidden = true;
            jenisBerkas = 'media';
            await renderInfo(g);
            if (v !== versiInfo || aktif !== id) return;
            if (versiPanel !== undefined && !window.NgumpulRuang.isInfoCurrent(versiPanel)) return;
            info.hidden = false;
            document.querySelector('.dashboard-container').classList.add('grup-info-open');
            $('btn-info-grup').setAttribute('aria-expanded', 'true');
            info.querySelector('.detail-panel-content').scrollTop = 0;
            aturPanelInfo();
            $('btn-tutup-info-grup').focus({ preventScroll: true });
        } catch (e) {
            if (v === versiInfo) status('status-chat-grup', e.message, true);
        }
    }

    async function bukaEditor(bagian) {
        const id = infoId;
        try {
            const g = (await layananGrup.daftarGrup()).find((g) => g.id === id);
            if (!g || g.keluar || !admin(g) || info.hidden || infoId !== id || sedangSimpan) return;
            batalEditor();
            editAktif = bagian;
            status('status-info-grup', '');
            $('form-' + bagian + '-grup').hidden = false;
            if (bagian === 'foto') {
                $('edit-foto-grup').value = g.foto || '';
                avatar($('preview-foto-grup'), g.nama, g.foto);
            } else $('edit-' + bagian + '-grup').value = bagian === 'nama' ? g.nama : g.deskripsi;
            $('edit-' + bagian + '-grup').focus();
        } catch (e) {
            status('status-info-grup', e.message, true);
        }
    }
    ['nama', 'deskripsi', 'foto'].forEach((bagian) => {
        $('btn-edit-' + bagian + '-grup').addEventListener('click', () => bukaEditor(bagian));
        $('form-' + bagian + '-grup').addEventListener('submit', async (e) => {
            e.preventDefault();
            if (editAktif !== bagian || sedangSimpan) return;
            const id = infoId,
                sesi = sesiEditor;
            sedangSimpan = true;
            $('simpan-' + bagian + '-grup').disabled = true;
            try {
                const g = (await layananGrup.daftarGrup()).find((g) => g.id === id);
                if (!g || !admin(g))
                    throw new Error('Hanya admin yang dapat mengubah informasi grup.');
                if (sesi !== sesiEditor || infoId !== id) return;
                const input = $('edit-' + bagian + '-grup');
                await layananGrup.ubahInfo(id, { [bagian]: input.value.trim() });
                if (sesi === sesiEditor && infoId === id) {
                    batalEditor();
                    status('status-info-grup', 'Informasi grup disimpan.');
                    await segarkan();
                }
            } catch (e) {
                if (sesi === sesiEditor) status('status-info-grup', e.message, true);
            } finally {
                if (sesi === sesiEditor) {
                    sedangSimpan = false;
                    $('simpan-' + bagian + '-grup').disabled = false;
                }
            }
        });
    });
    info.querySelectorAll('[data-batal-edit-grup]').forEach((button) =>
        button.addEventListener('click', () => {
            const bagian = editAktif;
            batalEditor();
            if (bagian) $('btn-edit-' + bagian + '-grup').focus();
        })
    );
    $('edit-foto-grup').addEventListener('input', (e) => {
        avatar($('preview-foto-grup'), grupAktif?.nama, e.target.value);
    });

    function perbaruiPilihan() {
        if (!alur) return;
        const a = alur,
            target = $('anggota-terpilih-grup');
        target.replaceChildren();
        a.kontak
            .filter((k) => a.pilihan.has(k.id))
            .forEach((k) => {
                const chip = el('span', 'grup-selected-chip'),
                    av = el('span', 'circle-avatar');
                avatar(av, k.nama, fotoAkun(k.id));
                const hapus = el('button');
                hapus.append(ikon('i-close'));
                hapus.type = 'button';
                hapus.setAttribute('aria-label', 'Batalkan pilihan ' + k.nama);
                hapus.addEventListener('click', () => {
                    if (alur !== a || a.sibuk) return;
                    a.pilihan.delete(k.id);
                    [...$('pilihan-anggota-grup').querySelectorAll('input')].forEach((cek) => {
                        if (cek.value === k.id) cek.checked = false;
                    });
                    perbaruiPilihan();
                    $('input-cari-anggota-grup').focus();
                });
                chip.append(av, el('span', '', k.nama), hapus);
                target.append(chip);
            });
        target.hidden = !a.pilihan.size;
        $('jumlah-pilihan-grup').textContent = a.pilihan.size + ' anggota dipilih';
        target.querySelectorAll('button').forEach((b) => (b.disabled = a.sibuk));
        $('pilihan-anggota-grup')
            .querySelectorAll('input')
            .forEach((cek) => (cek.disabled = a.sibuk));
        $('btn-kembali-alur-grup').disabled = a.sibuk;
        $('btn-lanjut-grup').disabled = (a.mode !== 'baru' && !a.pilihan.size) || a.sibuk;
    }
    async function renderPilihan() {
        if (!alur) return;
        const a = alur;
        try {
            let exclude = [];
            if (a.mode === 'tambah') {
                const g = await layananGrup.ambilGrup(a.grupId);
                if (alur !== a) return;
                if (!admin(g)) {
                    tutupAlur(false, true);
                    throw new Error('Hanya admin yang dapat menambahkan anggota.');
                }
                exclude = g.anggotaIds;
            }
            a.kontak = temanTerdaftar().filter((k) => !exclude.includes(k.id));
            const valid = new Set(a.kontak.map((k) => k.id));
            a.pilihan.forEach((id) => {
                if (!valid.has(id)) a.pilihan.delete(id);
            });
            const query = $('input-cari-anggota-grup').value.trim().toLowerCase();
            const hasil = a.kontak.filter((k) =>
                (k.nama + ' ' + k.username).toLowerCase().includes(query)
            );
            const target = $('pilihan-anggota-grup');
            const fokus = document.activeElement
                ?.closest('.grup-picker-option')
                ?.querySelector('input')?.value;
            target.replaceChildren();
            let huruf = '';
            hasil.forEach((k) => {
                const awal = /^[\p{L}]/u.test(k.nama) ? k.nama.trim().charAt(0).toUpperCase() : '#';
                if (awal !== huruf) {
                    target.append(el('h3', 'grup-picker-heading', awal));
                    huruf = awal;
                }
                const row = el('label', 'grup-picker-option'),
                    av = el('span', 'circle-avatar');
                avatar(av, k.nama, fotoAkun(k.id));
                const detail = el('span', 'grup-picker-label');
                detail.append(el('strong', '', k.nama));
                const bio = bacaSemuaProfil()[k.id]?.bio;
                detail.append(el('small', '', typeof bio === 'string' && bio.trim() ? bio : k.username));
                const cek = el('input');
                cek.type = 'checkbox';
                cek.name = 'anggota-grup';
                cek.value = k.id;
                cek.checked = a.pilihan.has(k.id);
                cek.disabled = a.sibuk;
                cek.setAttribute('aria-label', k.nama);
                cek.addEventListener('change', () => {
                    if (alur !== a) return;
                    cek.checked ? a.pilihan.add(k.id) : a.pilihan.delete(k.id);
                    status('status-pilih-anggota', '');
                    perbaruiPilihan();
                });
                row.append(av, detail, cek);
                target.append(row);
            });
            if (!hasil.length)
                target.append(
                    kosong(
                        query
                            ? 'Teman tidak ditemukan.'
                            : 'Tidak ada teman yang bisa ditambahkan.'
                    )
                );
            perbaruiPilihan();
            if (fokus)
                [...target.querySelectorAll('input')]
                    .find((cek) => cek.value === fokus)
                    ?.focus({ preventScroll: true });
        } catch (e) {
            status(alur ? 'status-pilih-anggota' : 'status-grup', e.message, true);
        }
    }
    function tampilTahap(tahap) {
        if (!alur) return;
        alur.tahap = tahap;
        $('form-pilih-anggota').hidden = tahap !== 1;
        $('form-buat-grup').hidden = tahap !== 2;
        $('judul-alur-grup').textContent =
            tahap === 2
                ? 'Grup baru'
                : alur.mode === 'tambah'
                  ? 'Tambah anggota'
                  : 'Tambah anggota grup';
        (tahap === 1 ? $('input-cari-anggota-grup') : $('input-nama-grup')).focus();
    }
    async function bukaAlur(mode, grupId = null) {
        if (alur) return;
        try {
            if (mode === 'tambah') {
                const g = await layananGrup.ambilGrup(grupId);
                if (!admin(g)) throw new Error('Hanya admin yang dapat menambahkan anggota.');
            }
            const kembaliInfo = !info.hidden;
            tutupMenu(false);
            tutupInfo(false);
            pilihTabDashboard('grup');
            alur = {
                mode,
                grupId,
                kembaliInfo,
                tahap: 1,
                pilihan: new Set(),
                kontak: [],
                sibuk: false,
                versi: ++versiAlur
            };
            $('form-buat-grup').reset();
            $('form-pilih-anggota').reset();
            $('foto-grup-baru').replaceChildren(ikon('i-camera-grup'));
            $('btn-simpan-grup').disabled = false;
            status('status-pilih-anggota', '');
            status('status-buat-grup', '');
            $('btn-lanjut-grup').textContent = mode === 'tambah' ? 'Tambah' : 'Lanjut';
            $('panel-alur-grup').hidden = false;
            document.querySelector('.dashboard-container').classList.add('grup-wizard-open');
            aturPanelInfo();
            await renderPilihan();
            if (alur) tampilTahap(1);
        } catch (e) {
            status('status-grup', e.message, true);
        }
    }
    function tutupAlur(kembali = true, paksa = false) {
        if (!alur || (alur.sibuk && !paksa)) return;
        const a = alur;
        alur = null;
        versiAlur++;
        $('panel-alur-grup').hidden = true;
        document.querySelector('.dashboard-container').classList.remove('grup-wizard-open');
        aturPanelInfo();
        if (kembali && a.kembaliInfo && aktif === a.grupId) bukaInfo();
        else if (kembali) $('trigger-menu-utama').focus({ preventScroll: true });
        if (aktif) renderPesan();
    }
    $('menu-grup-baru').addEventListener('click', () => bukaAlur('baru'));
    $('btn-tambah-anggota-grup').addEventListener('click', () => bukaAlur('tambah', infoId));
    $('input-cari-anggota-grup').addEventListener('input', renderPilihan);
    $('btn-kembali-alur-grup').addEventListener('click', () => {
        if (alur?.sibuk) return;
        if (alur?.tahap === 2) tampilTahap(1);
        else tutupAlur();
    });
    $('form-pilih-anggota').addEventListener('submit', async (e) => {
        e.preventDefault();
        const a = alur;
        if (!a || a.sibuk || (a.mode !== 'baru' && !a.pilihan.size)) return;
        if (a.mode === 'baru') {
            tampilTahap(2);
            return;
        }
        a.sibuk = true;
        perbaruiPilihan();
        try {
            await layananGrup.tambahAnggota(a.grupId, [...a.pilihan]);
            if (alur === a) {
                tutupAlur(false, true);
                await segarkan();
                if (aktif === a.grupId) await bukaInfo();
            }
        } catch (error) {
            if (alur === a) status('status-pilih-anggota', error.message, true);
        } finally {
            if (alur === a) {
                a.sibuk = false;
                perbaruiPilihan();
            }
        }
    });
    $('btn-foto-grup-baru').addEventListener('click', () => {
        if (!alur?.sibuk) $('input-foto-grup-baru').click();
    });
    $('input-foto-grup-baru').addEventListener('input', (e) => {
        avatar($('foto-grup-baru'), 'Grup', e.target.value);
    });
    $('form-buat-grup').addEventListener('submit', async (e) => {
        e.preventDefault();
        const a = alur;
        if (!a || a.mode !== 'baru' || a.sibuk) return;
        const nama = $('input-nama-grup').value.trim();
        if (!nama) {
            status('status-buat-grup', 'Isi nama grup.', true);
            $('input-nama-grup').focus();
            return;
        }
        a.sibuk = true;
        $('btn-simpan-grup').disabled = true;
        try {
            const g = await layananGrup.buatGrup({
                nama,
                anggotaIds: [...a.pilihan],
                foto: $('input-foto-grup-baru').value.trim()
            });
            if (alur === a) {
                tutupAlur(false, true);
                $('input-cari-grup').value = '';
                await segarkan();
                await bukaChat(g.id);
                if (g.warning) window.NgumpulRuang?.toast(g.warning);
            }
        } catch (error) {
            if (alur === a) status('status-buat-grup', error.message, true);
        } finally {
            if (alur === a) {
                a.sibuk = false;
                $('btn-simpan-grup').disabled = false;
            }
        }
    });
    $('input-nama-grup').addEventListener('input', () => status('status-buat-grup', ''));
    $('form-pesan-grup').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!aktif || grupAktif?.keluar || kirim) return;
        const id = aktif,
            nilai = input.value,
            isi = nilai.trim();
        if (!isi) return;
        if (isi.length > 4000) {
            status('status-chat-grup', 'Pesan maksimal 4000 karakter.', true);
            return;
        }
        kirim = true;
        $('btn-kirim-grup').disabled = true;
        simpanDraft();
        let p = percobaan.get(id);
        if (!p || p.isi !== isi) {
            p = {
                id: 'pesan_' + kode(),
                grupId: id,
                pengirimId: userAktif.id,
                isi,
                dibuat: Date.now()
            };
            percobaan.set(id, p);
        }
        try {
            await layananGrup.kirimPesan(id, p);
            percobaan.delete(id);
            if (draft.get(id) === nilai) draft.delete(id);
            if (aktif === id) {
                if (input.value === nilai) input.value = '';
                aturTinggiInput();
                status('status-chat-grup', '');
                await renderPesan(true);
            }
            await renderGrup();
        } catch (error) {
            if (aktif === id) status('status-chat-grup', error.message, true);
        } finally {
            kirim = false;
            $('btn-kirim-grup').disabled = false;
        }
    });
    function aturTinggiInput() {
        if (panel.hidden || $('form-pesan-grup').hidden) return;
        const box = $('pesan-chat-grup');
        const bawah = box.scrollTop + box.clientHeight >= box.scrollHeight - 80;
        input.style.height = 'auto';
        const tinggi = Math.min(input.scrollHeight, 120);
        input.style.height = tinggi + 'px';
        input.style.overflowY = input.scrollHeight > tinggi ? 'auto' : 'hidden';
        if (bawah) box.scrollTop = box.scrollHeight;
    }
    input.addEventListener('input', () => {
        simpanDraft();
        aturTinggiInput();
    });
    if (typeof ResizeObserver !== 'undefined') {
        let lebarInput = 0;
        const pengamatInput = new ResizeObserver(([entry]) => {
            if (entry.contentRect.width === lebarInput) return;
            lebarInput = entry.contentRect.width;
            aturTinggiInput();
        });
        pengamatInput.observe($('form-pesan-grup'));
    } else window.addEventListener('resize', aturTinggiInput);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
            e.preventDefault();
            $('form-pesan-grup').requestSubmit();
        }
    });
    $('btn-kembali-chat-grup').addEventListener('click', () => {
        tutupChat();
        pilihTabDashboard('grup');
        $('tab-grup').focus();
    });
    $('btn-info-grup').addEventListener('click', bukaInfo);
    $('btn-tutup-info-grup').addEventListener('click', () => tutupInfo());
    matchMedia('(max-width: 900px)').addEventListener('change', aturPanelInfo);
    $('opt-buka-setelan').addEventListener('click', () => {
        tutupAlur(false);
        tutupInfo(false);
    });
    $('jumlah-info-grup').addEventListener('click', () => {
        $('bagian-anggota-grup').scrollIntoView({ block: 'start' });
        $('cari-anggota-info').focus({ preventScroll: true });
    });
    function bukaUndangan() {
        if (window.NgumpulRuang) return window.NgumpulRuang.invite(infoId || aktif);
        const d = $('dialog-undangan-grup');
        if (!d.open) d.showModal();
    }
    $('btn-undang-grup').addEventListener('click', bukaUndangan);
    $('dialog-undangan-grup').addEventListener('close', () => {
        sessionStorage.removeItem('ngumpul_undangan_tertunda');
        if (location.hash.includes('undangan-grup='))
            history.replaceState(null, '', location.pathname + location.search);
        if (aktif) renderPesan();
    });
    $('btn-buka-berkas-grup').addEventListener('click', () => {
        if (window.NgumpulRuang) return window.NgumpulRuang.gallery(infoId);
        $('detail-berkas-grup').hidden = !$('detail-berkas-grup').hidden;
        lakukan(() => renderBerkas(infoId));
    });
    ['media', 'dokumen'].forEach((jenis) =>
        $('tab-' + jenis + '-grup').addEventListener('click', () => {
            jenisBerkas = jenis;
            lakukan(() => renderBerkas(infoId));
        })
    );
    $('cari-anggota-info').addEventListener('input', () =>
        lakukan(async () => {
            const g = await layananGrup.ambilGrup(infoId);
            await renderInfo(g);
        })
    );
    $('btn-keluar-grup').addEventListener('click', () => {
        if (infoId) keluarAtauHapus(infoId, (grupAktif?.keluar || grupAktif?.pembuatId === userAktif.id) ? 'hapus' : 'keluar');
    });
    $('input-cari-grup').addEventListener('input', renderGrup);
    document.addEventListener('pointerdown', (e) => {
        if (menuAnggota && !menuAnggota.root.contains(e.target)) tutupMenuAnggota();
        if (
            !$('menu-aksi-grup').hidden &&
            !$('menu-aksi-grup').contains(e.target) &&
            !e.target.closest('.grup-row-menu')
        )
            tutupMenu(false);
    });
    document.addEventListener('focusin', (e) => {
        if (menuAnggota && !menuAnggota.root.contains(e.target)) tutupMenuAnggota();
    });
    window.addEventListener('resize', () => tutupMenu(false));
    document.addEventListener('scroll', () => tutupMenu(false), true);
    document.addEventListener('keydown', (e) => {
        if (menuAnggota && !menuAnggota.menutup && !document.querySelector('dialog[open]')) {
            if (e.key === 'Escape') {
                e.preventDefault();
                tutupMenuAnggota(true);
                return;
            }
            if (
                menuAnggota.root.contains(e.target) &&
                ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)
            ) {
                e.preventDefault();
                const buttons = [...menuAnggota.menu.querySelectorAll('button')],
                    i = buttons.indexOf(document.activeElement),
                    next =
                        e.key === 'Home'
                            ? 0
                            : e.key === 'End'
                              ? buttons.length - 1
                              : i < 0
                                ? e.key === 'ArrowDown'
                                    ? 0
                                    : buttons.length - 1
                                : (i + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) %
                                  buttons.length;
                buttons[next]?.focus();
                return;
            }
        }
        if (
            e.target instanceof Element &&
            e.target.matches('.grup-member-actions > summary') &&
            ['ArrowDown', 'ArrowUp'].includes(e.key)
        ) {
            e.preventDefault();
            bukaMenuAnggota(e.target.parentElement);
            const buttons = [...menuAnggota.menu.querySelectorAll('button')];
            (e.key === 'ArrowDown' ? buttons[0] : buttons.at(-1))?.focus();
            return;
        }
        const menu = $('menu-aksi-grup');
        if (!menu.hidden) {
            const buttons = [...menu.querySelectorAll('button')],
                i = buttons.indexOf(document.activeElement);
            if (e.key === 'Escape') {
                e.preventDefault();
                tutupMenu();
                return;
            }
            if (e.key === 'Tab') {
                tutupMenu(false);
                return;
            }
            if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
                e.preventDefault();
                const next =
                    e.key === 'Home'
                        ? 0
                        : e.key === 'End'
                          ? buttons.length - 1
                          : (i + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) %
                            buttons.length;
                buttons[next].focus();
                return;
            }
        }
        if (document.querySelector('dialog[open]')) return;
        const kecil = matchMedia('(max-width: 900px)').matches;
        if (alur) {
            if (e.key === 'Escape') {
                e.preventDefault();
                if (alur.sibuk) return;
                if (alur.tahap === 2) tampilTahap(1);
                else tutupAlur();
                return;
            }
            if (e.key === 'Tab' && kecil) jagaFokus(e, $('panel-alur-grup'));
        } else if (!info.hidden) {
            if (e.key === 'Escape') {
                e.preventDefault();
                if (editAktif) {
                    const bagian = editAktif;
                    batalEditor();
                    $('btn-edit-' + bagian + '-grup').focus();
                } else tutupInfo();
            }
            if (e.key === 'Tab' && kecil) jagaFokus(e, info);
        }
    });
    function jagaFokus(e, root) {
        const nodes = [...root.querySelectorAll('button,input,textarea,summary,a[href]')].filter(
            (n) => !n.disabled && n.getClientRects().length
        );
        const first = nodes[0],
            last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
        }
    }
    document.addEventListener('ngumpul:tab-grup', renderGrup);
    document.addEventListener('ngumpul:tab-dashboard', (e) => {
        if (e.detail.tabAktif !== 'grup') {
            tutupAlur(false);
            tutupMenu(false);
            tutupChat();
        }
    });
    document.addEventListener('ngumpul:buka-grup', (e) => {
        if (typeof e.detail?.grupId === 'string') bukaChat(e.detail.grupId);
    });
    document.addEventListener('visibilitychange', async () => {
        jadwalkanTanggal();
        await prosesMasuk();
        if (aktif) await renderPesan();
    });
    window.addEventListener('focus', async () => {
        jadwalkanTanggal();
        await prosesMasuk();
        if (aktif) await renderPesan();
    });
    document.addEventListener('ngumpul:profil-ditutup', () => {
        if (aktif) renderPesan();
    });
    $('btn-kembali-ke-chat').addEventListener('click', () => {
        if (aktif) renderPesan();
    });
    window.addEventListener('storage', (e) => {
        if (
            ['ngumpul_users', 'ngumpul_profil'].includes(e.key) ||
            e.key?.startsWith('ngumpul_media_')
        ) {
            segarkan();
            if (alur) renderPilihan();
        }
    });
    document.addEventListener('ngumpul:teman-berubah', () => {
        if (alur) renderPilihan();
    });
    window.NgumpulGrupDasar = {
        layanan: layananGrup, nama: namaAkun, avatar, avatarAnggota,
        kontak: temanTerdaftar, aktivitas: teksAktivitas, kartu: kartuAwal, konfirmasi,
        menu: bukaMenu, tambah: id => bukaAlur('tambah', id), tutupInfo,
        async info(id) {
            const version = window.NgumpulRuang?.prepareInfo();
            aktif = id;
            const g = await layananGrup.ambilGrup(id);
            if (version !== undefined && !window.NgumpulRuang.isInfoCurrent(version)) return;
            grupAktif = g;
            await bukaInfo(version);
        },
        async refreshInfo() { if (!info.hidden && infoId) await renderInfo(await layananGrup.ambilGrup(infoId)); },
        seleksi(id, g) { aktif = id; grupAktif = g; }
    };
    jadwalkanTanggal();
    window.addEventListener('hashchange', () => {
        if (location.hash.includes('undangan-grup=')) bukaUndangan();
    });
    (async () => {
        try {
            if (layananGrup.inisialisasi) await layananGrup.inisialisasi();
            await prosesMasuk();
            await renderGrup();
        } catch (e) {
            status('status-grup', e.message, true);
        }
        if (
            location.hash.includes('undangan-grup=') ||
            sessionStorage.getItem('ngumpul_undangan_tertunda')
        )
        bukaUndangan();
        layananGrup.langganan(jadwalkanPembaruan);
    })();
})();
