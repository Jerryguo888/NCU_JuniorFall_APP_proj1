"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const C = require("../src/core.js");
const P = require("../functions/planner.cjs");
const event = (id, start, end, extra = {}) => ({ id, kind: "event", title: "課程", date: "2026-11-20", category: "study", notes: "", location: "", completed: false, start, end, ...extra });
const task = (id, extra = {}) => ({ id, kind: "task", title: "完成報告", date: "2026-11-20", category: "study", notes: "", priority: "high", completed: false, ...extra });

test("calendar arithmetic crosses month/year boundaries and preserves Monday weeks", () => {
  assert.equal(C.addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(C.addDays("2028-02-28", 1), "2028-02-29");
  assert.deepEqual(C.weekDates("2027-01-03"), ["2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03"]);
  assert.equal(C.validDate("2026-02-29"), false);
  assert.equal(C.validDate("2026-11-31"), false);
  assert.equal(C.validDate("2028-02-29"), true);
});

test("validation rejects invalid and overnight events and removes untrusted extra fields", () => {
  assert.throws(() => C.validateItem(event("a", "18:00", "17:00")), /晚於/);
  assert.throws(() => C.validateItem(event("a", "09:00", "09:00")), /晚於/);
  assert.throws(() => C.validateItem(event("a", "25:00", "26:00")), /有效/);
  assert.throws(() => C.validateItem(task("a", { title: "  " })), /名稱/);
  assert.throws(() => C.validateItem(task("a", { category: "__proto__" })), /分類/);
  assert.equal(C.validateItem(task("a", { admin: true })).admin, undefined);
});

test("adjacent events do not conflict, overlapping events do, edits exclude themselves", () => {
  const items = [event("a", "09:00", "10:00"), event("b", "10:00", "11:00")];
  assert.deepEqual(C.conflicts(items[0], items), []);
  assert.deepEqual(C.conflicts(event("c", "09:30", "10:30"), items).map(i => i.id), ["a", "b"]);
  assert.deepEqual(C.conflicts(event("c", "09:30", "10:30"), items.map(i => ({ ...i, completed: true }))), []);
  assert.deepEqual(C.conflicts(event("c", "09:30", "10:30", { date: "2026-11-21" }), items), []);
});

test("free slots merge overlapping and contained events without double-counting gaps", () => {
  const items = [event("a", "08:00", "10:00"), event("b", "09:00", "11:00"), event("c", "09:30", "10:00"), event("d", "12:00", "13:00")];
  assert.deepEqual(C.freeSlots(items, "2026-11-20", 540, 840), [{ start: 660, end: 720 }, { start: 780, end: 840 }]);
});

test("local planning prioritizes due work and never schedules inside busy or past slots", () => {
  const items = [task("low", { priority: "low" }), task("high"), task("future", { date: "2026-11-21" }), event("busy", "14:00", "15:00")];
  const plan = C.localPlan(items, "2026-11-20", "安排", new Date("2026-11-20T13:35:00"));
  assert.equal(plan.suggestions[0].title, "完成報告");
  assert.equal(plan.suggestions[0].sourceTaskId, "high");
  assert.equal(plan.suggestions[0].start, "15:00");
  assert.equal(plan.suggestions.length, 2);
  assert.equal(plan.suggestions[1].start, "15:40");
  assert.equal(C.localPlan(items, "2026-11-20", "安排", new Date("2026-11-20T21:01:00")).suggestions.length, 0);
});

test("local conflict and weekly summaries answer with actual records without writing", () => {
  const items = [event("a", "09:00", "10:30"), event("b", "10:00", "11:00"), task("a"), task("b", { completed: true })];
  const original = structuredClone(items);
  assert.match(C.localPlan(items, "2026-11-20", "檢查衝突").summary, /1 組/);
  assert.match(C.localPlan(items, "2026-11-20", "本週重點").summary, /1 件/);
  assert.deepEqual(items, original);
});

test("backup import validates every item and rejects duplicate ids, paths and invalid dates", () => {
  const backup = items => JSON.stringify({ app: "daylight", version: 1, items });
  assert.equal(C.parseBackup(backup([task("valid-123")])).length, 1);
  assert.throws(() => C.parseBackup(backup([task("a"), task("a")])));
  assert.throws(() => C.parseBackup(backup([task("../other-user")])));
  assert.throws(() => C.parseBackup(backup([task("a", { date: "2026-02-30" })])));
  assert.throws(() => C.parseBackup('{"items":[]}'));
});

test("AI requests enforce size/date bounds and include only relevant limited context", () => {
  assert.throws(() => P.validateRequest({ prompt: "", date: "2026-11-20" }));
  assert.throws(() => P.validateRequest({ prompt: "a".repeat(2001), date: "2026-11-20" }));
  assert.throws(() => P.validateRequest({ prompt: "安排", date: "2026-02-30" }));
  const data = P.validateRequest({ prompt: "安排", date: "2026-11-20", uid: "another-user" });
  assert.equal(data.uid, undefined);
  const body = P.makeBody(data, [task("a", { notes: "private-note" }), event("b", "12:00", "13:00", { location: "private-location" })]);
  assert.ok(!JSON.stringify(body).includes("private-note"));
  assert.ok(!JSON.stringify(body).includes("private-location"));
  assert.match(body.contents[0].parts[0].text, /完成報告/);
});

test("server filters overlapping, cross-date, past and malformed model suggestions", () => {
  const suggestions = [event("a", "14:00", "14:30"), event("b", "14:15", "14:45"), event("c", "15:00", "16:00"), event("d", "17:00", "18:00", { date: "2026-11-21" }), event("e", "11:00", "12:00"), event("f", "25:00", "26:00")];
  const result = P.sanitizePlan({ summary: "你的安排", suggestions }, "2026-11-20", [event("busy", "15:30", "16:30")], new Date("2026-11-20T05:00:00Z"));
  assert.equal(result.suggestions.length, 1);
  assert.equal(result.suggestions[0].start, "14:00");
  assert.match(result.summary, /移除 5 筆/);
  assert.throws(() => P.sanitizePlan({ summary: "hello", suggestions: "not-an-array" }, "2026-11-20", []));
});

test("all seeded records survive validation and backup round trips", () => {
  const items = C.seedItems("2026-11-20");
  items.forEach(C.validateItem);
  assert.equal(items.filter(i => i.kind === "event" && i.date === "2026-11-20").length, 3);
  assert.equal(items.filter(i => i.kind === "task").length, 3);
  assert.equal(C.parseBackup(JSON.stringify({ app: "daylight", version: 1, items })).length, 7);
});
