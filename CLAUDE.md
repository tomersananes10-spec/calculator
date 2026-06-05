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
│   │   │   ├── aiml-calculator/    ← מחשבון AI/ML (3.16) — ויזרד 4 שלבים
│   │   │   │   ├── AimlCalculator.tsx   ← ויזרד ראשי
│   │   │   │   ├── Step1AimlSetup.tsx   ← שם פרויקט + משרד
│   │   │   │   ├── Step2AimlSelect.tsx  ← בחירת תוצרים (16 כרטיסים)
│   │   │   │   ├── Step3AimlSizing.tsx  ← גודל וכמויות (size pills + qty)
│   │   │   │   ├── Step4AimlResults.tsx ← תוצאות + סיכום מע"מ
│   │   │   │   ├── data.ts             ← 16 פריטים × 3 גדלים + תיאורי תכולות
│   │   │   │   ├── calc.ts             ← חישוב סה"כ
│   │   │   │   ├── useAimlCalculator.ts ← reducer + localStorage + currentStep
│   │   │   │   └── types.ts            ← AimlItem, AimlEntry, AimlStep
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
| `/aiml-calculator` | מחשבון AI/ML (3.16) | עובד |
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
| 30.05 | Supabase keep-alive — שחזור digitek-dev, השהיית digitek-platform (לא בשימוש), החלפת Vercel cron שבור ב-GitHub Actions workflow |
| 04.06 | מחשבון AI/ML — מודול חדש: 16 תוצרים × 3 גדלים לפי סעיף 3.16. מסך טבלאי "זריז", localStorage, אינטגרציה ל-Sidebar + Dashboard |
| 04.06 | מחשבון AI/ML — שכתוב לויזרד 4 שלבים זהה ל-TAKAM, בתוך אותו `/calculator` עם toggle "דאטה / AI" בראש |
| 04.06 | מחשבון AI/ML v3 — feature parity, מודאל תכולות, יועץ AI (Gemini פעיל), תיקון `url.insteadOf` + הסרת `vercel.json` cron ⇒ דפלוי חזר לעבוד. סיכום מלא: [docs/sessions/2026-06-04-aiml-calculator.md](docs/sessions/2026-06-04-aiml-calculator.md) |
| 04.06 | מחשבון AI/ML — feature-parity עם TAKAM: תקופת התקשרות, מאצ'ינג, סיכון, שמור + החישובים שלי (localStorage), הסבר UX, scope display, toggle "שעות/תוצרים" |
| 04.06 | **מורשי חתימה / Tenders CRM — פאזה 1 (Foundation)**: 5 migrations חדשים (006-010), 19 טבלאות (`tenders`, `tender_budgets`, `tender_vendors`, `tender_proposals`, `tender_documents`, `tender_personas`, `tender_audit_log`, `tender_committees`, `tender_committee_meetings`, `tender_protocols`, `tender_contract_templates`, `tender_contracts`, `tender_guarantees`, `tender_insurance`, `tender_purchase_orders`, `tender_milestones`, `tender_invoices`, `tender_vendor_evaluations`, `tender_approval_requests`, `tender_sla_events`, `tender_notifications_queue`) + 6 RPCs (`tender_create`, `tender_advance`, `tender_approval_decide`, `tender_committee_schedule`, `tender_evaluate_gateway`, `tender_stats`, `tender_audit_log_write`) + RLS פר תפקיד. מודול חדש `src/modules/tenders/` עם 13 פרסונות, 12 שלבים, 11 Gateways, FSM, 11 סיכונים, 10 KPIs. אין UI עדיין — פאזה 1 בלבד. |
| 04.06 | **Tenders CRM — תיקוני אבטחה**: migrations 011 + 012 לאחר 5 ממצאי HIGH/MEDIUM מסקירה אוטומטית. tighten RLS על `tenders` (משתתפים בלבד), ולידציית FSM ב-`tender_advance`, auth gates ב-`tender_evaluate_gateway` ו-`tender_committee_schedule`, REVOKE EXECUTE מ-PUBLIC לכל ה-RPCs + GRANT ל-authenticated, `tender_audit_log_write` פנימי בלבד. |
| 05.06 | **Tenders CRM — פאזה 2 (Workflow & SLA Engine)**: migration 013 — DB triggers (auto-create SLA event על INSERT אישור, auto-resolve על decide, audit על שינויי signature_status/guarantee/milestone) + טבלת `tender_sla_defaults` עם 12 SLA-ים + RPC `tender_check_sla_breaches`. מודול TS: `lib/slaCalc.ts` (לוח שנה ישראלי — ראשון-חמישי + חגים 2026-2027), `lib/notifications.ts` (תור התראות), `slaEngine.ts` (12 SLA-ים + breach/warn/escalation logic), `workflowEngine.ts` (8 workflows לכל שלב FSM עם sequential/parallel/conditional). |

---

## 10. שיחה אחרונה

> **תאריך**: 05.06.2026
> **נושא**: Tenders CRM — פאזה 2 (Workflow & SLA Engine)

### מה נבנה בפאזה 2
**מודול TS חדש** [src/modules/tenders/](digitek-platform/src/modules/tenders/):
- [lib/slaCalc.ts](digitek-platform/src/modules/tenders/lib/slaCalc.ts) — לוח שנה ישראלי. `isBusinessDay`, `addBusinessDays`, `businessDaysBetween`, `nextBusinessDay`. ראשון-חמישי + 25 חגים יהודיים 2026-2027 (hardcoded — לא ספריה חיצונית, [feedback_no_paid_upgrades])
- [lib/notifications.ts](digitek-platform/src/modules/tenders/lib/notifications.ts) — abstraction מעל `tender_notifications_queue`. `enqueueNotification`, `notifySlaApproaching`, `notifySlaBreached`. dispatch אמיתי בפאזה 5
- [slaEngine.ts](digitek-platform/src/modules/tenders/slaEngine.ts) — 12 SLA definitions לכל `ApprovalRequestType`. `computeDueAt`, `evaluateSlaStatus` (on_track/approaching/breached/escalated), `slaProgress`
- [workflowEngine.ts](digitek-platform/src/modules/tenders/workflowEngine.ts) — 8 workflows (S1-S12) עם sequential/parallel/conditional steps. `getWorkflow`, `getNextStep` (approve/reject/return)

**Migration 013** [(013_tenders_sla_triggers.sql)](digitek-platform/supabase/migrations/013_tenders_sla_triggers.sql):
- טבלה חדשה `tender_sla_defaults` (12 רשומות seed — מראה את `SLA_DEFINITIONS` מ-TS)
- 5 DB triggers (כולם SECURITY DEFINER + REVOKE EXECUTE FROM PUBLIC/anon/authenticated):
  - `tender_trg_create_sla_on_approval` — INSERT על אישור → INSERT אוטומטי ב-sla_events
  - `tender_trg_resolve_sla_on_decision` — UPDATE על status → resolve SLA
  - `tender_trg_audit_contract_status` — שינוי signature_status → audit log
  - `tender_trg_audit_guarantee_status` — שינוי status → audit log
  - `tender_trg_audit_milestone_status` — שינוי status → audit log
- RPC `tender_check_sla_breaches` (admin only) — sweep ל-breach + escalation, מיועד ל-Vercel cron בעתיד

### אימות
- ✅ `npx tsc --noEmit` עבר נקי (Exit 0)
- ✅ Migration 013 הוחל בהצלחה ב-digitek-dev
- ✅ `SELECT * FROM tender_sla_defaults` מחזיר 12 רשומות תקינות

### עוד לא בוצע (פאזות 3-6)
- [ ] **פאזה 3**: Wizard פתיחת הליך + Tender 360 (6 Tabs) + החלפת `/approvals` ב-TenderListPage
- [ ] **פאזה 4**: מסכי מודול — ועדות, מסמכים, חוזים, אבני דרך, הערכת ספק
- [ ] **פאזה 5**: אינטגרציות + פורטל ספקים + Vercel cron שמפעיל `tender_check_sla_breaches` + dispatcher אמיתי לתור ה-notifications
- [ ] **פאזה 6**: דשבורדים, דוחות KPI, פאנל אדמין מורחב

---

## (היסטוריית שיחה קודמת — פאזה 1)

> **תאריך**: 04.06.2026
> **נושא**: מורשי חתימה / Tenders CRM — פאזה 1 Foundation (Schema + Types)

### הקשר
המשתמש סיפק 2 קבצי אפיון בתיקיית `מורשי חתימה/`:
- `אפיון עסקי - מורשי חתימה.docx` — אפיון עסקי מקצה-לקצה (CRM מכרזי דיגיטק לפי תכ"ם 16.2.19)
- `אפיון_עסקי_מכרז_דיגיטק_גאנט.xlsx` — 5 גליונות (גאנט, שלבים, פרסונות, סיכונים, גאנט ויזואלי)

האפיון מגדיר 15 מודולים, 13 פרסונות, 19 ישויות נתונים, 11 Gateways, 7 אינטגרציות, 12 שלבי תהליך (209 ימים סה"כ).

**החלטות שאושרו ב-Plan Mode** (פלאן: `C:\Users\tomer\.claude\plans\joyful-jumping-honey.md`):
1. היקף: כל 15 המודולים — בפאזות
2. מיקום: מודול חדש ב-`digitek-platform/src/modules/tenders/` (החלפת stub של `/approvals`)
3. התחלה: Schema + Types — ללא UI עדיין

### מה נבנה בפאזה 1
**5 migrations חדשים** (כולם הופעלו ב-digitek-dev דרך Supabase MCP — `tender_stats()` מחזיר 19 קאונטרים תקינים):
- [006_tenders_core.sql](digitek-platform/supabase/migrations/006_tenders_core.sql) — 7 ישויות הליבה
- [007_tenders_committees.sql](digitek-platform/supabase/migrations/007_tenders_committees.sql) — ועדות + פרוטוקולים (M03)
- [008_tenders_contracts.sql](digitek-platform/supabase/migrations/008_tenders_contracts.sql) — הסכמים, ערבויות, ביטוח, PO (M07, M08)
- [009_tenders_execution.sql](digitek-platform/supabase/migrations/009_tenders_execution.sql) — אבני דרך, חשבוניות, הערכת ספק (M09, M10)
- [010_tenders_workflow.sql](digitek-platform/supabase/migrations/010_tenders_workflow.sql) — Approvals, SLA, Notifications + 6 RPCs (M05, M11)

**מודול TypeScript חדש** ב-[src/modules/tenders/](digitek-platform/src/modules/tenders/):
- [types.ts](digitek-platform/src/modules/tenders/types.ts) — types לכל 19 הישויות + Enums + payloads
- [stateMachine.ts](digitek-platform/src/modules/tenders/stateMachine.ts) — FSM של 12 שלבים, `canAdvance`, מעברים קדימה + return loops
- [data/personas.ts](digitek-platform/src/modules/tenders/data/personas.ts) — 13 פרסונות עם תיאורים, הרשאות, מסכים, KPIs
- [data/stagesBaseline.ts](digitek-platform/src/modules/tenders/data/stagesBaseline.ts) — 12 שלבים עם משכים, אבני דרך, נתיב קריטי
- [data/gateways.ts](digitek-platform/src/modules/tenders/data/gateways.ts) — G1-G11 + פונקציות evaluator טהורות
- [data/riskMatrix.ts](digitek-platform/src/modules/tenders/data/riskMatrix.ts) — 11 סיכונים
- [data/kpis.ts](digitek-platform/src/modules/tenders/data/kpis.ts) — 10 KPIs
- [index.ts](digitek-platform/src/modules/tenders/index.ts) — re-exports

### אימות
- ✅ `npx tsc --noEmit` עבר נקי (Exit 0)
- ✅ כל 5 ה-migrations הופעלו ב-digitek-dev (project_id: `ildwyncxoytvallkrqjo`) ללא שגיאות
- ✅ `SELECT public.tender_stats()` מחזיר JSON עם 19 קאונטרים = 0 — כל הטבלאות קיימות
- ✅ Foreign keys ל-`briefs`/`calculations` הקיימים תקינים

### עוד לא בוצע (פאזות 2-6 — לעתיד)
- [ ] **פאזה 2**: Workflow & SLA Engine (לוח שנה ישראלי, escalations, mock notifications)
- [ ] **פאזה 3**: Core UI — Wizard פתיחת הליך, Tender 360 (6 Tabs), TenderListPage (החלפת `/approvals`)
- [ ] **פאזה 4**: מסכי מודול — ועדות, מסמכים, חוזים, אבני דרך, הערכת ספק
- [ ] **פאזה 5**: אינטגרציות (מערכת תיחורים, אלמ"ה, ERP, חתימה דיגיטלית, פורטל ספקים)
- [ ] **פאזה 6**: דשבורדים, דוחות KPI, פאנל אדמין מורחב

### הערות שמורות
- RLS בסיסי (owner + admin); חידוד פר persona ב-`tender_personas` יקרה בפאזה 2
- חתימה דיגיטלית (Comsign/DocuSign) דורש חשבון בתשלום — abstraction בלבד עד אישור מפורש
- ה-stub הקיים [ApprovalsPage.tsx](digitek-platform/src/pages/ApprovalsPage.tsx) ב-`/approvals` יוחלף ב-`TenderListPage` בפאזה 3

---

## 11. עדיפויות פיתוח

1. [ ] **Tenders CRM — פאזה 3**: Wizard פתיחת הליך + Tender 360 (6 Tabs) + החלפת `/approvals` ב-TenderListPage
2. [ ] **Tenders CRM — פאזה 4**: מסכי מודול — ועדות, מסמכים, חוזים, אבני דרך
3. [ ] _הכנס כאן את הפיצ'ר הבא_
