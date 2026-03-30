# Calculator Improvements (Phase A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 6 UX improvements to `takam-calculator.html`: clickable logo, required project name, remove tariff block, role info popups, AI mix-check button, and editable hours in results.

**Architecture:** All changes are in one file — `takam-calculator.html`. The file has three sections: `<style>` (CSS), HTML panels, and `<script>`. Each task touches one or more of these sections. No build step, no dependencies.

**Tech Stack:** Vanilla JS ES6, HTML5, CSS3, RTL Hebrew, Gemini API (already integrated).

---

## File Map

| Section | Lines (approx) | What changes |
|---------|----------------|--------------|
| `<style>` block | 1–245 | Add CSS for: logo button, field-error, role-info-btn, role-info-popup, ai-check-btn, hours-edit |
| Topbar HTML | 251–257 | Wrap logo div in button |
| Step 1 HTML | 295–344 | Remove tariff block, make name required |
| Step 2 HTML | 345–361 | Add AI-check button + check modal HTML |
| `<script>` ROLES_DATA | 410–447 | Add `desc` field to all 35 roles |
| `<script>` calcRoleMonthlyCost | 449–456 | Support `customHours` override |
| `<script>` proceedToStep2 | 499–504 | Validate project name |
| `<script>` renderRoleList | 510–539 | Add ℹ️ button to role cards |
| `<script>` updateStickyBar | 555–563 | Call updateAiCheckBtn |
| `<script>` renderResults | 671–727 | Add hours column + edit button |
| `<script>` AI section | 811–969 | Add check functions + popup functions |

---

## Task 1: Clickable Logo

**Files:**
- Modify: `takam-calculator.html` — CSS + HTML topbar section

- [ ] **Step 1: Add CSS for logo button**

In the `<style>` block, find `.topbar-logo{...}` (line ~26) and add a new rule after it:

```css
button.topbar-logo{cursor:pointer;border:none;transition:opacity .15s,transform .15s}
button.topbar-logo:hover{opacity:.8;transform:scale(1.08)}
```

- [ ] **Step 2: Replace logo div with button**

Find (line ~252):
```html
  <div class="topbar-logo">🏛️</div>
```

Replace with:
```html
  <button class="topbar-logo" onclick="resetAll()" title="חזור לדף הבית">🏛️</button>
```

- [ ] **Step 3: Verify manually**

Open `takam-calculator.html` in browser. Navigate to step 3 or 4. Click the 🏛️ logo. Expected: returns to step 1, all fields cleared.

- [ ] **Step 4: Commit**

```bash
git add takam-calculator.html
git commit -m "feat: logo click resets to step 1"
```

---

## Task 2: Project Name — Required Field

**Files:**
- Modify: `takam-calculator.html` — CSS + HTML step 1 + JS `proceedToStep2()`

- [ ] **Step 1: Add `.field-error` CSS**

In the `<style>` block, after the last `.field-...` rule, add:

```css
.field-error{color:var(--red);font-size:12px;margin-top:4px;display:block}
```

- [ ] **Step 2: Update label in HTML**

Find (line ~303):
```html
          <label class="field-label">שם הפרויקט <span style="font-weight:400;color:var(--text3)">(אופציונלי)</span></label>
```

Replace with:
```html
          <label class="field-label">שם הפרויקט <span style="color:var(--red)">*</span></label>
```

- [ ] **Step 3: Add error span below the input**

Find (line ~304):
```html
          <input class="input" id="projName" type="text" placeholder="למשל: פיתוח מערכת HR">
```

Replace with:
```html
          <input class="input" id="projName" type="text" placeholder="למשל: פיתוח מערכת HR">
          <span class="field-error hidden" id="projNameError">שם הפרויקט הוא שדה חובה</span>
```

- [ ] **Step 4: Add `.hidden` CSS (if not exists)**

Search for `.hidden` in the `<style>` block. If not found, add:
```css
.hidden{display:none!important}
```
If it already exists — skip this step.

- [ ] **Step 5: Update `proceedToStep2()` to validate**

Find (line ~499):
```javascript
function proceedToStep2() {
  state.project.name = document.getElementById('projName').value;
  state.project.ministry = document.getElementById('projMinistry').value;
  goStep(2);
  renderRolePicker();
}
```

Replace with:
```javascript
function proceedToStep2() {
  const nameVal = document.getElementById('projName').value.trim();
  const errEl = document.getElementById('projNameError');
  if (!nameVal) {
    errEl.classList.remove('hidden');
    document.getElementById('projName').focus();
    return;
  }
  errEl.classList.add('hidden');
  state.project.name = nameVal;
  state.project.ministry = document.getElementById('projMinistry').value;
  goStep(2);
  renderRolePicker();
}
```

- [ ] **Step 6: Verify manually**

Open file. Click "המשך — בחירת תפקידים" with empty name → error message appears. Fill name → proceeds to step 2.

- [ ] **Step 7: Commit**

```bash
git add takam-calculator.html
git commit -m "feat: project name is required to proceed to step 2"
```

---

## Task 3: Remove Tariff Block

**Files:**
- Modify: `takam-calculator.html` — HTML step 1

- [ ] **Step 1: Delete the tariff field block**

Find and delete (lines ~319–326):
```html
      <div class="field">
        <label class="field-label">סוג תעריף</label>
        <div class="field-sub">תעריף גג — המחיר המרבי המוחלט לפי נספח יג</div>
        <div class="seg">
          <button class="seg-btn on">תעריף גג 🔴</button>
          <button class="seg-btn" disabled title="יתווסף בגרסה 2 — ממתין לנתונים">תעריף מרבי 🟡</button>
        </div>
      </div>
```

Replace with nothing (delete the block entirely).

- [ ] **Step 2: Verify manually**

Open file. Step 1 should show: שם פרויקט, משרד, תקופת חישוב, מאצ'ינג — no tariff selector.

- [ ] **Step 3: Commit**

```bash
git add takam-calculator.html
git commit -m "feat: remove tariff type selector (always ceiling)"
```

---

## Task 4: Role Info Popup (ℹ️)

**Files:**
- Modify: `takam-calculator.html` — CSS + ROLES_DATA + renderRoleList + new JS functions + new HTML div

- [ ] **Step 1: Add CSS**

In the `<style>` block, add after the last `.role-card` rule:

```css
/* ─── ROLE INFO ─── */
.role-info-btn{position:absolute;top:6px;left:6px;width:20px;height:20px;border-radius:50%;border:1.5px solid var(--teal-mid);background:var(--teal-pale);color:var(--teal);font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;z-index:2}
.role-info-btn:hover{background:var(--teal);color:#fff}
.role-card{position:relative}
.role-info-popup{position:fixed;background:#0f172a;color:#e2e8f0;border-radius:10px;padding:12px 16px;max-width:260px;font-size:13px;z-index:500;box-shadow:0 4px 20px rgba(0,0,0,0.4);line-height:1.6;pointer-events:none}
.role-info-popup.hidden{display:none}
```

- [ ] **Step 2: Add `desc` to all 35 ROLES_DATA entries**

Find `const ROLES_DATA = [` (line ~410). Replace the entire ROLES_DATA array with:

```javascript
const ROLES_DATA = [
  {id:'1.1', name:'אחראי תחום פיתוח ואפליקציות', cat:'ניהול',    rates:{b:202,c:249},        desc:'אחראי על ניהול צוות פיתוח ואפליקציות. מתאם בין דרישות עסקיות לפיתוח טכני.'},
  {id:'1.2', name:'אחראי תחום פיתוח ותשתיות',   cat:'ניהול',    rates:{b:207,c:243},        desc:'אחראי על ניהול צוות פיתוח ותשתיות. מתאם פיתוח תוכנה עם צרכי תשתית.'},
  {id:'1.3', name:'אחראי תפעול / הטמעה',         cat:'ניהול',    rates:{b:185,c:211},        desc:'מוביל תהליכי תפעול והטמעה של מערכות בארגון.'},
  {id:'1.5', name:'אחראי מתודולוגיה/אינטגרציה', cat:'ניהול',    rates:{b:191,c:217},        desc:'מומחה בתהליכי עבודה, מתודולוגיות ואינטגרציה בין מערכות.'},
  {id:'1.6', name:'קצין ניהול פרויקטים PMO',     cat:'ניהול',    rates:{a:151,b:202,c:232},  desc:'אחראי על תהליכי PMO, תכנון, מעקב ובקרה על פרויקטים.'},
  {id:'2.1', name:'אחראי פרויקט',                cat:'פיתוח',   rates:{b:219,c:284},        desc:'מוביל פרויקט מקצה לקצה — תכנון, לוחות זמנים, תקציב וסיכונים.'},
  {id:'2.2', name:'מנחת מערכות',                 cat:'פיתוח',   rates:{a:151,b:174,c:218,d:240}, desc:'מנתח דרישות, מגדיר מפרטים פונקציונליים, מתאם בין לקוח לפיתוח.'},
  {id:'2.3', name:'מפתח תוכנה',                  cat:'פיתוח',   rates:{a:146,b:192,c:229,d:266}, desc:'מפתח קוד, בונה מודולים, אחראי על איכות הקוד ואינטגרציה.'},
  {id:'2.4', name:'בודק תוכנה / QA',             cat:'פיתוח',   rates:{a:99,b:128,c:170,d:184},  desc:'בודק מערכות, כותב תסריטי בדיקה, מאתר ומתעד באגים.'},
  {id:'2.5', name:'מידען / עורך תוכן',           cat:'פיתוח',   rates:{a:76,b:93,c:110},     desc:'מנהל מידע ותוכן דיגיטלי, אחראי על ארגון ידע ותיעוד.'},
  {id:'2.6', name:'אפיון UX/UI',                 cat:'פיתוח',   rates:{a:142,b:169,c:201,d:235}, desc:'מעצב חוויית משתמש וממשקים (UX/UI), בונה אב-טיפוס ומבצע בדיקות שמישות.'},
  {id:'2.7', name:'אנליטיקה של הנתונים',         cat:'דאטה ובינה', rates:{a:150,b:162,c:189}, desc:'מנתח נתונים, בונה דוחות ודשבורדים, תומך בקבלת החלטות מבוססת-נתונים.'},
  {id:'2.8', name:'פיתוח וייישום פלטפורמה',      cat:'פיתוח',   rates:{b:191,c:224},         desc:'מטמיע ומפתח פלטפורמות טכנולוגיות (CRM, ERP, BI וכו׳).'},
  {id:'2.9', name:'DevOps',                       cat:'פיתוח',   rates:{a:185,b:232,c:280},   desc:'מבצע אוטומציה של תהליכי פיתוח, CI/CD, ניהול תשתיות ו-containerization.'},
  {id:'2.11',name:'מדע הנתונים',                 cat:'דאטה ובינה', rates:{b:272,c:304,d:342}, desc:'מפתח מודלים של ML/AI, עובד עם נתונים גדולים לצורך חיזוי והסקה.'},
  {id:'2.12',name:'הנדסת נתונים',                cat:'דאטה ובינה', rates:{a:193,b:209,c:248,d:280}, desc:'בונה pipelines לנתונים, מנהל data warehouses ומאגרי נתונים גדולים.'},
  {id:'2.13',name:'ניהול מוצר',                  cat:'פיתוח',   rates:{b:220,c:269,d:294},   desc:'מגדיר אסטרטגיית מוצר, עדיפויות ו-roadmap בשיתוף צוות הפיתוח.'},
  {id:'3.1', name:'איש תקשורת ורשתות',           cat:'תשתיות',  rates:{a:153,b:174,c:196,d:229}, desc:'מתקין ומתחזק רשתות תקשורת, ניתוב, firewall ותקשורת בין-אתרית.'},
  {id:'3.2', name:'טכנאי ציוד מחשבים',           cat:'תשתיות',  rates:{a:79,b:98,c:142},     desc:'מתקין ומתחזק ציוד קצה — מחשבים, מדפסות, ציוד היקפי.'},
  {id:'3.3', name:'איש צוות סיסטם',              cat:'תשתיות',  rates:{a:164,b:183,c:221},   desc:'מנהל שרתים, מערכות הפעלה ותשתית IT כוללת.'},
  {id:'3.4', name:'מנהל בסיס נתונים DBA',        cat:'תשתיות',  rates:{a:149,b:184,c:219,d:233}, desc:'מנהל בסיסי נתונים — ביצועים, גיבוי, אבטחה, תחזוקה.'},
  {id:'3.7', name:'בקרת מערכות שליטה',           cat:'תשתיות',  rates:{a:95,b:128,c:147},    desc:'מפעיל מערכות בקרה תעשייתיות ו-SCADA.'},
  {id:'3.8', name:'מיישם הגנת סייבר',            cat:'תשתיות',  rates:{a:124,b:204,c:246},   desc:'מיישם פתרונות הגנת סייבר — SIEM, EDR, מניעת חדירה.'},
  {id:'3.9', name:'תפעול תשתיית ענן',            cat:'תשתיות',  rates:{a:161,b:201,c:242},   desc:'מנהל תשתיות ענן (AWS/Azure/GCP) — provisioning, ניטור, עלויות.'},
  {id:'4.1', name:'נאמן מחשוב / רפרנט',          cat:'תמיכה',   rates:{a:89,b:120,c:133},    desc:'נאמן מחשוב ברמת יחידה — ממשק ראשון לתמיכה טכנית.'},
  {id:'4.2', name:'איש סיוע ותמיכה',             cat:'תמיכה',   rates:{a:77,b:89,c:134},     desc:'מספק תמיכה ראשונית למשתמשי קצה — help desk.'},
  {id:'4.3', name:'מדריך / מטמיע',               cat:'תמיכה',   rates:{a:81,b:95,c:143},     desc:'מדריך ומטמיע מערכות אצל משתמשי קצה.'},
  {id:'4.4', name:'מפעיל / פקיד ביצוע',          cat:'תמיכה',   rates:{a:66,b:78},           desc:'מפעיל מערכות ומבצע עבודות ביצוע שגרתיות.'},
  {id:'5.1', name:'מיישם SAP בסביבת ERP',        cat:'ERP/SAP', rates:{a:183,b:237,c:286,d:314}, desc:'מיישם ומתפעל מודולי SAP בסביבת ERP ממשלתית.'},
  {id:'5.2', name:'איש תשתיות SAP/ERP',          cat:'ERP/SAP', rates:{a:182,b:231,c:293},   desc:'מנהל תשתיות טכניות של מערכות SAP/ERP.'},
  {id:'6.1', name:'אחראי מערכות המידע',          cat:'ארכיטקטורה', rates:{b:284,c:323,d:327}, desc:'אחראי כולל על מערכות המידע הארגוניות — אסטרטגיה ותפעול.'},
  {id:'6.2', name:'ארכיטקט ראשי',                cat:'ארכיטקטורה', rates:{a:252,b:311,c:327}, desc:'מגדיר ארכיטקטורה טכנית כוללת למערכות ה-IT.'},
  {id:'6.4', name:'מומחה טכנולוגיות הגנת סייבר', cat:'ארכיטקטורה', rates:{b:306,c:358},      desc:'מומחה בטכנולוגיות הגנת סייבר — כלים, פרוטוקולים, הגנה אקטיבית.'},
  {id:'6.5', name:'מומחה מתודולוגיות הגנת סייבר',cat:'ארכיטקטורה', rates:{b:306,c:358},      desc:'מומחה במתודולוגיות ותהליכי הגנת סייבר.'},
  {id:'6.6', name:'חוקר סייבר',                  cat:'ארכיטקטורה', rates:{a:217,b:306,c:358,d:423}, desc:'חוקר איומי סייבר, מנתח מתקפות, מבצע בדיקות חדירה.'},
  {id:'6.7', name:'ארכיטקט פתרונות',             cat:'ארכיטקטורה', rates:{a:275,b:340,c:358}, desc:'מגדיר ארכיטקטורת פתרונות עבור פרויקטים ספציפיים.'},
];
```

- [ ] **Step 3: Add popup singleton div to HTML**

Find `<div class="sticky-bar"` (near end of body). Just before it, add:

```html
<div id="roleInfoPopup" class="role-info-popup hidden"></div>
```

- [ ] **Step 4: Update `renderRoleList()` to include ℹ️ button**

Find in `renderRoleList()` (line ~532):
```javascript
          <div class="role-card${state.selectedIds.has(r.id)?' selected':''}" onclick="toggleRole('${r.id}')" data-id="${r.id}">
            <span class="role-card-name">${r.name}</span>
            <span class="role-check">✓</span>
          </div>
```

Replace with:
```javascript
          <div class="role-card${state.selectedIds.has(r.id)?' selected':''}" onclick="toggleRole('${r.id}')" data-id="${r.id}">
            <span class="role-card-name">${r.name}</span>
            <span class="role-check">✓</span>
            <button class="role-info-btn" onclick="showRoleInfo(event,'${r.id}')" title="מידע על התפקיד">i</button>
          </div>
```

- [ ] **Step 5: Add `showRoleInfo` and `hideRoleInfo` functions**

In the `<script>` block, just before the `// ── AI ADVISOR ──` comment, add:

```javascript
// ── ROLE INFO POPUP ──────────────────────────────────────
function showRoleInfo(e, id) {
  e.stopPropagation();
  const role = ROLES_DATA.find(r => r.id === id);
  if (!role) return;
  const popup = document.getElementById('roleInfoPopup');
  popup.textContent = role.desc || role.name;
  popup.classList.remove('hidden');
  const rect = e.currentTarget.getBoundingClientRect();
  let top = rect.bottom + 6;
  let left = rect.left - 120;
  if (left < 8) left = 8;
  if (top + 100 > window.innerHeight) top = rect.top - 106;
  popup.style.top = top + 'px';
  popup.style.left = left + 'px';
  setTimeout(() => document.addEventListener('click', hideRoleInfo, {once:true}), 0);
}
function hideRoleInfo() {
  document.getElementById('roleInfoPopup').classList.add('hidden');
}
```

- [ ] **Step 6: Verify manually**

Open file → step 2 → hover over any role card → should see small `i` button in top-left corner → click it → popup appears with role description → click elsewhere → popup closes.

- [ ] **Step 7: Commit**

```bash
git add takam-calculator.html
git commit -m "feat: add info popup to role cards"
```

---

## Task 5: AI Mix-Check Button (Items 7+8)

**Files:**
- Modify: `takam-calculator.html` — CSS + HTML step 2 + JS

- [ ] **Step 1: Add CSS**

In the `<style>` block, add after the AI ADVISOR CSS section:

```css
/* ─── AI CHECK ─── */
.ai-check-wrap{margin:16px 0 0;text-align:center}
.btn-ai-check{background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;border:none;border-radius:10px;padding:11px 22px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;transition:opacity .15s}
.btn-ai-check:hover{opacity:.88}
.ai-check-results{margin-top:16px}
.ai-check-section{margin-bottom:14px}
.ai-check-section-title{font-weight:700;font-size:13px;margin-bottom:8px;color:var(--text2)}
.ai-check-item{background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px 14px;margin-bottom:6px;font-size:13px;line-height:1.5}
.ai-check-item .reason{color:var(--text2);margin-top:2px}
.ai-check-ok{color:var(--green);font-weight:600;font-size:14px;text-align:center;padding:12px}
```

- [ ] **Step 2: Add AI-check button HTML in step 2**

Find in panel p2 (line ~356):
```html
    <div class="nav-row">
      <button class="btn-back" onclick="goStep(1)">‹ חזור</button>
```

Insert before that `nav-row`:
```html
    <div class="ai-check-wrap hidden" id="aiCheckWrap">
      <button class="btn-ai-check" id="aiCheckBtn" onclick="runAiCheck()">🔍 בדוק את התמהיל שלי עם AI</button>
    </div>
```

- [ ] **Step 3: Add AI-check modal HTML**

Find `<div id="roleInfoPopup"` (added in Task 4). Just before it, add:

```html
<div class="ai-overlay hidden" id="aiCheckOverlay" onclick="handleAiCheckOverlayClick(event)">
  <div class="ai-modal" style="max-width:520px">
    <div class="ai-modal-head">
      <h2>🔍 בדיקת תמהיל</h2>
      <button class="ai-modal-close" onclick="closeAiCheckModal()">✕</button>
    </div>
    <div class="ai-modal-body" id="aiCheckBody">
      <div class="ai-spinner" id="aiCheckSpinner"></div>
    </div>
  </div>
</div>
```

- [ ] **Step 4: Update `updateStickyBar()` to show/hide check button**

Find `updateStickyBar()` (line ~555):
```javascript
function updateStickyBar() {
  const n = state.selectedIds.size;
  const bar = document.getElementById('stickyBar');
  const btn = document.getElementById('toStep3Btn');
  bar.classList.toggle('visible', n > 0);
  bar.querySelector('.sticky-bar-count').textContent = n;
  if (btn) btn.disabled = n === 0;
}
```

Replace with:
```javascript
function updateStickyBar() {
  const n = state.selectedIds.size;
  const bar = document.getElementById('stickyBar');
  const btn = document.getElementById('toStep3Btn');
  bar.classList.toggle('visible', n > 0);
  bar.querySelector('.sticky-bar-count').textContent = n;
  if (btn) btn.disabled = n === 0;
  const checkWrap = document.getElementById('aiCheckWrap');
  if (checkWrap) checkWrap.classList.toggle('hidden', n === 0);
}
```

- [ ] **Step 5: Add AI-check JS functions**

In the `<script>` block, just before `// Initialize: try loading from URL hash`, add:

```javascript
// ── AI CHECK ─────────────────────────────────────────────
function closeAiCheckModal() {
  document.getElementById('aiCheckOverlay').classList.add('hidden');
  document.body.style.overflow = '';
}

function handleAiCheckOverlayClick(e) {
  if (e.target === document.getElementById('aiCheckOverlay')) closeAiCheckModal();
}

function buildCheckPrompt() {
  const names = [...state.selectedIds].map(id => {
    const r = ROLES_DATA.find(x => x.id === id);
    return r ? r.name : id;
  });
  const projectName = state.project.name || 'לא צוין';
  return `אתה יועץ לתמהיל משאבי IT לפרויקטים ממשלתיים ישראליים.
בדוק את התמהיל שנבחר לפרויקט:
שם פרויקט: ${projectName}
תפקידים נבחרים: ${names.join(', ')}

שאלות לבדיקה:
1. האם יש תפקידים שנראים לא רלוונטיים לפרויקט מסוג זה?
2. האם חסרים תפקידים קריטיים לפרויקט מסוג זה?

החזר JSON בלבד (ללא markdown, ללא קוד בלוקים):
{"suspicious":[{"id":"3.2","name":"טכנאי ציוד מחשבים","reason":"לא טיפוסי לפרויקט BI"}],"missing":[{"name":"מנתח מערכות","reason":"נדרש לפרויקט BI"}]}
אם אין הערות — החזר רשימות ריקות. השתמש בשמות תפקידים בעברית.`;
}

async function runAiCheck() {
  const overlay = document.getElementById('aiCheckOverlay');
  const body = document.getElementById('aiCheckBody');
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  body.innerHTML = '<div style="text-align:center;padding:32px"><span class="ai-spinner"></span><div style="margin-top:12px;color:var(--text2);font-size:13px">מנתח תמהיל...</div></div>';

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({contents:[{parts:[{text: buildCheckPrompt()}]}]})
      }
    );
    const data = await res.json();
    if (!res.ok || data.error) {
      body.innerHTML = `<div class="ai-error">${data.error?.message || 'שגיאת שרת, נסה שוב'}</div>`;
      return;
    }
    let raw = data.candidates[0].content.parts[0].text.trim();
    raw = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch { body.innerHTML = '<div class="ai-error">לא הצלחנו לנתח את התשובה, נסה שוב</div>'; return; }

    renderCheckResults(parsed);
  } catch {
    body.innerHTML = '<div class="ai-error">שגיאת חיבור, בדוק אינטרנט</div>';
  }
}

function renderCheckResults(data) {
  const body = document.getElementById('aiCheckBody');
  const suspicious = data.suspicious || [];
  const missing = data.missing || [];

  if (suspicious.length === 0 && missing.length === 0) {
    body.innerHTML = '<div class="ai-check-ok">✅ התמהיל נראה מאוזן לפרויקט מסוג זה</div>';
    return;
  }

  let html = '<div class="ai-check-results">';
  if (suspicious.length > 0) {
    html += '<div class="ai-check-section">';
    html += '<div class="ai-check-section-title">⚠️ שים לב — תפקידים לא טיפוסיים</div>';
    suspicious.forEach(s => {
      html += `<div class="ai-check-item"><strong>${s.name || s.id}</strong><div class="reason">${s.reason}</div></div>`;
    });
    html += '</div>';
  }
  if (missing.length > 0) {
    html += '<div class="ai-check-section">';
    html += '<div class="ai-check-section-title">💡 שקול להוסיף</div>';
    missing.forEach(m => {
      html += `<div class="ai-check-item"><strong>${m.name}</strong><div class="reason">${m.reason}</div></div>`;
    });
    html += '</div>';
  }
  html += '</div>';
  body.innerHTML = html;
}
```

- [ ] **Step 6: Verify manually**

Open file → Step 1: fill project name "מערכת BI ממשלתית" → Step 2: select a few roles including "טכנאי ציוד מחשבים" → "🔍 בדוק את התמהיל שלי עם AI" button should appear below the list → click it → modal opens with spinner → results appear with suspicious/missing roles.

- [ ] **Step 7: Commit**

```bash
git add takam-calculator.html
git commit -m "feat: AI mix-check button in step 2 (items 7+8)"
```

---

## Task 6: Editable Hours in Step 4

**Files:**
- Modify: `takam-calculator.html` — CSS + `calcRoleMonthlyCost` + `renderResults` + new JS function

- [ ] **Step 1: Add CSS**

In the `<style>` block, add after the breakdown table CSS:

```css
.hours-edit-btn{background:none;border:none;cursor:pointer;font-size:12px;opacity:.6;padding:0 4px;vertical-align:middle}
.hours-edit-btn:hover{opacity:1}
.hours-input{width:56px;padding:2px 6px;border:1.5px solid var(--teal);border-radius:6px;font-family:inherit;font-size:13px;text-align:center}
```

- [ ] **Step 2: Update `calcRoleMonthlyCost` to support `customHours`**

Find (line ~449):
```javascript
function calcRoleMonthlyCost(mixEntry) {
  const role = ROLES_DATA.find(r => r.id === mixEntry.id);
  if (!role) return 0;
  const rate = role.rates[mixEntry.level];
  if (!rate) return 0;
  const hours = HOURS_PER_MONTH * (mixEntry.scope / 100);
  return Math.round(rate * hours * VAT);
}
```

Replace with:
```javascript
function calcRoleMonthlyCost(mixEntry) {
  const role = ROLES_DATA.find(r => r.id === mixEntry.id);
  if (!role) return 0;
  const rate = role.rates[mixEntry.level];
  if (!rate) return 0;
  const hours = mixEntry.customHours ?? Math.round(HOURS_PER_MONTH * mixEntry.scope / 100);
  return Math.round(rate * hours * VAT);
}
```

- [ ] **Step 3: Add `setCustomHours` function**

Just before `// Initialize: try loading from URL hash`, add:

```javascript
function setCustomHours(i, val) {
  const v = parseInt(val);
  if (isNaN(v) || v < 1) return;
  state.mix[i].customHours = v;
  renderResults();
}

function editHoursInline(i) {
  const span = document.getElementById('hoursSpan'+i);
  if (!span) return;
  const cur = state.mix[i].customHours ?? Math.round(HOURS_PER_MONTH * state.mix[i].scope / 100);
  span.outerHTML = `<input class="hours-input" id="hoursInput${i}" type="number" value="${cur}" min="1" max="999"
    onblur="setCustomHours(${i}, this.value)"
    onkeydown="if(event.key==='Enter')this.blur()">`;
  setTimeout(() => { const inp = document.getElementById('hoursInput'+i); if(inp){inp.focus();inp.select();} }, 0);
}
```

- [ ] **Step 4: Update `renderResults` breakdown table to include hours column**

Find in `renderResults` (line ~699):
```javascript
  const tableRows = state.mix.map((m,i) => {
    const role = ROLES_DATA.find(r => r.id === m.id);
    const annual = monthlyPerRole[i] * 12;
    return `<tr>
      <td>${role.name}</td>
      <td style="text-align:center">${LEVEL_LABELS[m.level]}</td>
      <td style="text-align:center">${m.scope}%</td>
      <td class="cost-val">${fmtCurrency(annual,true)}</td>
    </tr>`;
  }).join('');
  const totalAnnual = monthlyPerRole.reduce((s,v) => s+v, 0) * 12;
  document.getElementById('breakdownTable').innerHTML = `
    <tr><th>תפקיד</th><th style="text-align:center">רמה</th><th style="text-align:center">משרה</th><th style="text-align:left">שנתי</th></tr>
    ${tableRows}
    <tr class="total"><td colspan="3">סה"כ ברוטו שנתי</td><td class="cost-val">${fmtCurrency(totalAnnual,true)}</td></tr>`;
```

Replace with:
```javascript
  const tableRows = state.mix.map((m,i) => {
    const role = ROLES_DATA.find(r => r.id === m.id);
    const annual = monthlyPerRole[i] * 12;
    const hours = m.customHours ?? Math.round(HOURS_PER_MONTH * m.scope / 100);
    return `<tr>
      <td>${role.name}</td>
      <td style="text-align:center">${LEVEL_LABELS[m.level]}</td>
      <td style="text-align:center">${m.scope}%</td>
      <td style="text-align:center"><span id="hoursSpan${i}">${hours}</span><button class="hours-edit-btn" onclick="editHoursInline(${i})" title="ערוך שעות חודשיות">✏️</button></td>
      <td class="cost-val">${fmtCurrency(annual,true)}</td>
    </tr>`;
  }).join('');
  const totalAnnual = monthlyPerRole.reduce((s,v) => s+v, 0) * 12;
  document.getElementById('breakdownTable').innerHTML = `
    <tr><th>תפקיד</th><th style="text-align:center">רמה</th><th style="text-align:center">משרה</th><th style="text-align:center">שעות/חודש</th><th style="text-align:left">שנתי</th></tr>
    ${tableRows}
    <tr class="total"><td colspan="4">סה"כ ברוטו שנתי</td><td class="cost-val">${fmtCurrency(totalAnnual,true)}</td></tr>`;
```

- [ ] **Step 5: Verify manually**

Open file → complete wizard to step 4 → breakdown table should have new "שעות/חודש" column with values → click ✏️ on any row → input appears → change value → click outside → table recalculates with new hours.

- [ ] **Step 6: Commit**

```bash
git add takam-calculator.html
git commit -m "feat: editable monthly hours per role in step 4"
```

---

## Self-Review

**Spec coverage:**
- ✅ Item 1: Logo clickable → Task 1
- ✅ Item 2: Project name required → Task 2
- ✅ Item 3: Remove tariff → Task 3
- ✅ Item 6: ℹ️ popup → Task 4
- ✅ Items 7+8: AI mix-check → Task 5
- ✅ Item 9: Editable hours → Task 6

**Type consistency:**
- `state.mix[i].customHours` — defined in Task 6 step 2, used in steps 3+4 ✓
- `GEMINI_API_KEY` — already exists at line 812, reused in Task 5 ✓
- `aiCheckOverlay` / `aiCheckBody` — defined in HTML (step 3) and used in JS (step 5) ✓
- `hoursSpan${i}` — rendered in step 4, targeted in `editHoursInline` ✓
