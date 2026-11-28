window.NgumpulGrupPanggilan = (() => {
  "use strict";

  const events = new EventTarget();
  const emit = (type, detail) => events.dispatchEvent(new CustomEvent(type, { detail }));
  const api = NgumpulAuth.api;
  const deviceKey = "ngumpul_panggilan_perangkat:" + userAktif.id;
  const deviceKinds = { microphone: "audioinput", camera: "videoinput", output: "audiooutput" };
  const selected = { microphone: "", camera: "", output: "" };
  try { Object.assign(selected, JSON.parse(sessionStorage.getItem(deviceKey))); } catch (_) {}
  const enc = encodeURIComponent;
  const path = (gid, cid) => "servers/" + enc(gid) + "/channels/" + enc(cid);
  const roster = new Map();
  const renderedStreams = new Map();
  let current, pending, failure, room;
  let busy = false, deafened = false, restoreMic = false;

  function message(error) {
    if (["NotAllowedError", "PermissionDeniedError"].includes(error.name)) return "Izinkan akses mikrofon atau kamera di browser.";
    if (error.name === "NotFoundError") return "Mikrofon atau kamera tidak ditemukan.";
    if ([502, 503].includes(error.status)) return "Layanan suara belum siap. Coba lagi.";
    return error.message || "Ruang suara tidak dapat dihubungkan.";
  }

  function participant(p, roomId) {
    return {
      tab: p.identity, akun: p.identity, room: roomId,
      mic: p.isMicrophoneEnabled, video: p.isCameraEnabled || p.isScreenShareEnabled,
      speaking: p.isSpeaking, deafened: p === room?.localParticipant && deafened,
    };
  }

  function stream(p) {
    const active = (collection) => [...collection.values()].filter((pub) => !pub.isMuted && pub.track?.mediaStreamTrack);
    const videos = active(p.videoTrackPublications);
    const preferred = videos.find((pub) => pub.source === "screen_share") || videos[0];
    const tracks = [...active(p.audioTrackPublications), ...(preferred ? [preferred] : [])]
      .map((pub) => pub.track.mediaStreamTrack);
    const prior = renderedStreams.get(p.identity);
    if (prior?.tracks.length === tracks.length && tracks.every((t, i) => t === prior.tracks[i])) return prior.stream;
    const result = new MediaStream(tracks);
    renderedStreams.set(p.identity, { tracks, stream: result });
    return result;
  }

  function watch(gid, cid) {
    const key = gid + "/" + cid;
    if (current?.room === key) return;
    const record = roster.get(key) || { items: [], time: 0 };
    if (record.loading || Date.now() - record.time < 9500) return;
    roster.set(key, record);
    record.loading = true;
    record.time = Date.now();
    api(path(gid, cid) + "/voice-participants").then(({ participants }) => {
      const items = participants.map((p) => ({
        tab: p.identity, akun: p.identity, room: key, mic: !p.audioMuted,
        video: p.videoEnabled || p.screenShareEnabled, speaking: false, deafened: false,
      }));
      if (JSON.stringify(items) === JSON.stringify(record.items)) return;
      record.items = items;
      emit("presence");
    }).catch(() => {}).finally(() => { record.loading = false; });
  }

  function participants(key) {
    if (current && current.room === key && room) {
      return [room.localParticipant, ...room.remoteParticipants.values()].map((p) => participant(p, key));
    }
    return roster.get(key)?.items || [];
  }

  function state() {
    return {
      current, pending, failure, busy, deafened, devices: { ...selected },
      screen: Boolean(room?.localParticipant.isScreenShareEnabled),
      participants: participants(current?.room),
      stream: current && room ? stream(room.localParticipant) : null,
      peers: current && room ? [...room.remoteParticipants.values()].map((p) => ({
        id: p.identity, stream: stream(p), connection: room.state,
      })) : [],
      status: pending ? "connecting" : failure ? "failed" : !current ? "idle" :
        room?.state === "connected" ? "connected" : "disconnected",
    };
  }

  function disconnect() {
    const previous = room;
    room = current = pending = failure = null;
    renderedStreams.clear();
    deafened = restoreMic = busy = false;
    previous?.disconnect().catch(() => {});
  }

  function leave() {
    const target = current;
    disconnect();
    if (target) {
      roster.delete(target.room);
      watch(target.gid, target.cid);
    }
    emit("state");
  }

  async function join(gid, cid, video = false, invite = false, options = {}) {
    if (current?.gid === gid && current.cid === cid) return true;
    if (pending?.gid === gid && pending.cid === cid) return false;
    disconnect();
    const target = { gid, cid, room: gid + "/" + cid, video, invite, started: Date.now() };
    pending = target;
    emit("state");
    let signalEndpoint;
    try {
      const [group, sdk, access] = await Promise.all([
        NgumpulGrupData.get(gid), NgumpulLiveKit.load(),
        api(path(gid, cid) + "/voice-token", { method: "POST", includeOrigin: true }),
      ]);
      if (pending !== target) return false;
      Object.assign(target, { nama: group.ruang.channels.find((c) => c.id === cid)?.nama,
        grup: group.nama, warnaAnggota: group.warnaAnggota });
      signalEndpoint = NgumpulLiveKit.resolveEndpoint(access);
      const next = new sdk.Room({ adaptiveStream: true, dynacast: true });
      room = next;
      const update = () => { if (room === next) emit("state"); };
      for (const key of ["ParticipantConnected", "ParticipantDisconnected", "TrackSubscribed", "TrackUnsubscribed",
        "LocalTrackPublished", "LocalTrackUnpublished", "TrackMuted", "TrackUnmuted", "ActiveSpeakersChanged",
        "ConnectionStateChanged", "TrackStreamStateChanged"]) next.on(sdk.RoomEvent[key], update);
      next.on(sdk.RoomEvent.ParticipantDisconnected, (p) => renderedStreams.delete(p.identity));
      next.on(sdk.RoomEvent.Disconnected, () => {
        if (room !== next || pending === target) return;
        disconnect();
        failure = { ...target, message: "Koneksi ruang suara terputus." };
        emit("state");
      });
      await next.connect(signalEndpoint, access.token);
      if (pending !== target) { await next.disconnect(); return false; }
      if (!options.muted) await next.localParticipant.setMicrophoneEnabled(true,
        selected.microphone ? { deviceId: selected.microphone } : undefined);
      if (video) await next.localParticipant.setCameraEnabled(true,
        selected.camera ? { deviceId: selected.camera } : undefined);
      if (pending !== target) { await next.disconnect(); return false; }
      current = target;
      pending = null;
      emit("state");
      if (invite) api(path(gid, cid) + "/voice-invites", { method: "POST", body: { video } })
        .catch((error) => { if (error.status !== 404) emit("error", message(error)); });
      return true;
    } catch (err) {
      if (pending !== target) return false;
      disconnect();
      failure = { ...target, message: NgumpulLiveKit.describeError(err, signalEndpoint) || message(err) };
      emit("state");
      emit("error", failure.message);
      return false;
    }
  }

  async function change(action) {
    if (!current || busy) return;
    const activeRoom = room;
    busy = true;
    emit("state");
    try { await action(activeRoom.localParticipant); }
    catch (error) { if (room === activeRoom) emit("error", message(error)); }
    finally {
      if (room === activeRoom) { busy = false; emit("state"); }
    }
  }

  async function devices() {
    const available = await navigator.mediaDevices.enumerateDevices();
    const labels = { microphone: "Mikrofon", camera: "Kamera", output: "Speaker" };
    return { selected: { ...selected }, ...Object.fromEntries(Object.entries(deviceKinds).map(([key, kind]) => [
      key, [{ id: "", nama: "Default" }, ...available.filter((d) =>
        d.kind === kind && d.deviceId && d.deviceId !== "default").map((d, i) =>
        ({ id: d.deviceId, nama: d.label || labels[key] + " " + (i + 1) }))],
    ])) };
  }

  async function configureDevices(values) {
    if (!current || busy) throw new Error("Ruang suara belum siap.");
    const activeRoom = room;
    const updated = [];
    busy = true;
    emit("state");
    try {
      for (const [type, key] of Object.entries(deviceKinds)) {
        if (type === "output" || values[type] === undefined || values[type] === selected[type]) continue;
        if (!(await activeRoom.switchActiveDevice(key, values[type] || "default"))) throw new Error("Perangkat tidak tersedia.");
        updated.push(type);
      }
      Object.assign(selected, values);
      sessionStorage.setItem(deviceKey, JSON.stringify(selected));
    } catch (error) {
      await Promise.allSettled(updated.map((type) => activeRoom.switchActiveDevice(deviceKinds[type], selected[type] || "default")));
      throw error;
    } finally {
      if (room === activeRoom) { busy = false; emit("state"); }
    }
  }

  NgumpulDM.events.addEventListener("user-event", (event) => {
    const invitation = event.detail;
    if (invitation.type !== "voice_invite" || current || pending) return;
    emit("incoming", { gid: invitation.serverId, cid: invitation.channelId, akun: invitation.actorId,
      video: invitation.video, started: Date.parse(invitation.createdAt) });
  });
  window.addEventListener("pagehide", disconnect);
  return {
    events, join, leave, state, participants, watch, devices, configureDevices,
    moderate: (gid, cid, identity, body) => api(path(gid, cid) + "/voice-participants/" + enc(identity),
      { method: "PATCH", body }),
    mic: () => change(async (p) => {
      await p.setMicrophoneEnabled(deafened || !p.isMicrophoneEnabled);
      deafened = false;
    }),
    camera: () => change((p) => p.setCameraEnabled(!p.isCameraEnabled)),
    screen: () => change((p) => p.setScreenShareEnabled(!p.isScreenShareEnabled)),
    deafen: () => change(async (p) => {
      if (!deafened) {
        restoreMic = p.isMicrophoneEnabled;
        if (restoreMic) await p.setMicrophoneEnabled(false);
      } else if (restoreMic) await p.setMicrophoneEnabled(true);
      deafened = !deafened;
    }),
  };
})();
