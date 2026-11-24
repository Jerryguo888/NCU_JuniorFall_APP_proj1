"use strict";
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret, defineString } = require("firebase-functions/params");
const { logger } = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { validateRequest, makeBody, sanitizePlan } = require("./planner.cjs");
const C = require("./core.cjs");

initializeApp();
const apiKey = defineSecret("GEMINI_API_KEY");
const model = defineString("GEMINI_MODEL", { default: "gemini-3.5-flash-lite", description: "A Gemini model that supports generateContent and structured JSON output." });

exports.planDay = onCall({ region: "asia-east1", secrets: [apiKey], timeoutSeconds: 60, memory: "256MiB", maxInstances: 2, concurrency: 10 }, async request => {
  if (!request.auth) throw new HttpsError("unauthenticated", "請先使用 Google 登入。");
  let data;
  try { data = validateRequest(request.data); } catch (err) { throw new HttpsError("invalid-argument", err.message); }
  const db = getFirestore(), uid = request.auth.uid;
  const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const usageRef = db.doc(`aiUsage/${uid}/days/${dayKey}`);
  await db.runTransaction(async tx => {
    const snapshot = await tx.get(usageRef), usage = snapshot.data() || {}, now = Date.now();
    if ((usage.count || 0) >= 30 || now - (usage.lastAt || 0) < 8000) throw new HttpsError("resource-exhausted", "每人每天最多 30 次規劃，兩次請求至少相隔 8 秒。");
    tx.set(usageRef, { count: (usage.count || 0) + 1, lastAt: now });
  });
  const snapshot = await db.collection(`users/${uid}/items`).limit(401).get();
  if (snapshot.size > 400) throw new HttpsError("failed-precondition", "請先將資料整理至 400 筆以下，再使用 AI 規劃。");
  let items;
  try { items = snapshot.docs.map(doc => ({ ...C.validateItem(doc.data()), id: doc.id })); }
  catch { throw new HttpsError("failed-precondition", "雲端事項格式不正確，請先檢查資料。"); }
  const modelName = model.value();
  if (!/^[a-zA-Z0-9._-]+$/.test(modelName) || !apiKey.value()) throw new HttpsError("failed-precondition", "請設定 Gemini 模型及後端金鑰。");
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey.value() },
      body: JSON.stringify(makeBody(data, items)), signal: AbortSignal.timeout(45000)
    });
    if (!response.ok) {
      logger.warn("Gemini request rejected", { status: response.status });
      if (response.status === 429) throw new HttpsError("resource-exhausted", "Gemini 額度暫時用完，請稍後再試。");
      if ([400, 403, 404].includes(response.status)) throw new HttpsError("failed-precondition", "請檢查 Gemini API Key、模型名稱與 API 權限。");
      throw new HttpsError("unavailable", "Gemini 目前無法服務，請稍後重試。");
    }
    const body = await response.json();
    const candidate = body.candidates?.[0];
    if (candidate?.finishReason && candidate.finishReason !== "STOP") throw new Error("Incomplete model response");
    const text = candidate?.content?.parts?.filter(p => typeof p.text === "string" && !p.thought).map(p => p.text).join("");
    return sanitizePlan(JSON.parse(text || "null"), data.date, items);
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    logger.error("Planning request failed", { type: err.name });
    throw new HttpsError("unavailable", "AI 規劃未完成，請稍後重試。你的行程沒有被修改。");
  }
});
