# Tender Signers — Design Spec

> **תאריך**: 20.06.2026
> **סטטוס**: Approved (brainstorming) — pending implementation plan
> **מוקאפ נבחר**: A — שלב בוויזרד + כרטיס Sidebar
> **מוקאפים**: [A](../../../mockups-signers-A.html) · [B](../../../mockups-signers-B.html) · [C](../../../mockups-signers-C.html)

## Context

ה-Tenders CRM שוכתב לאחרונה ל-9 שלבים (T0–T8). חלק מהשלבים דורשים בקשת אישור או חתימה ממורשה ספציפי: T1 (אישור תקציבי), T3 ו-T7 (3 חתימות לפי סדר: משפטן → חשב → סמנכ"ל). כיום, בכל פעם שכותב הבריף שולח בקשה הוא **מקליד מייל ידנית** ב-chip input. אין רשימה מוגדרת של מורשי חתימה להליך, ושגיאת הקלדה פירושה שהחלטה נופלת ע"י מישהו לא-מורשה.

מטרת הפיצ'ר: לאפשר לכותב הבריף להגדיר **פעם אחת בתחילת ההליך** מי המורשים לחתום, ולעדכן ברציפות לאורך ההליך עם היסטוריה גלויה. ApprovalRequestModal יבצע pre-fill אוטומטי מהרשימה.

## Goals & Non-Goals

**Goals**
- צוות חתימות פר-הליך עם 5 תפקידים סטנדרטיים + בחירה אילו רלוונטיים
- הגדרה ראשונית בוויזרד יצירת הליך (אופציונלי, ניתן לדלג)
- כרטיס Sidebar קבוע ב-Tender 360 עם תצוגה + עריכה
- החלפת מורשה עם שמירת היסטוריה גלויה
- pre-fill ב-ApprovalRequestModal ו-SignatureRequestModal לפי תפקיד

**Non-Goals**
- אין רובד ארגוני (מורשי חתימה ברמת המשרד) — נשמר לעתיד
- אין auto-cancel של בקשות in-flight בעת החלפה — הטוקן הישן נשאר תקף
- אין שכבת הרשאות חדשה — מי שיכול לערוך את ההליך יכול לערוך את הצוות (owner/admin)

## Decisions

| נושא | החלטה |
|------|-------|
| גישת UI | מוקאפ A — שלב בוויזרד + כרטיס Sidebar |
| הגדרה ראשונית | אופציונלי בוויזרד T0; אפשר להוסיף/לשנות בכל שלב |
| קטלוג תפקידים | 5 קבועים (ר' Roles Catalog למטה) |
| בחירה פר-הליך | המשתמש מסמן אילו תפקידים רלוונטיים להליך הזה |
| היסטוריה | החלפה עם versions (replaces_id + replaced_at). הישן ב-styling מעומעם בכרטיס |
| בקשות in-flight | לא נוגעים. הטוקן הישן עדיין תקף |
| תקציבן vs חשב | 2 תפקידים נפרדים בקטלוג |
| Pre-fill behavior | המייל של ה-active signer הרלוונטי נכנס אוטומטית לרשימת הנמענים; אפשר להוסיף CC או להחליף |

## Roles Catalog

| Code | Label | משמש בשלבים | מקור הקוד |
|------|-------|------------|----------|
| `budget_officer` | תקציבן | T1 — אישור תקציבי | קיים |
| `legal_professional` | משפטן | T3, T7 — חתימה ראשונה | קיים |
| `treasurer` | חשב | T3, T7 — חתימה שנייה; T2/T6 — ועדה | **חדש** |
| `signatory` | סמנכ"ל אחראי תורן | T3, T7 — חתימה אחרונה | קיים |
| `committee_head` | מנהלת ועדת מכרזים | T2, T6 — זימון ועדה | **חדש** |

**Breaking change בקוד הקיים**: `SignatureRequestModal` משתמש כיום ב-`signerRole='budget_officer'` עבור חתימת ה"חשב" ב-T3/T7. נחליף ל-`signerRole='treasurer'`. גם ב-`stageRequirements.ts` ב-`REQ_SIGNATURE_TREASURER_OUTBOUND` ו-`REQ_SIGNATURE_TREASURER_WINNER` נחליף את `approvalBasedByRole('contract_signature', 'budget_officer')` ל-`'treasurer'`. ב-`workflowEngine.ts` ב-`WORKFLOW_T3` ו-`WORKFLOW_T7` ב-step `sig_treasurer` נחליף את `assigneeRole: 'budget_officer'` ל-`'treasurer'`.

מאחר וה-`PersonaRole` enum הוא TypeScript בלבד (לא DB enum), השינוי מקומי לתיקיית tenders.

## Data Model

### Migration 029 — `tender_signers`
```sql
CREATE TABLE public.tender_signers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN (
    'budget_officer',
    'legal_professional',
    'treasurer',
    'signatory',
    'committee_head'
  )),
  display_name text NOT NULL,
  email text NOT NULL CHECK (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  replaced_at timestamptz NULL,
  replaced_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  replaces_id uuid REFERENCES public.tender_signers(id) ON DELETE SET NULL,
  active boolean GENERATED ALWAYS AS (replaced_at IS NULL) STORED
);

-- Partial unique index — only ONE active signer per role per tender
CREATE UNIQUE INDEX tender_signers_one_active_per_role
  ON public.tender_signers (tender_id, role)
  WHERE replaced_at IS NULL;

CREATE INDEX tender_signers_tender_idx ON public.tender_signers (tender_id);

ALTER TABLE public.tender_signers ENABLE ROW LEVEL SECURITY;

-- SELECT: tender owner / admin / participants
CREATE POLICY "Signers visible to tender owner + admins"
  ON public.tender_signers FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.tenders t WHERE t.id = tender_id AND t.owner_id = auth.uid())
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  );

-- INSERT/UPDATE: same
CREATE POLICY "Owner + admin manage signers"
  ON public.tender_signers FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.tenders t WHERE t.id = tender_id AND t.owner_id = auth.uid())
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  );
```

### RPCs (SECURITY DEFINER)

**`tender_signer_assign(p_tender_id, p_role, p_name, p_email)`** — מוסיף signer חדש לתפקיד שטרם הוגדר. כשל אם כבר יש active לתפקיד הזה.

**`tender_signer_replace(p_old_id, p_new_name, p_new_email)`** — מחליף signer קיים:
1. בודק שה-old רלוונטי (active, שייך להליך שהמשתמש יכול לערוך)
2. יוצר שורה חדשה עם `replaces_id = p_old_id`
3. מעדכן את הישן: `replaced_at = now(), replaced_by = auth.uid()`
4. הכל בטרנזקציה אחת
5. כותב audit log

**`tender_signer_update(p_id, p_name, p_email)`** — עדכון פרטים בלבד (תיקון הקלדה). לא יוצר גרסה חדשה. כותב audit log.

**`tender_signer_remove(p_id)`** — מסמן `replaced_at = now()` בלי שורה מחליפה. שימושי כש"הליך לא צריך יותר את התפקיד".

כל ה-RPCs כותבים ל-`tender_audit_log` עם `entity_type='signer'`.

## UI Components

### A. Wizard step חדש — `TenderWizardSignersStep`
מקום: בין שלב 3 (בריף+פרוטוקול) לשלב 4 (סקירה). Wizard גדל ל-5 שלבים.

State במ-TenderWizardPage:
```typescript
type RolePick = { role: SignerRole; name: string; email: string } | null
const [signers, setSigners] = useState<Record<SignerRole, RolePick>>({
  budget_officer: null, legal_professional: null,
  treasurer: null, signatory: null, committee_head: null,
})
```

UI:
- כותרת + הסבר ("מי החותמים בהליך?")
- 5 כרטיסי תפקיד (גם כאלה שלא הוגדרו). על כל כרטיס: שם תפקיד, תיאור, שדות שם+מייל (placeholder), כפתור "✕" להסרה (אם הוקלד משהו)
- **השלב קיים תמיד** בוויזרד (לא ניתן לדלג). אבל **השדות אופציונליים** — ניתן ללחוץ "המשך" עם 0 תפקידים מולאים
- אם תפקיד מולא חלקית (שם בלי מייל / להיפך) — חסום submit עם הודעת ולידציה ליד השדה
- כל מייל שמוקלד עובר regex לפני submit

ב-`handleSubmit` של הוויזרד:
- אחרי `createTender` ולפני uploads של מסמכים (או אחרי, סדר לא קריטי)
- לכל תפקיד שמולא: קריאה ל-RPC `tender_signer_assign`
- שגיאה לא חוסמת — מציגה toast והממשיכה. המשתמש יוכל להוסיף בכרטיס Sidebar אח"כ

### B. כרטיס Sidebar קבוע — `SignersSidebar`
מקום: ב-`TenderDetailPage`, ב-`layoutGrid` מתחת ל-`StageMap` (או מעליו).

תוכן:
- כותרת: `👥 צוות חתימות (N)` + כפתור `✎ ערוך`
- שורה לכל תפקיד שהוגדר: avatar (initials), שם, תפקיד, מייל. כפתור hover: ✎ ערוך
- שורה לכל תפקיד שחסר ונדרש: avatar אזהרה, "לא הוגדר", "חסר — נדרש לפני T#"
- אם יש שורות replaced — אזור "↩ היסטוריה" מתחת, מעומעם, עם שם + "הוחלפה ב-{date}"

### C. Modal עריכה — `SignersEditModal`
נפתח בלחיצה על "ערוך" בכרטיס (או על שורת תפקיד ספציפי). זהה ל-wizard step מבחינת UI:
- 5 כרטיסי תפקיד, מילוי שם+מייל
- שני tabs לכל תפקיד מוגדר: **"עדכן פרטים"** (RPC update) או **"החלף אדם"** (RPC replace)
- אם תפקיד ריק → "הוסף" (RPC assign)
- כפתור 🗑 "הסר תפקיד" (RPC remove)

### D. שילוב ב-ApprovalRequestModal
ב-state ההתחלתי של `emails`, כשהמודאל נפתח, נשלוף מ-`tender_signers`:
- מיפוי `requestType → role`:
  - `budget_approval` → `budget_officer`
  - `committee_outbound` → `committee_head`
  - `committee_winner` → `committee_head`
  - `contract_signature` → `requestedRole` prop (אם הועבר; אחרת לא pre-fill)
- pre-fill `emails: [signer.email]` אם נמצא active. המשתמש יכול להוסיף עוד או למחוק (chip input קיים)

### E. שילוב ב-SignatureRequestModal
כיום מקבל `signerRole` prop. נשנה רק:
- בקריאה ב-`TenderDetailPage` של T3/T7 ה"חשב" — נעביר `'treasurer'` במקום `'budget_officer'`
- ה-pre-fill האוטומטי קורה דרך ApprovalRequestModal (שהוא wrapper-base)

## Data Flow

### יצירת הליך עם signers
```
TenderWizard (5 שלבים)
  → handleSubmit
    → createTender (RPC tender_create)
    → uploadDocument(brief) × 1
    → uploadDocument(protocol_initial) × 1
    → for role in signers: tender_signer_assign(tender_id, role, name, email)
  → navigate /tenders/:id
```

### החלפת signer
```
SignersSidebar
  → click "ערוך"
  → SignersEditModal
    → user picks "החלף אדם" on existing role
    → submit: RPC tender_signer_replace(old_id, new_name, new_email)
  → close modal, refresh useTender hook
  → Sidebar מציג את החדש; הישן בחלק "↩ היסטוריה"
```

### Pre-fill בבקשת אישור
```
TenderDetailPage
  → user clicks "בקש אישור תקציבי"
  → ApprovalRequestModal opens with requestType='budget_approval'
  → modal queries useTender.signers (כבר נטען בשליפת ה-detail)
  → finds active budget_officer → pre-fills email
  → user can add CCs or remove
```

## הרחבת `useTender` hook
הוספת fetch ל-`tender_signers` כחלק מה-batch של ה-detail (parallel SELECT):
```typescript
interface TenderDetailData {
  // ... קיים
  signers: TenderSigner[]  // כולל active + history
}
```

Type חדש:
```typescript
export type SignerRole =
  | 'budget_officer' | 'legal_professional' | 'treasurer'
  | 'signatory' | 'committee_head'

export interface TenderSigner {
  id: string
  tender_id: string
  role: SignerRole
  display_name: string
  email: string
  added_by: string | null
  added_at: string
  replaced_at: string | null
  replaced_by: string | null
  replaces_id: string | null
  active: boolean
}
```

Helper:
```typescript
function activeByRole(signers: TenderSigner[], role: SignerRole): TenderSigner | undefined {
  return signers.find(s => s.active && s.role === role)
}
```

## Validation & Error Handling

| תרחיש | טיפול |
|------|-------|
| יוויזרד — שם בלי מייל / להיפך | חסימת submit, הצגת שגיאת ולידציה ליד השדה |
| מייל לא תקין (regex) | אותו דבר |
| RPC נכשל ב-wizard submit | toast עם השגיאה, ההליך נוצר בכל מקרה. המשתמש יכול לתקן בכרטיס |
| ניסיון להוסיף תפקיד שכבר active | RPC מחזיר שגיאה "תפקיד זה כבר מוגדר; השתמש בעדכן או החלף" |
| ניסיון לערוך signer שלא קיים / לא שלך | RLS חוסם — מוצג "שגיאת הרשאה" |
| תפקיד חסר כשנדרש (פתיחת ApprovalRequestModal) | המודאל נפתח כרגיל בלי pre-fill. המשתמש מקליד ידנית |
| תפקיד חסר ב-Sidebar | מוצג באנר אזהרה צהוב "⚠️ חסר — נדרש לפני T#" |

## Migration Path & Backwards Compatibility

DB ריק → אין הליכים קיימים שצריך לטפל בהם. הטבלה החדשה לא משפיעה על מה שכבר עובד.

שינוי `budget_officer → treasurer` ב-3 קבצי קוד (`SignatureRequestModal` callers, `stageRequirements.ts`, `workflowEngine.ts`) — מקומי, לא DB enum, ולכן לא דורש migration נפרד.

## Testing Strategy

**Manual QA** (לפני merge):
1. צור הליך דרך ויזרד — הגדר את 3 התפקידים העיקריים (תקציבן, משפטן, סמנכ"ל)
2. ודא ב-Sidebar שכולם מופיעים, חסר מסומן ב-amber
3. ערוך תקציבן → עדכן פרטים. ודא שלא נוצרה שורת history
4. ערוך תקציבן → החלף אדם. ודא שהישן עבר ל-history, החדש active
5. צור הליך **בלי** signers ב-wizard. ודא שאפשר להוסיף מ-Sidebar
6. פתח בקשת אישור תקציבי. ודא pre-fill עם המייל של התקציבן
7. T3 חתימת חשב: ודא pre-fill עם המייל של ה-`treasurer`
8. ודא ש-`SignerRow` עם state replaced לא מציג ✎ או כפתור החלפה

**Type-check + build**:
```bash
cd digitek-platform && npx tsc --noEmit
```

## Out of Scope (לעתיד)
- מאגר ארגוני של מורשי חתימה ברמת משרד (אבל הקטלוג יכול להישען עליו בעתיד)
- שכפול signers בין הליכים (template-based onboarding)
- audit log dedicated לטאב "מורשי חתימה" עם timeline ויזואלי
- הרשאות granular: למשל "המשפטן יכול לראות אבל לא לערוך"
- אינטגרציה עם ה-email_contacts pool — autocomplete מבוסס pool בשדה המייל

## Files to Touch (סיכום)

**חדשים**:
- `digitek-platform/supabase/migrations/029_tender_signers.sql`
- `digitek-platform/src/modules/tenders/components/SignersSidebar.tsx` + `.module.css`
- `digitek-platform/src/modules/tenders/components/modals/SignersEditModal.tsx`
- `digitek-platform/src/pages/TenderWizardSignersStep.tsx` (or inline בתוך TenderWizardPage)
- `digitek-platform/src/modules/tenders/lib/signers.ts` (RPC wrappers + activeByRole)

**שינויים**:
- `digitek-platform/src/modules/tenders/types.ts` — `SignerRole`, `TenderSigner`
- `digitek-platform/src/modules/tenders/hooks/useTender.ts` — fetch signers + return
- `digitek-platform/src/pages/TenderWizardPage.tsx` — שלב חדש 4
- `digitek-platform/src/pages/TenderDetailPage.tsx` — embed `SignersSidebar`
- `digitek-platform/src/modules/tenders/components/modals/ApprovalRequestModal.tsx` — pre-fill emails מ-signers
- `digitek-platform/src/modules/tenders/components/modals/SignatureRequestModal.tsx` — קריאה ל-T3/T7 חשב משנה ל-`treasurer`
- `digitek-platform/src/modules/tenders/data/stageRequirements.ts` — REQ_SIGNATURE_TREASURER_* משנה ל-`treasurer`
- `digitek-platform/src/modules/tenders/workflowEngine.ts` — sig_treasurer step משנה ל-`treasurer`
- `CLAUDE.md` — תיעוד הפיצ'ר
