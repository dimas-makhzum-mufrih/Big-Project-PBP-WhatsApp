(() => {
  if (window.NgumpulNotifikasi) return;
  (() => {
    if (!userAktif) return;
    const existing = document.getElementById("btn-setelan-notifikasi");
    if (!existing) {
      const item = document.querySelector(
        '.settings-row-item[data-fitur="notifikasi"]',
      );
      item.id = "btn-setelan-notifikasi";
      item.removeAttribute("data-fitur");
      item.removeAttribute("title");
      item.tabIndex = 0;
      item.setAttribute("role", "button");
      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          item.click();
        }
      });
    }
    if (!document.getElementById("panel-setelan-notifikasi")) {
      const page = document.createElement("section");
      page.id = "panel-setelan-notifikasi";
      page.className = "settings-theme-page";
      page.hidden = true;
      page.innerHTML =
        '<h2 id="judul-notifikasi" tabindex="-1">Notifikasi pesan</h2><div class="ruang-toggle-row"><span>Notifikasi browser</span><button id="btn-notifikasi" class="ruang-switch" type="button" role="switch" aria-label="Notifikasi browser" aria-checked="false"></button></div><p id="deskripsi-notifikasi"></p><p id="status-notifikasi" role="status"></p>';
      document.getElementById("panel-setelan-tema").after(page);
      document
        .getElementById("btn-kembali-ke-chat")
        .addEventListener("click", () => {
          page.hidden = true;
        });
    }
  })();
  const panelPengaturanNotifikasi = document.getElementById(
    "panel-setelan-notifikasi",
  );
  (function () {
    if (!userAktif) return;
    const akunId = userAktif.id;
    const preferensiKey = "ngumpul_notifikasi_" + akunId;
    const riwayatKey = "ngumpul_notifikasi_riwayat_" + akunId;
    const kunciAntrean = "ngumpul:notifikasi:" + akunId;
    const leaseKey = "ngumpul_notifikasi_kunci_" + akunId;
    const tabId = window.crypto?.randomUUID ? crypto.randomUUID() : buatId();
    const awalKehadiran = "ngumpul_notifikasi_tab_" + akunId + ":";
    const kehadiranKey = awalKehadiran + tabId;
    const menu = document.getElementById("btn-setelan-notifikasi");
    const tombol = document.getElementById("btn-notifikasi");
    const teksStatus = document.getElementById("status-notifikasi");
    const deskripsi = document.getElementById("deskripsi-notifikasi");
    const diketahui = new Set();
    const grupItems = new Map();
    let grupSiap = false;
    const terbuka = new Map();
    let aktif = false;
    let berhenti = false;
    let siap = false;
    let memintaIzin = false;
    let memeriksa = false;
    let timer = null;
    let jadwal = null;
    let pesanError = "";

    function sesiSesuai() {
      return !berhenti && getUserAktif()?.id === akunId;
    }
    function izinBrowser() {
      if (!("Notification" in window)) return "unsupported";
      if (!window.isSecureContext) return "insecure";
      return Notification.permission;
    }
    function bacaPreferensi() {
      try {
        return (
          JSON.parse(localStorage.getItem(preferensiKey) || "false") === true
        );
      } catch (_) {
        return false;
      }
    }
    function perbaruiTampilan() {
      const izin = izinBrowser();
      tombol.setAttribute("aria-checked", String(aktif && izin === "granted"));
      tombol.disabled =
        memintaIzin || ["unsupported", "insecure", "denied"].includes(izin);
      deskripsi.textContent =
        izin === "denied"
          ? "Izinkan notifikasi untuk situs ini melalui pengaturan browser."
          : izin === "unsupported"
            ? "Browser ini belum mendukung notifikasi."
            : izin === "insecure"
              ? "Buka aplikasi melalui HTTPS atau localhost untuk mengaktifkan notifikasi."
              : "Notifikasi muncul ketika kamu tidak sedang membuka percakapan pengirim.";
      const label =
        izin === "denied"
          ? "Diblokir browser"
          : izin === "unsupported"
            ? "Tidak didukung"
            : izin === "insecure"
              ? "Koneksi belum mendukung notifikasi"
              : aktif && izin === "granted"
                ? "Aktif"
                : izin === "default"
                  ? "Belum diizinkan"
                  : "Nonaktif";
      teksStatus.textContent = memintaIzin
        ? "Meminta izin browser..."
        : pesanError || label;
      teksStatus.dataset.error = String(!!pesanError);
    }
    function pesanMasuk() {
      const data = JSON.parse(localStorage.getItem(KEY_CHAT) || "{}");
      if (!data || typeof data !== "object" || Array.isArray(data))
        throw new Error();
      const hasil = new Map();
      getUsers().forEach((user) => {
        if (!user || user.id === akunId || !isKontakPengguna(user.id)) return;
        const percakapan = kunciKonversasi(akunId, user.id);
        const daftar = data[percakapan];
        if (daftar === undefined) return;
        if (!Array.isArray(daftar)) throw new Error();
        daftar.forEach((pesan) => {
          if (
            !pesan ||
            pesan.sender !== user.id ||
            typeof pesan.id !== "string" ||
            !pesan.id ||
            typeof pesan.text !== "string" ||
            !pesan.text.trim()
          )
            return;
          const key = JSON.stringify([percakapan, pesan.id]);
          hasil.set(key, { key, idLawan: user.id, pesan });
        });
      });
      grupItems.forEach((item) =>
        hasil.set(item.key, {
          key: item.key,
          idLawan: item.target,
          pesan: { text: item.text },
        }),
      );
      return hasil;
    }
    function titikAwal() {
      try {
        pesanMasuk().forEach((_, key) => diketahui.add(key));
        siap = true;
      } catch (_) {
        pesanError = "Riwayat pesan belum dapat diperiksa. Coba lagi.";
      }
    }
    async function perbaruiGrup(tandaiLama = false) {
      if (!window.NgumpulRuang) return;
      const items = await window.NgumpulRuang.notificationItems();
      grupItems.clear();
      items.forEach((item) => grupItems.set(item.key, item));
      if (!grupSiap || tandaiLama)
        items.forEach((item) => diketahui.add(item.key));
      grupSiap = true;
    }
    function perbaruiBadgeChat() {
      let jumlah = 0;
      for (const user of getUsers()) {
        if (user.id === akunId || !isKontakPengguna(user.id)) continue;
        jumlah += ambilPesanChat(user.id).filter(
          (p) => p.sender !== akunId && p.status !== "dibaca",
        ).length;
      }
      const tab = document.getElementById("tab-chat");
      let badge = tab.querySelector(".ruang-badge");
      if (!jumlah) {
        badge?.remove();
        return;
      }
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "ruang-badge";
        tab.append(badge);
      }
      badge.textContent = jumlah > 99 ? "99+" : jumlah;
      badge.setAttribute("aria-label", jumlah + " pesan belum dibaca");
    }
    function percakapanTerlihat() {
      const ruang = window.NgumpulRuang?.active();
      if (sesiSesuai() && ruang) return "grup:" + ruang.gid + ":" + ruang.cid;
      if (
        !sesiSesuai() ||
        document.visibilityState !== "visible" ||
        !document.hasFocus() ||
        panelTabChat.hidden ||
        !panelChatAktif.getClientRects().length ||
        getComputedStyle(panelLayerSetelan).display !== "none"
      )
        return null;
      return chatAktifId;
    }
    function perbaruiKehadiran() {
      try {
        if (!sesiSesuai() || !aktif || izinBrowser() !== "granted") {
          localStorage.removeItem(kehadiranKey);
          return;
        }
        localStorage.setItem(
          kehadiranKey,
          JSON.stringify({
            chatId: percakapanTerlihat(),
            waktu: Date.now(),
          }),
        );
      } catch (_) {}
    }
    function sedangDibuka(idLawan) {
      if (percakapanTerlihat() === idLawan) return true;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(awalKehadiran)) continue;
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (data?.chatId === idLawan && Date.now() - data.waktu < 10000)
            return true;
        } catch (_) {}
      }
      return false;
    }
    function tutupNotifikasi(idLawan) {
      const notifikasi = terbuka.get(idLawan);
      if (notifikasi) {
        terbuka.delete(idLawan);
        notifikasi.close();
      }
    }
    function tutupSemua() {
      [...terbuka.keys()].forEach(tutupNotifikasi);
    }
    function tutupYangDibaca() {
      [...terbuka.keys()].forEach((id) => {
        if (sedangDibuka(id)) tutupNotifikasi(id);
      });
    }
    function tampilkanNotifikasi(idLawan, pesan) {
      if (
        !sesiSesuai() ||
        !aktif ||
        izinBrowser() !== "granted" ||
        sedangDibuka(idLawan)
      )
        return;
      try {
        const terakhir = pesan[pesan.length - 1].pesan;
        const ruang = [...grupItems.values()].find(
          (item) => item.target === idLawan,
        );
        if (ruang?.muted) return;
        if (!ruang) {
          try {
            const bisu = JSON.parse(localStorage.getItem("ngumpul_bisu_" + getUserAktif().id)) || {};
            if (bisu[idLawan]) return; // chat pribadi dibisukan dari info kontak
          } catch (_) {}
        }
        const nama = ruang ? ruang.title : getProfilChat(idLawan).nama;
        const cuplikan = terakhir.text.replace(/\s+/g, " ").trim();
        const body =
          (pesan.length > 1 ? pesan.length + " pesan baru: " : "") +
          cuplikan.slice(0, 160) +
          (cuplikan.length > 160 ? "…" : "");
        const notifikasi = new Notification("Ngumpul · " + nama, {
          body,
          tag: "ngumpul:" + akunId + ":" + idLawan,
          icon: idLawan.startsWith("grup:")
            ? undefined
            : ambilFotoProfilChat(idLawan) || undefined,
        });
        tutupNotifikasi(idLawan);
        terbuka.set(idLawan, notifikasi);
        notifikasi.addEventListener("click", () => {
          notifikasi.close();
          if (!sesiSesuai() || (!ruang && !isKontakPengguna(idLawan))) return;
          window.focus();
          panelPengaturanNotifikasi.hidden = true;
          panelPengaturanTema.hidden = true;
          menu.setAttribute("aria-expanded", "false");
          daftarPengaturan.style.display = "block";
          judulPanelSetelan.textContent = "Pengaturan";
          tutupSetelan();
          if (ruang) ruang.open().catch(() => {});
          else
            document.dispatchEvent(
              new CustomEvent("ngumpul:buka-chat", { detail: { idLawan } }),
            );
          perbaruiKehadiran();
        });
        notifikasi.addEventListener("close", () => {
          if (terbuka.get(idLawan) === notifikasi) terbuka.delete(idLawan);
        });
        notifikasi.addEventListener("error", () => {
          pesanError = "Notifikasi tidak dapat ditampilkan di browser ini.";
          perbaruiTampilan();
        });
      } catch (_) {
        pesanError = "Notifikasi tidak dapat ditampilkan di browser ini.";
        perbaruiTampilan();
      }
    }
    async function denganKunci(aksi) {
      if (navigator.locks?.request)
        return navigator.locks.request(kunciAntrean, aksi);
      const lama = JSON.parse(localStorage.getItem(leaseKey) || "null");
      if (lama && lama.sampai > Date.now() && lama.tab !== tabId) return false;
      const token = tabId + ":" + Date.now();
      localStorage.setItem(
        leaseKey,
        JSON.stringify({ tab: tabId, token, sampai: Date.now() + 10000 }),
      );
      await new Promise((resolve) => setTimeout(resolve, 60));
      if (JSON.parse(localStorage.getItem(leaseKey) || "null")?.token !== token)
        return false;
      try {
        return aksi();
      } finally {
        if (
          JSON.parse(localStorage.getItem(leaseKey) || "null")?.token === token
        )
          localStorage.removeItem(leaseKey);
      }
    }
    async function periksaPesan() {
      if (!sesiSesuai()) {
        hentikan();
        return;
      }
      if (memeriksa) return;
      memeriksa = true;
      try {
        aktif = bacaPreferensi();
        perbaruiKehadiran();
        tutupYangDibaca();
        await perbaruiGrup();
        perbaruiBadgeChat();
        const semua = pesanMasuk();
        const baru = [...semua.values()].filter(
          (item) => !diketahui.has(item.key),
        );
        if (!siap || !aktif || izinBrowser() !== "granted") {
          semua.forEach((_, key) => diketahui.add(key));
          siap = true;
          return;
        }
        if (!baru.length) return;
        await denganKunci(() => {
          if (!sesiSesuai() || !bacaPreferensi() || izinBrowser() !== "granted")
            return false;
          const data = JSON.parse(localStorage.getItem(riwayatKey) || "[]");
          if (!Array.isArray(data) || data.some((id) => typeof id !== "string"))
            throw new Error();
          const ditangani = new Set(data);
          const belum = baru.filter((item) => !ditangani.has(item.key));
          pesanError = "";
          if (belum.length) {
            belum.forEach((item) => ditangani.add(item.key));
            localStorage.setItem(riwayatKey, JSON.stringify([...ditangani]));
            const percakapan = new Map();
            belum.forEach((item) => {
              if (!percakapan.has(item.idLawan))
                percakapan.set(item.idLawan, []);
              percakapan.get(item.idLawan).push(item);
            });
            percakapan.forEach((pesan, idLawan) =>
              tampilkanNotifikasi(idLawan, pesan),
            );
          }
          baru.forEach((item) => diketahui.add(item.key));
          return true;
        });
      } catch (_) {
        pesanError = "Notifikasi belum dapat diproses. Coba lagi.";
      } finally {
        memeriksa = false;
        perbaruiTampilan();
      }
    }
    function jadwalkanPemeriksaan() {
      if (!sesiSesuai() || jadwal !== null) return;
      jadwal = setTimeout(() => {
        jadwal = null;
        periksaPesan();
      }, 0);
    }
    function sesuaikanPemeriksaan() {
      clearInterval(timer);
      timer = null;
      aktif = bacaPreferensi();
      if (sesiSesuai() && aktif && izinBrowser() === "granted") {
        timer = setInterval(periksaPesan, 2000);
        perbaruiKehadiran();
      } else {
        perbaruiKehadiran();
        tutupSemua();
      }
      perbaruiTampilan();
    }
    function hentikan() {
      berhenti = true;
      clearInterval(timer);
      clearTimeout(jadwal);
      timer = null;
      jadwal = null;
      tutupSemua();
      try {
        localStorage.removeItem(kehadiranKey);
      } catch (_) {}
    }
    menu.addEventListener("click", () => {
      daftarPengaturan.style.display = "none";
      panelPengaturanTema.hidden = true;
      panelPengaturanNotifikasi.hidden = false;
      judulPanelSetelan.textContent = "Notifikasi";
      menu.setAttribute("aria-expanded", "true");
      sesuaikanPemeriksaan();
      document.getElementById("judul-notifikasi").focus();
    });
    tombol.addEventListener("click", async () => {
      if (!sesiSesuai() || memintaIzin || tombol.disabled) return;
      pesanError = "";
      memintaIzin = true;
      const nonaktifkan = bacaPreferensi() && izinBrowser() === "granted";
      perbaruiTampilan();
      try {
        let izin = izinBrowser();
        if (!nonaktifkan && izin === "default")
          izin = await Notification.requestPermission();
        if (!sesiSesuai()) return;
        if (nonaktifkan || izin === "granted") {
          await perbaruiGrup(true);
          titikAwal();
          localStorage.setItem(preferensiKey, JSON.stringify(!nonaktifkan));
        }
      } catch (_) {
        pesanError = "Pengaturan notifikasi gagal disimpan. Coba lagi.";
      } finally {
        memintaIzin = false;
        sesuaikanPemeriksaan();
      }
    });
    window.addEventListener("storage", (event) => {
      if (!sesiSesuai()) return hentikan();
      if (event.key === KEY_CHAT) perbaruiBadgeChat();
      if (event.key === preferensiKey || event.key === null) {
        titikAwal();
        pesanError = "";
        sesuaikanPemeriksaan();
      } else if (
        event.key === KEY_CHAT ||
        event.key?.startsWith("ngumpul_pesan_grup_")
      )
        jadwalkanPemeriksaan();
      else if (event.key === "ngumpul_kontak_" + akunId) titikAwal();
      else if (event.key?.startsWith(awalKehadiran)) tutupYangDibaca();
    });
    function perbaruiFokus() {
      if (!sesiSesuai()) return hentikan();
      const terlihat = percakapanTerlihat();
      if (terlihat && !terlihat.startsWith("grup:")) {
        tandaiPesanDibaca(terlihat);
        renderPesanAktif();
      }
      perbaruiBadgeChat();
      sesuaikanPemeriksaan();
      tutupYangDibaca();
      jadwalkanPemeriksaan();
    }
    window.addEventListener("focus", perbaruiFokus);
    window.addEventListener("blur", perbaruiKehadiran);
    document.addEventListener("visibilitychange", perbaruiFokus);
    document.addEventListener("click", () => {
      queueMicrotask(() => {
        perbaruiBadgeChat();
        perbaruiKehadiran();
        tutupYangDibaca();
      });
    });
    ["btn-keluar-akun", "btn-masuk-akun-lain"].forEach((id) => {
      document.getElementById(id)?.addEventListener("click", hentikan, true);
    });
    window.addEventListener("pagehide", hentikan);
    window.addEventListener("pageshow", (event) => {
      if (!event.persisted || getUserAktif()?.id !== akunId) return;
      berhenti = false;
      titikAwal();
      sesuaikanPemeriksaan();
    });
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "notifications" })
        .then((permission) => {
          permission.addEventListener("change", () => {
            if (!sesiSesuai()) return;
            pesanError = "";
            titikAwal();
            sesuaikanPemeriksaan();
          });
        })
        .catch(() => {});
    }
    window.NgumpulNotifikasi = {
      async panggilan(message) {
        if (
          !sesiSesuai() ||
          !bacaPreferensi() ||
          izinBrowser() !== "granted" ||
          document.hasFocus()
        )
          return;
        await denganKunci(() => {
          const key =
            "ngumpul_notifikasi_call:" +
            akunId +
            ":" +
            message.from +
            ":" +
            message.started;
          if (localStorage.getItem(key)) return;
          localStorage.setItem(key, "1");
          const n = new Notification("Panggilan grup", {
            body: getProfil(message.akun).nama + " menelepon",
            tag: key,
          });
          n.onclick = () => {
            window.focus();
            n.close();
          };
          setTimeout(() => n.close(), 30000);
        });
      },
    };
    aktif = bacaPreferensi();
    perbaruiBadgeChat();
    titikAwal();
    sesuaikanPemeriksaan();
    periksaPesan();
  })();
})();
