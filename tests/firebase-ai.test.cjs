"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../src/core.js");
const { planningContext, prepareReply } = require("../src/firebase-ai.js");

test("the Gemini planner omits private event and task fields from the schedule context", () => {
  const items = [
    { kind: "event", id: "evt", date: "2026-11-24", start: "10:00", end: "11:00", title: "Private event", location: "Private place" },
    { kind: "event", id: "other", date: "2026-12-01", start: "12:00", end: "13:00" },
    { kind: "task", id: "task", date: "2026-11-24", title: "Private task", category: "study", priority: "high" },
    { kind: "task", id: "past", date: "2026-11-23", completed: true }
  ];
  const { busy, taskMetadata, tasks } = planningContext(C, items, "2026-11-24");
  assert.deepEqual(busy, [{ date: "2026-11-24", start: "10:00", end: "11:00" }]);
  assert.deepEqual(taskMetadata, [{ ref: "T1", date: "2026-11-24", category: "study", priority: "high" }]);
  assert.deepEqual(tasks, [items[2]]);
});

test("Gemini suggestions restore task names locally and reject overlaps, stale times and unknown tasks", () => {
  const date = "2026-11-24";
  const items = [{ kind: "event", id: "busy", date, start: "11:00", end: "12:00" }];
  const tasks = [{ id: "task", title: "準備報告", category: "study" }];
  const suggestion = (taskRef, start, end) => ({ taskRef, start, end, title: "專注時間", category: "personal" });
  const reply = prepareReply(C, { summary: "試試看以下時段", suggestions: [
    suggestion("T1", "10:00", "10:30"),
    suggestion("", "11:30", "12:15"),
    suggestion("", "08:00", "09:00"),
    suggestion("T9", "13:00", "14:00"),
    suggestion("", "10:15", "10:45")
  ] }, date, items, tasks, new Date("2026-11-24T01:30:00Z"));
  assert.equal(reply.suggestions.length, 1);
  assert.equal(reply.suggestions[0].title, "準備報告");
  assert.equal(reply.suggestions[0].category, "study");
  assert.match(reply.summary, /部分建議/);
});
