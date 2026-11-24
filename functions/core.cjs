(function (root) {
  "use strict";
  const CATEGORIES = { study: "學習", work: "工作", life: "生活", personal: "個人" };
  const PRIORITIES = { high: "重要", medium: "一般", low: "不急" };
  const pad = n => String(n).padStart(2, "0");
  const dateKey = (value = new Date()) => {
    const d = typeof value === "string" ? new Date(value + "T12:00:00") : value;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const addDays = (key, n) => { const d = new Date(key + "T12:00:00"); d.setDate(d.getDate() + n); return dateKey(d); };
  const weekDates = key => { const d = new Date(key + "T12:00:00"); const start = addDays(key, -((d.getDay() + 6) % 7)); return Array.from({ length: 7 }, (_, i) => addDays(start, i)); };
  const validDate = key => typeof key === "string" && /^\d{4}-\d{2}-\d{2}$/.test(key) && dateKey(key) === key;
  const validTime = time => typeof time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
  const minutes = time => { const [h, m] = time.split(":").map(Number); return h * 60 + m; };
  const timeString = total => `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
  const duration = item => item.kind === "event" ? minutes(item.end) - minutes(item.start) : 0;
  const uid = () => typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  function validateItem(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("事項格式不正確。");
    if (!["event", "task"].includes(input.kind)) throw new Error("請選擇行程或任務。");
    if (typeof input.title !== "string" || !input.title.trim() || input.title.trim().length > 100) throw new Error("請填寫名稱，最多 100 個字。");
    if (!validDate(input.date)) throw new Error("請填寫有效日期。");
    if (!Object.hasOwn(CATEGORIES, input.category)) throw new Error("請選擇有效分類。");
    if (typeof input.notes !== "string" || input.notes.length > 1000) throw new Error("備註最多 1,000 個字。");
    const item = { kind: input.kind, title: input.title.trim(), date: input.date, category: input.category, notes: input.notes, completed: input.completed === true, demo: input.demo === true };
    if (input.kind === "event") {
      if (!validTime(input.start) || !validTime(input.end)) throw new Error("請填寫有效的開始及結束時間。");
      if (input.end <= input.start) throw new Error("結束時間必須晚於開始時間。跨日行程請拆為兩筆。");
      if (typeof input.location !== "string" || input.location.length > 120) throw new Error("地點最多 120 個字。");
      Object.assign(item, { start: input.start, end: input.end, location: input.location });
    } else {
      if (!Object.hasOwn(PRIORITIES, input.priority)) throw new Error("請選擇有效的優先順序。");
      item.priority = input.priority;
    }
    return item;
  }
  const conflicts = (item, items) => item.kind !== "event" ? [] : items.filter(other => other.kind === "event" && other.id !== item.id && !other.completed && other.date === item.date && other.start < item.end && other.end > item.start);
  function conflictPairs(items, date) {
    const events = items.filter(i => i.kind === "event" && i.date === date && !i.completed).sort((a, b) => a.start.localeCompare(b.start));
    const pairs = [];
    events.forEach((a, x) => events.slice(x + 1).forEach(b => { if (a.start < b.end && a.end > b.start) pairs.push([a, b]); }));
    return pairs;
  }
  function freeSlots(items, date, from = 9 * 60, to = 21 * 60) {
    const events = items.filter(i => i.kind === "event" && i.date === date && !i.completed).sort((a, b) => a.start.localeCompare(b.start));
    const slots = []; let cursor = from;
    for (const item of events) {
      const start = Math.max(from, minutes(item.start)), end = Math.min(to, minutes(item.end));
      if (end <= from || start >= to) continue;
      if (start > cursor) slots.push({ start: cursor, end: start });
      cursor = Math.max(cursor, end);
    }
    if (cursor < to) slots.push({ start: cursor, end: to });
    return slots;
  }
  function localPlan(items, date, prompt, now = new Date()) {
    const tasks = items.filter(i => i.kind === "task" && !i.completed && i.date <= date).sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority]) || a.date.localeCompare(b.date));
    const pairs = conflictPairs(items, date);
    if (/衝突|衝堂/.test(prompt)) return { summary: pairs.length ? `找到 ${pairs.length} 組時間重疊：\n${pairs.map(([a, b]) => `「${a.title}」與「${b.title}」`).join("\n")}\n可以編輯其中一筆，移到空白時段。` : "這一天沒有行程重疊。記得在行程之間留一點休息時間。", suggestions: [] };
    if (/本週|重點|整理/.test(prompt)) {
      const last = weekDates(date)[6];
      const list = items.filter(i => i.kind === "task" && !i.completed && i.date <= last).sort((a, b) => a.date.localeCompare(b.date));
      return { summary: list.length ? `本週結束前有 ${list.length} 件待辦（含逾期）：\n${list.slice(0, 12).map(t => `${t.date} · ${t.title}（${PRIORITIES[t.priority]}）`).join("\n")}\n先處理重要或已逾期的任務，再安排其他小目標。` : "本週目前沒有未完成的任務，可以安心留點時間給自己。", suggestions: [] };
    }
    let start = 9 * 60;
    if (date === dateKey(now)) start = Math.max(start, Math.ceil((now.getHours() * 60 + now.getMinutes()) / 15) * 15);
    const slots = freeSlots(items, date, start, 21 * 60);
    const suggestions = [];
    for (const task of tasks.slice(0, 6)) {
      const slot = slots.find(s => s.end - s.start >= 30);
      if (!slot) break;
      suggestions.push({ title: task.title, date, start: timeString(slot.start), end: timeString(slot.start + 30), category: task.category, notes: "由本機規劃工具建議。完成行程後，請自行勾選原任務。", sourceTaskId: task.id });
      slot.start += 40;
    }
    const suffix = pairs.length ? `另有 ${pairs.length} 組行程重疊，建議先調整。` : "每件任務預留 30 分鐘，任務之間盡量保留 10 分鐘休息。";
    return { summary: !tasks.length ? "目前沒有到期的未完成任務。先新增一個任務，再一起安排吧。" : suggestions.length ? `依優先順序找到 ${suggestions.length} 個可用時段。${suffix}\n本機工具目前使用固定規則；自由文字的時間條件需連接 Gemini 才能理解。` : "今天 09:00–21:00 已沒有足夠的未來空檔。可以改選其他日期，或先調整現有行程。", suggestions };
  }
  function seedItems(today = dateKey()) {
    const make = (item, n) => ({ ...item, id: `demo-${today}-${n}`, demo: true, completed: false, notes: "這是可編輯的示範資料。你可以在資料與設定中移除。", updatedAt: Date.now() });
    return [
      make({ kind: "event", title: "設計思考與行動 APP", date: today, start: "09:00", end: "11:00", category: "study", location: "綜教館 203" }, 1),
      make({ kind: "event", title: "和同學一起吃午餐", date: today, start: "12:00", end: "13:00", category: "life", location: "學校附近" }, 2),
      make({ kind: "event", title: "Project A 專案時間", date: today, start: "14:00", end: "15:30", category: "work", location: "圖書館 2F" }, 3),
      make({ kind: "task", title: "完成 APP 的功能測試", date: today, priority: "high", category: "study" }, 4),
      make({ kind: "task", title: "整理這週的課堂筆記", date: today, priority: "medium", category: "study" }, 5),
      { ...make({ kind: "task", title: "出門前，記得帶水壺", date: today, priority: "low", category: "life" }, 6), completed: true },
      make({ kind: "event", title: "散步，讓腦袋休息一下", date: addDays(today, 1), start: "17:00", end: "17:45", category: "personal", location: "校園" }, 7)
    ];
  }
  function parseBackup(text) {
    const backup = JSON.parse(text);
    if (!backup || backup.app !== "daylight" || backup.version !== 1 || !Array.isArray(backup.items) || backup.items.length > 400) throw new Error("請選擇有效的 Daylight 備份，單次最多 400 筆。");
    const ids = new Set();
    return backup.items.map(raw => {
      if (typeof raw.id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(raw.id) || ids.has(raw.id)) throw new Error("備份包含無效或重複的事項編號。");
      ids.add(raw.id);
      return { ...validateItem(raw), id: raw.id, updatedAt: Date.now() };
    });
  }
  const api = { CATEGORIES, PRIORITIES, dateKey, addDays, weekDates, validDate, validTime, minutes, timeString, duration, uid, validateItem, conflicts, conflictPairs, freeSlots, localPlan, seedItems, parseBackup };
  root.DaylightCore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
