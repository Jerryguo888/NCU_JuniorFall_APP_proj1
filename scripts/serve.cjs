"use strict";
const http = require("node:http"), fs = require("node:fs"), path = require("node:path");
const root = path.resolve(__dirname, ".."), port = Number(process.env.PORT || 5173);
const files = new Set(["/index.html", "/styles.css", "/config.js", "/favicon.svg", "/src/core.js", "/src/app.js"]);
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml" };
const server = http.createServer((req, res) => {
  let url;
  try { url = new URL(req.url, "http://localhost").pathname; } catch { res.writeHead(400); res.end("Bad request"); return; }
  // A prefix permits testing GitHub Pages project subpaths: /preview/index.html.
  if (url.startsWith("/preview/")) url = url.slice(8);
  if (url === "/") url = "/index.html";
  if (!["GET", "HEAD"].includes(req.method) || !files.has(url)) { res.writeHead(404); res.end("Not found"); return; }
  fs.readFile(path.join(root, url), (err, content) => {
    if (err) { res.writeHead(404); res.end("Not found"); return; }
    res.writeHead(200, { "Content-Type": mime[path.extname(url)] || "application/octet-stream", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    res.end(req.method === "HEAD" ? undefined : content);
  });
});
server.listen(port, "127.0.0.1", () => console.log(`Daylight is ready: http://127.0.0.1:${port}`));
server.on("error", error => { console.error(error.message); process.exitCode = 1; });
