(() => {
  "use strict";
  const dasar = window.NgumpulGrupDasar;
  if (!dasar || !userAktif) return;
  const akun = userAktif.id;
  const backend = null;
  const uid = () => crypto.randomUUID();
  const baca = (key, fallback) => {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  };
  const tulis = (key, value) =>
    localStorage.setItem(key, JSON.stringify(value));
  const kunci = (jenis, ...ids) =>
    "ngumpul_ruang_" + jenis + ":" + ids.map(encodeURIComponent).join(":");
  const bawaan = (g) => ({
    versi: 2,
    categories: [
      { id: g.id + ":teks", nama: "Teks" },
      { id: g.id + ":suara", nama: "Suara" },
    ],
    channels: [
      {
        id: g.id + ":umum",
        nama: "info-umum",
        kategoriId: g.id + ":teks",
        jenis: "teks",
        bawaan: true,
      },
    ],
  });
  const ruang = (g) => g.ruang || bawaan(g);
  function validasiNama(nama, daftar, id, channel = false) {
    const value = channel
      ? nama.trim().toLocaleLowerCase("id-ID").replace(/\s+/g, "-")
      : nama.trim();
    if (!value || value.length > 60)
      throw new Error("Isi nama, maksimal 60 karakter.");
    if (
      daftar.some(
        (item) =>
          item.id !== id &&
          item.nama.toLocaleLowerCase("id-ID") ===
            value.toLocaleLowerCase("id-ID"),
      )
    )
      throw new Error("Nama sudah digunakan.");
    return value;
  }
  async function ensure(g) {
    if (g.keluar || g.ruang?.versi >= 2) return { ...g, ruang: ruang(g) };
    if (!g.ruang) await dasar.migrasi(g.id);
    return dasar.ubah(
      g.id,
      (current) => {
        if (!current.ruang) current.ruang = bawaan(current);
        if (current.ruang.versi >= 2) return;
        current.ruang.versi = 2;
      },
      false,
    );
  }
  const lokal = {
    backend,
    uid,
    kunci,
    ruang,
    async list() {
      const result = [];
      for (const g of await dasar.layanan.daftarGrup())
        result.push(await ensure(g));
      return result;
    },
    async get(id) {
      return ensure(await dasar.layanan.ambilGrup(id));
    },
    async messages(g, channelId = null) {
      const fallback =
        ruang(g).channels.find((c) => c.bawaan)?.id || g.id + ":umum";
      return (await dasar.layanan.ambilPesan(g.id))
        .map((p) => ({ ...p, channelId: p.channelId || fallback }))
        .filter((p) => !channelId || p.channelId === channelId)
        .sort((a, b) => a.dibuat - b.dibuat || a.id.localeCompare(b.id));
    },
    async send(gid, channelId, isi, lampiran = [], id = uid()) {
      const g = await this.get(gid);
      if (g.keluar) throw new Error("Kamu sudah keluar dari grup ini.");
      if (
        !g.ruang.channels.some((c) => c.id === channelId && c.jenis === "teks")
      )
        throw new Error("Channel tidak tersedia.");
      return dasar.layanan.kirimPesan(gid, {
        id,
        channelId,
        grupId: gid,
        isi: isi.trim(),
        lampiran,
        pengirimId: akun,
        dibuat: Date.now(),
      });
    },
    async read(g, channelId, visible) {
      const changed =
        !g.keluar &&
        visible &&
        this.unread(await this.messages(g, channelId)) > 0;
      if (!g.keluar) await dasar.layanan.tandaiStatus(g.id, visible, channelId);
      return changed;
    },
    unread(messages) {
      return messages.filter(
        (p) =>
          p.jenis !== "aktivitas" &&
          p.pengirimId !== akun &&
          p.penerimaIds?.includes(akun) &&
          localStorage.getItem(
            "ngumpul_status_grup_" +
              [p.grupId, p.id, akun].map(encodeURIComponent).join(":") +
              ":dibaca",
          ) === null,
      ).length;
    },
    draft(gid, cid, value) {
      const key = kunci("draft", akun, gid, cid);
      if (value === undefined) return sessionStorage.getItem(key) || "";
      sessionStorage.setItem(key, value);
    },
    muted(gid, value) {
      const key = kunci("bisukan", akun, gid);
      if (value === undefined) return baca(key, false);
      tulis(key, !!value);
      document.dispatchEvent(new CustomEvent("ngumpul:ruang-berubah"));
    },
    async category(gid, nama, id = null) {
      return dasar.ubah(gid, (g) => {
        g.ruang ||= bawaan(g);
        const value = validasiNama(nama, g.ruang.categories, id);
        if (id) {
          const c = g.ruang.categories.find((c) => c.id === id);
          if (!c) throw new Error("Kategori sudah dihapus.");
          c.nama = value;
        } else g.ruang.categories.push({ id: uid(), nama: value });
      });
    },
    async channel(gid, nama, kategoriId, jenis, id = null) {
      return dasar.ubah(gid, (g) => {
        g.ruang ||= bawaan(g);
        const existing = id ? g.ruang.channels.find((c) => c.id === id) : null;
        if (id && !existing) throw new Error("Channel sudah dihapus.");
        if (existing) jenis = existing.jenis;
        if (!["teks", "suara"].includes(jenis))
          throw new Error("Pilih jenis channel.");
        if (!g.ruang.categories.some((c) => c.id === kategoriId))
          throw new Error("Pilih kategori.");
        const list = g.ruang.channels.filter(
          (c) => c.kategoriId === kategoriId && c.jenis === jenis,
        );
        const value = validasiNama(nama, list, id, jenis === "teks");
        if (existing) {
          existing.nama = value;
          existing.kategoriId = kategoriId;
        } else
          g.ruang.channels.push({ id: uid(), nama: value, kategoriId, jenis });
      });
    },
    async removeChannel(gid, id) {
      return dasar.ubah(gid, (g) => {
        g.ruang.channels = g.ruang.channels.filter((c) => c.id !== id);
      });
    },
    async removeCategory(gid, id, tujuan) {
      return dasar.ubah(gid, (g) => {
        if (
          tujuan &&
          !g.ruang.categories.some((c) => c.id === tujuan && c.id !== id)
        )
          throw new Error("Kategori tujuan tidak tersedia.");
        if (tujuan) {
          const target = g.ruang.channels.filter(
            (c) => c.kategoriId === tujuan,
          );
          for (const c of g.ruang.channels.filter((c) => c.kategoriId === id)) {
            if (
              target.some(
                (other) =>
                  other.jenis === c.jenis &&
                  other.nama.toLocaleLowerCase("id-ID") ===
                    c.nama.toLocaleLowerCase("id-ID"),
              )
            )
              throw new Error(
                'Channel "' +
                  c.nama +
                  '" sudah ada di kategori tujuan. Ubah namanya terlebih dahulu.',
              );
          }
        }
        g.ruang.categories = g.ruang.categories.filter((c) => c.id !== id);
        g.ruang.channels = g.ruang.channels
          .filter((c) => c.kategoriId !== id || tujuan)
          .map((c) => (c.kategoriId === id ? { ...c, kategoriId: tujuan } : c));
      });
    },
    async inviteSettings(gid, allowed, reset = false) {
      return dasar.ubah(gid, (g) => {
        g.anggotaBolehUndang = allowed;
        if (reset || !g.kodeUndangan) g.kodeUndangan = uid();
      });
    },
    async invitation(gid, token) {
      const groups = baca("ngumpul_grup", []);
      const g = groups.find(
        (g) => g.id === gid && g.kodeUndangan === token && g.anggotaIds.length,
      );
      if (!g) throw new Error("Tautan undangan sudah tidak berlaku.");
      return {
        id: g.id,
        nama: g.nama,
        foto: g.foto,
        deskripsi: g.deskripsi || "",
        jumlah: g.anggotaIds.length,
        anggota: g.anggotaIds.includes(akun),
      };
    },
    join: (gid, token) => dasar.layanan.gabung(gid, token),
  };
  window.NgumpulGrupData = backend || lokal;
})();
