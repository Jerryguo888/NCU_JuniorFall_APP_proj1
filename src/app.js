(function () {
  "use strict";
  const C = window.DaylightCore;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const shapes = {
    send: '<path d="M12 19V5m-6 6 6-6 6 6"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 11h18m-13 4h2m4 0h2m-8 3h2"/>',
    checklist: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="m8 8 1 1 2-2m3 1h2m-8 5 1 1 2-2m3 1h2m-8 5h8"/>',
    sparkles: '<path d="m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6L12 3ZM20 2v4m-2-2h4M4 18v4m-2-2h4"/>',
    "chevron-left": '<path d="m14 6-6 6 6 6"/>', "chevron-right": '<path d="m10 6 6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    settings: '<path d="m9 3-.7 2.3-2 .9L4 5.7l-2 3.5 1.8 1.7v2.2L2 14.8l2 3.5 2.3-.5 2 .9L9 21h4l.7-2.3 2-.9 2.3.5 2-3.5-1.8-1.7v-2.2L20 9.2l-2-3.5-2.3.5-2-.9L13 3H9Z"/><circle cx="11" cy="12" r="3"/>',
    leaf: '<path d="M20 4C9 2 3 7 5 14s15 8 15-10Z"/><path d="M4 21 16 9m-6 6v-5m0 5h5"/>',
    cloud: '<path d="M7 18H6a4 4 0 1 1 .6-7.9A6 6 0 0 1 18 8a5 5 0 0 1 0 10h-1m-5-5v8m-3-3 3 3 3-3"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-9v.1"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    edit: '<path d="m16 3 5 5M4 20l5-1L21 7a2.1 2.1 0 0 0-5-3L4 16v4Z"/>',
    x: '<path d="m6 6 12 12M6 18 18 6"/>', download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4"/>',
    upload: '<path d="M12 16V4m-4 4 4-4 4 4M4 16v4h16v-4"/>',
    shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
    coffee: '<path d="M4 8h12v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Zm12 1h2a3 3 0 0 1 0 6h-2M8 3v2m4-2v2M2 22h18"/>'
  };
  const icon = name => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name] || shapes.calendar}</svg>`;
  $$('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
  const LOCAL_KEY = "daylight.local.v1";
  let localItems = [], toastTimer, cloud = null, stopSnapshot = null, generation = 0;
  let pickerMonth;
  const usesCloudPlanner = () => Boolean(state.user && cloud?.plan);
  const state = { items: [], date: C.dateKey(), month: C.dateKey().slice(0, 7), view: "day", dayFilter: "pending", taskFilter: "all", sort: "date", search: "", user: null, ready: true, saving: false, aiBusy: false, messages: [], suggestions: [], cloudError: "", authBusy: false };
  function banner(message) { $("#status-banner").textContent = message; $("#status-banner").hidden = !message; }
  function toast(message) { clearTimeout(toastTimer); $("#toast").textContent = message; $("#toast").hidden = false; toastTimer = setTimeout(() => { $("#toast").hidden = true; }, 4500); }
  function loadLocal() {
    try {
      const text = localStorage.getItem(LOCAL_KEY);
      if (text !== null) return C.parseBackup(text);
      const seed = C.seedItems();
      localStorage.setItem(LOCAL_KEY, JSON.stringify({ app: "daylight", version: 1, items: seed }));
      return seed;
    } catch (err) { banner(`無法讀取本機資料：${err.message} 請確認瀏覽器允許儲存資料；原有內容不會被覆寫。`); return []; }
  }
  localItems = loadLocal(); state.items = [...localItems];
  function persistLocal(next) {
    if (next.length > 400) throw new Error("每個空間最多儲存 400 筆事項，請先備份並整理。");
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ app: "daylight", version: 1, items: next }));
    localItems = next; state.items = [...next];
  }
  const matches = i => !state.search || [i.title, i.notes, i.location, C.CATEGORIES[i.category]].join(" ").toLocaleLowerCase().includes(state.search);
  const eventsFor = date => state.items.filter(i => i.kind === "event" && i.date === date && matches(i)).sort((a, b) => a.start.localeCompare(b.start));
  const tasksFor = date => state.items.filter(i => i.kind === "task" && i.date === date && matches(i));
  function formatDate(key, options) { return new Date(key + "T12:00:00").toLocaleDateString("zh-TW", options); }
  function selectDate(key, changeView = false) {
    if (!C.validDate(key)) return;
    state.date = key; state.month = key.slice(0, 7);
    if (changeView) setView("day"); else render();
  }
  function setView(view) {
    if (!["day", "week", "tasks", "assistant"].includes(view)) view = "day";
    state.view = view;
    if (location.hash !== `#${view}`) history.replaceState(null, "", `#${view}`);
    render();
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function empty(title, detail, symbol = "leaf") { return `<div class="empty-state"><span>${icon(symbol)}</span><strong>${esc(title)}</strong><p>${esc(detail)}</p></div>`; }
  function shiftMonth(month, offset) {
    const date = new Date(`${month}-01T12:00:00`);
    date.setMonth(date.getMonth() + offset);
    return C.dateKey(date).slice(0, 7);
  }
  function focusCalendarDay(grid, date) {
    const button = grid.querySelector(`[data-date="${date}"]`);
    if (!button) return;
    grid.querySelector('[tabindex="0"]')?.setAttribute("tabindex", "-1");
    button.tabIndex = 0;
    button.focus({ preventScroll: true });
  }
  function renderMonth(heading, grid, month) {
    const first = `${month}-01`;
    const last = C.addDays(`${shiftMonth(month, 1)}-01`, -1);
    const start = C.weekDates(first)[0];
    const end = C.weekDates(last)[6];
    const activeDate = grid.contains(document.activeElement) ? document.activeElement.dataset.date : null;
    const today = C.dateKey();
    const datesWithItems = new Set(state.items.map(item => item.date));
    let tabDate = state.date.startsWith(month) ? state.date : first;
    if (activeDate && activeDate >= start && activeDate <= end) tabDate = activeDate;
    heading.textContent = formatDate(first, { year: "numeric", month: "long" });
    const days = [];
    for (let date = start; date <= end; date = C.addDays(date, 1)) {
      const isToday = date === today;
      const isSelected = date === state.date;
      const hasItems = datesWithItems.has(date);
      const classes = ["calendar-day"];
      if (!date.startsWith(month)) classes.push("other");
      if (isSelected) classes.push("selected");
      if (isToday) classes.push("is-today");
      if (hasItems) classes.push("has-events");
      const label = `${date}${isToday ? "，今天" : ""}${hasItems ? "，有事項" : ""}`;
      days.push(`<button type="button" data-date="${date}" class="${classes.join(" ")}" aria-label="${label}"
        aria-pressed="${isSelected}"${isToday ? ' aria-current="date"' : ""} tabindex="${date === tabDate ? 0 : -1}">${Number(date.slice(8))}</button>`);
    }
    grid.innerHTML = days.join("");
    if (activeDate) focusCalendarDay(grid, tabDate);
  }
  function renderCalendar() {
    const miniCalendar = $(".mini-calendar");
    miniCalendar.hidden = state.view === "day" || state.view === "assistant";
    if (!miniCalendar.hidden) renderMonth($("#mini-month"), $("#mini-days"), state.month);
    if (state.view === "day") renderMonth($("#day-month"), $("#day-month-days"), state.month);
    if ($("#date-picker").open) renderMonth($("#picker-month"), $("#picker-month-days"), pickerMonth);
    $("#selected-date-title").textContent = formatDate(state.date, { month: "long", day: "numeric", weekday: "long" });
  }
  const calendarArrows = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
  for (const grid of $$("#mini-days, #day-month-days, #picker-month-days")) {
    grid.addEventListener("keydown", event => {
      const date = event.target.dataset.date;
      const offset = calendarArrows[event.key];
      if (!date || !offset) return;
      event.preventDefault();
      const nextDate = C.addDays(date, offset);
      if (!grid.querySelector(`[data-date="${nextDate}"]`)) {
        if (grid.id === "picker-month-days") pickerMonth = nextDate.slice(0, 7);
        else state.month = nextDate.slice(0, 7);
        renderCalendar();
      }
      focusCalendarDay(grid, nextDate);
    });
  }
  function renderStats() {
    const events = state.items.filter(i => i.kind === "event" && i.date === state.date), tasks = state.items.filter(i => i.kind === "task" && i.date === state.date);
    const done = tasks.filter(i => i.completed).length, hours = events.reduce((n, i) => n + C.duration(i), 0) / 60;
    const stats = [
      { symbol: "calendar", label: "當日行程", value: events.length, unit: "個安排", sub: "好好安排，慢慢來", tone: "" },
      { symbol: "checklist", label: "任務進度", value: `${done}<small>/ ${tasks.length}</small>`, unit: "已完成", sub: tasks.length ? `${Math.round(done / tasks.length * 100)}% 完成` : "新的開始", tone: "purple" },
      { symbol: "clock", label: "已安排時間", value: Number(hours.toFixed(1)), unit: "小時", sub: "也記得留點空白", tone: "orange" }
    ];
    $("#day-stats").innerHTML = stats.map(s => `<div class="stat-card"><span class="stat-icon ${s.tone}">${icon(s.symbol)}</span><div><span class="stat-label">${s.label}</span><div class="stat-value">${s.value}<small>${s.unit}</small></div></div><span class="stat-right">${s.sub}</span></div>`).join("");
  }
  function renderAgenda() {
    const events = eventsFor(state.date);
    $("#event-count").textContent = events.length;
    $("#agenda-list").innerHTML = events.length ? events.map(i => {
      const overlap = !i.completed && C.conflicts(i, state.items).length;
      return `<article class="event-row ${i.completed ? "completed-event" : ""}"><div class="event-time">${esc(i.start)}<small>${esc(i.end)}</small></div><div class="event-main ${i.category}"><div class="event-heading"><button type="button" class="event-title" data-edit="${esc(i.id)}">${esc(i.title)}</button><span class="event-badge">${C.CATEGORIES[i.category]}</span></div><div class="event-meta"><span>${icon("clock")}${C.duration(i)} 分鐘</span>${i.location ? `<span>${icon("pin")}${esc(i.location)}</span>` : ""}</div>${overlap ? '<p class="conflict-label">時間與其他行程重疊</p>' : ""}<div class="event-actions"><button type="button" data-toggle="${esc(i.id)}" aria-label="${esc(i.completed ? "取消完成" : "標記完成")} ${esc(i.title)}">${i.completed ? "已完成 · 取消完成" : "標記完成"}</button><button type="button" data-edit="${esc(i.id)}" aria-label="編輯 ${esc(i.title)}">編輯</button></div></div></article>`;
    }).join("") : empty(state.search ? "沒有符合的行程" : "留白，也是好安排。", state.search ? "試著換個關鍵字。" : "新增一個行程，讓重要的事有個位置。", "calendar");
  }
  function taskHTML(item, full = false) {
    const late = !item.completed && item.date < C.dateKey();
    return `<article class="task-row"><button type="button" class="task-check ${item.completed ? "checked" : ""}" role="checkbox" aria-checked="${item.completed}" aria-label="完成任務 ${esc(item.title)}" data-toggle="${esc(item.id)}">${item.completed ? icon("check") : ""}</button><div class="task-copy"><button type="button" class="task-title ${item.completed ? "done" : ""}" data-edit="${esc(item.id)}">${esc(item.title)}</button><div class="task-sub"><span>${C.CATEGORIES[item.category]}</span><span class="${late ? "overdue" : ""}">${full || late ? esc(item.date) : ""}${late ? " · 已逾期" : ""}</span>${item.demo ? '<span>示範</span>' : ""}</div></div><span class="priority ${item.priority}">${C.PRIORITIES[item.priority]}</span>${full ? `<button type="button" class="icon-button" data-edit="${esc(item.id)}" aria-label="編輯 ${esc(item.title)}">${icon("edit")}</button>` : ""}</article>`;
  }
  function renderTasks() {
    const daily = tasksFor(state.date).filter(i => state.dayFilter === "done" ? i.completed : !i.completed);
    $("#task-count").textContent = daily.length;
    $("#today-tasks").innerHTML = daily.length ? daily.map(i => taskHTML(i)).join("") : empty(state.dayFilter === "done" ? "每一步，都算數。" : "暫時沒有待辦。", state.dayFilter === "done" ? "完成一個任務後，會出現在這裡。" : "新增一個小目標，或給自己一點休息。", "checklist");
    const tasks = state.items.filter(i => i.kind === "task" && matches(i));
    const pending = state.items.filter(i => i.kind === "task" && !i.completed).length;
    $("#nav-task-count").textContent = pending;
    const allCount = state.items.filter(i => i.kind === "task").length;
    $("#all-task-summary").textContent = `共 ${allCount} 件任務，${allCount - pending} 件已完成，${pending} 件等你慢慢完成。`;
    const list = tasks.filter(i => state.taskFilter === "all" || (state.taskFilter === "done" ? i.completed : !i.completed));
    list.sort((a, b) => Number(a.completed) - Number(b.completed) || (state.sort === "priority" ? { high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority] : 0) || a.date.localeCompare(b.date) || b.updatedAt - a.updatedAt);
    $("#all-tasks").innerHTML = list.length ? list.map(i => taskHTML(i, true)).join("") : empty("目前沒有符合的任務。", "換個篩選條件，或新增一件想完成的小事。", "checklist");
    $$('[data-day-filter]').forEach(b => b.setAttribute("aria-pressed", String(b.dataset.dayFilter === state.dayFilter)));
    $$('[data-task-filter]').forEach(b => b.setAttribute("aria-pressed", String(b.dataset.taskFilter === state.taskFilter)));
  }
  function renderWeek() {
    const dates = C.weekDates(state.date);
    $("#week-range-title").textContent = `${formatDate(dates[0], { month: "long", day: "numeric" })} — ${formatDate(dates[6], { month: "long", day: "numeric" })}`;
    $("#week-board").innerHTML = dates.map((date, index) => {
      const events = eventsFor(date), tasks = tasksFor(date).filter(i => !i.completed);
      return `<section class="week-column ${date === C.dateKey() ? "is-today" : ""}"><button type="button" class="week-column-head" data-date="${date}" data-open-day="true">週${"一二三四五六日"[index]}<strong>${Number(date.slice(8))}</strong>${date === C.dateKey() ? "今天" : ""}</button>${events.map(i => `<button type="button" class="week-event ${i.category}" data-edit="${esc(i.id)}"><small>${esc(i.start)}–${esc(i.end)}${i.completed ? " · 已完成" : ""}</small>${esc(i.title)}</button>`).join("")}${tasks.map(i => `<button type="button" class="week-task" data-edit="${esc(i.id)}">${esc(i.title)}</button>`).join("")}${!events.length && !tasks.length ? '<p class="week-empty">留點空白</p>' : ""}<button type="button" class="week-add" data-new-date="${date}" aria-label="在 ${date} 新增行程">${icon("plus")}</button></section>`;
    }).join("");
  }
  function renderAccount() {
    const user = state.user;
    $("#user-name").textContent = user ? user.displayName || "我的帳號" : "我的個人空間";
    $("#user-caption").textContent = user ? "Google 帳號 · 管理登入" : "登入後開啟雲端同步";
    const avatar = $("#user-avatar"); avatar.replaceChildren();
    if (user?.photoURL && /^https:\/\//.test(user.photoURL)) { const img = document.createElement("img"); img.src = user.photoURL; img.alt = ""; img.referrerPolicy = "no-referrer"; avatar.append(img); }
    else avatar.textContent = (user?.displayName || "D").slice(0, 1);
    $("#local-mode-note").hidden = !!user || state.view === "assistant";
    $("#connection-title").textContent = user ? state.cloudError ? "雲端連線待處理" : state.ready ? "已連接 Firestore" : "正在讀取雲端" : "本機體驗模式";
    $("#connection-detail").textContent = user ? state.saving ? "正在儲存變更…" : "此帳號的私人資料空間" : "資料保存在此瀏覽器";
    $("#account-status").textContent = user ? `已登入：${user.displayName || user.email || "Google 使用者"}` : cloud ? "Firebase 已連接。登入後即可使用雲端資料庫。" : "尚未連接 Firebase。建立自己的 Firebase 專案，填入 config.js 後即可使用 Google 登入。";
    $("#google-login").hidden = !!user; $("#google-logout").hidden = !user;
    $("#settings-status").textContent = user ? `目前空間：${user.displayName || "Google 帳號"}。${state.cloudError || (state.ready ? "Firestore 已連接。" : "正在載入…")}` : "目前使用本機空間，資料僅保存在此瀏覽器，不會自動上傳。";
    $("#import-local").hidden = !user || !localItems.length;
    $("#ai-mode-label").textContent = usesCloudPlanner() ? "Gemini 規劃" : "本機規劃 · 未連線 Gemini";
    $("#ai-disclaimer").textContent = usesCloudPlanner()
      ? cloud.plannerDisclosure
      : "本機規劃只支援安排待辦、檢查衝突及整理本週重點。";
  }
  function messageHTML(message) {
    const isAssistant = message.role === "assistant";
    const suggestions = (message.suggestions || []).map(suggestion => `
      <div class="suggestion-card">
        <strong>${esc(suggestion.title)}</strong>
        <p>${esc(suggestion.date)} · ${esc(suggestion.start)}–${esc(suggestion.end)} · ${C.CATEGORIES[suggestion.category]}</p>
        <button type="button" class="outline-button" data-suggestion="${suggestion.key}"${suggestion.applied ? " disabled" : ""}>
          ${suggestion.applied ? "已加入行程" : "確認並加入行程"}
        </button>
      </div>`).join("");
    const label = isAssistant ? message.label || "規劃小幫手" : "你";
    const date = message.date ? `<time datetime="${message.date}">${esc(formatDate(message.date, { month: "long", day: "numeric" }))}</time>` : "";
    return `<div class="chat-turn ${message.role}">
      ${isAssistant ? `<span class="chat-avatar">${icon("sparkles")}</span>` : ""}
      <div class="chat-entry">
        <p class="chat-meta"><span>${esc(label)}</span>${date}</p>
        <div class="chat-bubble"><p>${esc(message.text)}</p>${suggestions}</div>
      </div>
    </div>`;
  }

  const greeting = { role: "assistant", text: "想怎麼安排這一天？你可以請我排待辦或檢查行程衝突。" };
  function renderAI() {
    $("#ai-date-label").textContent = formatDate(state.date, { month: "long", day: "numeric" });
    $("#ai-date-button").setAttribute("aria-label", `選擇規劃日期，目前 ${state.date}`);
    const log = $("#ai-messages");
    const scrollPosition = log.scrollTop;
    const messages = [greeting, ...state.messages];
    if (state.aiBusy) messages.push({ role: "assistant", text: "正在整理你的安排…" });
    log.innerHTML = messages.map(messageHTML).join("");
    log.scrollTop = scrollPosition;
    $("#ai-send").disabled = state.aiBusy;
    $("#ai-clear").disabled = state.aiBusy || !state.messages.length;
    $$("[data-prompt]").forEach(b => { b.disabled = state.aiBusy; });
  }
  function render() {
    const titles = { day: ["我的一天", "把時間，留給重要的事。", "一點安排，讓每一天從容一點。"], week: ["本週總覽", "把這一週，過成喜歡的樣子。", "重要的事提早安排，生活就能多一點從容。"], tasks: ["所有任務", "不必一次做完，前進就好。", "從一個小目標開始，慢慢累積你的每一天。"], assistant: ["AI 規劃室", "一點靈感，讓安排更輕鬆。", "和小幫手一起，找到適合自己的生活節奏。"] };
    $("#view-name").textContent = titles[state.view][0]; $("#page-title").textContent = titles[state.view][1]; $("#page-subtitle").textContent = titles[state.view][2];
    $(".page-heading").hidden = state.view === "assistant";
    $(".page-content").classList.toggle("assistant-page", state.view === "assistant");
    $("#full-date").textContent = formatDate(C.dateKey(), { year: "numeric", month: "long", day: "numeric", weekday: "long" });
    $$(".view-panel").forEach(panel => { panel.hidden = panel.id !== `${state.view}-view`; });
    $$(".main-nav [data-view]").forEach(b => { b.classList.toggle("active", b.dataset.view === state.view); if (b.dataset.view === state.view) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    document.title = `${titles[state.view][0]} | Daylight 日常有序`;
    renderCalendar(); renderStats(); renderAgenda(); renderTasks(); renderWeek(); renderAccount(); renderAI();
  }
  async function saveItems(items) {
    if (!state.ready) throw new Error("雲端資料尚未載入完成，請稍候。");
    const clean = items.map(i => ({ ...C.validateItem(i), id: i.id || C.uid(), updatedAt: Date.now() }));
    if (state.user) { await cloud.saveMany(state.user.uid, clean); }
    else { const map = new Map(state.items.map(i => [i.id, i])); clean.forEach(i => map.set(i.id, i)); persistLocal([...map.values()]); }
    render();
  }
  async function deleteItems(ids) {
    if (!state.ready) throw new Error("請等待雲端資料載入完成。");
    if (state.user) await cloud.removeMany(state.user.uid, ids);
    else persistLocal(state.items.filter(i => !ids.includes(i.id)));
    render();
  }
  async function perform(operation, message) {
    if (state.saving) { toast("前一筆變更仍在儲存，請稍候。"); return; }
    state.saving = true; renderAccount();
    try { await operation(); if (message) toast(message); }
    catch (err) { toast(`未完成：${friendlyError(err)}`); throw err; }
    finally { state.saving = false; renderAccount(); }
  }
  function friendlyError(error) {
    const errors = { "auth/popup-closed-by-user": "你已取消登入，可以隨時再試一次。", "auth/cancelled-popup-request": "登入已取消。", "auth/popup-blocked": "瀏覽器阻擋了登入視窗，請允許此網站的彈出式視窗。", "auth/unauthorized-domain": "這個網域尚未加入 Firebase 的 Authorized domains。", "auth/operation-not-allowed": "請先在 Firebase 啟用 Google 登入。", "auth/network-request-failed": "網路連線失敗，請確認網路後重試。", "permission-denied": "無權存取資料，請確認已部署 Firestore 安全規則。", "functions/unauthenticated": "請先使用 Google 登入。", "functions/not-found": "尚未部署 AI Cloud Function，請完成 Firebase 後端設定。", "functions/unavailable": "AI 服務暫時無法連線，請確認後端部署狀態。", "functions/resource-exhausted": "今天的 AI 請求已達上限，請稍後再試。", "functions/failed-precondition": error.message || "AI 後端設定尚未完成。", "functions/internal": "AI 服務暫時發生錯誤，請稍後重試。" };
    return errors[error.code] || error.message || "請稍後再試。";
  }
  function confirmAction(title, message) {
    return new Promise(resolve => {
      const dialog = $("#confirm-dialog"); $("#confirm-title").textContent = title; $("#confirm-message").textContent = message;
      const finish = result => { dialog.close(); $("#confirm-ok").onclick = null; $("#confirm-cancel").onclick = null; dialog.oncancel = null; resolve(result); };
      $("#confirm-ok").onclick = () => finish(true); $("#confirm-cancel").onclick = () => finish(false); dialog.oncancel = event => { event.preventDefault(); finish(false); };
      dialog.showModal(); $("#confirm-cancel").focus();
    });
  }
  function changeKind(kind) {
    $("#item-form").elements.kind.value = kind;
    $$('[data-item-type]').forEach(b => { b.setAttribute("aria-pressed", String(b.dataset.itemType === kind)); b.disabled = !!$("#item-form").elements.id.value; });
    $$(".event-fields").forEach(el => { el.hidden = kind !== "event"; }); $$(".task-fields").forEach(el => { el.hidden = kind !== "task"; });
    ["start", "end"].forEach(n => { $("#item-form").elements[n].required = kind === "event"; });
    $("#conflict-warning").hidden = true;
  }
  function openItem(kind = "event", id, date = state.date) {
    const item = id ? state.items.find(i => i.id === id) : null;
    if (id && !item) return;
    const form = $("#item-form"); form.reset();
    form.elements.id.value = item?.id || ""; form.elements.date.value = item?.date || date;
    ["title", "notes", "category", "start", "end", "location", "priority"].forEach(n => { if (item?.[n] !== undefined) form.elements[n].value = item[n]; });
    changeKind(item?.kind || kind);
    $("#item-dialog-title").textContent = item ? "編輯事項" : "為重要的事，留個位置。";
    $("#delete-item").hidden = !item; $("#form-error").hidden = true;
    $("#item-dialog").showModal(); form.elements.title.focus();
  }
  function formItem() {
    const data = Object.fromEntries(new FormData($("#item-form")));
    const old = state.items.find(i => i.id === data.id);
    return { ...C.validateItem({ ...data, completed: old?.completed || false, demo: old?.demo || false }), id: data.id || C.uid() };
  }
  $("#item-form").addEventListener("input", () => {
    try { const item = formItem(), overlaps = C.conflicts(item, state.items); $("#conflict-warning").hidden = !overlaps.length; $("#conflict-warning").textContent = `時間與「${overlaps.map(i => i.title).join("」、「")}」重疊，仍可儲存，或先調整時間。`; } catch { $("#conflict-warning").hidden = true; }
  });
  $("#item-form").addEventListener("submit", async event => {
    event.preventDefault(); if (state.saving) return;
    const button = $("#save-item"); button.disabled = true; $("#form-error").hidden = true;
    try { const item = formItem(); await perform(() => saveItems([item]), "已儲存，讓日子慢慢有序。"); $("#item-dialog").close(); }
    catch (err) { $("#form-error").textContent = friendlyError(err); $("#form-error").hidden = false; }
    finally { button.disabled = false; }
  });
  $("#delete-item").addEventListener("click", async () => {
    const id = $("#item-form").elements.id.value;
    if (await confirmAction("刪除這個事項？", "這個事項將從目前空間移除，無法直接復原。建議先匯出備份。")) {
      try { await perform(() => deleteItems([id]), "事項已刪除。"); $("#item-dialog").close(); } catch { /* error already displayed */ }
    }
  });
  async function askAI(prompt) {
    const text = prompt.trim();
    if (state.aiBusy || !text) return;
    if (!state.ready) { toast("請先等待雲端資料載入完成。"); return; }
    const requestGeneration = generation;
    const date = state.date;
    const useGemini = usesCloudPlanner();
    const log = $("#ai-messages");
    state.aiBusy = true;
    state.messages.push({ role: "user", text, date });
    $("#ai-input").value = "";
    renderAI();
    log.scrollTop = log.scrollHeight;
    try {
      let result;
      if (useGemini) result = await cloud.plan({ prompt: text, date }, state.items);
      else { await new Promise(resolve => setTimeout(resolve, 250)); result = C.localPlan(state.items, date, text); }
      if (requestGeneration !== generation) return;
      if (!result || typeof result.summary !== "string" || !Array.isArray(result.suggestions)) throw new Error("規劃回覆格式不正確，請重試。");
      const suggestions = result.suggestions.slice(0, 8).map(raw => {
        const item = C.validateItem({ ...raw, kind: "event", notes: raw.notes || "", location: "", completed: false });
        return { ...item, key: C.uid(), applied: false };
      });
      state.suggestions.push(...suggestions);
      state.messages.push({ role: "assistant", label: useGemini ? "Gemini" : "本機規劃", text: result.summary, suggestions });
    } catch (err) {
      if (requestGeneration === generation) state.messages.push({ role: "assistant", text: `這次規劃沒有完成：${friendlyError(err)}\n你的行程與任務沒有被修改。` });
    } finally {
      if (requestGeneration === generation) {
        state.aiBusy = false;
        renderAI();
        log.scrollTop = log.scrollHeight;
      }
    }
  }
  $("#ai-form").addEventListener("submit", e => { e.preventDefault(); askAI($("#ai-input").value); });
  $("#ai-input").addEventListener("keydown", event => {
    if (event.key !== "Enter" || event.shiftKey || event.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    if (!state.aiBusy && event.currentTarget.value.trim()) $("#ai-form").requestSubmit();
  });
  $("#global-search").addEventListener("input", e => { state.search = e.target.value.trim().toLocaleLowerCase(); renderAgenda(); renderTasks(); renderWeek(); });
  $("#task-sort").addEventListener("change", e => { state.sort = e.target.value; renderTasks(); });
  async function exportBackup() {
    const data = JSON.stringify({ app: "daylight", version: 1, exportedAt: new Date().toISOString(), items: state.items }, null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = `daylight-backup-${C.dateKey()}.json`; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast("備份已下載。");
  }
  $("#import-file").addEventListener("change", async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error("備份檔案不能超過 2 MB。");
      const items = C.parseBackup(await file.text());
      if (!items.length) throw new Error("這份備份沒有事項。");
      if (await confirmAction("匯入這份備份？", `將合併 ${items.length} 筆事項到目前${state.user ? "雲端" : "本機"}空間。相同編號的事項將更新。`)) await perform(() => saveItems(items), `已匯入 ${items.length} 筆事項。`);
    } catch (err) { toast(friendlyError(err)); } finally { e.target.value = ""; }
  });
  $("#import-local").addEventListener("click", async () => {
    if (await confirmAction("將本機資料匯入此帳號？", `會把這台裝置的 ${localItems.length} 筆事項上傳到目前 Google 帳號的 Firestore 空間。本機備份將保留。`)) {
      try { await perform(() => saveItems(localItems), "本機資料已匯入雲端。"); } catch { /* surfaced above */ }
    }
  });
  function openAccount() { $("#auth-error").hidden = true; renderAccount(); $("#account-dialog").showModal(); }
  $("#google-login").addEventListener("click", async () => {
    if (!cloud) { $("#auth-error").textContent = "請先完成 Firebase 專案設定，將公開 firebaseConfig 填入 config.js。詳細步驟在專案 README.md。"; $("#auth-error").hidden = false; return; }
    if (state.authBusy) return;
    state.authBusy = true; $("#google-login").disabled = true; $("#auth-error").hidden = true;
    try { await cloud.login(); $("#account-dialog").close(); }
    catch (err) { $("#auth-error").textContent = friendlyError(err); $("#auth-error").hidden = false; }
    finally { state.authBusy = false; $("#google-login").disabled = false; }
  });
  $("#google-logout").addEventListener("click", async () => { try { await cloud.logout(); $("#account-dialog").close(); toast("已登出，回到這台裝置的本機空間。"); } catch (err) { toast(friendlyError(err)); } });
  document.addEventListener("click", async event => {
    const b = event.target.closest("button,[data-close]"); if (!b || b.disabled) return;
    if (b.dataset.close) { document.getElementById(b.dataset.close).close(); return; }
    if (b.dataset.view) { setView(b.dataset.view); return; }
    if (b.dataset.date) {
      const picker = b.closest("#date-picker");
      if (picker) picker.close();
      selectDate(b.dataset.date, b.dataset.openDay === "true");
      return;
    }
    if (b.dataset.newDate) { openItem("event", null, b.dataset.newDate); return; }
    if (b.dataset.edit) { openItem(null, b.dataset.edit); return; }
    if (b.dataset.toggle) {
      const item = state.items.find(i => i.id === b.dataset.toggle); if (!item) return;
      try { await perform(() => saveItems([{ ...item, completed: !item.completed }]), item.completed ? "已取消完成。" : "又完成一件事，做得很好。"); } catch { /* surfaced above */ } return;
    }
    if (b.dataset.itemType) { changeKind(b.dataset.itemType); return; }
    if (b.dataset.dayFilter) { state.dayFilter = b.dataset.dayFilter; renderTasks(); return; }
    if (b.dataset.taskFilter) { state.taskFilter = b.dataset.taskFilter; renderTasks(); return; }
    if (b.dataset.prompt) { askAI(b.dataset.prompt); return; }
    if (b.dataset.suggestion) {
      const s = state.suggestions.find(i => i.key === b.dataset.suggestion); if (!s || s.applied) return;
      const overlaps = C.conflicts({ ...s, kind: "event" }, state.items);
      if (overlaps.length && !await confirmAction("這個時段已經有安排", `與「${overlaps.map(i => i.title).join("」、「")}」重疊，仍要加入嗎？`)) return;
      b.disabled = true;
      try { await perform(() => saveItems([{ ...s, kind: "event", id: C.uid(), location: "", notes: s.notes || "規劃建議" }]), "規劃已加入行程，原任務仍保留。"); s.applied = true; } catch { /* surfaced above */ }
      renderAI(); return;
    }
    const action = b.dataset.action;
    if (action === "new-event") openItem("event");
    if (action === "new-task") openItem("task");
    if (action === "account") openAccount();
    if (action === "settings") { renderAccount(); $("#settings-dialog").showModal(); }
    if (action === "today") selectDate(C.dateKey());
    if (action === "prev-week" || action === "next-week") selectDate(C.addDays(state.date, action === "prev-week" ? -7 : 7));
    if (action === "prev-month" || action === "next-month") {
      state.month = shiftMonth(state.month, action === "prev-month" ? -1 : 1);
      renderCalendar();
    }
    if (action === "open-date-picker") {
      pickerMonth = state.date.slice(0, 7);
      $("#date-picker").showModal();
      renderCalendar();
      focusCalendarDay($("#picker-month-days"), state.date);
    }
    if (action === "picker-prev-month" || action === "picker-next-month") {
      pickerMonth = shiftMonth(pickerMonth, action === "picker-prev-month" ? -1 : 1);
      renderCalendar();
    }
    if (action === "picker-today") {
      $("#date-picker").close();
      selectDate(C.dateKey());
    }
    if (action === "clear-chat" && !state.aiBusy) {
      state.messages = [];
      state.suggestions = [];
      renderAI();
      $("#ai-input").focus();
    }
    if (action === "export") exportBackup();
    if (action === "remove-demo") {
      const ids = state.items.filter(i => i.demo).map(i => i.id);
      if (!ids.length) { toast("目前沒有示範資料。"); return; }
      if (await confirmAction("移除示範資料？", `將移除 ${ids.length} 筆標記為示範的事項。你自行新增的內容會保留。`)) { try { await perform(() => deleteItems(ids), "示範資料已移除，開始自己的安排吧。"); } catch { /* surfaced above */ } }
    }
  });
  document.addEventListener("keydown", e => {
    if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.target.matches("input,textarea,select") && !$$("dialog[open]").length && matchMedia("(min-width:721px)").matches) { e.preventDefault(); $("#global-search").focus(); }
  });
  window.addEventListener("hashchange", () => setView(location.hash.slice(1)));
  window.addEventListener("storage", e => { if (e.key === LOCAL_KEY && !state.user) { localItems = loadLocal(); state.items = [...localItems]; render(); } });
  async function connectFirebase() {
    const config = window.DAYLIGHT_CONFIG;
    if (!config?.firebase) return;
    try {
      if (!config.firebase.projectId || !config.firebase.apiKey || !config.firebase.authDomain || !config.firebase.appId) throw new Error("Firebase 公開設定缺少必要欄位，請核對 config.js。");
      if (location.protocol === "file:") throw new Error("雲端登入需透過 HTTP 預覽或 GitHub Pages 開啟，請執行 npm run dev。");
      const base = "https://www.gstatic.com/firebasejs/13.4.0/";
      const [appSDK, authSDK, dbSDK, fnSDK] = await Promise.all(["app", "auth", "firestore", "functions"].map(name => import(base + `firebase-${name}.js`)));
      const app = appSDK.initializeApp(config.firebase), auth = authSDK.getAuth(app), db = dbSDK.getFirestore(app), functions = fnSDK.getFunctions(app, config.functionsRegion || "asia-east1");
      if (config.appCheckSiteKey) { const checks = await import(base + "firebase-app-check.js"); checks.initializeAppCheck(app, { provider: new checks.ReCaptchaEnterpriseProvider(config.appCheckSiteKey), isTokenAutoRefreshEnabled: true }); }
      if (config.useEmulators && ["localhost", "127.0.0.1"].includes(location.hostname)) { authSDK.connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true }); dbSDK.connectFirestoreEmulator(db, "127.0.0.1", 8080); fnSDK.connectFunctionsEmulator(functions, "127.0.0.1", 5001); }
      const collection = uid => dbSDK.collection(db, "users", uid, "items");
      cloud = {
        login: () => authSDK.signInWithPopup(auth, new authSDK.GoogleAuthProvider()), logout: () => authSDK.signOut(auth),
        saveMany: async (uid, items) => { if (items.length > 400) throw new Error("單次最多 400 筆事項。"); const batch = dbSDK.writeBatch(db); items.forEach(item => batch.set(dbSDK.doc(collection(uid), item.id), { ...item, updatedAt: Date.now() })); await batch.commit(); },
        removeMany: async (uid, ids) => { const batch = dbSDK.writeBatch(db); ids.forEach(id => batch.delete(dbSDK.doc(collection(uid), id))); await batch.commit(); },
        plan: config.aiBackendEnabled
          ? async data => (await fnSDK.httpsCallable(functions, "planDay", { timeout: 60000 })(data)).data
          : null,
        plannerDisclosure: "傳送時會將相關行程與待辦提供給 Gemini。請確認建議後再加入行程。"
      };
      if (!config.aiBackendEnabled && config.aiLogic?.siteKey && config.aiLogic.host === location.hostname) {
        window.DaylightFirebaseAI.create({ base, app, config: config.aiLogic, C }).then(plan => {
          cloud.plan = plan;
          cloud.plannerDisclosure = "Gemini 會收到你輸入的訊息、忙碌時段及待辦優先順序。請避免輸入私人資料。";
          renderAccount();
        }).catch(error => console.warn("Gemini setup failed:", error.code || error.name));
      }
      authSDK.onAuthStateChanged(auth, user => {
        generation++; const current = generation;
        if (stopSnapshot) { stopSnapshot(); stopSnapshot = null; }
        state.user = user; state.items = []; state.messages = []; state.suggestions = []; state.aiBusy = false; state.cloudError = ""; state.ready = !user; banner("");
        $$("#item-dialog[open]").forEach(d => d.close());
        if (user) {
          stopSnapshot = dbSDK.onSnapshot(collection(user.uid), snapshot => {
            if (current !== generation) return;
            try { state.items = snapshot.docs.map(d => ({ ...C.validateItem(d.data()), id: d.id, updatedAt: Number(d.data().updatedAt) || 0 })); state.ready = true; state.cloudError = ""; banner(""); render(); }
            catch (err) { state.ready = false; state.cloudError = "雲端資料格式不正確，請檢查資料庫。"; banner(state.cloudError); render(); }
          }, err => { if (current !== generation) return; state.ready = false; state.cloudError = friendlyError(err); banner(state.cloudError); render(); });
        } else { localItems = loadLocal(); state.items = [...localItems]; }
        render();
      }, err => banner(friendlyError(err)));
      renderAccount();
    } catch (err) { banner(`Firebase 尚未連線：${friendlyError(err)} 目前仍可使用本機功能。`); }
  }
  setView(location.hash.slice(1));
  connectFirebase();
})();
