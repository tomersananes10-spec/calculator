# CLAUDE.md — הוראות עבודה לפרויקט LIBA

> קרא קובץ זה לפני כל פעולה. אל תשנה רכיבים ללא אישור מפורש.
> **כל תשובה חייבת להיות בעברית.**

---

## 1. מהי המערכת

**LIBA** — כלי פנים-ארגוני לניהול רכש ממשלתי, כולל:
- מחשבון תכ"ם (תקן כוח מקצועי) — הכלי המרכזי
- מחולל בריפים (Brief Generator) — wizard של 10 שלבים ליצירת מסמכי דרישה
- רובד 5 — ניהול שירותים מאושרים לרכישה
- דשבורד ניהולי מרכזי עם סטטיסטיקות אמיתיות
- ניהול ספקים, פרויקטים, אישורים (stubs — בפיתוח)

---

## 2. Stack טכנולוגי

| שכבה | טכנולוגיה |
|------|-----------|
| Frontend | React 19 + TypeScript + Vite 8 |
| Routing | react-router-dom v7 (SPA) |
| Styling | CSS Modules + theme.css (משתני CSS גלובליים) |
| Auth | Supabase Auth (Google OAuth + Email/Password) |
| Database | Supabase PostgreSQL + RLS |
| Storage | Supabase Storage (avatars, logos buckets) |
| API Proxy | Vercel Serverless Functions (`/api/`) |
| AI | Gemini 2.5 Flash (דרך `/api/ai-advisor`) |
| Deploy | Vercel — branch `develop` → preview, `main` → production |
| Export | docx (Word), html2pdf, xlsx |

### Environment Variables
```
VITE_SUPABASE_URL          # Supabase project URL
VITE_SUPABASE_ANON_KEY     # Supabase anon key
VITE_BYPASS_AUTH=true       # (dev only) עוקף auth עם mock user
GEMINI_API_KEY              # (server-side) עבור AI advisor
```

---

## 3. מבנה הפרויקט

```
CLAUDE_CODE_TOMER/
├── digitek-platform/              ← הפרויקט הראשי (React)
│   ├── src/
│   │   ├── App.tsx                ← Router — כל ה-routes
│   │   ├── components/
│   │   │   ├── AppLayout.tsx      ← Layout עם Sidebar + Topbar
│   │   │   ├── Sidebar.tsx        ← תפריט צד
│   │   │   ├── Topbar.tsx         ← בר עליון
│   │   │   └── ProtectedRoute.tsx ← Auth guard
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx      ← דף הבית — כרטיסי מודולים + סטטיסטיקות
│   │   │   ├── Calculator.tsx     ← wrapper למחשבון תכ"ם
│   │   │   ├── BriefGenerator.tsx ← wrapper לויזרד בריפים
│   │   │   ├── Login.tsx          ← דף כניסה
│   │   │   ├── Profile.tsx        ← פרופיל + העלאת תמונה
│   │   │   ├── Admin.tsx          ← פאנל ניהול
│   │   │   ├── Roved5Page.tsx     ← רובד 5
│   │   │   ├── ApprovalsPage.tsx  ← אישורים (stub)
│   │   │   ├── SuppliersPage.tsx  ← ספקים (stub)
│   │   │   └── ProjectsPage.tsx   ← פרויקטים (stub)
│   │   ├── modules/
│   │   │   ├── takam-calculator/  ← מחשבון תכ"ם (4 שלבים)
│   │   │   │   ├── TakamCalculator.tsx  ← Wizard ראשי
│   │   │   │   ├── Step1Setup.tsx       ← הגדרות (לקוח, פרויקט, גודל)
│   │   │   │   ├── Step2Roles.tsx       ← בחירת תפקידים
│   │   │   │   ├── Step3Mix.tsx         ← תמהיל ו-matching
│   │   │   │   ├── Step4Results.tsx     ← תוצאות + ייצוא
│   │   │   │   ├── AiAdvisorModal.tsx   ← יועץ AI
│   │   │   │   ├── HistoryPanel.tsx     ← פאנל היסטוריית חישובים
│   │   │   │   ├── ShareDialog.tsx      ← דיאלוג שיתוף
│   │   │   │   ├── calc.ts             ← לוגיקת חישוב (אסור לשנות ללא אישור)
│   │   │   │   ├── data.ts             ← טבלאות תעריפים
│   │   │   │   ├── types.ts            ← טיפוסים
│   │   │   │   ├── useCalculator.ts    ← hook ראשי
│   │   │   │   └── useCalculationHistory.ts ← שמירה/טעינה מ-Supabase
│   │   │   ├── brief-generator/   ← מחולל בריפים (10 שלבים)
│   │   │   │   ├── BriefWizard.tsx      ← Wizard ראשי
│   │   │   │   ├── Step1-Step10*.tsx    ← שלבי הויזרד
│   │   │   │   ├── briefAIHelper.ts     ← עזר AI למילוי שדות
│   │   │   │   ├── briefData.ts         ← נתוני ברירת מחדל
│   │   │   │   ├── types.ts             ← טיפוסים
│   │   │   │   └── wordExport.ts        ← ייצוא ל-Word
│   │   │   └── roved5/             ← רובד 5 — שירותים מאושרים
│   │   │       ├── Roved5.tsx           ← רשימה + חיפוש
│   │   │       ├── ServiceCard.tsx      ← כרטיס שירות
│   │   │       ├── ServiceModal.tsx     ← מודל פרטים
│   │   │       └── roved5AI.ts          ← חיפוש AI
│   │   ├── lib/
│   │   │   └── supabase.ts        ← Supabase client init
│   │   ├── hooks/
│   │   │   ├── useAuth.ts         ← auth + BYPASS_AUTH + admin check
│   │   │   └── useBriefs.ts       ← CRUD בריפים
│   │   ├── data/
│   │   │   ├── briefTemplates.ts  ← תבניות בריפים
│   │   │   ├── clusters.ts        ← אשכולות שירותים
│   │   │   └── roved5Services.json ← נתוני רובד 5
│   │   └── styles/
│   │       └── theme.css          ← משתני CSS גלובליים
│   ├── supabase/migrations/       ← מיגרציות DB
│   └── vite.config.ts
├── api/
│   └── ai-advisor.ts              ← Vercel serverless — proxy ל-Gemini
├── vercel.json                     ← Vercel config (build, rewrites)
├── dashboard.html                  ← (legacy) דף HTML ישן
├── takam-calculator.html           ← (legacy) מחשבון HTML ישן
├── calculator.html                 ← (legacy) מחשבון בסיסי ישן
└── CLAUDE.md                       ← הקובץ הזה
```

---

## 4. Routes (App.tsx)

| Route | דף | סטטוס |
|-------|----|-------|
| `/` | Dashboard | עובד |
| `/calculator` | מחשבון תכ"ם | עובד |
| `/briefs` | מחולל בריפים | עובד |
| `/brief-generator` | מחולל בריפים (alias) | עובד |
| `/layer5` | רובד 5 | עובד |
| `/approvals` | אישורים | stub |
| `/suppliers` | ספקים | stub |
| `/projects` | פרויקטים | stub |
| `/profile` | פרופיל משתמש | עובד |
| `/admin` | פאנל ניהול | עובד |
| `/login` | כניסה | עובד |

---

## 5. Supabase — טבלאות ו-RLS

### טבלאות עיקריות:
- `profiles` — פרטי משתמש (full_name, company, phone, address, logo_url)
- `calculations` — חישובי תכ"ם (is_draft, current_step, data JSON)
- `calculation_shares` — הרשאות שיתוף (view/edit)
- `briefs` — בריפים שמורים
- `admins` — טבלת admin

### RPC Functions:
- `check_is_admin()` — בדיקת admin (SECURITY DEFINER)
- `admin_get_all_profiles()` — שליפת כל הפרופילים לפאנל admin

### Storage Buckets:
- `avatars` — תמונות פרופיל
- `logos` — לוגואים של חברות

---

## 6. כללי עיצוב — לא לשנות ללא אישור

### משתני CSS (מוגדרים ב-theme.css :root)
```css
/* Primary - Blue */
--primary / --primary-light / --primary-bg / --primary-dark
/* Legacy aliases */
--teal / --teal2 / --teal3 / --teal-pale / --teal-mid
/* Neutrals */
--navy / --slate / --text / --text2 / --text3 / --bg / --surface / --border / --border2
/* Status */
--green / --red / --amber  (+  --green-bg / --red-bg / --amber-bg)
/* Layout */
--radius: 12px / --sidebar-w: 260px
```

### כללים מחייבים:
- תמיד להשתמש במשתני CSS — אין קידוד צבעים ישיר
- פונט: **Heebo** בלבד
- כיוון: **RTL**, עברית
- Styling: **CSS Modules** (קובץ `.module.css` ליד כל component)
- הטופבר והסיידבר אחידים בכל הדפים — לא לשנות ללא אישור מפורש

---

## 7. רכיבים שאסור לשנות ללא אישור

- מבנה Sidebar + Topbar
- משתני CSS ב-`:root` (theme.css)
- לוגיקת חישוב ב-`calc.ts`
- טבלאות תעריפים ב-`data.ts`
- Routes ב-`App.tsx`

---

## 8. איך לעבוד נכון בכל שיחה

1. קרא קובץ זה תחילה — זה נותן לך את כל ההקשר
2. **אל תסרוק את כל הקוד בתחילת שיחה** — סמוך על מה שכתוב כאן
3. לפני שינוי קובץ — הודע מה בדיוק אתה משנה
4. לאחר שינוי — עדכן את סקשן "שיחה אחרונה" למטה
5. **כל תשובה בעברית**
6. **בדיקת באגים**: אבחן והצג — חכה לאישור לפני שינוי קוד
7. **אל תחליף תשתיות** (API, מודלים, שירותים) ללא אישור מפורש

---

## 9. היסטוריית פיתוח

| תאריך | מה נבנה |
|--------|----------|
| 29.03 | מחשבון התכ"ם — בנייה ראשונית |
| 30.03 | דשבורד ראשי — 6 כרטיסיות, ניווט |
| 31.03 | כפתור חזרה לדשבורד, wizard progress |
| 16.04 | הוספת `.vercel` ל-gitignore |
| 17.04 | תיקון API errors ביועץ AI, קיצור wizard עם AI, שיתוף מתקדם, Rename → LIBA |
| 19.04 | היסטוריית חישובים + שיתוף עם הרשאות |
| 20.04 | הפעלת Auth — Google + Email login |
| 21.04 | דשבורד עם נתונים אמיתיים, תיקון RLS recursion, auto-save טיוטות |
| 25.04 | כפתורי פעולה בדשבורד, שדרוג AI Advisor, תיקון matching input |
| 28.04 | תיקון העלאת תמונות בפרופיל — מיגרציה, storage buckets, RLS |
| 28.04 | שדרוג עיצוב דף פרופיל — באנר גרדיאנט, אווטאר חופף, כרטיסים עם אייקונים צבעוניים, אנימציות |
| 28.04 | רובד 5 — תיקון חיפוש, AI timeout, שדרוג UI לכרטיסים מודרניים |
| 12.05 | שדרוג מסך אדמין — 9 טאבים, מודול admin חדש, מיגרציית DB |
| 18.05 | שכתוב מלא של ייצוא Word בבריפים — התאמה לתבנית הממשלתית הרשמית |
| 18.05 | גישת Template-based: טעינת תבנית .docx מקורית + החלפת תוכן דינמי עם שמירת עיצוב מלא |
| 19.05 | מודול Test — הצגת תבנית Word עם docx-preview + ויזרד 3 שלבים לעריכה |
| 19.05 | שדרוג מודול בריפים — מיפוי מלא של כל שלבי הוויזרד ל-Word + docx-preview בתצוגה מקדימה |
| 19.05 | עדכון תבנית Word — 11 תגיות חדשות (ministry, timeline, architecture, management, cloud, goals) |
| 29.05 | Eligibility Engine — פרויקט נפרד: שלבים 1-4 (מנוע keyword, Supabase, דשבורד, העלאת PDF/DOCX) |

---

## 10. שיחה אחרונה

> **תאריך**: 29.05.2026
> **נושא**: Eligibility Engine — Phase 4: העלאת קבצי PDF/DOCX

### מה בוצע:
- מודול `fileParser.ts` — פענוח PDF (pdfjs-dist) ו-DOCX (mammoth) צד-לקוח
- שדרוג `types.ts` — הוספת `cvSource`, `cvFileName`, `cvPageCount`, `isParsing`
- שדרוג `useCheck.ts` — actions חדשים: FILE_PARSE_START/COMPLETE/ERROR, CLEAR_FILE + פונקציית `handleFile`
- שכתוב `Step1Intake.tsx` — אזור drag-and-drop + file input + תצוגת קובץ שהועלה + תצוגת טקסט שחולץ
- שדרוג `Step1Intake.module.css` — סגנונות drop zone, spinner, divider, extracted text
- הוספת `--success`, `--danger` ל-theme.css

### אימות:
- TypeScript עובר ללא שגיאות
- PDF upload עובד (calc-print-test.pdf — 2 עמודים, 1,734 תווים)
- DOCX upload עובד (הוראת תכמ.docx — 63,033 תווים)
- UI: drop zone + "או הקלידו טקסט" divider + הסר קובץ + הצג טקסט שחולץ
- Commit: `a5c9db1` pushed to `develop`

---

## 11. עדיפויות פיתוח

1. [ ] _הכנס כאן את הפיצ'ר הבא_
2. [ ] ...
