const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

test("dua akun bisa berkirim pesan langsung dan menerima update real-time", async () => {
  // Jalankan salinan server di folder sementara supaya data pengguna asli tidak tersentuh.
  const sandbox = fs.mkdtempSync(path.join(__dirname, ".chat-test-"));
  fs.copyFileSync(
    path.join(projectRoot, "server.js"),
    path.join(sandbox, "server.js"),
  );
  fs.copyFileSync(
    path.join(projectRoot, "index.html"),
    path.join(sandbox, "index.html"),
  );
  const server = require(path.join(sandbox, "server.js"));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let eventController;

  async function api(url, cookie, method = "GET", body) {
    const response = await fetch(base + url, {
      method,
      headers: {
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return {
      response,
      data: await response.json(),
      cookie: response.headers.get("set-cookie")?.split(";")[0],
    };
  }

  try {
    const preflight = await fetch(base + "/api/register", {
      method: "OPTIONS",
      headers: {
        Origin: "https://contoh.test",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
      },
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("access-control-allow-origin"), "*");
    assert.match(preflight.headers.get("access-control-allow-methods"), /POST/);
    assert.match(
      preflight.headers.get("access-control-allow-headers"),
      /Content-Type/i,
    );

    const a = await api("/api/register", null, "POST", {
      name: "Ayu",
      email: "ayu@example.test",
      password: "password123",
    });
    const bResponse = await fetch(base + "/api/register", {
      method: "POST",
      headers: {
        Origin: "https://contoh.test",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Bima",
        email: "bima@example.test",
        password: "password456",
      }),
    });
    assert.equal(bResponse.headers.get("access-control-allow-origin"), "*");
    const b = {
      response: bResponse,
      data: await bResponse.json(),
      cookie: bResponse.headers.get("set-cookie")?.split(";")[0],
    };
    assert.equal(a.response.status, 201);
    assert.equal(b.response.status, 201);
    const unauthorized = await api("/api/conversations");
    assert.equal(unauthorized.response.status, 401);
    assert.equal(
      unauthorized.response.headers.get("access-control-allow-origin"),
      "*",
    );
    const contacts = await api("/api/conversations", a.cookie);
    const recipient = contacts.data.conversations.find(
      (entry) => entry.id === `user:${b.data.user.id}`,
    );
    assert.equal(recipient.name, "Bima");
    assert.ok(
      contacts.data.conversations.some((entry) => entry.id === "group:general"),
    );

    eventController = new AbortController();
    const eventResponse = await fetch(base + "/api/events", {
      headers: { Cookie: b.cookie },
      signal: eventController.signal,
    });
    assert.equal(eventResponse.status, 200);
    assert.equal(eventResponse.headers.get("access-control-allow-origin"), "*");
    const reader = eventResponse.body.getReader();
    await reader.read(); // komentar koneksi awal

    const sent = await api("/api/messages", a.cookie, "POST", {
      conversationId: recipient.id,
      text: "Halo dari Ayu!",
    });
    assert.equal(sent.response.status, 201);
    const event = await Promise.race([
      reader.read(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Update SSE tidak diterima")), 3000),
      ),
    ]);
    assert.match(new TextDecoder().decode(event.value), /event: update/);
    const inbox = await api(
      `/api/messages?conversationId=user:${a.data.user.id}`,
      b.cookie,
    );
    assert.equal(inbox.data.messages[0].text, "Halo dari Ayu!");
    assert.equal(inbox.data.messages[0].mine, false);

    const group = await api("/api/messages", b.cookie, "POST", {
      conversationId: "group:general",
      text: "Halo grup!",
    });
    assert.equal(group.response.status, 201);
    const groupInbox = await api(
      "/api/messages?conversationId=group:general",
      a.cookie,
    );
    assert.equal(groupInbox.data.messages[0].senderName, "Bima");
    assert.equal(
      (
        await api("/api/messages", a.cookie, "POST", {
          conversationId: "user:unknown",
          text: "x",
        })
      ).response.status,
      404,
    );
    assert.equal((await fetch(base + "/data/store.json")).status, 404);
    assert.ok(
      fs
        .readFileSync(path.join(sandbox, "data/store.json"), "utf8")
        .includes("Halo dari Ayu!"),
    );
    assert.ok(
      !fs
        .readFileSync(path.join(sandbox, "data/store.json"), "utf8")
        .includes("password123"),
    );
  } finally {
    eventController?.abort();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
});
