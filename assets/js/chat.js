(() => {
  const app = document.querySelector("#app");
  const list = document.querySelector("#conversation-list");
  const search = document.querySelector("#search");
  const messageArea = document.querySelector("#message-area");
  const messages = document.querySelector("#messages");
  const messageForm = document.querySelector("#message-form");
  const messageInput = document.querySelector("#message-input");
  const footer = document.querySelector(".demo-footer");
  const colors = ["peach", "lavender", "blue", "yellow", "pink", "mint"];
  let conversations = [];
  let currentTab = "chats";
  let activeId = null;
  let messageRequest = 0;
  let listRequest = 0;
  let statusTimer;

  async function request(url, options) {
    const response = await fetch(url, options);
    if (response.status === 401) {
      window.location.replace("../index.html");
      throw new Error("Sesi berakhir. Silakan masuk kembali.");
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Permintaan gagal.");
    return data;
  }

  function showStatus(message) {
    clearTimeout(statusTimer);
    footer.textContent = message;
    statusTimer = setTimeout(() => {
      footer.textContent =
        "Pesan tersimpan di server · Terhubung secara real-time";
    }, 5000);
  }

  function getActive() {
    return conversations.find((item) => item.id === activeId);
  }

  function avatar(item, large = false) {
    const element = document.createElement("span");
    const index =
      [...item.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) %
      colors.length;
    element.className = `avatar ${item.type === "group" ? "lavender" : colors[index]}${large ? " avatar-large" : ""}`;
    element.textContent = item.initials;
    return element;
  }

  function renderList() {
    const query = search.value.trim().toLocaleLowerCase("id");
    const filtered = conversations.filter(
      (item) =>
        (currentTab === "chats" ||
          item.type === (currentTab === "groups" ? "group" : "contact")) &&
        (item.name.toLocaleLowerCase("id").includes(query) ||
          item.preview.toLocaleLowerCase("id").includes(query)),
    );
    list.replaceChildren();
    document.querySelector("#list-count").textContent =
      `${filtered.length} ${currentTab === "groups" ? "grup" : currentTab === "contacts" ? "kontak" : "chat"}`;
    if (!filtered.length) {
      const empty = document.createElement("p");
      empty.className = "empty-list";
      empty.textContent = query
        ? "Tidak ada percakapan yang ditemukan."
        : "Belum ada kontak. Ajak teman mendaftar di server yang sama.";
      list.append(empty);
    }
    for (const item of filtered) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `conversation-item${item.id === activeId ? " selected" : ""}`;
      button.setAttribute("aria-label", `Buka chat ${item.name}`);
      button.append(avatar(item));
      const content = document.createElement("span");
      content.className = "item-content";
      const top = document.createElement("span");
      top.className = "item-top";
      const name = document.createElement("strong");
      name.textContent = item.name;
      const time = document.createElement("time");
      time.textContent = item.time;
      top.append(name, time);
      const bottom = document.createElement("span");
      bottom.className = "item-preview";
      bottom.textContent =
        item.preview ||
        (item.type === "group" ? "Mulai obrolan grup" : "Mulai percakapan");
      content.append(top, bottom);
      button.append(content);
      button.addEventListener("click", () => {
        activeId = item.id;
        app.classList.add("show-conversation");
        renderList();
        renderConversationHeader();
        loadMessages();
        messageInput.focus();
      });
      list.append(button);
    }
  }

  function renderConversationHeader() {
    const item = getActive();
    if (!item) return;
    const headerAvatar = avatar(item, true);
    headerAvatar.id = "header-avatar";
    document.querySelector("#header-avatar").replaceWith(headerAvatar);
    document.querySelector("#chat-name").textContent = item.name;
    document.querySelector("#chat-status").textContent = item.status;
  }

  async function loadMessages() {
    const id = activeId;
    if (!id) return;
    const requestId = ++messageRequest;
    try {
      const data = await request(
        `/api/messages?conversationId=${encodeURIComponent(id)}`,
      );
      if (requestId !== messageRequest || id !== activeId) return;
      messages.replaceChildren();
      for (const message of data.messages) {
        const bubble = document.createElement("div");
        bubble.className = `message${message.mine ? " sent" : ""}`;
        if (id === "group:general" && !message.mine) {
          const sender = document.createElement("strong");
          sender.className = "message-sender";
          sender.textContent = message.senderName;
          bubble.append(sender);
        }
        const text = document.createElement("p");
        text.textContent = message.text;
        const time = document.createElement("time");
        time.textContent = message.time;
        bubble.append(text, time);
        messages.append(bubble);
      }
      if (!data.messages.length) {
        const empty = document.createElement("p");
        empty.className = "empty-messages";
        empty.textContent = "Belum ada pesan. Mulai percakapannya! 👋";
        messages.append(empty);
      }
      messageArea.scrollTop = messageArea.scrollHeight;
    } catch (error) {
      showStatus(error.message);
    }
  }

  async function loadConversations() {
    const requestId = ++listRequest;
    try {
      const data = await request("/api/conversations");
      if (requestId !== listRequest) return;
      conversations = data.conversations;
      if (!getActive()) activeId = conversations[0]?.id || null;
      renderList();
      renderConversationHeader();
    } catch (error) {
      showStatus(error.message);
    }
  }

  function setTab(tab) {
    currentTab = tab;
    document.querySelectorAll("[data-tab]").forEach((button) => {
      const selected = button.dataset.tab === tab;
      button.classList.toggle("active", selected);
      if (button.classList.contains("section-tab"))
        button.setAttribute("aria-current", selected ? "page" : "false");
    });
    document.querySelector("#list-title").textContent = {
      chats: "Chat",
      groups: "Grup",
      contacts: "Kontak",
    }[tab];
    document.querySelector("#list-label").textContent = {
      chats: "PERCAKAPAN TERBARU",
      groups: "GRUP KAMU",
      contacts: "DAFTAR KONTAK",
    }[tab];
    search.placeholder = {
      chats: "Cari percakapan...",
      groups: "Cari grup...",
      contacts: "Cari kontak...",
    }[tab];
    search.value = "";
    app.classList.remove("show-conversation");
    renderList();
  }

  document
    .querySelectorAll("[data-tab]")
    .forEach((button) =>
      button.addEventListener("click", () => setTab(button.dataset.tab)),
    );
  search.addEventListener("input", renderList);
  document
    .querySelector("#back-button")
    .addEventListener("click", () => app.classList.remove("show-conversation"));
  document.querySelector("#logout").addEventListener("click", async () => {
    try {
      await request("/api/logout", { method: "POST" });
      window.location.replace("../index.html");
    } catch (error) {
      showStatus(error.message);
    }
  });
  messageForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = messageInput.value.trim();
    if (!text || !activeId) return;
    const button = messageForm.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      await request("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeId, text }),
      });
      if (messageInput.value === text) messageInput.value = "";
      await Promise.all([loadMessages(), loadConversations()]);
      messageInput.focus();
    } catch (error) {
      showStatus(error.message);
    } finally {
      button.disabled = false;
    }
  });

  async function start() {
    try {
      const { user } = await request("/api/me");
      document.querySelector("#my-avatar").textContent = user.name
        .charAt(0)
        .toUpperCase();
      document.querySelector("#my-avatar").title = user.name;
      await loadConversations();
      await loadMessages();
      const events = new EventSource("/api/events");
      events.addEventListener("update", () => {
        loadConversations();
        loadMessages();
      });
      events.addEventListener("error", () =>
        showStatus("Koneksi terputus. Mencoba menyambungkan kembali..."),
      );
      events.addEventListener("open", () => {
        footer.textContent =
          "Pesan tersimpan di server · Terhubung secara real-time";
      });
    } catch (error) {
      showStatus(error.message);
    }
  }
  setTab("chats");
  start();
})();
