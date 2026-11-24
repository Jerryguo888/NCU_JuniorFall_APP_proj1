"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const installed = fs.existsSync(require("node:path").join(__dirname, "../functions/node_modules/firebase-functions"));
const fn = installed ? require("../functions/index.js").planDay : null;

test("callable rejects unauthenticated requests before touching data or Gemini", { skip: !installed }, async () => {
  await assert.rejects(fn.run({ auth: null, data: { prompt: "安排", date: "2026-11-20" } }), error => error.code === "unauthenticated");
});

test("callable rejects invalid authenticated input before touching data or Gemini", { skip: !installed }, async () => {
  await assert.rejects(fn.run({ auth: { uid: "test-user" }, data: { prompt: "安排", date: "2026-02-31" } }), error => error.code === "invalid-argument");
});
