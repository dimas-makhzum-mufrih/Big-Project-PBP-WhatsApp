window.NgumpulPreferensi = (() => {
    const { api } = NgumpulAuth;
    const $ = id => document.getElementById(id);
    const el = (tag, text = '') => {
        const node = document.createElement(tag);
        node.textContent = text;
        return node;
    };
    let prefs = {};
    let localTheme = NgumpulTheme.getTheme();
    let systemTheme = matchMedia('(prefers-color-scheme: dark)');
    let applyingTheme = false;
    let writes = Promise.resolve();
    let themeRevision = 0;
    const select = (label, name, choices, value) => {
        const field = fieldDM(label, { tag: 'select', name });
        for (const [key, text] of Object.entries(choices)) field.lastElementChild.add(new Option(text, key));
        field.lastElementChild.value = value;
        return field;
    };
    const checkbox = (label, name, checked) => fieldDM(label, { type: 'checkbox', name, checked });
    const notify = text => tampilToastTema(text);

    function apply(data) {
        prefs = data;
        document.documentElement.dataset.chatTextSize = data.textSize || 'medium';
        if (data.theme && ['light', 'dark'].includes(NgumpulTheme.getTheme())) {
            const next = data.theme === 'system' ? (systemTheme.matches ? 'dark' : 'light') : data.theme;
            if (NgumpulTheme.getTheme() !== next) {
                applyingTheme = true;
                NgumpulTheme.setTheme(next);
                applyingTheme = false;
            }
            localTheme = next;
        }
        renderChatList();
    }

    function save(body) {
        const pending = writes.then(async () => {
            const { preferences } = await api('preferences', { method: 'PUT', body });
            apply(preferences);
            return preferences;
        });
        writes = pending.catch(() => {});
        return pending;
    }

    document.addEventListener('ngumpul:tema-berubah', ({ detail }) => {
        if (applyingTheme || detail.tema === localTheme) return;
        localTheme = detail.tema;
        if (['dark', 'light'].includes(localTheme)) {
            themeRevision++;
            save({ theme: localTheme }).catch(error => notify(error.message));
        }
    });
    systemTheme.addEventListener('change', () => { if (prefs.theme === 'system') apply(prefs); });

    const setting = (key, action) => {
        const node = document.querySelector('.settings-row-item[data-fitur="' + key + '"]');
        if (!node) return;
        node.removeAttribute('title');
        node.setAttribute('role', 'button');
        node.tabIndex = 0;
        node.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); node.click(); }
        });
        node.addEventListener('click', () => Promise.resolve().then(action).catch(error => notify(error.message)));
    };
    const value = (form, key) => form.elements.namedItem(key).value;

    setting('privasi', async () => {
        const { privacy } = await api('privacy');
        const visibility = { everyone: 'Semua orang', friends: 'Teman', nobody: 'Tidak seorang pun' };
        const fields = { photoVisibility: 'Foto profil', onlineStatusVisibility: 'Status online', lastSeenVisibility: 'Terakhir dilihat' };
        dialogDM('Privasi', buatFormDM(
            ...Object.entries(fields).map(([name, label]) => select(label, name, visibility, privacy[name])),
            tombolDM('Daftar blokir', button => {
                button.closest('dialog').close();
                $('btn-daftar-blokir').click();
            })
        ), 'Simpan', async form => {
            await api('privacy', { method: 'PUT', body: Object.fromEntries(Object.keys(fields).map(key => [key, value(form, key)])) });
            notify('Privasi disimpan.');
        });
    });

    setting('chat', async () => {
        const { preferences: data } = await api('preferences');
        dialogDM('Pengaturan chat', buatFormDM(
            select('Tema dasar', 'theme', { system: 'Ikuti perangkat', light: 'Terang', dark: 'Gelap' }, data.theme),
            select('Ukuran teks pesan', 'textSize', { small: 'Kecil', medium: 'Sedang', large: 'Besar' }, data.textSize),
            select('Urutan chat', 'chatListSort', { recent: 'Terbaru', unread: 'Belum dibaca', name: 'Nama' }, data.chatListSort),
            select('Tampilkan chat', 'chatListFilter', { all: 'Semua', unread: 'Belum dibaca', favorites: 'Favorit' },
                ['unread', 'favorites'].includes(data.chatListFilter) ? data.chatListFilter : 'all')
        ), 'Simpan', async form => {
            const body = Object.fromEntries(['theme', 'textSize', 'chatListSort', 'chatListFilter'].map(key => [key, value(form, key)]));
            await save(body);
            applyingTheme = true;
            try { NgumpulTheme.setTheme(body.theme === 'system' ? (systemTheme.matches ? 'dark' : 'light') : body.theme); }
            finally { applyingTheme = false; }
            localTheme = NgumpulTheme.getTheme();
            notify('Pengaturan chat disimpan.');
        });
    });

    setting('panggilan', () => { tutupSetelan(); pilihTabDashboard('telepon'); });
    setting('grup-server', () => { tutupSetelan(); pilihTabDashboard('grup'); $('menu-grup-gabung').click(); });
    setting('bantuan', () => {
        dialogDM('Bantuan Ngumpul', buatFormDM(
            el('p', 'Buka Teman untuk mencari username atau menerima permintaan pertemanan.'),
            el('p', 'Buka Grup untuk menggunakan channel teks dan ruang suara.'),
            el('p', 'Untuk keamanan akun, buka Pengaturan lalu pilih Akun.')
        ));
    });

    async function restoreBackup(source, status) {
        const keys = ['directMessages', 'channelMessages', 'drafts'];
        const fields = ['directMessagesImported', 'channelMessagesImported', 'draftsImported', 'skipped'];
        const restored = Object.fromEntries(fields.map(key => [key, 0]));
        const pieces = [];
        const encoder = new TextEncoder();
        let chunk = { version: 1 };
        let size = 128;
        for (const key of keys) {
            if (!Array.isArray(source[key])) continue;
            for (const row of source[key]) {
                const length = encoder.encode(JSON.stringify(row)).length + 1;
                if (length > 950000) throw new Error('Ada entri cadangan yang melebihi batas ukuran.');
                if (size + length > 950000) {
                    pieces.push(chunk);
                    chunk = { version: 1 };
                    size = 128;
                }
                (chunk[key] ||= []).push(row);
                size += length;
            }
        }
        if (size > 128) pieces.push(chunk);
        for (const [index, backup] of pieces.entries()) {
            status.textContent = 'Memulihkan bagian ' + (index + 1) + ' dari ' + pieces.length + '…';
            try {
                const result = await api('backup/restore', { method: 'POST', body: { backup } });
                for (const field of fields) restored[field] += result.restored[field];
            } catch (error) {
                const completed = restored.directMessagesImported + restored.channelMessagesImported + restored.draftsImported;
                throw new Error('Pemulihan terhenti setelah ' + completed + ' entri. ' + error.message);
            }
        }
        return restored;
    }

    setting('penyimpanan', () => {
        const file = fieldDM('Pilih cadangan JSON', { name: 'backup', type: 'file', accept: '.json,application/json', required: true });
        const status = el('p');
        status.setAttribute('role', 'status');
        dialogDM('Cadangan akun', buatFormDM(
            tombolDM('Unduh cadangan', async button => {
                button.disabled = true;
                try {
                    const { backup } = await api('backup');
                    const link = el('a');
                    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
                    link.href = url;
                    link.download = 'ngumpul-cadangan-' + new Date().toLocaleDateString('sv-SE') + '.json';
                    link.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                } catch (error) { button.closest('form').querySelector('[role=alert]').textContent = error.message; }
                finally { button.disabled = false; }
            }),
            file,
            el('p', 'Pemulihan menambahkan pesan dan draf ke percakapan yang dapat kamu akses.'),
            status
        ), 'Pulihkan cadangan', async form => {
            const selected = form.elements.backup.files[0];
            if (!selected) return false;
            let backup;
            try { backup = JSON.parse(await selected.text()); }
            catch (_) { throw new Error('Pilih file cadangan Ngumpul yang valid.'); }
            if ((backup.backup || backup)?.version !== 1) throw new Error('Format cadangan tidak didukung.');
            try {
                const restored = await restoreBackup(backup.backup || backup, status);
                notify('Dipulihkan ' + (restored.directMessagesImported + restored.channelMessagesImported) + ' pesan dan '
                    + restored.draftsImported + ' draf.');
                NgumpulDM.loadInbox(NgumpulTeman.list().map(item => item.userId)).catch(() => {});
            } finally { status.textContent = ''; }
        });
    });

    async function settingsNotifikasi() {
        const { preferences } = await api('preferences');
        const fields = { notifyDirectMessages: 'Chat pribadi', notifyChannels: 'Pesan channel', notifyMentions: 'Sebutan @username' };
        dialogDM('Preferensi notifikasi', buatFormDM(...Object.entries(fields).map(([key, label]) =>
            checkbox(label, key, Boolean(preferences[key])))), 'Simpan', async form => {
            await save(Object.fromEntries(Object.keys(fields).map(key => [key, form.elements[key].checked])));
            notify('Preferensi notifikasi disimpan.');
        });
    }

    const history = tombolDM('Riwayat notifikasi', () => showNotifications());
    const notificationPanel = $('panel-setelan-notifikasi').querySelector('.notification-content');
    notificationPanel.append(tombolDM('Atur jenis notifikasi', () => settingsNotifikasi().catch(error => notify(error.message))), history);

    async function updateBadge() {
        try {
            const { unreadCount } = await api('notifications/unread-count');
            history.textContent = unreadCount ? 'Riwayat notifikasi (' + unreadCount + ')' : 'Riwayat notifikasi';
        } catch (_) {}
    }
    document.addEventListener('ngumpul:notifikasi-berubah', updateBadge);

    function showNotifications() {
        const list = el('div');
        const status = el('p');
        status.setAttribute('role', 'status');
        let cursor = null;
        let loading = false;
        const more = tombolDM('Muat lagi', () => load(false));
        const all = tombolDM('Tandai semua dibaca', () => mutate(all, 'notifications/read-all', 'POST'));
        const clear = tombolDM('Hapus notifikasi yang sudah dibaca', () => mutate(clear, 'notifications/read', 'DELETE'));
        const dialog = dialogDM('Riwayat notifikasi', buatFormDM(all, clear, status, list, more));
        async function mutate(button, path, method, open) {
            button.disabled = true;
            try {
                await api(path, { method });
                updateBadge();
                if (open) { dialog.close(); tutupSetelan(); await open(); }
                else await load(true);
            } catch (error) { status.textContent = error.message; }
            finally { button.disabled = false; }
        }
        async function load(reset) {
            if (loading) return;
            loading = more.disabled = true;
            status.textContent = 'Memuat…';
            try {
                const q = new URLSearchParams({ limit: '20' });
                if (!reset && cursor) q.set('before', cursor);
                const { notifications, nextCursor } = await api('notifications?' + q);
                if (reset) list.replaceChildren();
                cursor = nextCursor;
                more.hidden = !cursor;
                status.textContent = list.childElementCount || notifications.length ? '' : 'Belum ada notifikasi.';
                for (const item of notifications) {
                    const row = el('article');
                    row.className = 'settings-notification-item';
                    row.append(el('strong', item.title), el('p', item.body),
                        el('small', new Date(item.createdAt).toLocaleString('id-ID')));
                    const path = 'notifications/' + encodeURIComponent(item.id);
                    let open;
                    if (item.serverId && item.channelId) open = () => window.NgumpulRuang.open(item.serverId, item.channelId);
                    else if (item.kind === 'friend_request') open = () => pilihTabDashboard('teman');
                    else if (item.actorId && NgumpulTeman.get(item.actorId)) open = () => document.dispatchEvent(
                        new CustomEvent('ngumpul:buka-chat', { detail: { idLawan: item.actorId } }));
                    if (open) row.append(tombolDM('Buka', button => mutate(button, path + '/read', 'POST', open)));
                    if (!item.readAt) row.append(tombolDM('Tandai dibaca', button => mutate(button, path + '/read', 'POST')));
                    row.append(tombolDM('Hapus', button => mutate(button, path, 'DELETE')));
                    list.append(row);
                }
            } catch (error) { status.textContent = error.message; }
            finally { loading = more.disabled = false; }
        }
        load(true);
    }
    NgumpulDM.events.addEventListener('user-event', ({ detail }) => {
        if (['notification', 'read_state'].includes(detail.type)) updateBadge();
    });

    const shortcut = (feature, action) => {
        const button = document.querySelector('#box-dropdown-utama [data-fitur="' + feature + '"]');
        button.addEventListener('click', () => {
            $('box-dropdown-utama').style.display = 'none';
            pilihTabDashboard('chat');
            Promise.resolve().then(action).catch(error => notify(error.message));
        });
    };
    shortcut('berbintang', () => save({ chatListFilter: prefs.chatListFilter === 'favorites' ? 'all' : 'favorites' }));
    shortcut('tandai-baca', async () => {
        const friends = NgumpulTeman.list();
        const results = await Promise.allSettled(friends.map(({ userId }) => NgumpulDM.acknowledge(userId, 'read', true)));
        const groups = await window.NgumpulGrupData.list();
        const groupResults = await Promise.allSettled(groups.map(async g => {
            const counts = await window.NgumpulGrupData.unreadCounts(g);
            for (const [id, state] of Object.entries(counts)) if (state.unreadCount) await window.NgumpulGrupData.read(g, id, true);
        }));
        const failed = [...results, ...groupResults].some(result => result.status === 'rejected');
        notify(failed ? 'Sebagian percakapan gagal ditandai.' : 'Pesan ditandai sudah dibaca.');
    });
    shortcut('arsip', () => $('btn-arsip-dm').click());

    const revision = themeRevision;
    api('preferences').then(({ preferences }) => {
        if (themeRevision === revision) apply(preferences);
    }).catch(() => {});
    api('profile').then(({ profile }) => {
        const name = profile.displayName || userAktif.nama;
        simpanProfil(userAktif.id, { nama: name, bio: profile.bio || '' });
        $('setting-display-name').textContent = name;
        $('setting-display-bio').textContent = profile.bio || 'Tambah bio';
        const avatar = NgumpulAvatar.url(profile.avatar) || NgumpulAvatar.url(userAktif.avatar);
        if (avatar) {
            userAktif.avatar = avatar;
            const image = $('setting-img-avatar-output');
            const fallback = $('setting-default-user-icon');
            image.addEventListener('error', () => {
                image.style.display = 'none';
                fallback.style.display = '';
            }, { once: true });
            image.src = avatar;
            image.style.display = 'block';
            fallback.style.display = 'none';
        }
        if (profile.banner && /^https?:\/\//i.test(profile.banner))
            $('setting-banner-preview').style.backgroundImage = 'url(' + JSON.stringify(profile.banner) + ')';
    }).catch(() => {});
    updateBadge();

    return { get: () => prefs };
})();
