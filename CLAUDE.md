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
| 05.06 | **Tenders CRM — פאזה 3 (Core UI)**: 3 דפים חדשים — `TenderListPage` (`/tenders`) עם סטטיסטיקות, חיפוש, פילטר לפי שלב, רשימת כרטיסים; `TenderWizardPage` (`/tenders/new`) — wizard 4 שלבים עם G1/G7/G9 evaluators חיים והערות אזהרה; `TenderDetailPage` (`/tenders/:id`) — Tender 360 עם 6 Tabs (Overview/Documents/Committees/Vendors/Milestones/Audit) + progress bar של 12 שלבים. 2 hooks חדשים: `useTenderList`, `useTender` + `createTender` ו-`advanceTender` wrappers ל-RPCs. `/approvals` עכשיו → Navigate ל-`/tenders`. Sidebar מצביע ל-`/tenders`. |
| 05.06 | **Tenders CRM — פאזה 4 (Stage-Driven Actions, מוקאפ C נבחר)**: `WorkflowBar` בראש Tender 360 שמראה שלב נוכחי + פעולה הבאה + progress; `StageMap` sidebar עם 12 שלבים (done/current/future/skipped); Tab "דרישות שלב" עם checklist ופעולות inline; `GateValidationModal` חוסם מעבר עד כל ה-requirements; 5 action modals — `ApprovalRequestModal` (גנרי ל-budget/olma/professional), `TenderNumberModal` (פנימי/חיצוני), `CommitteeProtocolModal` (יציאה/זכיה). `stageRequirements.ts` declarative — קל להוסיף requirements בעתיד. בפאזה זו S1-S4 (ייזום → בדיקה במערכת); S5-S12 בפאזה 4.5. |
| 05.06 | **Tenders CRM — פאזה 4.5 (Actions לכל 12 השלבים)**: השלמת זרימה end-to-end. `useTender` הורחב לטעון `approval_requests`, `vendors`, `guarantees`, `insurance`, `purchase_orders`, `invoices`, `vendor_evaluations` (13 entities במקביל). `stageRequirements.ts` הורחב לכל S0-S12. 11 modals חדשים: `ApprovalDecisionModal` (אישור/דחיית בקשות פתוחות), S5 (`VendorPickerModal`), S6 (`ProposalModal`, `WinnerSelectionModal`), S8 (`ContractDraftModal`, `GuaranteeModal`, `InsuranceModal`, `SignatoryModal` — שלב 8.5 המקורי), S9 (`PurchaseOrderModal`), S10/S11 (`MilestoneModal`), S12 (`VendorEvaluationModal` — closure blocker). כפתור "📋 N ממתינות לאישור" ב-header מוביל ל-ApprovalDecisionModal. ה-RPC `tender_approval_decide` מחובר דרך wrapper `decideApproval`. |
| 05.06 | **Tenders CRM — פאזה 5 (Integrations + Vendor Portal)**: 5 Vercel Functions ב-`/api/`: `cron/sla-check.ts` (RPC `tender_check_sla_breaches`), `notifications/dispatch.ts` (mock sender — מעדכן status=sent), `webhooks/signature.ts` + `tendering.ts` + `olma.ts` (stubs מתעדים ל-audit log). כולם משתמשים ב-Supabase REST API ישיר (לא SDK) כדי להימנע מ-dependency. אימות דרך `CRON_SECRET` header. GitHub Action חדש [tender-cron.yml](.github/workflows/tender-cron.yml) קורא ל-dispatch כל 10 דקות + ל-SLA check כל שעה. דורש secrets: `VERCEL_BASE_URL`, `TENDER_CRON_SECRET` ב-GitHub, ו-`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` ב-Vercel env. דף חדש [VendorPortalPage.tsx](digitek-platform/src/pages/VendorPortalPage.tsx) ב-`/vendor-portal` — מציג למשתמש שיש לו tender_personas.persona_role='vendor' את ההצעות/הסכמים/PO/חשבוניות שלו. Sidebar item חדש "פורטל ספקים". |
| 05.06 | **Tenders CRM — פאזה 6 (Dashboard + KPIs) + תיקוני אבטחה**: דף חדש [TendersDashboardPage.tsx](digitek-platform/src/pages/TendersDashboardPage.tsx) ב-`/tenders/dashboard` — דשבורד מנהל מינהל הרכש עם 10 KPIs חיים מ-DB (Lead Time ממוצע, % בזמן, % החזרות מועדה, SLA גורם מקצועי, אבני דרך ללא הערות, hever ספק, הפרות SLA 30 יום, הליכים פעילים/סגורים/מבוטלים), בר עומס פעיל לפי 12 שלבים, רשימת 10 הפרות SLA אחרונות (clickable ל-tender), מילון KPIs לפי האפיון. Sidebar item חדש "דשבורד מכרזים". **תיקוני אבטחה לפי סקירה אוטומטית**: 3 webhook endpoints (signature/tendering/olma) קיבלו `Authorization: Bearer <WEBHOOK_SECRET>` + cap לגודל body (64KB) + 503 אם secret לא מוגדר. ה-notifications dispatcher עבר ל-atomic claim — PATCH עם `status=eq.pending` + `id=in.(...)` מבטיח שרק worker אחד תופס כל שורה. |
| 05.06 | **Tenders — נמעני מייל לבקשת אישור**: migration 016 (`recipient_email` + `subject` + user_id nullable + check constraint) + `enqueueNotification` קיבל `recipientEmail`/`subject` לנמענים חיצוניים. שלב 2 ב-`ApprovalRequestModal` שוכתב — chip-input ריבוי מיילים (Enter/פסיק/רווח/הדבקה), שדה נושא, שדה תיאור. לכל נמען נכנסת שורה נפרדת לתור. |
| 05.06 | **Tenders — Gmail SMTP dispatcher + תיקוני RLS**: migration 017 (INSERT policy על `tender_notifications_queue` — לפני זה INSERT נדחה בשקט, ולכן אפס מיילים נכנסו לתור), migration 018 (סטטוס `processing` בנוסף ל-pending/sent/failed). `/api/notifications/dispatch.ts` שוכתב לדיספאצ' אמיתי דרך `nodemailer` + Gmail SMTP: claim ל-`processing`, שליחה, סימון `sent`/`failed`, גוף HTML RTL בעברית. `package.json` חדש בשורש עם `nodemailer` + types. דורש env vars ב-Vercel: `GMAIL_USER` + `GMAIL_APP_PASSWORD` (App Password של 16 תווים מ-Google → Security → 2FA → App Passwords, **לא** הסיסמה הרגילה). |
| 08.06 | **fix(aiml-calc): רענון מחזיר לשלב 1**. ה-`loadFromStorage` במחשבון AI/ML שמר את `currentStep` ב-localStorage ולכן רענון במסך התוצאות נשאר תקוע על שלב 4. עכשיו `currentStep` תמיד מאופס ל-1 על mount; נתוני הטופס עדיין נשמרים (שלא תאבד עבודה ברענון בטעות), וטעינת חישוב שמור דרך "החישובים שלי" עדיין קופצת לשלב 4 דרך action `LOAD`. |
| 08.06 | **fix(dashboard): הסרת status bar**. נמחק ה-bar העליון בדף הבית שהציג `SYSTEM · OPERATIONAL`, `DB · digitek-dev`, `SYNC · HH:MM:SS`, תאריך ושם משתמש. גם ה-state `now` הוסר. שאר ה-Dashboard ללא שינוי. |
| 09.06 | **fix(sidebar): badge בריפים מחובר ל-DB**. ה-badge ליד "בריפים" היה hardcoded על 24. עכשיו שאילתת `count` ל-`briefs` בעת mount (head:true, בלי משיכת רשומות), עם מבנה גנרי `badgeKey` שמאפשר להוסיף badges נוספים בעתיד. ה-badge מוצג רק אם count > 0. |
| 09.06 | **feat(sidebar): badges לכל המודולים, כולל 0**. הורחב המנגנון לכל פריטי הניווט: `calculator` ו-`tenders` נשלפים חיים מ-Supabase (`calculations`, `tenders`), `layer5` סטטי מתוך `roved5Services.json` (327), `suppliers` סטטי (6 — רשימה hardcoded ב-SuppliersPage). ה-badge מוצג גם כאשר count=0; `null` נחשב "עדיין נטען" ומוסתר עד שהשאילתה חוזרת. |
| 09.06 | **fix(sidebar): הסרת badges מ-layer5 ו-suppliers**. שני המודולים הללו מציגים קאונט מקטלוג סטטי (327 שירותים ברובד 5, 6 ספקים) ולא state אישי של המשתמש. ה-badges נשארו רק היכן שיש עבודה אישית: בריפים, חישובי תכ"ם/AI-ML, הליכי מכרזים. |
| 09.06 | **fix(sidebar): סדר חדש + שם ספקים**. סדר התפריט שונה ל-בית → מחשבון → בריפים → מורשי חתימה → רובד 5 → ספקים זוכים. הפריט "ספקים זוכים - LIBA" שונה ל-"ספקים זוכים דיגיטק". |
| 09.06 | **feat(dashboard): החלפה מלאה ל-"תיק העבודה שלי" (Mockup A)**. הוסרו המדדים הפיננסיים שלא תאמו mindset של מנהל רכש ממשלתי (ערך תיק, מצרפי פעיל, Lead Time, SLA הפרות 30d, sparkline 13 שבועות). במקום: 2 עמודות — שמאל 4 קופסאות פר מודול (חישובים/בריפים/הליכים/רובד 5) עם counts אמיתיים, ימין feed פעילות (נשמר מהקודם). אוניברסלי לכל פרסונה ממשלתית. 3 וריאציות (A/B/C) זמינות ב-`dashboard-mockups.html`. |
| 15.06 | **feat(tenders): העלאת מסמכים תומכים ב-ApprovalRequestModal**. migration 020 — bucket חדש `tender-documents` (private) + 4 RLS policies (insert/select/update/delete) שמאמתים בעלות דרך `(storage.foldername(name))[1] = tender_id`. ב-modal נוסף שדה drag-and-drop בשלב 1: PDF/Word/Excel/תמונה, עד 10MB לקובץ, multi-file, validation מקומי. ב-submit כל קובץ נטען ל-Storage (path: `{tender_id}/approval-{request_id}-{ts}-{name}`) + נוצרת שורה ב-`tender_documents` עם `doc_type` מתאים לפי `requestType` (`budget_approval`/`olma_approval`/`committee_request`/`other`), `file_ref`, `mime_type`, `file_size_bytes`, ו-`metadata.approval_request_id`. רשימת הקבצים מועברת ב-`payload.data.attachments` לתור ההתראות. שלב 3 (סקירה) מציג את רשימת הקבצים המצורפים. הקבצים יופיעו אוטומטית גם ב-Tab "מסמכים" של ההליך. |
| 15.06 | **fix(tenders): סטטוס דרישות שלב — pill טקסטואלי במקום עיגול**. העיגול הריק מימין לכל דרישה ב-StageRequirementsTab נראה כמו radio button לחיץ למשתמש. הוחלף ב-pill טקסטואלי: "ממתין" (`amber-bg`) / "✓ הושלם" (`green-bg`). מסירה אמביגואיות שהדרישה היא ניתנת לסימון ידני — היא נגזרת מ-state ההליך. |
| 16.06 | **feat(tenders): שלב 3 — Brief + Calculation picker אמיתי ב-Tender Wizard**. עד עכשיו שלב 3 בוויזרד יצירת הליך ביקש להזין UUID ידנית. הוחלף ל-2 dropdowns: (1) "בריף קיים" — fetch של עד 50 בריפים אחרונים מ-`briefs` עם title, status, תאריך. (2) "חישוב תכ"ם קיים" — fetch של עד 50 חישובים אחרונים שאינם טיוטה מ-`calculations` עם name, ministry, grand_total, תאריך. אם הרשימה ריקה — hint שמכוון את המשתמש ל-`/briefs` או `/calculator`. נוסף info למודול פרוטוקולים העתידי. |
| 16.06 | **refactor(tenders): שלב 1 — איחוד 12 שלבים ל-2 שלבי-על + ניקוי כותרת ההליך**. ב-Tender 360 היה עומס מידע: WorkflowBar צהוב גדול ("שלב נוכחי: 1. ייזום ותקצוב · נדרש: ..."), StageMap עם 12 שלבים, KPI tile "שלב נוכחי" — שלושתם חזרו על אותה מידע. בנוסף כותרת ההליך הציגה מידע טכני (`48c2de6a`, רף סכום, סוג בחירה) במקום מה שהמשתמש באמת זקוק לו. שינויים: (1) הוספת `STAGE_GROUPS` ב-stagesBaseline.ts — שלב א' מקבץ S0-S4 (הכנה והגשה למינהל הרכש), שלב ב' מקבץ S5-S12 (ביצוע). ה-DB ממשיך עם 12 הקודים — קיבוץ ויזואלי בלבד. (2) StageMap שודרג: 2 כפתורי-קבוצה לחיצים עם chevron, sub-stages מקוננים מתחת. הקבוצה הנוכחית פתוחה ב-default + ספירה `done/total`. (3) WorkflowBar הוסר לחלוטין. (4) כותרת ההליך: title + `כותב/ת: {full_name}` + `נפתח: {date}` + `{₪amount}` (הוסרו tender_number קצר, ministry, amount_band, selection_type). (5) שורת KPI עברה ל: שלב נוכחי (שם קבוצה + sub-stage), נדרש כעת (הדרישה הבולקרית הראשונה), דרישות פתוחות (N/M), Go-Live מתוכנן. fetch של profiles.full_name לפי owner_id ב-useEffect. |
| 16.06 | **feat(tenders): ניהול גרסאות מסמך inline (וריאציה B)**. במקום רשימת מסמכים שטוחה, ה-RequirementDetailPanel מציג כעת טבלת גרסאות עם הרחבת שורה. גרסה אחרונה בולטת ב-`primary-bg`; כל שורה: v#, שם קובץ, מעלה, זמן, status pill (טיוטה/ממתין לחתימה/התבקש שינוי/אושר/נדחה/גרסה ישנה). הרחבה מציגה הערת המעלה + הערת בקשת שינוי (אם יש) + כפתור הורדה (signed URL לשעה) + כפתורי פעולה contextual. **flow מלא**: המאשר רואה "↩ בקש שינוי" על הגרסה האחרונה ב-pending_review → טופס inline → submitting → migration 025 RPC `tender_document_request_revision` (SECURITY DEFINER, מאמת recipient via metadata.recipients, FOR UPDATE lock על הבקשה, מעדכן document.metadata.version_status='revision_requested' + revision_comment). המעלה רואה כפתור "📤 העלה גרסה חדשה (vN+1)" שמופיע **רק** אחרי revision_requested → drag-drop + הערה → RPC `tender_document_upload_version` (אוטוריזציה: owner/admin/recipient, computes max(version)+1, מעדכן את הגרסה הקודמת ל-`superseded`, יוצר row חדש עם parent_version_id ו-pending_review). InlineApprovalForm מוסתר כשהגרסה האחרונה ב-revision_requested — מציג במקום "⏳ ממתינים להעלאת גרסה חדשה". התקציבן יכול לאשר רק את הגרסה המעודכנת ביותר. רכיב חדש [DocumentVersionsTable.tsx](digitek-platform/src/modules/tenders/components/DocumentVersionsTable.tsx). |
| 16.06 | **feat(tenders): חתימה inline מתוך LIBA — בלי לפתוח את המייל**. תקציבן/מאשר שמחובר ל-LIBA רואה את הבקשה ב-Tender 360 → לוחץ "פתח" → אם המייל שלו ב-`metadata.recipients` של הבקשה, מקבל את הטופס המלא (הערות, drag-drop, שם מלא, checkbox, אשר/דחה) **inline ב-RequirementDetailPanel**, בלי לעבור ל-`/approve`. migration 024 — RPC חדש `tender_approval_decide_as_recipient` (SECURITY DEFINER): מאמת `auth.email() ∈ metadata.recipients` (case-insensitive), נועל את ה-request עם FOR UPDATE, בודק state, מעדכן status + מאחסן signature/attachments ב-metadata, סורק־מסמן כל ה-tokens הקשורים כ-used. רכיב חדש [InlineApprovalForm.tsx](digitek-platform/src/modules/tenders/components/InlineApprovalForm.tsx). RequirementDetailPanel: השוואת `currentEmail` מ-`supabase.auth.getUser()` מול recipients — אם match, מציג את הטופס; אחרת, פאנל view-only (כמו לפני). prop חדש `onRefresh` ב-StageRequirementsTab → RequirementDetailPanel → טופס; מוזרם מ-TenderDetailPage כ-`refresh` מ-useTender. החלטה inline מקבילה ל-flow של ה-token: state-guard, sibling-token invalidation, audit trigger קיים. |
| 16.06 | **refactor(tenders): מסך אישור = view-only למי שאינו המאשר**. הוסר ה-banner של "תצוגת אדמין" — המסך נראה זהה לכל מי שמורשה לצפות. בלי token (אדמין/owner) הטופס (הערות, העלאת קובץ, חתימה, checkbox, כפתורי אשר/דחה) מוסתר לחלוטין ובמקומו פאנל מינימליסטי: "החלטה זו תתקבל ע״י [role]. הקישור לחתימה נשלח ל-[email]. ההחלטה תופיע כאן אוטומטית". הוסרה גם הלוגיקה של mint-token-on-the-fly לאדמין שלא בשימוש יותר. הכפתור ב-RequirementDetailPanel שונה ל-"פתח את מסך הבקשה" (במקום "תצוגת אדמין"). תזכורת ל-feature עתידי "הגדרת מורשי חתימה מראש לכל שלב" נוסף ל-CLAUDE.md priorities. |
| 16.06 | **feat(tenders): גישת admin/owner למסך המאשר ללא token**. עד עכשיו `/approve/:id` היה נגיש רק עם token תקף — אדמין/בעל הליך לא יכלו לצפות במה שהמאשר רואה. שודרג: אם אין token ב-URL, ApprovalPage קורא ל-`supabase.auth.getUser()` ואז שולף ישירות מ-`tender_approval_requests` (RLS הקיים מאפשר owner+admin בלבד). מסומן `adminMode=true` שמציג banner מודגש: "🔓 תצוגת אדמין/בעל הליך — ההחלטה תיחתם בשמך". ה-submit בmode זה מטביע token חדש דרך `mint_approval_token` (אדמין מורשה) ואז קורא לאותו `tender_approval_decide_by_token` — ככה כל ההחלטות עוברות באותו audit trail עם signature+attachments. נוסף כפתור "👁 פתח את מסך המאשר (תצוגת אדמין)" ב-RequirementDetailPanel עבור state=awaiting — פותח tab חדש ב-`/approve/:request_id` בלי token. |
| 16.06 | **feat(tenders): שורות דרישה ניתנות להרחבה עם סטטוס עשיר**. עד עכשיו StageRequirementsTab היה בינארי (ממתין/הושלם) ולא הראה שבכלל נשלחה בקשה — כפתור "בקש אישור" המשיך להופיע גם אחרי שליחה, ויצר בקשות כפולות. שודרג: מ-`check(d): boolean` ל-`getStatus(d): RequirementStatus` שמחזיר אחד מ-5 מצבים (`not_started`/`awaiting`/`approved`/`rejected`/`satisfied`). דרישות מבוססות-אישור (budget, olma, professional_review) משתמשות ב-helper `approvalBasedStatus` שמוצא את ה-`approval_request` האחרון מהסוג המתאים. רכיב חדש [RequirementDetailPanel.tsx](digitek-platform/src/modules/tenders/components/RequirementDetailPanel.tsx) שמופיע כשמרחיבים שורה — מציג למאשרי awaiting: נמענים, תפקיד, זמן ששלחו, SLA, סכום, גוף הבקשה, מסמכים מצורפים (signed URL מ-tender-documents bucket), ושורת highlight "🔒 רק `{role}` יכול להחליט". לאישור/דחיה: שם החותם + תאריך + הערות + מסמכים. ה-row לחיץ לפתיחה/סגירה (ChevronIcon מסתובב). 4 status pills: amber=ממתין, blue=ממתין למאשר, green=אושר, red=נדחה. כפתור actions תלוי-state: not_started→primary, rejected→"פתח בקשה חדשה", approved/awaiting→ללא כפתור. |
| 16.06 | **feat(tenders): מסך אישור חיצוני עם token + חתימה אלקטרונית**. עד עכשיו המייל לתקציבן הוביל ל-`/tenders/:id` שדורש login וגם לא היה שם UI לאשר. נוסף flow מלא: migration 022 — `tender_approval_tokens` (request_id, token unique, recipient_email, expires_at=30d, used_at, used_by) + 3 RPCs SECURITY DEFINER: `mint_approval_token` (owner/admin בלבד, מחזיר token), `redeem_approval_token` (אנון מותר, מחזיר snapshot של הבקשה + tender title/number + flags is_used/is_expired), `tender_approval_decide_by_token` (אנון מותר; מעדכן status, decision, comments, decided_at + שומר signature_name + signature_image_path + attachment_paths ב-metadata; מסמן את ה-token כ-used). ApprovalRequestModal מטביע token פר נמען אחרי יצירת ה-approval_request ומעביר אותו ב-`payload.data.approval_token`. dispatcher בונה לינק `/approve/{request_id}?t={token}` ככפתור CTA במייל (במקום קישור גנרי). דף חדש [ApprovalPage.tsx](digitek-platform/src/pages/ApprovalPage.tsx) ב-route public `/approve/:requestId` (ללא AppLayout) — מציג פרטי הבקשה, שדה הערות (חובה בדחיה), drag-and-drop למסמך חתום אופציונלי, שדה שם מלא + checkbox אישור החלטה, ושני כפתורים ✓ אשר / ❌ דחה. ה-trigger הקיים `tender_trg_resolve_sla_on_decision` נסגר אוטומטית מעדכון ה-status. שלב B (חתימה מצוירת ב-canvas) נדחה. |
| 16.06 | **fix(notifications): normalize recipient emails to lowercase**. Resend's free-tier rejects emails with case mismatch from the signup address (`TOMERSANANES10@GMAIL.COM` ≠ `tomersananes10@gmail.com`). Two defenses: dispatcher lowercases the resolved recipient before send; ApprovalRequestModal lowercases on chip commit and on paste (keeps shared contacts pool clean). הפעלת dispatcher ידנית דרך curl אישרה: 2 הודעות שהיו תקועות (מ-5.6 ו-15.6) נשלחו בהצלחה אחרי התיקון. הקומיט: `c722e36` (merge to main). |
| 15.06 | **refactor(tenders): מעבר מ-Gmail SMTP ל-Resend + merge develop→main**. ה-cron של GitHub Actions לא רץ מעולם כי `tender-cron.yml` היה רק ב-develop, ו-scheduled workflows רצים רק מהענף הדיפולטיבי (=main). שני pending מ-5.6 ו-15.6 הוכיחו שאף dispatcher לא הופעל. בוצע merge develop→main (51 commits, `005e55a`). במקביל, ה-dispatcher (`api/notifications/dispatch.ts`) עבר מ-`nodemailer` + Gmail SMTP ל-Resend SDK. Env vars חדשים: `RESEND_API_KEY` (חובה), `RESEND_FROM` (אופציונלי, default `LIBA — מכרזים <onboarding@resend.dev>`), `PUBLIC_BASE_URL` (אופציונלי, default `https://calculator-ashen-delta-32.vercel.app`). הוסר ה-hardcoded `liba.vercel.app` שלא היה קיים מעולם. `package.json` בשורש עודכן: `nodemailer`/`@types/nodemailer` הוסרו, נוסף `resend@^4.0.1`. דרוש מהמשתמש: יצירת חשבון Resend חינמי, הגדרת `RESEND_API_KEY` + `CRON_SECRET` ב-Vercel prod env, ו-GitHub secrets `VERCEL_BASE_URL` + `TENDER_CRON_SECRET`. ב-free tier של Resend ללא דומיין — אפשר לשלוח **רק לכתובת שאיתה נרשמנו**. |
| 15.06 | **feat(tenders): Autofill מיילים מ-pool משותף**. migration 021 — טבלה חדשה `email_contacts` (email UNIQUE, use_count, last_used_at/by, first_seen_at/by) + RPC `record_email_contact(p_email)` (SECURITY DEFINER, regex validation, atomic upsert עם `use_count++`). RLS: read/insert/update לכל authenticated, delete לאדמינים בלבד. מודול חדש `tenders/lib/emailContacts.ts` עם `searchEmailContacts(prefix, exclude)` ו-`recordEmailContact(email)`. ב-ApprovalRequestModal — dropdown autocomplete מתחת ל-chip input של המיילים: מציג עד 8 הצעות (אם input ריק → המשומשים ביותר; אם יש תוכן → פילטור ב-ilike), keyboard nav (↑↓ Enter Esc), `onMouseDown` ב-items כדי לשמור פוקוס ב-input. ב-submit נקרא `recordEmailContact` לכל מייל (void / non-blocking). |

---

## 10. שיחה אחרונה

> **תאריך**: 05.06.2026
> **נושא**: Tenders CRM — פאזה 4 (Stage-Driven Actions — מוקאפ C)

### החלטות מקדימות
- המשתמש ביקש לראות 3 מוקאפים לכיוון UX לפני פיתוח: נוצר [mockups-tenders-phase4.html](mockups-tenders-phase4.html) עם 3 וריאציות (A/B/C)
- **המשתמש בחר מוקאפ C** — Stage-Driven Workflow Bar
- היקף מוסכם: תשתית גנרית מלאה + 5 actions לשלבים S1-S4 (לא לכל 12 השלבים)

### מה נבנה
**תשתית גנרית** [src/modules/tenders/components/](digitek-platform/src/modules/tenders/components/):
- [WorkflowBar.tsx](digitek-platform/src/modules/tenders/components/WorkflowBar.tsx) — פס workflow בראש Tender 360. מציג שלב נוכחי, פעולה הבאה, progress, כפתור "המשך לפעולה ←". משנה צבעים: רגיל / amber במצב gate / dashed במצב terminal
- [StageMap.tsx](digitek-platform/src/modules/tenders/components/StageMap.tsx) — sticky sidebar עם 12 השלבים. צבעים: ירוק=done, כחול=current, אפור=future, קו חצוץ=skipped (לפי G1/G7)
- [StageRequirementsTab.tsx](digitek-platform/src/modules/tenders/components/StageRequirementsTab.tsx) — Tab חדש (ראשון) עם checklist של דרישות לשלב הנוכחי + כפתורי inline ליצירת ה-action
- [GateValidationModal.tsx](digitek-platform/src/modules/tenders/components/GateValidationModal.tsx) — בודק requirements לפני `tender_advance`. אם blocker פתוח — מציג רשימה ולא מאפשר. אם הכל בסדר — מבקש הערות ומבצע
- [Modal.tsx](digitek-platform/src/modules/tenders/components/Modal.tsx) — wrapper גנרי עם overlay + ESC + StepDots component משותף

**הגדרות declarative** [stageRequirements.ts](digitek-platform/src/modules/tenders/data/stageRequirements.ts):
- כל requirement = predicate על TenderDetailData + action הצבעה. כדי להוסיף שלב חדש בעתיד — מספיק להוסיף entry לטבלת `STAGE_REQUIREMENTS`. `evaluateStageRequirements()` עושה את החישוב + מחזיר `{ canAdvance, pending, progressPct }`
- בפאזה זו הוגדרו: S1 (budget_approved + tender_number), S2 (olma_approved), S3 (committee_outbound_approved), S4 (tender_number_external + professional_review_approved)

**5 Action Modals** [src/modules/tenders/components/modals/](digitek-platform/src/modules/tenders/components/modals/):
- [ApprovalRequestModal.tsx](digitek-platform/src/modules/tenders/components/modals/ApprovalRequestModal.tsx) — wizard 3 שלבים גנרי לכל ApprovalRequestType. משמש ל-budget/olma/professional_review. מחשב SLA אמיתי דרך `computeDueAt` מ-slaEngine. עבור budget_approval — יוצר גם רשומת `tender_budgets` בסטטוס pending
- [TenderNumberModal.tsx](digitek-platform/src/modules/tenders/components/modals/TenderNumberModal.tsx) — modal פשוט להזנת מס' תיחור פנימי או חיצוני. כולל אזהרת סיכון #9 (לא להזין שנה)
- [CommitteeProtocolModal.tsx](digitek-platform/src/modules/tenders/components/modals/CommitteeProtocolModal.tsx) — wizard 3 שלבים ליצירת פרוטוקול ועדה (יציאה/זכיה). decision options: approved/returned/completion/rejected. מציג הסבר על השפעת ההחלטה על FSM
- חיווט אוטומטי לפי `activeAction` ב-TenderDetailPage — כל action מ-StageRequirementsTab או מ-WorkflowBar פותח את ה-modal המתאים

**עדכון TenderDetailPage**:
- ה-layout השתנה ל-2 עמודות (main content + StageMap sidebar)
- WorkflowBar בראש לפני ה-KPIs
- "דרישות שלב" Tab חדש כראשון (default)
- 7 modal handlers בתחתית

### אימות
- ✅ `npx tsc --noEmit` עבר נקי
- ✅ `npx vite build` עבר נקי (1.46MB / 380KB gzipped)
- ⚠️ לא נבדק ידנית בדפדפן — צריך לאמת ב-Vercel preview שהזרימה עובדת end-to-end עם הליך אמיתי

### עוד לא בוצע
- [ ] **פאזה 4.5**: actions ל-S5 (הפצת פניה לספקים), S6 (רישום הצעות + ניקוד), S7 (פרוטוקול זכיה — modal כבר קיים, צריך רק requirements), S8 (חוזה + ערבות + ביטוח + חתימה), S9 (PO), S10-S11 (אבני דרך + חשבוניות), S12 (הערכת ספק)
- [ ] **פאזה 5**: אינטגרציות חיצוניות + פורטל ספקים + cron ל-SLA breaches + dispatcher אמיתי לתור התראות
- [ ] **פאזה 6**: דשבורדים, דוחות KPI, פאנל אדמין מורחב

---

## (היסטוריית שיחה קודמת — פאזה 3)

> **תאריך**: 05.06.2026
> **נושא**: Tenders CRM — פאזה 3 (Core UI: Tender List + Wizard + Tender 360)

### מה נבנה בפאזה 3
**3 דפים חדשים** [src/pages/](digitek-platform/src/pages/):
- [TenderListPage.tsx](digitek-platform/src/pages/TenderListPage.tsx) — `/tenders` — סטטיסטיקות (4 קופסאות), חיפוש, פילטר לפי שלב, רשימת כרטיסי הליכים עם amount band + stage badge. החלף את ה-stub של `/approvals`.
- [TenderWizardPage.tsx](digitek-platform/src/pages/TenderWizardPage.tsx) — `/tenders/new` — wizard 4 שלבים: פרטים → פיננסים → קישורים → סקירה. ולידציה פר שלב + הצגת תוצאות Gateway G1/G7/G9 חיים (אזהרות אלמ"ה, מסלול פשוט, תבנית חוזה). יצירה דרך RPC `tender_create`.
- [TenderDetailPage.tsx](digitek-platform/src/pages/TenderDetailPage.tsx) — `/tenders/:id` — Tender 360 עם 6 Tabs: Overview (פרטים + תקציב + צוות + progress bar 12 שלבים), Documents, Committees (protocols), Vendors (proposals), Milestones (+ contracts), Audit log.

**2 hooks חדשים** [src/modules/tenders/hooks/](digitek-platform/src/modules/tenders/hooks/):
- [useTenderList.ts](digitek-platform/src/modules/tenders/hooks/useTenderList.ts) — fetch מ-`tenders` עם פילטרים
- [useTender.ts](digitek-platform/src/modules/tenders/hooks/useTender.ts) — fetch מקבילי של 9 ישויות לתיק מלא + wrappers `createTender` ו-`advanceTender`

**Routing** [src/App.tsx](digitek-platform/src/App.tsx) + [src/components/Sidebar.tsx](digitek-platform/src/components/Sidebar.tsx):
- 3 routes חדשים: `/tenders`, `/tenders/new`, `/tenders/:id`
- `/approvals` → `<Navigate to="/tenders">` (תאימות לאחור)
- Sidebar "מורשי חתימה" עכשיו → `/tenders` (badge הוסר — יחזור בפאזה 4 עם count אמיתי של אישורים ממתינים)

### אימות
- ✅ `npx tsc --noEmit` עבר נקי
- ✅ `npx vite build` עבר נקי (132KB CSS, 374KB JS gzipped)
- ⚠️ לא נבדק ידנית בדפדפן — דורש מהמשתמש לפתוח את ה-preview ב-Vercel ולוודא:
  - `/tenders` עולה ומציג רשימה ריקה (אין הליכים עדיין ב-DB)
  - לחיצה על "+ הליך חדש" פותחת את ה-Wizard
  - מילוי 4 השלבים יוצר tender ומפנה ל-`/tenders/:id`
  - 6 ה-Tabs ב-Detail עולים

### עוד לא בוצע
- [ ] **פאזה 4**: actions בתוך ה-Tabs — יצירת בקשת אישור, רישום הצעה, יצירת חוזה, יצירת אבן דרך, הזנת הערכת ספק
- [ ] **פאזה 4**: dropdowns לבחירת brief/calculation בויזרד (במקום input ידני של UUID)
- [ ] **פאזה 5**: אינטגרציות + פורטל ספקים + Vercel cron
- [ ] **פאזה 6**: דשבורדים, דוחות KPI

---

## (היסטוריית שיחה קודמת — פאזה 2)

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

✅ **Tenders CRM — כל 6 הפאזות הסתיימו (5+6.06.2026)**

QA פעולות מומלצות מהמשתמש:
1. צור הליך חדש דרך `/tenders/new`
2. עבור את כל 12 השלבים מקצה לקצה — בדוק שכל אקציה עובדת
3. בדוק את הדשבורד ב-`/tenders/dashboard` שמציג נתונים נכונים
4. בדוק `/vendor-portal` (דורש שיוך כ-persona vendor להליך)

עדיפויות פיתוח עתידיות (אחרי QA):

### 📧 שיפורי גוף המייל (נדחה ל-15.06+)
תזכורת: המייל עובד אבל יש מקום לשיפור תוכן. לשפר כאשר יש דקות פנויות:
1. [ ] **תרגום `request_type` לעברית** — כרגע מופיע "budget_approval" באנגלית כקוד טכני. צריך לפי `REQUEST_TYPE_LABELS` ב-`ApprovalRequestModal.tsx`. הקובץ: [api/notifications/dispatch.ts](api/notifications/dispatch.ts) (פונקציה `buildHtmlBody`, שורה ~82 — משתנה `reqType`)
2. [ ] **שם השולח** — לשנות מ-`LIBA — מכרזים` ל-`דיגיטק - מורשי חתימה` (או מה שהמשתמש יחליט) דרך env var `RESEND_FROM` ב-Vercel
3. [ ] **דומיין משלך** — לאפשר שליחה לנמענים שאינם המשתמש המקורי. דורש: קניית דומיין (~50₪/שנה), אימות ב-resend.com/domains, עדכון `RESEND_FROM` ל-`tenders@your-domain.com`
4. [ ] **טמפלייט עשיר יותר** — לוגו, צבעי מותג, כפתור CTA במקום לינק טקסט, חתימת המערכת
5. [ ] **שיפורי SLA** — להציג זמן מדויק (X ימים נותרו) במקום רק תאריך יסתיים

### 🔜 פיצ'רים אחרים

#### 🖊️ הגדרת מורשי חתימה לכל שלב מראש (16.06)
**הבעיה**: כיום מורשה החתימה נקבע ב-runtime — בלחיצה על "בקש אישור" המשתמש מקליד כתובת מייל בטופס. אין רשימה מוגדרת מראש של מי חותם על מה. שגיאת הקלדה / כתובת לא נכונה = החלטה נופלת ע״י לא-מורשה.
**הפתרון המוצע**:
1. ב-S0 (preconditions) של הליך — מסך חדש שמגדיר מפת חתימות: לכל role מקצועי (תקציבן המערך, מנהל אלמ"ה, גורם מקצועי, חברי ועדה...) נבחר משתמש/מייל מתוך מאגר.
2. ApprovalRequestModal יציע אוטומטית את המייל מהמפה במקום שדה ריק.
3. ב-DB: טבלה חדשה `tender_signers` (tender_id, role, email/user_id, display_name) או הרחבה של `tender_personas`.
4. UI מציג בכל שלב "המורשה לחתום בשלב הזה: X" — שקיפות מלאה.
5. אדמין יכול לערוך גם אחרי שההליך התחיל (עם audit).

1. [ ] _הכנס כאן את הפיצ'ר הבא_
