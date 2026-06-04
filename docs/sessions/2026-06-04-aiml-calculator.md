# סיכום סשן — מחשבון AI/ML

**תאריך:** 04.06.2026
**מודול:** `digitek-platform/src/modules/aiml-calculator`
**Route:** `/calculator?mode=ai`

---

## הקלט

קובץ `Calculator - AI ML/מחירון AI ML.xlsx` עם 2 גיליונות:
- **מחירים** — 16 תוצרים × 3 גדלים (קטן/בינוני/גדול), טווח 40K-300K
- **תכולות** — תיאור מילולי של כל גודל לכל תוצר

המטרה: לבנות מחשבון תמחור פרויקטי AI/ML לפי סעיף 3.16 (ייעוץ ויישום AI/ML בענן) במסגרת LIBA.

---

## שלבי הבנייה

### שלב 1 — תכנון ומוקאפים
- ניתוח הקובץ דרך `xlsx` של digitek-platform
- בניית קובץ עצמאי `Calculator - AI ML/mockups.html` עם 3 גישות UI: טבלה / ויזרד / Cards
- בחירת המשתמש: **גישה A** (טבלה) — הכי "זריז"

### שלב 2 — מסך טבלאי "זריז" (Iteration A)
- מודול `aiml-calculator` חדש: types, data, calc, useAimlCalculator, AimlCalculator.tsx + module.css
- Route נפרד `/aiml-calculator`, פריט סיידבר, כרטיס דשבורד
- localStorage תחת `aimlCalc:v1`
- Commit: `c368e0e`

### שלב 3 — ויזרד מאוחד תחת `/calculator` (Iteration B)
המשתמש ביקש שהמחשבון AI יהיה **בתוך** מחשבון תכ"ם עם toggle בראש העמוד.

- `Calculator.tsx` קיבל toggle "שעות לפי תכ״ם / תוצרי AI"
- `AimlCalculator.tsx` שוכתב מאפס לויזרד 4 שלבים זהה למבנה של TAKAM
- 4 קבצי שלבים חדשים:
  - `Step1AimlSetup` — שם פרויקט + משרד + תקופת התקשרות
  - `Step2AimlSelect` — 16 כרטיסי תוצרים עם מודאל תכולות
  - `Step3AimlSizing` — size pills + qty + scope display לכל תוצר נבחר
  - `Step4AimlResults` — טבלת פירוט + summary card + מאצ'ינג/סיכון
- שיתוף CSS: שלבי AIML מייבאים את `TakamCalculator.module.css` ⇒ שני המחשבונים נראים זהים
- Route `/aiml-calculator` הפך ל-redirect אל `/calculator?mode=ai`
- Commit: `64679e4`

### שלב 4 — תיקון דפלוי שבור
זוהו 2 חסימות לדפלוי מ-30.5:
1. **`url.insteadOf` ב-`~/.gitconfig`** — כל URL של GitHub הוחלף ב-URL עם PAT פג ⇒ push נכשל בשקט
2. **`vercel.json` עם `crons: [{ schedule: "0 */12 * * *" }]`** — Hobby tier דוחה כל cron יותר מיומי (הקרון ממילא הוחלף ב-GitHub Actions ב-c8c623e אבל הסעיף נשאר)
- תיקון `git config --unset-all url.<expired-PAT>.insteadof`
- מחיקת `crons` מ-`vercel.json`
- Commit: `ab723d0`
- Vercel CLI 54.9.1 הותקן (לדפלוי ידני במידת הצורך)

### שלב 5 — Feature parity עם TAKAM
1. **תקופת התקשרות** (6/12/24 חודשים) ב-Step 1
2. **באנר הסבר** ש-AI = תוצרים, ושלמחשבון שעות צריך לעבור ל-toggle
3. **scope display** מודגש בכל כרטיס Step 3 — מתעדכן לפי גודל
4. **מאצ'ינג מערך** ו**תוספת סיכון** ב-Step 4 (Toggle + stepper ±5)
5. **שמור + החישובים שלי** בראש הויזרד עם `useAimlHistory` (localStorage תחת `aimlHistory:v1`)
6. **`HistoryPanel`** עם slide-in drawer (משתמש בסטיילים של TAKAM)
7. שינוי שמות toggle: `⏱️ שעות` ⇒ `שעות לפי תכ״ם` ; `🤖 תוצרים` ⇒ `תוצרי AI`
- Commit: `0f0fce3` + `29f4c7d`

### שלב 6 — UI polish
- **Toggle floating pill** — קטן ושקוף, `position: absolute` בפינה השמאלית, לא דוחס פריסה (commit: `98d6cf3`)
- **איחוד סיידבר** — פריט יחיד "מחשבון" במקום שני קישורים (commit: `aafa1a3`)
- **מודאל תכולות** עם **X לסגירה** ב-top-left, לא נסגר אוטומטית. סנכרון מלא של טקסט מהאקסל לכל 16 התוצרים (commit: `3958068`)

### שלב 7 — יועץ AI
- `AimlAiAdvisorModal.tsx` — תקבילי ל-TAKAM אבל ל-deliverables
- מערכת prompt עם 16 התוצרים, גדלים ומחירים מהמחירון
- מחזיר JSON: `summary + items[{itemId, size, baseQty, extraQty, reason}]`
- כפתורי `+ הוסף` / `+ הוסף הכל` / `סיים → עבור לקביעת גדלים וכמויות`
- אומת חי על-ידי המשתמש: עבד והפיק המלצות נכונות לתיאור "בוט חכם למשרד התקשורת"
- Commit: `673a321`

---

## קבצים סופיים במודול

```
digitek-platform/src/modules/aiml-calculator/
├── AimlCalculator.tsx          ← ויזרד ראשי + stepper + Save/History buttons
├── AimlCalculator.module.css   ← Toggle + modal + sizing extras
├── AimlAiAdvisorModal.tsx      ← יועץ AI (Gemini)
├── AimlHistoryPanel.tsx        ← Drawer של "החישובים שלי"
├── Step1AimlSetup.tsx          ← שם + משרד + תקופה + באנר הסבר
├── Step2AimlSelect.tsx         ← 16 כרטיסי תוצרים + מודאל תכולות (X close)
├── Step3AimlSizing.tsx         ← Size pills + qty + scope display
├── Step4AimlResults.tsx        ← Breakdown table + summary card + מאצ'ינג/סיכון
├── data.ts                     ← 16 פריטים עם prices + scope (סונכרן מאקסל)
├── calc.ts                     ← rowTotal, grandTotal, computeBreakdown (VAT+matching+risk)
├── types.ts                    ← AimlState עם period, matching, risk, calculationId
├── useAimlCalculator.ts        ← Reducer + localStorage (v3)
└── useAimlHistory.ts           ← רשימת חישובים שמורים (localStorage)
```

קבצים מחוץ למודול שהושפעו:
- `digitek-platform/src/pages/Calculator.tsx` — wrapper עם toggle
- `digitek-platform/src/components/Sidebar.tsx` — פריט יחיד "מחשבון"
- `digitek-platform/src/pages/Dashboard.tsx` — כרטיס יחיד "מחשבון"
- `digitek-platform/src/App.tsx` — redirect `/aiml-calculator` → `/calculator?mode=ai`
- `vercel.json` — הסרת `crons`

---

## חישוב סופי (לדוגמת אימות)

3 תוצרים: spec(medium) + ML(medium) + LLM+RAG(large)

- בסיס: 70K + 150K + 300K = **520,000₪**
- אם מאצ'ינג 10% פעיל: +52K = **572,000₪**
- אם סיכון 15% פעיל: +85.8K = **657,800₪**
- VAT 18%: +118,404 = **776,204₪**
- פריסה ל-12 חודשים: ~54,817₪/חודש

---

## טכנולוגיות בשימוש

- **React 19** + TypeScript + Vite 8
- **CSS Modules** — שיתוף סטיילים מ-TakamCalculator.module.css
- **localStorage** — persistence (טרם הוטמע ב-Supabase)
- **Gemini 2.5 Flash** דרך `/api/ai-advisor` (Vercel function)
- **react-router-dom v7** — URL sync לבחירת mode

---

## עוד לעתיד

- [ ] שמירה ב-Supabase (טבלה `aiml_calculations` עם RLS) — להחליף את localStorage
- [ ] ייצוא Word/PDF — בנוסח דומה לבריפים
- [ ] שיתוף חישוב — `?share=token` כמו TAKAM
- [ ] חיבור התוצאות לבריפים (לטעון חישוב כסעיף תמחור)
- [ ] AI Advisor עם הקשר רחב יותר (לקרוא נתונים מבריף קיים)

---

## Commits שעלו ל-develop בסשן

1. `c368e0e` — feat(aiml-calculator): מסך טבלאי ראשוני
2. `64679e4` — feat(aiml-calculator): שכתוב לויזרד 4 שלבים
3. `ab723d0` — fix(vercel): הסרת cron שחסם דפלוי
4. `0f0fce3` — feat(aiml): feature parity עם TAKAM
5. `29f4c7d` — style(toggle): תוויות מדויקות
6. `98d6cf3` — style: toggle צף ופינתי
7. `aafa1a3` — style(sidebar): איחוד לכניסה אחת
8. `3958068` — fix(aiml): מודאל תכולות עם X close
9. `673a321` — feat(aiml): יועץ AI עם Gemini
