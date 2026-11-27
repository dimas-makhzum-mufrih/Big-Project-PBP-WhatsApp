const NgumpulDM = (() => {
    const events = new EventTarget();
    const rooms = new Map();
    const blocks = new Set();
    const drafts = new Map();
    const draftWrites = new Map();
    const pendingSends = new Map();
    const ownId = NgumpulAuth.pengguna.id;
    const api = NgumpulAuth.api;
    const enc = encodeURIComponent;
    const dm = id => 'direct-messages/' + enc(id);
    const pref = id => 'conversations/direct/' + enc(id);
    const emit = (type, detail) => events.dispatchEvent(new CustomEvent(type, { detail }));
    let activePeer;
    let dmConnection;
    let lastTypingSent = 0;
    let inboxLoad;
    const pendingPeers = new Set();
    const rank = { sent: 0, delivered: 1, read: 2 };

    function room(peer) {
        if (!rooms.has(peer)) rooms.set(peer, {
            messages: new Map(), attachments: new Map(), hidden: new Set(),
            pins: [], cursor: null, loaded: false, preference: {}, jobs: new Map()
        });
        return rooms.get(peer);
    }

    function label(error, fallback = 'Permintaan chat gagal. Coba lagi.') {
        if (error.status === 401) return 'Sesi berakhir. Silakan masuk kembali.';
        if (error.status === 403) return 'Percakapan tidak dapat diakses. Periksa pertemanan dan daftar blokir.';
        if (error.status === 413) return 'Lampiran melebihi batas ukuran.';
        if (error.status === 415) return 'Format lampiran ini tidak didukung.';
        return NgumpulAuth.pesanError(error, fallback);
    }

    function peerOf(message) {
        return message.senderId === ownId ? message.recipientId : message.senderId;
    }

    function put(peer, message) {
        if (!message?.id || room(peer).hidden.has(message.id)) return;
        const previous = room(peer).messages.get(message.id);
        if (previous?.updatedAt && message.updatedAt && previous.updatedAt > message.updatedAt) return;
        const merged = { ...previous, ...message };
        if (previous && rank[previous.status] > rank[message.status]) merged.status = previous.status;
        room(peer).messages.set(message.id, merged);
    }

    function attachment(peer, id) { return room(peer).attachments.get(id); }

    function view(peer, raw) {
        const file = attachment(peer, raw.attachmentId);
        const image = file?.mimeType?.startsWith('image/') ? file : null;
        return {
            id: raw.id, sender: raw.senderId, time: raw.createdAt, text: raw.text || '',
            status: { sent: 'terkirim', delivered: 'diterima', read: 'dibaca' }[raw.status],
            editedAt: raw.editedAt, dihapusSemua: Boolean(raw.deletedAt),
            replyTo: raw.replyToMessageId, quote: raw.replyTo ? view(peer, raw.replyTo) : null,
            forwarded: Boolean(raw.forwardedFromId), expiresAt: raw.expiresAt,
            attachmentId: raw.attachmentId, file, imageId: image?.id,
            image: image?.previewUrl, imageName: image?.fileName, hasImage: !!image,
            location: raw.deletedAt ? null : raw.location, poll: raw.deletedAt ? null : raw.poll,
            pinned: raw.pinned, encrypted: raw.encrypted, mentions: raw.mentions
        };
    }

    function order(a, b) {
        return Date.parse(a.createdAt) - Date.parse(b.createdAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    }

    function list(peer) {
        if (!peer || !rooms.has(peer)) return [];
        return [...room(peer).messages.values()]
            .filter(item => !item.expiresAt || Date.parse(item.expiresAt) > Date.now())
            .sort(order).map(item => view(peer, item));
    }

    function once(peer, task, run) {
        const jobs = room(peer).jobs;
        if (jobs.has(task)) return jobs.get(task);
        const job = Promise.resolve().then(run).finally(() => jobs.delete(task));
        jobs.set(task, job);
        return job;
    }

    function cachePage(peer, page) {
        page.messages.forEach(message => put(peer, message));
    }

    async function assets(peer) {
        return once(peer, 'attachments', async () => {
            const { attachments } = await api('attachments?' + new URLSearchParams({ targetType: 'direct', targetId: peer }));
            attachments.forEach(item => room(peer).attachments.set(item.id, item));
            emit('change', { peer, reason: 'attachment' });
        });
    }

    function refresh(peer) {
        return once(peer, 'refresh', async () => {
            const state = room(peer);
            const snapshot = new Map(state.messages);
            // Refresh the newest page and backfill any gap left by a disconnect.
            const newestKnown = [...snapshot.values()].sort(order).at(-1);
            let page = await api(dm(peer));
            let received = page.messages.slice();
            while (state.loaded && newestKnown && page.nextCursor &&
                page.messages.length && order(page.messages[0], newestKnown) > 0) {
                page = await api(dm(peer) + '?' + new URLSearchParams({ before: page.nextCursor }));
                received.push(...page.messages);
            }
            const earliest = received.slice().sort(order)[0];
            const returned = new Set(received.map(item => item.id));
            for (const [id, item] of snapshot) {
                if (state.messages.get(id) === item && !returned.has(id) && (!earliest || order(item, earliest) >= 0))
                    state.messages.delete(id);
            }
            received.forEach(message => put(peer, message));
            // Keep older pages already loaded. A first refresh establishes the history cursor.
            if (!state.loaded) state.cursor = page.nextCursor;
            state.loaded = true;
            emit('change', { peer, reason: 'refresh' });
            if (received.some(item => item.attachmentId && !attachment(peer, item.attachmentId))) assets(peer).catch(() => {});
            acknowledge(peer, isReading(peer) ? 'read' : 'delivered').catch(() => {});
        });
    }

    function older(peer) {
        return once(peer, 'older', async () => {
            const state = room(peer);
            if (!state.cursor) return;
            const page = await api(dm(peer) + '?' + new URLSearchParams({ before: state.cursor }));
            cachePage(peer, page);
            state.cursor = page.nextCursor;
            if (page.messages.some(item => item.attachmentId && !attachment(peer, item.attachmentId))) assets(peer).catch(() => {});
            emit('change', { peer, reason: 'older' });
        });
    }

    function preview(peer) {
        return once(peer, 'preview', async () => {
            if (room(peer).loaded) return;
            const page = await api(dm(peer) + '?limit=1');
            if (room(peer).loaded) return;
            cachePage(peer, page);
            emit('change', { peer, reason: 'preview' });
            acknowledge(peer, 'delivered').catch(() => {});
        });
    }

    function loadInbox(peers) {
        peers.forEach(peer => pendingPeers.add(peer));
        if (inboxLoad) return inboxLoad;
        inboxLoad = Promise.all(Array.from({ length: Math.min(4, pendingPeers.size) }, async () => {
            while (pendingPeers.size) {
                const peer = pendingPeers.values().next().value;
                pendingPeers.delete(peer);
                await preview(peer).catch(() => {});
            }
        })).finally(() => {
            inboxLoad = null;
            if (pendingPeers.size) loadInbox([]);
        });
        return inboxLoad;
    }

    async function send(peer, payload) {
        const signature = JSON.stringify([peer, payload]);
        if (pendingSends.size > 100) pendingSends.delete(pendingSends.keys().next().value);
        const clientMessageId = pendingSends.get(signature) || crypto.randomUUID();
        pendingSends.set(signature, clientMessageId);
        try {
            const { message } = await api(dm(peer), { method: 'POST', body: { ...payload, clientMessageId } });
            put(peer, message);
            pendingSends.delete(signature);
            emit('change', { peer, reason: 'send' });
            return message;
        } catch (error) {
            if (error.status >= 400 && error.status < 500 && ![408, 429].includes(error.status))
                pendingSends.delete(signature);
            throw error;
        }
    }

    async function edit(peer, id, text) {
        const { message } = await api(dm(id), { method: 'PATCH', body: { text } });
        put(peer, message);
        emit('change', { peer, reason: 'edit' });
    }

    async function remove(peer, id, scope) {
        await api(dm(id) + '?scope=' + scope, { method: 'DELETE' });
        const state = room(peer);
        if (scope === 'me') {
            state.hidden.add(id);
            state.messages.delete(id);
        } else {
            const old = state.messages.get(id);
            if (old) put(peer, { ...old, deletedAt: new Date().toISOString(), attachmentId: null, text: null });
        }
        state.pins = state.pins.filter(item => item.id !== id);
        emit('change', { peer, reason: 'remove' });
    }

    function reactions(peer, id, summary) {
        const record = room(peer).messages.get(id);
        if (record) record.reactions = summary;
        emit('change', { peer, reason: 'reaction' });
    }

    function react(peer, id, emoji) {
        return once(peer, 'reaction:' + id, async () => {
            const current = room(peer).messages.get(id)?.reactions || [];
            const endpoint = dm(id) + '/reactions';
            const result = current.some(item => item.emoji === emoji && item.userIds.includes(ownId))
                ? await api(endpoint + '/' + enc(emoji), { method: 'DELETE' })
                : await api(endpoint, { method: 'POST', body: { emoji } });
            reactions(peer, id, result.reactions);
        });
    }

    async function pins(peer) {
        const { messages } = await api(dm(peer) + '/pins');
        room(peer).pins = messages.filter(item => !room(peer).hidden.has(item.id));
        emit('change', { peer, reason: 'pin' });
    }

    async function pin(peer, id, enabled) {
        await api(dm(id) + '/pin', { method: enabled ? 'POST' : 'DELETE' });
        await pins(peer);
    }

    async function search(peer, q) {
        const query = new URLSearchParams({ q });
        if (peer) query.set('peerId', peer);
        const { messages } = await api('messages/search?' + query);
        return messages.map(item => {
            const id = peer || peerOf(item);
            return { ...view(id, item), peer: id };
        });
    }

    async function locate(peer, id) {
        if (!room(peer).loaded) await refresh(peer);
        while (!room(peer).messages.has(id) && room(peer).cursor) await older(peer);
        return list(peer).some(item => item.id === id);
    }

    async function upload(peer, file, pending = {}) {
        if (!pending.upload) {
            const data = await api('attachments/uploads', { method: 'POST', body: {
                targetType: 'direct', targetId: peer, fileName: file.name,
                mimeType: file.type || 'application/octet-stream', sizeBytes: file.size
            } });
            Object.assign(pending, data);
        }
        if (!pending.uploaded) {
            const form = new FormData();
            for (const [key, value] of Object.entries(pending.upload.fields)) form.append(key, value);
            form.append('file', file);
            const response = await fetch(pending.upload.url, {
                method: 'POST', body: form, credentials: 'omit', signal: AbortSignal.timeout(120000)
            });
            if (!response.ok) {
                delete pending.upload;
                throw new Error('Penyimpanan menolak unggahan.');
            }
            pending.uploaded = true;
        }
        if (!pending.ready) {
            const data = await api('attachments/' + enc(pending.attachment.id) + '/complete', { method: 'POST' });
            pending.attachment = data.attachment;
            pending.ready = true;
        }
        room(peer).attachments.set(pending.attachment.id, pending.attachment);
        return pending.attachment.id;
    }

    async function download(id) {
        const { url } = await api('attachments/' + enc(id) + '/download-url');
        return url;
    }

    function isReading(peer) {
        return activePeer === peer && document.visibilityState === 'visible' && document.hasFocus() &&
            document.getElementById('panel-tab-chat').hidden === false &&
            document.getElementById('box-list-pesan').getClientRects().length > 0 &&
            getComputedStyle(document.getElementById('panel-layer-setelan')).display === 'none';
    }

    function applyReceipt(peer, message, status) {
        for (const item of room(peer).messages.values()) {
            if (item.senderId === message.senderId && order(item, message) <= 0 && rank[item.status] < rank[status])
                item.status = status;
        }
    }

    function acknowledge(peer, mode = 'read', force = false) {
        return once(peer, 'receipt:' + mode + (force ? ':manual' : ''), async () => {
            if (force) await refresh(peer);
            const state = room(peer);
            for (;;) {
                const marker = [...state.messages.values()].filter(item => item.recipientId === ownId &&
                    item.status !== 'read' && (mode === 'read' || item.status === 'sent')).sort(order).at(-1);
                if (!marker && force && state.cursor) {
                    await older(peer);
                    continue;
                }
                if (!marker || (mode === 'read' && !force && !isReading(peer))) return;
                await api(dm(marker.id) + '/receipts', { method: 'POST', body: { status: mode } });
                applyReceipt(peer, marker, mode);
                emit('change', { peer, reason: 'receipt' });
                if (force) return;
            }
        });
    }

    async function loadDrafts() {
        const initial = new Set(drafts.keys());
        const { drafts: values } = await api('drafts');
        for (const item of values) {
            const peer = otherId(item.targetId);
            if (item.scope === 'direct' && peer && !initial.has(peer) && !drafts.has(peer))
                drafts.set(peer, { teks: item.text, reply: item.replyToMessageId, waktu: item.updatedAt });
        }
        emit('drafts');
    }

    function otherId(target) {
        if (!target) return '';
        const pair = target.split(':');
        return pair.length === 2 && pair.includes(ownId) ? pair.find(id => id !== ownId) : target;
    }

    function draft(peer, text, reply) {
        if (!peer) return;
        const prev = drafts.get(peer);
        const replyToMessageId = reply || null;
        if ((prev?.teks || '') === text && (prev?.reply || null) === replyToMessageId) return;
        const current = { teks: text, reply: replyToMessageId, waktu: new Date().toISOString() };
        drafts.set(peer, current);
        let queue = draftWrites.get(peer);
        if (!queue) draftWrites.set(peer, queue = { chain: Promise.resolve() });
        queue.pending = { text, replyToMessageId };
        clearTimeout(queue.timer);
        queue.timer = setTimeout(() => flushDraft(peer), 350);
    }

    function flushDraft(peer, keepalive = false) {
        const queue = draftWrites.get(peer);
        const body = queue?.pending;
        if (!body) return;
        queue.pending = null;
        clearTimeout(queue.timer);
        queue.chain = queue.chain.then(() => api('drafts/direct/' + enc(peer), {
            method: 'PUT', body, keepalive
        })).catch(error => emit('draft-error', { peer, error }));
    }

    async function preference(peer, body) {
        const { preference: value } = await api(pref(peer), body ? { method: 'PATCH', body } : undefined);
        room(peer).preference = value;
        emit('change', { peer, reason: 'preference' });
        return value;
    }

    async function loadPreferences() {
        const { conversations } = await api('conversations?scope=direct');
        conversations.forEach(value => { room(otherId(value.targetId)).preference = value; });
        emit('drafts');
    }

    async function loadBlocks() {
        const data = await api('blocks');
        blocks.clear();
        data.blocked.forEach(item => blocks.add(item.userId));
        return data.blocked;
    }

    async function block(peer, enabled) {
        await api('users/' + enc(peer) + '/block', { method: enabled ? 'POST' : 'DELETE' });
        if (enabled) {
            blocks.add(peer);
            if (peer === activePeer) open(null);
            rooms.delete(peer);
        } else blocks.delete(peer);
        emit('blocks', peer);
    }

    function connect(kind, peer, handle) {
        let socket;
        let timer;
        let stopped = false;
        let tries = 0;
        let connected = false;
        const start = () => {
            if (stopped) return;
            try { socket = NgumpulAuth.bukaSocket(kind, peer); }
            catch { return; }
            socket.addEventListener('message', event => {
                if (stopped) return;
                let data;
                try { data = JSON.parse(event.data); } catch { return; }
                if (data.type === 'connected') { connected = true; tries = 0; }
                handle(data);
            });
            socket.addEventListener('close', event => {
                connected = false;
                if (stopped) return;
                if (event.code === 4003) {
                    emit('socket-denied', { peer });
                    return;
                }
                emit('socket-retry', { peer });
                timer = setTimeout(start, Math.min(30000, 1000 * 2 ** Math.min(tries++, 5)));
            });
        };
        start();
        return {
            connected: () => connected,
            close() { stopped = true; clearTimeout(timer); socket?.close(); },
            typing() { if (socket?.readyState === WebSocket.OPEN) socket.send('{"type":"typing"}'); }
        };
    }

    function directEvent(event) {
        const raw = event.message;
        const peer = peerOf(raw);
        if (event.event === 'receipt') {
            // A receipt advances all earlier messages from the same sender.
            if (raw.status === 'read' || raw.status === 'delivered') applyReceipt(peer, raw, raw.status);
        } else put(peer, raw);
        if (event.event === 'deleted') room(peer).pins = room(peer).pins.filter(item => item.id !== raw.id);
        if (raw.attachmentId && !attachment(peer, raw.attachmentId)) assets(peer).catch(() => {});
        emit('change', { peer, reason: event.event });
        if (event.event === 'created' && raw.recipientId === ownId)
            acknowledge(peer, isReading(peer) ? 'read' : 'delivered').catch(() => {});
    }

    function open(peer) {
        if (peer === activePeer) return;
        dmConnection?.close();
        activePeer = peer;
        lastTypingSent = 0;
        if (!peer) return;
        dmConnection = connect('dm', peer, data => {
            if (data.type === 'connected') {
                emit('socket-open', { peer });
                refresh(peer).catch(error => emit('load-error', { peer, error }));
            } else if (data.type === 'direct_message') directEvent(data);
        });
    }

    function start() {
        const userSocket = connect('user', null, event => {
            if (event.type === 'direct_message' && (peerOf(event.message) !== activePeer || !dmConnection?.connected()))
                directEvent(event);
            if (event.type === 'message_reaction' && event.scope === 'direct' && event.senderId && event.recipientId)
                reactions(peerOf(event), event.messageId, event.reactions);
            if (event.type === 'pin_event' && event.scope === 'direct') {
                const peer = event.peerId === ownId ? event.actorId : otherId(event.peerId);
                if (peer && rooms.has(peer)) pins(peer).catch(() => {});
            }
            if (event.type === 'poll_event' && event.scope === 'direct') {
                const peer = event.peerId === ownId ? event.actorId : otherId(event.peerId);
                if (peer && room(peer).messages.has(event.messageId))
                    api('polls/' + enc(event.poll.id)).then(data => updatePoll(peer, event.messageId, data.poll)).catch(() => {});
            }
            emit('user-event', event);
        });
        window.addEventListener('pagehide', () => {
            for (const peer of draftWrites.keys()) flushDraft(peer, true);
            userSocket.close();
            dmConnection?.close();
        }, { once: true });
        loadDrafts().catch(() => {});
        loadPreferences().catch(() => {});
        loadBlocks().catch(() => {});
    }

    function updatePoll(peer, id, poll) {
        const item = room(peer).messages.get(id);
        if (item) item.poll = poll;
        emit('change', { peer, reason: 'poll' });
    }

    return { events, label, list, loadInbox, preview, refresh, older, locate, send, edit, remove,
        react, pin, pins, search, upload, download, acknowledge, open, start, draft, preference, loadBlocks, block, updatePoll,
        getDraft: peer => drafts.get(peer), getPreference: peer => room(peer).preference,
        readPins: peer => room(peer).pins.map(item => view(peer, item)), hasOlder: peer => !!room(peer).cursor,
        isLoaded: peer => !!rooms.get(peer)?.loaded, isBlocked: peer => blocks.has(peer),
        attachment, reactions: (peer, id) => Object.fromEntries(
            (room(peer).messages.get(id)?.reactions || []).map(item => [item.emoji, item.userIds])
        ),
        typing() {
            if (Date.now() - lastTypingSent < 1600) return;
            lastTypingSent = Date.now();
            dmConnection?.typing();
        }
    };
})();
