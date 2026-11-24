// ===== Grup: tampilan, izin, percakapan, dan adapter lokal =====
(function () {
    if (!userAktif) return;
    const $ = (id) => document.getElementById(id);
    const KUNCI_GRUP = 'ngumpul_grup',
        PESAN = 'ngumpul_pesan_grup_',
        STATUS = 'ngumpul_status_grup_';
    const daftar = $('daftar-grup'),
        panel = $('panel-chat-grup'),
        info = $('panel-info-grup'),
        input = $('input-pesan-grup');
    const draft = new Map(),
        percobaan = new Map(),
        statusBerubah = new Set();
    let aktif = null,
        infoId = null,
        grupAktif = null,
        fotoDraft = '',
        fotoDiproses = false,
        versiFoto = 0;
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
    const namaAkun = (id) => getProfil(id).nama || getUserById(id)?.nama || 'Anggota';
    const fotoAkun = (id) => ambilFotoProfilChat(id);
    const unik = (data) => [...new Set(data)];
    const admin = (g) => !g.keluar && g.adminIds.includes(userAktif.id);
    const kode = () => (window.crypto?.randomUUID ? crypto.randomUUID() : buatId() + buatId());
    const awalPesan = (id) => PESAN + encodeURIComponent(id) + ':';
    const awalStatus = (g, p, u) => STATUS + [g, p, u].map(encodeURIComponent).join(':') + ':';
    function ikon(id) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('ikon');
        svg.setAttribute('aria-hidden', 'true');
        const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        use.setAttribute('href', '#' + id);
        svg.append(use);
        return svg;
    }
    function avatar(node, nama, foto) {
        node.replaceChildren();
        if (foto && /^data:image\/(png|jpeg|webp);base64,/.test(foto)) {
            const img = el('img');
            img.src = foto;
            img.alt = '';
            node.append(img);
        } else node.textContent = (nama || '?').trim().charAt(0).toUpperCase() || '?';
    }
    function warnaUntuk(ids, lama, grupId) {
        const warna = Object.fromEntries(
            Object.entries(lama || {}).filter(([, v]) => Number.isFinite(v) && v >= 0 && v < 360)
        );
        let seed = 0;
        for (const c of grupId) seed = (seed * 31 + c.charCodeAt(0)) % 360;
        ids.forEach((id) => {
            if (Object.hasOwn(warna, id)) return;
            const used = unik(Object.values(warna)).sort((a, b) => a - b);
            let hue = seed;
            if (used.length) {
                let gap = -1;
                for (let i = 0; i < used.length; i++) {
                    const next = i === used.length - 1 ? used[0] + 360 : used[i + 1];
                    if (next - used[i] > gap) {
                        gap = next - used[i];
                        hue = (used[i] + gap / 2) % 360;
                    }
                }
            }
            warna[id] = hue;
        });
        return warna;
    }
    function avatarAnggota(node, g, id) {
        node.classList.add('grup-avatar-anggota');
        node.style.setProperty('--anggota-hue', String(g.warnaAnggota[id] ?? 0));
        avatar(node, namaAkun(id), fotoAkun(id));
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
    function bacaGrup() {
        let data;
        try {
            data = JSON.parse(localStorage.getItem(KUNCI_GRUP) || '[]');
        } catch (_) {
            throw new Error('Data grup tidak bisa dibaca.');
        }
        if (!Array.isArray(data)) throw new Error('Data grup tidak valid.');
        const ids = new Set();
        return data.map((g) => {
            if (
                !g ||
                typeof g.id !== 'string' ||
                !g.id ||
                ids.has(g.id) ||
                typeof g.nama !== 'string' ||
                !g.nama.trim() ||
                typeof g.pembuatId !== 'string' ||
                !Array.isArray(g.anggotaIds) ||
                !g.anggotaIds.every((id) => typeof id === 'string' && id) ||
                !Number.isFinite(g.dibuat)
            )
                throw new Error('Data grup tidak valid.');
            ids.add(g.id);
            const anggotaIds = unik(g.anggotaIds);
            let adminIds = unik(Array.isArray(g.adminIds) ? g.adminIds : [g.pembuatId]).filter(
                (id) => anggotaIds.includes(id)
            );
            if (!adminIds.length && anggotaIds.length) adminIds = [anggotaIds[0]];
            const aktivitas = Array.isArray(g.aktivitas) ? g.aktivitas : [];
            if (
                !aktivitas.every(
                    (a) =>
                        a &&
                        typeof a.id === 'string' &&
                        a.grupId === g.id &&
                        typeof a.aksi === 'string' &&
                        typeof a.aktorId === 'string' &&
                        typeof a.anggotaId === 'string' &&
                        Number.isFinite(a.dibuat)
                )
            )
                throw new Error('Riwayat aktivitas tidak valid.');
            return {
                ...g,
                anggotaIds,
                adminIds,
                deskripsi: g.deskripsi || '',
                foto: g.foto || '',
                aktivitas,
                keanggotaan: bacaKeanggotaan({ ...g, aktivitas }),
                warnaAnggota: warnaUntuk(anggotaIds, g.warnaAnggota, g.id),
                arsipAkun: g.arsipAkun && typeof g.arsipAkun === 'object' ? g.arsipAkun : {},
                dihapusUntuk:
                    g.dihapusUntuk && typeof g.dihapusUntuk === 'object' ? g.dihapusUntuk : {},
                batasPesan: g.batasPesan && typeof g.batasPesan === 'object' ? g.batasPesan : {},
                anggotaBolehUndang: g.anggotaBolehUndang !== false
            };
        });
    }
    function grupLokal(id) {
        const g = bacaGrup().find((g) => g.id === id);
        if (!g || !g.anggotaIds.includes(userAktif.id))
            throw new Error('Kamu bukan anggota grup ini.');
        return g;
    }
    function simpanGrup(data) {
        try {
            localStorage.setItem(KUNCI_GRUP, JSON.stringify(data));
        } catch (_) {
            throw new Error('Grup gagal disimpan. Coba lagi.');
        }
    }
    function transaksiGrup(aksi) {
        return navigator.locks?.request
            ? navigator.locks.request('ngumpul:grup', aksi)
            : Promise.resolve().then(aksi);
    }
    function bacaRiwayatLokal(id) {
        let data;
        try {
            data = JSON.parse(localStorage.getItem(PESAN + id) || '[]');
            if (!Array.isArray(data)) throw new Error();
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith(awalPesan(id)))
                    data.push(JSON.parse(localStorage.getItem(key)));
            }
        } catch (_) {
            throw new Error('Riwayat pesan tidak bisa dibaca.');
        }
        if (
            !data.every(
                (p) =>
                    p &&
                    typeof p.id === 'string' &&
                    p.grupId === id &&
                    typeof p.pengirimId === 'string' &&
                    typeof p.isi === 'string' &&
                    Number.isFinite(p.dibuat)
            )
        )
            throw new Error('Riwayat pesan tidak valid.');
        return [...new Map(data.map((p) => [p.id, p])).values()];
    }
    function tetapkanPenerimaLama(g) {
        bacaRiwayatLokal(g.id)
            .filter((p) => !Array.isArray(p.penerimaIds))
            .forEach((p) => {
                const item = {
                    ...p,
                    penerimaIds: g.anggotaIds.filter((id) => id !== p.pengirimId)
                };
                try {
                    localStorage.setItem(
                        awalPesan(g.id) + encodeURIComponent(p.id),
                        JSON.stringify(item)
                    );
                } catch (_) {
                    throw new Error('Perubahan anggota gagal disimpan.');
                }
            });
    }
    function pesanUntuk(g, akunId = userAktif.id) {
        return bacaRiwayatLokal(g.id)
            .filter((p) => p.dibuat >= (g.batasPesan[akunId] || 0))
            .map((p) => {
                const penerimaIds = Array.isArray(p.penerimaIds)
                    ? p.penerimaIds
                    : g.anggotaIds.filter((id) => id !== p.pengirimId);
                const semua = (t) =>
                    penerimaIds.length > 0 &&
                    penerimaIds.every(
                        (id) => localStorage.getItem(awalStatus(g.id, p.id, id) + t) !== null
                    );
                return {
                    ...p,
                    penerimaIds,
                    status: semua('dibaca') ? 'dibaca' : semua('diterima') ? 'diterima' : 'terkirim'
                };
            });
    }
    function riwayatUntuk(g, akunId = userAktif.id) {
        return [
            ...pesanUntuk(g, akunId),
            ...g.aktivitas.filter((a) => a.dibuat >= (g.batasPesan[akunId] || 0))
        ].sort((a, b) => a.dibuat - b.dibuat || a.id.localeCompare(b.id));
    }
    function salinIdentitas(g) {
        const { arsipAkun, dihapusUntuk, batasPesan, ...identitas } = g;
        return identitas;
    }
    function arsipkan(g, id, alasan) {
        g.arsipAkun[id] = {
            grup: salinIdentitas(g),
            riwayat: riwayatUntuk(g, id),
            alasan,
            dibuat: Date.now()
        };
    }
    function terlihat(g) {
        if (g.anggotaIds.includes(userAktif.id)) return { ...g, keluar: false };
        const arsip = g.arsipAkun[userAktif.id];
        return arsip
            ? { ...arsip.grup, keluar: true, alasan: arsip.alasan, riwayat: arsip.riwayat }
            : null;
    }
    function catat(g, aksi, anggotaId) {
        const dibuat = Date.now();
        g.aktivitas.push({
            id: 'aktivitas_' + kode(),
            grupId: g.id,
            jenis: 'aktivitas',
            aksi,
            aktorId: userAktif.id,
            anggotaId,
            dibuat
        });
    }
    function ubahLokal(id, ubah, perluAdmin = true) {
        return transaksiGrup(() => {
            const semua = bacaGrup(),
                g = semua.find((g) => g.id === id);
            if (!g || !g.anggotaIds.includes(userAktif.id))
                throw new Error('Kamu bukan anggota grup ini.');
            if (perluAdmin && !admin(g))
                throw new Error('Hanya admin yang dapat melakukan tindakan ini.');
            const sebelum = { ...g, anggotaIds: [...g.anggotaIds] };
            ubah(g);
            if (sebelum.anggotaIds.join('\0') !== g.anggotaIds.join('\0'))
                tetapkanPenerimaLama(sebelum);
            simpanGrup(semua);
            return g;
        });
    }
    function kontakTerdaftar() {
        const hasil = new Map(),
            users = getUsers();
        NgumpulKontakData.list(userAktif.id).forEach((k) => {
            const akun = users.find((u) => samakanHp(u.hp, k.phone));
            if (akun && akun.id !== userAktif.id)
                hasil.set(akun.id, { id: akun.id, nama: k.name || namaAkun(akun.id), hp: akun.hp });
        });
        return [...hasil.values()].sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
    }
    function masuk(g, ids, lewatTautan = false) {
        const baru = unik(ids).filter((id) => !g.anggotaIds.includes(id));
        baru.forEach((id) => {
            const waktu = Date.now();
            g.anggotaIds.push(id);
            if (g.dihapusUntuk[id]) g.batasPesan[id] = waktu;
            g.keanggotaan[id] = {
                cara: lewatTautan ? 'tautan' : 'tambah',
                waktu,
                oleh: userAktif.id
            };
            delete g.arsipAkun[id];
            delete g.dihapusUntuk[id];
            catat(g, lewatTautan ? 'gabung' : 'tambah', id);
        });
        g.warnaAnggota = warnaUntuk(g.anggotaIds, g.warnaAnggota, g.id);
    }
    const backendGrup = null;
    const adapterLokal = {
        async inisialisasi() {
            return transaksiGrup(() => {
                const raw = JSON.parse(localStorage.getItem(KUNCI_GRUP) || '[]');
                const semua = bacaGrup();
                if (
                    raw.some(
                        (g, i) =>
                            !g.warnaAnggota ||
                            semua[i].anggotaIds.some((id) => !Object.hasOwn(g.warnaAnggota, id))
                    )
                )
                    simpanGrup(semua);
            });
        },
        async daftarGrup() {
            return bacaGrup()
                .filter((g) => !g.pribadi) // ruang panggilan 1-lawan-1 tidak ditampilkan sebagai grup
                .map(terlihat)
                .filter(Boolean)
                .map((g) => {
                    const riwayat = g.keluar ? g.riwayat : riwayatUntuk(g);
                    return { ...g, terakhir: riwayat.at(-1) || null };
                });
        },
        async ambilGrup(id) {
            const g = bacaGrup().find((g) => g.id === id),
                hasil = g && terlihat(g);
            if (!hasil) throw new Error('Grup tidak tersedia.');
            return hasil;
        },
        async buatGrup({ nama, anggotaIds, foto = '' }) {
            const valid = new Set(kontakTerdaftar().map((k) => k.id)),
                ids = unik(anggotaIds);
            if (
                !nama.trim() ||
                nama.trim().length > 60 ||
                !ids.length ||
                ids.some((id) => !valid.has(id))
            )
                throw new Error('Periksa nama dan anggota grup.');
            if (foto && !/^data:image\/(png|jpeg|webp);base64,/.test(foto))
                throw new Error('Foto tidak valid.');
            return transaksiGrup(() => {
                const semua = bacaGrup();
                let id;
                do {
                    id = 'grup_' + kode();
                } while (semua.some((g) => g.id === id));
                const g = {
                    id,
                    nama: nama.trim(),
                    foto,
                    deskripsi: '',
                    pembuatId: userAktif.id,
                    adminIds: [userAktif.id],
                    anggotaIds: [userAktif.id, ...ids],
                    dibuat: Date.now(),
                    anggotaBolehUndang: true,
                    kodeUndangan: kode(),
                    aktivitas: [],
                    arsipAkun: {},
                    dihapusUntuk: {},
                    batasPesan: {}
                };
                g.warnaAnggota = warnaUntuk(g.anggotaIds, {}, id);
                g.keanggotaan = Object.fromEntries(
                    g.anggotaIds.map((akunId) => [
                        akunId,
                        {
                            cara: akunId === userAktif.id ? 'buat' : 'tambah',
                            waktu: g.dibuat,
                            oleh: userAktif.id
                        }
                    ])
                );
                simpanGrup([...semua, g]);
                return g;
            });
        },
        // Ruang tersembunyi untuk panggilan pribadi (kontak -> telepon/video). Memakai mesin panggilan grup yang sama.
        async grupPribadi(lawanId) {
            const a = userAktif.id,
                b = String(lawanId);
            if (a === b || !kontakTerdaftar().some((k) => k.id === b))
                throw new Error('Kontak belum terdaftar di Ngumpul.');
            const id = 'pribadi_' + [a, b].sort().join('_');
            return transaksiGrup(() => {
                const semua = bacaGrup();
                const ada = semua.find((g) => g.id === id);
                if (ada) return ada;
                const dibuat = Date.now();
                const g = {
                    id,
                    pribadi: true,
                    nama: 'Panggilan pribadi',
                    foto: '',
                    deskripsi: '',
                    pembuatId: a,
                    adminIds: [a, b],
                    anggotaIds: [a, b],
                    dibuat,
                    anggotaBolehUndang: false,
                    kodeUndangan: kode(),
                    aktivitas: [],
                    arsipAkun: {},
                    dihapusUntuk: {},
                    batasPesan: {},
                    ruang: {
                        versi: 2,
                        categories: [{ id: id + ':teks', nama: 'Teks' }],
                        channels: [
                            { id: id + ':umum', nama: 'panggilan', kategoriId: id + ':teks', jenis: 'teks', bawaan: true }
                        ]
                    }
                };
                g.warnaAnggota = warnaUntuk(g.anggotaIds, {}, id);
                g.keanggotaan = Object.fromEntries(
                    g.anggotaIds.map((x) => [x, { cara: x === a ? 'buat' : 'tambah', waktu: dibuat, oleh: a }])
                );
                simpanGrup([...semua, g]);
                return g;
            });
        },
        async ubahInfo(id, data) {
            if (!data.nama.trim() || data.nama.trim().length > 60 || data.deskripsi.length > 512)
                throw new Error('Nama maksimal 60 karakter. Deskripsi maksimal 512 karakter.');
            if (data.foto && !/^data:image\/(png|jpeg|webp);base64,/.test(data.foto))
                throw new Error('Foto tidak valid.');
            return ubahLokal(id, (g) =>
                Object.assign(g, {
                    nama: data.nama.trim(),
                    deskripsi: data.deskripsi.trim(),
                    foto: data.foto
                })
            );
        },
        async tambahAnggota(id, ids) {
            const valid = new Set(kontakTerdaftar().map((k) => k.id));
            if (!ids.length || ids.some((id) => !valid.has(id)))
                throw new Error('Pilih kontak yang sudah terdaftar.');
            return ubahLokal(id, (g) => masuk(g, ids));
        },
        async tindakanAnggota(id, target, aksi) {
            return ubahLokal(id, (g) => {
                if (!g.anggotaIds.includes(target))
                    throw new Error('Anggota sudah tidak tersedia.');
                if (aksi === 'admin') g.adminIds = unik([...g.adminIds, target]);
                else if (aksi === 'nonadmin') {
                    if (g.adminIds.length === 1 && g.adminIds.includes(target))
                        throw new Error('Tambahkan admin lain terlebih dahulu.');
                    g.adminIds = g.adminIds.filter((x) => x !== target);
                } else if (aksi === 'hapus') {
                    if (target === userAktif.id)
                        throw new Error('Gunakan Keluar grup untuk akun sendiri.');
                    tetapkanPenerimaLama(g);
                    catat(g, 'hapus', target);
                    arsipkan(g, target, 'dikeluarkan');
                    g.anggotaIds = g.anggotaIds.filter((x) => x !== target);
                    g.adminIds = g.adminIds.filter((x) => x !== target);
                } else throw new Error('Tindakan tidak tersedia.');
            });
        },
        async keluar(id, hapus = false) {
            return ubahLokal(
                id,
                (g) => {
                    if (g.anggotaIds.length > 1 && g.adminIds.includes(userAktif.id) && g.adminIds.length === 1)
                        throw new Error('Jadikan anggota lain sebagai admin sebelum keluar.');
                    tetapkanPenerimaLama(g);
                    catat(g, 'keluar', userAktif.id);
                    if (hapus) {
                        delete g.arsipAkun[userAktif.id];
                        g.dihapusUntuk[userAktif.id] = Date.now();
                    } else arsipkan(g, userAktif.id, 'keluar');
                    g.anggotaIds = g.anggotaIds.filter((x) => x !== userAktif.id);
                    g.adminIds = g.adminIds.filter((x) => x !== userAktif.id);
                },
                false
            );
        },
        async hapusGrup(id) {
            return transaksiGrup(() => {
                const semua = bacaGrup(),
                    g = semua.find((g) => g.id === id);
                if (!g || g.anggotaIds.includes(userAktif.id))
                    throw new Error('Keluar dari grup terlebih dahulu.');
                delete g.arsipAkun[userAktif.id];
                g.dihapusUntuk[userAktif.id] = Date.now();
                simpanGrup(semua);
            });
        },
        async gabung(id, token) {
            return transaksiGrup(() => {
                const semua = bacaGrup(),
                    g = semua.find((g) => g.id === id && g.anggotaIds.length);
                if (!g || !token || g.kodeUndangan !== token)
                    throw new Error('Undangan tidak tersedia.');
                if (!g.anggotaIds.includes(userAktif.id)) {
                    tetapkanPenerimaLama(g);
                    masuk(g, [userAktif.id], true);
                    simpanGrup(semua);
                }
                return g;
            });
        },
        async ambilPesan(id) {
            const g = await this.ambilGrup(id);
            return g.keluar ? g.riwayat : riwayatUntuk(g);
        },
        async kirimPesan(id, pesan) {
            return transaksiGrup(() => {
                const g = grupLokal(id),
                    riwayat = pesanUntuk(g);
                if (
                    pesan.pengirimId !== userAktif.id ||
                    (!pesan.isi.trim() && !pesan.lampiran?.length) ||
                    pesan.isi.length > 4000
                )
                    throw new Error('Pesan tidak valid.');
                if (pesan.channelId && !g.ruang?.channels.some(c => c.id === pesan.channelId && c.jenis === 'teks'))
                    throw new Error('Channel sudah tidak tersedia.');
                const lama = riwayat.find((p) => p.id === pesan.id);
                if (lama) return lama;
                const baru = {
                    ...pesan,
                    grupId: id,
                    penerimaIds: g.anggotaIds.filter((x) => x !== userAktif.id)
                };
                try {
                    localStorage.setItem(
                        awalPesan(id) + encodeURIComponent(baru.id),
                        JSON.stringify(baru)
                    );
                } catch (_) {
                    throw new Error('Pesan gagal dikirim. Coba lagi.');
                }
                return baru;
            });
        },
        async editPesan(id, channelId, idPesan, isi) {
            return transaksiGrup(() => {
                if (getUserAktif()?.id !== userAktif.id)
                    throw new Error('Sesi berakhir. Silakan masuk kembali.');
                const g = grupLokal(id);
                const pesan = pesanUntuk(g).find((p) => p.id === idPesan);
                if (!pesan || pesan.jenis === 'aktivitas' || pesan.pengirimId !== userAktif.id)
                    throw new Error('Pesan tidak ditemukan atau bukan milik kamu.');
                const channelPesan = pesan.channelId || g.ruang?.channels.find((c) => c.bawaan)?.id;
                if (channelPesan !== channelId || !g.ruang?.channels.some((c) => c.id === channelId && c.jenis === 'teks'))
                    throw new Error('Pesan atau channel sudah tidak tersedia.');
                const umur = Date.now() - pesan.dibuat;
                if (!Number.isFinite(pesan.dibuat) || umur < 0 || umur > BATAS_WAKTU_EDIT_PESAN)
                    throw new Error('Batas waktu edit 5 menit sejak pesan dikirim sudah habis.');
                const teks = String(isi || '').trim();
                if (!teks || teks.length > 4000)
                    throw new Error('Isi pesan wajib diisi, maksimal 4000 karakter.');
                if (teks === pesan.isi) return pesan;
                const baru = { ...pesan, isi: teks, editedAt: new Date().toISOString() };
                try {
                    localStorage.setItem(awalPesan(id) + encodeURIComponent(pesan.id), JSON.stringify(baru));
                } catch (_) {
                    throw new Error('Perubahan gagal disimpan. Silakan coba lagi.');
                }
                return baru;
            });
        },
        async tandaiStatus(id, dibaca, channelId = null) {
            const g = grupLokal(id);
            pesanUntuk(g)
                .filter(
                    (p) => p.pengirimId !== userAktif.id && p.penerimaIds.includes(userAktif.id) &&
                        (!channelId || (p.channelId || g.ruang?.channels.find(c => c.bawaan)?.id) === channelId)
                )
                .forEach((p) => {
                    const prefix = awalStatus(id, p.id, userAktif.id);
                    ['diterima', ...(dibaca ? ['dibaca'] : [])].forEach((t) => {
                        if (localStorage.getItem(prefix + t) === null)
                            localStorage.setItem(prefix + t, String(Date.now()));
                    });
                });
        },
        async ambilBerkas(id) {
            return (await this.ambilPesan(id))
                .flatMap((p) => (Array.isArray(p.lampiran) ? p.lampiran : []))
                .filter((b) => b && typeof b === 'object');
        },
        langganan(callback) {
            const listener = (e) => {
                if (e.key === null || e.key === KUNCI_GRUP) callback({ jenis: 'grup' });
                else if (e.key.startsWith(PESAN) || e.key.startsWith(STATUS)) {
                    const jenis = e.key.startsWith(PESAN) ? 'pesan' : 'status',
                        prefix = jenis === 'pesan' ? PESAN : STATUS;
                    let id = e.key.slice(prefix.length).split(':')[0];
                    try {
                        id = decodeURIComponent(id);
                    } catch (_) {
                        return;
                    }
                    callback({ jenis, grupId: id });
                }
            };
            window.addEventListener('storage', listener);
            return () => window.removeEventListener('storage', listener);
        }
    };
    const layananGrup = backendGrup || adapterLokal;

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
                          g.terakhir.isi.replace(/\s+/g, ' ')
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
    function jadwalkanPembaruan(change) {
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
                : [
                      ['keluar', 'Keluar grup', 'i-out'],
                      ['keluarHapus', 'Keluar dan hapus grup', 'i-trash-grup']
                  ];
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
                ? 'Hapus ' + g.nama + ' beserta riwayatnya dari akunmu?'
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
    async function olahFoto(file) {
        if (
            !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
            file.size > 5 * 1024 * 1024
        )
            throw new Error('Gunakan foto JPG, PNG, atau WebP maksimal 5 MB.');
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file),
                img = new Image();
            img.onload = () => {
                try {
                    const scale = Math.min(1, 512 / Math.max(img.width, img.height)),
                        c = document.createElement('canvas');
                    c.width = Math.max(1, Math.round(img.width * scale));
                    c.height = Math.max(1, Math.round(img.height * scale));
                    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                    resolve(c.toDataURL('image/jpeg', 0.85));
                } catch (e) {
                    reject(e);
                } finally {
                    URL.revokeObjectURL(url);
                }
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Foto tidak dapat dibuka.'));
            };
            img.src = url;
        });
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
        $('btn-keluar-grup').querySelector('span').textContent = g.keluar
            ? 'Hapus grup'
            : 'Keluar grup';
        $('btn-keluar-grup')
            .querySelector('use')
            .setAttribute('href', g.keluar ? '#i-trash-grup' : '#i-out');
        $('judul-anggota-info').textContent = g.anggotaIds.length + ' anggota';
        const query = $('cari-anggota-info').value.toLowerCase().trim(),
            list = $('daftar-anggota-info');
        tutupMenuAnggota(false, true);
        list.replaceChildren();
        g.anggotaIds
            .filter((id) =>
                (namaAkun(id) + ' ' + (getUserById(id)?.hp || '')).toLowerCase().includes(query)
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
                if (admin(g)) {
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
                    menu.append(role);
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
        versiFoto++;
        fotoDiproses = false;
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
                fotoDraft = g.foto;
                $('edit-foto-grup').value = '';
                avatar($('preview-foto-grup'), g.nama, fotoDraft);
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
            if (editAktif !== bagian || sedangSimpan || (bagian === 'foto' && fotoDiproses)) return;
            const id = infoId,
                sesi = sesiEditor;
            sedangSimpan = true;
            $('simpan-' + bagian + '-grup').disabled = true;
            try {
                const g = (await layananGrup.daftarGrup()).find((g) => g.id === id);
                if (!g || !admin(g))
                    throw new Error('Hanya admin yang dapat mengubah informasi grup.');
                if (sesi !== sesiEditor || infoId !== id) return;
                await layananGrup.ubahInfo(id, {
                    nama: bagian === 'nama' ? $('edit-nama-grup').value : g.nama,
                    deskripsi:
                        bagian === 'deskripsi' ? $('edit-deskripsi-grup').value : g.deskripsi,
                    foto: bagian === 'foto' ? fotoDraft : g.foto
                });
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
    $('edit-foto-grup').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file || editAktif !== 'foto') return;
        const proses = ++versiFoto,
            id = infoId;
        fotoDiproses = true;
        $('simpan-foto-grup').disabled = true;
        const terbaru = () =>
            proses === versiFoto && id === infoId && editAktif === 'foto' && !info.hidden;
        try {
            const hasil = await olahFoto(file);
            if (!terbaru()) return;
            fotoDraft = hasil;
            avatar($('preview-foto-grup'), 'Grup', fotoDraft);
            status('status-info-grup', '');
        } catch (error) {
            if (terbaru()) status('status-info-grup', error.message, true);
        } finally {
            if (terbaru()) {
                fotoDiproses = false;
                $('simpan-foto-grup').disabled = false;
            }
        }
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
        $('btn-lanjut-grup').disabled = !a.pilihan.size || a.sibuk;
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
            a.kontak = kontakTerdaftar().filter((k) => !exclude.includes(k.id));
            const valid = new Set(a.kontak.map((k) => k.id));
            a.pilihan.forEach((id) => {
                if (!valid.has(id)) a.pilihan.delete(id);
            });
            const query = $('input-cari-anggota-grup').value.trim().toLowerCase();
            const hasil = a.kontak.filter((k) =>
                (k.nama + ' ' + k.hp).toLowerCase().includes(query)
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
                detail.append(el('small', '', typeof bio === 'string' && bio.trim() ? bio : k.hp));
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
                            ? 'Kontak tidak ditemukan.'
                            : 'Tidak ada kontak yang bisa ditambahkan.'
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
                foto: '',
                fotoProses: false,
                versiFoto: 0,
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
    $('btn-buat-grup').addEventListener('click', () => bukaAlur('baru'));
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
        if (!a || a.sibuk || !a.pilihan.size) return;
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
    $('input-foto-grup-baru').addEventListener('change', async (e) => {
        const a = alur,
            file = e.target.files[0];
        if (!a || !file || a.sibuk) return;
        const proses = ++a.versiFoto;
        a.fotoProses = true;
        $('btn-simpan-grup').disabled = true;
        try {
            const foto = await olahFoto(file);
            if (alur === a && proses === a.versiFoto) {
                a.foto = foto;
                avatar($('foto-grup-baru'), 'Grup', foto);
                status('status-buat-grup', '');
            }
        } catch (error) {
            if (alur === a && proses === a.versiFoto)
                status('status-buat-grup', error.message, true);
        } finally {
            if (alur === a && proses === a.versiFoto) {
                a.fotoProses = false;
                $('btn-simpan-grup').disabled = a.sibuk;
            }
        }
    });
    $('form-buat-grup').addEventListener('submit', async (e) => {
        e.preventDefault();
        const a = alur;
        if (!a || a.mode !== 'baru' || a.sibuk || a.fotoProses) return;
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
                foto: a.foto
            });
            if (alur === a) {
                tutupAlur(false, true);
                $('input-cari-grup').value = '';
                await segarkan();
                await bukaChat(g.id);
            }
        } catch (error) {
            if (alur === a) status('status-buat-grup', error.message, true);
        } finally {
            if (alur === a) {
                a.sibuk = false;
                $('btn-simpan-grup').disabled = a.fotoProses;
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
        if (infoId) keluarAtauHapus(infoId, grupAktif?.keluar ? 'hapus' : 'keluar');
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
            ['ngumpul_users', 'ngumpul_profil', 'ngumpul_kontak_' + userAktif.id].includes(e.key) ||
            e.key?.startsWith('ngumpul_media_')
        ) {
            segarkan();
            if (alur) renderPilihan();
        }
    });
    window.NgumpulGrupDasar = {
        layanan: layananGrup, ubah: ubahLokal, nama: namaAkun, avatar, avatarAnggota,
        kontak: kontakTerdaftar, aktivitas: teksAktivitas, kartu: kartuAwal, konfirmasi,
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
        seleksi(id, g) { aktif = id; grupAktif = g; },
        migrasi(id) { return ubahLokal(id, g => tetapkanPenerimaLama(g), false); }
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
