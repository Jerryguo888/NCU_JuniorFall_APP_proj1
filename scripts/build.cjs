"use strict";
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const target = path.join(root, "dist");
let html = fs.readFileSync(path.join(root, "index.html"), "utf8");
fs.mkdirSync(target, { recursive: true });
for (const name of ["styles.css", "config.js", "favicon.svg", "src/core.js", "src/firebase-ai.js", "src/app.js"]) {
  const content = fs.readFileSync(path.join(root, name));
  const version = createHash("sha256").update(content).digest("hex").slice(0, 12);
  const dest = path.join(target, name);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content);
  html = html.replaceAll(`"./${name}"`, `"./${name}?v=${version}"`);
}
fs.writeFileSync(path.join(target, "index.html"), html);
fs.writeFileSync(path.join(target, ".nojekyll"), "");
console.log("Built static frontend in dist/. No server secrets or backend files included.");
