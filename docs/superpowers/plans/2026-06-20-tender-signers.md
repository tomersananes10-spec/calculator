# Tender Signers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** הוספת מודול "מורשי חתימה פר-הליך" — צוות של עד 5 תפקידים מוגדרים בוויזרד, ניתן לעריכה והחלפה עם היסטוריה, ועם pre-fill אוטומטי ב-ApprovalRequestModal.

**Architecture:** טבלה חדשה `tender_signers` עם versioning (replaces_id + replaced_at). שלב חדש בוויזרד יצירת הליך. כרטיס Sidebar קבוע ב-Tender 360 שמציג את הצוות הפעיל + history. מודאל עריכה משותף בין הוויזרד ל-Sidebar. ApprovalRequestModal שולף את ה-active signer לפי mapping role↔requestType.

**Tech Stack:** React 19 + TypeScript + Vite, Supabase PostgreSQL + RLS, RPCs SECURITY DEFINER. אין test framework בפרויקט — verification היא `npx tsc --noEmit` + QA ידני ב-Vercel preview.

## Global Constraints

- **שפה**: כל UI טקסט בעברית, RTL, פונט Heebo
- **Styling**: CSS Modules (קובץ `.module.css` ליד כל component)
- **משתני CSS**: `--primary`, `--green`, `--amber`, `--border`, וכו' מ-`theme.css` הקיים — לא לקודד צבעים ישירות
- **DB ops**: דרך Supabase MCP (`apply_migration`, `execute_sql`). אין `psql`/`supabase CLI`
- **Verification per task**: `cd digitek-platform && npx tsc --noEmit` חייב לעבור עם Exit 0
- **Commits**: כל task מסתיים ב-commit + push ל-`develop` (deploy אוטומטי ל-Vercel preview)
- **Project IDs**: Supabase project_id = `ildwyncxoytvallkrqjo`

**Spec reference**: [docs/superpowers/specs/2026-06-20-tender-signers-design.md](../specs/2026-06-20-tender-signers-design.md)

---

## Task 1: DB Migration 029 — tender_signers table + RPCs

**Files:**
- Create: `digitek-platform/supabase/migrations/029_tender_signers.sql`

**Interfaces:**
- Produces (DB):
  - Table `public.tender_signers`
  - RPC `public.tender_signer_assign(p_tender_id uuid, p_role text, p_name text, p_email text) RETURNS uuid`
  - RPC `public.tender_signer_replace(p_old_id uuid, p_new_name text, p_new_email text) RETURNS uuid`
  - RPC `public.tender_signer_update(p_id uuid, p_name text, p_email text) RETURNS void`
  - RPC `public.tender_signer_remove(p_id uuid) RETURNS void`

- [ ] **Step 1: Write migration SQL** in `digitek-platform/supabase/migrations/029_tender_signers.sql`:

```sql
-- 029_tender_signers.sql
-- צוות מורשי חתימה פר-הליך עם versioning (החלפה שומרת היסטוריה).

-- 1. Table
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
  display_name text NOT NULL CHECK (length(display_name) >= 2),
  email text NOT NULL CHECK (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  replaced_at timestamptz NULL,
  replaced_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  replaces_id uuid REFERENCES public.tender_signers(id) ON DELETE SET NULL,
  active boolean GENERATED ALWAYS AS (replaced_at IS NULL) STORED
);

CREATE UNIQUE INDEX tender_signers_one_active_per_role
  ON public.tender_signers (tender_id, role)
  WHERE replaced_at IS NULL;

CREATE INDEX tender_signers_tender_idx ON public.tender_signers (tender_id);

-- 2. RLS
ALTER TABLE public.tender_signers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signers visible to tender owner + admins"
  ON public.tender_signers FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.tenders t WHERE t.id = tender_id AND t.owner_id = auth.uid())
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  );

CREATE POLICY "Owner + admin manage signers"
  ON public.tender_signers FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.tenders t WHERE t.id = tender_id AND t.owner_id = auth.uid())
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  );

-- 3. RPC: assign
CREATE OR REPLACE FUNCTION public.tender_signer_assign(
  p_tender_id uuid,
  p_role text,
  p_name text,
  p_email text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- אימות הרשאה
  IF NOT EXISTS (
    SELECT 1 FROM public.tenders t
    WHERE t.id = p_tender_id
      AND (t.owner_id = auth.uid()
           OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true)
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- בדיקה שאין כבר active לתפקיד הזה (partial unique index היה זורק שגיאה מעורפלת)
  IF EXISTS (
    SELECT 1 FROM public.tender_signers
    WHERE tender_id = p_tender_id AND role = p_role AND replaced_at IS NULL
  ) THEN
    RAISE EXCEPTION 'תפקיד % כבר מוגדר. השתמש בעדכון או החלפה.', p_role;
  END IF;

  INSERT INTO public.tender_signers (tender_id, role, display_name, email, added_by)
  VALUES (p_tender_id, p_role, p_name, lower(p_email), auth.uid())
  RETURNING id INTO v_id;

  PERFORM public.tender_audit_log_write(
    p_tender_id, 'signer', v_id, 'assigned',
    NULL,
    jsonb_build_object('role', p_role, 'name', p_name, 'email', lower(p_email)),
    NULL
  );

  RETURN v_id;
END;
$$;

-- 4. RPC: replace
CREATE OR REPLACE FUNCTION public.tender_signer_replace(
  p_old_id uuid,
  p_new_name text,
  p_new_email text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old public.tender_signers%ROWTYPE;
  v_new_id uuid;
BEGIN
  SELECT * INTO v_old FROM public.tender_signers WHERE id = p_old_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'מורשה חתימה לא נמצא';
  END IF;
  IF v_old.replaced_at IS NOT NULL THEN
    RAISE EXCEPTION 'מורשה החתימה כבר הוחלף';
  END IF;

  -- אימות הרשאה
  IF NOT EXISTS (
    SELECT 1 FROM public.tenders t
    WHERE t.id = v_old.tender_id
      AND (t.owner_id = auth.uid()
           OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true)
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- סמן את הישן כ-replaced
  UPDATE public.tender_signers
  SET replaced_at = now(), replaced_by = auth.uid()
  WHERE id = p_old_id;

  -- צור חדש
  INSERT INTO public.tender_signers
    (tender_id, role, display_name, email, added_by, replaces_id)
  VALUES
    (v_old.tender_id, v_old.role, p_new_name, lower(p_new_email), auth.uid(), p_old_id)
  RETURNING id INTO v_new_id;

  PERFORM public.tender_audit_log_write(
    v_old.tender_id, 'signer', v_new_id, 'replaced',
    jsonb_build_object('old_name', v_old.display_name, 'old_email', v_old.email),
    jsonb_build_object('new_name', p_new_name, 'new_email', lower(p_new_email), 'role', v_old.role),
    NULL
  );

  RETURN v_new_id;
END;
$$;

-- 5. RPC: update (תיקון פרטים בלי גרסה חדשה)
CREATE OR REPLACE FUNCTION public.tender_signer_update(
  p_id uuid,
  p_name text,
  p_email text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signer public.tender_signers%ROWTYPE;
BEGIN
  SELECT * INTO v_signer FROM public.tender_signers WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'מורשה חתימה לא נמצא';
  END IF;
  IF v_signer.replaced_at IS NOT NULL THEN
    RAISE EXCEPTION 'לא ניתן לערוך מורשה שכבר הוחלף';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tenders t
    WHERE t.id = v_signer.tender_id
      AND (t.owner_id = auth.uid()
           OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true)
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE public.tender_signers
  SET display_name = p_name, email = lower(p_email)
  WHERE id = p_id;

  PERFORM public.tender_audit_log_write(
    v_signer.tender_id, 'signer', p_id, 'updated',
    jsonb_build_object('name', v_signer.display_name, 'email', v_signer.email),
    jsonb_build_object('name', p_name, 'email', lower(p_email)),
    NULL
  );
END;
$$;

-- 6. RPC: remove (סמן replaced בלי שורה מחליפה)
CREATE OR REPLACE FUNCTION public.tender_signer_remove(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signer public.tender_signers%ROWTYPE;
BEGIN
  SELECT * INTO v_signer FROM public.tender_signers WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'מורשה חתימה לא נמצא';
  END IF;
  IF v_signer.replaced_at IS NOT NULL THEN
    RAISE EXCEPTION 'מורשה החתימה כבר אינו פעיל';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tenders t
    WHERE t.id = v_signer.tender_id
      AND (t.owner_id = auth.uid()
           OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true)
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE public.tender_signers
  SET replaced_at = now(), replaced_by = auth.uid()
  WHERE id = p_id;

  PERFORM public.tender_audit_log_write(
    v_signer.tender_id, 'signer', p_id, 'removed',
    jsonb_build_object('role', v_signer.role, 'name', v_signer.display_name),
    NULL, NULL
  );
END;
$$;

-- 7. REVOKE/GRANT
REVOKE EXECUTE ON FUNCTION public.tender_signer_assign(uuid, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tender_signer_replace(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tender_signer_update(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tender_signer_remove(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.tender_signer_assign(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tender_signer_replace(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tender_signer_update(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tender_signer_remove(uuid) TO authenticated;
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Call `mcp__claude_ai_Supabase__apply_migration` with:
- `project_id`: `ildwyncxoytvallkrqjo`
- `name`: `tender_signers`
- `query`: כל ה-SQL מ-Step 1

Expected: `{"success": true}`

- [ ] **Step 3: Verify table + RPCs exist**

Call `mcp__claude_ai_Supabase__execute_sql` with:
```sql
SELECT
  (SELECT count(*) FROM information_schema.tables
    WHERE table_schema='public' AND table_name='tender_signers') AS table_exists,
  (SELECT count(*) FROM information_schema.routines
    WHERE routine_schema='public' AND routine_name LIKE 'tender_signer_%') AS rpc_count;
```

Expected: `table_exists=1, rpc_count=4`

- [ ] **Step 4: Commit migration file**

```bash
git add digitek-platform/supabase/migrations/029_tender_signers.sql
git commit -m "feat(tenders/signers): migration 029 — tender_signers table + 4 RPCs

טבלה חדשה pour אחסון מורשי חתימה פר-הליך עם versioning:
- replaces_id + replaced_at שומרים היסטוריה
- active = GENERATED column
- unique index חלקי על (tender_id, role) WHERE replaced_at IS NULL

4 RPCs (SECURITY DEFINER + REVOKE PUBLIC + GRANT authenticated):
tender_signer_assign / replace / update / remove
כולם כותבים ל-tender_audit_log עם entity_type='signer'.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push origin develop
```

Expected: push succeeds.

---

## Task 2: TypeScript types + signers lib

**Files:**
- Modify: `digitek-platform/src/modules/tenders/types.ts`
- Create: `digitek-platform/src/modules/tenders/lib/signers.ts`

**Interfaces:**
- Consumes: types `PersonaRole` (existing)
- Produces:
  - Type `SignerRole = 'budget_officer'|'legal_professional'|'treasurer'|'signatory'|'committee_head'`
  - Interface `TenderSigner { id, tender_id, role, display_name, email, added_by, added_at, replaced_at, replaced_by, replaces_id, active }`
  - `SIGNER_ROLE_LABELS: Record<SignerRole, string>` — תוויות עבריות
  - `SIGNER_ROLE_DESCRIPTIONS: Record<SignerRole, string>` — תיאורי תפקיד
  - `SIGNER_ROLE_USED_IN: Record<SignerRole, string[]>` — שלבים בהם משמש (לטסט "חסר — נדרש לפני T#")
  - `assignSigner(tenderId, role, name, email): Promise<{ok, id?, error?}>`
  - `replaceSigner(oldId, newName, newEmail): Promise<{ok, id?, error?}>`
  - `updateSigner(id, name, email): Promise<{ok, error?}>`
  - `removeSigner(id): Promise<{ok, error?}>`
  - `activeByRole(signers: TenderSigner[], role: SignerRole): TenderSigner | undefined`
  - `historyByRole(signers: TenderSigner[], role: SignerRole): TenderSigner[]` — replaced_at DESC

- [ ] **Step 1: Edit `digitek-platform/src/modules/tenders/types.ts`**

Add the following to PersonaRole (find the existing type definition and add 2 codes):

```typescript
export type PersonaRole =
  | 'process_manager'
  | 'budget_officer'
  | 'procurement_professional'
  | 'procurement_manager'
  | 'tender_committee_member'
  | 'exceptions_committee_member'
  | 'subcommittee_member'
  | 'legal_professional'
  | 'procurement_team'
  | 'vendor'
  | 'professional_manager'
  | 'signatory'
  | 'treasurer'         // חדש — חשב (חתימה ב-T3/T7)
  | 'committee_head'    // חדש — מנהלת ועדת מכרזים
  | 'admin'
```

Add new types at end of file (before final closing or in a sensible location):

```typescript
// ---------- Signers (מורשי חתימה פר-הליך) ----------

export type SignerRole =
  | 'budget_officer'      // תקציבן — T1
  | 'legal_professional'  // משפטן — T3/T7
  | 'treasurer'           // חשב — T3/T7 + ועדה
  | 'signatory'           // סמנכ"ל אחראי תורן — T3/T7
  | 'committee_head'      // מנהלת ועדת מכרזים — T2/T6

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

- [ ] **Step 2: Create `digitek-platform/src/modules/tenders/lib/signers.ts`**

```typescript
import { supabase } from '../../../lib/supabase'
import type { SignerRole, TenderSigner } from '../types'

// ───────── Catalog ─────────

export const SIGNER_ROLES: SignerRole[] = [
  'budget_officer',
  'legal_professional',
  'treasurer',
  'signatory',
  'committee_head',
]

export const SIGNER_ROLE_LABELS: Record<SignerRole, string> = {
  budget_officer:    'תקציבן',
  legal_professional: 'משפטן',
  treasurer:         'חשב',
  signatory:         'סמנכ״ל אחראי תורן',
  committee_head:    'מנהלת ועדת מכרזים',
}

export const SIGNER_ROLE_DESCRIPTIONS: Record<SignerRole, string> = {
  budget_officer:    'מאשר את התקציב בשלב 1',
  legal_professional: 'חותם ראשון בשלבי חתימה (T3 ו-T7)',
  treasurer:         'חותם שני בשלבי חתימה + נוכח בוועדה',
  signatory:         'חותם אחרון בשלבי חתימה (T3 ו-T7)',
  committee_head:    'מזמנת ועדת מכרזים בשלבים T2 ו-T6',
}

/** השלבים בהם תפקיד זה משמש (לתצוגת "חסר — נדרש לפני T#"). */
export const SIGNER_ROLE_USED_IN: Record<SignerRole, string[]> = {
  budget_officer:    ['T1'],
  legal_professional: ['T3', 'T7'],
  treasurer:         ['T2', 'T3', 'T6', 'T7'],
  signatory:         ['T3', 'T7'],
  committee_head:    ['T2', 'T6'],
}

// ───────── RPC wrappers ─────────

export interface SignerOpResult {
  ok: boolean
  id?: string
  error?: string
}

export async function assignSigner(
  tenderId: string, role: SignerRole, name: string, email: string,
): Promise<SignerOpResult> {
  const { data, error } = await supabase.rpc('tender_signer_assign', {
    p_tender_id: tenderId,
    p_role: role,
    p_name: name.trim(),
    p_email: email.trim().toLowerCase(),
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true, id: data as string }
}

export async function replaceSigner(
  oldId: string, newName: string, newEmail: string,
): Promise<SignerOpResult> {
  const { data, error } = await supabase.rpc('tender_signer_replace', {
    p_old_id: oldId,
    p_new_name: newName.trim(),
    p_new_email: newEmail.trim().toLowerCase(),
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true, id: data as string }
}

export async function updateSigner(
  id: string, name: string, email: string,
): Promise<SignerOpResult> {
  const { error } = await supabase.rpc('tender_signer_update', {
    p_id: id,
    p_name: name.trim(),
    p_email: email.trim().toLowerCase(),
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function removeSigner(id: string): Promise<SignerOpResult> {
  const { error } = await supabase.rpc('tender_signer_remove', { p_id: id })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// ───────── Helpers ─────────

export function activeByRole(signers: TenderSigner[], role: SignerRole): TenderSigner | undefined {
  return signers.find(s => s.active && s.role === role)
}

/** Returns replaced signers for a role, most-recent first. Excludes the active one. */
export function historyByRole(signers: TenderSigner[], role: SignerRole): TenderSigner[] {
  return signers
    .filter(s => s.role === role && !s.active)
    .sort((a, b) => (b.replaced_at ?? '').localeCompare(a.replaced_at ?? ''))
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateSignerInput(name: string, email: string): string | null {
  const n = name.trim()
  const e = email.trim()
  if (!n && !e) return null // ריק — שלם, לא בעיה
  if (n && !e) return 'יש להזין מייל'
  if (!n && e) return 'יש להזין שם'
  if (n.length < 2) return 'שם קצר מדי'
  if (!EMAIL_RE.test(e)) return 'כתובת מייל לא תקינה'
  return null
}
```

- [ ] **Step 3: Verify TypeScript passes**

```bash
cd digitek-platform && npx tsc --noEmit
```

Expected: Exit 0, no errors.

- [ ] **Step 4: Commit**

```bash
git add digitek-platform/src/modules/tenders/types.ts \
       digitek-platform/src/modules/tenders/lib/signers.ts
git commit -m "feat(tenders/signers): types + lib עם RPC wrappers וקטלוג תפקידים

- SignerRole + TenderSigner interface ב-types.ts
- PersonaRole הורחב ב-'treasurer' ו-'committee_head'
- lib/signers.ts: SIGNER_ROLES, _LABELS, _DESCRIPTIONS, _USED_IN
- RPC wrappers: assign/replace/update/remove (lowercase email)
- helpers: activeByRole, historyByRole, validateSignerInput

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push origin develop
```

---

## Task 3: Rename budget_officer → treasurer in T3/T7 signature flow

**Files:**
- Modify: `digitek-platform/src/modules/tenders/data/stageRequirements.ts`
- Modify: `digitek-platform/src/modules/tenders/workflowEngine.ts`
- Modify: `digitek-platform/src/pages/TenderDetailPage.tsx`

**Interfaces:**
- Consumes: `PersonaRole = '...'|'treasurer'|...` from Task 2
- Produces: בקשות חתימה ל"חשב" משתמשות ב-`requestedRole='treasurer'` במקום `'budget_officer'`

- [ ] **Step 1: Edit `digitek-platform/src/modules/tenders/data/stageRequirements.ts`**

Find `REQ_SIGNATURE_TREASURER_OUTBOUND` and `REQ_SIGNATURE_TREASURER_WINNER` and change their `getStatus` from `approvalBasedByRole('contract_signature', 'budget_officer')` to `approvalBasedByRole('contract_signature', 'treasurer')`. Both occurrences.

Exact edit — old (search for the 2 entries):
```typescript
const REQ_SIGNATURE_TREASURER_OUTBOUND: StageRequirement = {
  id: 'signature_treasurer_outbound',
  label: 'חתימת חשב',
  description: 'חשב חותם אחרי המשפטן',
  approvalRequestType: 'contract_signature',
  getStatus: approvalBasedByRole('contract_signature', 'budget_officer'),
  action: 'request_signature_treasurer',
  blocker: true,
}
```

Change to:
```typescript
const REQ_SIGNATURE_TREASURER_OUTBOUND: StageRequirement = {
  id: 'signature_treasurer_outbound',
  label: 'חתימת חשב',
  description: 'חשב חותם אחרי המשפטן',
  approvalRequestType: 'contract_signature',
  getStatus: approvalBasedByRole('contract_signature', 'treasurer'),
  action: 'request_signature_treasurer',
  blocker: true,
}
```

Do the same for `REQ_SIGNATURE_TREASURER_WINNER`.

- [ ] **Step 2: Edit `digitek-platform/src/modules/tenders/workflowEngine.ts`**

In `WORKFLOW_T3.steps.sig_treasurer` and `WORKFLOW_T7.steps.sig_treasurer`, change `assigneeRole: 'budget_officer'` to `assigneeRole: 'treasurer'`. Both occurrences.

- [ ] **Step 3: Edit `digitek-platform/src/pages/TenderDetailPage.tsx`**

Find the `<SignatureRequestModal>` calls. There are 3 calls (legal/treasurer/vp). Change the treasurer one's `signerRole` from `"budget_officer"` to `"treasurer"`:

```tsx
<SignatureRequestModal
  open={activeAction === 'request_signature_treasurer'}
  onClose={closeAction}
  tenderId={tender.id}
  signerRole="treasurer"
  onSubmitted={onActionDone}
/>
```

- [ ] **Step 4: TypeScript check**

```bash
cd digitek-platform && npx tsc --noEmit
```

Expected: Exit 0.

- [ ] **Step 5: Commit**

```bash
git add digitek-platform/src/modules/tenders/data/stageRequirements.ts \
       digitek-platform/src/modules/tenders/workflowEngine.ts \
       digitek-platform/src/pages/TenderDetailPage.tsx
git commit -m "refactor(tenders): חתימת חשב T3/T7 משתמש ב-treasurer במקום budget_officer

תקציבן (T1) וחשב (T3/T7) הם אנשים שונים בארגון. עד עכשיו שניהם השתמשו
ב-PersonaRole='budget_officer' מה שגרם להבלבל. ה-treasurer החדש (נוסף
ל-PersonaRole ב-Task הקודם) מבדיל בין השניים.

קבצים:
- stageRequirements.ts: REQ_SIGNATURE_TREASURER_OUTBOUND/WINNER
- workflowEngine.ts: WORKFLOW_T3/T7 sig_treasurer.assigneeRole
- TenderDetailPage.tsx: SignatureRequestModal treasurer call

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push origin develop
```

---

## Task 4: Extend useTender hook to fetch signers

**Files:**
- Modify: `digitek-platform/src/modules/tenders/hooks/useTender.ts`

**Interfaces:**
- Consumes: `TenderSigner` from Task 2
- Produces: `useTender(id)` חוזר עם `signers: TenderSigner[]` (כולל active + history)

- [ ] **Step 1: Edit useTender.ts**

Locate the `TenderDetailData` interface and add `signers`:

```typescript
import type { TenderSigner } from '../types'

export interface TenderDetailData {
  // ... existing fields
  signers: TenderSigner[]
  // ... rest
}
```

Locate the parallel `Promise.all` fetch block (it pulls 13 entities). Add a 14th entry:

```typescript
const [
  // ... existing fetches
  signersRes,
] = await Promise.all([
  // ... existing
  supabase.from('tender_signers').select('*').eq('tender_id', tenderId)
    .order('added_at', { ascending: false }),
])

// ...

setData({
  // ... existing
  signers: (signersRes.data as TenderSigner[] | null) ?? [],
})
```

Important: the existing hook has a return object `{ tender, budget, documents, ... }`. Add `signers` to this destructured return value.

Find the `useTender` return statement and add `signers: data.signers`.

Also: find the initial state object (e.g. `{ tender: null, ..., signers: [] }`) and add `signers: []`.

- [ ] **Step 2: TypeScript check**

```bash
cd digitek-platform && npx tsc --noEmit
```

Expected: Exit 0.

- [ ] **Step 3: Commit**

```bash
git add digitek-platform/src/modules/tenders/hooks/useTender.ts
git commit -m "feat(tenders/signers): useTender fetches tender_signers as 14th parallel query

הוספת signers ל-TenderDetailData. נשלף יחד עם שאר 13 הישויות במקביל.
מסודר לפי added_at DESC כדי שה-active והגרסאות יוצגו כסדר הטבעי בכרטיס.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push origin develop
```

---

## Task 5: SignersSidebar component

**Files:**
- Create: `digitek-platform/src/modules/tenders/components/SignersSidebar.tsx`
- Create: `digitek-platform/src/modules/tenders/components/SignersSidebar.module.css`
- Modify: `digitek-platform/src/pages/TenderDetailPage.tsx` (embed)

**Interfaces:**
- Consumes: `useTender` return value with `signers`, `tender.current_stage`
- Produces: React component `<SignersSidebar tender={tender} signers={signers} onEdit={() => void} />`

- [ ] **Step 1: Create `SignersSidebar.tsx`**

```tsx
import { useMemo } from 'react'
import {
  SIGNER_ROLES,
  SIGNER_ROLE_LABELS,
  SIGNER_ROLE_USED_IN,
  activeByRole,
  historyByRole,
} from '../lib/signers'
import { getStageIndex } from '../data/stagesBaseline'
import type { Tender, TenderSigner, TenderStage } from '../types'
import styles from './SignersSidebar.module.css'

interface Props {
  tender: Tender
  signers: TenderSigner[]
  onEdit: () => void
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map(p => p[0] ?? '').join('') || '?'
}

function relativeDate(iso: string): string {
  const d = new Date(iso)
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (days < 1) return 'היום'
  if (days === 1) return 'אתמול'
  if (days < 7) return `לפני ${days} ימים`
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

/** האם תפקיד נדרש לפני השלב הנוכחי? משמש לחישוב אזהרת "חסר". */
function isRoleNeededBefore(
  usedIn: string[],
  currentStage: TenderStage,
): { needed: boolean; nextStageCode?: string } {
  const currentIdx = getStageIndex(currentStage)
  if (currentIdx < 0) return { needed: false }

  // הופך 'T1' ל-'T1_budget_approval' לחיפוש ב-STAGE_ORDER
  for (const code of usedIn) {
    // 'T1' → מצא שלב שמתחיל ב-'T1_'
    const stageCode = SIGNER_ROLE_USED_IN_TO_STAGE_PREFIX[code]
    if (!stageCode) continue
    const stageIdx = getStageIndex(stageCode)
    if (stageIdx >= 0 && stageIdx >= currentIdx) {
      return { needed: true, nextStageCode: code }
    }
  }
  return { needed: false }
}

// מיפוי 'T1' → 'T1_budget_approval' (קודי שלבים מלאים)
const SIGNER_ROLE_USED_IN_TO_STAGE_PREFIX: Record<string, TenderStage> = {
  T0: 'T0_brief_protocol',
  T1: 'T1_budget_approval',
  T2: 'T2_committee_outbound',
  T3: 'T3_signatures_outbound',
  T4: 'T4_minhal_rechesh',
  T5: 'T5_winner_protocol_upload',
  T6: 'T6_committee_winner',
  T7: 'T7_signatures_winner',
  T8: 'T8_engagement',
}

export function SignersSidebar({ tender, signers, onEdit }: Props) {
  const activeCount = useMemo(
    () => SIGNER_ROLES.filter(role => activeByRole(signers, role)).length,
    [signers],
  )

  const hasAnyHistory = signers.some(s => !s.active)

  return (
    <aside className={styles.card}>
      <div className={styles.header}>
        <div className={styles.title}>👥 צוות חתימות ({activeCount})</div>
        <button type="button" className={styles.editBtn} onClick={onEdit}>
          ✎ ערוך
        </button>
      </div>

      <div className={styles.rows}>
        {SIGNER_ROLES.map(role => {
          const signer = activeByRole(signers, role)
          if (signer) {
            return (
              <div key={role} className={styles.row}>
                <div className={styles.avatar}>{initials(signer.display_name)}</div>
                <div className={styles.info}>
                  <div className={styles.name}>{signer.display_name}</div>
                  <div className={styles.roleLabel}>{SIGNER_ROLE_LABELS[role]}</div>
                  <div className={styles.email}>{signer.email}</div>
                </div>
              </div>
            )
          }
          // לא מוגדר
          const need = isRoleNeededBefore(SIGNER_ROLE_USED_IN[role], tender.current_stage)
          return (
            <div key={role} className={`${styles.row} ${styles.missing}`}>
              <div className={`${styles.avatar} ${styles.avatarMissing}`}>!</div>
              <div className={styles.info}>
                <div className={styles.nameMissing}>לא הוגדר</div>
                <div className={styles.roleLabel}>{SIGNER_ROLE_LABELS[role]}</div>
                {need.needed && (
                  <div className={styles.warning}>חסר — נדרש לפני {need.nextStageCode}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {hasAnyHistory && (
        <div className={styles.history}>
          <div className={styles.historyTitle}>↩ היסטוריה</div>
          {SIGNER_ROLES.flatMap(role => historyByRole(signers, role).map(s => ({ role, s })))
            .sort((a, b) => (b.s.replaced_at ?? '').localeCompare(a.s.replaced_at ?? ''))
            .map(({ role, s }) => (
              <div key={s.id} className={styles.historyRow}>
                <span className={styles.historyName}>{s.display_name}</span>
                <span className={styles.historyMeta}>
                  {SIGNER_ROLE_LABELS[role]} · הוחלפה {relativeDate(s.replaced_at!)}
                </span>
              </div>
            ))}
        </div>
      )}
    </aside>
  )
}
```

- [ ] **Step 2: Create `SignersSidebar.module.css`**

```css
.card {
  background: linear-gradient(180deg, var(--primary-bg) 0%, var(--surface) 100%);
  border: 1.5px solid var(--primary-light);
  border-radius: 12px;
  padding: 14px 16px;
  height: fit-content;
}
.header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--primary-light);
}
.title {
  font-size: 13px; font-weight: 700;
  color: var(--primary-dark);
}
.editBtn {
  background: none; border: none; cursor: pointer;
  color: var(--primary);
  font-family: inherit;
  font-size: 12px; font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}
.editBtn:hover { background: rgba(29, 78, 216, 0.08); }

.rows { display: flex; flex-direction: column; }
.row {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 0;
  border-bottom: 1px dashed rgba(29, 78, 216, 0.12);
}
.row:last-child { border-bottom: none; }
.row.missing { opacity: 0.95; }

.avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 12.5px;
  flex-shrink: 0;
}
.avatarMissing {
  background: var(--amber);
  color: #fff;
  font-weight: 800;
}

.info { flex: 1; min-width: 0; }
.name { font-size: 13px; font-weight: 600; color: var(--text); }
.nameMissing { font-size: 13px; color: var(--text3); }
.roleLabel { font-size: 11.5px; color: var(--text2); margin-top: 1px; }
.email {
  font-size: 11px; color: var(--text3);
  direction: ltr; text-align: right;
  margin-top: 1px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.warning {
  font-size: 11px;
  color: #78350f;
  background: var(--amber-bg);
  padding: 2px 6px;
  border-radius: 4px;
  margin-top: 3px;
  display: inline-block;
}

.history {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--primary-light);
}
.historyTitle {
  font-size: 11px; font-weight: 700;
  color: var(--text3);
  letter-spacing: 0.4px;
  margin-bottom: 6px;
  text-transform: uppercase;
}
.historyRow {
  display: flex; gap: 6px; align-items: baseline;
  padding: 4px 0;
  font-size: 11.5px;
  color: var(--text3);
}
.historyName { color: var(--text2); font-weight: 500; }
.historyMeta { color: var(--text3); }
```

- [ ] **Step 3: Embed in `TenderDetailPage.tsx`**

Add import at top:
```tsx
import { SignersSidebar } from '../modules/tenders/components/SignersSidebar'
```

Add `signers` to the existing useTender destructure:
```tsx
const { tender, budget, documents, contracts, milestones, protocols, personas, auditLog, approvalRequests, signers, loading, error, refresh } = detail
```

Find the JSX `<StageMap tender={tender} />` and place the SignersSidebar **below** it inside the same `<aside>` container. Looking at the existing layout grid:

```tsx
<div className={styles.layoutGrid}>
  <div className={styles.main}>
    {/* ... existing main content ... */}
  </div>

  {/* sidebar column */}
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <StageMap tender={tender} />
    <SignersSidebar
      tender={tender}
      signers={signers}
      onEdit={() => setSignersEditOpen(true)}
    />
  </div>
</div>
```

Add state at top of component:
```tsx
const [signersEditOpen, setSignersEditOpen] = useState(false)
```

(The SignersEditModal will be wired in Task 6.)

- [ ] **Step 4: TypeScript check**

```bash
cd digitek-platform && npx tsc --noEmit
```

Expected: Exit 0.

- [ ] **Step 5: Manual QA in Vercel preview**

After the deploy completes:
1. פתח `/tenders/:any-existing-tender-id`
2. ודא שכרטיס "👥 צוות חתימות (0)" מופיע ב-sidebar למטה מ-StageMap
3. ודא 5 שורות "לא הוגדר" עם avatar צהוב
4. ודא אזהרה "חסר — נדרש לפני T1" על תקציבן (אם ההליך ב-T0)

- [ ] **Step 6: Commit**

```bash
git add digitek-platform/src/modules/tenders/components/SignersSidebar.tsx \
       digitek-platform/src/modules/tenders/components/SignersSidebar.module.css \
       digitek-platform/src/pages/TenderDetailPage.tsx
git commit -m "feat(tenders/signers): SignersSidebar — כרטיס צוות חתימות ב-Tender 360

קומפוננטה חדשה שמציגה 5 תפקידי מורשי חתימה:
- מוגדרים: avatar עם initials, שם, תפקיד, מייל
- חסרים: avatar צהוב + אזהרת 'חסר — נדרש לפני T#' (לפי SIGNER_ROLE_USED_IN)
- היסטוריה: אזור נפרד עם רשימה ממוינת לפי replaced_at DESC

ממוקם ב-Tender 360 מתחת ל-StageMap. כפתור ✎ ערוך מציג modal בTask 6.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push origin develop
```

---

## Task 6: SignersEditModal

**Files:**
- Create: `digitek-platform/src/modules/tenders/components/modals/SignersEditModal.tsx`
- Modify: `digitek-platform/src/pages/TenderDetailPage.tsx` (instantiate)

**Interfaces:**
- Consumes: `assignSigner`, `replaceSigner`, `updateSigner`, `removeSigner`, `validateSignerInput`, `activeByRole`, `SIGNER_ROLES`, `SIGNER_ROLE_LABELS`, `SIGNER_ROLE_DESCRIPTIONS` from Task 2
- Produces: `<SignersEditModal open tenderId signers onClose onSubmitted />`

- [ ] **Step 1: Create modal file**

```tsx
import { useEffect, useState } from 'react'
import { Modal, modalStyles as s } from '../Modal'
import {
  SIGNER_ROLES,
  SIGNER_ROLE_LABELS,
  SIGNER_ROLE_DESCRIPTIONS,
  activeByRole,
  validateSignerInput,
  assignSigner,
  replaceSigner,
  updateSigner,
  removeSigner,
} from '../../lib/signers'
import type { SignerRole, TenderSigner } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
  tenderId: string
  signers: TenderSigner[]
  onSubmitted: () => Promise<void> | void
}

type Mode = 'assign' | 'update' | 'replace'

interface RoleDraft {
  mode: Mode
  name: string
  email: string
  error: string | null
}

export function SignersEditModal({ open, onClose, tenderId, signers, onSubmitted }: Props) {
  const [drafts, setDrafts] = useState<Record<SignerRole, RoleDraft>>(() => initDrafts(signers))
  const [submitting, setSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)

  // Reset drafts ל-active הנוכחי בכל פעם שהמודאל נפתח (שלא נטעון נתונים ישנים)
  useEffect(() => {
    if (open) {
      setDrafts(initDrafts(signers))
      setGlobalError(null)
    }
  }, [open, signers])

  function setDraft(role: SignerRole, partial: Partial<RoleDraft>) {
    setDrafts(prev => ({ ...prev, [role]: { ...prev[role], ...partial } }))
  }

  async function handleSave() {
    setSubmitting(true)
    setGlobalError(null)

    const errors: string[] = []

    for (const role of SIGNER_ROLES) {
      const draft = drafts[role]
      const active = activeByRole(signers, role)

      // ולידציה — אם מולא חלקית כשל
      const validationError = validateSignerInput(draft.name, draft.email)
      if (validationError) {
        setDraft(role, { error: validationError })
        errors.push(`${SIGNER_ROLE_LABELS[role]}: ${validationError}`)
        continue
      }

      const hasInput = draft.name.trim().length > 0 && draft.email.trim().length > 0
      if (!hasInput) {
        // ריק → אם היה active ובחר 'remove', הסר. אחרת — לא לעשות כלום.
        continue
      }

      // יש קלט מלא — שלח לפי mode
      if (!active) {
        const res = await assignSigner(tenderId, role, draft.name, draft.email)
        if (!res.ok) errors.push(`${SIGNER_ROLE_LABELS[role]}: ${res.error}`)
      } else if (draft.mode === 'update') {
        // אם הקלט לא השתנה — אל תשלח (חיסכון ב-RPC)
        if (active.display_name === draft.name.trim() && active.email === draft.email.trim().toLowerCase()) {
          continue
        }
        const res = await updateSigner(active.id, draft.name, draft.email)
        if (!res.ok) errors.push(`${SIGNER_ROLE_LABELS[role]}: ${res.error}`)
      } else if (draft.mode === 'replace') {
        const res = await replaceSigner(active.id, draft.name, draft.email)
        if (!res.ok) errors.push(`${SIGNER_ROLE_LABELS[role]}: ${res.error}`)
      }
    }

    setSubmitting(false)
    if (errors.length > 0) {
      setGlobalError(errors.join(' · '))
      return
    }

    await onSubmitted()
    onClose()
  }

  async function handleRemove(role: SignerRole) {
    const active = activeByRole(signers, role)
    if (!active) return
    const ok = window.confirm(`להסיר את ${SIGNER_ROLE_LABELS[role]} מההליך? ההיסטוריה תישמר.`)
    if (!ok) return
    setSubmitting(true)
    const res = await removeSigner(active.id)
    setSubmitting(false)
    if (!res.ok) {
      setGlobalError(res.error ?? 'שגיאה בהסרה')
      return
    }
    await onSubmitted()
  }

  return (
    <Modal open={open} onClose={onClose} title="עריכת צוות חתימות">
      <div className={s.info}>
        💡 כל תפקיד אופציונלי. השם והמייל ילכו לכל בקשות האישור הרלוונטיות בהליך.
      </div>

      {SIGNER_ROLES.map(role => {
        const draft = drafts[role]
        const active = activeByRole(signers, role)
        return (
          <div key={role} style={{
            border: '1.5px solid var(--border)',
            borderRadius: 10,
            padding: '14px 16px',
            marginBottom: 12,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{SIGNER_ROLE_LABELS[role]}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text3)' }}>{SIGNER_ROLE_DESCRIPTIONS[role]}</div>
              </div>
              {active && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setDraft(role, { mode: 'update' })}
                    style={{
                      padding: '4px 10px',
                      fontSize: 11,
                      borderRadius: 6,
                      border: '1px solid var(--border2)',
                      background: draft.mode === 'update' ? 'var(--primary-bg)' : 'var(--surface)',
                      color: draft.mode === 'update' ? 'var(--primary-dark)' : 'var(--text2)',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    עדכן פרטים
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft(role, { mode: 'replace' })}
                    style={{
                      padding: '4px 10px',
                      fontSize: 11,
                      borderRadius: 6,
                      border: '1px solid var(--border2)',
                      background: draft.mode === 'replace' ? 'var(--primary-bg)' : 'var(--surface)',
                      color: draft.mode === 'replace' ? 'var(--primary-dark)' : 'var(--text2)',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    החלף אדם
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRemove(role)}
                    style={{
                      padding: '4px 10px',
                      fontSize: 11,
                      borderRadius: 6,
                      border: '1px solid var(--red)',
                      background: 'var(--surface)',
                      color: 'var(--red)',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    🗑 הסר
                  </button>
                </div>
              )}
            </div>

            <input
              className={s.input}
              placeholder="שם מלא"
              value={draft.name}
              onChange={e => setDraft(role, { name: e.target.value, error: null })}
              style={{ marginBottom: 6 }}
            />
            <input
              className={s.input}
              placeholder="מייל"
              value={draft.email}
              onChange={e => setDraft(role, { email: e.target.value, error: null })}
              style={{ direction: 'ltr', textAlign: 'right' }}
            />
            {draft.error && (
              <div style={{ fontSize: 11.5, color: 'var(--red)', marginTop: 4 }}>{draft.error}</div>
            )}
          </div>
        )
      })}

      {globalError && <div className={s.error}>{globalError}</div>}

      <div className={s.foot}>
        <button className={`${s.btn} ${s.btnSecondary}`} onClick={onClose}>ביטול</button>
        <button className={`${s.btn} ${s.btnPrimary}`} disabled={submitting} onClick={handleSave}>
          {submitting ? 'שומר…' : 'שמור'}
        </button>
      </div>
    </Modal>
  )
}

// ───────── helpers ─────────

function initDrafts(signers: TenderSigner[]): Record<SignerRole, RoleDraft> {
  const out = {} as Record<SignerRole, RoleDraft>
  for (const role of SIGNER_ROLES) {
    const active = activeByRole(signers, role)
    out[role] = {
      mode: active ? 'update' : 'assign',
      name: active?.display_name ?? '',
      email: active?.email ?? '',
      error: null,
    }
  }
  return out
}
```

- [ ] **Step 2: Wire modal in TenderDetailPage**

Add import:
```tsx
import { SignersEditModal } from '../modules/tenders/components/modals/SignersEditModal'
```

Below the `<CommitteeScheduleModal>` and other modals, add:
```tsx
<SignersEditModal
  open={signersEditOpen}
  onClose={() => setSignersEditOpen(false)}
  tenderId={tender.id}
  signers={signers}
  onSubmitted={refresh}
/>
```

- [ ] **Step 3: TypeScript check**

```bash
cd digitek-platform && npx tsc --noEmit
```

Expected: Exit 0.

- [ ] **Step 4: Manual QA**

After Vercel deploy:
1. פתח הליך, לחץ "✎ ערוך" בכרטיס צוות חתימות
2. הוסף תקציבן (שם + מייל) → שמור
3. סגור והפתח שוב — ודא שהתקציבן מופיע ב-active
4. לחץ "ערוך", בחר "החלף אדם" על התקציבן, מלא שם+מייל חדשים, שמור
5. ודא שהקודם עבר ל"היסטוריה" בתחתית הכרטיס
6. לחץ "הסר" — ודא שהאדם הוסר ועבר להיסטוריה

- [ ] **Step 5: Commit**

```bash
git add digitek-platform/src/modules/tenders/components/modals/SignersEditModal.tsx \
       digitek-platform/src/pages/TenderDetailPage.tsx
git commit -m "feat(tenders/signers): SignersEditModal — עריכה והחלפה של מורשי חתימה

מודאל אחד שמטפל בכל 5 התפקידים. לכל תפקיד מוגדר 3 כפתורי mode:
'עדכן פרטים' (RPC update), 'החלף אדם' (RPC replace), '🗑 הסר' (RPC remove
עם confirm). תפקיד שאינו מוגדר — קלט פשוט שמפעיל RPC assign בשמירה.

ולידציה: שם בלי מייל / להיפך → שגיאה מקומית. רגקס מייל לפני submit.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push origin develop
```

---

## Task 7: New wizard step 4 — צוות חתימות

**Files:**
- Create: `digitek-platform/src/pages/TenderWizardSignersStep.tsx`
- Create: `digitek-platform/src/pages/TenderWizardSignersStep.module.css`
- Modify: `digitek-platform/src/pages/TenderWizardPage.tsx` (insert step + state + submit)

**Interfaces:**
- Consumes: `assignSigner`, `validateSignerInput`, `SIGNER_ROLES`, `SIGNER_ROLE_LABELS`, `SIGNER_ROLE_DESCRIPTIONS` from Task 2
- Produces: `<TenderWizardSignersStep drafts onChange />` קומפוננטה

- [ ] **Step 1: Create `TenderWizardSignersStep.tsx`**

```tsx
import {
  SIGNER_ROLES,
  SIGNER_ROLE_LABELS,
  SIGNER_ROLE_DESCRIPTIONS,
} from '../modules/tenders/lib/signers'
import type { SignerRole } from '../modules/tenders/types'
import styles from './TenderWizardSignersStep.module.css'

export interface SignerDraft {
  name: string
  email: string
}

export type SignerDrafts = Record<SignerRole, SignerDraft>

export function emptySignerDrafts(): SignerDrafts {
  const out = {} as SignerDrafts
  for (const role of SIGNER_ROLES) out[role] = { name: '', email: '' }
  return out
}

interface Props {
  drafts: SignerDrafts
  onChange: (drafts: SignerDrafts) => void
}

export function TenderWizardSignersStep({ drafts, onChange }: Props) {
  function setDraft(role: SignerRole, partial: Partial<SignerDraft>) {
    onChange({ ...drafts, [role]: { ...drafts[role], ...partial } })
  }

  return (
    <div className={styles.panel}>
      <h2 className={styles.panelTitle}>צוות חתימות</h2>
      <p className={styles.panelSub}>
        מי החותמים בהליך זה? <strong>אופציונלי</strong> — אפשר להמשיך בלי למלא כלום ולהוסיף בתיק ההליך מאוחר יותר.
      </p>

      {SIGNER_ROLES.map(role => {
        const draft = drafts[role]
        return (
          <div key={role} className={styles.roleCard}>
            <div className={styles.roleInfo}>
              <div className={styles.roleName}>{SIGNER_ROLE_LABELS[role]}</div>
              <div className={styles.roleDesc}>{SIGNER_ROLE_DESCRIPTIONS[role]}</div>
            </div>
            <div className={styles.roleInputs}>
              <input
                className={styles.input}
                placeholder="שם מלא"
                value={draft.name}
                onChange={e => setDraft(role, { name: e.target.value })}
              />
              <input
                className={styles.input}
                placeholder="מייל"
                value={draft.email}
                onChange={e => setDraft(role, { email: e.target.value })}
                style={{ direction: 'ltr', textAlign: 'right' }}
              />
            </div>
          </div>
        )
      })}

      <div className={styles.hint}>
        💡 ניתן להוסיף, להחליף ולערוך את הצוות בכל שלב מתוך תיק ההליך.
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `TenderWizardSignersStep.module.css`**

```css
.panel { padding: 4px; }
.panelTitle {
  font-size: 18px; font-weight: 700;
  margin: 0 0 6px;
  color: var(--text);
}
.panelSub {
  color: var(--text2);
  font-size: 13px;
  margin: 0 0 20px;
  line-height: 1.6;
}
.panelSub strong { color: var(--text); }

.roleCard {
  border: 1.5px solid var(--border);
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 10px;
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 16px;
  align-items: center;
}
.roleInfo {}
.roleName { font-weight: 700; font-size: 14px; color: var(--text); }
.roleDesc { color: var(--text3); font-size: 11.5px; margin-top: 2px; line-height: 1.5; }
.roleInputs { display: flex; flex-direction: column; gap: 7px; }

.input {
  width: 100%;
  padding: 9px 12px;
  border: 1.5px solid var(--border2);
  border-radius: 8px;
  font-family: inherit;
  font-size: 13px;
  color: var(--text);
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.input:focus { border-color: var(--primary-light); }
.input::placeholder { color: var(--text3); }

.hint {
  margin-top: 14px;
  padding: 12px 14px;
  background: var(--primary-bg);
  border-radius: 8px;
  font-size: 12.5px;
  color: var(--primary-dark);
}
```

- [ ] **Step 3: Integrate into `TenderWizardPage.tsx`**

Add imports:
```tsx
import { TenderWizardSignersStep, emptySignerDrafts, type SignerDrafts } from './TenderWizardSignersStep'
import { assignSigner, validateSignerInput, SIGNER_ROLES, SIGNER_ROLE_LABELS } from '../modules/tenders/lib/signers'
```

Update STEPS to 5 (find the existing const):
```tsx
const STEPS = [
  { num: 1, label: 'פרטים' },
  { num: 2, label: 'פיננסים' },
  { num: 3, label: 'בריף ופרוטוקול' },
  { num: 4, label: 'צוות חתימות' },
  { num: 5, label: 'סקירה' },
]
```

Update step state type:
```tsx
const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1)
```

Add signers state:
```tsx
const [signerDrafts, setSignerDrafts] = useState<SignerDrafts>(() => emptySignerDrafts())
```

Update `canAdvance` — step 4 requires no partial inputs (full or empty per role):
```tsx
const canAdvance = useMemo(() => {
  if (step === 1) return title.trim().length >= 3 && ministry.trim().length >= 2
  if (step === 2) return amount > 0
  if (step === 3) return briefSatisfied && protocolSatisfied
  if (step === 4) {
    // אסור שורה חלקית (שם בלי מייל / להיפך)
    for (const role of SIGNER_ROLES) {
      const d = signerDrafts[role]
      const err = validateSignerInput(d.name, d.email)
      if (err) return false
    }
    return true
  }
  return true
}, [step, title, ministry, amount, briefSatisfied, protocolSatisfied, signerDrafts])
```

Find existing step 3 condition (`{step === 3 && (`). The step 4 should be inserted **after** step 3 and **before** the existing step 4 (which becomes step 5):

```tsx
{step === 4 && (
  <TenderWizardSignersStep drafts={signerDrafts} onChange={setSignerDrafts} />
)}
```

Update the existing step 4 block to `step === 5` (rename — סקירה):

```tsx
{step === 5 && (
  <div className={styles.panel}>
    <h2 className={styles.panelTitle}>סקירה ופתיחה</h2>
    {/* ... existing review content ... */}
  </div>
)}
```

In the review summary section, **add** a signers row before the closing `</div>`:

```tsx
<div className={styles.summaryItem}>
  <span className={styles.summaryLabel}>צוות חתימות</span>
  <span className={styles.summaryValue}>
    {SIGNER_ROLES.filter(r => signerDrafts[r].name.trim() && signerDrafts[r].email.trim()).length} תפקידים מוגדרים
  </span>
</div>
```

Update navigation buttons — change all `step < 4` to `step < 5`, `step === 4` (submit) to `step === 5`, and the cast `(step + 1) as 1 | 2 | 3 | 4` to `(step + 1) as 1 | 2 | 3 | 4 | 5` (same for `step - 1`).

Update `handleSubmit` — after the uploads loop, before navigate, add the signers loop:

```tsx
// אחרי uploads, לפני navigate
for (const role of SIGNER_ROLES) {
  const d = signerDrafts[role]
  if (!d.name.trim() || !d.email.trim()) continue
  const sigRes = await assignSigner(result.id, role, d.name, d.email)
  if (!sigRes.ok) {
    uploadErrors.push(`${SIGNER_ROLE_LABELS[role]}: ${sigRes.error}`)
  }
}
```

(`uploadErrors` is the existing array already collecting failures — the existing logic shows them in `setError`.)

- [ ] **Step 4: TypeScript check**

```bash
cd digitek-platform && npx tsc --noEmit
```

Expected: Exit 0.

- [ ] **Step 5: Manual QA**

After Vercel deploy:
1. `/tenders/new` — ודא stepper מציג 5 שלבים
2. עבור שלבים 1-3 כרגיל
3. בשלב 4 — מלא תקציבן + סמנכ"ל. השאר השאר ריק
4. אם תמלא שם בלי מייל — ודא שהכפתור "המשך" disabled
5. עבור לשלב 5 (סקירה). ודא שכתוב "2 תפקידים מוגדרים"
6. צור הליך. ב-Tender 360 — ודא ש-2 התפקידים מופיעים בכרטיס צוות חתימות

- [ ] **Step 6: Commit**

```bash
git add digitek-platform/src/pages/TenderWizardSignersStep.tsx \
       digitek-platform/src/pages/TenderWizardSignersStep.module.css \
       digitek-platform/src/pages/TenderWizardPage.tsx
git commit -m "feat(tenders/signers): שלב 4 בוויזרד יצירת הליך — צוות חתימות

שלב חדש בין 'בריף+פרוטוקול' ל'סקירה' (סך הכל 5 שלבים).
- 5 כרטיסי תפקיד עם שדות שם+מייל
- אופציונלי לחלוטין — אפשר לסיים בלי למלא כלום
- ולידציה: שם בלי מייל / להיפך → המשך disabled

ב-handleSubmit: אחרי uploads, לכל תפקיד שמולא נקרא tender_signer_assign.
כשל לא חוסם — נשמר ב-uploadErrors ומוצג למשתמש אחרי navigate.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push origin develop
```

---

## Task 8: ApprovalRequestModal pre-fill from active signers

**Files:**
- Modify: `digitek-platform/src/modules/tenders/components/modals/ApprovalRequestModal.tsx`

**Interfaces:**
- Consumes: `signers` prop (new) — `TenderSigner[]`
- Pre-fills `emails` state with active signer email מהתפקיד המתאים ל-requestType / requestedRole

- [ ] **Step 1: Add `signers` prop to ApprovalRequestModal**

Add to Props interface:
```tsx
import type { ApprovalRequestType, TenderApprovalRequest, TenderSigner, SignerRole } from '../../types'
import { activeByRole } from '../../lib/signers'

interface Props {
  // ... existing
  signers?: TenderSigner[]
}
```

Add to function signature:
```tsx
export function ApprovalRequestModal({
  open, onClose, tenderId, requestType, requestedRole, customTitle,
  estimatedAmount, onSubmitted, resubmitOf, previousDocs,
  signers,
}: Props) {
```

Add mapping helper at module top-level:
```tsx
// מיפוי requestType ל-role. עבור contract_signature משתמשים ב-requestedRole שמועבר.
const REQUEST_TYPE_TO_SIGNER_ROLE: Partial<Record<ApprovalRequestType, SignerRole>> = {
  budget_approval:    'budget_officer',
  committee_outbound: 'committee_head',
  committee_winner:   'committee_head',
}

function resolveSignerRole(
  requestType: ApprovalRequestType,
  requestedRole?: string,
): SignerRole | null {
  if (requestType === 'contract_signature' && requestedRole) {
    if (requestedRole === 'legal_professional' || requestedRole === 'treasurer' || requestedRole === 'signatory') {
      return requestedRole
    }
  }
  return REQUEST_TYPE_TO_SIGNER_ROLE[requestType] ?? null
}
```

Find the existing `initialEmails` helper:
```tsx
const initialEmails = (): string[] => {
  if (!resubmitOf) return []
  // ...
}
```

Modify it to fall back to signer email when no resubmit:
```tsx
const initialEmails = (): string[] => {
  if (resubmitOf) {
    const rec = resubmitOf.metadata?.recipients
    if (Array.isArray(rec)) return rec.filter((r): r is string => typeof r === 'string')
    return []
  }
  // Pre-fill from active signer
  if (signers && signers.length > 0) {
    const targetRole = resolveSignerRole(requestType, requestedRole)
    if (targetRole) {
      const active = activeByRole(signers, targetRole)
      if (active) return [active.email]
    }
  }
  return []
}
```

- [ ] **Step 2: Pass `signers` from TenderDetailPage**

In `TenderDetailPage.tsx`, find ALL `<ApprovalRequestModal ... />` instances. There are 2 (budget_approval + resubmit). Add `signers={signers}` to both.

Example:
```tsx
<ApprovalRequestModal
  open={activeAction === 'create_budget_approval'}
  onClose={closeAction}
  tenderId={tender.id}
  requestType="budget_approval"
  estimatedAmount={tender.estimated_amount}
  signers={signers}
  onSubmitted={onActionDone}
/>
```

Also pass to the resubmit modal:
```tsx
<ApprovalRequestModal
  open={!!resubmitRequest}
  onClose={() => setResubmitRequest(null)}
  tenderId={tender.id}
  requestType={(resubmitRequest?.request_type ?? 'budget_approval') as ApprovalRequestType}
  estimatedAmount={tender.estimated_amount}
  resubmitOf={resubmitRequest ?? undefined}
  signers={signers}
  previousDocs={/* ... */}
  onSubmitted={async () => { /* ... */ }}
/>
```

- [ ] **Step 3: Pass `signers` from SignatureRequestModal**

`SignatureRequestModal` is a wrapper. Open `SignatureRequestModal.tsx` and add `signers` as a forwarded prop:

```tsx
import type { PersonaRole, TenderSigner } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
  tenderId: string
  signerRole: PersonaRole
  signers?: TenderSigner[]
  onSubmitted: () => void
}

export function SignatureRequestModal({ open, onClose, tenderId, signerRole, signers, onSubmitted }: Props) {
  const roleLabel = ROLE_LABELS[signerRole] ?? signerRole
  return (
    <ApprovalRequestModal
      open={open}
      onClose={onClose}
      tenderId={tenderId}
      requestType="contract_signature"
      requestedRole={signerRole}
      customTitle={`בקשת חתימה — ${roleLabel}`}
      signers={signers}
      onSubmitted={onSubmitted}
    />
  )
}
```

Then in `TenderDetailPage.tsx`, the 3 `<SignatureRequestModal>` calls — add `signers={signers}` to each (legal/treasurer/vp).

- [ ] **Step 4: TypeScript check**

```bash
cd digitek-platform && npx tsc --noEmit
```

Expected: Exit 0.

- [ ] **Step 5: Manual QA**

1. ביצור הליך עם תקציבן מוגדר (Task 7 או דרך SignersEditModal)
2. עבור ל-T1, לחץ "בקש אישור תקציבי"
3. ודא שבשלב הנמענים בטופס יש chip עם המייל של התקציבן
4. במקרה הפוך: הליך בלי תקציבן מוגדר → המודאל נפתח עם רשימת נמענים ריקה (התנהגות קיימת — אין רגרסיה)
5. ב-T3, לחץ על "בקש חתימת חשב" → ודא pre-fill מהמייל של החשב

- [ ] **Step 6: Commit**

```bash
git add digitek-platform/src/modules/tenders/components/modals/ApprovalRequestModal.tsx \
       digitek-platform/src/modules/tenders/components/modals/SignatureRequestModal.tsx \
       digitek-platform/src/pages/TenderDetailPage.tsx
git commit -m "feat(tenders/signers): pre-fill נמענים ב-ApprovalRequestModal מצוות החתימות

מיפוי REQUEST_TYPE_TO_SIGNER_ROLE:
- budget_approval → budget_officer
- committee_outbound / committee_winner → committee_head
- contract_signature → לפי requestedRole (legal/treasurer/signatory)

initialEmails() עכשיו שולף את active signer של התפקיד המתאים מ-signers
שמועבר ב-prop. resubmitOf עדיין מקבל קדימות. אם אין signer מתאים, נשאר
ריק (התנהגות קיימת).

SignatureRequestModal forward את signers ל-ApprovalRequestModal.
TenderDetailPage מעביר signers ל-2 instances של ApprovalRequestModal
ו-3 instances של SignatureRequestModal.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push origin develop
```

---

## Task 9: Final QA + CLAUDE.md update

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- N/A — task סופי לאימות End-to-End ותיעוד

- [ ] **Step 1: End-to-end QA Vercel preview**

1. **יצירת הליך עם signers**: צור הליך חדש דרך `/tenders/new`. בשלב 4 מלא 3 תפקידים (תקציבן, משפטן, סמנכ"ל). סיים, וודא ב-Tender 360 שהם מופיעים בכרטיס Sidebar
2. **תפקיד חסר**: ודא ש-`חשב` ו-`מנהלת ועדה` מסומנים "לא הוגדר" עם אזהרה צהובה
3. **pre-fill בבקשה**: ב-T1, לחץ "בקש אישור תקציבי" → ודא שהמייל של התקציבן pre-filled. שלח את הבקשה ל-tomersananes10@gmail.com (כי Resend free tier)
4. **החלפה**: לחץ "✎ ערוך" → בחר "החלף אדם" על התקציבן → מלא חדש → שמור. ודא היסטוריה
5. **עדכון בלבד**: לחץ "✎ ערוך" → בחר "עדכן פרטים" על המשפטן → שנה מייל → שמור. ודא שלא נוצרה גרסת היסטוריה (אותה id, חדש email)
6. **הסרה**: לחץ "✎ ערוך" → "🗑 הסר" על מנהלת ועדה (אם הוגדרה) → confirm. ודא שעוברת להיסטוריה

- [ ] **Step 2: Update CLAUDE.md history table**

Find the history table in section 9 of CLAUDE.md. Add new row at top of recent entries:

```markdown
| 20.06 | **feat(tenders/signers): צוות מורשי חתימה פר-הליך (טאסק חדש מלא)**. פיצ'ר חדש להגדרת מורשי חתימה ברמת ההליך עם versioning גלוי. **migration 029** — טבלת `tender_signers` עם `replaces_id` + `replaced_at` + 4 RPCs (assign/replace/update/remove, SECURITY DEFINER, audit log). 5 תפקידים: תקציבן, משפטן, **חשב (חדש — treasurer)**, סמנכ"ל, **מנהלת ועדה (חדש — committee_head)**. **שלב 4 חדש בוויזרד** (4 מתוך 5, אופציונלי למילוי) בקובץ חדש [TenderWizardSignersStep.tsx](digitek-platform/src/pages/TenderWizardSignersStep.tsx). **כרטיס Sidebar קבוע** ב-Tender 360 ([SignersSidebar.tsx](digitek-platform/src/modules/tenders/components/SignersSidebar.tsx)) שמציג active + history + אזהרות "חסר — נדרש לפני T#". **SignersEditModal** ([כאן](digitek-platform/src/modules/tenders/components/modals/SignersEditModal.tsx)) עם 3 מצבים פר תפקיד: עדכן פרטים / החלף אדם / הסר. **pre-fill ב-ApprovalRequestModal**: מיפוי `budget_approval→budget_officer`, `committee_*→committee_head`, `contract_signature→requestedRole`. **breaking rename** — `SignatureRequestModal` עבור חתימת חשב T3/T7 עבר מ-`budget_officer` ל-`treasurer` חדש כדי להפריד מתקציבן T1. תוכנית: [docs/superpowers/plans/2026-06-20-tender-signers.md](docs/superpowers/plans/2026-06-20-tender-signers.md). |
```

- [ ] **Step 3: Update last session in CLAUDE.md**

Replace section 10 "שיחה אחרונה" content with summary of this work:

```markdown
## 10. שיחה אחרונה

> **תאריך**: 20.06.2026
> **נושא**: צוות מורשי חתימה פר-הליך — feature חדש מלא

### החלטות מקדימות
- המשתמש העלה תקלה שכל הנמענים יכולים לחתום על בקשת אישור, אבל בעולם האמיתי יש מורשי חתימה ספציפיים
- בוצע brainstorming סטרוקטורי עם 3 מוקאפים (A/B/C) — נבחר A: בוויזרד + Sidebar
- 5 תפקידים בקטלוג קבוע: תקציבן, משפטן, חשב, סמנכ"ל, מנהלת ועדה
- בחירה פר-הליך אילו רלוונטיים — אופציונלי לחלוטין
- החלפה עם versions (history גלוי בכרטיס)
- בקשות in-flight לא מושפעות — הטוקן הישן נשאר תקף
- spec: [docs/superpowers/specs/2026-06-20-tender-signers-design.md](docs/superpowers/specs/2026-06-20-tender-signers-design.md)
- plan: [docs/superpowers/plans/2026-06-20-tender-signers.md](docs/superpowers/plans/2026-06-20-tender-signers.md)

### מה בוצע (9 משימות בקומיטים נפרדים)
1. Migration 029 + 4 RPCs
2. Types + lib/signers.ts
3. budget_officer → treasurer rename ב-T3/T7
4. useTender extension (signers fetch)
5. SignersSidebar component
6. SignersEditModal
7. Wizard step 4 חדש
8. ApprovalRequestModal pre-fill
9. CLAUDE.md + E2E QA

### אימות
- ✅ `npx tsc --noEmit` עבר נקי אחרי כל קומיט
- ✅ QA ידני E2E: יצירה, החלפה, עדכון, הסרה, pre-fill

### עוד לא בוצע
- [ ] **מאגר ארגוני** של מורשי חתימה ברמת משרד — מתוכנן לעתיד
- [ ] **שכפול signers בין הליכים** (template) — לעתיד
- [ ] **טאב נפרד עם timeline מפורט** — לעתיד אם יידרש
```

- [ ] **Step 4: Final commit**

```bash
git add CLAUDE.md
git commit -m "docs: עדכון CLAUDE.md — צוות מורשי חתימה פר-הליך (Task 9)

עדכון טבלת היסטוריה + סקציה 10 (שיחה אחרונה) עם סיכום מלא של 9 הטאסקים
של פיצ'ר מורשי החתימה.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push origin develop
```

---

## Self-Review

**1. Spec coverage** — checked each section of the spec:
- ✅ Roles catalog (5 fixed) → Task 2 SIGNER_ROLES + SIGNER_ROLE_LABELS
- ✅ Per-tender selection → optional fields throughout
- ✅ Wizard placement → Task 7 (step 4)
- ✅ Sidebar card persistent → Task 5
- ✅ Replacement with versions → Task 1 (replaces_id) + Task 5 (history section)
- ✅ Pre-fill in ApprovalRequestModal → Task 8
- ✅ In-flight approvals untouched → no changes to existing flow (verified — nothing in plan modifies tender_approval_tokens)
- ✅ DB schema → Task 1
- ✅ `budget_officer → treasurer` rename → Task 3 + Task 2 types
- ✅ Files to touch (summary section in spec) → all 13 files covered across tasks

**2. Placeholder scan** — no TBD/TODO/placeholder code. Each step shows actual code or commands.

**3. Type consistency** — verified:
- `SignerRole` defined Task 2 → used Tasks 5, 6, 7, 8 consistently
- `TenderSigner` defined Task 2 → used Tasks 4, 5, 6, 8
- `assignSigner`/`replaceSigner`/`updateSigner`/`removeSigner` signatures defined Task 2 → called Tasks 6, 7 with matching args
- `activeByRole`/`historyByRole` defined Task 2 → called Tasks 5, 6, 8 with matching signatures
- DB `tender_signer_*` RPC names match TS wrappers (`tender_signer_assign` vs `assignSigner`)

**4. Edge case check**:
- Wizard signer fails → `uploadErrors` collected, tender still created, navigate happens (consistent with existing upload-error behavior)
- Edit modal: partial input (name without email) → error per role, blocks save
- Edit modal: update with unchanged values → skip RPC (cheap optimization)
- Replace with same email as current — DB partial unique index would fail (would create new row, then old marked replaced — fine, no collision)

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-20-tender-signers.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
