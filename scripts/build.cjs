"use strict";
const fs = require("node:fs"), path = require("node:path");
const root = path.resolve(__dirname, ".."), target = path.join(root, "dist");
fs.mkdirSync(target, { recursive: true });
for (const name of ["index.html", "styles.css", "config.js", "favicon.svg", "src/core.js", "src/firebase-ai.js", "src/app.js"]) {
  const dest = path.join(target, name); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(path.join(root, name), dest);
}
fs.writeFileSync(path.join(target, ".nojekyll"), "");
console.log("Built static frontend in dist/. No server secrets or backend files included.");
