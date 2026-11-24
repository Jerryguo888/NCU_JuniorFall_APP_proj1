"use strict";
const fs = require("node:fs"), path = require("node:path");
const root = path.resolve(__dirname, "..");
fs.copyFileSync(path.join(root, "src/core.js"), path.join(root, "functions/core.cjs"));
console.log("Shared validation prepared for Firebase Functions.");
