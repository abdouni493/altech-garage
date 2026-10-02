// ===== Altech Garage — local application server =====
//
// Serves the built front-end and the database API from a single origin, so the
// whole app runs from one URL with no external service to install.
//
//   GET    /api/health     liveness probe (used by the launcher)
//   GET    /api/db         the full database document
//   PUT    /api/db         replace the database document
//   POST   /api/db/reset   wipe back to an empty database

import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { openDatabase } from "./db.js";

const ROOT = resolve(fileURLToPath(new URL("../", import.meta.url)));
const DIST = join(ROOT, "dist");
const PORT = Number(process.env.PORT) || 5180;
const HOST = process.env.HOST || "127.0.0.1";
const DB_FILE = process.env.GARAGE_DB || join(ROOT, "data", "garage.db");
const MAX_BODY = 64 * 1024 * 1024; // logos are stored inline as data URLs

const db = openDatabase(DB_FILE);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
};

const sendJSON = (res, status, payload) => {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error("Corps de requête trop volumineux"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : null);
      } catch {
        reject(new Error("JSON invalide"));
      }
    });
    req.on("error", reject);
  });

async function handleApi(req, res, pathname) {
  if (pathname === "/api/health") {
    return sendJSON(res, 200, { ok: true, db: db.file });
  }

  if (pathname === "/api/db") {
    if (req.method === "GET") {
      return sendJSON(res, 200, db.read());
    }
    // POST is accepted alongside PUT because navigator.sendBeacon — used to
    // flush pending edits when the tab closes — can only issue POST.
    if (req.method === "PUT" || req.method === "POST") {
      const doc = await readBody(req);
      if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
        return sendJSON(res, 400, { error: "Document de base de données invalide" });
      }
      db.write(doc);
      return sendJSON(res, 200, { ok: true });
    }
    return sendJSON(res, 405, { error: "Méthode non autorisée" });
  }

  if (pathname === "/api/db/reset" && req.method === "POST") {
    return sendJSON(res, 200, db.reset());
  }

  return sendJSON(res, 404, { error: "Route introuvable" });
}

async function serveStatic(res, pathname) {
  if (!existsSync(DIST)) {
    res.writeHead(503, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(
      `<h1>Application non compilée</h1><p>Lancez <code>npm run build</code> puis rechargez cette page.</p>`
    );
  }

  // Resolve inside dist only — never let a crafted path escape the served folder
  const rel = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, "");
  let file = join(DIST, rel);
  if (!file.startsWith(DIST)) file = join(DIST, "index.html");

  try {
    const info = await stat(file);
    if (info.isDirectory()) file = join(file, "index.html");
  } catch {
    file = join(DIST, "index.html"); // SPA fallback
  }

  try {
    const data = await readFile(file);
    const ext = extname(file).toLowerCase();
    const immutable = file.includes(join(DIST, "assets"));
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Content-Length": data.length,
      "Cache-Control": immutable ? "public, max-age=31536000, immutable" : "no-cache",
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Fichier introuvable");
  }
}

const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, `http://${req.headers.host || "localhost"}`).pathname;
  try {
    if (pathname.startsWith("/api/")) return await handleApi(req, res, pathname);
    if (req.method !== "GET" && req.method !== "HEAD") {
      return sendJSON(res, 405, { error: "Méthode non autorisée" });
    }
    await serveStatic(res, pathname);
  } catch (err) {
    console.error("[garage]", err);
    if (!res.headersSent) sendJSON(res, 500, { error: err.message || "Erreur serveur" });
    else res.end();
  }
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n  Le port ${PORT} est déjà utilisé — l'application est probablement déjà lancée.`);
    console.error(`  Ouvrez http://localhost:${PORT} dans votre navigateur.\n`);
    process.exit(2);
  }
  throw err;
});

server.listen(PORT, HOST, () => {
  console.log(`\n  Altech Garage`);
  console.log(`  Application : http://localhost:${PORT}`);
  console.log(`  Base de données : ${DB_FILE}`);
  console.log(`\n  Ctrl+C pour arrêter.\n`);
});

const shutdown = () => { server.close(); db.close(); process.exit(0); };
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
