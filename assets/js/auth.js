(() => {
  const form = document.querySelector("#auth-form");
  const notice = document.querySelector("#auth-notice");
  const password = document.querySelector("#password");
  const toggle = document.querySelector(".password-toggle");

  toggle.addEventListener("click", () => {
    const visible = password.type === "password";
    password.type = visible ? "text" : "password";
    toggle.textContent = visible ? "Sembunyikan" : "Lihat";
    toggle.setAttribute(
      "aria-label",
      visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi",
    );
  });

  document.querySelectorAll("[data-provider]").forEach((button) => {
    button.addEventListener("click", () => {
      notice.hidden = false;
      notice.textContent = `Login dengan ${button.dataset.provider} belum tersedia. Silakan gunakan email dan kata sandi.`;
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    notice.hidden = true;
    const mode = form.dataset.mode;
    const input = {
      email: form.elements.email.value.trim(),
      password: password.value,
    };
    if (mode === "register") input.name = form.elements.name.value.trim();

    try {
      const response = await fetch(`/api/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const result = await response.json();
        const error =
          response.status === 409
            ? "Email sudah terdaftar. Silakan masuk."
            : response.status === 401
              ? "Email atau kata sandi salah."
              : result.error || "Tidak dapat memproses permintaan.";
        throw new Error(error);
      }
      window.location.href = form.dataset.destination;
    } catch (error) {
      notice.hidden = false;
      notice.textContent =
        error instanceof TypeError
          ? "Tidak dapat terhubung ke server. Jalankan aplikasi dengan npm start."
          : error.message;
      button.disabled = false;
    }
  });
})();
