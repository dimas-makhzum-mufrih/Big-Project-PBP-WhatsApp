(() => {
    const el = id => document.getElementById(id);
    const panel = el('panel-tab-teman');
    const tambah = el('btn-tambah-teman');
    const panelTambah = el('panel-tambah-teman');
    const formCari = el('form-tambah-teman');
    const inputCari = el('cari-username-teman');
    const hasilCari = el('hasil-cari-teman');
    const filter = el('input-cari-teman');
    const status = el('status-teman');
    const statusMuat = el('status-muat-teman');
    const cobaLagi = el('segarkan-teman');
    const formUsername = el('form-username-teman');
    const inputUsername = el('username-teman');
    let permintaan = { incoming: [], outgoing: [] };
    let temanDimuat = false;
    let pemuatan;
    let sedangMengubah = false;
    let sedangMencari = false;
    let hasil = [];
    let kataCari = '';

    const polaUsername = /^[a-z0-9_]{3,24}$/;
    const formatUsername = nilai => nilai.trim().replace(/^@/, '').toLowerCase();
    const pesanErrorApi = {
        'User not found': 'Pengguna dengan username ini tidak ditemukan.',
        'Already friends': 'Kamu sudah berteman dengan pengguna ini.',
        'A friend request is already pending': 'Sudah ada permintaan pertemanan yang menunggu.',
        'Pending friend request not found': 'Permintaan ini sudah tidak menunggu tanggapan.',
        'Friend not found': 'Pertemanan ini sudah tidak tersedia.',
        'Friend requests are unavailable for this user': 'Permintaan ke pengguna ini tidak dapat dikirim.',
        'Username is already in use': 'Username sudah dipakai. Pilih username lain.',
        'You cannot add yourself as a friend': 'Kamu tidak bisa menambahkan akun sendiri.'
    };

    function pesanError(error, fallback) {
        if (error.status === 401) return 'Sesi berakhir. Silakan masuk kembali.';
        return pesanErrorApi[error.message] || NgumpulAuth.pesanError(error, fallback);
    }

    function tulisStatus(elemen, teks, error = false) {
        elemen.textContent = teks;
        elemen.dataset.error = String(error);
    }

    function buat(tag, kelas, isi) {
        const node = document.createElement(tag);
        node.className = kelas;
        if (isi) node.textContent = isi;
        return node;
    }

    function tombol(teks, aksi, label, kelas = '') {
        const node = buat('button', 'friend-action ' + kelas, teks);
        node.type = 'button';
        if (label) node.setAttribute('aria-label', label);
        if (aksi) {
            node.addEventListener('click', () => aksi(node));
        } else {
            node.disabled = true;
        }
        return node;
    }

    function kartu(orang, aksi, bukaProfil) {
        const nama = NgumpulTeman.nama(orang);
        const row = buat('div', 'contact-card');
        const avatar = buat(bukaProfil ? 'button' : 'div', 'contact-avatar');
        if (bukaProfil) {
            avatar.type = 'button';
            avatar.setAttribute('aria-label', 'Lihat profil ' + nama);
            avatar.addEventListener('click', bukaProfil);
        } else {
            avatar.setAttribute('aria-hidden', 'true');
        }
        NgumpulAvatar.render(avatar, nama, NgumpulTeman.foto(orang));
        const detail = buat('div', 'contact-details');
        detail.append(buat('strong', 'contact-name', nama));
        if (NgumpulTeman.punyaNamaTerpisah(orang)) {
            detail.append(buat('span', 'friend-username', NgumpulTeman.username(orang)));
        }
        const actions = buat('div', 'contact-card-actions');
        actions.append(...aksi);
        row.append(avatar, detail);
        const unreadCount = NgumpulTeman.jumlahBelumDibaca(orang);
        if (unreadCount) {
            const badge = buat('span', 'friend-unread-badge', unreadCount > 99 ? '99+' : String(unreadCount));
            badge.setAttribute('aria-label', unreadCount + ' pesan belum dibaca');
            row.append(badge);
        }
        row.append(actions);
        return row;
    }

    function panggil(id, video) {
        NgumpulPanggilanDM.start(id, video);
    }

    function renderTeman() {
        const daftar = el('daftar-teman');
        daftar.replaceChildren();
        if (!temanDimuat) return;
        const query = filter.value.trim().toLowerCase();
        const teman = NgumpulTeman.list()
            .filter(orang => [NgumpulTeman.nama(orang), NgumpulTeman.username(orang)]
                .some(teks => teks.toLowerCase().includes(query)))
            .sort((a, b) => NgumpulTeman.nama(a).localeCompare(NgumpulTeman.nama(b), 'id'));
        if (!teman.length) {
            daftar.append(buat('p', 'contact-empty', query
                ? 'Teman tidak ditemukan.'
                : 'Belum ada teman. Cari username untuk mengirim permintaan.'));
        }
        teman.forEach(orang => {
            const id = orang.userId;
            const nama = NgumpulTeman.nama(orang);
            daftar.append(kartu(orang, [
                tombol('Chat', () => document.dispatchEvent(new CustomEvent('ngumpul:buka-chat', {
                    detail: { idLawan: id }
                })), 'Chat dengan ' + nama, 'friend-primary'),
                tombol('Suara', () => panggil(id, false), 'Telepon suara ' + nama),
                tombol('Video', () => panggil(id, true), 'Panggilan video ' + nama),
                tombol('Hapus', node => {
                    if (!confirm('Hapus ' + nama + ' dari daftar teman?')) return;
                    ubah(node, 'Teman dihapus.', () => NgumpulAuth.api('friends/' + encodeURIComponent(id), {
                        method: 'DELETE'
                    }));
                }, 'Hapus teman ' + nama, 'friend-remove')
            ], () => tampilkanInfoKontak(id)));
        });
    }

    const aksiPermintaan = {
        accept: ['Terima', 'Permintaan diterima.'],
        decline: ['Tolak', 'Permintaan ditolak.'],
        cancel: ['Batalkan', 'Permintaan dibatalkan.']
    };

    function renderPermintaan(id, jenis, aksi) {
        const daftar = el('daftar-permintaan-' + id);
        daftar.replaceChildren(...permintaan[jenis].map(orang => kartu(orang, aksi.map(tindakan => {
            const [label, sukses] = aksiPermintaan[tindakan];
            return tombol(label, node => ubah(node, sukses, () => NgumpulAuth.api(
                'friends/requests/' + encodeURIComponent(orang.id) + '/' + tindakan, { method: 'POST' }
            )), label + ' permintaan untuk ' + NgumpulTeman.nama(orang),
            tindakan === 'accept' ? 'friend-primary' : '');
        }))));
        el('bagian-permintaan-' + id).hidden = !permintaan[jenis].length;
    }

    function kirimPermintaan(node, username) {
        return ubah(node, 'Permintaan pertemanan dikirim.', () => NgumpulAuth.api(
            'friends/requests', { method: 'POST', body: { username } }
        ));
    }

    function renderPencarian() {
        if (sedangMencari) return;
        hasilCari.replaceChildren();
        if (!kataCari) return;
        const tombolKirim = (orang, fallback = false) => {
            const orangSama = p => p.userId === orang.userId || p.username === orang.username;
            const teman = fallback ? NgumpulTeman.list().some(orangSama) : NgumpulTeman.get(orang.userId);
            if (teman) return tombol('Sudah berteman');
            if (permintaan.incoming.some(orangSama)) return tombol('Permintaan masuk');
            if (permintaan.outgoing.some(orangSama)) return tombol('Terkirim');
            const username = NgumpulTeman.username(orang);
            return tombol(fallback ? 'Kirim ke ' + username : 'Tambah',
                node => kirimPermintaan(node, orang.username), fallback ? '' : 'Tambah teman ' + username);
        };
        hasil.forEach(orang => hasilCari.append(kartu(orang, [tombolKirim(orang)])));
        if (!hasil.length) hasilCari.append(buat('p', 'contact-hint', 'Tidak ada pengguna publik yang cocok.'));
        if (polaUsername.test(kataCari) && !hasil.some(orang => orang.username === kataCari) &&
            kataCari !== getUserAktif().username) {
            hasilCari.append(tombolKirim({ username: kataCari }, true));
        }
    }

    function muat() {
        if (pemuatan) return pemuatan;
        tulisStatus(statusMuat, 'Memuat daftar teman dan permintaan…');
        cobaLagi.hidden = true;
        pemuatan = (async () => {
            const [daftar, masukKeluar] = await Promise.allSettled([
                NgumpulTeman.muat(),
                NgumpulAuth.api('friends/requests')
            ]);
            if (daftar.status === 'fulfilled') temanDimuat = true;
            if (masukKeluar.status === 'fulfilled') permintaan = masukKeluar.value;
            const error = [daftar, masukKeluar].find(item => item.status === 'rejected');
            tulisStatus(statusMuat, error ? pesanError(error.reason, 'Daftar teman atau permintaan gagal dimuat.') : '', !!error);
            cobaLagi.hidden = !error;
            cobaLagi.textContent = error?.reason.status === 401 ? 'Muat ulang sesi' : 'Muat ulang';
            renderTeman();
            renderPermintaan('masuk', 'incoming', ['accept', 'decline']);
            renderPermintaan('terkirim', 'outgoing', ['cancel']);
            renderPencarian();
        })().finally(() => { pemuatan = null; });
        return pemuatan;
    }

    async function ubah(node, sukses, tindakan) {
        if (sedangMengubah) return;
        sedangMengubah = true;
        node.disabled = true;
        tulisStatus(status, 'Memproses…');
        try {
            await tindakan();
            tulisStatus(status, sukses);
            if (pemuatan) await pemuatan;
            await muat();
            if (!panel.hidden && !node.isConnected && document.activeElement === document.body) filter.focus();
        } catch (error) {
            tulisStatus(status, pesanError(error, 'Perubahan gagal. Coba lagi.'), true);
            if (error.status === 404 || error.status === 409) {
                if (pemuatan) await pemuatan;
                await muat();
            }
        } finally {
            sedangMengubah = false;
            node.disabled = false;
        }
    }

    formCari.addEventListener('submit', async event => {
        event.preventDefault();
        const query = formatUsername(inputCari.value);
        if (!/^[a-z0-9_]{2,24}$/.test(query)) {
            tulisStatus(status, 'Masukkan 2–24 huruf, angka, atau garis bawah.', true);
            inputCari.focus();
            return;
        }
        const submit = formCari.querySelector('button');
        if (sedangMencari) return;
        sedangMencari = true;
        submit.disabled = true;
        hasilCari.replaceChildren(buat('p', 'contact-hint', 'Mencari pengguna…'));
        tulisStatus(status, '');
        try {
            const { users } = await NgumpulAuth.api('users/search?' + new URLSearchParams({ username: query }));
            kataCari = query;
            hasil = users;
        } catch (error) {
            kataCari = '';
            hasil = [];
            tulisStatus(status, pesanError(error, 'Pencarian gagal. Coba lagi.'), true);
        } finally {
            sedangMencari = false;
            submit.disabled = false;
            renderPencarian();
        }
    });

    function linkTeman(code) {
        const url = new URL(location.pathname, location.origin);
        url.hash = new URLSearchParams({ 'kode-teman': code });
        return url.href;
    }

    function kodeTeman(value) {
        const text = value.trim();
        let code = text;
        if (text.includes('://')) {
            try {
                const url = new URL(text);
                code = new URLSearchParams(url.hash.slice(1)).get('kode-teman') ||
                    url.searchParams.get('code') || url.pathname.match(/\/friends\/qr\/([^/]+)$/)?.[1];
            } catch (_) { throw new Error('Tautan teman tidak valid.'); }
        }
        if (!code || !/^[A-Za-z0-9_.-]{10,2048}$/.test(code)) throw new Error('Masukkan tautan atau kode teman yang valid.');
        return code;
    }

    async function pratinjauKode(code) {
        const { qr } = await NgumpulAuth.api('friends/qr/' + encodeURIComponent(code));
        const ringkasan = buat('p', '', NgumpulTeman.nama(qr.user));
        const label = buat('p', 'contact-hint', qr.alreadyFriends ? 'Kamu sudah berteman.' :
            qr.canRequest ? 'Kirim permintaan pertemanan ke akun ini.' : 'Permintaan pertemanan tidak tersedia.');
        dialogDM('Kode teman', buatFormDM(ringkasan, label), 'Kirim permintaan', qr.canRequest ? async () => {
            await NgumpulAuth.api('friends/qr/claim', { method: 'POST', body: { code } });
            tulisStatus(status, 'Permintaan pertemanan dikirim.');
            await muat();
        } : undefined);
    }

    el('btn-qr-saya').addEventListener('click', async event => {
        const button = event.currentTarget;
        button.disabled = true;
        try {
            const moduleUrl = new URL('../../assets/vendor/qrcode/qrcode-generator-2.0.4.mjs', location.href);
            const [{ qr }, { default: generator }] = await Promise.all([NgumpulAuth.api('friends/qr'), import(moduleUrl)]);
            const link = linkTeman(qr.code);
            const image = buat('img', 'friend-qr-image');
            image.alt = 'Kode QR untuk menambahkan ' + (qr.username || 'akun kamu');
            const code = generator(0, 'M');
            code.addData(link);
            code.make();
            image.src = code.createDataURL(5);
            dialogDM('QR teman', buatFormDM(image,
                fieldDM('Tautan teman', { name: 'link', readOnly: true, value: link }),
                buat('p', 'contact-hint', 'Berlaku sampai ' + new Date(qr.expiresAt).toLocaleTimeString('id-ID') + '.'),
                tombolDM('Salin tautan', async button => {
                    try { await navigator.clipboard.writeText(link); button.textContent = 'Tautan disalin'; }
                    catch (_) { button.closest('form').elements.link.select(); }
                })
            ));
        } catch (error) {
            tulisStatus(status, pesanError(error, 'QR teman gagal dibuat.'), true);
        } finally { button.disabled = false; }
    });

    el('btn-qr-teman').addEventListener('click', () => {
        dialogDM('Buka kode teman', buatFormDM(
            fieldDM('Tautan atau kode', { name: 'code', required: true, maxLength: 2048 })
        ), 'Lihat profil', async (form, dialog) => {
            const code = kodeTeman(form.elements.code.value);
            await pratinjauKode(code);
            dialog.close();
            return false;
        });
    });

    async function bukaKodeTertunda() {
        const hash = new URLSearchParams(location.hash.slice(1));
        const key = 'ngumpul_kode_teman_tertunda';
        const code = hash.get('kode-teman') || sessionStorage.getItem(key);
        if (!code) return;
        sessionStorage.removeItem(key);
        hash.delete('kode-teman');
        history.replaceState(null, '', location.pathname + location.search + (hash.size ? '#' + hash : ''));
        pilihTabDashboard('teman');
        try { await pratinjauKode(kodeTeman(code)); }
        catch (error) {
            tulisStatus(status, pesanError(error, error.status === 410 ? 'Kode teman sudah kedaluwarsa.' : 'Kode teman tidak bisa dibuka.'), true);
        }
    }
    document.addEventListener('ngumpul:halaman-siap', bukaKodeTertunda, { once: true });
    window.addEventListener('hashchange', bukaKodeTertunda);

    formUsername.hidden = !!getUserAktif().username;
    formUsername.addEventListener('submit', event => {
        event.preventDefault();
        const username = formatUsername(inputUsername.value);
        if (!polaUsername.test(username)) {
            tulisStatus(status, 'Username harus berisi 3–24 huruf, angka, atau garis bawah.', true);
            inputUsername.focus();
            return;
        }
        ubah(formUsername.querySelector('button'), 'Username disimpan.', async () => {
            const disimpan = await NgumpulAuth.simpanUsername(username);
            const label = el('setting-display-username');
            if (label) label.textContent = '@' + disimpan;
            formUsername.hidden = true;
            tambah.focus();
        });
    });

    tambah.addEventListener('click', () => {
        panelTambah.hidden = !panelTambah.hidden;
        tambah.setAttribute('aria-expanded', String(!panelTambah.hidden));
        if (!panelTambah.hidden) inputCari.focus();
    });
    filter.addEventListener('input', renderTeman);
    cobaLagi.addEventListener('click', () => {
        if (cobaLagi.textContent === 'Muat ulang sesi') location.reload();
        else muat();
    });
    document.addEventListener('ngumpul:tab-dashboard', event => {
        if (event.detail.tabAktif === 'teman' && !sedangMengubah) muat();
    });
    document.addEventListener('ngumpul:teman-berubah', () => {
        if (!panel.hidden && temanDimuat) renderTeman();
    });
    let timerPerbaruiUnread;
    NgumpulDM.events.addEventListener('change', ({ detail }) => {
        if (panel.hidden || !['created', 'receipt', 'preview', 'refresh'].includes(detail.reason)) return;
        clearTimeout(timerPerbaruiUnread);
        timerPerbaruiUnread = setTimeout(() => NgumpulTeman.muat().catch(() => {}), 300);
    });
    window.addEventListener('focus', () => {
        if (!panel.hidden && !sedangMengubah) muat();
    });

    muat();
})();
