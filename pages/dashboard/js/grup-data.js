window.NgumpulGrupData = (() => {
  "use strict";

  const akun = userAktif.id;
  const { api, bukaSocket } = NgumpulAuth;
  const uid = () => crypto.randomUUID();
  const enc = encodeURIComponent;
  const server = (id) => "servers/" + enc(id);
  const channel = (id, cid) => server(id) + "/channels/" + enc(cid);
  const pesan = (id, cid, mid) => channel(id, cid) + "/messages" + (mid ? "/" + enc(mid) : "");
  const kunci = (jenis, ...ids) => "ngumpul_ruang_" + jenis + ":" + ids.map(enc).join(":");
  const memberProfiles = new Map();
  const history = new Map();
  const locations = new Map();
  const cached = new Map();
  const subscribers = new Set();
  const inviteCodes = new Map();
  const typingUsers = new Map();
  const draftWrites = new Map();
  let watchState;

  function cache(key, load, ms = 12000) {
    const previous = cached.get(key);
    if (previous && previous.until > Date.now()) return previous.data;
    const entry = { until: Infinity, data: null };
    entry.data = Promise.resolve().then(load).then((data) => {
      entry.until = Date.now() + ms;
      return data;
    }, (error) => {
      if (cached.get(key) === entry) cached.delete(key);
      throw error;
    });
    cached.set(key, entry);
    return entry.data;
  }

  function changed(id, cid) {
    cached.delete("unread:" + id);
    if (cid) {
      cached.delete("preview:" + cid);
      cached.delete("attachments:" + cid);
    } else {
      cached.delete("groups");
      cached.delete("group:" + id);
    }
    subscribers.forEach((callback) => callback());
    document.dispatchEvent(new CustomEvent("ngumpul:ruang-berubah"));
  }

  function servers() {
    return cache("groups", async () => (await api("servers")).servers);
  }

  const ruang = (g) => g.ruang;

  function groupView(raw, channels, members = [], categories = []) {
    members.forEach((member) => memberProfiles.set(member.userId, member));
    const source = [
      { id: raw.id + ":teks", nama: "Teks", bawaan: true },
      { id: raw.id + ":suara", nama: "Suara", bawaan: true },
      ...categories.map((c) => ({ id: c.id, nama: c.name })),
    ];
    const textChannel = channels.find((c) => c.kind === "text");
    return {
      id: raw.id, nama: raw.name, foto: raw.icon, deskripsi: raw.description || "",
      pembuatId: raw.ownerId, role: raw.role, dibuat: Date.parse(raw.createdAt || raw.joinedAt),
      keluar: false, adminIds: [...new Set([
        raw.ownerId, ...(raw.role === "admin" ? [akun] : []),
        ...members.filter((m) => m.role === "admin").map((m) => m.userId),
      ])],
      anggotaIds: members.map((m) => m.userId),
      warnaAnggota: Object.fromEntries(members.map((m, i) => [m.userId, (i * 137) % 360])),
      keanggotaan: Object.fromEntries(members.map((m) => [m.userId, {
        waktu: Date.parse(m.joinedAt), cara: m.role === "owner" ? "buat" : null, oleh: "",
      }])),
      anggotaBolehUndang: Boolean(raw.membersCanInvite),
      kodeUndangan: inviteCodes.get(raw.id)?.code,
      ruang: { categories: source, channels: channels.map((c) => {
        const jenis = c.kind === "voice" ? "suara" : "teks";
        return { id: c.id, nama: c.name, jenis, bawaan: c.id === textChannel?.id,
          kategoriId: c.categoryId || raw.id + ":" + jenis };
      }) },
    };
  }

  async function group(raw, includeMembers) {
    const { channels, categories } = await cache("channels:" + raw.id, () => api(server(raw.id) + "/channels"));
    const members = includeMembers
      ? await cache("members:" + raw.id, async () => (await api(server(raw.id) + "/members")).members)
      : [];
    return groupView(raw, channels, members, categories);
  }

  async function list() {
    const results = await Promise.allSettled((await servers()).map((entry) => group(entry, false)));
    return results.flatMap((result) => {
      if (result.status === "fulfilled") return [result.value];
      if ([403, 404].includes(result.reason.status)) return [];
      throw result.reason;
    });
  }

  async function get(id) {
    const raw = (await servers()).find((entry) => entry.id === id);
    if (!raw) throw Object.assign(new Error("Grup sudah tidak tersedia untuk akun ini."), { status: 404 });
    return group(raw, true);
  }

  async function mutate(id, path, options) {
    const result = await api(path, options);
    cached.delete("channels:" + id);
    cached.delete("members:" + id);
    changed(id);
    return result;
  }

  function unreadCounts(g) {
    return cache("unread:" + g.id, async () => {
      const result = await api(server(g.id) + "/unread");
      return Object.fromEntries(result.channels.map((c) => [c.channelId, c]));
    }, 9000);
  }

  function state(cid) {
    if (!history.has(cid)) history.set(cid, {
      records: new Map(), files: new Map(), hidden: new Set(), cursor: null, loaded: false,
      stale: true, invalidation: 0, opened: 0, acknowledged: null,
    });
    return history.get(cid);
  }

  function put(cid, raw) {
    const room = state(cid);
    if (room.hidden.has(raw.id)) return;
    const old = room.records.get(raw.id);
    if (old?.updatedAt && raw.updatedAt && old.updatedAt > raw.updatedAt) return;
    room.records.set(raw.id, { ...old, ...raw });
    locations.set(raw.id, cid);
  }

  function view(gid, raw) {
    const file = raw.attachmentId && state(raw.channelId).files.get(raw.attachmentId);
    const reply = raw.replyTo;
    return {
      id: raw.id, grupId: gid, channelId: raw.channelId, dibuat: Date.parse(raw.createdAt),
      isi: raw.text || "", pengirimId: raw.senderId, editedAt: raw.editedAt,
      dihapus: Boolean(raw.deletedAt), status: "terkirim",
      reactions: raw.reactions, poll: raw.poll, pinned: raw.pinned,
      forwarded: Boolean(raw.forwardedFromId), location: raw.location, expiresAt: raw.expiresAt,
      balas: reply && { id: reply.id, nama: memberProfiles.get(reply.senderId)?.displayName ||
        memberProfiles.get(reply.senderId)?.username || "Pesan asli",
        teks: reply.deletedAt ? "Pesan ini telah dihapus" : reply.text || "Lampiran" },
      lampiran: raw.attachmentId && !raw.deletedAt ? [{
        id: raw.attachmentId, nama: file?.fileName || "Lampiran", mime: file?.mimeType || "",
        url: file?.previewUrl, ukuran: file?.sizeBytes,
      }] : [],
    };
  }

  async function attachments(cid) {
    return cache("attachments:" + cid, async () => {
      const { attachments } = await api("attachments?" + new URLSearchParams({ targetType: "channel", targetId: cid }));
      for (const item of attachments) state(cid).files.set(item.id, item);
      return attachments;
    }, 30000);
  }

  function current(gid, cid) {
    return [...state(cid).records.values()]
      .filter((p) => !p.expiresAt || Date.parse(p.expiresAt) > Date.now())
      .map((p) => view(gid, p))
      .sort((a, b) => a.dibuat - b.dibuat || a.id.localeCompare(b.id));
  }

  async function refresh(gid, cid) {
    const room = state(cid);
    if (room.loading) return room.loading;
    if (!room.stale && Date.now() - room.opened < 10000) return;
    const version = room.invalidation;
    room.loading = (async () => {
      const path = pesan(gid, cid);
      let page = await api(path + "?limit=50");
      const loaded = room.loaded;
      const snapshot = new Map(room.records);
      const known = new Set(snapshot.keys());
      const received = [...page.messages];
      while (loaded && known.size && page.nextCursor && !page.messages.some((m) => known.has(m.id))) {
        page = await api(path + "?" + new URLSearchParams({ limit: "50", before: page.nextCursor }));
        received.push(...page.messages);
      }
      if (!loaded || !room.cursor && !known.size) room.cursor = page.nextCursor;
      const incoming = new Set(received.map((p) => p.id));
      const minimum = received.reduce((date, p) => Math.min(date, Date.parse(p.createdAt)), Infinity);
      for (const [id, record] of snapshot) {
        if (room.records.get(id) === record && !incoming.has(id) && (!page.nextCursor || Date.parse(record.createdAt) > minimum))
          room.records.delete(id);
      }
      received.forEach((p) => put(cid, p));
      room.loaded = true;
      room.opened = Date.now();
      room.stale = room.invalidation !== version;
      if (received.some((p) => p.attachmentId && !room.files.has(p.attachmentId)))
        await attachments(cid).catch(() => {});
    })().finally(() => { room.loading = null; });
    return room.loading;
  }

  async function messages(g, cid) {
    if (!cid) {
      const channels = g.ruang.channels.filter((c) => c.jenis === "teks");
      const all = await Promise.all(channels.map((c) => messages(g, c.id)));
      return all.flat().sort((a, b) => a.dibuat - b.dibuat);
    }
    await refresh(g.id, cid);
    return current(g.id, cid);
  }

  async function older(gid, cid) {
    const room = state(cid);
    if (!room.cursor || room.older) return;
    room.older = true;
    try {
      const page = await api(pesan(gid, cid) + "?" + new URLSearchParams({ limit: "50", before: room.cursor }));
      page.messages.forEach((p) => put(cid, p));
      room.cursor = page.nextCursor;
      if (page.messages.some((p) => p.attachmentId)) await attachments(cid).catch(() => {});
    } finally {
      room.older = false;
    }
  }

  async function summary(g) {
    const counts = Object.values(await unreadCounts(g));
    const latest = counts.filter((c) => c.lastMessageAt)
      .sort((a, b) => Date.parse(b.lastMessageAt) - Date.parse(a.lastMessageAt))[0];
    const last = latest && await cache("preview:" + latest.channelId, async () => {
      const { messages } = await api(pesan(g.id, latest.channelId) + "?limit=1");
      return messages[0] && view(g.id, messages[0]);
    }, 9000);
    return { g, unread: counts.reduce((sum, c) => sum + c.unreadCount, 0), last };
  }

  async function read(g, cid, visible) {
    if (!cid || !visible) return false;
    const room = state(cid);
    const latest = (await messages(g, cid)).at(-1);
    if (!latest || room.acknowledged === latest.id || room.acknowledging === latest.id) return false;
    const count = (await unreadCounts(g))[cid]?.unreadCount;
    if (!count) return false;
    room.acknowledging = latest.id;
    try {
      await api("channels/" + enc(cid) + "/read-state", { method: "PUT", body: { messageId: latest.id } });
      room.acknowledged = latest.id;
      cached.delete("unread:" + g.id);
      document.dispatchEvent(new Event("ngumpul:notifikasi-berubah"));
      return true;
    } finally {
      room.acknowledging = null;
    }
  }

  async function upload(cid, item) {
    if (!item.upload) Object.assign(item, await api("attachments/uploads", {
      method: "POST", body: { targetType: "channel", targetId: cid,
        fileName: item.nama, mimeType: item.mime, sizeBytes: item.ukuran },
    }));
    if (!item.uploaded) {
      const form = new FormData();
      for (const [key, value] of Object.entries(item.upload.fields)) form.append(key, value);
      form.append("file", item.file);
      const response = await fetch(item.upload.url, {
        method: "POST", body: form, credentials: "omit", signal: AbortSignal.timeout(120000),
      });
      if (!response.ok) {
        delete item.upload;
        throw new Error("Penyimpanan menolak unggahan.");
      }
      item.uploaded = true;
    }
    if (!item.ready) {
      const result = await api("attachments/" + enc(item.attachment.id) + "/complete", { method: "POST" });
      item.attachment = result.attachment;
      item.ready = true;
    }
    state(cid).files.set(item.attachment.id, item.attachment);
    return item.attachment.id;
  }

  async function send(gid, cid, isi, lampiran = [], id = uid(), reply, extra = {}) {
    for (const [i, item] of (lampiran.length ? lampiran : [null]).entries()) {
      const attachmentId = item ? await upload(cid, item) : undefined;
      const { message } = await api(pesan(gid, cid), { method: "POST", body: {
        clientMessageId: i ? (item.clientId ||= uid()) : id,
        text: i ? undefined : isi.trim() || undefined, attachmentId,
        replyToMessageId: i ? undefined : reply?.id,
        ...(i ? {} : extra),
      } });
      put(cid, message);
      changed(gid, cid);
    }
  }

  async function edit(gid, cid, mid, text) {
    const { message } = await api(pesan(gid, cid, mid), { method: "PATCH", body: { text } });
    put(cid, message);
    changed(gid, cid);
  }

  async function remove(gid, mid, scope) {
    const cid = locations.get(mid);
    if (!cid) throw new Error("Pesan tidak tersedia.");
    await api(pesan(gid, cid, mid) + "?scope=" + scope, { method: "DELETE" });
    if (scope === "me") {
      state(cid).hidden.add(mid);
      state(cid).records.delete(mid);
    }
    else put(cid, { ...state(cid).records.get(mid), id: mid, text: null,
      attachmentId: null, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    changed(gid, cid);
  }

  function draft(gid, cid, value) {
    const key = kunci("draft", akun, gid, cid);
    const before = sessionStorage.getItem(key) || "";
    if (value === undefined) return before;
    if (before === value) return;
    const previous = draftWrites.get(cid);
    clearTimeout(previous?.timer);
    sessionStorage.setItem(key, value);
    const write = { value, timer: setTimeout(() => flushDraft(cid), 500), pending: previous?.pending };
    draftWrites.set(cid, write);
  }

  async function flushDraft(cid, keepalive = false) {
    const write = draftWrites.get(cid);
    if (!write) return;
    clearTimeout(write.timer);
    const previous = write.pending;
    write.pending = Promise.resolve(previous).catch(() => {}).then(() =>
      api("drafts/channel/" + enc(cid), { method: "PUT", body: { text: write.value }, keepalive }));
    try {
      await write.pending;
      if (draftWrites.get(cid) === write) draftWrites.delete(cid);
    } catch (_) {}
  }

  async function loadDrafts() {
    const { drafts } = await api("drafts?scope=channel");
    const groups = await list();
    const rooms = new Map(groups.flatMap(g => g.ruang.channels.map(c => [c.id, g.id])));
    for (const data of drafts) {
      const gid = rooms.get(data.targetId);
      if (data.scope !== "channel" || !gid || draftWrites.has(data.targetId)) continue;
      const key = kunci("draft", akun, gid, data.targetId);
      if (sessionStorage.getItem(key) === null) sessionStorage.setItem(key, data.text || "");
    }
  }

  function muted(gid, value) {
    const key = kunci("bisukan", akun, gid);
    if (value === undefined) return localStorage.getItem(key) === "true";
    localStorage.setItem(key, String(Boolean(value)));
    document.dispatchEvent(new CustomEvent("ngumpul:ruang-berubah"));
  }

  async function channelChange(gid, nama, kategoriId, jenis, id) {
    const body = { name: nama.trim() };
    const virtual = kategoriId === gid + ":teks" || kategoriId === gid + ":suara";
    if (!virtual) body.categoryId = kategoriId;
    else if (id && (await get(gid)).ruang.channels.find((c) => c.id === id)?.kategoriId !== kategoriId)
      body.categoryId = null;
    if (!id) body.kind = jenis === "suara" ? "voice" : "text";
    await mutate(gid, id ? channel(gid, id) : server(gid) + "/channels", { method: id ? "PATCH" : "POST", body });
  }

  async function category(gid, nama, id) {
    await mutate(gid, server(gid) + "/categories" + (id ? "/" + enc(id) : ""),
      { method: id ? "PATCH" : "POST", body: { name: nama.trim() } });
  }

  async function inviteSettings(gid, allowed, reset) {
    let g = await get(gid);
    if (allowed !== g.anggotaBolehUndang) {
      await mutate(gid, server(gid), { method: "PATCH", body: { membersCanInvite: allowed } });
      g = await get(gid);
      if (allowed !== g.anggotaBolehUndang) throw new Error("Izin undangan belum tersedia pada API ini.");
    }
    const old = inviteCodes.get(gid);
    if (reset && old) {
      await api(server(gid) + "/invites/" + enc(old.code), { method: "DELETE" });
      inviteCodes.delete(gid);
    }
    if (reset || !old || old.expiresAt && Date.parse(old.expiresAt) <= Date.now()) {
      const { invite } = await api(server(gid) + "/invites", { method: "POST", body: {} });
      inviteCodes.set(gid, invite);
    }
    return get(gid);
  }

  async function invitation(gid, token) {
    try {
      const { invite } = await api("servers/invites/" + enc(token));
      if (invite.serverId !== gid) throw new Error("Tautan undangan tidak valid.");
      return { id: gid, nama: invite.name, foto: invite.icon, deskripsi: invite.description,
        jumlah: invite.memberCount, anggota: invite.member };
    } catch (error) {
      if (error.status !== 404) throw error;
      const existing = (await servers()).find((g) => g.id === gid);
      return { id: gid, nama: existing?.name || "Undangan grup Ngumpul", foto: existing?.icon,
        deskripsi: existing?.description, anggota: Boolean(existing) };
    }
  }

  async function join(gid, token) {
    if ((await servers()).some((g) => g.id === gid)) return gid;
    try {
      const result = await api("servers/invites/" + enc(token) + "/join", { method: "POST" });
      changed(result.serverId);
      return result.serverId;
    } catch (error) {
      if (error.status !== 409) throw error;
      cached.delete("groups");
      if ((await servers()).some((g) => g.id === gid)) return gid;
      throw error;
    }
  }

  function watch(gid, cid) {
    if (watchState?.cid === cid) return;
    if (watchState) {
      clearTimeout(watchState.retry);
      watchState.socket?.close();
    }
    const session = cid ? { gid, cid, attempts: 0, lastTyping: 0 } : null;
    watchState = session;
    if (!session) return;
    const reconnect = () => {
      if (watchState !== session) return;
      session.retry = setTimeout(connect, Math.min(30000, 1000 * 2 ** Math.min(session.attempts++, 5)));
    };
    const connect = () => {
      if (watchState !== session) return;
      try { session.socket = bukaSocket("channel", cid); }
      catch (_) { reconnect(); return; }
      session.socket.onmessage = (event) => {
        if (watchState !== session) return;
        let data;
        try { data = JSON.parse(event.data); } catch (_) { return; }
        if (data.type === "connected") {
          session.attempts = 0;
          session.ready = true;
          if (Date.now() - session.typingAt < 1200) typing();
          state(cid).stale = true;
          state(cid).invalidation++;
          changed(gid, cid);
        } else if (data.type === "channel_message" && data.message?.id) {
          const hasNewAttachment = data.message.attachmentId && !state(cid).files.has(data.message.attachmentId);
          put(cid, data.message);
          changed(gid, cid);
          if (hasNewAttachment) attachments(cid).then(() => changed(gid, cid)).catch(() => {});
        }
      };
      session.socket.onclose = (event) => {
        session.ready = false;
        if (event.code !== 4003) reconnect();
        else if (watchState === session) {
          cached.delete("channels:" + gid);
          cached.delete("members:" + gid);
          changed(gid);
        }
      };
    };
    connect();
  }

  function typing() {
    const session = watchState;
    if (!session || Date.now() - session.lastTyping < 1600) return;
    if (session.socket?.readyState !== WebSocket.OPEN || !session.ready) {
      session.typingAt = Date.now();
      return;
    }
    session.typingAt = 0;
    session.lastTyping = Date.now();
    session.socket.send(JSON.stringify({ type: "typing" }));
  }

  function userEvent(data) {
    const gid = data.serverId || data.notification?.serverId;
    const cid = data.channelId || data.notification?.channelId;
    if (data.type === "server_event" && gid) {
      cached.delete("channels:" + gid);
      cached.delete("members:" + gid);
      changed(gid);
    } else if (data.type === "typing" && data.scope === "channel" && cid && data.userId !== akun) {
      const list = typingUsers.get(cid) || new Map();
      list.set(data.userId, Date.parse(data.expiresAt));
      typingUsers.set(cid, list);
      const emit = () => document.dispatchEvent(new CustomEvent("ngumpul:channel-mengetik"));
      emit();
      setTimeout(emit, 6100);
    } else if (gid && cid && ["notification", "read_state", "poll_event", "pin_event", "message_reaction"].includes(data.type)) {
      state(cid).stale = true;
      state(cid).invalidation++;
      changed(gid, cid);
    }
  }

  async function reaction(gid, cid, mid, emoji) {
    const record = state(cid).records.get(mid);
    const enabled = record?.reactions?.some((r) => r.emoji === emoji && r.userIds.includes(akun));
    const path = pesan(gid, cid, mid) + "/reactions";
    const { reactions } = await api(path + (enabled ? "/" + enc(emoji) : ""), {
      method: enabled ? "DELETE" : "POST", body: enabled ? undefined : { emoji },
    });
    updateMessage(gid, cid, mid, { reactions });
  }

  function updateMessage(gid, cid, mid, body) {
    const record = state(cid).records.get(mid);
    if (record) Object.assign(record, body);
    changed(gid, cid);
  }

  async function pin(gid, cid, mid, pinned) {
    await api(pesan(gid, cid, mid) + "/pin", { method: pinned ? "POST" : "DELETE" });
    updateMessage(gid, cid, mid, { pinned });
  }

  async function pins(gid, cid) {
    const { messages } = await api(channel(gid, cid) + "/pins");
    return messages.map((p) => view(gid, p));
  }

  async function search(gid, cid, q) {
    const { messages } = await api(pesan(gid, cid) + "/search?" + new URLSearchParams({ q, limit: "50" }));
    return messages.map((p) => view(gid, p));
  }

  async function locate(gid, cid, mid) {
    await refresh(gid, cid);
    const room = state(cid);
    while (!room.records.has(mid) && room.cursor && !room.older) await older(gid, cid);
    return room.records.has(mid);
  }

  async function addMembers(id, ids) {
    const results = await Promise.allSettled(ids.map((userId) =>
      api(server(id) + "/members", { method: "POST", body: { userId } })));
    cached.delete("members:" + id);
    changed(id);
    return results.filter((result) => result.status === "rejected" && result.reason.status !== 409).length;
  }

  function icon(foto) {
    if (foto && !/^https?:\/\//i.test(foto))
      throw new Error("Gunakan URL HTTP atau HTTPS untuk foto grup.");
    return foto || null;
  }

  const layanan = {
    async inisialisasi() { await servers(); },
    langganan(callback) { subscribers.add(callback); },
    daftarGrup: list,
    ambilGrup: get,
    async buatGrup({ nama, anggotaIds, foto }) {
      const url = icon(foto);
      const { server: created } = await api("servers", { method: "POST", body: { name: nama } });
      changed(created.id);
      const [photo, members] = await Promise.allSettled([
        url ? mutate(created.id, server(created.id), { method: "PATCH", body: { icon: url } }) : null,
        addMembers(created.id, anggotaIds),
      ]);
      const g = { id: created.id };
      if (photo.status === "rejected" || members.status === "rejected" || members.value)
        g.warning = "Grup dibuat. Sebagian perubahan belum tersimpan. Buka Info grup untuk mencoba lagi.";
      return g;
    },
    async ubahInfo(id, { nama, deskripsi, foto }) {
      await mutate(id, server(id), { method: "PATCH", body: {
        name: nama, description: deskripsi, ...(foto !== undefined ? { icon: icon(foto) } : {}),
      } });
    },
    async tambahAnggota(id, ids) {
      const failed = await addMembers(id, ids);
      if (failed) throw new Error(failed + " anggota gagal ditambahkan. Periksa daftar anggota dan coba lagi.");
    },
    tindakanAnggota: (id, userId, action) => mutate(id, server(id) + "/members/" + enc(userId),
      action === "hapus" ? { method: "DELETE" } : { method: "PATCH", body: { role: action === "admin" ? "admin" : "member" } }),
    keluar: (id) => mutate(id, server(id) + "/members/" + enc(akun), { method: "DELETE" }),
    hapusGrup: (id) => mutate(id, server(id), { method: "DELETE" }),
    gabung: join,
    ambilPesan: async (id) => messages(await get(id)),
    async kirimPesan(id, p) {
      const group = await get(id);
      const cid = p.channelId || group.ruang.channels.find((c) => c.jenis === "teks")?.id;
      if (!cid) throw new Error("Belum ada channel teks.");
      return send(id, cid, p.isi, p.lampiran, p.id, p.balas);
    },
    editPesan: edit,
    tandaiStatus: async (id, visible, cid) => cid ? read(await get(id), cid, visible) : false,
    async ambilBerkas() { return { media: [], dokumen: [] }; },
  };

  NgumpulDM.events.addEventListener("user-event", (event) => userEvent(event.detail));
  window.addEventListener("pagehide", () => {
    watch();
    for (const cid of draftWrites.keys()) flushDraft(cid, true);
  }, { once: true });

  return {
    backend: true, layanan, uid, kunci, ruang, list, get, messages, older, summary, unreadCounts,
    reaction, pin, pins, search, locate, updateMessage,
    hasOlder: (cid) => Boolean(state(cid).cursor),
    send, edit, read, draft, loadDrafts, muted, category, channel: channelChange, inviteSettings, invitation, join, watch, typing,
    member: (id) => memberProfiles.get(id),
    typingMembers: (cid) => [...(typingUsers.get(cid) || [])].filter(([, expires]) => expires > Date.now()).map(([id]) => id),
    hapus: (gid, mid) => remove(gid, mid, "everyone"),
    sembunyi: (gid, mid) => remove(gid, mid, "me"),
    canEdit: (g, p) => p?.pengirimId === akun && !p.dihapus && Date.now() - p.dibuat <= BATAS_WAKTU_EDIT_PESAN,
    removeChannel: (gid, cid) => mutate(gid, channel(gid, cid), { method: "DELETE" }),
    removeCategory: (gid, id, tujuan) => mutate(gid, server(gid) + "/categories/" + enc(id), {
      method: "DELETE", body: { destinationId: tujuan === "default" ? null : tujuan, deleteChannels: tujuan == null },
    }),
  };
})();
