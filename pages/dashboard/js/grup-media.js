(() => {
  "use strict";
  async function simpan(files) {
    const records = files.map((file) => ({
      file, nama: file.name || "Pesan suara.webm",
      mime: (file.type || "application/octet-stream").split(";")[0],
      ukuran: file.size,
    }));
    if (records.some((f) => f.ukuran > 25 * 1024 * 1024))
      throw new Error("Ukuran setiap berkas maksimal 25 MB.");
    return records;
  }
  async function url(file) {
    if (/^https?:\/\//i.test(file.url || "")) return file.url;
    if (file.id) return (await NgumpulAuth.api("attachments/" + encodeURIComponent(file.id) + "/download-url")).url;
    return null;
  }
  async function tampilkan(file, preview = false) {
    const link = document.createElement("a");
    link.className = "ruang-attachment";
    link.textContent = file.nama || "Berkas";
    const source = await url(file).catch(() => null);
    if (!source) {
      link.removeAttribute("href");
      link.textContent += " · Tidak tersedia";
      return link;
    }
    link.href = source;
    link.download = file.nama || "Berkas";
    link.addEventListener("click", async (event) => {
      if (!file.id) return;
      event.preventDefault();
      try {
        const { url } = await NgumpulAuth.api("attachments/" + encodeURIComponent(file.id) + "/download-url");
        const download = document.createElement("a");
        download.href = url;
        download.download = link.download;
        download.click();
      } catch (error) { window.NgumpulRuang?.toast(error.message); }
    });
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
  window.NgumpulGrupMedia = { simpan, url, tampilkan, record };
})();
