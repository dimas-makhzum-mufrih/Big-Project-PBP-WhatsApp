"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { promisify } = require("node:util");

const scrypt = promisify(crypto.scrypt);
const root = __dirname;
const dataDir = path.join(root, "data");
const dataFile = path.join(dataDir, "store.json");
const sessionLifetime = 7 * 24 * 60 * 60 * 1000;
const sessions = new Map();
const clients = new Set();
const timeFormatter = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

fs.mkdirSync(dataDir, { recursive: true });
const store = fs.existsSync(dataFile)
  ? JSON.parse(fs.readFileSync(dataFile, "utf8"))
  : { users: [], messages: [] };
if (!Array.isArray(store.users) || !Array.isArray(store.messages)) {
  throw new Error("Invalid data/store.json");
}

function persist() {
  const temporary = path.join(
    dataDir,
    `store-${process.pid}-${crypto.randomUUID()}.tmp`,
  );
  try {
    fs.writeFileSync(temporary, JSON.stringify(store), { mode: 0o600 });
    fs.renameSync(temporary, dataFile);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function error(status, message) {
  const result = new Error(message);
  result.status = status;
  return result;
}

function json(res, status, value, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...headers,
  });
  res.end(JSON.stringify(value));
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

function cookie(req, token, maxAge) {
  return `session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${req.socket.encrypted ? "; Secure" : ""}`;
}

function currentSession(req) {
  const match = /(?:^|;\s*)session=([a-f0-9]{64})(?:;|$)/.exec(
    req.headers.cookie || "",
  );
  const token = match?.[1];
  const session = sessions.get(token);
  if (session && session.expires <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  const user =
    session && store.users.find((item) => item.id === session.userId);
  return user ? { token, user } : null;
}

function requireSession(req) {
  const session = currentSession(req);
  if (!session) throw error(401, "Authentication required");
  return session;
}

function createSession(req, res, user) {
  const previous = currentSession(req);
  if (previous) sessions.delete(previous.token);
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, {
    userId: user.id,
    expires: Date.now() + sessionLifetime,
  });
  res.setHeader("Set-Cookie", cookie(req, token, sessionLifetime / 1000));
}

async function body(req) {
  if (
    !/^application\/json(?:\s*;|\s*$)/i.test(req.headers["content-type"] || "")
  )
    throw error(415, "Expected application/json");
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16 * 1024) throw error(413, "Request body too large");
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || Array.isArray(value) || typeof value !== "object")
      throw new Error("Invalid object");
    return value;
  } catch {
    throw error(400, "Invalid JSON object");
  }
}

function conversationId(id, userId) {
  if (id === "group:general") return id;
  if (typeof id !== "string" || !id.startsWith("user:"))
    throw error(404, "Conversation not found");
  const otherId = id.slice(5);
  if (otherId === userId || !store.users.some((user) => user.id === otherId))
    throw error(404, "Conversation not found");
  return `direct:${[userId, otherId].sort().join(":")}`;
}

function formatMessage(message, userId) {
  return {
    id: message.id,
    mine: message.senderId === userId,
    text: message.text,
    time: timeFormatter.format(new Date(message.createdAt)).replace(":", "."),
    senderName:
      store.users.find((user) => user.id === message.senderId)?.name ||
      "Unknown",
  };
}

function initials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function conversations(userId) {
  const entries = [
    {
      id: "group:general",
      name: "General",
      initials: "GE",
      type: "group",
      status: `Grup · ${store.users.length} anggota`,
    },
    ...store.users
      .filter((user) => user.id !== userId)
      .map((user) => ({
        id: `user:${user.id}`,
        name: user.name,
        initials: initials(user.name),
        type: "contact",
        status: "Kontak",
      })),
  ];
  return entries.map((entry) => {
    const key = conversationId(entry.id, userId);
    const last = store.messages.findLast(
      (message) => message.conversationId === key,
    );
    return {
      ...entry,
      preview: last
        ? entry.type === "group"
          ? `${formatMessage(last, userId).senderName}: ${last.text}`
          : last.text
        : "",
      time: last ? formatMessage(last, userId).time : "",
    };
  });
}

function notify(conversation) {
  const event = `event: update\ndata: ${JSON.stringify(conversation)}\n\n`;
  for (const client of clients) {
    if (
      !sessions.has(client.session.token) ||
      sessions.get(client.session.token).expires <= Date.now()
    ) {
      client.res.end();
      clients.delete(client);
    } else if (
      !conversation.conversationId ||
      conversation.conversationId === "group:general" ||
      conversation.userIds?.includes(client.session.user.id)
    ) {
      client.res.write(event);
    }
  }
}

async function api(req, res, pathname, search) {
  const methods = {
    "/api/register": "POST",
    "/api/login": "POST",
    "/api/me": "GET",
    "/api/logout": "POST",
    "/api/conversations": "GET",
    "/api/messages": "GET, POST",
    "/api/events": "GET",
  };
  if (!methods[pathname]) throw error(404, "API endpoint not found");
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Methods": `${methods[pathname]}, OPTIONS`,
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "600",
    });
    res.end();
    return;
  }
  if (!methods[pathname].split(", ").includes(req.method)) {
    json(
      res,
      405,
      { error: "Method not allowed" },
      { Allow: methods[pathname] },
    );
    return;
  }

  if (pathname === "/api/register" || pathname === "/api/login") {
    const input = await body(req);
    if (pathname === "/api/register") {
      const name = typeof input.name === "string" ? input.name.trim() : "";
      const email =
        typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
      if (
        !name ||
        name.length > 80 ||
        /[\x00-\x1f\x7f]/.test(name) ||
        email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        typeof input.password !== "string" ||
        input.password.length < 8 ||
        input.password.length > 1024
      ) {
        throw error(
          400,
          "Invalid name, email, or password (password must be 8–1024 characters)",
        );
      }
      if (store.users.some((user) => user.email === email))
        throw error(409, "Email already registered");
      const salt = crypto.randomBytes(16).toString("hex");
      const hash = (await scrypt(input.password, salt, 64)).toString("hex");
      if (store.users.some((user) => user.email === email))
        throw error(409, "Email already registered");
      const user = { id: crypto.randomUUID(), name, email, salt, hash };
      store.users.push(user);
      try {
        persist();
      } catch (err) {
        store.users.pop();
        throw err;
      }
      createSession(req, res, user);
      json(res, 201, { user: publicUser(user) });
      notify({ type: "register" });
      return;
    }
    const email =
      typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    const user = store.users.find((item) => item.email === email);
    if (
      !user ||
      typeof input.password !== "string" ||
      input.password.length > 1024
    )
      throw error(401, "Invalid credentials");
    const hash = await scrypt(input.password, user.salt, 64);
    if (!crypto.timingSafeEqual(hash, Buffer.from(user.hash, "hex")))
      throw error(401, "Invalid credentials");
    createSession(req, res, user);
    json(res, 200, { user: publicUser(user) });
    return;
  }

  const session = requireSession(req);
  if (pathname === "/api/me")
    return json(res, 200, { user: publicUser(session.user) });
  if (pathname === "/api/logout") {
    sessions.delete(session.token);
    res.setHeader("Set-Cookie", cookie(req, "", 0));
    json(res, 200, {});
    return;
  }
  if (pathname === "/api/conversations")
    return json(res, 200, { conversations: conversations(session.user.id) });
  if (pathname === "/api/messages") {
    if (req.method === "GET") {
      const id = search.get("conversationId");
      const key = conversationId(id, session.user.id);
      return json(res, 200, {
        messages: store.messages
          .filter((message) => message.conversationId === key)
          .map((message) => formatMessage(message, session.user.id)),
      });
    }
    const input = await body(req);
    const key = conversationId(input.conversationId, session.user.id);
    if (
      typeof input.text !== "string" ||
      !input.text.trim() ||
      input.text.length > 4000
    )
      throw error(400, "Message text must be 1–4000 characters");
    const message = {
      id: crypto.randomUUID(),
      conversationId: key,
      senderId: session.user.id,
      text: input.text.trim(),
      createdAt: new Date().toISOString(),
    };
    store.messages.push(message);
    try {
      persist();
    } catch (err) {
      store.messages.pop();
      throw err;
    }
    json(res, 201, { message: formatMessage(message, session.user.id) });
    const userIds = key.startsWith("direct:")
      ? key.slice(7).split(":")
      : undefined;
    notify({ type: "message", conversationId: input.conversationId, userIds });
    return;
  }
  if (pathname === "/api/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Content-Type-Options": "nosniff",
    });
    res.write(": connected\n\n");
    const client = { res, session };
    clients.add(client);
    const heartbeat = setInterval(() => {
      if (
        sessions.get(session.token)?.expires <= Date.now() ||
        !sessions.has(session.token)
      )
        res.end();
      else res.write(": heartbeat\n\n");
    }, 25000);
    res.on("close", () => {
      clearInterval(heartbeat);
      clients.delete(client);
    });
  }
}

function staticFile(req, res, pathname) {
  if (req.method !== "GET" && req.method !== "HEAD")
    throw error(405, "Method not allowed");
  const relative = pathname === "/" ? "/index.html" : pathname;
  if (
    relative !== "/index.html" &&
    !relative.startsWith("/pages/") &&
    !relative.startsWith("/assets/")
  )
    throw error(404, "Not found");
  const parts = relative.slice(1).split("/");
  if (
    parts.some(
      (part) =>
        !part ||
        part === "." ||
        part === ".." ||
        part.includes("\\") ||
        part.includes("\0"),
    )
  )
    throw error(404, "Not found");
  const filename = path.join(root, ...parts);
  const extension = path.extname(filename).toLowerCase();
  if (!types[extension] || (parts[0] === "pages" && extension !== ".html"))
    throw error(404, "Not found");
  let real;
  try {
    real = fs.realpathSync(filename);
  } catch (err) {
    if (err.code === "ENOENT") throw error(404, "Not found");
    throw err;
  }
  const allowed = path.join(
    root,
    parts[0] === "assets"
      ? "assets"
      : parts[0] === "pages"
        ? "pages"
        : "index.html",
  );
  if (real !== allowed && !real.startsWith(allowed + path.sep))
    throw error(404, "Not found");
  const stat = fs.statSync(real);
  if (!stat.isFile()) throw error(404, "Not found");
  res.writeHead(200, {
    "Content-Type": types[extension],
    "Content-Length": stat.size,
    "X-Content-Type-Options": "nosniff",
  });
  if (req.method === "HEAD") res.end();
  else fs.createReadStream(real).pipe(res);
}

const server = http.createServer((req, res) => {
  (async () => {
    let pathname;
    try {
      pathname = decodeURIComponent((req.url || "").split("?")[0]);
    } catch {
      throw error(400, "Invalid URL");
    }
    if (
      !pathname.startsWith("/") ||
      pathname.includes("\\") ||
      pathname.includes("\0") ||
      pathname.split("/").includes("..")
    )
      throw error(404, "Not found");
    if (pathname.startsWith("/api/")) {
      // Wildcard CORS hanya untuk request tanpa kredensial lintas origin.
      res.setHeader("Access-Control-Allow-Origin", "*");
      const search = new URL(req.url, "http://localhost").searchParams;
      await api(req, res, pathname, search);
    } else staticFile(req, res, pathname);
  })().catch((err) => {
    if (!res.headersSent)
      json(res, err.status || 500, {
        error: err.status ? err.message : "Internal server error",
      });
    else res.destroy();
    if (!err.status) console.error(err);
  });
});

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("Invalid PORT");
  server.listen(port, () =>
    console.log(`Listening on http://localhost:${port}`),
  );
}

module.exports = server;
