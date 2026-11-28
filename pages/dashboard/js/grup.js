(() => {
  "use strict";
  const D = window.NgumpulGrupData,
    B = window.NgumpulGrupDasar,
    M = window.NgumpulGrupMedia,
    P = window.NgumpulGrupPanggilan;
  if (!D || !userAktif) return;
  const $ = (id) => document.getElementById(id),
    akun = userAktif.id;
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const icon = (name) => {
    const n = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    n.classList.add("ikon");
    n.setAttribute("aria-hidden", "true");
    const u = document.createElementNS(n.namespaceURI, "use");
    // "search" dipakai dua gaya: isi (kotak cari chat) dan garis (ruang grup)
    u.setAttribute("href", "#i-" + (name === "search" ? "search-garis" : name));
    n.append(u);
    return n;
  };
  const button = (label, action, symbol, cls = "ruang-icon") => {
    const b = el("button", cls, symbol ? undefined : label);
    b.type = "button";
    b.setAttribute("aria-label", label);
    b.title = label;
    if (symbol) {
      b.append(icon(symbol));
      if (b.classList.contains("grup-info-row")) {
        b.append(el("span", "", label), icon("next"));
        b.removeAttribute("title");
      }
    }
    b.addEventListener("click", () =>
      Promise.resolve().then(action).catch(error),
    );
    return b;
  };
  let gid = null,
    cid = null,
    group = null,
    listVersion = 0,
    chatVersion = 0,
    timer,
    sending = false,
    recording = null,
    recordStarting = false;
  let drawerMode = null,
    pendingInvite = null,
    incomingTimer,
    callStarted = null;
  let drawerFocus = null,
    rightPanelVersion = 0,
    channelSelection = 0,
    callExpanded = false,
    callFocus = null,
    audioBlocked = false,
    modalState = null,
    managementFingerprint = "",
    galleryFingerprint = "",
    galleryTab = "Media",
    callViewMode = "grid",
    focusedParticipant = null;
  const audioPlayers = new Map(),
    previewMuted = new Map();
  const collapsedKey = D.kunci("kategori-lipat", akun);
  let collapsedCategories;
  try {
    collapsedCategories = new Set(
      JSON.parse(sessionStorage.getItem(collapsedKey) || "[]"),
    );
  } catch (_) {
    collapsedCategories = new Set();
  }
  const attachments = new Map(),
    attempts = new Map(),
    positions = new Map(),
    readingAnchors = new Map(),
    lastChannel = new Map();
  let renderedHistory = "",
    renderedHeader = "",
    renderedSidebar = "";
  const key = () => gid + "/" + cid;
  window.NgumpulGrupKunci = () => key();
  // hapus pesan grup: dipanggil dari dropdown aksi pesan (aksi-pesan.js)
  window.NgumpulGrupHapus = {
    async minta(idPesan) {
      const id = gid,
        channelId = cid;
      if (!id || !channelId || !window.NgumpulHapus) return;
      const g = await D.get(id);
      const p = (await D.messages(g, channelId)).find((x) => x.id === idPesan);
      if (!p || p.jenis === "aktivitas") return;
      const segarkan = async () => {
        if (gid === id && cid === channelId) await refresh();
        await renderList();
      };
      window.NgumpulHapus.dialog({
        langsung: !!p.dihapus,
        bisaSemua: !p.dihapus && (p.pengirimId === akun || isAdmin(g)) && !g.keluar,
        cuplikan: p.dihapus ? "" : p.isi || labelAttachment(p),
        hapusSaya: async () => {
          await D.sembunyi(id, idPesan, true);
          await segarkan();
          return true;
        },
        hapusSemua: async () => {
          await D.hapus(id, idPesan);
          await segarkan();
          return true;
        },
      });
    },
  };
  const isAdmin = (g) => !g.keluar && g.adminIds.includes(akun);
  function toast(text) {
    $("ruang-toast").textContent = text;
    $("ruang-toast").hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => {
      $("ruang-toast").hidden = true;
    }, 4000);
  }
  const error = (e) => toast(e.message || "Belum berhasil. Coba lagi.");
  const root = el("section", "ruang-channel");
  root.id = "ruang-channel-grup";
  root.hidden = true;
  root.innerHTML = `<header class="ruang-header"><button class="ruang-icon ruang-back" id="ruang-kembali" type="button" aria-label="Kembali ke channel"><svg class="ikon"><use href="#i-back"/></svg></button><div class="ruang-heading"><h2 id="ruang-judul"></h2><p id="ruang-subjudul"></p></div><div class="ruang-actions" id="ruang-header-actions"></div></header>
        <form class="ruang-search" id="ruang-search" hidden><input id="ruang-cari-pesan" type="search" placeholder="Cari di channel ini" aria-label="Cari pesan"><span id="ruang-hasil-cari" role="status"></span><button type="button" id="ruang-prev" aria-label="Hasil sebelumnya">↑</button><button type="button" id="ruang-next" aria-label="Hasil berikutnya">↓</button><button type="button" id="ruang-close-search" aria-label="Tutup pencarian">×</button></form>
        <div class="ruang-messages" id="ruang-messages" role="log" aria-label="Pesan channel"></div><div class="ruang-lobby" id="ruang-lobby" hidden></div>
        <div class="ruang-preview" id="ruang-preview" hidden></div><div class="ruang-emoji" id="ruang-emoji" aria-label="Pilih emoji" hidden></div>
        <div class="ruang-record" id="ruang-record" hidden><span class="ruang-record-dot"></span><span id="ruang-record-time" role="timer">00:00</span><button type="button" id="ruang-record-cancel">Batal</button><button type="button" id="ruang-record-send">Kirim</button></div>
        <form class="ruang-composer" id="ruang-composer"><button class="ruang-icon" id="ruang-lampiran" type="button" aria-label="Tambah lampiran">+</button><input id="ruang-files" type="file" multiple hidden><button class="ruang-icon" id="ruang-btn-emoji" type="button" aria-label="Pilih emoji">☺</button><textarea id="ruang-input" rows="1" maxlength="4000" placeholder="Tulis pesan" aria-label="Tulis pesan"></textarea><button class="ruang-icon ruang-send" id="ruang-send" type="submit" aria-label="Rekam pesan suara"></button></form><p id="ruang-status" role="status" hidden></p>`;
  $("panel-sisi-kanan").append(root);
  const sidebar = el("section", "ruang-sidebar");
  sidebar.id = "ruang-sidebar";
  sidebar.hidden = true;
  $("panel-tab-grup").append(sidebar);
  const drawer = el("aside", "grup-info-panel ruang-drawer");
  drawer.id = "ruang-drawer";
  drawer.hidden = true;
  drawer.innerHTML =
    '<header class="detail-panel-header"><button class="ruang-icon" id="ruang-drawer-back" aria-label="Kembali ke Info Grup" type="button">←</button><h2 id="ruang-drawer-title"></h2><button class="detail-close" id="ruang-drawer-close" type="button" aria-label="Tutup panel">×</button></header><div class="detail-panel-content" id="ruang-drawer-content"></div>';
  document.querySelector(".dashboard-container").append(drawer);
  const dialog = el("dialog", "grup-dialog ruang-dialog");
  dialog.id = "ruang-dialog";
  dialog.setAttribute("aria-labelledby", "ruang-dialog-title");
  document.body.append(dialog);
  const popup = el("div", "ruang-toast");
  popup.id = "ruang-toast";
  popup.hidden = true;
  popup.setAttribute("role", "status");
  document.body.append(popup);
  const messageMenu = el("div", "message-context-menu");
  messageMenu.id = "menu-edit-pesan-grup";
  messageMenu.hidden = true;
  messageMenu.setAttribute("role", "menu");
  messageMenu.setAttribute("aria-label", "Aksi pesan grup");
  const messageEditButton = button("Edit pesan", editMessage, null, "");
  messageEditButton.setAttribute("role", "menuitem");
  const messageEditIcon = el("img");
  messageEditIcon.src = "../../assets/img/edit-pesan.png";
  messageEditIcon.alt = "";
  messageEditButton.prepend(messageEditIcon);
  messageMenu.append(messageEditButton);
  document.body.append(messageMenu);
  let messageTarget = null, messageMenuTimer = null, messageMenuVersion = 0;
  const call = el("section", "ruang-call");
  call.hidden = true;
  call.id = "ruang-call";
  call.setAttribute("role", "dialog");
  call.setAttribute("aria-modal", "true");
  call.setAttribute("aria-labelledby", "ruang-call-name");
  call.innerHTML =
    '<header class="ruang-call-top"><span>Ruang suara</span></header><p id="ruang-call-time" role="timer"></p><h2 id="ruang-call-name"></h2><div class="ruang-call-grid" id="ruang-call-grid"></div><p id="ruang-call-error" role="status"></p><div class="ruang-call-controls" id="ruang-call-controls"></div>';
  call
    .querySelector("header")
    .append(
      button("Kembali ke obrolan", () => showCall(false), "chevron-down"),
    );
  call.querySelector("#ruang-call-name").after(createViewControls());
  document.body.append(call);
  const audioOutput = el("div");
  audioOutput.id = "ruang-audio-output";
  audioOutput.setAttribute("aria-hidden", "true");
  document.body.append(audioOutput);
  const voiceBar = el("section", "ruang-voice-bar");
  voiceBar.id = "ruang-voice-bar";
  voiceBar.hidden = true;
  voiceBar.setAttribute("aria-label", "Koneksi suara");
  const voiceSummary = button(
    "Lihat peserta",
    () => showCall(true),
    "speaker",
    "ruang-voice-summary",
  );
  const voiceDetails = el("span", "ruang-voice-details");
  voiceDetails.innerHTML =
    '<strong id="ruang-voice-status" role="status"></strong><span id="ruang-voice-name"></span>';
  voiceSummary.append(voiceDetails, icon("maximize"));
  const voiceControls = el("div", "ruang-call-controls ruang-voice-controls");
  const audioRetry = button(
    "Aktifkan audio",
    () => resumeAudio(),
    null,
    "ruang-audio-retry",
  );
  audioRetry.hidden = true;
  audioRetry.id = "ruang-audio-retry";
  voiceBar.append(voiceSummary, audioRetry, voiceControls);
  document.body.append(voiceBar);
  const voiceSize = new ResizeObserver(() => {
    const rect = $("panel-sisi-kiri").getBoundingClientRect();
    if (rect.width) {
      voiceBar.style.setProperty("--ruang-sidebar-width", rect.width + "px");
      voiceBar.style.setProperty("--ruang-sidebar-left", rect.left + "px");
    }
    if (!voiceBar.hidden)
      document.documentElement.style.setProperty(
        "--ruang-voice-height",
        voiceBar.offsetHeight + "px",
      );
  });
  voiceSize.observe($("panel-sisi-kiri"));
  voiceSize.observe(voiceBar);
  const incoming = el("dialog", "grup-dialog ruang-incoming");
  incoming.id = "ruang-incoming";
  incoming.setAttribute("aria-label", "Panggilan masuk");
  document.body.append(incoming);
  const text = $("ruang-input"),
    box = $("ruang-messages");
  $("ruang-lampiran").replaceChildren(icon("plus"));
  $("ruang-btn-emoji").replaceChildren(icon("emoji"));
  $("ruang-prev").replaceChildren(icon("chevron-up"));
  $("ruang-next").replaceChildren(icon("chevron-down"));
  $("ruang-close-search").replaceChildren(icon("close"));
  $("ruang-search").prepend(icon("search"));
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const panelAnimations = new WeakMap();
  function cancelPanelMotion(node) {
    const animation = panelAnimations.get(node);
    if (!animation) return;
    panelAnimations.delete(node);
    animation.cancel();
    node.inert = false;
  }
  function closePanel(node, finish) {
    cancelPanelMotion(node);
    if (motion.matches || node.hidden) {
      finish();
      return;
    }
    const animation = node.animate(
      [
        { opacity: 1, transform: "translateX(0)" },
        { opacity: 0, transform: "translateX(10px)" },
      ],
      { duration: 140, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" },
    );
    panelAnimations.set(node, animation);
    node.inert = true;
    animation.finished.then(
      () => {
        if (panelAnimations.get(node) !== animation) return;
        panelAnimations.delete(node);
        node.inert = false;
        finish();
        animation.cancel();
      },
      () => {},
    );
  }
  function sinkronSidebarGrup(tabAktif = null) {
    const layout = document.querySelector(".dashboard-container");
    const grupTerpilih =
      tabAktif === null
        ? $("tab-grup").classList.contains("aktif")
        : tabAktif === "grup";
    const sempit = grupTerpilih && !sidebar.hidden;
    if (layout.classList.contains("grup-channel-aktif") === sempit) return;
    captureLayoutAnchor();
    layout.classList.toggle("grup-channel-aktif", sempit);
  }
  $("panel-chat-kosong").replaceChildren(
    el("h2", "", "Pilih obrolan"),
    el("p", "", "Pilih teman atau channel grup untuk mulai ngobrol."),
  );

  function badge(node, count) {
    let b = node.querySelector(":scope > .ruang-badge");
    if (!count) {
      b?.remove();
      return;
    }
    if (!b) {
      b = el("span", "ruang-badge");
      node.append(b);
    }
    b.textContent = count > 99 ? "99+" : count;
    b.setAttribute("aria-label", count + " pesan belum dibaca");
  }
  function visible() {
    return (
      !root.hidden &&
      call.hidden &&
      !panelTabGrup.hidden &&
      document.visibilityState === "visible" &&
      document.hasFocus() &&
      !document
        .querySelector(".dashboard-container")
        .classList.contains("grup-wizard-open") &&
      !document.querySelector("dialog[open]") &&
      getComputedStyle(panelLayerSetelan).display === "none" &&
      (!matchMedia("(max-width:900px)").matches ||
        (drawer.hidden && $("panel-info-grup").hidden))
    );
  }
  function savePosition() {
    if (
      gid &&
      cid &&
      !root.hidden &&
      !box.hidden &&
      box.getClientRects().length
    )
      positions.set(key(), box.scrollTop);
  }
  function saveDraft() {
    if (gid && cid && !group?.keluar) D.draft(gid, cid, text.value);
  }
  function hideMiddle() {
    root.hidden = true;
    document
      .querySelector(".dashboard-container")
      .classList.remove("ruang-room-open");
    $("panel-chat-kosong").style.display = "flex";
  }
  async function open(id, selected = undefined) {
    const version = ++channelSelection;
    closeMessageMenu();
    saveDraft();
    savePosition();
    await stopRecording(true);
    const [g] = await Promise.all([D.get(id), draftsReady]);
    if (version !== channelSelection) return;
    B.tutupInfo(false);
    closeDrawer(false);
    gid = id;
    group = g;
    B.seleksi(id, g);
    pilihTabDashboard("grup");
    $("panel-chat-grup").hidden = true;
    panelChatAktif.style.display = "none";
    const saved = selected ?? lastChannel.get(id) ?? g.ruang.channels.find((c) => c.jenis === "teks")?.id;
    cid = g.ruang.channels.some((c) => c.id === saved) ? saved : null;
    $("panel-tab-grup").querySelector(".grup-content").hidden = true;
    sidebar.hidden = false;
    sinkronSidebarGrup();
    if (cid) await selectChannel(cid, false);
    else { D.watch(); hideMiddle(); }
    await renderSidebar();
    await renderList();
  }
  async function selectChannel(id, joinVoice = false) {
    closeMessageMenu();
    const version = ++channelSelection,
      groupId = gid;
    saveDraft();
    savePosition();
    await stopRecording(true);
    const selectedGroup = await D.get(groupId);
    if (version !== channelSelection || groupId !== gid) return;
    group = selectedGroup;
    const c = group.ruang.channels.find((c) => c.id === id);
    if (!c) {
      cid = null;
      hideMiddle();
      return;
    }
    B.tutupInfo(false);
    closeDrawer(false);
    cid = id;
    showTyping();
    D.watch(groupId, c.jenis === "teks" ? id : undefined);
    lastChannel.set(gid, cid);
    renderedHistory = "";
    B.seleksi(gid, group);
    $("panel-chat-grup").hidden = true;
    text.value = group.keluar ? "" : D.draft(gid, cid);
    root.hidden = false;
    $("panel-chat-kosong").style.display = "none";
    panelChatAktif.style.display = "none";
    document
      .querySelector(".dashboard-container")
      .classList.add("ruang-room-open");
    $("ruang-search").hidden = true;
    $("ruang-cari-pesan").value = "";
    $("ruang-emoji").hidden = true;
    await refresh(true);
    if (version !== channelSelection || groupId !== gid) return;
    if (c.jenis === "teks" && !group.keluar) await D.read(group, c.id, true);
    await renderSidebar();
    await renderList();
    await renderPreview();
    autosize();
    if (
      c.jenis === "suara" &&
      joinVoice &&
      !group.keluar &&
      !matchMedia("(max-width:700px)").matches
    ) {
      await startCall(false, false, groupId, id);
      return;
    }
    if (
      c.jenis === "teks" &&
      !group.keluar &&
      !matchMedia("(max-width:700px)").matches
    )
      text.focus();
    else $("ruang-kembali").focus({ preventScroll: true });
  }
  async function renderList() {
    const v = ++listVersion;
    const all = await D.list();
    const enriched = await Promise.all(all.map(D.summary));
    if (v !== listVersion) return;
    badge(
      $("tab-grup"),
      enriched.reduce((n, item) => n + item.unread, 0),
    );
    const query = $("input-cari-grup").value.trim().toLocaleLowerCase("id-ID");
    const shown = enriched
      .filter(({ g }) => g.nama.toLocaleLowerCase("id-ID").includes(query))
      .sort(
        (a, b) =>
          (b.last?.dibuat || b.g.dibuat) - (a.last?.dibuat || a.g.dibuat),
      );
    const target = $("daftar-grup");
    target.replaceChildren();
    if (!shown.length)
      target.append(
        el(
          "p",
          "grup-kosong",
          query ? "Grup tidak ditemukan." : "Belum ada grup.",
        ),
      );
    for (const { g, last, unread } of shown) {
      const row = el("div", "chat-card grup-baris"),
        b = button("Buka " + g.nama, () => open(g.id), null, "grup-baris-buka");
      const av = el("span", "circle-avatar");
      B.avatar(av, g.nama, g.foto);
      let hash = 0;
      for (const char of g.nama) hash = (hash * 31 + char.charCodeAt(0)) % 360;
      av.style.backgroundColor = `hsl(${hash} 48% 42%)`;
      av.style.color = "#fff";
      const meta = el("span", "card-meta"),
        top = el("span", "card-top");
      top.append(
        el("strong", "card-title", g.nama),
        el(
          "small",
          "",
          last ? formatJamPesan(new Date(last.dibuat).toISOString()) : "",
        ),
      );
      const counts = g.ruang.channels.reduce(
        (r, c) => {
          r[c.jenis]++;
          return r;
        },
        { teks: 0, suara: 0 },
      );
      const preview = last
        ? last.jenis === "aktivitas"
          ? B.aktivitas(last)
          : (last.pengirimId === akun ? "Kamu" : B.nama(last.pengirimId)) +
            ": " +
            (last.dihapus ? "Pesan ini telah dihapus" : last.isi || labelAttachment(last))
        : "Mulai chat grup";
      meta.append(
        top,
        el(
          "span",
          "ruang-counts",
          counts.teks + " channel teks · " + counts.suara + " channel suara",
        ),
        el("span", "card-preview", preview),
      );
      b.replaceChildren(av, meta);
      if (D.muted(g.id)) {
        const muted = icon("bell-off");
        muted.classList.add("ruang-muted");
        top.append(muted);
        b.setAttribute("aria-label", "Buka " + g.nama + ", dibisukan");
      }
      badge(b, unread);
      const more = button(
        "Menu " + g.nama,
        () => {
          const r = more.getBoundingClientRect();
          B.menu(g.id, r.right, r.bottom, more);
        },
        "more",
        "grup-row-menu",
      );
      row.append(b, more);
      row.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        B.menu(g.id, e.clientX, e.clientY, more);
      });
      target.append(row);
    }
    if (gid) {
      const latest = all.find((g) => g.id === gid);
      if (!latest) {
        gid = cid = null;
        backToList();
        return;
      }
      group = latest;
      B.seleksi(gid, group);
      if (drawerMode === "manage" && !isAdmin(group)) closeDrawer(false);
      if (cid && !group.ruang.channels.some((c) => c.id === cid)) {
        cid = null;
        hideMiddle();
      }
      if (!sidebar.hidden) await renderSidebar();
      if (drawerMode === "manage" && !drawer.hidden) renderManagement(latest);
      if (drawerMode === "gallery" && !drawer.hidden)
        await gallery(gid, galleryTab, true);
      refreshModalData(latest);
    }
  }
  async function renderSidebar() {
    if (!group || sidebar.hidden) return;
    for (const c of group.ruang.channels) if (c.jenis === "suara") P.watch(group.id, c.id);
    const id = gid,
      counts = await D.unreadCounts(group);
    if (id !== gid || sidebar.hidden) return;
    const fingerprint = JSON.stringify([
      group.id,
      group.nama,
      isAdmin(group),
      group.ruang.categories,
      group.ruang.channels,
      group.ruang.channels.map((c) =>
        c.jenis === "teks"
          ? (counts[c.id]?.unreadCount || 0)
          : 0,
      ),
    ]);
    if (fingerprint === renderedSidebar && sidebar.childElementCount) {
      updateVoiceSidebar();
      return;
    }
    renderedSidebar = fingerprint;
    const scroll = sidebar.querySelector(".ruang-channel-list")?.scrollTop || 0;
    const header = el("header", "ruang-group-header");
    header.append(
      button("Kembali ke daftar grup", backToList, "back"),
      el("h2", "", group.nama),
      button("Info Grup", () => B.info(gid), "info"),
    );
    if (isAdmin(group))
      header.append(button("Kelola channel", () => management(), "gear"));
    header.querySelector("h2").title = group.nama;
    sidebar.replaceChildren(header);
    const list = el("div", "ruang-channel-list");
    for (const category of group.ruang.categories) {
      const channels = group.ruang.channels.filter(
        (c) => c.kategoriId === category.id,
      );
      if (!channels.length && !isAdmin(group)) continue;
      const heading = el("h3", "ruang-category-heading"),
        section = el("div", "ruang-category-channels");
      section.id = "ruang-kategori-" + category.id;
      section.hidden = collapsedCategories.has(category.id);
      const toggle = button(
        category.nama,
        () => {
          section.hidden = !section.hidden;
          if (section.hidden) collapsedCategories.add(category.id);
          else collapsedCategories.delete(category.id);
          toggle.setAttribute("aria-expanded", String(!section.hidden));
          try {
            sessionStorage.setItem(
              collapsedKey,
              JSON.stringify([...collapsedCategories]),
            );
          } catch (_) {}
        },
        null,
        "ruang-category-toggle",
      );
      toggle.setAttribute("aria-expanded", String(!section.hidden));
      toggle.setAttribute("aria-controls", section.id);
      toggle.replaceChildren(
        icon("chevron-down"),
        el("span", "", category.nama),
      );
      const unread = channels.reduce(
        (n, c) => n + (counts[c.id]?.unreadCount || 0),
        0,
      );
      badge(toggle, unread);
      heading.append(toggle);
      list.append(heading, section);
      if (!channels.length)
        section.append(el("p", "ruang-empty-small", "Kosong"));
      for (const c of channels) {
        const row = button(
          c.nama,
          () => selectChannel(c.id, true),
          null,
          "ruang-channel-row" + (cid === c.id ? " aktif" : ""),
        );
        row.setAttribute("aria-current", cid === c.id ? "page" : "false");
        row.replaceChildren(
          c.jenis === "teks" ? el("span", "ruang-hash", "#") : icon("speaker"),
          el("span", "ruang-channel-name", c.nama),
        );
        if (c.jenis === "teks" && !group.keluar)
          badge(row, (counts[c.id]?.unreadCount || 0));
        section.append(row);
        if (c.jenis === "suara") {
          row.dataset.voiceRoom = group.id + "/" + c.id;
          const members = el("div", "ruang-voice-members");
          members.dataset.room = row.dataset.voiceRoom;
          members.setAttribute("aria-label", "Peserta " + c.nama);
          section.append(members);
        }
      }
    }
    sidebar.append(list);
    list.scrollTop = scroll;
    updateVoiceSidebar();
  }
  function backToList() {
    closeMessageMenu();
    channelSelection++;
    D.watch();
    saveDraft();
    savePosition();
    stopRecording(true).catch(error);
    B.tutupInfo(false);
    closeDrawer(false);
    sidebar.hidden = true;
    sinkronSidebarGrup();
    $("panel-tab-grup").querySelector(".grup-content").hidden = false;
    gid = cid = group = null;
    B.seleksi(null, null);
    hideMiddle();
    renderList().catch(error);
  }
  const dateKey = (t) => new Date(t).toLocaleDateString("sv-SE");
  function dateLabel(t) {
    const now = new Date(),
      yesterday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 1,
      );
    return dateKey(t) === dateKey(now)
      ? "Hari ini"
      : dateKey(t) === dateKey(yesterday)
        ? "Kemarin"
        : new Date(t).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });
  }
  const labelAttachment = (p) =>
    p.lampiran?.some((f) => f.mime?.startsWith("audio/"))
      ? "Pesan suara"
      : p.lampiran?.[0]?.nama || "Lampiran";
  // id pesan yang sudah tampil per channel: hanya pesan baru yang dapat animasi masuk (tema Pastel Party)
  const idTerender = new Map();
  async function refresh(force = false) {
    if (!gid || !cid || root.hidden) return;
    const v = ++chatVersion,
      id = gid,
      channelId = cid;
    const g = await D.get(id).catch((failure) => {
      if (failure.status !== 404) throw failure;
      return null;
    });
    const c = g?.ruang.channels.find((c) => c.id === channelId);
    if (v !== chatVersion || gid !== id || cid !== channelId) return;
    if (!g) { api.afterExit(id); return; }
    if (!c) {
      D.watch();
      cid = null;
      group = g;
      hideMiddle();
      await renderSidebar();
      return;
    }
    group = g;
    B.seleksi(id, g);
    $("ruang-judul").textContent = (c.jenis === "teks" ? "# " : "") + c.nama;
    $("ruang-subjudul").textContent = g.nama;
    const actions = $("ruang-header-actions"),
      headerKey = id + "/" + c.id + "/" + g.keluar;
    if (renderedHeader !== headerKey) {
      renderedHeader = headerKey;
      actions.replaceChildren();
      if (!g.keluar && c.jenis === "teks")
        actions.append(
          button(
            "Panggilan suara",
            () => startCall(false, c.jenis === "teks"),
            "phone",
          ),
          button(
            "Panggilan video",
            () => startCall(true, c.jenis === "teks"),
            "video",
          ),
        );
      actions.hidden = c.jenis === "suara";
      if (c.jenis === "teks") {
        actions.append(button("Info Grup", () => B.info(id), "info"));
        actions.append(button("Cari pesan", openSearch, "search"));
        actions.append(button("Pesan disematkan", () => showPins(id, c.id), "pin"));
      }
    }
    $("ruang-lobby").hidden = c.jenis !== "suara";
    box.hidden = c.jenis !== "teks";
    $("ruang-composer").hidden = g.keluar || c.jenis !== "teks" || !!recording;
    $("ruang-status").hidden = !g.keluar;
    $("ruang-status").textContent = "Kamu sudah keluar dari grup ini.";
    if (c.jenis === "suara") {
      renderLobby(c);
      return;
    }
    const readChanged = await D.read(g, c.id, visible());
    if (readChanged) await renderList();
    const messages = await D.messages(g, c.id);
    if (v !== chatVersion || gid !== id || cid !== channelId) return;
    const fingerprint = JSON.stringify([
      id,
      c.id,
      messages,
      g.nama,
      g.foto,
      g.anggotaIds,
      g.adminIds,
      g.keluar,
      dateKey(Date.now()),
      ...g.anggotaIds.map((id) => [B.nama(id), ambilFotoProfilChat(id)]),
    ]);
    if (!force && fingerprint === renderedHistory) return;
    const atBottom = box.scrollTop + box.clientHeight >= box.scrollHeight - 80;
    const scroll = box.scrollTop,
      top = box.getBoundingClientRect().top;
    const anchor = [...box.children].find(
      (n) => n.getBoundingClientRect().bottom > top,
    );
    const anchorId = anchor?.dataset.message,
      offset = anchor?.getBoundingClientRect().top - top;
    const fragment = document.createDocumentFragment();
    if (D.hasOlder(c.id)) fragment.append(button("Muat pesan sebelumnya", async () => {
      await D.older(id, c.id);
      if (gid === id && cid === c.id) await refresh(true);
    }, null, "ruang-pill"));
    const sebelumnya = idTerender.get(id + "/" + channelId);
    let previous = null,
      day = null;
    const intro = c.bawaan ? B.kartu(g, false) : null;
    const timeline = [...messages];
    if (intro)
      timeline.push({
        id: "intro",
        jenis: "awal",
        dibuat: Number.isFinite(intro.waktu) ? intro.waktu : g.dibuat,
      });
    timeline.sort(
      (a, b) =>
        a.dibuat - b.dibuat ||
        (a.jenis === "awal"
          ? -1
          : b.jenis === "awal"
            ? 1
            : a.id.localeCompare(b.id)),
    );
    if (!messages.length && !c.bawaan)
      fragment.append(el("p", "grup-kosong", "Belum ada pesan."));
    for (const p of timeline) {
      if (day !== dateKey(p.dibuat)) {
        day = dateKey(p.dibuat);
        const divider = el("div", "grup-date-divider");
        divider.append(el("time", "", dateLabel(p.dibuat)));
        fragment.append(divider);
      }
      if (p.jenis === "awal") {
        fragment.append(intro.node);
        previous = null;
        continue;
      }
      if (p.jenis === "aktivitas") {
        fragment.append(el("p", "grup-activity", B.aktivitas(p)));
        previous = null;
        continue;
      }
      const own = p.pengirimId === akun;
      const consecutive =
        previous?.pengirimId === p.pengirimId &&
        dateKey(previous.dibuat) === day &&
        p.dibuat - previous.dibuat < 300000;
      const row = el(
        "div",
        "grup-pesan-baris ruang-pesan" +
          (own ? " sendiri" : "") +
          (consecutive ? " lanjutan" : ""),
      );
      row.dataset.message = p.id;
      if (sebelumnya && !sebelumnya.has(p.id)) row.classList.add("pesan-baru");
      row.style.setProperty(
        "--anggota-hue",
        String(g.warnaAnggota[p.pengirimId] ?? 190),
      );
      if (!own) {
        const av = button(
          "Lihat profil " + B.nama(p.pengirimId),
          () => tampilkanInfoKontak(p.pengirimId),
          null,
          "grup-avatar-pengirim",
        );
        B.avatarAnggota(av, g, p.pengirimId);
        if (consecutive) {
          av.style.visibility = "hidden";
          av.tabIndex = -1;
          av.setAttribute("aria-hidden", "true");
        }
        row.append(av);
      }
      if (p.dihapus) {
        const hapusBubble = el(
          "div",
          "chat-bubble grup-pesan pesan-dihapus " + (own ? "kirim" : "terima"),
        );
        if (!consecutive)
          hapusBubble.append(
            el("strong", "grup-pesan-pengirim", own ? "Kamu" : B.nama(p.pengirimId)),
          );
        const ns = "http://www.w3.org/2000/svg";
        const ikonHapus = document.createElementNS(ns, "svg");
        ikonHapus.setAttribute("class", "ikon-pesan-dihapus");
        ikonHapus.setAttribute("viewBox", "0 0 24 24");
        ikonHapus.setAttribute("aria-hidden", "true");
        const lingkaran = document.createElementNS(ns, "circle");
        lingkaran.setAttribute("cx", "12");
        lingkaran.setAttribute("cy", "12");
        lingkaran.setAttribute("r", "9");
        const garis = document.createElementNS(ns, "path");
        garis.setAttribute("d", "M5.6 5.6l12.8 12.8");
        ikonHapus.append(lingkaran, garis);
        const isiHapus = el("span", "pesan-dihapus-isi");
        isiHapus.append(
          ikonHapus,
          document.createTextNode(own ? "Kamu menghapus pesan ini" : "Pesan ini telah dihapus"),
        );
        const footerHapus = el("div", "message-footer");
        footerHapus.append(
          el("time", "timestamp", formatJamPesan(new Date(p.dibuat).toISOString())),
        );
        hapusBubble.append(isiHapus, footerHapus);
        row.append(hapusBubble);
        fragment.append(row);
        previous = p;
        continue;
      }
      const bubble = el(
        "div",
        "chat-bubble grup-pesan " + (own ? "kirim" : "terima"),
      );
      if (own && !g.keluar) {
        bubble.tabIndex = 0;
        bubble.setAttribute("aria-haspopup", "menu");
        bubble.setAttribute("aria-controls", "menu-edit-pesan-grup");
      }
      if (!consecutive)
        bubble.append(
          el(
            "strong",
            "grup-pesan-pengirim",
            own ? "Kamu" : B.nama(p.pengirimId),
          ),
        );
      if (p.forwarded) bubble.append(el("small", "timestamp", "Diteruskan"));
      if (p.balas && typeof p.balas === "object") {
        const kutip = el("button", "message-quoted-message");
        kutip.type = "button";
        kutip.setAttribute("aria-label", "Lompat ke pesan asli");
        kutip.append(
          el("strong", "", String(p.balas.nama || "Pesan asli")),
          el(
            "span",
            "",
            messages.find((m) => m.id === p.balas.id)?.dihapus
              ? "Pesan ini telah dihapus"
              : String(p.balas.teks || "Lampiran"),
          ),
        );
        kutip.onclick = async (ev) => {
          ev.stopPropagation();
          const asal = await revealMessage(id, c.id, p.balas.id);
          if (!asal) return;
          asal.scrollIntoView({ block: "center", behavior: "smooth" });
          asal.classList.remove("ba-sorot");
          void asal.offsetWidth;
          asal.classList.add("ba-sorot");
          setTimeout(() => asal.classList.remove("ba-sorot"), 1400);
        };
        bubble.append(kutip);
      }
      const content = el("span", "grup-pesan-isi");
      content.dataset.text = p.isi;
      appendText(content, p.isi);
      bubble.append(content);
      for (const attachment of p.lampiran || [])
        bubble.append(await M.tampilkan(attachment));
      if (p.location) bubble.append(buatLokasiDM(p.location));
      if (p.poll) bubble.append(buatPollingDM(null, { poll: p.poll, sender: p.pengirimId, id: p.id }, {
        update: (poll) => D.updateMessage(id, c.id, p.id, { poll }), error, manage: isAdmin(g),
      }));
      if (p.pinned) row.dataset.pinned = "true";
      if (p.reactions?.length) {
        const reactions = el("div", "dm-reactions");
        for (const summary of p.reactions) {
          const b = button(summary.emoji + " " + summary.count, () => D.reaction(id, c.id, p.id, summary.emoji));
          b.setAttribute("aria-pressed", String(summary.userIds.includes(akun)));
          reactions.append(b);
        }
        bubble.append(reactions);
      }
      const footer = el("div", "message-footer");
      if (p.editedAt) footer.append(el("span", "timestamp message-edited", "Diedit"));
      footer.append(
        el(
          "time",
          "timestamp",
          formatJamPesan(new Date(p.dibuat).toISOString()),
        ),
      );
      if (own) footer.append(buatIndikatorStatusPesan(p.status));
      bubble.append(footer);
      row.append(bubble);
      fragment.append(row);
      previous = p;
    }
    if (v !== chatVersion || gid !== id || cid !== channelId) return;
    renderedHistory = fingerprint;
    idTerender.set(id + "/" + channelId, new Set(messages.map((m) => m.id)));
    box.replaceChildren(fragment);
    if (force) box.scrollTop = positions.get(key()) ?? box.scrollHeight;
    else if (atBottom) box.scrollTop = box.scrollHeight;
    else {
      box.scrollTop = scroll;
      const replacement = [...box.children].find(
        (n) => n.dataset.message === anchorId,
      );
      if (replacement)
        box.scrollTop += replacement.getBoundingClientRect().top - top - offset;
    }
    updateSearch(false);
    autosize();
  }
  function focusMessage(target) {
    if (!target || target.gid !== gid || target.cid !== cid || root.hidden) return;
    [...box.children].find((row) => row.dataset.message === target.id)
      ?.querySelector(".chat-bubble")?.focus({ preventScroll: true });
  }
  function closeMessageMenu(restoreFocus = false) {
    messageMenuVersion++;
    clearTimeout(messageMenuTimer);
    messageMenu.hidden = true;
    if (restoreFocus) focusMessage(messageTarget);
  }
  async function openMessageMenu(e, keyboard = false) {
    closeMessageMenu();
    const version = messageMenuVersion;
    const bubble = e.target.closest(".chat-bubble");
    const row = bubble?.closest("[data-message]");
    if (!row || !gid || !cid || root.hidden || !bubble.classList.contains("kirim")) return;
    e.preventDefault();
    const target = { gid, cid, id: row.dataset.message };
    const g = await D.get(target.gid);
    const p = (await D.messages(g, target.cid)).find((p) => p.id === target.id);
    if (version !== messageMenuVersion || gid !== target.gid || cid !== target.cid || root.hidden || !D.canEdit(g, p)) return;
    messageTarget = target;
    messageMenu.hidden = false;
    const rect = bubble.getBoundingClientRect();
    const x = keyboard ? rect.left : e.clientX, y = keyboard ? rect.bottom : e.clientY;
    messageMenu.style.left = Math.max(8, Math.min(x, innerWidth - messageMenu.offsetWidth - 8)) + "px";
    messageMenu.style.top = Math.max(8, Math.min(y, innerHeight - messageMenu.offsetHeight - 8)) + "px";
    messageEditButton.focus({ preventScroll: true });
    messageMenuTimer = setTimeout(() => closeMessageMenu(true),
      Math.max(1, p.dibuat + BATAS_WAKTU_EDIT_PESAN - Date.now() + 1));
  }
  async function editMessage() {
    const target = messageTarget;
    closeMessageMenu(true);
    if (!target || gid !== target.gid || cid !== target.cid || root.hidden) return;
    const g = await D.get(target.gid);
    const p = (await D.messages(g, target.cid)).find((p) => p.id === target.id);
    if (gid !== target.gid || cid !== target.cid || root.hidden) return;
    if (!D.canEdit(g, p)) throw new Error("Pesan tidak dapat diedit. Batas waktu edit adalah 5 menit sejak dikirim.");
    const state = modal("Edit pesan", [{
      name: "isi", label: "Pesan", value: p.isi, multiline: true, max: 4000,
    }], async (values) => {
      if (gid !== target.gid || cid !== target.cid || root.hidden)
        throw new Error("Percakapan sudah berpindah. Buka kembali pesan yang ingin diedit.");
      await D.edit(target.gid, target.cid, target.id, values.isi);
    }, "Simpan", { groupId: target.gid, channelId: target.cid });
    state?.form.querySelector("textarea").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
        e.preventDefault();
        if (!state.busy) state.form.requestSubmit();
      }
    });
  }
  box.addEventListener("contextmenu", (e) => openMessageMenu(e).catch(error));
  box.addEventListener("keydown", (e) => {
    if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10"))
      openMessageMenu(e, true).catch(error);
  });
  box.addEventListener("scroll", () => closeMessageMenu(), { passive: true });
  window.addEventListener("resize", () => closeMessageMenu());
  window.addEventListener("blur", () => closeMessageMenu());
  document.addEventListener("pointerdown", (e) => {
    if (!messageMenu.contains(e.target)) closeMessageMenu();
  });
  document.addEventListener("contextmenu", (e) => {
    if (!box.contains(e.target) && !messageMenu.contains(e.target)) closeMessageMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (!messageMenu.hidden && (e.key === "Escape" || e.key === "Tab")) {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); }
      closeMessageMenu(true);
    }
  }, true);
  function appendText(node, value) {
    for (const part of String(value).split(/(https?:\/\/[^\s]+)/g)) {
      if (/^https?:\/\//.test(part)) {
        const link = el("a", "", part);
        link.href = part;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        node.append(link);
      } else node.append(document.createTextNode(part));
    }
  }
  let found = [],
    resultIndex = -1;
  async function revealMessage(id, channel, mid) {
    if (gid !== id || cid !== channel) return null;
    let row = [...box.children].find((n) => n.dataset.message === mid);
    if (!row && await D.locate(id, channel, mid)) {
      if (gid !== id || cid !== channel) return null;
      await refresh(true);
      row = [...box.children].find((n) => n.dataset.message === mid);
    }
    if (!row) { toast("Pesan tidak ditemukan."); return null; }
    row.scrollIntoView({ block: "center", behavior: "smooth" });
    return row;
  }

  async function showPins(id, channel) {
    const items = await D.pins(id, channel);
    if (gid !== id || cid !== channel) return;
    showDrawer("pins", "Pesan disematkan");
    const body = $("ruang-drawer-content");
    body.replaceChildren();
    if (!items.length) body.append(el("p", "ruang-empty-small", "Belum ada pesan disematkan."));
    for (const p of items) {
      const entry = el("div", "ruang-manage-row");
      entry.append(button(p.isi || labelAttachment(p), async () => {
        closeDrawer(false);
        await revealMessage(id, channel, p.id);
      }, null, "ruang-pill"), button("Lepas sematan", async () => {
        await D.pin(id, channel, p.id, false);
        await showPins(id, channel);
      }, "close"));
      body.append(entry);
    }
  }

  let searchTimer, searchVersion = 0;
  function openSearch() {
    $("ruang-search").hidden = false;
    $("ruang-cari-pesan").focus();
  }

  async function updateSearch(show = false) {
    if (!show) return;
    const query = $("ruang-cari-pesan").value.trim();
    const version = ++searchVersion, id = gid, channel = cid;
    const label = $("ruang-hasil-cari");
    const prev = $("ruang-prev"), next = $("ruang-next");
    found = [];
    resultIndex = -1;
    prev.disabled = next.disabled = true;
    label.textContent = query ? "Mencari…" : "";
    if (!query) return;
    try {
      const items = await D.search(id, channel, query.slice(0, 200));
      if (version !== searchVersion || id !== gid || channel !== cid || $("ruang-search").hidden) return;
      found = items;
      label.textContent = items.length ? items.length + " hasil" : "Tidak ditemukan";
      prev.disabled = next.disabled = !items.length;
    } catch (error) {
      if (version === searchVersion) label.textContent = error.message;
    }
  }

  async function jumpResult(delta) {
    if (!found.length) return;
    const start = resultIndex < 0 ? 0 : resultIndex + delta;
    resultIndex = (start + found.length) % found.length;
    const p = found[resultIndex];
    $("ruang-hasil-cari").textContent = (resultIndex + 1) + " / " + found.length;
    await revealMessage(p.grupId, p.channelId, p.id);
  }
  function autosize() {
    if (!root.hidden && !$("ruang-composer").hidden) {
      const bottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
      const position = box.scrollTop;
      const style = getComputedStyle(text);
      const borders =
        parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
      const minimum = parseFloat(style.minHeight) || 44;
      const maximum = parseFloat(style.maxHeight) || 140;
      text.style.overflowY = "hidden";
      text.style.height = "auto";
      const needed = Math.ceil(text.scrollHeight + borders);
      text.style.height = Math.min(maximum, Math.max(minimum, needed)) + "px";
      text.style.overflowY = needed > maximum ? "auto" : "hidden";
      box.scrollTop = bottom ? box.scrollHeight : position;
    }
    const has = !!text.value.trim() || !!attachments.get(key())?.files.length;
    const symbol = has ? "send" : "mic";
    if ($("ruang-send").dataset.icon !== symbol) {
      $("ruang-send").replaceChildren(icon(symbol));
      $("ruang-send").dataset.icon = symbol;
    }
    $("ruang-send").setAttribute(
      "aria-label",
      has ? "Kirim pesan" : "Rekam pesan suara",
    );
  }
  let layoutAnchor = null;
  const leftPanel = $("panel-sisi-kiri");
  const selesaiTransisiSidebar = (event) => {
    if (event.target !== leftPanel || event.propertyName !== "flex-basis")
      return;
    requestAnimationFrame(() => {
      if (
        !leftPanel
          .getAnimations()
          .some((animation) => animation.transitionProperty === "flex-basis")
      )
        layoutAnchor = null;
    });
  };
  leftPanel.addEventListener("transitionend", selesaiTransisiSidebar);
  leftPanel.addEventListener("transitioncancel", selesaiTransisiSidebar);
  function captureLayoutAnchor() {
    if (root.hidden || box.hidden) {
      layoutAnchor = readingAnchors.get(key()) || null;
      return;
    }
    const top = box.getBoundingClientRect().top;
    const node = [...box.children].find(
      (n) => n.getBoundingClientRect().bottom > top,
    );
    layoutAnchor = {
      key: key(),
      node,
      message: node?.dataset.message,
      index: [...box.children].indexOf(node),
      offset: node ? node.getBoundingClientRect().top - top : 0,
      bottom: box.scrollHeight - box.scrollTop - box.clientHeight < 80,
    };
    readingAnchors.set(key(), layoutAnchor);
  }
  ["wheel", "touchstart", "pointerdown"].forEach((type) =>
    box.addEventListener(
      type,
      () => {
        layoutAnchor = null;
      },
      { passive: true },
    ),
  );
  let widthFrame = null,
    previousWidth = 0;
  if (window.ResizeObserver) {
    const observer = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      if (!width || Math.abs(width - previousWidth) < 0.5) return;
      previousWidth = width;
      cancelAnimationFrame(widthFrame);
      widthFrame = requestAnimationFrame(() => {
        autosize();
        if (!layoutAnchor || layoutAnchor.key !== key() || root.hidden) return;
        if (layoutAnchor.bottom) box.scrollTop = box.scrollHeight;
        else {
          const anchor = layoutAnchor.node?.isConnected
            ? layoutAnchor.node
            : layoutAnchor.message
              ? [...box.children].find(
                  (n) => n.dataset.message === layoutAnchor.message,
                )
              : box.children[layoutAnchor.index];
          if (anchor)
            box.scrollTop +=
              anchor.getBoundingClientRect().top -
              box.getBoundingClientRect().top -
              layoutAnchor.offset;
        }
      });
    });
    observer.observe(root);
  }
  async function renderPreview() {
    const target = $("ruang-preview");
    target.replaceChildren();
    const selected = attachments.get(key());
    target.hidden = !selected?.files.length;
    if (!selected) return;
    selected.files.forEach((file, index) => {
      const item = el("div", "ruang-preview-file");
      if (/^(image|video)\//.test(file.type)) {
        const media = el(file.type.startsWith("image") ? "img" : "video");
        const url = URL.createObjectURL(file);
        media.src = url;
        media.onload = media.onloadeddata = () => URL.revokeObjectURL(url);
        item.append(media);
      }
      item.append(
        el("span", "", file.name),
        button(
          "Hapus " + file.name,
          () => {
            selected.files.splice(index, 1);
            selected.saved = null;
            attempts.delete(key());
            renderPreview();
            autosize();
          },
          "close",
        ),
      );
      target.append(item);
    });
    autosize();
  }
  async function send() {
    if (sending || !gid || !cid || group.keluar) return;
    const draft = text.value,
      selection = attachments.get(key()),
      id = gid,
      channel = cid,
      chatKey = key();
    if (!draft.trim() && !selection?.files.length) {
      await startRecording();
      return;
    }
    sending = true;
    $("ruang-send").disabled = true;
    let attempt = attempts.get(chatKey);
    if (!attempt || attempt.text !== draft || attempt.selection !== selection) {
      attempt = { id: D.uid(), text: draft, selection };
      attempts.set(chatKey, attempt);
    }
    try {
      if (selection?.files.length && !selection.saved)
        selection.saved = await M.simpan(selection.files);
      const balas = window.NgumpulBalas?.ambilGrup() || null;
      await D.send(id, channel, draft, selection?.saved || [], attempt.id, balas);
      window.NgumpulBalas?.batalGrup();
      attempts.delete(chatKey);
      attachments.delete(chatKey);
      D.draft(id, channel, "");
      if (gid === id && cid === channel && text.value === draft) {
        text.value = "";
        await renderPreview();
      }
      await refresh();
      box.scrollTop = box.scrollHeight;
      await renderList();
    } catch (e) {
      error(e);
    } finally {
      sending = false;
      $("ruang-send").disabled = false;
      autosize();
    }
  }
  async function startRecording() {
    if (recording || recordStarting) return;
    if (P.state().current)
      throw new Error("Akhiri panggilan sebelum merekam pesan suara.");
    recordStarting = true;
    const origin = key();
    try {
      const result = await M.record((t) => {
        $("ruang-record-time").textContent = duration(t);
      });
      if (origin !== key() || root.hidden || group.keluar) {
        await result.stop(true);
        return;
      }
      recording = result;
      $("ruang-record-time").textContent = "00:00";
      $("ruang-record").hidden = false;
      $("ruang-composer").hidden = true;
    } finally {
      recordStarting = false;
    }
  }
  async function stopRecording(cancel) {
    const r = recording;
    if (!r) return;
    recording = null;
    const origin = key();
    const file = await r.stop(cancel);
    $("ruang-record").hidden = true;
    $("ruang-composer").hidden = !!group?.keluar;
    if (file && origin === key()) {
      attachments.set(origin, { files: [file] });
      await renderPreview();
      await send();
    }
  }
  function renderLobby(c) {
    const lobby = $("ruang-lobby"),
      state = P.state(),
      room = gid + "/" + c.id;
    if (lobby.dataset.channel !== room) {
      lobby.dataset.channel = room;
      const intro = el("div", "ruang-voice-intro");
      intro.append(
        icon("speaker"),
        el("small", "", "Ruang suara"),
        el("h2", "", c.nama),
        el("p", "ruang-stage-status"),
      );
      const grid = el("div", "ruang-call-grid ruang-stage-grid");
      const message = el("p", "ruang-stage-error");
      message.setAttribute("role", "status");
      const controls = el("div", "ruang-call-controls ruang-stage-controls");
      lobby.replaceChildren(
        intro,
        createViewControls(),
        grid,
        message,
        controls,
      );
    }
    P.watch(gid, c.id);
    const here = state.current?.room === room;
    const connecting = state.pending?.gid === gid && state.pending.cid === c.id;
    const failed =
      state.failure?.gid === gid && state.failure.cid === c.id
        ? state.failure
        : null;
    const members = P.participants(room);
    lobby.querySelector("h2").textContent = c.nama;
    lobby.querySelector(".ruang-stage-status").textContent = connecting
      ? "Menghubungkan..."
      : here
        ? members.length === 1
          ? "Kamu berada di ruangan ini"
          : members.length + " peserta di ruangan ini"
        : members.length
          ? members.length + " peserta sedang di sini"
          : "Belum ada yang di sini";
    lobby.querySelector(".ruang-stage-error").textContent =
      failed?.message || "";
    renderTiles(
      lobby.querySelector(".ruang-stage-grid"),
      members,
      state,
      here ? state.current.warnaAnggota : group?.warnaAnggota,
    );
    updateViewControls(
      lobby.querySelector(".ruang-view-options"),
      members.length,
    );
    const controls = lobby.querySelector(".ruang-stage-controls");
    const mode = here
      ? "connected"
      : connecting
        ? "connecting"
        : group.keluar
          ? "left"
          : failed
            ? "retry"
            : "join";
    if (controls.dataset.mode !== mode) {
      controls.replaceChildren();
      controls.dataset.mode = mode;
      delete controls.dataset.controls;
      if (mode === "join" || mode === "retry") {
        const id = gid,
          channel = c.id;
        const mobile = matchMedia("(max-width:700px)").matches;
        if (mobile) {
          const muted = !!previewMuted.get(id + "/" + channel);
          const mic = button(
            muted ? "Gabung dengan mic aktif" : "Gabung dengan mic mati",
            () => {
              previewMuted.set(
                id + "/" + channel,
                !previewMuted.get(id + "/" + channel),
              );
              controls.dataset.mode = "";
              renderLobby(c);
            },
            muted ? "mic-off" : "mic",
            "ruang-icon ruang-preview-mic",
          );
          mic.setAttribute("aria-pressed", String(muted));
          controls.append(mic);
        }
        controls.append(
          button(
            failed ? "Coba lagi" : "Gabung suara",
            () =>
              startCall(
                false,
                false,
                id,
                channel,
                mobile ? { muted: !!previewMuted.get(id + "/" + channel) } : {},
              ),
            null,
            "grup-tombol-utama",
          ),
        );
        if (!failed)
          controls.append(
            button(
              "Gabung dengan video",
              () =>
                startCall(
                  true,
                  false,
                  id,
                  channel,
                  mobile
                    ? { muted: !!previewMuted.get(id + "/" + channel) }
                    : {},
                ),
              null,
              "grup-tombol-sekunder",
            ),
          );
      } else if (mode === "connecting")
        controls.append(
          button("Batal", () => P.leave(), null, "grup-tombol-sekunder"),
        );
    }
    if (here) renderCallControls(controls, state, true);
  }
  function dismissModal(state = modalState) {
    if (!state || state.busy || modalState !== state) return false;
    modalState = null;
    dialog.close();
    state.options.onClose?.();
    const restoredFocus = document.activeElement;
    requestAnimationFrame(() => {
      if (dialog.open || modalState) return;
      if (document.activeElement !== restoredFocus) return;
      if (
        state.focus?.isConnected &&
        state.focus.getClientRects().length &&
        !state.focus.closest("[inert]")
      )
        state.focus.focus({ preventScroll: true });
      else if (!drawer.hidden) $("ruang-drawer-close").focus();
      else if (!call.hidden) call.querySelector("header button").focus();
    });
    return true;
  }
  function refreshModalData(g) {
    const state = modalState;
    if (!state || state.busy || state.options.groupId !== g.id) return;
    const meta = state.options;
    if (!isAdmin(g) && meta.admin) {
      state.status.textContent =
        "Hanya admin yang dapat melakukan tindakan ini.";
      state.save.disabled = true;
      return;
    }
    if (
      (meta.channelId &&
        !g.ruang.channels.some((c) => c.id === meta.channelId)) ||
      (meta.categoryId &&
        !g.ruang.categories.some((c) => c.id === meta.categoryId))
    ) {
      state.status.textContent = "Channel atau kategori ini sudah dihapus.";
      state.save.disabled = true;
      return;
    }
    if (meta.categories) {
      const select = state.form.elements.namedItem("kategori"),
        value = select.value;
      const fingerprint = JSON.stringify(g.ruang.categories);
      if (select.dataset.categories === fingerprint) return;
      select.dataset.categories = fingerprint;
      select.replaceChildren();
      for (const c of g.ruang.categories) {
        const option = el("option", "", c.nama);
        option.value = c.id;
        select.append(option);
      }
      if (g.ruang.categories.some((c) => c.id === value)) select.value = value;
      else {
        const missing = el("option", "", "Pilih kategori");
        missing.value = "";
        missing.disabled = true;
        select.prepend(missing);
        select.value = "";
      }
    }
  }
  function modal(title, fields, action, submit = "Simpan", options = {}) {
    if (modalState?.busy) return;
    if (modalState) dismissModal();
    if (dialog.open) dialog.close();
    const state = { options, focus: document.activeElement, busy: false };
    modalState = state;
    const form = el("form", "detail-panel-content");
    state.form = form;
    form.append(el("h2", "", title));
    form.firstChild.id = "ruang-dialog-title";
    if (options.body) form.append(options.body);
    for (const f of fields) {
      const label = el("label", "ruang-field", f.label);
      const input = el(
        f.options ? "select" : f.multiline ? "textarea" : "input",
        "grup-input",
      );
      input.name = f.name;
      input.id = "ruang-field-" + f.name;
      label.htmlFor = input.id;
      if (f.options)
        for (const o of f.options) {
          const option = el("option", "", o.nama);
          option.value = o.id;
          input.append(option);
        }
      else {
        input.maxLength = f.max || 60;
        if (f.placeholder) input.placeholder = f.placeholder;
      }
      input.value = f.value ?? "";
      input.required = f.required !== false && !f.readonly;
      input.readOnly = !!f.readonly;
      label.append(input);
      form.append(label);
    }
    const status = el("p", "grup-status");
    status.setAttribute("role", "status");
    state.status = status;
    form.append(status);
    const actions = el("div", "grup-form-aksi");
    if (action)
      actions.append(
        button(
          "Batal",
          () => dismissModal(state),
          null,
          "grup-tombol-sekunder",
        ),
      );
    const save = el("button", "grup-tombol-utama", submit);
    save.type = "submit";
    state.save = save;
    actions.append(save);
    form.append(actions);
    form.onsubmit = async (e) => {
      e.preventDefault();
      if (state !== modalState || state.busy || save.disabled) return;
      if (!action) {
        dismissModal(state);
        return;
      }
      const values = Object.fromEntries(new FormData(form));
      state.busy = true;
      form.setAttribute("aria-busy", "true");
      const controls = [
        ...form.querySelectorAll("button,input,select,textarea"),
      ];
      const disabled = controls.map((n) => n.disabled);
      controls.forEach((n) => (n.disabled = true));
      save.textContent = options.loading || "Menyimpan...";
      try {
        const result = await action(values);
        if (modalState !== state) return;
        state.busy = false;
        if (result !== false) {
          dismissModal(state);
          if (typeof result === "function") result();
        }
        await refresh();
        await renderList();
        await B.refreshInfo();
      } catch (e) {
        if (modalState === state) {
          status.textContent = e.message || "Belum berhasil. Coba lagi.";
          status.dataset.error = "true";
        }
      } finally {
        state.busy = false;
        form.removeAttribute("aria-busy");
        controls.forEach((n, i) => (n.disabled = disabled[i]));
        save.textContent = submit;
        if (
          modalState === state &&
          options.groupId &&
          group?.id === options.groupId
        )
          refreshModalData(group);
      }
    };
    dialog.replaceChildren(form);
    dialog.showModal();
    (
      form.querySelector("input:not([readonly]),textarea,select") || save
    ).focus();
    return state;
  }
  function showDrawer(mode, title) {
    cancelPanelMotion(drawer);
    if (!drawer.contains(document.activeElement))
      drawerFocus = document.activeElement;
    B.tutupInfo(false);
    drawerMode = mode;
    drawer.hidden = false;
    $("btn-buka-berkas-grup").setAttribute(
      "aria-expanded",
      String(mode === "gallery"),
    );
    drawer.setAttribute("aria-labelledby", "ruang-drawer-title");
    $("ruang-drawer-title").textContent = title;
    $("ruang-drawer-content").replaceChildren();
    $("ruang-drawer-back").hidden = false;
    if (matchMedia("(max-width:900px)").matches) {
      $("panel-sisi-kiri").inert = true;
      $("panel-sisi-kanan").inert = true;
    }
    $("ruang-drawer-close").focus();
  }
  function closeDrawer(returnInfo = false, animate = false) {
    rightPanelVersion++;
    if (animate && !drawer.hidden) {
      closePanel(drawer, () => closeDrawer(returnInfo));
      return;
    }
    cancelPanelMotion(drawer);
    const wasOpen = !drawer.hidden;
    drawer.hidden = true;
    drawerMode = null;
    $("btn-buka-berkas-grup").setAttribute("aria-expanded", "false");
    $("panel-sisi-kiri").inert = false;
    $("panel-sisi-kanan").inert = false;
    if (returnInfo && gid) B.info(gid).catch(error);
    else if (wasOpen) {
      if (drawerFocus?.isConnected && drawerFocus.getClientRects().length)
        drawerFocus.focus({ preventScroll: true });
      else api.focusHeader();
    }
  }
  async function management() {
    const version = ++rightPanelVersion,
      id = gid;
    const g = await D.get(id);
    if (version !== rightPanelVersion || id !== gid) return;
    if (!isAdmin(g))
      throw new Error("Hanya admin yang dapat mengelola channel.");
    showDrawer("manage", "Kelola channel");
    managementFingerprint = "";
    renderManagement(g);
  }
  function renderManagement(g) {
    const fingerprint = JSON.stringify([
      g.id,
      g.ruang.categories,
      g.ruang.channels,
    ]);
    if (fingerprint === managementFingerprint) return;
    managementFingerprint = fingerprint;
    const content = $("ruang-drawer-content"),
      scroll = content.scrollTop;
    const focused = content.contains(document.activeElement)
      ? document.activeElement.dataset.control
      : null;
    content.replaceChildren();
    const target = $("ruang-drawer-content"),
      actions = el("div", "ruang-manage-actions");
    actions.append(
      button("+ Channel teks", () => newChannel("teks"), null, "ruang-pill"),
      button("+ Channel suara", () => newChannel("suara"), null, "ruang-pill"),
      button("+ Kategori", () => editCategory(), null, "ruang-pill"),
    );
    target.append(actions);
    for (const category of g.ruang.categories) {
      const card = el("section", "ruang-info-card"),
        head = el("div", "ruang-card-header");
      head.append(el("h3", "", category.nama));
      if (!category.bawaan) {
        head.append(
          button("Ubah nama kategori", () => editCategory(category), "edit-grup"),
          button("Hapus kategori", () => deleteCategory(category), "close"),
        );
        head.children[1].dataset.control = "category-edit:" + category.id;
        head.children[2].dataset.control = "category-delete:" + category.id;
      }
      card.append(head);
      const channels = g.ruang.channels.filter(
        (c) => c.kategoriId === category.id,
      );
      if (!channels.length) card.append(el("p", "ruang-empty-small", "Kosong"));
      for (const c of channels) {
        const row = el("div", "ruang-manage-row"),
          label = el("div");
        label.append(
          el("strong", "", c.nama),
          el("small", "", "Channel " + c.jenis),
        );
        row.append(
          c.jenis === "teks" ? el("span", "ruang-hash", "#") : icon("speaker"),
          label,
          button("Ubah channel " + c.nama, () => editChannel(c), "edit-grup"),
          button(
            "Hapus " + c.nama,
            async () => {
              if (
                await B.konfirmasi(
                  "Hapus channel?",
                  "Pesan di channel " + c.nama + " tidak akan tampil lagi.",
                  "Hapus",
                  true,
                )
              ) {
                await D.removeChannel(g.id, c.id);
                toast("Channel dihapus");
                await renderList();
                await refresh();
                await management();
              }
            },
            "close",
          ),
        );
        row.children[2].dataset.control = "channel-edit:" + c.id;
        row.children[3].dataset.control = "channel-delete:" + c.id;
        card.append(row);
      }
      target.append(card);
    }
    content.scrollTop = scroll;
    if (focused && !dialog.open)
      [...content.querySelectorAll("[data-control]")]
        .find((n) => n.dataset.control === focused)
        ?.focus({ preventScroll: true });
  }
  function editCategory(category = null) {
    const id = gid;
    modal(
      category ? "Ubah kategori" : "Kategori baru",
      [
        {
          name: "nama",
          label: "Nama kategori",
          value: category?.nama,
          placeholder: "Contoh: Tugas",
        },
      ],
      async (values) => {
        await D.category(id, values.nama, category?.id);
        toast(category ? "Kategori disimpan" : "Kategori ditambahkan");
        await management();
      },
      category ? "Simpan" : "Tambah",
      { groupId: id, categoryId: category?.id, admin: true },
    );
  }
  function editChannel(channel) {
    return newChannel(channel.jenis, channel);
  }
  async function newChannel(jenis, existing = null) {
    const id = gid;
    const g = await D.get(id),
      categories = g.ruang.categories.filter((c) => !c.bawaan || c.id === g.id + ":" + jenis);
    if (!categories.length) {
      toast("Tambahkan kategori terlebih dahulu.");
      return;
    }
    const category =
      categories.find((c) => c.id === existing?.kategoriId) ||
      categories.find((c) => c.id === g.id + ":" + jenis) ||
      categories.find(
        (c) => c.nama.trim().toLocaleLowerCase("id-ID") === jenis,
      ) ||
      categories.find((c) =>
        g.ruang.channels.some(
          (channel) => channel.kategoriId === c.id && channel.jenis === jenis,
        ),
      ) ||
      categories[0];
    modal(
      existing ? "Ubah channel" : "Channel " + jenis + " baru",
      [
        {
          name: "nama",
          label: "Nama channel",
          value: existing?.nama,
          placeholder:
            jenis === "teks" ? "Contoh: tugas-akhir" : "Contoh: Belajar bareng",
        },
        {
          name: "kategori",
          label: "Masuk ke kategori",
          options: categories,
          value: category.id,
        },
      ],
      async (values) => {
        await D.channel(id, values.nama, values.kategori, jenis, existing?.id);
        toast(existing ? "Channel disimpan" : "Channel ditambahkan");
        await management();
      },
      existing ? "Simpan" : "Tambah",
      { groupId: id, channelId: existing?.id, categories: true, admin: true },
    );
  }
  async function deleteCategory(category) {
    const g = await D.get(gid),
      children = g.ruang.channels.filter((c) => c.kategoriId === category.id);
    const others = g.ruang.categories.filter((c) => !c.bawaan && c.id !== category.id);
    if (!children.length) {
      if (
        await B.konfirmasi(
          "Hapus kategori?",
          "Hapus kategori " + category.nama + "?",
          "Hapus",
          true,
        )
      ) {
        await D.removeCategory(gid, category.id, null);
        await renderList();
        await management();
      }
      return;
    }
    modal(
      "Hapus kategori " + category.nama,
      [
        {
          name: "tujuan",
          label: "Channel di dalamnya",
          value: "",
          options: [
            { id: "", nama: "Hapus semua channel di kategori ini" },
            { id: "default", nama: "Pindahkan ke kategori Teks atau Suara" },
            ...others.map((c) => ({
              id: c.id,
              nama: "Pindahkan ke " + c.nama,
            })),
          ],
          required: false,
        },
      ],
      async (values) => {
        if (
          !(await B.konfirmasi(
            "Hapus kategori?",
            values.tujuan
              ? "Pindahkan channel lalu hapus kategori ini?"
              : "Hapus kategori beserta semua channel di dalamnya?",
            "Hapus",
            true,
          ))
        )
          return false;
        await D.removeCategory(g.id, category.id, values.tujuan || null);
        toast("Kategori dihapus");
        await renderList();
        await management();
      },
      "Hapus",
    );
  }
  async function extendInfo(g) {
    const content = $("panel-info-grup").querySelector(".detail-panel-content");
    content.querySelector("#ruang-info-extra")?.remove();
    content.querySelector("#ruang-info-controls")?.remove();
    const extra = el("div");
    extra.id = "ruang-info-extra";
    const controls = el("div");
    controls.id = "ruang-info-controls";
    const rooms = el("section", "ruang-info-card");
    rooms.append(el("h3", "", "Ruang di grup ini"));
    for (const category of D.ruang(g).categories) {
      rooms.append(el("h4", "ruang-category-title", category.nama));
      for (const c of D.ruang(g).channels.filter(
        (c) => c.kategoriId === category.id,
      ))
        rooms.append(
          button(
            (c.jenis === "teks" ? "# " : "◖ ") + c.nama,
            () => {
              B.tutupInfo(false);
              selectChannel(c.id, true).catch(error);
            },
            null,
            "ruang-channel-row",
          ),
        );
    }
    extra.append(rooms);
    const mute = el("label", "ruang-toggle-row", "Bisukan grup ini"),
      toggle = el("input", "ruang-toggle-input");
    toggle.type = "checkbox";
    toggle.setAttribute("role", "switch");
    toggle.checked = D.muted(g.id);
    toggle.onchange = () => {
      try {
        D.muted(g.id, toggle.checked);
      } catch (e) {
        toggle.checked = !toggle.checked;
        error(e);
      }
    };
    mute.append(toggle);
    extra.append(mute);
    if (isAdmin(g)) {
      const adminSection = el("section", "ruang-info-card ruang-admin-section");
      adminSection.append(el("h3", "", "Khusus admin"));
      const permission = el(
          "label",
          "ruang-toggle-row",
          "Izinkan anggota membagikan tautan",
        ),
        allowed = el("input", "ruang-toggle-input");
      allowed.type = "checkbox";
      allowed.setAttribute("role", "switch");
      allowed.checked = g.anggotaBolehUndang;
      allowed.onchange = async () => {
        try {
          await D.inviteSettings(g.id, allowed.checked);
        } catch (e) {
          allowed.checked = !allowed.checked;
          error(e);
        }
      };
      permission.append(allowed);
      adminSection.append(
        permission,
        button(
          "Kelola channel dan kategori",
          management,
          "gear",
          "grup-info-row",
        ),
      );
      controls.append(adminSection);
    }
    $("bagian-anggota-grup").before(extra);
    $("bagian-anggota-grup").after(controls);
    const quick = content.querySelector(".grup-quick-actions");
    quick.querySelectorAll("[data-channel-quick]").forEach((n) => n.remove());
    for (const [label, symbol, action] of [
      ["Telepon", "phone", () => startCall(false, true)],
      ["Video", "video", () => startCall(true, true)],
      [
        "Cari",
        "search",
        async () => {
          B.tutupInfo(false);
          if (
            !cid ||
            group.ruang.channels.find((c) => c.id === cid)?.jenis !== "teks"
          ) {
            const first = group.ruang.channels.find((c) => c.jenis === "teks");
            if (!first) throw new Error("Belum ada channel teks.");
            await selectChannel(first.id);
          }
          openSearch();
        },
      ],
    ]) {
      const b = button(label, action, null, "grup-quick-action");
      b.dataset.channelQuick = "";
      b.dataset.quick = symbol;
      const circle = el("span");
      circle.append(icon(symbol));
      b.replaceChildren(circle, document.createTextNode(label));
      quick.append(b);
      b.hidden = g.keluar && label !== "Cari";
    }
    quick.insertBefore(
      $("btn-tambah-anggota-grup"),
      quick.querySelector('[data-quick="search"]'),
    );
    const addMembers = $("btn-tambah-anggota-grup");
    addMembers.setAttribute("aria-label", "Tambah anggota");
    addMembers.title = "Tambah anggota";
    addMembers.replaceChildren(
      addMembers.querySelector("span"),
      document.createTextNode("Tambah"),
    );
    $("btn-undang-grup").hidden = true;
    const invite = button(
      "Undang lewat tautan",
      () => api.invite(g.id),
      "link-grup",
      "grup-info-row",
    );
    invite.hidden = g.keluar || (!isAdmin(g) && !g.anggotaBolehUndang);
    controls.prepend(invite);
  }
  function clearInvitation() {
    const hash = new URLSearchParams(location.hash.slice(1));
    hash.delete("undangan-grup");
    hash.delete("kode");
    history.replaceState(
      null,
      "",
      location.pathname + location.search + (hash.size ? "#" + hash : ""),
    );
    sessionStorage.removeItem("ngumpul_undangan_tertunda");
  }
  function invitationPreview(summary, id, token) {
    const body = el("div", "ruang-invite-card"),
      avatar = el("div", "ruang-invite-avatar");
    B.avatar(avatar, summary.nama, summary.foto);
    body.append(
      avatar,
      el("h3", "", summary.nama),
      el("p", "ruang-invite-count", summary.jumlah == null ? "" : summary.jumlah + " anggota"),
    );
    if (summary.deskripsi)
      body.append(el("p", "ruang-invite-description", summary.deskripsi));
    modal(
      "Undangan grup",
      [],
      async () => {
        const joinedId = await D.join(id, token);
        clearInvitation();
        await open(joinedId);
        if (!summary.anggota) toast("Kamu bergabung ke grup");
      },
      summary.anggota ? "Buka grup" : "Gabung",
      { body, onClose: clearInvitation },
    );
  }
  function joinFromLink() {
    modal(
      "Gabung grup",
      [
        {
          name: "tautan",
          label: "Tautan undangan",
          max: 2000,
          placeholder: "Tempel tautan undangan",
        },
      ],
      async (values) => {
        let url;
        try {
          url = new URL(values.tautan.trim(), location.origin);
        } catch (_) {
          throw new Error("Tautan undangan tidak valid.");
        }
        const hash = new URLSearchParams(url.hash.slice(1)),
          id = hash.get("undangan-grup"),
          token = hash.get("kode");
        if (url.origin !== location.origin || !id || !token)
          throw new Error("Gunakan tautan undangan dari aplikasi ini.");
        const summary = await D.invitation(id, token);
        return () => invitationPreview(summary, id, token);
      },
      "Lanjut",
      { loading: "Memeriksa..." },
    );
  }
  $("menu-grup-gabung").addEventListener("click", () => {
    $("box-dropdown-utama").style.display = "none";
    joinFromLink();
  });
  async function invite(id) {
    const hash = new URLSearchParams(
      (
        location.hash ||
        sessionStorage.getItem("ngumpul_undangan_tertunda") ||
        ""
      ).slice(1),
    );
    const token = hash.get("kode"),
      invitedId = hash.get("undangan-grup");
    if (invitedId && token) {
      try {
        invitationPreview(
          await D.invitation(invitedId, token),
          invitedId,
          token,
        );
      } catch (e) {
        modal("Undangan tidak tersedia", [], null, "Tutup", {
          body: el("p", "ruang-invite-description", e.message),
          onClose: clearInvitation,
        });
      }
      return;
    }
    if (!id) return;
    let g = await D.get(id);
    if (g.keluar || (!isAdmin(g) && !g.anggotaBolehUndang))
      throw new Error("Hanya admin yang dapat membagikan tautan.");
    g = await D.inviteSettings(id, g.anggotaBolehUndang);
    const url = new URL(location.pathname, location.origin);
    url.hash = new URLSearchParams({
      "undangan-grup": id,
      kode: g.kodeUndangan,
    });
    modal(
      "Undang lewat tautan",
      [
        {
          name: "link",
          label: "Tautan undangan",
          value: url.href,
          readonly: true,
        },
      ],
      async (values) => {
        if (!navigator.clipboard?.writeText)
          throw new Error("Pilih tautan di atas lalu salin dengan Ctrl+C.");
        await navigator.clipboard.writeText(values.link);
        toast("Tautan disalin");
      },
      "Salin tautan",
    );
    if (isAdmin(g))
      dialog.querySelector(".grup-form-aksi").prepend(
        button(
          "Reset tautan",
          async () => {
            if (
              await B.konfirmasi(
                "Reset tautan?",
                "Tautan sebelumnya tidak dapat dipakai lagi.",
                "Reset",
              )
            ) {
              await D.inviteSettings(id, g.anggotaBolehUndang, true);
              await invite(id);
              toast("Tautan diperbarui");
            }
          },
          null,
          "grup-tombol-sekunder",
        ),
      );
  }
  async function mediaItems(id) {
    const g = await D.get(id),
      messages = await D.messages(g),
      active = new Set(g.ruang.channels.map((c) => c.id));
    return messages
      .filter((p) => active.has(p.channelId) && !p.dihapus)
      .flatMap((p) =>
        [
          ...(p.lampiran || []),
          ...[...(p.isi || "").matchAll(/https?:\/\/[^\s]+/g)].map((m) => ({
            nama: m[0],
            url: m[0],
            mime: "text/link",
            id: p.id + ":" + m.index,
          })),
        ].map((f) => ({ ...f, dibuat: p.dibuat })),
      )
      .sort((a, b) => b.dibuat - a.dibuat);
  }
  async function renderMedia(id) {
    const files = await mediaItems(id);
    $("jumlah-berkas-grup").textContent = files.length;
    const preview = $("pratinjau-media-grup");
    preview.replaceChildren();
    for (const f of files
      .filter((f) => /^(image|video)\//.test(f.mime))
      .slice(0, 4))
      preview.append(await M.tampilkan(f, true));
    preview.hidden = !preview.childElementCount;
    $("btn-buka-berkas-grup").querySelector("span").textContent =
      "Media, tautan, dan dokumen";
    $("btn-buka-berkas-grup").setAttribute(
      "aria-expanded",
      String(!drawer.hidden && drawerMode === "gallery"),
    );
  }
  async function gallery(id, tab = "Media", passive = false) {
    if (passive && (drawer.hidden || drawerMode !== "gallery")) return;
    const expected = passive ? rightPanelVersion : ++rightPanelVersion;
    const files = await mediaItems(id);
    if (expected !== rightPanelVersion || id !== gid) return;
    const fingerprint = JSON.stringify([id, tab, files]);
    if (passive && fingerprint === galleryFingerprint) return;
    const version = passive ? ++rightPanelVersion : expected;
    const content = $("ruang-drawer-content"),
      scroll = content.scrollTop;
    const focused = content.contains(document.activeElement)
      ? document.activeElement.dataset.control
      : null;
    if (!passive) showDrawer("gallery", "Media, tautan, dan dokumen");
    else content.replaceChildren();
    galleryFingerprint = fingerprint;
    galleryTab = tab;
    const target = $("ruang-drawer-content"),
      tabs = el("div", "detail-media-tabs");
    for (const label of ["Media", "Tautan", "Dokumen"]) {
      const b = button(
        label,
        () => gallery(id, label),
        null,
        "grup-tombol-sekunder",
      );
      b.setAttribute("aria-pressed", String(tab === label));
      b.dataset.control = "gallery:" + label;
      tabs.append(b);
    }
    target.append(tabs);
    const grid = el("div", "ruang-gallery");
    const filtered = files.filter((f) =>
      tab === "Media"
        ? /^(image|video|audio)\//.test(f.mime)
        : tab === "Tautan"
          ? f.mime === "text/link"
          : !/^(image|video|audio)\//.test(f.mime) && f.mime !== "text/link",
    );
    for (const f of filtered) {
      if (f.mime === "text/link") {
        const a = el("a", "ruang-attachment", f.url);
        a.href = f.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        grid.append(a);
      } else grid.append(await M.tampilkan(f));
      if (version !== rightPanelVersion) return;
    }
    if (!filtered.length)
      grid.append(
        el(
          "p",
          "grup-kosong",
          "Belum ada " + tab.toLocaleLowerCase("id-ID") + ".",
        ),
      );
    if (version === rightPanelVersion) {
      target.append(grid);
      if (passive) {
        content.scrollTop = scroll;
        if (focused && !dialog.open)
          [...content.querySelectorAll("[data-control]")]
            .find((n) => n.dataset.control === focused)
            ?.focus({ preventScroll: true });
      }
    }
  }
  async function startCall(
    video,
    inviteAll,
    groupId = gid,
    channelId = cid,
    options = {},
  ) {
    if (!groupId) return;
    const target = await D.get(groupId);
    if (target.keluar) return;
    const channel =
      target.ruang.channels.find((c) => c.id === channelId && c.jenis === "suara")?.id ||
      target.ruang.channels.find((c) => c.jenis === "suara")?.id;
    if (!channel) throw new Error("Tambahkan channel suara melalui Info grup.");
    if (gid === groupId && cid !== channel) await selectChannel(channel);
    await stopRecording(true);
    B.tutupInfo(false);
    const joined = await P.join(groupId, channel, video, inviteAll, options);
    if (joined && inviteAll) showCall(true);
  }
  const duration = (seconds) =>
    String(Math.floor(seconds / 60)).padStart(2, "0") +
    ":" +
    String(seconds % 60).padStart(2, "0");
  function restoreCallFocus() {
    const target = [
      callFocus,
      voiceSummary,
      $("ruang-input"),
      document.querySelector(
        "#panel-chat-aktif input, #panel-chat-aktif textarea",
      ),
      document.querySelector(".tab.aktif"),
    ].find(
      (n) =>
        n?.isConnected && n.getClientRects().length && !n.closest("[inert]"),
    );
    target?.focus({ preventScroll: true });
  }
  function showCall(expanded, animate = true) {
    if (expanded && !P.state().current) return;
    if (!expanded && animate && !call.hidden) {
      closePanel(call, () => showCall(false, false));
      return;
    }
    cancelPanelMotion(call);
    if (expanded && !callExpanded) callFocus = document.activeElement;
    callExpanded = expanded;
    renderCall();
    if (expanded)
      call.querySelector("header button").focus({ preventScroll: true });
    else restoreCallFocus();
  }
  function syncAudio(state) {
    const alive = new Set();
    for (const peer of state.current ? state.peers : []) {
      alive.add(peer.id);
      let player = audioPlayers.get(peer.id);
      if (!player) {
        player = el("audio");
        player.autoplay = true;
        audioOutput.append(player);
        audioPlayers.set(peer.id, player);
        const output = state.devices?.output || "";
        if (output && player.setSinkId)
          player
            .setSinkId(output)
            .catch(() =>
              error(
                new Error(
                  "Speaker tidak dapat dipilih. Periksa pengaturan suara.",
                ),
              ),
            );
      }
      player.muted = state.deafened;
      if (player.srcObject !== peer.stream) player.srcObject = peer.stream;
      if (
        player.paused &&
        peer.stream.getAudioTracks().length &&
        !state.deafened
      ) {
        player.play().catch((e) => {
          if (
            e.name === "NotAllowedError" &&
            audioPlayers.get(peer.id) === player
          ) {
            audioBlocked = true;
            audioRetry.hidden = false;
          }
        });
      }
    }
    for (const [id, player] of audioPlayers)
      if (!alive.has(id)) {
        player.pause();
        player.srcObject = null;
        player.remove();
        audioPlayers.delete(id);
      }
    if (!state.current) audioBlocked = false;
    audioRetry.hidden = !audioBlocked || state.deafened;
  }
  async function resumeAudio() {
    audioBlocked = false;
    await Promise.all(
      [...audioPlayers.values()].map(async (player) => {
        try {
          await player.play();
        } catch (_) {
          audioBlocked = true;
        }
      }),
    );
    audioRetry.hidden = !audioBlocked;
  }
  async function setAudioOutput(id) {
    if (!HTMLMediaElement.prototype.setSinkId) return;
    const players = [...audioPlayers.values()];
    if (!players.length) players.push(document.createElement("audio"));
    const old = players.map((p) => p.sinkId);
    try {
      await Promise.all(players.map((p) => p.setSinkId(id)));
    } catch (_) {
      await Promise.all(
        players.map((p, i) => p.setSinkId(old[i]).catch(() => {})),
      );
      throw new Error(
        "Speaker tidak dapat dipilih. Periksa izin audio di browser.",
      );
    }
  }
  async function deviceSettings() {
    const state = P.state();
    if (!state.current || state.busy) return;
    const data = await P.devices();
    if (P.state().current !== state.current) return;
    const fields = [
      {
        name: "microphone",
        label: "Mikrofon",
        options: data.microphone,
        value: data.selected.microphone || "",
        required: false,
      },
      {
        name: "camera",
        label: "Kamera",
        options: data.camera,
        value: data.selected.camera || "",
        required: false,
      },
    ];
    if (HTMLMediaElement.prototype.setSinkId)
      fields.push({
        name: "output",
        label: "Speaker",
        options: data.output,
        value: data.selected.output || "",
        required: false,
      });
    modal("Suara dan video", fields, async (values) => {
      if (P.state().current !== state.current)
        throw new Error("Panggilan sudah berakhir atau berpindah ruangan.");
      const previous = P.state().devices.output || "";
      if ("output" in values) await setAudioOutput(values.output);
      try {
        await P.configureDevices(values);
      } catch (e) {
        await setAudioOutput(previous).catch(() => {});
        throw e;
      }
      toast("Perangkat disimpan");
    });
  }
  function retireParticipant(node) {
    if (!panelAnimations.has(node)) closePanel(node, () => node.remove());
  }
  function createViewControls() {
    const controls = el("div", "ruang-view-options");
    controls.setAttribute("role", "group");
    controls.setAttribute("aria-label", "Tampilan peserta");
    controls.append(
      button(
        "Tampilan kisi",
        () => {
          callViewMode = "grid";
          renderCall();
        },
        "grid",
      ),
      button(
        "Fokus peserta",
        () => {
          callViewMode = "focus";
          renderCall();
        },
        "focus",
      ),
    );
    return controls;
  }
  function updateViewControls(controls, count) {
    controls.hidden = !count;
    controls.children[0].setAttribute(
      "aria-pressed",
      String(callViewMode === "grid"),
    );
    controls.children[1].setAttribute(
      "aria-pressed",
      String(callViewMode === "focus"),
    );
  }
  function renderTiles(grid, members, state, colors = {}) {
    grid.dataset.count = String(members.length);
    if (!members.some((p) => p.tab === focusedParticipant))
      focusedParticipant =
        members.find((p) => p.akun !== akun)?.tab || members[0]?.tab || null;
    grid.dataset.view = callViewMode;
    const alive = new Set();
    for (const p of members) {
      alive.add(p.tab);
      let tile = [...grid.children].find((n) => n.dataset.tab === p.tab);
      if (!tile) {
        tile = el("div", "ruang-call-tile");
        tile.dataset.tab = p.tab;
        const video = el("video");
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        tile.append(
          video,
          el("span", "ruang-call-avatar"),
          el("strong", "ruang-call-label"),
          el("span", "ruang-tile-state"),
        );
        const focus = button(
          "Fokuskan peserta",
          () => {
            focusedParticipant = p.tab;
            callViewMode = "focus";
            renderCall();
          },
          "maximize",
          "ruang-tile-focus",
        );
        tile.append(focus);
        grid.append(tile);
      }
      const selected = callViewMode === "focus" && p.tab === focusedParticipant;
      tile.classList.toggle("ruang-focused", selected);
      const focusButton = tile.querySelector(".ruang-tile-focus");
      focusButton.setAttribute(
        "aria-label",
        "Fokuskan " + (p.akun === akun ? "Kamu" : B.nama(p.akun)),
      );
      focusButton.setAttribute("aria-pressed", String(selected));
      cancelPanelMotion(tile);
      tile.classList.toggle("speaking", !!p.speaking && p.mic);
      const player = tile.querySelector("video");
      const local = p.akun === akun;
      const source =
        local && state.current?.room === p.room
          ? state.stream
          : state.peers.find((peer) => peer.id === p.tab)?.stream;
      const hasVideo =
        !!p.video &&
        !!source?.getVideoTracks().some((t) => t.readyState === "live");
      if (player.srcObject !== (hasVideo ? source : null)) {
        player.srcObject = hasVideo ? source : null;
        if (hasVideo) player.play().catch(() => {});
      }
      player.hidden = !hasVideo;
      const avatar = tile.querySelector(".ruang-call-avatar"),
        photo = ambilFotoProfilChat(p.akun),
        name = B.nama(p.akun);
      avatar.hidden = hasVideo;
      if (avatar.dataset.identitas !== name + photo) {
        tampilkanAvatarChat(avatar, p.akun, name, photo);
        avatar.dataset.identitas = name + photo;
      }
      tile.style.setProperty("--anggota-hue", String(colors?.[p.akun] ?? 190));
      tile.querySelector("strong").textContent = local ? "Kamu" : name;
      const flag = tile.querySelector(".ruang-tile-state"),
        symbol = p.deafened ? "headphones-off" : !p.mic ? "mic-off" : null;
      if (flag.dataset.symbol !== (symbol || "")) {
        flag.replaceChildren(...(symbol ? [icon(symbol)] : []));
        flag.dataset.symbol = symbol || "";
      }
      flag.title = p.deafened ? "Audio dibisukan" : !p.mic ? "Mic mati" : "";
      flag.hidden = !symbol;
      const ownRoom = !local && state.current?.room === p.room && state.current;
      const control = tile.querySelector(".ruang-tile-moderate");
      if (ownRoom && group?.id === ownRoom.gid && isAdmin(group)) {
        if (!control) tile.append(button("Kelola " + name, () => moderateParticipant(ownRoom, p.akun),
          "gear", "ruang-tile-moderate ruang-icon"));
      } else control?.remove();
    }
    for (const tile of [...grid.children])
      if (!alive.has(tile.dataset.tab)) {
        tile.querySelector("video").srcObject = null;
        retireParticipant(tile);
      }
    grid.hidden = !members.length && !grid.children.length;
  }
  function moderateParticipant(room, id) {
    const name = B.nama(id);
    const actions = [
      ["Bisukan " + name, { muted: true }],
      ["Izinkan mikrofon " + name, { muted: false }],
      ["Keluarkan " + name, { remove: true }],
    ];
    dialogDM("Kelola peserta", buatFormDM(...actions.map(([label, payload]) => tombolDM(label, async (button) => {
      button.disabled = true;
      try {
        if (payload.remove && !await B.konfirmasi("Keluarkan peserta?", label + " dari ruang suara?", "Keluarkan", true)) return;
        await P.moderate(room.gid, room.cid, id, payload);
        button.closest("dialog").close();
        toast("Izin peserta diperbarui.");
      } catch (failure) { button.closest("form").querySelector('[role="alert"]').textContent = failure.message; }
      finally { button.disabled = false; }
    }))));
  }
  function renderCallControls(controls, state, expand = false) {
    const mode = state.current
      ? "connected"
      : state.pending
        ? "connecting"
        : "failed";
    if (
      controls.dataset.controls !== mode ||
      controls.dataset.expand !== String(expand)
    ) {
      controls.replaceChildren();
      controls.dataset.controls = mode;
      controls.dataset.expand = String(expand);
      if (mode === "connected") {
        controls.append(
          button("Matikan mic", () => P.mic(), "mic"),
          button("Bisukan audio", () => P.deafen(), "headphones"),
          button("Nyalakan kamera", () => P.camera(), "video"),
          button(
            "Akhiri panggilan",
            () => P.leave(),
            "disconnect",
            "ruang-icon ruang-hangup",
          ),
        );
        controls.append(
          button("Pengaturan suara dan video", deviceSettings, "gear"),
          button("Bagikan layar", () => P.screen(), "maximize"),
        );
        if (expand)
          controls.append(
            button("Perbesar tampilan", () => showCall(true), "maximize"),
          );
      } else {
        if (mode === "failed")
          controls.append(
            button(
              "Coba lagi",
              () => {
                const target = P.state().failure;
                if (target)
                  return startCall(target.video, false, target.gid, target.cid);
              },
              "refresh",
            ),
          );
        controls.append(
          button(
            mode === "connecting" ? "Batalkan koneksi" : "Tutup koneksi",
            () => P.leave(),
            "disconnect",
            "ruang-icon ruang-hangup",
          ),
        );
      }
    }
    if (!state.current) return;
    const own = state.participants.find((p) => p.akun === akun);
    const specs = [
      [
        own?.mic ? "Matikan mic" : "Nyalakan mic",
        own?.mic ? "mic" : "mic-off",
        !own?.mic,
      ],
      [
        state.deafened ? "Aktifkan audio" : "Bisukan audio",
        state.deafened ? "headphones-off" : "headphones",
        state.deafened,
      ],
      [
        own?.video ? "Matikan kamera" : "Nyalakan kamera",
        own?.video ? "video-off" : "video",
        !!own?.video,
      ],
    ];
    const screen = controls.children[5];
    screen.setAttribute("aria-label", state.screen ? "Berhenti berbagi layar" : "Bagikan layar");
    screen.title = screen.getAttribute("aria-label");
    screen.setAttribute("aria-pressed", String(state.screen));
    screen.disabled = state.busy || !navigator.mediaDevices?.getDisplayMedia;
    specs.forEach(([label, symbol, pressed], index) => {
      const b = controls.children[index];
      b.setAttribute("aria-label", label);
      b.title = label;
      b.setAttribute("aria-pressed", String(pressed));
      b.querySelector("use").setAttribute("href", "#i-" + symbol);
      b.disabled = index === 2 && state.busy;
    });
  }
  function updateVoiceSidebar() {
    const state = P.state();
    sidebar.querySelectorAll("[data-voice-room]").forEach((row) => {
      const connected = row.dataset.voiceRoom === state.current?.room;
      row.classList.toggle("ruang-voice-connected", connected);
      row.setAttribute(
        "aria-label",
        row.querySelector(".ruang-channel-name").textContent +
          (connected ? ", tersambung" : ""),
      );
    });
    sidebar.querySelectorAll(".ruang-voice-members").forEach((list) => {
      list.setAttribute("role", "list");
      const members = P.participants(list.dataset.room),
        alive = new Set();
      for (const p of members) {
        alive.add(p.tab);
        let row = [...list.children].find((n) => n.dataset.tab === p.tab);
        if (!row) {
          row = el("div", "ruang-presence");
          row.dataset.tab = p.tab;
          row.setAttribute("role", "listitem");
          row.append(
            el("span", "ruang-presence-avatar"),
            el("span", "ruang-presence-name"),
            el("span", "ruang-presence-state"),
          );
          list.append(row);
        }
        cancelPanelMotion(row);
        row.classList.toggle("speaking", !!p.speaking && p.mic);
        const name = B.nama(p.akun),
          photo = ambilFotoProfilChat(p.akun),
          avatar = row.firstChild;
        if (avatar.dataset.identitas !== name + photo) {
          tampilkanAvatarChat(avatar, p.akun, name, photo);
          avatar.dataset.identitas = name + photo;
        }
        avatar.style.setProperty(
          "--anggota-hue",
          String(group?.warnaAnggota?.[p.akun] ?? 190),
        );
        row.querySelector(".ruang-presence-name").textContent =
          p.akun === akun ? "Kamu" : name;
        const flag = row.lastChild,
          symbol = p.deafened ? "headphones-off" : !p.mic ? "mic-off" : null;
        if (flag.dataset.symbol !== (symbol || "")) {
          flag.replaceChildren(...(symbol ? [icon(symbol)] : []));
          flag.dataset.symbol = symbol || "";
        }
        flag.title = p.deafened ? "Audio dibisukan" : !p.mic ? "Mic mati" : "";
      }
      for (const row of [...list.children])
        if (!alive.has(row.dataset.tab)) retireParticipant(row);
      list.hidden = !members.length && !list.children.length;
    });
  }
  function renderCall() {
    const state = P.state(),
      current = state.current,
      target = current || state.pending || state.failure;
    const wasOpen = !call.hidden;
    if (!current) callExpanded = false;
    call.hidden = !current || !callExpanded;
    document.querySelector(".dashboard-container").inert = !call.hidden;
    voiceBar.inert = !call.hidden;
    voiceBar.hidden = !target || !call.hidden;
    document
      .querySelector(".dashboard-container")
      .classList.toggle("ruang-voice-active", !!target);
    syncAudio(state);
    updateVoiceSidebar();
    if (target) {
      voiceBar.dataset.status = state.status;
      $("ruang-voice-status").textContent =
        state.status === "connecting"
          ? "Menghubungkan..."
          : state.status === "failed"
            ? "Belum tersambung"
            : state.status === "disconnected"
              ? "Koneksi terganggu"
              : "Tersambung";
      $("ruang-voice-name").textContent =
        (target.nama || "Ruang suara") +
        (target.grup ? " / " + target.grup : "");
      voiceSummary.disabled = !current;
      renderCallControls(voiceControls, state);
    }
    callStarted = current?.started || null;
    if (current) {
      $("ruang-call-name").textContent = current.nama;
      call.querySelector("header span").textContent = current.grup;
      $("ruang-call-time").dataset.mode = state.participants.some(
        (p) => p.video,
      )
        ? "Panggilan video"
        : "Panggilan suara";
      updateCallTime();
      updateViewControls(
        call.querySelector(".ruang-view-options"),
        state.participants.length,
      );
      if (!call.hidden)
        renderTiles(
          $("ruang-call-grid"),
          state.participants,
          state,
          current.warnaAnggota,
        );
      else $("ruang-call-grid").replaceChildren();
      renderCallControls($("ruang-call-controls"), state);
    } else {
      $("ruang-call-grid").replaceChildren();
      $("ruang-call-error").textContent = "";
      if (wasOpen) restoreCallFocus();
    }
    const selected = group?.ruang.channels.find((c) => c.id === cid);
    if (!root.hidden && selected?.jenis === "suara") renderLobby(selected);
  }
  function updateCallTime() {
    if (callStarted)
      $("ruang-call-time").textContent =
        $("ruang-call-time").dataset.mode +
        " · " +
        duration(Math.floor((Date.now() - callStarted) / 1000));
  }
  P.events.addEventListener("state", renderCall);
  P.events.addEventListener("presence", () => {
    updateVoiceSidebar();
    if (
      cid &&
      group?.ruang.channels.find((c) => c.id === cid)?.jenis === "suara"
    )
      renderLobby(group.ruang.channels.find((c) => c.id === cid));
  });
  P.events.addEventListener("error", (e) => {
    $("ruang-call-error").textContent = e.detail;
    if (call.hidden) toast(e.detail);
  });
  P.events.addEventListener("incoming", (e) => {
    const message = e.detail;
    if (Date.now() - message.started >= 30000) return;
    pendingInvite = message;
    clearTimeout(incomingTimer);
    incoming.replaceChildren(
      el("h2", "", B.nama(message.akun)),
      el("p", "", "Panggilan " + (message.video ? "video" : "suara") + " grup"),
    );
    const actions = el("div", "grup-form-aksi");
    actions.append(
      button(
        "Tolak",
        () => {
          incoming.close();
        },
        null,
        "grup-tombol-sekunder",
      ),
      button(
        "Terima",
        async () => {
          incoming.close();
          await open(message.gid, message.cid);
          await P.join(message.gid, message.cid, message.video);
          showCall(true);
        },
        null,
        "grup-tombol-utama",
      ),
    );
    incoming.append(actions);
    if (!incoming.open) incoming.showModal();
    incomingTimer = setTimeout(
      () => incoming.close(),
      Math.max(0, 30000 - (Date.now() - message.started)),
    );
    window.NgumpulNotifikasi?.panggilan(message);
  });
  P.events.addEventListener("cancel-invite", (e) => {
    if (pendingInvite?.from === e.detail.from) incoming.close();
  });
  $("ruang-call-controls").addEventListener("click", () => {
    $("ruang-call-error").textContent = "";
  });
  setInterval(updateCallTime, 1000);
  $("ruang-kembali").onclick = () => {
    savePosition();
    saveDraft();
    hideMiddle();
    $("ruang-kembali").blur();
  };
  $("ruang-composer").onsubmit = (e) => {
    e.preventDefault();
    send().catch(error);
  };
  text.oninput = () => {
    try {
      saveDraft();
    } catch (e) {
      error(e);
    }
    autosize();
  };
  text.onkeydown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      send().catch(error);
    }
  };
  $("ruang-lampiran").onclick = () => {
    const groupId = gid, channelId = cid;
    const reply = window.NgumpulBalas?.ambilGrup();
    const send = async (payload) => {
      await D.send(groupId, channelId, "", [], D.uid(), reply, payload);
      window.NgumpulBalas?.batalGrup();
    };
    const labels = [
      ["Pilih berkas", () => $("ruang-files").click()],
      ["Bagikan lokasi", () => bukaLokasiDM(null, send)],
      ["Buat polling", () => bukaPollingDM(null, send)],
      ["Jadwalkan pesan", () => jadwalkanPesan("channel", channelId, text.value.trim(), reply?.id,
        () => toast("Pesan dijadwalkan."))],
      ["Pesan terjadwal", () => daftarJadwal("channel", channelId)],
    ];
    const actions = labels.map(([label, action]) => tombolDM(label, (b) => {
      b.closest("dialog").close();
      try { Promise.resolve(action()).catch(error); } catch (failure) { error(failure); }
    }));
    dialogDM("Tambahkan ke channel", buatFormDM(...actions));
  };
  $("ruang-files").onchange = (e) => {
    const files = [...e.target.files];
    if (files.some((f) => f.size > 25 * 1024 * 1024)) {
      toast("Ukuran setiap berkas maksimal 25 MB.");
      return;
    }
    attachments.set(key(), {
      files: [...(attachments.get(key())?.files || []), ...files],
    });
    e.target.value = "";
    renderPreview().catch(error);
  };
  for (const emoji of [
    "😀",
    "😁",
    "😂",
    "😊",
    "😍",
    "🥰",
    "😎",
    "🥳",
    "🤔",
    "😢",
    "😭",
    "😮",
    "😴",
    "👍",
    "👎",
    "👏",
    "🙏",
    "💪",
    "❤️",
    "🔥",
    "🎉",
    "✅",
    "👋",
    "🌟",
    "💯",
    "📚",
    "💻",
    "☕",
  ])
    $("ruang-emoji").append(
      button(
        emoji,
        () => {
          const start = text.selectionStart,
            end = text.selectionEnd;
          text.setRangeText(emoji, start, end, "end");
          text.focus();
          saveDraft();
          autosize();
        },
        null,
        "ruang-emoji-item",
      ),
    );
  $("ruang-btn-emoji").onclick = () => {
    $("ruang-emoji").hidden = !$("ruang-emoji").hidden;
  };
  $("ruang-record-cancel").onclick = () => stopRecording(true).catch(error);
  $("ruang-record-send").onclick = () => stopRecording(false).catch(error);
  $("ruang-cari-pesan").oninput = () => {
    clearTimeout(searchTimer);
    searchVersion++;
    searchTimer = setTimeout(() => updateSearch(true), 250);
  };
  $("ruang-search").onsubmit = (e) => {
    e.preventDefault();
    jumpResult(1).catch(error);
  };
  $("ruang-prev").onclick = () => jumpResult(-1).catch(error);
  $("ruang-next").onclick = () => jumpResult(1).catch(error);
  $("ruang-close-search").onclick = () => {
    $("ruang-search").hidden = true;
    $("ruang-cari-pesan").value = "";
    clearTimeout(searchTimer);
    searchVersion++;
    found = [];
    text.focus();
  };
  $("ruang-drawer-close").onclick = () => closeDrawer(false, true);
  $("ruang-drawer-back").onclick = () => closeDrawer(true, true);
  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    dismissModal();
  });
  dialog.addEventListener("close", () => {
    if (!dialog.open && modalState && !modalState.busy) dismissModal();
  });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        dismissModal();
    }
  });
  $("btn-edit-deskripsi-grup").addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      const g = group;
      modal(
        "Ubah deskripsi",
        [
          {
            name: "deskripsi",
            label: "Deskripsi grup",
            value: g.deskripsi,
            multiline: true,
            max: 512,
            required: false,
          },
        ],
        async (values) => {
          const latest = await D.get(g.id);
          await B.layanan.ubahInfo(g.id, {
            nama: latest.nama,
            foto: latest.foto,
            deskripsi: values.deskripsi,
          });
          toast("Deskripsi disimpan");
        },
      );
    },
    true,
  );
  document.addEventListener(
    "keydown",
    (e) => {
      if (!call.hidden && !document.querySelector("dialog[open]")) {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopImmediatePropagation();
          showCall(false);
          return;
        }
        if (e.key === "Tab") {
          const items = [
            ...call.querySelectorAll("button:not(:disabled)"),
          ].filter((n) => n.getClientRects().length);
          if (e.shiftKey && document.activeElement === items[0]) {
            e.preventDefault();
            items.at(-1)?.focus();
          } else if (!e.shiftKey && document.activeElement === items.at(-1)) {
            e.preventDefault();
            items[0]?.focus();
          }
        }
        return;
      }
      if (e.key === "Escape" && !document.querySelector("dialog[open]")) {
        if (!$("ruang-emoji").hidden) $("ruang-emoji").hidden = true;
        else if (!drawer.hidden) closeDrawer(false, true);
      }
      if (
        e.key === "Tab" &&
        !drawer.hidden &&
        matchMedia("(max-width:900px)").matches
      ) {
        const items = [
          ...drawer.querySelectorAll(
            "button:not([hidden]),input,select,a[href]",
          ),
        ].filter((n) => n.getClientRects().length);
        if (e.shiftKey && document.activeElement === items[0]) {
          e.preventDefault();
          items.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === items.at(-1)) {
          e.preventDefault();
          items[0]?.focus();
        }
      }
    },
    true,
  );
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        await renderList();
        await refresh();
        await B.refreshInfo();
      } catch (e) {
        error(e);
      }
    }, 60);
  }
  document.addEventListener("ngumpul:tab-dashboard", (e) => {
    closeMessageMenu();
    saveDraft();
    savePosition();
    if (e.detail.tabAktif !== "grup") {
      D.watch();
      root.hidden = true;
      closeDrawer(false);
      stopRecording(true).catch(error);
      document
        .querySelector(".dashboard-container")
        .classList.remove("ruang-room-open");
    } else if (gid) {
      sidebar.hidden = false;
      $("panel-tab-grup").querySelector(".grup-content").hidden = true;
      if (cid) {
        if (group.ruang.channels.some((c) => c.id === cid && c.jenis === "teks")) D.watch(gid, cid);
        root.hidden = false;
        $("panel-chat-kosong").style.display = "none";
        panelChatAktif.style.display = "none";
        document
          .querySelector(".dashboard-container")
          .classList.add("ruang-room-open");
        refresh().catch(error);
      }
    }
  });
  window.addEventListener("storage", (e) => {
    if (
      !e.key ||
      /^(ngumpul_grup|ngumpul_pesan_grup_|ngumpul_status_grup_|ngumpul_ruang_|ngumpul_profil|ngumpul_media_)/.test(
        e.key,
      )
    )
      schedule();
  });
  document.addEventListener("ngumpul:ruang-berubah", schedule);
  window.addEventListener("focus", () =>
    refresh().then(renderList).catch(error),
  );
  document.addEventListener("visibilitychange", () =>
    refresh().then(renderList).catch(error),
  );
  window.addEventListener("pagehide", () => {
    saveDraft();
    if (recording) recording.stop(true);
  });
  window.addEventListener("hashchange", () => {
    if (location.hash.includes("undangan-grup=")) invite().catch(error);
  });
  const api = {
    prepareInfo() {
      closeDrawer(false);
      return rightPanelVersion;
    },
    isInfoCurrent(version) {
      return version === rightPanelVersion;
    },
    sinkronSidebarGrup,
    cancelPanelMotion,
    dismissInfo(finish) {
      closePanel($("panel-info-grup"), finish);
    },
    focusHeader() {
      const target =
        root.querySelector('.ruang-header button[aria-label="Info Grup"]') ||
        $("ruang-kembali");
      if (!root.hidden && target.getClientRects().length)
        target.focus({ preventScroll: true });
    },
    open,
    pin(mid, value) { return D.pin(gid, cid, mid, value); },
    react(mid, emoji) { return D.reaction(gid, cid, mid, emoji); },
    renderList,
    refresh,
    extendInfo,
    renderMedia,
    invite,
    gallery,
    toast,
    afterExit(id) {
      if (P.state().current?.gid === id) P.leave();
      if (gid === id) backToList();
    },
    active: () => (visible() && cid ? { gid, cid } : null),

  };
  window.NgumpulRuang = api;
  $("dialog-undangan-grup").close();
  const draftsReady = D.loadDrafts().catch(() => {});
  const typingStatus = el("div", "ruang-status", "");
  typingStatus.setAttribute("role", "status");
  $("ruang-composer").before(typingStatus);
  const showTyping = () => {
    const users = cid && !root.hidden ? D.typingMembers(cid).map(B.nama) : [];
    typingStatus.textContent = users.length ? users.join(", ") + " sedang mengetik…" : "";
    typingStatus.hidden = !users.length;
  };
  showTyping();
  document.addEventListener("ngumpul:channel-mengetik", showTyping);
  document.addEventListener("ngumpul:tab-dashboard", showTyping);
  text.addEventListener("input", () => { if (text.value.trim()) D.typing(); });
  renderList().catch(error);
  if (
    location.hash.includes("undangan-grup=") ||
    sessionStorage.getItem("ngumpul_undangan_tertunda")
  )
    invite().catch(error);
  setInterval(() => {
    if (getUserAktif()?.id === akun && !document.hidden) {
      refresh().then(renderSidebar).then(renderList).catch(error);
    }
  }, 10000);
})();
