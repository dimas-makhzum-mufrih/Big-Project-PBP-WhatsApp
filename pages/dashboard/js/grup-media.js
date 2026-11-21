(() => {
  "use strict";
  const urls = new Map();
  let database;
  function db() {
    if (!database)
      database = new Promise((resolve, reject) => {
        const request = indexedDB.open("ngumpul_media_grup", 1);
        request.onupgradeneeded = () =>
          request.result.createObjectStore("berkas", { keyPath: "id" });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
          database = null;
          reject(new Error("Penyimpanan berkas tidak dapat dibuka."));
        };
      });
    return database;
  }
  async function simpan(files) {
    const records = files.map((file) => ({
      id: crypto.randomUUID(),
      blob: file,
      nama: file.name || "Pesan suara.webm",
      mime: file.type || "application/octet-stream",
      ukuran: file.size,
    }));
    if (records.some((f) => f.ukuran > 25 * 1024 * 1024))
      throw new Error("Ukuran setiap berkas maksimal 25 MB.");
    const storage = await db();
    await new Promise((resolve, reject) => {
      const tx = storage.transaction("berkas", "readwrite");
      records.forEach((r) => tx.objectStore("berkas").put(r));
      tx.oncomplete = resolve;
      tx.onerror = tx.onabort = () =>
        reject(new Error("Berkas gagal disimpan. Coba lagi."));
    });
    return records.map(({ blob, ...r }) => r);
  }
  async function url(file) {
    if (urls.has(file.id)) return urls.get(file.id);
    if (!file.id && /^(https?:|data:image\/)/.test(file.url || ""))
      return file.url;
    const storage = await db();
    const record = await new Promise((resolve, reject) => {
      const request = storage
        .transaction("berkas")
        .objectStore("berkas")
        .get(file.id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error("Berkas gagal dibaca."));
    });
    if (!record) return null;
    const result = URL.createObjectURL(record.blob);
    urls.set(file.id, result);
    return result;
  }
  async function tampilkan(file, preview = false) {
    const link = document.createElement("a");
    link.className = "ruang-attachment";
    link.textContent = file.nama || "Berkas";
    const source = await url(file);
    if (!source) {
      link.removeAttribute("href");
      link.textContent += " · Tidak tersedia";
      return link;
    }
    link.href = source;
    link.download = file.nama || "Berkas";
    const type = file.mime || "";
    if (type.startsWith("image/")) {
      const image = document.createElement("img");
      image.src = source;
      image.alt = file.nama || "Foto";
      image.loading = "lazy";
      link.replaceChildren(image);
    } else if (/^(video|audio)\//.test(type)) {
      const player = document.createElement(
        type.startsWith("video") ? "video" : "audio",
      );
      player.src = source;
      player.controls = true;
      player.preload = "metadata";
      link.removeAttribute("href");
      link.removeAttribute("download");
      link.replaceChildren(player);
    }
    if (preview) link.classList.add("preview");
    return link;
  }
  async function record(onTick) {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
      throw new Error("Rekaman suara tidak didukung browser ini.");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    let recorder;
    try {
      recorder = new MediaRecorder(stream);
    } catch (e) {
      stream.getTracks().forEach((t) => t.stop());
      throw e;
    }
    const chunks = [];
    const started = Date.now();
    const timer = setInterval(
      () => onTick(Math.floor((Date.now() - started) / 1000)),
      500,
    );
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    recorder.start();
    let pending;
    return {
      stop(cancel = false) {
        if (pending) return pending;
        pending = new Promise((resolve) => {
          recorder.onstop = () => {
            clearInterval(timer);
            stream.getTracks().forEach((t) => t.stop());
            resolve(
              cancel
                ? null
                : new File(
                    chunks,
                    "Pesan suara." +
                      (recorder.mimeType.includes("mp4") ? "m4a" : "webm"),
                    { type: recorder.mimeType },
                  ),
            );
          };
          recorder.stop();
        });
        return pending;
      },
    };
  }
  window.addEventListener("pagehide", () => {
    urls.forEach((value) => URL.revokeObjectURL(value));
    urls.clear();
  });
  window.NgumpulGrupMedia = { simpan, url, tampilkan, record };
})();
