(() => {
  "use strict";
  if (!userAktif) return;
  const events = new EventTarget();
  const tab = crypto.randomUUID(),
    akun = userAktif.id;
  const prefix = "ngumpul_panggilan_tab:";
  const backend = window.NgumpulGrupBackend?.panggilan || null;
  const bus =
    backend?.signaling ||
    (window.BroadcastChannel
      ? new BroadcastChannel("ngumpul:panggilan")
      : null);
  const peers = new Map();
  const deviceKey = "ngumpul_panggilan_perangkat:" + akun;
  let selectedDevices;
  try {
    selectedDevices = JSON.parse(sessionStorage.getItem(deviceKey) || "{}");
  } catch (_) {
    selectedDevices = {};
  }
  selectedDevices = {
    microphone: "",
    camera: "",
    output: "",
    ...selectedDevices,
  };
  const constraint = (id) => (id ? { deviceId: { exact: id } } : true);
  let current = null,
    stream = null,
    context = null,
    analyser = null,
    speaking = false;
  let busy = false,
    disposed = false,
    operation = 0,
    pending = null,
    failure = null,
    deafened = false,
    micEnabled = true,
    checking = false,
    inviteTimer,
    heartbeat;
  const emit = (name, detail) =>
    events.dispatchEvent(new CustomEvent(name, { detail }));
  const post = (data) =>
    bus?.postMessage({
      ...data,
      from: tab,
      akun,
      room: current?.room,
      gid: current?.gid,
      ...data,
    });
  function participants(room) {
    if (backend?.presence) return backend.presence.list(room);
    const result = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(prefix)) continue;
      try {
        const p = JSON.parse(localStorage.getItem(key));
        if (p && Date.now() - p.waktu < 9000 && (!room || p.room === room))
          result.push(p);
      } catch (_) {
        continue;
      }
    }
    return result.sort(
      (a, b) => a.started - b.started || a.tab.localeCompare(b.tab),
    );
  }
  function publish() {
    if (!current) return;
    const value = {
      ...current,
      tab,
      akun,
      waktu: Date.now(),
      mic: stream.getAudioTracks().some((t) => t.enabled),
      video: stream
        .getVideoTracks()
        .some((t) => t.enabled && t.readyState === "live"),
      speaking,
      deafened,
    };
    if (backend?.presence) backend.presence.write(tab, value);
    else localStorage.setItem(prefix + tab, JSON.stringify(value));
    post({ type: "presence" });
    emit("state", state());
  }
  function state() {
    return {
      current,
      stream,
      peers: [...peers].map(([id, peer]) => ({
        id,
        stream: peer.remote,
        connection: peer.pc.connectionState,
      })),
      participants: participants(current?.room),
      busy,
      pending,
      failure,
      deafened,
      devices: { ...selectedDevices },
      status: pending
        ? "connecting"
        : !current
          ? failure
            ? "failed"
            : "idle"
          : [...peers.values()].some((p) =>
                ["failed", "disconnected"].includes(p.pc.connectionState),
              )
            ? "disconnected"
            : [...peers.values()].some((p) =>
                  ["new", "connecting"].includes(p.pc.connectionState),
                )
              ? "connecting"
              : "connected",
    };
  }
  function remove(id) {
    const peer = peers.get(id);
    if (peer) {
      peer.pc.close();
      peers.delete(id);
    }
  }
  async function connect(id) {
    const session = current;
    if (!session || !stream) return null;
    if (peers.has(id)) {
      const existing = peers.get(id);
      await existing.ready;
      return existing;
    }
    const pc = new RTCPeerConnection(
      backend?.rtcConfiguration || { iceServers: [] },
    );
    const offerer = tab < id;
    const audio = offerer
      ? pc.addTransceiver("audio", { direction: "sendrecv" })
      : null;
    const video = offerer
      ? pc.addTransceiver("video", { direction: "sendrecv" })
      : null;
    const peer = {
      pc,
      audio,
      video,
      remote: new MediaStream(),
      pending: [],
      chain: Promise.resolve(),
    };
    peers.set(id, peer);
    const active = () => current === session && peers.get(id) === peer;
    pc.onicecandidate = (e) => {
      if (e.candidate && active())
        post({ type: "ice", to: id, candidate: e.candidate.toJSON() });
    };
    pc.ontrack = (e) => {
      if (!active()) return;
      if (!peer.remote.getTracks().some((t) => t.id === e.track.id))
        peer.remote.addTrack(e.track);
      emit("state", state());
    };
    pc.onconnectionstatechange = () => {
      if (!active()) return;
      if (pc.connectionState === "failed")
        emit("error", "Sambungan terputus. Keluar lalu gabung kembali.");
      emit("state", state());
    };
    peer.ready = (async () => {
      if (offerer) {
        await audio.sender.replaceTrack(stream.getAudioTracks()[0] || null);
        await video.sender.replaceTrack(stream.getVideoTracks()[0] || null);
        if (!active()) return;
        await pc.setLocalDescription(await pc.createOffer());
        if (!active()) return;
        post({
          type: "description",
          to: id,
          description: pc.localDescription.toJSON(),
        });
      }
    })();
    await peer.ready;
    return peer;
  }
  async function receive(message) {
    if (disposed || message.from === tab || getUserAktif()?.id !== akun) return;
    if (message.type === "invite") {
      if (current || pending || busy || Date.now() - message.started > 30000)
        return;
      try {
        const g = await NgumpulGrupData.get(message.gid);
        if (
          g.keluar ||
          !g.anggotaIds.includes(message.akun) ||
          NgumpulGrupData.muted(g.id)
        )
          return;
        if (!g.ruang.channels.some((c) => c.id === message.cid)) return;
        emit("incoming", message);
      } catch (_) {
        return;
      }
      return;
    }
    if (message.type === "cancel-invite") {
      emit("cancel-invite", message);
      return;
    }
    if (message.type === "presence") {
      emit("presence", participants());
      if (current) emit("state", state());
      return;
    }
    const session = current;
    if (
      !current ||
      message.room !== current.room ||
      (message.to && message.to !== tab)
    )
      return;
    const g = await NgumpulGrupData.get(current.gid);
    if (session !== current) return;
    if (g.keluar || !g.anggotaIds.includes(message.akun)) return;
    if (message.type === "leave") {
      remove(message.from);
      emit("state", state());
      return;
    }
    if (!participants(current.room).some((p) => p.tab === message.from)) return;
    const peer = await connect(message.from);
    if (!peer || session !== current) return;
    peer.chain = peer.chain
      .then(async () => {
        if (session !== current || peers.get(message.from) !== peer) return;
        if (message.type === "description") {
          await peer.pc.setRemoteDescription(message.description);
          if (session !== current) return;
          for (const ice of peer.pending.splice(0))
            await peer.pc.addIceCandidate(ice);
          if (message.description.type === "offer") {
            peer.audio = peer.pc
              .getTransceivers()
              .find((t) => t.receiver.track.kind === "audio");
            peer.video = peer.pc
              .getTransceivers()
              .find((t) => t.receiver.track.kind === "video");
            peer.audio.direction = "sendrecv";
            peer.video.direction = "sendrecv";
            await peer.audio.sender.replaceTrack(
              stream.getAudioTracks()[0] || null,
            );
            await peer.video.sender.replaceTrack(
              stream.getVideoTracks()[0] || null,
            );
            await peer.pc.setLocalDescription(await peer.pc.createAnswer());
            if (session !== current) return;
            post({
              type: "description",
              to: message.from,
              description: peer.pc.localDescription.toJSON(),
            });
          }
        } else if (message.type === "ice") {
          if (peer.pc.remoteDescription)
            await peer.pc.addIceCandidate(message.candidate);
          else peer.pending.push(message.candidate);
        }
      })
      .catch(() => {
        if (session === current && peers.get(message.from) === peer)
          emit("error", "Sambungan belum berhasil. Coba gabung kembali.");
      });
    await peer.chain;
  }
  if (bus)
    bus.onmessage = (e) => {
      receive(e.data).catch((e) => emit("error", e.message));
    };
  function deviceError(error) {
    if (error.name === "NotAllowedError")
      return new Error(
        "Akses mic atau kamera ditolak. Izinkan melalui pengaturan situs di browser.",
      );
    if (error.name === "OverconstrainedError")
      return new Error(
        "Perangkat yang dipilih tidak tersedia. Pilih perangkat lain.",
      );
    if (error.name === "NotFoundError")
      return new Error("Mic atau kamera tidak ditemukan. Periksa perangkatmu.");
    if (error.name === "NotReadableError")
      return new Error("Perangkat sedang digunakan atau tidak dapat dibuka.");
    return error;
  }
  function validSession(version) {
    if (version !== operation || disposed)
      throw new Error("Proses bergabung dibatalkan.");
    if (getUserAktif()?.id !== akun) throw new Error("Sesi sudah berakhir.");
  }
  function disconnectRoom(keepMedia = false) {
    if (current) {
      post({ type: "leave" });
      post({ type: "cancel-invite" });
    }
    current = null;
    for (const id of peers.keys()) remove(id);
    clearTimeout(inviteTimer);
    if (backend?.presence) backend.presence.remove(tab);
    else localStorage.removeItem(prefix + tab);
    if (!keepMedia) {
      stream?.getTracks().forEach((t) => t.stop());
      if (context) context.close().catch(() => {});
      context = null;
      analyser = null;
      stream = null;
      speaking = false;
      micEnabled = true;
      deafened = false;
    }
    post({ type: "presence" });
  }
  async function join(gid, cid, video = false, invite = false, options = {}) {
    if (busy) return false;
    if (current?.gid === gid && current.cid === cid) {
      if (video && !stream.getVideoTracks().length) await camera();
      emit("state", state());
      return true;
    }
    const version = ++operation;
    let acquired = null,
      acquiredVideo = null,
      committed = false;
    busy = true;
    failure = null;
    pending = { gid, cid, nama: "", grup: "", video };
    emit("state", state());
    const action = async () => {
      validSession(version);
      if (
        !bus ||
        !window.RTCPeerConnection ||
        !navigator.mediaDevices?.getUserMedia
      )
        throw new Error(
          "Panggilan memerlukan browser yang mendukung mic dan kamera melalui localhost atau HTTPS.",
        );
      if (participants().some((p) => p.akun === akun && p.tab !== tab))
        throw new Error("Akunmu sedang menelepon di tab lain.");
      const g = await NgumpulGrupData.get(gid);
      validSession(version);
      const c = g.ruang.channels.find((c) => c.id === cid);
      if (g.keluar || !c) throw new Error("Ruangan tidak tersedia.");
      pending = { gid, cid, nama: c.nama, grup: g.nama, video };
      emit("state", state());
      if (!stream?.getAudioTracks().some((t) => t.readyState === "live")) {
        try {
          acquired = await navigator.mediaDevices.getUserMedia({
            audio: constraint(selectedDevices.microphone),
            video: video ? constraint(selectedDevices.camera) : false,
          });
        } catch (e) {
          throw deviceError(e);
        }
      }
      if (
        !acquired &&
        video &&
        !stream.getVideoTracks().some((t) => t.readyState === "live")
      ) {
        try {
          acquiredVideo = await navigator.mediaDevices.getUserMedia({
            video: constraint(selectedDevices.camera),
          });
        } catch (e) {
          throw deviceError(e);
        }
      }
      validSession(version);
      const fresh = await NgumpulGrupData.get(gid);
      validSession(version);
      if (fresh.keluar || !fresh.ruang.channels.some((c) => c.id === cid))
        throw new Error("Ruangan sudah tidak tersedia.");
      disconnectRoom(!acquired && !!stream);
      stream = acquired || stream;
      acquired = null;
      if (acquiredVideo) {
        stream
          .getVideoTracks()
          .filter((t) => t.readyState === "ended")
          .forEach((t) => stream.removeTrack(t));
        acquiredVideo.getVideoTracks().forEach((t) => stream.addTrack(t));
        acquiredVideo = null;
      }
      committed = true;
      current = {
        room: gid + "/" + cid,
        gid,
        cid,
        nama: c.nama,
        grup: fresh.nama,
        started: Date.now(),
        warnaAnggota: fresh.warnaAnggota || {},
        jenis: c.jenis,
      };
      if (typeof options.muted === "boolean") micEnabled = !options.muted;
      stream
        .getAudioTracks()
        .forEach((t) => (t.enabled = micEnabled && !deafened));
      if (!context) {
        try {
          context = new AudioContext();
          analyser = context.createAnalyser();
          analyser.fftSize = 256;
          context.createMediaStreamSource(stream).connect(analyser);
          context.resume().catch(() => {});
        } catch (_) {
          context = null;
          analyser = null;
        }
      }
      publish();
      post({ type: "hello" });
      for (const p of participants(current.room)) {
        validSession(version);
        if (p.tab !== tab) await connect(p.tab);
      }
      validSession(version);
      if (invite && c.jenis === "teks") {
        post({ type: "invite", cid, video, started: current.started });
        const session = current;
        inviteTimer = setTimeout(() => {
          if (session === current) post({ type: "cancel-invite" });
        }, 30000);
      }
      return true;
    };
    try {
      if (navigator.locks)
        return await navigator.locks.request(
          "ngumpul:panggilan-akun:" + akun,
          action,
        );
      return await action();
    } catch (e) {
      acquired?.getTracks().forEach((t) => t.stop());
      acquiredVideo?.getTracks().forEach((t) => t.stop());
      if (version !== operation || disposed) return false;
      const target = pending;
      if (committed) disconnectRoom();
      failure = { ...target, message: e.message };
      throw e;
    } finally {
      if (version === operation) {
        busy = false;
        pending = null;
        emit("state", state());
        emit("presence", participants());
      }
    }
  }
  async function camera() {
    if (!current || busy) return;
    const session = current,
      local = stream,
      version = ++operation;
    busy = true;
    emit("state", state());
    try {
      const existing = local.getVideoTracks()[0];
      if (existing) {
        for (const peer of peers.values())
          if (peer.video) await peer.video.sender.replaceTrack(null);
        local.removeTrack(existing);
        existing.stop();
      } else {
        let cameraStream;
        try {
          cameraStream = await navigator.mediaDevices.getUserMedia({
            video: constraint(selectedDevices.camera),
          });
        } catch (e) {
          throw deviceError(e);
        }
        const track = cameraStream.getVideoTracks()[0];
        if (session !== current || version !== operation) {
          cameraStream.getTracks().forEach((t) => t.stop());
          return;
        }
        local.addTrack(track);
        for (const peer of peers.values())
          if (peer.video) await peer.video.sender.replaceTrack(track);
      }
      if (session === current) publish();
    } finally {
      if (version === operation) {
        busy = false;
        emit("state", state());
      }
    }
  }
  async function devices() {
    const available = await navigator.mediaDevices.enumerateDevices();
    const list = (kind, label) => [
      { id: "", nama: "Default" },
      ...available
        .filter(
          (d) => d.kind === kind && d.deviceId && d.deviceId !== "default",
        )
        .map((d, i) => ({
          id: d.deviceId,
          nama: d.label || label + " " + (i + 1),
        })),
    ];
    return {
      selected: { ...selectedDevices },
      microphone: list("audioinput", "Mikrofon"),
      camera: list("videoinput", "Kamera"),
      output: list("audiooutput", "Speaker"),
    };
  }
  async function configureDevices(values) {
    if (busy) throw new Error("Tunggu pergantian perangkat selesai.");
    const next = { ...selectedDevices, ...values },
      session = current,
      version = ++operation;
    if (!session) {
      selectedDevices = next;
      try {
        sessionStorage.setItem(deviceKey, JSON.stringify(next));
      } catch (_) {}
      return;
    }
    const changeAudio = next.microphone !== selectedDevices.microphone;
    const changeVideo =
      next.camera !== selectedDevices.camera &&
      stream.getVideoTracks().some((t) => t.readyState === "live");
    let acquired = null;
    const replaced = [];
    busy = true;
    emit("state", state());
    try {
      if (changeAudio || changeVideo) {
        try {
          acquired = await navigator.mediaDevices.getUserMedia({
            audio: changeAudio ? constraint(next.microphone) : false,
            video: changeVideo ? constraint(next.camera) : false,
          });
        } catch (e) {
          throw deviceError(e);
        }
        validSession(version);
        for (const kind of ["audio", "video"]) {
          const track = acquired.getTracks().find((t) => t.kind === kind);
          if (!track) continue;
          if (kind === "audio") track.enabled = micEnabled && !deafened;
          for (const peer of peers.values())
            if (peer[kind]) {
              const sender = peer[kind].sender,
                old = sender.track;
              await sender.replaceTrack(track);
              replaced.push({ sender, old });
              validSession(version);
            }
        }
        validSession(version);
        for (const track of acquired.getTracks()) {
          stream
            .getTracks()
            .filter((t) => t.kind === track.kind)
            .forEach((old) => {
              stream.removeTrack(old);
              old.stop();
            });
          stream.addTrack(track);
        }
        acquired = null;
        if (changeAudio) {
          if (context) await context.close().catch(() => {});
          context = null;
          analyser = null;
          try {
            context = new AudioContext();
            analyser = context.createAnalyser();
            analyser.fftSize = 256;
            context.createMediaStreamSource(stream).connect(analyser);
            context.resume().catch(() => {});
          } catch (_) {
            context = null;
            analyser = null;
          }
        }
      }
      validSession(version);
      selectedDevices = next;
      try {
        sessionStorage.setItem(deviceKey, JSON.stringify(next));
      } catch (_) {}
      publish();
    } catch (e) {
      if (session === current)
        for (const { sender, old } of replaced) {
          try {
            await sender.replaceTrack(old);
          } catch (_) {}
        }
      acquired?.getTracks().forEach((t) => t.stop());
      throw e;
    } finally {
      if (version === operation) {
        busy = false;
        emit("state", state());
      }
    }
  }
  function leave() {
    operation++;
    busy = false;
    pending = null;
    failure = null;
    disconnectRoom();
    emit("state", state());
    emit("presence", participants());
  }
  heartbeat = setInterval(async () => {
    if (checking || disposed) return;
    checking = true;
    const session = current;
    try {
      emit("presence", participants());
      if (getUserAktif()?.id !== akun) {
        leave();
        return;
      }
      if (!session) return;
      const g = await NgumpulGrupData.get(session.gid);
      if (session !== current) return;
      const channel = g.ruang.channels.find((c) => c.id === session.cid);
      if (g.keluar || !channel) {
        leave();
        return;
      }
      session.nama = channel.nama;
      session.grup = g.nama;
      session.warnaAnggota = g.warnaAnggota || {};
      if (pending) {
        publish();
        return;
      }
      const alive = participants(session.room).filter((p) =>
        g.anggotaIds.includes(p.akun),
      );
      for (const id of peers.keys())
        if (!alive.some((p) => p.tab === id)) remove(id);
      for (const p of alive) {
        if (session !== current) return;
        if (p.tab !== tab) await connect(p.tab);
      }
      if (session === current) publish();
    } catch (e) {
      if (session === current) {
        if (current) leave();
        emit("error", e.message);
      }
    } finally {
      checking = false;
    }
  }, 2000);
  const meter = setInterval(() => {
    if (!current || !analyser) return;
    const samples = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(samples);
    const next =
      stream.getAudioTracks().some((t) => t.enabled) &&
      samples.some((v) => Math.abs(v - 128) > 9);
    if (next !== speaking) {
      speaking = next;
      try {
        publish();
      } catch (_) {}
    }
  }, 300);
  window.addEventListener("pagehide", () => {
    leave();
    disposed = true;
    clearInterval(heartbeat);
    clearInterval(meter);
    bus?.close();
  });
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) location.reload();
  });
  window.NgumpulGrupPanggilan = {
    events,
    join,
    leave,
    camera,
    state,
    participants,
    backend,
    devices,
    configureDevices,
    mic() {
      if (!current) return;
      if (deafened) {
        deafened = false;
        micEnabled = true;
      } else micEnabled = !micEnabled;
      stream
        .getAudioTracks()
        .forEach((t) => (t.enabled = micEnabled && !deafened));
      publish();
    },
    deafen() {
      if (!current) return;
      deafened = !deafened;
      stream
        .getAudioTracks()
        .forEach((t) => (t.enabled = micEnabled && !deafened));
      publish();
    },
  };
})();
