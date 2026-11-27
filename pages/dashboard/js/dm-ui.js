const elDM = id => document.getElementById(id);
const statusDM = elDM('status-dm');
const muatUlangDM = elDM('muat-ulang-dm');
const indikatorKetikDM = elDM('dm-typing');
const statusPresenceDM = elDM('dm-presence');
let timerKetikDM;
let idDraftTerakhir;

function setStatusDM(peer, pesan, retry = false) {
    if (peer !== chatAktifId) return;
    statusDM.textContent = pesan;
    muatUlangDM.hidden = !retry;
}

function tampilkanErrorDM(peer, error) {
    setStatusDM(peer, NgumpulDM.label(error), true);
    if (error.status === 403) NgumpulTeman.muat().catch(() => {});
}

function tampilkanPresenceDM(peer, presence) {
    if (peer !== chatAktifId) return;
    const label = presence?.status === 'online' ? 'Online' : presence?.status === 'away'
        ? 'Sedang tidak aktif' : presence?.lastSeenAt ? 'Terakhir dilihat ' + new Date(presence.lastSeenAt).toLocaleString('id-ID') : '';
    statusPresenceDM.textContent = label;
    statusPresenceDM.hidden = !label;
}

async function bukaPercakapanDM(peer) {
    clearTimeout(timerKetikDM);
    indikatorKetikDM.hidden = true;
    tampilkanPresenceDM(peer);
    NgumpulAuth.api('presence/' + encodeURIComponent(peer)).then(({ presence }) => {
        tampilkanPresenceDM(peer, presence);
    }).catch(() => {});
    setStatusDM(peer, NgumpulDM.isLoaded(peer) ? '' : 'Memuat riwayat…');
    NgumpulDM.open(peer);
    NgumpulDM.pins(peer).catch(() => {});
    NgumpulDM.preference(peer).catch(() => {});
    try {
        await NgumpulDM.refresh(peer);
        setStatusDM(peer, '');
    } catch (error) { tampilkanErrorDM(peer, error); }
}

async function muatPesanLamaDM(peer, tombol) {
    tombol.disabled = true;
    try { await NgumpulDM.older(peer); }
    catch (error) {
        tombol.disabled = false;
        setStatusDM(peer, NgumpulDM.label(error));
    }
}

async function lompatKePesanDM(peer, id) {
    try {
        const ada = await NgumpulDM.locate(peer, id);
        if (chatAktifId !== peer) return;
        const baris = ada && [...boxListPesan.querySelectorAll('.message-row')]
            .find(item => item.dataset.messageId === id);
        if (!baris) { setStatusDM(peer, 'Pesan tidak tersedia.'); return; }
        baris.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
        for (const node of boxListPesan.querySelectorAll('.pesan-cari-terpilih')) node.classList.remove('pesan-cari-terpilih');
        baris.classList.add('pesan-cari-terpilih');
        clearTimeout(timerSorotPesanCari);
        timerSorotPesanCari = setTimeout(() => baris.classList.remove('pesan-cari-terpilih'), 1400);
    } catch (error) { setStatusDM(peer, NgumpulDM.label(error)); }
}

function tombolDM(teks, tindakan, kelas = '') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'dm-button ' + kelas;
    button.textContent = teks;
    button.addEventListener('click', () => tindakan(button));
    return button;
}

async function unduhLampiranDM(id, button) {
    if (!id || button.disabled) return;
    const peer = chatAktifId;
    button.disabled = true;
    try {
        const url = await NgumpulDM.download(id);
        const link = document.createElement('a');
        link.href = url;
        link.rel = 'noreferrer';
        link.download = '';
        link.click();
    } catch (error) { setStatusDM(peer, NgumpulDM.label(error, 'Lampiran gagal diunduh.')); }
    finally { button.disabled = false; }
}

function buatLampiranDM(item) {
    const container = document.createElement('div');
    container.className = 'dm-content';
    const jenis = item.file?.mimeType?.split('/')[0];
    if ((jenis === 'audio' || jenis === 'video') && item.file.previewUrl) {
        const player = document.createElement(jenis);
        player.src = item.file.previewUrl;
        player.controls = true;
        player.preload = 'none';
        player.playsInline = true;
        container.append(player);
    }
    container.append(tombolDM(item.file?.fileName || 'Unduh lampiran', button => unduhLampiranDM(item.attachmentId, button)));
    return container;
}

function buatLokasiDM(location) {
    const link = document.createElement('a');
    link.className = 'dm-content';
    link.href = 'https://www.openstreetmap.org/?' + new URLSearchParams({ mlat: location.lat, mlon: location.lng });
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = location.label || 'Lihat lokasi di peta';
    return link;
}

function buatPollingDM(peer, item, tindakan = {}) {
    const node = document.createElement('div');
    node.className = 'dm-content dm-poll';
    const poll = item.poll;
    const question = document.createElement('strong');
    question.textContent = poll.question;
    node.append(question);
    const path = 'polls/' + encodeURIComponent(poll.id);
    async function update(button, suffix, options) {
        button.disabled = true;
        try {
            const data = await NgumpulAuth.api(path + suffix, options);
            if (tindakan.update) tindakan.update(data.poll);
            else NgumpulDM.updatePoll(peer, item.id, data.poll);
        } catch (error) {
            if (tindakan.error) tindakan.error(error);
            else setStatusDM(peer, NgumpulDM.label(error));
            button.disabled = false;
        }
    }
    const closed = poll.closedAt || (poll.closesAt && Date.parse(poll.closesAt) < Date.now());
    const votes = poll.options.filter(option => option.votedByMe);
    for (const option of poll.options) {
        const button = tombolDM(option.label + ' · ' + option.votes, btn => update(btn, '/votes', {
            method: 'POST', body: { optionId: option.id }
        }));
        button.setAttribute('aria-pressed', String(option.votedByMe));
        button.disabled = Boolean(closed || option.votedByMe);
        node.append(button);
    }
    if (closed) node.append(document.createTextNode('Polling ditutup'));
    else {
        if (votes.length) node.append(tombolDM('Tarik suara', button => update(button, '/votes', { method: 'DELETE' })));
        if (item.sender === userAktif.id || tindakan.manage) node.append(tombolDM('Tutup polling', button => update(button, '/close', { method: 'POST' })));
    }
    return node;
}

function dialogDM(title, isi, submitLabel, jalankan) {
    const dialog = document.createElement('dialog');
    dialog.className = 'dm-dialog';
    const form = document.createElement('form');
    const heading = document.createElement('h2');
    heading.textContent = title;
    heading.id = 'dm-dialog-' + buatIdPesan();
    dialog.setAttribute('aria-labelledby', heading.id);
    const content = document.createElement('div');
    content.hidden = !isi;
    if (isi) content.append(isi);
    const error = document.createElement('p');
    error.setAttribute('role', 'alert');
    const actions = document.createElement('div');
    actions.className = 'dm-dialog-actions';
    const cancel = tombolDM(jalankan ? 'Batal' : 'Tutup', () => dialog.close());
    actions.append(cancel);
    if (jalankan) {
        const submit = document.createElement('button');
        submit.type = 'submit';
        submit.className = 'dm-button dm-primary';
        submit.textContent = submitLabel;
        actions.append(submit);
        dialog.addEventListener('cancel', event => { if (submit.disabled) event.preventDefault(); });
        form.addEventListener('submit', async event => {
            event.preventDefault();
            if (submit.disabled) return;
            submit.disabled = cancel.disabled = true;
            error.textContent = '';
            submit.textContent = 'Memproses…';
            try {
                if (await jalankan(form, dialog) !== false) dialog.close();
            } catch (cause) {
                error.textContent = cause instanceof TypeError || cause.status ? NgumpulDM.label(cause) : cause.message;
            } finally {
                submit.disabled = cancel.disabled = false;
                submit.textContent = submitLabel;
            }
        });
    }
    form.append(heading, content, error, actions);
    dialog.append(form);
    document.body.append(dialog);
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    dialog.showModal();
    return dialog;
}

function fieldDM(teks, options) {
    const label = document.createElement('label');
    label.textContent = teks;
    const field = document.createElement(options.tag || 'input');
    const { tag, ...props } = options;
    Object.assign(field, props);
    if (options.type === 'checkbox') label.className = 'dm-checkbox';
    label.append(field);
    return label;
}

function buatFormDM(...children) {
    const node = document.createElement('div');
    node.className = 'dm-poll';
    node.append(...children);
    return node;
}

async function kirimTambahanDM(peer, reply, payload) {
    await NgumpulDM.send(peer, { ...payload, ...(reply ? { replyToMessageId: reply } : {}) });
    if (chatAktifId === peer && idBalasanAktif === reply) batalkanBalasanPesan();
}

function lampirkanFileDM(file, peer = chatAktifId) {
    if (!peer || !file) return;
    const reply = idBalasanAktif;
    const pending = {};
    const nama = document.createElement('p');
    nama.textContent = file.name;
    const caption = fieldDM('Keterangan', { name: 'text', maxLength: 4000 });
    let previewUrl;
    const body = buatFormDM(nama, caption);
    if (/^(audio|video)\//.test(file.type)) {
        const preview = document.createElement(file.type.split('/')[0]);
        previewUrl = URL.createObjectURL(file);
        preview.controls = true;
        preview.src = previewUrl;
        body.insertBefore(preview, caption);
    }
    const dialog = dialogDM('Kirim lampiran', body, 'Kirim', async form => {
        const attachmentId = await NgumpulDM.upload(peer, file, pending);
        await kirimTambahanDM(peer, reply, { attachmentId, text: form.elements.text.value.trim() });
    });
    dialog.addEventListener('close', () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, { once: true });
}

function bukaLokasiDM(peer, send) {
    const reply = idBalasanAktif;
    send ||= payload => kirimTambahanDM(peer, reply, payload);
    const lat = fieldDM('Lintang', { name: 'lat', type: 'number', min: -90, max: 90, step: 'any', required: true });
    const lng = fieldDM('Bujur', { name: 'lng', type: 'number', min: -180, max: 180, step: 'any', required: true });
    const pesan = document.createElement('p');
    pesan.setAttribute('role', 'status');
    const gunakan = tombolDM('Gunakan lokasi saya', button => {
        if (!navigator.geolocation) { pesan.textContent = 'Browser tidak mendukung lokasi.'; return; }
        button.disabled = true;
        navigator.geolocation.getCurrentPosition(({ coords }) => {
            lat.lastElementChild.value = coords.latitude;
            lng.lastElementChild.value = coords.longitude;
            pesan.textContent = 'Lokasi diisi. Tekan Kirim untuk membagikannya.';
            button.disabled = false;
        }, () => {
            pesan.textContent = 'Lokasi tidak tersedia. Kamu bisa mengisi koordinat.';
            button.disabled = false;
        }, { timeout: 10000 });
    });
    const body = buatFormDM(gunakan, pesan, lat, lng, fieldDM('Label lokasi', { name: 'name', maxLength: 200 }));
    dialogDM('Bagikan lokasi', body, 'Kirim', form => send({
        location: { lat: Number(form.elements.lat.value), lng: Number(form.elements.lng.value), label: form.elements.name.value.trim() }
    }));
}

function bukaPollingDM(peer, send) {
    const reply = idBalasanAktif;
    send ||= payload => kirimTambahanDM(peer, reply, payload);
    const body = buatFormDM(
        fieldDM('Pertanyaan', { name: 'question', maxLength: 300, required: true }),
        fieldDM('Pilihan, satu per baris', { tag: 'textarea', name: 'options', rows: 4, required: true, maxLength: 1212 }),
        fieldDM('Boleh pilih lebih dari satu', { name: 'multiple', type: 'checkbox' }),
        fieldDM('Suara anonim', { name: 'anonymous', type: 'checkbox' })
    );
    dialogDM('Buat polling', body, 'Kirim', form => {
        const options = form.elements.options.value.split('\n').map(value => value.trim()).filter(Boolean);
        const question = form.elements.question.value.trim();
        if (!question || options.length < 2 || options.length > 12 || options.some(value => value.length > 100))
            throw new Error('Isi pertanyaan dan 2–12 pilihan. Setiap pilihan maksimal 100 karakter.');
        return send({
            poll: { question, options, allowMultiple: form.elements.multiple.checked, anonymous: form.elements.anonymous.checked }
        });
    });
}

function pilihKontakDM(peer) {
    const reply = idBalasanAktif;
    const label = fieldDM('Teman', { tag: 'select', name: 'contact', required: true });
    const select = label.lastElementChild;
    for (const contact of NgumpulTeman.list().filter(item => item.username)) {
        const option = document.createElement('option');
        option.value = contact.userId;
        option.textContent = NgumpulTeman.nama(contact) + ' · ' + NgumpulTeman.username(contact);
        select.append(option);
    }
    dialogDM('Bagikan username', label, 'Bagikan', form => {
        const contact = NgumpulTeman.get(form.elements.contact.value);
        if (!contact?.username) throw new Error('Pilih teman yang punya username.');
        return kirimTambahanDM(peer, reply, { text: NgumpulTeman.username(contact) });
    });
}

let rekamanDM;
function sedangMerekamDM() {
    return rekamanDM?.recorder?.state === 'recording';
}
function batalRekamDM() {
    if (!rekamanDM) return;
    const session = rekamanDM;
    rekamanDM = null;
    if (session.recorder?.state === 'recording') session.recorder.stop();
    session.stream?.getTracks().forEach(track => track.stop());
    elDM('btn-mic').setAttribute('aria-label', 'Rekam pesan suara');
    elDM('btn-mic').setAttribute('aria-pressed', 'false');
    perbaruiTombolKirim();
}

elDM('btn-mic').addEventListener('click', async () => {
    if (rekamanDM?.recorder?.state === 'recording') {
        rekamanDM.simpan = true;
        batalRekamDM();
        return;
    }
    const peer = chatAktifId;
    if (!peer || rekamanDM) return;
    const session = { peer };
    rekamanDM = session;
    try {
        session.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (rekamanDM !== session || peer !== chatAktifId) {
            session.stream.getTracks().forEach(track => track.stop());
            return;
        }
        const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus']
            .find(type => MediaRecorder.isTypeSupported(type));
        session.recorder = new MediaRecorder(session.stream, mimeType ? { mimeType } : {});
        const chunks = [];
        session.recorder.addEventListener('dataavailable', event => chunks.push(event.data));
        session.recorder.addEventListener('stop', () => {
            if (!session.simpan || peer !== chatAktifId) return;
            const type = session.recorder.mimeType.split(';')[0];
            const file = new File(chunks, 'pesan-suara.' + (type.split('/')[1] || 'webm'), { type });
            if (file.size) lampirkanFileDM(file, peer);
            setStatusDM(peer, '');
        });
        session.recorder.start();
        elDM('btn-mic').setAttribute('aria-label', 'Selesai merekam');
        elDM('btn-mic').setAttribute('aria-pressed', 'true');
        perbaruiTombolKirim();
        setStatusDM(peer, 'Merekam suara… Tekan mikrofon untuk selesai.');
    } catch {
        batalRekamDM();
        setStatusDM(peer, 'Mikrofon atau perekam suara tidak tersedia.');
    }
});
document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && rekamanDM) {
        batalRekamDM();
        setStatusDM(chatAktifId, 'Rekaman dibatalkan.');
    }
});
window.addEventListener('pagehide', batalRekamDM);

const inputFileDM = elDM('input-file-dm');
const inputKameraDM = elDM('input-kamera-dm');
for (const input of [inputFileDM, inputKameraDM]) input.addEventListener('change', () => {
    const file = input.files[0];
    if (input === inputKameraDM && file?.type.startsWith('image/')) tambahFileKeAntrean([file]);
    else lampirkanFileDM(file);
    input.value = '';
});
for (const [fitur, action] of Object.entries({
    dokumen: () => inputFileDM.click(),
    kamera: () => inputKameraDM.click(),
    kontak: pilihKontakDM,
    polling: bukaPollingDM,
    lokasi: bukaLokasiDM
})) document.querySelector('[data-fitur="lampir-' + fitur + '"]').addEventListener('click', () => {
    if (!chatAktifId || chatTerblokir(chatAktifId)) return;
    tutupPanelLampiran();
    action(chatAktifId);
});

function jadwalDM(peer) {
    jadwalkanPesan('direct', peer, inputTeksKirim.value.trim(), idBalasanAktif, () =>
        setStatusDM(peer, 'Pesan dijadwalkan.'));
}

function jadwalkanPesan(scope, targetId, current, reply, selesai) {
    const body = buatFormDM(fieldDM('Pesan', {
        tag: 'textarea', name: 'text', maxLength: 4000, required: true, rows: 4, value: current
    }), fieldDM('Jadwal kirim', { name: 'time', type: 'datetime-local', required: true }));
    dialogDM('Jadwalkan pesan', body, 'Jadwalkan', async form => {
        const scheduledFor = new Date(form.elements.time.value);
        if (!(scheduledFor.getTime() > Date.now() + 5000)) throw new Error('Pilih jadwal lebih dari 5 detik dari sekarang.');
        await NgumpulAuth.api('scheduled-messages', { method: 'POST', body: {
            scope, targetId, text: form.elements.text.value.trim(),
            scheduledFor: scheduledFor.toISOString(), ...(reply ? { replyToMessageId: reply } : {})
        } });
        selesai();
    });
}

function daftarJadwalDM(peer) {
    return daftarJadwal('direct', [userAktif.id, peer].sort().join(':'));
}

async function daftarJadwal(scope, targetId) {
    const path = 'scheduled-messages';
    const content = buatFormDM();
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    const list = document.createElement('div');
    content.append(status, list);
    dialogDM('Pesan terjadwal', content);
    async function load() {
        status.textContent = 'Memuat jadwal…';
        try {
            const { scheduledMessages } = await NgumpulAuth.api(path + '?' +
                new URLSearchParams({ scope, targetId }));
            list.replaceChildren(...scheduledMessages.map(item => {
                const row = document.createElement('div');
                row.className = 'dm-call-row';
                const text = document.createElement('strong');
                text.textContent = item.text || 'Lampiran';
                const label = document.createElement('p');
                const state = { pending: 'Menunggu', sent: 'Terkirim', failed: 'Gagal', canceled: 'Dibatalkan' };
                label.textContent = new Date(item.scheduledFor).toLocaleString('id-ID') + ' · ' + state[item.status];
                row.append(text, label);
                if (item.status === 'pending') {
                    const target = path + '/' + encodeURIComponent(item.id);
                    row.append(tombolDM('Batalkan', async button => {
                        button.disabled = true;
                        try { await NgumpulAuth.api(target, { method: 'DELETE' }); await load(); }
                        catch (error) { status.textContent = NgumpulDM.label(error); button.disabled = false; }
                    }), tombolDM('Ubah pesan', () => dialogDM('Ubah pesan terjadwal',
                        fieldDM('Pesan', { tag: 'textarea', rows: 4, maxLength: 4000, name: 'text', required: true, value: item.text || '' }),
                        'Simpan', async form => {
                            await NgumpulAuth.api(target, { method: 'PATCH', body: { text: form.elements.text.value.trim() } });
                            await load();
                        })));
                }
                return row;
            }));
            status.textContent = scheduledMessages.length ? '' : 'Belum ada pesan terjadwal.';
        } catch (error) { status.textContent = NgumpulDM.label(error); }
    }
    await load();
}

function opsiDM(peer) {
    const preference = NgumpulDM.getPreference(peer);
    const check = (label, key, checked) => {
        const node = fieldDM(label, { name: key, type: 'checkbox', checked: Boolean(checked) });
        node.className = 'dm-checkbox';
        return node;
    };
    const expiry = fieldDM('Pesan sementara (detik)', {
        name: 'expiry', type: 'number', min: 5, max: 604800, step: 1, value: preference.disappearingSeconds || ''
    });
    const notification = fieldDM('Notifikasi', { tag: 'select', name: 'notification' });
    for (const [value, label] of [['all', 'Semua pesan'], ['mentions', 'Hanya sebutan'], ['none', 'Tidak ada']]) {
        notification.lastElementChild.append(new Option(label, value, false, (preference.notificationLevel || 'all') === value));
    }
    const body = buatFormDM(
        check('Favorit', 'favorite', preference.favorite),
        check('Arsipkan', 'archived', preference.archived),
        check('Tandai belum dibaca', 'unread', preference.markedUnread),
        check('Bisukan selama 24 jam', 'mute', Date.parse(preference.mutedUntil) > Date.now()),
        notification,
        expiry,
        tombolDM('Lihat pesan disematkan', async () => {
            try {
                await NgumpulDM.pins(peer);
                const daftar = buatFormDM();
                const pins = NgumpulDM.readPins(peer);
                const panel = dialogDM('Pesan disematkan', daftar);
                if (!pins.length) daftar.textContent = 'Belum ada sematan.';
                for (const item of pins) daftar.append(tombolDM(ringkasanPesan(item), () => {
                    panel.close();
                    body.closest('dialog')?.close();
                    lompatKePesanDM(peer, item.id);
                }));
            } catch (error) { setStatusDM(peer, NgumpulDM.label(error)); }
        }),
        tombolDM('Jadwalkan pesan', () => jadwalDM(peer)),
        tombolDM('Lihat pesan terjadwal', () => daftarJadwalDM(peer))
    );
    dialogDM('Opsi percakapan', body, 'Simpan', form => NgumpulDM.preference(peer, {
        favorite: form.elements.favorite.checked, archived: form.elements.archived.checked,
        markedUnread: form.elements.unread.checked,
        ...(form.elements.mute.checked ? { muteForSeconds: 86400 } : { mutedUntil: null }),
        notificationLevel: form.elements.notification.value,
        disappearingSeconds: form.elements.expiry.value ? Number(form.elements.expiry.value) : null
    }));
}

elDM('btn-opsi-dm').addEventListener('click', async () => {
    const peer = chatAktifId;
    if (!peer) return;
    try {
        await NgumpulDM.preference(peer);
        if (peer === chatAktifId) opsiDM(peer);
    } catch (error) { setStatusDM(peer, NgumpulDM.label(error)); }
});

elDM('btn-arsip-dm').addEventListener('click', event => {
    tampilArsipDM = !tampilArsipDM;
    event.currentTarget.setAttribute('aria-pressed', String(tampilArsipDM));
    renderChatList();
});

elDM('btn-cari-semua-dm').addEventListener('click', () => {
    const results = buatFormDM();
    const body = buatFormDM(fieldDM('Kata kunci', { name: 'query', type: 'search', required: true, maxLength: 200 }), results);
    dialogDM('Cari semua pesan pribadi', body, 'Cari', async (form, dialog) => {
        const query = form.elements.query.value.trim();
        if (!query) throw new Error('Masukkan kata kunci.');
        const messages = await NgumpulDM.search(null, query);
        results.replaceChildren(...messages.map(item => tombolDM(
            getProfilChat(item.peer).nama + ' · ' + ringkasanPesan(item), () => {
                dialog.close();
                document.dispatchEvent(new CustomEvent('ngumpul:buka-chat', { detail: { idLawan: item.peer } }));
                lompatKePesanDM(item.peer, item.id);
            }
        )));
        if (!messages.length) results.textContent = 'Tidak ada pesan yang cocok.';
        return false;
    });
});

async function terjemahkanDM(text) {
    try {
        const { languages } = await NgumpulAuth.api('translations/languages');
        const language = fieldDM('Bahasa tujuan', { tag: 'select', name: 'language', required: true });
        languages.forEach(item => language.lastElementChild.append(new Option(item.name, item.code)));
        const result = document.createElement('p');
        result.setAttribute('role', 'status');
        dialogDM('Terjemahkan pesan', buatFormDM(language, result), 'Terjemahkan', async form => {
            const { translation } = await NgumpulAuth.api('translations', { method: 'POST', body: {
                text, targetLanguage: form.elements.language.value
            } });
            result.textContent = translation.text;
            return false;
        });
    } catch (error) {
        tampilToastTema(NgumpulDM.label(error, 'Layanan terjemahan tidak tersedia.'));
    }
}

elDM('btn-daftar-blokir').addEventListener('click', async () => {
    const content = buatFormDM();
    const status = document.createElement('p');
    content.append(status);
    const dialog = dialogDM('Daftar blokir', content);
    status.textContent = 'Memuat daftar…';
    try {
        const blocked = await NgumpulDM.loadBlocks();
        if (!dialog.open) return;
        status.textContent = blocked.length ? '' : 'Daftar blokir kosong.';
        for (const person of blocked) {
            const row = document.createElement('div');
            row.className = 'dm-call-row';
            row.append(document.createTextNode(NgumpulTeman.nama(person)), document.createElement('br'),
                tombolDM('Buka blokir', async button => {
                    button.disabled = true;
                    try {
                        await NgumpulDM.block(person.userId, false);
                        row.remove();
                        status.textContent = 'Blokir dibuka untuk ' + NgumpulTeman.nama(person) + '.';
                    } catch (error) {
                        status.textContent = NgumpulDM.label(error);
                        button.disabled = false;
                    }
                }));
            content.append(row);
        }
    } catch (error) { status.textContent = NgumpulDM.label(error); }
});

muatUlangDM.addEventListener('click', () => {
    if (chatAktifId) bukaPercakapanDM(chatAktifId);
});

const eventsDM = NgumpulDM.events;
eventsDM.addEventListener('change', ({ detail }) => {
    if (detail.peer === chatAktifId) {
        const posisi = boxListPesan.scrollTop;
        const tinggi = boxListPesan.scrollHeight;
        renderPesanAktif(true);
        if (detail.reason === 'older') boxListPesan.scrollTop = posisi + boxListPesan.scrollHeight - tinggi;
        renderPinPesanAktif();
    }
    renderChatList();
});
eventsDM.addEventListener('drafts', () => {
    const draft = bacaDrafChat(chatAktifId);
    if (draft && chatAktifId && chatAktifId !== idDraftTerakhir && !inputTeksKirim.value && !idBalasanAktif) {
        inputTeksKirim.value = draft.teks || '';
        idBalasanAktif = draft.reply;
        idDraftTerakhir = chatAktifId;
        perbaruiTombolKirim();
        renderPratinjauBalasan();
    }
    renderChatList();
});
eventsDM.addEventListener('draft-error', ({ detail }) => {
    setStatusDM(detail.peer, NgumpulDM.label(detail.error, 'Draf belum tersinkron.'));
});
eventsDM.addEventListener('socket-open', ({ detail }) => {
    if (detail.peer && statusDM.textContent.startsWith('Menyambungkan')) setStatusDM(detail.peer, '');
});
eventsDM.addEventListener('socket-retry', ({ detail }) => {
    if (detail.peer) setStatusDM(detail.peer, 'Menyambungkan ulang chat…');
});
eventsDM.addEventListener('socket-denied', ({ detail }) => {
    if (detail.peer) tampilkanErrorDM(detail.peer, { status: 403 });
});
eventsDM.addEventListener('load-error', ({ detail }) => tampilkanErrorDM(detail.peer, detail.error));
eventsDM.addEventListener('user-event', ({ detail: event }) => {
    if (event.type === 'presence') tampilkanPresenceDM(event.userId, event);
    if (event.type === 'typing' && event.scope === 'direct' && event.userId === chatAktifId) {
        clearTimeout(timerKetikDM);
        indikatorKetikDM.textContent = getProfilChat(chatAktifId).nama + ' sedang mengetik…';
        indikatorKetikDM.hidden = false;
        timerKetikDM = setTimeout(() => { indikatorKetikDM.hidden = true; }, Math.max(0, Date.parse(event.expiresAt) - Date.now()));
    }
    if (event.type === 'notification' && !event.notification.serverId &&
        ['direct_message', 'mention'].includes(event.notification.kind)) {
        const peer = event.notification.actorId;
        if (peer && peer !== chatAktifId && NgumpulTeman.get(peer)) {
            const load = NgumpulDM.isLoaded(peer) ? NgumpulDM.refresh : NgumpulDM.preview;
            load(peer).catch(() => {});
        }
    }
    if (event.type === 'scheduled_message' && event.event === 'sent' && event.scheduled.scope === 'direct') {
        const peer = NgumpulTeman.list().find(person =>
            event.scheduled.targetId === person.userId ||
            event.scheduled.targetId.split(':').includes(person.userId))?.userId;
        if (peer) NgumpulDM.refresh(peer).catch(() => {});
    }
});

document.addEventListener('ngumpul:teman-berubah', () => {
    NgumpulDM.loadInbox(NgumpulTeman.list().map(person => person.userId));
});
window.addEventListener('focus', () => {
    if (chatAktifId) NgumpulDM.refresh(chatAktifId).catch(() => {});
});
document.addEventListener('ngumpul:tab-dashboard', event => {
    if (event.detail.tabAktif === 'chat' && chatAktifId) tandaiPesanDibaca(chatAktifId);
    if (event.detail.tabAktif !== 'chat') batalRekamDM();
});
document.addEventListener('ngumpul:halaman-siap', () => {
    NgumpulDM.start();
    let jumlah;
    setInterval(() => {
        if (!chatAktifId) return;
        const sekarang = NgumpulDM.list(chatAktifId).length;
        if (jumlah !== undefined && sekarang < jumlah) renderPesanAktif(true);
        jumlah = sekarang;
    }, 2000);
}, { once: true });
