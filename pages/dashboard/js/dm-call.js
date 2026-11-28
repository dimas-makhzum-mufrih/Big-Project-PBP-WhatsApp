const NgumpulPanggilanDM = (() => {
    const idMe = getUserAktif().id;
    const api = NgumpulAuth.api;
    const riwayat = elDM('daftar-panggilan-dm');
    const statusRiwayat = elDM('status-riwayat-panggilan');
    const path = 'direct-calls';
    const statuses = { ringing: 'Berdering', active: 'Sedang berlangsung', missed: 'Tak terjawab', declined: 'Ditolak', ended: 'Selesai' };
    let current;
    let operation = false;
    let refreshVersion = 0;
    let refreshPending;
    let calls = [];
    let unsupported = false;
    const dismissed = new Set();

    const peerId = call => call.callerId === idMe ? call.recipientId : call.callerId;
    const target = id => getProfilChat(id).nama;
    const endpoint = call => path + '/' + encodeURIComponent(call.id);
    const errorMessage = error => {
        if (error.status === 404) return 'Layanan panggilan pribadi belum tersedia di server.';
        if (error.status === 409) return 'Panggilan sudah berakhir atau salah satu akun sedang dalam panggilan.';
        if (error.status === 503) return 'Layanan suara belum siap.';
        return NgumpulDM.label(error, 'Panggilan gagal. Coba lagi.');
    };

    function stopTracks(session) {
        const room = session.room;
        session.room = null;
        room?.disconnect().catch(() => {});
        session.media.replaceChildren();
    }

    function tutup(session, pesan) {
        if (current === session) current = null;
        clearTimeout(session.deadline);
        stopTracks(session);
        session.dialog.close();
        session.dialog.remove();
        if (pesan) tampilToastTema(pesan);
    }

    function updateStatus(session, text) {
        session.status.textContent = text;
    }

    function show(call, autoJoin) {
        const dialog = document.createElement('dialog');
        dialog.className = 'dm-dialog';
        const heading = document.createElement('h2');
        heading.id = 'judul-panggilan-dm';
        heading.textContent = (call.kind === 'video' ? 'Panggilan video' : 'Panggilan suara') + ' · ' + target(peerId(call));
        dialog.setAttribute('aria-labelledby', heading.id);
        const status = document.createElement('p');
        status.setAttribute('role', 'status');
        const media = document.createElement('div');
        media.className = 'dm-call-media';
        const actions = document.createElement('div');
        actions.className = 'dm-dialog-actions';
        const session = { call, dialog, status, media, actions, autoJoin };
        dialog.append(heading, status, media, actions);
        dialog.addEventListener('cancel', event => { event.preventDefault(); });
        document.body.append(dialog);
        current = session;
        dialog.showModal();
        renderCall(session);
        return session;
    }

    function renderCall(session) {
        if (current !== session) return;
        const call = session.call;
        const actions = session.actions;
        actions.replaceChildren();
        clearTimeout(session.deadline);
        const delay = Date.parse(call.expiresAt) - Date.now();
        if (delay <= 0) {
            dismissed.add(call.id);
            tutup(session, call.status === 'ringing' ? 'Panggilan tidak dijawab.' : 'Panggilan berakhir.');
            return;
        }
        session.deadline = setTimeout(() => renderCall(session), delay);
        if (call.status === 'ringing') {
            if (call.recipientId === idMe) {
                updateStatus(session, 'Panggilan masuk');
                actions.append(tombolDM('Terima', button => change(session, 'accept', button), 'dm-primary'),
                    tombolDM('Tolak', button => change(session, 'decline', button), 'dm-hangup'));
            } else {
                updateStatus(session, 'Menunggu jawaban…');
                actions.append(tombolDM('Batalkan', button => change(session, 'end', button), 'dm-hangup'));
            }
            return;
        }
        if (session.room || session.connecting || session.autoJoin) {
            if (!session.room && !session.connecting) { connect(session); return; }
            if (session.room) renderMediaControls(session);
        } else {
            if (!session.mediaError) updateStatus(session, 'Panggilan masih berlangsung.');
            actions.append(tombolDM('Gabung', () => connect(session), 'dm-primary'));
        }
        actions.append(tombolDM('Akhiri panggilan', button => change(session, 'end', button), 'dm-hangup'));
    }

    function renderMediaControls(session) {
        const room = session.room;
        const participant = room.localParticipant;
        const control = (label, off, property, toggle) => {
            const button = tombolDM(label, async btn => {
                btn.disabled = true;
                try {
                    await participant[toggle](!participant[property]);
                    if (current === session) renderCall(session);
                } catch {
                    updateStatus(session, 'Perangkat atau izin media tidak tersedia.');
                    btn.disabled = false;
                }
            });
            button.textContent = participant[property] ? off : label;
            button.setAttribute('aria-pressed', String(participant[property]));
            return button;
        };
        session.actions.append(
            control('Nyalakan mikrofon', 'Bisukan mikrofon', 'isMicrophoneEnabled', 'setMicrophoneEnabled'),
            control('Nyalakan kamera', 'Matikan kamera', 'isCameraEnabled', 'setCameraEnabled')
        );
        if (navigator.mediaDevices?.getDisplayMedia)
            session.actions.append(control('Bagikan layar', 'Hentikan berbagi layar', 'isScreenShareEnabled', 'setScreenShareEnabled'));
        if (!room.canPlaybackAudio) session.actions.append(tombolDM('Aktifkan audio', () => room.startAudio().catch(() => {
            updateStatus(session, 'Audio belum diizinkan oleh browser.');
        })));
    }

    async function connect(session) {
        if (session.connecting || session.room || current !== session) return;
        session.connecting = true;
        session.mediaError = false;
        session.autoJoin = false;
        updateStatus(session, 'Menyambungkan media…');
        renderCall(session);
        let signalEndpoint;
        try {
            const [{ Room, RoomEvent }, access] = await Promise.all([
                NgumpulLiveKit.load(), api(endpoint(session.call) + '/token', { method: 'POST', includeOrigin: true })
            ]);
            if (current !== session) return;
            signalEndpoint = NgumpulLiveKit.resolveEndpoint(access);
            const room = new Room({ adaptiveStream: true, dynacast: true });
            session.room = room;
            const attach = (track, local = false) => {
                if (current !== session || !track) return;
                const element = track.attach();
                element.playsInline = true;
                if (local) element.muted = true;
                session.media.append(element);
            };
            const detach = track => track?.detach().forEach(element => element.remove());
            room.on(RoomEvent.TrackSubscribed, track => attach(track));
            room.on(RoomEvent.TrackUnsubscribed, detach);
            room.on(RoomEvent.LocalTrackPublished, pub => { if (pub.track?.kind === 'video') attach(pub.track, true); });
            room.on(RoomEvent.LocalTrackUnpublished, pub => detach(pub.track));
            room.on(RoomEvent.Reconnecting, () => {
                if (current === session) updateStatus(session, 'Menyambungkan ulang media…');
            });
            room.on(RoomEvent.Reconnected, () => {
                if (current === session) updateStatus(session, 'Terhubung');
            });
            room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
                if (current === session && !session.connecting && session.room === room) renderCall(session);
            });
            room.on(RoomEvent.Disconnected, () => {
                if (current !== session || session.room !== room) return;
                session.room = null;
                session.media.replaceChildren();
                session.mediaError = true;
                updateStatus(session, 'Koneksi media terputus.');
                renderCall(session);
            });
            await room.connect(signalEndpoint, access.token);
            if (current !== session) { await room.disconnect(); return; }
            updateStatus(session, 'Terhubung');
            try {
                await room.localParticipant.setMicrophoneEnabled(true);
                if (current === session && session.call.kind === 'video') await room.localParticipant.setCameraEnabled(true);
            } catch {
                if (current === session) updateStatus(session, 'Terhubung. Aktifkan perangkat dari kontrol panggilan.');
            }
        } catch (error) {
            if (current === session) {
                stopTracks(session);
                session.mediaError = true;
                updateStatus(session, NgumpulLiveKit.describeError(error, signalEndpoint) ||
                    (error.status ? errorMessage(error) : error.message || 'Media gagal tersambung. Coba gabung lagi.'));
            }
        } finally {
            session.connecting = false;
            if (current === session) renderCall(session);
        }
    }

    function update(call) {
        if (!current || current.call.id !== call.id) return;
        const session = current;
        const was = session.call.status;
        if (!['ringing', 'active'].includes(call.status)) {
            dismissed.add(call.id);
            tutup(session, call.status === 'declined' ? 'Panggilan ditolak.' :
                call.status === 'missed' ? 'Panggilan tidak dijawab.' : 'Panggilan berakhir.');
            return;
        }
        if (was === 'active' && call.status === 'ringing') return;
        session.call = call;
        if (was !== call.status) renderCall(session);
    }

    async function change(session, action, button) {
        if (operation || current !== session) return;
        operation = true;
        button.disabled = true;
        const call = session.call;
        if (action === 'accept') session.autoJoin = true;
        if (action === 'end') {
            dismissed.add(call.id);
            tutup(session);
        }
        try {
            const result = await api(endpoint(call), { method: 'PATCH', body: { action } });
            update(result.call);
        } catch (error) {
            if (current === session) {
                session.autoJoin = call.callerId === idMe;
                updateStatus(session, errorMessage(error));
            } else tampilToastTema(errorMessage(error));
        } finally {
            operation = false;
            button.disabled = false;
            refresh();
        }
    }

    function renderHistory() {
        riwayat.replaceChildren(...calls.map(call => {
            const row = document.createElement('div');
            row.className = 'dm-call-row';
            const heading = document.createElement('strong');
            heading.textContent = target(peerId(call));
            const meta = document.createElement('p');
            meta.textContent = [call.callerId === idMe ? 'Keluar' : 'Masuk', call.kind === 'video' ? 'Video' : 'Suara',
                statuses[call.status], new Date(call.createdAt).toLocaleString('id-ID')].join(' · ');
            row.append(heading, meta);
            if (NgumpulTeman.get(peerId(call))) {
                if (call.status === 'active' && !dismissed.has(call.id)) row.append(tombolDM('Lanjutkan', () => {
                    if (!current) show(call, false);
                }));
                else if (call.status !== 'ringing') row.append(tombolDM('Telepon kembali', () => start(peerId(call), call.kind === 'video')));
            }
            return row;
        }));
    }

    function refresh() {
        if (refreshPending) return refreshPending;
        const version = ++refreshVersion;
        refreshPending = (async () => {
            try {
                const data = await api(path);
                if (version !== refreshVersion) return;
                unsupported = false;
                calls = data.calls;
                if (current) {
                    const row = calls.find(item => item.id === current.call.id);
                    if (row && !(operation && row.status === 'ringing')) update(row);
                } else if (!operation) {
                    const incoming = calls.find(item => item.recipientId === idMe && item.status === 'ringing' && !dismissed.has(item.id));
                    if (incoming) show(incoming, false);
                }
                renderHistory();
                statusRiwayat.textContent = calls.length ? '' : 'Belum ada panggilan pribadi.';
            } catch (error) {
                unsupported = [404, 405].includes(error.status);
                statusRiwayat.textContent = errorMessage(error);
            }
        })().finally(() => { refreshPending = null; });
        return refreshPending;
    }

    async function start(peer, video = false) {
        if (!NgumpulTeman.get(peer) || operation) return;
        if (current) {
            tampilToastTema('Selesaikan panggilan yang sedang berlangsung.');
            return;
        }
        operation = true;
        ++refreshVersion;
        try {
            const { call } = await api(path + '/peer/' + encodeURIComponent(peer), {
                method: 'POST', body: { kind: video ? 'video' : 'audio' }
            });
            show(call, true);
        } catch (error) { tampilToastTema(errorMessage(error)); }
        finally {
            operation = false;
            if (refreshPending) await refreshPending;
            refresh();
        }
    }

    for (const [id, video] of [['btn-suara-dm', false], ['btn-video-dm', true]]) {
        elDM(id).addEventListener('click', () => start(chatAktifId, video));
    }
    document.addEventListener('ngumpul:tab-dashboard', event => {
        if (event.detail.tabAktif === 'telepon') refresh();
    });
    NgumpulDM.events.addEventListener('user-event', ({ detail }) => {
        if (detail.type === 'direct_call') {
            if (refreshPending) {
                ++refreshVersion;
                refreshPending.then(refresh);
            } else refresh();
        } else if (detail.type === 'connected' && !unsupported) refresh();
    });
    document.addEventListener('ngumpul:halaman-siap', () => {
        refresh();
        setInterval(() => { if (!unsupported) refresh(); }, 12000);
    }, { once: true });
    window.addEventListener('pagehide', () => {
        if (!current) return;
        const session = current;
        tutup(session);
        api(endpoint(session.call), { method: 'PATCH', body: { action: session.call.status === 'ringing' &&
            session.call.recipientId === idMe ? 'decline' : 'end' }, keepalive: true }).catch(() => {});
    });

    return { start };
})();
