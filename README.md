# Daylight 日常有序

專為學生設計的個人行程與任務管理系統。使用 HTML、CSS、原生 JavaScript，前端可發布到 GitHub Pages；Google 登入與雲端資料由 Firebase Authentication 和 Firestore 提供。Gemini 規劃可透過 Firebase AI Logic 啟用。

## 立即試用

已安裝 Node.js 22 或以上時，在此資料夾執行：

```powershell
npm run dev
```

開啟終端機顯示的網址，預設為 `http://127.0.0.1:5173`。前端不需要安裝套件。也可直接開啟 `index.html` 體驗本機功能；Google 登入則必須使用 HTTP/HTTPS 網址。

首次啟動會建立三筆當日行程、三筆任務及一筆明日行程，全部明確標記為示範資料。可在「資料與設定」移除。你的資料存於瀏覽器 localStorage；清除網站資料會一併刪除，請使用 JSON 備份。

## 已實作內容

- 日曆與每日／每週總覽，日期切換、今天捷徑。
- 行程新增、編輯、刪除、完成狀態、分類、地點、備註。
- 任務新增、編輯、刪除、完成／取消完成、優先順序與逾期提示。
- 關鍵字搜尋、待辦／已完成篩選、到期日與優先順序排序。
- 開始／結束時間驗證、重疊提醒；可以明確保留有衝突的行程。
- JSON 匯出／匯入；匯入前驗證全部資料並要求確認。
- Google 彈窗登入、狀態監聽、姓名與頭像、登出、取消／錯誤提示。
- 每個 Firebase UID 有獨立的 Firestore 路徑及擁有者存取規則。
- 本機與雲端空間分開；登入不會自動上傳本機資料，可自行選擇匯入。
- 規劃助手：本機規則可安排待辦、檢查衝突、整理本週重點；雲端 Gemini 可理解自由文字需求。
- AI 只提出建議。程式驗證日期、時段、重疊及格式，使用者確認後才新增行程。
- 手機導覽、桌面側欄、可縮放字體、鍵盤操作、原生對話框與減少動態效果偏好。

## 目前完成狀態

本機體驗已備妥。Firebase 專案 `ncu-app-proj1-daylight-planner` 使用免費 Spark 方案。Daylight Web 的公開設定已填入 `config.js`，Firestore 已在台灣 `asia-east1` 建立。

Google 登入及 Firestore 連線已在本機預覽實測。寫入與帳號隔離在 Emulator 驗證。即使 Firebase AI Logic 尚未啟用，登入或訪客都可使用本機規則整理目前的行程與待辦。介面會標示建議來源。

## Firebase 設定：第一次建立專案

### 1. 用你自己的 Google 帳號建立 Firebase 專案

1. 開啟 [Firebase Console](https://console.firebase.google.com/)，自行登入要擁有這個作業的 Google 帳號。
2. 建立專案，名稱可用 `daylight-planner`。若名稱的 project ID 已被使用，接受系統產生的唯一 ID 即可。
3. 不需要 Google Analytics；先使用免費 Spark 方案建立 Authentication 與 Firestore。
4. 在 Project overview 點選 `</>` 註冊 Web App，名稱可用 `Daylight Web`。不用啟用 Firebase Hosting，網站將放在 GitHub Pages。
5. 從 Project settings → General → Your apps 取得 `firebaseConfig`。這是前端公開設定，可以交給程式整合；**不是 Service Account JSON**。
6. 參考 `config.example.js` 修改 `config.js` 的 `firebase`，保留 Firebase 提供的 `authDomain`。

### 2. 啟用 Google 登入

1. Authentication → Get started → Sign-in method → Google → Enable。
2. 選自己的支援信箱並儲存。
3. Authentication → Settings → Authorized domains，加入 `127.0.0.1`、`localhost` 及未來 Pages 的 `你的帳號.github.io`。只填網域，不填 `https://` 或專案路徑。

### 3. 建立 Firestore

1. Firestore Database → Create database → **Standard edition**，選擇適合的區域，如 `asia-east1`。
2. 建立 `(default)` 資料庫，使用 Production mode。
3. 將 `firestore.rules` 的完整內容發布到 Rules。**不要採用所有人皆可讀寫的 test mode 規則。**
4. 或用下方 CLI 指令發布規則。

登入成功後雲端空間預設為空白；在「資料與設定」可以將本機示範或自訂資料匯入當前帳號。登出後會回到原來的本機空間。不要在別人的公用電腦匯入自己的資料。

### 4. 連接 Gemini（Firebase Spark）

使用 [Firebase AI Logic](https://firebase.google.com/docs/ai-logic/get-started) 的 Gemini Developer API 及 [App Check](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider)。Firebase 管理 Gemini 憑證。完成 Google 條款與 App Check 設定後，將網站網域、公開 reCAPTCHA site key、可用的 Gemini 模型填入 `config.js` 的 `aiLogic`。維持 `aiBackendEnabled: false`。

啟用 Gemini 後，請求會包含對話輸入、選擇日期、忙碌時段，以及用代號表示的待辦日期、分類與優先順序。程式會在裝置上將結果與實際待辦比對，再以預覽方式顯示。

## GitHub Pages 發布

- [GitHub repository](https://github.com/Jerryguo888/NCU_JuniorFall_APP_proj1)
- [Daylight GitHub Pages](https://jerryguo888.github.io/NCU_JuniorFall_APP_proj1/)

前端使用相對路徑，可在 GitHub Pages 的專案子路徑運作。Firebase Authentication 的授權網域只填 `jerryguo888.github.io`。雲端 Firestore 資料依登入者的 UID 隔離。

若要手動預覽建置結果：

```powershell
npm test
npm run check
npm run build
```

## 專案結構

```text
index.html                  畫面及可存取的表單與對話框
styles.css                  桌面／手機樣式
config.js                   自己的 Firebase 公開設定
src/core.js                 日期、驗證、衝突、備份、本機規劃
src/app.js                  互動、呈現、Google 登入、Firestore 與 AI 連線
src/firebase-ai.js          Gemini 請求最小化及建議驗證
functions/index.js          已驗證登入的 Gemini callable function
functions/planner.cjs       最小化模型輸入及模型輸出檢查
functions/core.cjs          共用驗證；部署前由腳本自動同步
firestore.rules             每位使用者自己的讀寫權限及欄位限制
scripts/                    本機伺服器、靜態建置、後端準備
tests/                      日期、衝突、備份與 AI 邊界測試
docs/                       課程需求對照、系統設計、驗收與展示稿
```

## 測試與繳交

執行 `npm test` 與 `npm run check`。測試不需要 Google 帳號，也不會呼叫付費 AI。若尚未安裝後端套件，兩項 callable 驗證測試會明確標記為跳過；其餘十二項不需要套件。CI 會先安裝後端套件再執行全部測試。實際的 Firebase 規則、Google 授權及跨裝置存取仍需依 `docs/TESTING.md` 完成實測，不能以本機測試取代。已完成的檢查記錄於 `docs/VERIFICATION.md`。

課程最終投影片要求 **2026/11/26 00:00（台灣時間）前**填寫表單，也就是 11/25 晚上結束前。這裡不代填任何獨立作答之前測、個人學習反思或繳交表單。
