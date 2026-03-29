# TAKAM AI Advisor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** הוסף כפתור AI Advisor צף למחשבון תכ"ם — המשתמש מתאר פרויקט, Claude מחזיר תמהיל משאבים מומלץ שאפשר להוסיף ל-state.

**Architecture:** Single-file HTML. מוסיפים CSS ו-JS בתוך הקובץ הקיים — ללא תלויות חיצוניות, ללא build step. קריאה ישירה ל-Anthropic API מהדפדפן עם header מיוחד.

**Tech Stack:** Vanilla JS, Fetch API, Anthropic Messages API (`claude-haiku-4-5-20251001`), localStorage לשמירת API key.

**Spec:** `docs/superpowers/specs/2026-03-29-takam-ai-advisor-design.md`

---

## File Structure

| קובץ | שינוי |
|------|-------|
| `takam-calculator.html` | תיקון שם + CSS חדש + HTML של FAB ו-Modal + JS חדש |

---

## Task 1: תיקון שם — תק"ם → תכ"ם

**Files:**
- Modify: `takam-calculator.html`

- [ ] **Step 1: החלף כל מופע של תק"ם ב-תכ"ם**

בקובץ `takam-calculator.html` החלף את כל ההופעות הבאות:

| ישן | חדש |
|-----|-----|
| `מחשבון תק"ם — שירותי מחשוב, דאטה ובינה מלאכותית` (ב-`<title>`) | `מחשבון תכ"ם — שירותי מחשוב, דאטה ובינה מלאכותית` |
| `מחשבון תק"ם` (ב-`.topbar-title`) | `מחשבון תכ"ם` |
| `מחשבון תק"ם` (בכל מקום אחר) | `מחשבון תכ"ם` |

שורה 6 — `<title>`:
```html
<title>מחשבון תכ"ם — שירותי מחשוב, דאטה ובינה מלאכותית</title>
```

שורה 210 — topbar:
```html
  <span class="topbar-title">מחשבון תכ"ם</span>
```

- [ ] **Step 2: פתח את הקובץ בדפדפן, ודא שהכותרת והtopbar מציגים "תכ"ם"**

פתח `takam-calculator.html` ב-Chrome. בדוק:
- tab כותרת: `מחשבון תכ"ם — שירותי מחשוב, דאטה ובינה מלאכותית`
- topbar: `מחשבון תכ"ם`

- [ ] **Step 3: Commit**

```bash
git add takam-calculator.html
git commit -m "fix: rename תק\"ם to תכ\"ם throughout"
```

---

## Task 2: CSS — AI FAB + Modal

**Files:**
- Modify: `takam-calculator.html` — הוסף CSS לפני `</style>`

- [ ] **Step 1: הוסף CSS של AI Advisor לפני `</style>` (שורה 205)**

הוסף את הבלוק הבא ממש לפני `</style>`:

```css
/* ─── AI ADVISOR ─── */
.ai-fab{position:fixed;bottom:24px;left:24px;z-index:200;background:linear-gradient(135deg,var(--teal),var(--teal2));color:#fff;border:none;border-radius:50px;height:44px;padding:0 20px;font-size:14px;font-weight:700;font-family:inherit;cursor:pointer;box-shadow:0 4px 16px rgba(13,148,136,0.45);display:flex;align-items:center;gap:8px;transition:transform 0.15s,box-shadow 0.15s;white-space:nowrap}
.ai-fab:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(13,148,136,0.5)}
.ai-overlay{position:fixed;inset:0;background:rgba(15,23,42,0.6);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(2px)}
.ai-overlay.hidden{display:none}
.ai-modal{background:var(--surface);border-radius:16px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);direction:rtl}
.ai-modal-head{background:linear-gradient(135deg,var(--navy),#134e4a);border-radius:16px 16px 0 0;padding:20px 24px;display:flex;align-items:center;justify-content:space-between}
.ai-modal-title{font-size:17px;font-weight:800;color:#fff;display:flex;align-items:center;gap:8px}
.ai-modal-close{background:rgba(255,255,255,0.1);border:none;color:rgba(255,255,255,0.7);width:32px;height:32px;border-radius:8px;font-size:16px;cursor:pointer;font-family:inherit;transition:background 0.15s;display:flex;align-items:center;justify-content:center}
.ai-modal-close:hover{background:rgba(255,255,255,0.2);color:#fff}
.ai-modal-body{padding:24px}
.ai-field{display:flex;flex-direction:column;gap:6px;margin-bottom:18px}
.ai-label{font-size:13px;font-weight:600;color:var(--text2)}
.ai-sublabel{font-size:11px;color:var(--text3)}
.ai-key-row{display:flex;gap:8px;align-items:center}
.ai-input{width:100%;background:var(--surface);border:1.5px solid var(--border2);border-radius:10px;padding:10px 13px;font-size:14px;font-family:inherit;color:var(--text);outline:none;transition:border-color 0.15s;direction:ltr}
.ai-input:focus{border-color:var(--teal)}
.ai-textarea{width:100%;background:var(--surface);border:1.5px solid var(--border2);border-radius:10px;padding:10px 13px;font-size:14px;font-family:inherit;color:var(--text);outline:none;transition:border-color 0.15s;resize:vertical;min-height:120px;direction:rtl}
.ai-textarea:focus{border-color:var(--teal)}
.ai-link{font-size:11px;color:var(--teal);text-decoration:none;font-weight:600}
.ai-link:hover{text-decoration:underline}
.ai-btn-analyze{width:100%;padding:12px;background:linear-gradient(135deg,var(--teal),var(--teal2));color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;font-family:inherit;cursor:pointer;transition:opacity 0.15s}
.ai-btn-analyze:disabled{opacity:0.4;cursor:not-allowed}
.ai-results{margin-top:20px;border-top:1px solid var(--border);padding-top:20px;display:none}
.ai-results.visible{display:block}
.ai-results-title{font-size:13px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:var(--text3);margin-bottom:10px}
.ai-summary{background:var(--teal-pale);border:1px solid var(--teal-mid);border-radius:10px;padding:12px 16px;font-size:13px;color:#134e4a;line-height:1.6;margin-bottom:16px}
.ai-role-row{display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg);border:1.5px solid var(--border);border-radius:10px;margin-bottom:7px;transition:border-color 0.15s}
.ai-role-row:hover{border-color:var(--teal-mid)}
.ai-role-info{flex:1;display:flex;flex-direction:column;gap:2px}
.ai-role-name{font-size:13px;font-weight:600;color:var(--text)}
.ai-role-meta{font-size:11px;color:var(--text3)}
.ai-role-reason{font-size:11px;color:var(--text2);margin-top:2px;font-style:italic}
.ai-add-btn{padding:6px 14px;border-radius:8px;border:1.5px solid var(--teal);background:var(--teal-pale);color:var(--teal);font-size:12px;font-weight:700;font-family:inherit;cursor:pointer;white-space:nowrap;transition:all 0.15s;flex-shrink:0}
.ai-add-btn:hover{background:var(--teal);color:#fff}
.ai-add-btn.added{border-color:var(--green);background:#f0fdf4;color:var(--green);cursor:default}
.ai-add-all{width:100%;margin-top:10px;padding:10px;background:var(--navy);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;font-family:inherit;cursor:pointer;transition:opacity 0.15s}
.ai-add-all:hover{opacity:0.85}
.ai-error{background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px 16px;font-size:13px;color:#dc2626;margin-top:12px;display:none}
.ai-error.visible{display:block}
.ai-spinner{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.4);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@media print{.ai-fab,.ai-overlay{display:none !important}}
```

- [ ] **Step 2: פתח בדפדפן, ודא אין שגיאות CSS בקונסול**

פתח DevTools → Console. Expected: אין שגיאות. הדף נראה זהה לפני.

---

## Task 3: HTML — כפתור FAB + Modal

**Files:**
- Modify: `takam-calculator.html` — הוסף HTML לפני `<div class="sticky-bar"`

- [ ] **Step 1: הוסף את ה-FAB וה-Modal לפני `<div class="sticky-bar"` (שורה 771)**

הוסף ממש לפני `<div class="sticky-bar" id="stickyBar">`:

```html
<!-- AI FAB -->
<button class="ai-fab" onclick="openAiModal()">✨ התייעץ עם AI</button>

<!-- AI Advisor Modal -->
<div class="ai-overlay hidden" id="aiOverlay" onclick="handleOverlayClick(event)">
  <div class="ai-modal" id="aiModal">
    <div class="ai-modal-head">
      <div class="ai-modal-title">✨ יועץ AI — תמהיל משאבים</div>
      <button class="ai-modal-close" onclick="closeAiModal()">✕</button>
    </div>
    <div class="ai-modal-body">
      <div class="ai-field">
        <label class="ai-label">מפתח Claude API</label>
        <div class="ai-sublabel">המפתח נשמר על המחשב שלך בלבד (localStorage) — לא עובר לשרת</div>
        <div class="ai-key-row">
          <input class="ai-input" id="aiApiKey" type="password" placeholder="sk-ant-api03-..." oninput="updateAnalyzeBtn()" onblur="saveApiKey()">
        </div>
        <a class="ai-link" href="https://console.anthropic.com/" target="_blank">איך מקבלים מפתח? ←</a>
      </div>
      <div class="ai-field">
        <label class="ai-label">תאר את הפרויקט שלך</label>
        <textarea class="ai-textarea" id="aiProjectDesc" placeholder="למשל: מערכת BI ממשלתית, 18 חודשים, 3 משרדים, כולל פיתוח, דאטה ותשתיות ענן. צוות של כ-8 אנשים." oninput="updateAnalyzeBtn()"></textarea>
      </div>
      <button class="ai-btn-analyze" id="aiAnalyzeBtn" onclick="runAiAnalysis()" disabled>✨ נתח את הפרויקט</button>
      <div class="ai-error" id="aiError"></div>
      <div class="ai-results" id="aiResults">
        <div class="ai-results-title">המלצת AI לתמהיל</div>
        <div class="ai-summary" id="aiSummary"></div>
        <div id="aiRoleList"></div>
        <button class="ai-add-all" onclick="addAllAiRoles()">הוסף הכל לתמהיל ›</button>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 2: פתח בדפדפן, לחץ על הכפתור הצף — ודא שה-overlay מופיע (אפור) ו-modal נפתח**

לחץ על "✨ התייעץ עם AI". Expected:
- overlay אפור-כהה מכסה את הדף
- modal לבן עם header כהה ופורמט RTL
- שגיאת JS בקונסול על `openAiModal is not defined` — זה צפוי, ה-JS עוד לא נוסף

---

## Task 4: JavaScript — פתיחה/סגירה + API Key

**Files:**
- Modify: `takam-calculator.html` — הוסף JS לפני `// Initialize: try loading from URL hash`

- [ ] **Step 1: הוסף פונקציות Modal + API Key לפני `// Initialize` (שורה 768)**

הוסף ממש לפני `// Initialize: try loading from URL hash`:

```javascript
// ─── AI ADVISOR ───────────────────────────────────────────────────────────
const AI_KEY_LS = 'takam_claude_key';
let aiRecs = []; // last AI recommendations [{id,level,scope,reason}]

function openAiModal() {
  const saved = localStorage.getItem(AI_KEY_LS);
  if (saved) document.getElementById('aiApiKey').value = saved;
  updateAnalyzeBtn();
  document.getElementById('aiOverlay').classList.remove('hidden');
}

function closeAiModal() {
  document.getElementById('aiOverlay').classList.add('hidden');
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('aiOverlay')) closeAiModal();
}

function saveApiKey() {
  const val = document.getElementById('aiApiKey').value.trim();
  if (val) localStorage.setItem(AI_KEY_LS, val);
}

function updateAnalyzeBtn() {
  const key = document.getElementById('aiApiKey').value.trim();
  const desc = document.getElementById('aiProjectDesc').value.trim();
  document.getElementById('aiAnalyzeBtn').disabled = !(key && desc);
}
```

- [ ] **Step 2: פתח בדפדפן, בדוק:**
  1. לחץ על "✨ התייעץ עם AI" — modal נפתח
  2. לחץ X — נסגר
  3. לחץ על ה-overlay (מחוץ ל-modal) — נסגר
  4. הזן ערך בשדה API Key → צא משדה → רענן דף → פתח שוב → המפתח מופיע
  5. כפתור "נתח" disabled כשהשדות ריקים, enabled כשמלאים

---

## Task 5: JavaScript — קריאה ל-Claude API

**Files:**
- Modify: `takam-calculator.html` — הוסף פונקציות JS אחרי `updateAnalyzeBtn`

- [ ] **Step 1: בנה את ה-system prompt כפונקציה**

הוסף אחרי `updateAnalyzeBtn`:

```javascript
function buildSystemPrompt() {
  const rolesList = ROLES_DATA.map(r => {
    const levels = Object.keys(r.rates).join(',');
    return `${r.id}|${r.name}|${r.cat}|רמות:${levels}`;
  }).join('\n');

  return `אתה יועץ לתמהיל משאבי IT לפרויקטים ממשלתיים ישראליים, המתמחה בתקן תכ"ם.
להלן 35 התפקידים הזמינים (id|שם|קטגוריה|רמות זמינות):
${rolesList}

רמות: a=בסיסי, b=מתקדם, c=מומחה, d=בכיר.
scope הוא אחוז משרה: 25, 50, 75, או 100.

על בסיס תיאור הפרויקט, החזר JSON בלבד — ללא טקסט לפני או אחרי — בפורמט הבא:
{
  "summary": "2-3 משפטים על הגיון ההמלצה",
  "roles": [
    {"id": "2.3", "level": "b", "scope": 100, "reason": "נדרש לפיתוח הליבה"}
  ]
}
השתמש רק ב-id-ים הקיימים ברשימה. בחר 4-10 תפקידים מתאימים.`;
}
```

- [ ] **Step 2: הוסף את `runAiAnalysis` אחרי `buildSystemPrompt`**

```javascript
async function runAiAnalysis() {
  const key = document.getElementById('aiApiKey').value.trim();
  const desc = document.getElementById('aiProjectDesc').value.trim();
  const btn = document.getElementById('aiAnalyzeBtn');
  const errEl = document.getElementById('aiError');
  const resultsEl = document.getElementById('aiResults');

  saveApiKey();
  errEl.classList.remove('visible');
  resultsEl.classList.remove('visible');
  btn.disabled = true;
  btn.innerHTML = '<span class="ai-spinner"></span> מנתח...';

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: buildSystemPrompt(),
        messages: [{ role: 'user', content: `תאר פרויקט: ${desc}` }],
      }),
    });

    if (res.status === 401) throw new Error('auth');
    if (!res.ok) throw new Error('network');

    const data = await res.json();
    const text = data.content[0].text.trim();

    let parsed;
    try {
      // strip markdown code fences if present
      const clean = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
      parsed = JSON.parse(clean);
    } catch {
      throw new Error('parse');
    }

    aiRecs = (parsed.roles || []).filter(r => ROLES_DATA.find(d => d.id === r.id));
    renderAiResults(parsed.summary || '', aiRecs);

  } catch (err) {
    const msgs = {
      auth: 'מפתח API שגוי — בדוק את המפתח ב-console.anthropic.com',
      parse: 'לא הצלחנו לנתח את התשובה — נסה שוב',
      network: 'שגיאת חיבור — בדוק חיבור אינטרנט',
    };
    showAiError(msgs[err.message] || 'שגיאה לא צפויה — נסה שוב');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '✨ נתח את הפרויקט';
    updateAnalyzeBtn();
  }
}

function showAiError(msg) {
  const el = document.getElementById('aiError');
  el.textContent = msg;
  el.classList.add('visible');
}
```

- [ ] **Step 3: פתח בדפדפן — ודא בקונסול שאין שגיאות syntax**

פתח DevTools → Console. Expected: אין שגיאות. הדף נטען תקין.

---

## Task 6: JavaScript — רינדור תוצאות + הוספה ל-state

**Files:**
- Modify: `takam-calculator.html` — הוסף פונקציות JS אחרי `showAiError`

- [ ] **Step 1: הוסף `renderAiResults`, `addRoleFromAi`, `addAllAiRoles`**

הוסף אחרי `showAiError`:

```javascript
const LEVEL_NAMES = {a:'בסיסי', b:'מתקדם', c:'מומחה', d:'בכיר'};

function renderAiResults(summary, recs) {
  document.getElementById('aiSummary').textContent = summary;

  const listEl = document.getElementById('aiRoleList');
  listEl.innerHTML = recs.map((r, i) => {
    const role = ROLES_DATA.find(d => d.id === r.id);
    const alreadyAdded = state.selectedIds.has(r.id);
    return `<div class="ai-role-row" id="airec-${i}">
      <div class="ai-role-info">
        <span class="ai-role-name">${role.name}</span>
        <span class="ai-role-meta">רמה: ${LEVEL_NAMES[r.level] || r.level} · ${r.scope}% משרה · ${role.cat}</span>
        ${r.reason ? `<span class="ai-role-reason">${r.reason}</span>` : ''}
      </div>
      <button class="ai-add-btn${alreadyAdded ? ' added' : ''}" id="aibtn-${i}"
        onclick="addRoleFromAi(${i})"
        ${alreadyAdded ? 'disabled' : ''}>
        ${alreadyAdded ? '✓ נוסף' : '+ הוסף'}
      </button>
    </div>`;
  }).join('');

  document.getElementById('aiResults').classList.add('visible');
}

function addRoleFromAi(idx) {
  const r = aiRecs[idx];
  if (!r) return;

  state.selectedIds.add(r.id);
  const existing = state.mix.findIndex(m => m.id === r.id);
  if (existing >= 0) {
    state.mix[existing].level = r.level;
    state.mix[existing].scope = r.scope;
  } else {
    state.mix.push({id: r.id, level: r.level, scope: r.scope});
  }

  const btn = document.getElementById(`aibtn-${idx}`);
  if (btn) { btn.textContent = '✓ נוסף'; btn.classList.add('added'); btn.disabled = true; }

  updateStickyBar();
}

function addAllAiRoles() {
  aiRecs.forEach((_, i) => addRoleFromAi(i));
  showToast(`נוספו ${aiRecs.length} תפקידים לתמהיל ✓`);
}
```

- [ ] **Step 2: בדוק end-to-end בדפדפן**

1. פתח את `takam-calculator.html`
2. לחץ "✨ התייעץ עם AI"
3. הזן מפתח Claude API תקין
4. הזן בשדה תיאור: `"מערכת BI ממשלתית, 12 חודשים, כולל פיתוח, דאטה וענן"`
5. לחץ "✨ נתח את הפרויקט"
6. Expected: spinner מופיע → תוצאות מתקבלות עם summary וכרטיסי תפקידים
7. לחץ "+ הוסף" על תפקיד — כפתור הופך ל-"✓ נוסף"
8. לחץ "הוסף הכל לתמהיל" — toast מופיע "נוספו X תפקידים"
9. סגור modal → עבור לשלב 2 — התפקידים מסומנים

- [ ] **Step 3: בדוק טיפול בשגיאה**

שנה את ה-API key לערך שגוי (`sk-bad-key`), לחץ "נתח".
Expected: הודעת שגיאה אדומה: "מפתח API שגוי — בדוק את המפתח ב-console.anthropic.com"

- [ ] **Step 4: Commit**

```bash
git add takam-calculator.html
git commit -m "feat: AI Advisor — pill FAB, Claude API integration, role recommendations"
```

---

## Self-Review

**Spec coverage:**
- [x] תיקון שם תק"ם → תכ"ם — Task 1
- [x] כפתור Pill צף בכל השלבים — Task 3
- [x] Modal עם API key field + localStorage — Task 3+4
- [x] textarea לתיאור פרויקט — Task 3
- [x] disabled state לכפתור ניתוח — Task 4 `updateAnalyzeBtn`
- [x] קריאת Claude API עם header מיוחד — Task 5
- [x] טיפול בשגיאות (auth/parse/network) — Task 5
- [x] רינדור summary + רשימת תפקידים — Task 6
- [x] כפתור "הוסף" לכל תפקיד → מעדכן state — Task 6
- [x] כפתור "הוסף הכל" — Task 6
- [x] `display:none` ב-print — נכלל ב-CSS (Task 2)

**Type consistency:**
- `aiRecs` — מוגדר ב-Task 4, משמש ב-Task 6 ✓
- `LEVEL_NAMES` — מוגדר ב-Task 6, משמש ב-`renderAiResults` ✓
- `updateStickyBar` — פונקציה קיימת בקוד המקורי ✓
- `showToast` — פונקציה קיימת בקוד המקורי ✓
- `state.selectedIds`, `state.mix` — state קיים ✓
