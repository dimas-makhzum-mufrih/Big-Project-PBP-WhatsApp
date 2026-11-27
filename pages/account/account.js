(() => {
    const { api, sesiSekarang, ubahSandi } = NgumpulAuth;
    const dialog = document.getElementById('account-detail');
    const judul = dialog.querySelector('h2');
    const isi = dialog.querySelector('.account-detail-body');
    const status = dialog.querySelector('[role=status]');
    const el = (tag, text) => {
        const node = document.createElement(tag);
        if (text) node.textContent = text;
        return node;
    };
    let versi = 0;
    let sibuk = false;

    function tombol(label, action) {
        const button = el('button', label);
        button.type = 'button';
        button.onclick = () => jalankan(button, action);
        return button;
    }

    async function jalankan(button, action) {
        if (sibuk) return;
        sibuk = button.disabled = true;
        status.textContent = '';
        try { await action(); }
        catch (error) {
            status.textContent = NgumpulAuth.pesanError(error, error.status === 429
                ? 'Tunggu sebentar lalu coba lagi.' : 'Permintaan belum berhasil. Periksa masukan dan coba lagi.');
        } finally { sibuk = button.disabled = false; }
    }

    function formatTanggal(date) {
        return date ? new Date(date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
    }

    async function sessions(version, history) {
        const rows = await api('auth/list-sessions');
        if (version !== versi) return;
        isi.replaceChildren();
        const list = el('ul');
        for (const row of [...rows].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))) {
            const mine = sesiSekarang(row.token);
            const item = el('li');
            item.append(el('strong', mine ? 'Perangkat ini' : row.userAgent || 'Perangkat lain'),
                el('p', 'Masuk ' + formatTanggal(row.createdAt) + ' · Berlaku hingga ' + formatTanggal(row.expiresAt)));
            if (!mine && !history) item.append(tombol('Cabut sesi ini', async () => {
                await api('auth/revoke-session', { method: 'POST', body: { token: row.token } });
                await sessions(version, false);
                status.textContent = 'Sesi dicabut.';
            }));
            list.append(item);
        }
        if (history) isi.append(el('p', 'Aktivitas masuk dari sesi yang masih aktif.'));
        isi.append(list);
        if (!history && rows.some(row => !sesiSekarang(row.token))) isi.append(tombol('Keluar dari perangkat lain', async () => {
            await api('auth/revoke-other-sessions', { method: 'POST', body: {} });
            await sessions(version, false);
            status.textContent = 'Sesi perangkat lain dicabut.';
        }));
    }

    function password() {
        const form = el('form');
        for (const [name, label, auto] of [
            ['currentPassword', 'Kata sandi sekarang', 'current-password'],
            ['newPassword', 'Kata sandi baru', 'new-password'],
            ['confirmation', 'Ulangi kata sandi baru', 'new-password'],
        ]) {
            const field = el('label', label);
            const input = el('input');
            Object.assign(input, { type: 'password', name, autocomplete: auto,
                required: true, minLength: name === 'currentPassword' ? 1 : 8, maxLength: 128 });
            field.append(input);
            form.append(field);
        }
        const label = el('label', 'Cabut sesi perangkat lain');
        const checkbox = el('input');
        Object.assign(checkbox, { name: 'revokeOtherSessions', type: 'checkbox', checked: true });
        label.prepend(checkbox);
        label.className = 'account-checkbox';
        const submit = el('button', 'Simpan kata sandi');
        submit.type = 'submit';
        form.append(label, submit);
        form.onsubmit = event => {
            event.preventDefault();
            const { currentPassword, newPassword, confirmation, revokeOtherSessions } = form.elements;
            if (newPassword.value !== confirmation.value) {
                status.textContent = 'Kedua kata sandi baru harus sama.';
                confirmation.focus();
                return;
            }
            jalankan(submit, async () => {
                await ubahSandi({ currentPassword: currentPassword.value, newPassword: newPassword.value,
                    revokeOtherSessions: revokeOtherSessions.checked });
                form.reset();
                status.textContent = 'Kata sandi diperbarui.';
            });
        };
        isi.replaceChildren(form);
    }

    async function accounts(version) {
        const rows = await api('auth/list-accounts');
        if (version !== versi) return;
        const label = { google: 'Google', credential: 'Email dan kata sandi' };
        const list = el('ul');
        for (const row of rows) list.append(el('li', label[row.providerId] || row.providerId));
        isi.replaceChildren(el('p', NgumpulAuth.pengguna.email), list);
    }

    const actions = {
        keamanan: accounts,
        'ubah-sandi': password,
        perangkat: version => sessions(version, false),
        riwayat: version => sessions(version, true),
    };

    for (const row of document.querySelectorAll('.account-row-item')) {
        const action = actions[row.dataset.action];
        if (!action) continue;
        row.addEventListener('click', async () => {
            const version = ++versi;
            judul.textContent = row.querySelector('b').textContent;
            isi.replaceChildren();
            status.textContent = '';
            dialog.showModal();
            try { await action(version); }
            catch (error) { if (version === versi) status.textContent = error.message; }
        });
    }
    dialog.addEventListener('cancel', event => { if (sibuk) event.preventDefault(); });
    dialog.addEventListener('close', () => { versi++; });
    dialog.querySelector('.account-detail-close').onclick = () => { if (!sibuk) dialog.close(); };
    document.getElementById('btn-back-to-dashboard').onclick = () => {
        location.href = '../dashboard/dashboard.html#settings';
    };
})();
