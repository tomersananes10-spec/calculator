# Calculation History & Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add calculation history (save/load/delete) and sharing with view/edit permissions to the TAKAM calculator.

**Architecture:** Two new Supabase tables (`calculations`, `calculation_shares`) with RLS policies. A `useCalculationHistory` hook handles all DB operations. The calculator gets a slide-in history panel, a save button on Step4, and an expanded share dialog with permission selection. The dashboard gets a "recent calculations" card. Share links use token-based routing via `?share=TOKEN` query param.

**Tech Stack:** React, TypeScript, Supabase (RLS, JSONB), CSS Modules, react-router-dom

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/modules/takam-calculator/useCalculationHistory.ts` | Hook: save, load, list, delete calculations + create/list shares from Supabase |
| `src/modules/takam-calculator/HistoryPanel.tsx` | Slide-in side panel listing saved calculations |
| `src/modules/takam-calculator/ShareDialog.tsx` | Modal dialog for sharing with permission selection (view/edit) |

### Modified Files
| File | Changes |
|------|---------|
| `src/modules/takam-calculator/types.ts` | Add `calculationId` to CalcState, add `LOAD_CALCULATION` and `SET_CALCULATION_ID` actions |
| `src/modules/takam-calculator/useCalculator.ts` | Add `LOAD_CALCULATION` and `SET_CALCULATION_ID` reducer cases |
| `src/modules/takam-calculator/TakamCalculator.tsx` | Add history button, mount HistoryPanel, handle `?share=TOKEN` on mount |
| `src/modules/takam-calculator/Step4Results.tsx` | Add save button, replace share menu with ShareDialog |
| `src/modules/takam-calculator/TakamCalculator.module.css` | Styles for history panel, share dialog, save button, dashboard card |
| `src/pages/Dashboard.tsx` | Add "recent calculations" card |
| `src/pages/Dashboard.module.css` | Styles for the calculations card |
| `src/App.tsx` | No changes needed — `/calculator` route already exists |

---

## Task 1: Supabase Migration — Tables & RLS

**Files:**
- Execute: SQL migration via Supabase dashboard or MCP tool

- [ ] **Step 1: Create `calculations` table**

```sql
CREATE TABLE calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  ministry text NOT NULL DEFAULT '',
  period smallint NOT NULL DEFAULT 12,
  matching_on boolean NOT NULL DEFAULT true,
  matching_pct smallint NOT NULL DEFAULT 30,
  risk_pct smallint NOT NULL DEFAULT 18,
  hours_multiplier numeric NOT NULL DEFAULT 1,
  mix jsonb NOT NULL DEFAULT '[]'::jsonb,
  grand_total integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE calculations ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Create `calculation_shares` table**

```sql
CREATE TABLE calculation_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calculation_id uuid NOT NULL REFERENCES calculations(id) ON DELETE CASCADE,
  shared_with uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  permission text NOT NULL CHECK (permission IN ('view', 'edit')),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE calculation_shares ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 3: Create RLS policies for `calculations`**

```sql
CREATE POLICY "Owner can do everything" ON calculations
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Shared users can select" ON calculations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM calculation_shares
      WHERE calculation_shares.calculation_id = calculations.id
        AND calculation_shares.shared_with = auth.uid()
    )
  );

CREATE POLICY "Edit-shared users can update" ON calculations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM calculation_shares
      WHERE calculation_shares.calculation_id = calculations.id
        AND calculation_shares.shared_with = auth.uid()
        AND calculation_shares.permission = 'edit'
    )
  );
```

- [ ] **Step 4: Create RLS policies for `calculation_shares`**

```sql
CREATE POLICY "Owner of calculation manages shares" ON calculation_shares
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM calculations
      WHERE calculations.id = calculation_shares.calculation_id
        AND calculations.owner_id = auth.uid()
    )
  );

CREATE POLICY "Shared user can see their shares" ON calculation_shares
  FOR SELECT USING (shared_with = auth.uid());
```

- [ ] **Step 5: Create policy for public view tokens (anonymous access)**

```sql
CREATE POLICY "Anyone can select by token" ON calculation_shares
  FOR SELECT USING (shared_with IS NULL AND permission = 'view');

CREATE POLICY "View by public token" ON calculations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM calculation_shares
      WHERE calculation_shares.calculation_id = calculations.id
        AND calculation_shares.shared_with IS NULL
        AND calculation_shares.permission = 'view'
    )
  );
```

- [ ] **Step 6: Create updated_at trigger**

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculations_updated_at
  BEFORE UPDATE ON calculations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(db): add calculations and calculation_shares tables with RLS"
```

---

## Task 2: Types & Reducer — Add `LOAD_CALCULATION` and `calculationId`

**Files:**
- Modify: `src/modules/takam-calculator/types.ts`
- Modify: `src/modules/takam-calculator/useCalculator.ts`

- [ ] **Step 1: Add `calculationId` to CalcState and new actions to CalcAction**

In `types.ts`, add `calculationId` field to `CalcState`:

```typescript
export interface CalcState {
  project: ProjectInfo
  period: 6 | 12 | 24
  matchingOn: boolean
  matchingPct: number
  selectedIds: Set<string>
  mix: MixEntry[]
  hoursMultiplier: number
  riskPct: number
  currentStep: 1 | 2 | 3 | 4
  rolesData: Role[]
  aiNeedsFill: boolean
  viewOnly: boolean
  calculationId: string | null  // <-- ADD THIS
}
```

Add to the `CalcAction` union:

```typescript
  | { type: 'SET_CALCULATION_ID'; payload: string | null }
  | { type: 'LOAD_CALCULATION'; payload: {
      calculationId: string
      project: ProjectInfo
      period: 6 | 12 | 24
      matchingOn: boolean
      matchingPct: number
      riskPct: number
      hoursMultiplier: number
      mix: MixEntry[]
    }}
```

- [ ] **Step 2: Add reducer cases in `useCalculator.ts`**

Add `calculationId: null` to `INITIAL_STATE`.

Add two new cases to the reducer:

```typescript
    case 'SET_CALCULATION_ID':
      return { ...state, calculationId: action.payload }
    case 'LOAD_CALCULATION': {
      const { calculationId, project, period, matchingOn, matchingPct, riskPct, hoursMultiplier, mix } = action.payload
      const selectedIds = new Set(mix.map(m => m.id))
      return {
        ...state,
        calculationId,
        project,
        period,
        matchingOn,
        matchingPct,
        riskPct,
        hoursMultiplier,
        mix,
        selectedIds,
        currentStep: 4 as const,
        viewOnly: false,
      }
    }
```

Also update the `RESET` case to include `calculationId: null`:

```typescript
    case 'RESET':
      return { ...INITIAL_STATE, rolesData: ROLES_DATA, calculationId: null }
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/takam-calculator/types.ts src/modules/takam-calculator/useCalculator.ts
git commit -m "feat(takam): add calculationId state and LOAD_CALCULATION action"
```

---

## Task 3: `useCalculationHistory` Hook

**Files:**
- Create: `src/modules/takam-calculator/useCalculationHistory.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { CalcState, MixEntry } from './types'
import { calcTotalCost } from './calc'

export interface SavedCalculation {
  id: string
  name: string
  ministry: string
  period: number
  matching_on: boolean
  matching_pct: number
  risk_pct: number
  hours_multiplier: number
  mix: MixEntry[]
  grand_total: number
  created_at: string
  updated_at: string
}

export interface ShareRecord {
  id: string
  calculation_id: string
  permission: 'view' | 'edit'
  token: string
  created_at: string
}

export function useCalculationHistory(userId: string | undefined) {
  const [calculations, setCalculations] = useState<SavedCalculation[]>([])
  const [loading, setLoading] = useState(false)

  const fetchCalculations = useCallback(async () => {
    if (!userId) { setCalculations([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('calculations')
      .select('*')
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false })
    setCalculations((data as SavedCalculation[]) ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchCalculations() }, [fetchCalculations])

  async function saveCalculation(state: CalcState): Promise<string | null> {
    if (!userId) return null
    const { net } = calcTotalCost(state.mix, state.period, state.matchingOn, state.matchingPct, state.rolesData, state.hoursMultiplier)
    const riskAmt = Math.round(net * state.riskPct / 100)
    const manpowerTotal = net + riskAmt
    const overhead = Math.round(manpowerTotal * 0.10)
    const contingency = Math.round((manpowerTotal + overhead) * 0.05)
    const subtotal = manpowerTotal + overhead + contingency
    const vat = Math.round(subtotal * 0.17)
    const grandTotal = subtotal + vat

    const row = {
      owner_id: userId,
      name: state.project.name,
      ministry: state.project.ministry,
      period: state.period,
      matching_on: state.matchingOn,
      matching_pct: state.matchingPct,
      risk_pct: state.riskPct,
      hours_multiplier: state.hoursMultiplier,
      mix: state.mix.map(m => ({ id: m.id, level: m.level, scope: m.scope, customHours: m.customHours })),
      grand_total: grandTotal,
    }

    if (state.calculationId) {
      const { error } = await supabase
        .from('calculations')
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq('id', state.calculationId)
      if (error) return null
      await fetchCalculations()
      return state.calculationId
    } else {
      const { data, error } = await supabase
        .from('calculations')
        .insert(row)
        .select('id')
        .single()
      if (error || !data) return null
      await fetchCalculations()
      return data.id
    }
  }

  async function deleteCalculation(id: string) {
    await supabase.from('calculations').delete().eq('id', id)
    await fetchCalculations()
  }

  async function createShare(calculationId: string, permission: 'view' | 'edit'): Promise<string | null> {
    const { data, error } = await supabase
      .from('calculation_shares')
      .insert({ calculation_id: calculationId, permission, shared_with: null })
      .select('token')
      .single()
    if (error || !data) return null
    return data.token
  }

  async function loadByToken(token: string): Promise<{ calculation: SavedCalculation; permission: 'view' | 'edit' } | null> {
    const { data: shareData } = await supabase
      .from('calculation_shares')
      .select('calculation_id, permission')
      .eq('token', token)
      .single()
    if (!shareData) return null

    const { data: calc } = await supabase
      .from('calculations')
      .select('*')
      .eq('id', shareData.calculation_id)
      .single()
    if (!calc) return null

    return { calculation: calc as SavedCalculation, permission: shareData.permission as 'view' | 'edit' }
  }

  return {
    calculations,
    loading,
    saveCalculation,
    deleteCalculation,
    createShare,
    loadByToken,
    refresh: fetchCalculations,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/takam-calculator/useCalculationHistory.ts
git commit -m "feat(takam): add useCalculationHistory hook for Supabase CRUD"
```

---

## Task 4: History Panel Component

**Files:**
- Create: `src/modules/takam-calculator/HistoryPanel.tsx`
- Modify: `src/modules/takam-calculator/TakamCalculator.module.css`

- [ ] **Step 1: Create HistoryPanel component**

```tsx
import { useState } from 'react'
import type { SavedCalculation } from './useCalculationHistory'
import { fmtCurrency } from './calc'
import s from './TakamCalculator.module.css'

interface Props {
  open: boolean
  onClose: () => void
  calculations: SavedCalculation[]
  loading: boolean
  onLoad: (calc: SavedCalculation) => void
  onDelete: (id: string) => void
}

const PERIOD_LABELS: Record<number, string> = { 6: '6 חודשים', 12: 'שנה', 24: 'שנתיים' }

export function HistoryPanel({ open, onClose, calculations, loading, onLoad, onDelete }: Props) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  if (!open) return null

  function handleDelete(id: string) {
    if (confirmDeleteId === id) {
      onDelete(id)
      setConfirmDeleteId(null)
    } else {
      setConfirmDeleteId(id)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  return (
    <>
      <div className={s.historyOverlay} onClick={onClose} />
      <div className={s.historyPanel}>
        <div className={s.historyHeader}>
          <h3 className={s.historyTitle}>החישובים שלי</h3>
          <button className={s.historyClose} onClick={onClose}>✕</button>
        </div>

        {loading && <p className={s.historyEmpty}>טוען...</p>}

        {!loading && calculations.length === 0 && (
          <p className={s.historyEmpty}>אין חישובים שמורים עדיין</p>
        )}

        <div className={s.historyList}>
          {calculations.map(calc => (
            <div key={calc.id} className={s.historyCard}>
              <div className={s.historyCardTop}>
                <div className={s.historyCardInfo}>
                  <span className={s.historyCardName}>{calc.name || 'ללא שם'}</span>
                  <span className={s.historyCardMinistry}>{calc.ministry}</span>
                </div>
                <span className={s.historyCardTotal}>{fmtCurrency(calc.grand_total, true)}</span>
              </div>
              <div className={s.historyCardMeta}>
                <span>{PERIOD_LABELS[calc.period] ?? calc.period + ' חודשים'}</span>
                <span>{calc.mix.length} תפקידים</span>
                <span>{formatDate(calc.updated_at)}</span>
              </div>
              <div className={s.historyCardActions}>
                <button className={s.historyLoadBtn} onClick={() => onLoad(calc)}>טען</button>
                <button
                  className={s.historyDeleteBtn}
                  onClick={() => handleDelete(calc.id)}
                >
                  {confirmDeleteId === calc.id ? 'בטוח?' : 'מחק'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Add history panel CSS to `TakamCalculator.module.css`**

Add at the end of the file, before the `@media print` rule:

```css
/* ── History Panel ── */
.historyOverlay {
  position: fixed; inset: 0; background: rgba(15,23,42,0.5);
  z-index: 400; cursor: pointer;
}
.historyPanel {
  position: fixed; top: 0; right: 0; bottom: 0;
  width: 380px; max-width: 90vw;
  background: var(--surface); z-index: 401;
  box-shadow: -8px 0 30px rgba(0,0,0,0.15);
  display: flex; flex-direction: column;
  animation: slideInRight 0.25s ease;
}
@keyframes slideInRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
.historyHeader {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 20px 16px; border-bottom: 1px solid var(--border);
}
.historyTitle { font-size: 18px; font-weight: 800; color: var(--text); margin: 0; }
.historyClose {
  background: none; border: none; font-size: 18px; color: var(--text3);
  cursor: pointer; padding: 4px; line-height: 1;
}
.historyClose:hover { color: var(--text); }
.historyList {
  flex: 1; overflow-y: auto; padding: 16px;
  display: flex; flex-direction: column; gap: 10px;
}
.historyEmpty {
  text-align: center; color: var(--text3); font-size: 14px;
  padding: 40px 16px;
}
.historyCard {
  background: var(--bg); border: 1.5px solid var(--border);
  border-radius: var(--radius); padding: 14px; transition: border-color 0.15s;
}
.historyCard:hover { border-color: var(--teal); }
.historyCardTop {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 8px;
}
.historyCardInfo { display: flex; flex-direction: column; gap: 2px; }
.historyCardName { font-size: 14px; font-weight: 700; color: var(--text); }
.historyCardMinistry { font-size: 12px; color: var(--text3); }
.historyCardTotal { font-size: 15px; font-weight: 800; color: var(--teal); }
.historyCardMeta {
  display: flex; gap: 12px; font-size: 11px; color: var(--text3);
  margin-bottom: 10px;
}
.historyCardActions { display: flex; gap: 8px; }
.historyLoadBtn {
  flex: 1; padding: 7px; border-radius: 8px;
  background: var(--teal); color: #fff; border: none;
  font-size: 12px; font-weight: 700; cursor: pointer;
  font-family: Heebo, sans-serif; transition: opacity 0.15s;
}
.historyLoadBtn:hover { opacity: 0.9; }
.historyDeleteBtn {
  padding: 7px 12px; border-radius: 8px;
  background: transparent; color: var(--text3);
  border: 1px solid var(--border2);
  font-size: 12px; font-weight: 600; cursor: pointer;
  font-family: Heebo, sans-serif; transition: all 0.15s;
}
.historyDeleteBtn:hover { border-color: var(--red); color: var(--red); }

/* ── History button in header ── */
.historyBtn {
  display: flex; align-items: center; gap: 6px;
  background: var(--surface); border: 1.5px solid var(--border);
  border-radius: 10px; padding: 8px 14px;
  font-size: 13px; font-weight: 600; color: var(--text2);
  cursor: pointer; font-family: Heebo, sans-serif;
  transition: all 0.15s; position: relative;
}
.historyBtn:hover { border-color: var(--teal); color: var(--teal); }
.historyBadge {
  background: var(--teal); color: #fff;
  font-size: 10px; font-weight: 700;
  padding: 1px 6px; border-radius: 10px;
  min-width: 18px; text-align: center;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/takam-calculator/HistoryPanel.tsx src/modules/takam-calculator/TakamCalculator.module.css
git commit -m "feat(takam): add HistoryPanel slide-in component"
```

---

## Task 5: Share Dialog Component

**Files:**
- Create: `src/modules/takam-calculator/ShareDialog.tsx`
- Modify: `src/modules/takam-calculator/TakamCalculator.module.css`

- [ ] **Step 1: Create ShareDialog component**

```tsx
import { useState } from 'react'
import s from './TakamCalculator.module.css'

interface Props {
  open: boolean
  onClose: () => void
  calculationId: string | null
  grandTotal: number
  onCreateShare: (permission: 'view' | 'edit') => Promise<string | null>
  formatCurrency: (n: number, compact?: boolean) => string
}

export function ShareDialog({ open, onClose, calculationId, grandTotal, onCreateShare, formatCurrency }: Props) {
  const [permission, setPermission] = useState<'view' | 'edit'>('view')
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!open) return null

  function getShareURL(tok: string) {
    return `${location.origin}/calculator?share=${tok}`
  }

  async function handleGenerate() {
    setLoading(true)
    const tok = await onCreateShare(permission)
    setToken(tok)
    setLoading(false)
  }

  function copyLink() {
    if (!token) return
    const url = getShareURL(token)
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }).catch(() => fallbackCopy(url))
    } else {
      fallbackCopy(url)
    }
  }

  function fallbackCopy(text: string) {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function shareWhatsApp() {
    if (!token) return
    const url = getShareURL(token)
    const text = `הצעת מחיר תכ"ם — ${formatCurrency(grandTotal, true)}\n${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  function shareEmail() {
    if (!token) return
    const url = getShareURL(token)
    const subject = `הצעת מחיר תכ"ם — ${formatCurrency(grandTotal, true)}`
    const body = `צפה בהצעת המחיר:\n${url}`
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
  }

  function handleClose() {
    setToken(null)
    setCopied(false)
    setPermission('view')
    onClose()
  }

  return (
    <>
      <div className={s.historyOverlay} onClick={handleClose} />
      <div className={s.shareDialog}>
        <div className={s.shareDialogHeader}>
          <h3 className={s.shareDialogTitle}>שיתוף חישוב</h3>
          <button className={s.historyClose} onClick={handleClose}>✕</button>
        </div>

        <div className={s.shareDialogBody}>
          {!calculationId && (
            <p className={s.shareDialogNote}>יש לשמור את החישוב לפני שיתוף</p>
          )}

          {calculationId && !token && (
            <>
              <div className={s.sharePermPicker}>
                <label className={s.shareDialogLabel}>הרשאה:</label>
                <div className={s.seg}>
                  <button
                    className={`${s.segBtn} ${permission === 'view' ? s.segBtnActive : ''}`}
                    onClick={() => setPermission('view')}
                  >
                    צפייה בלבד
                  </button>
                  <button
                    className={`${s.segBtn} ${permission === 'edit' ? s.segBtnActive : ''}`}
                    onClick={() => setPermission('edit')}
                  >
                    עריכה
                  </button>
                </div>
                {permission === 'edit' && (
                  <p className={s.shareDialogHint}>הנמען יצטרך להיות מחובר למערכת</p>
                )}
              </div>
              <button
                className={s.btnPrimary}
                onClick={handleGenerate}
                disabled={loading}
                style={{ width: '100%' }}
              >
                {loading ? 'יוצר קישור...' : 'צור קישור שיתוף'}
              </button>
            </>
          )}

          {calculationId && token && (
            <>
              <div className={s.shareLinkBox}>
                <input
                  className={s.input}
                  readOnly
                  value={getShareURL(token)}
                  onFocus={e => e.target.select()}
                />
              </div>
              <div className={s.shareActions}>
                <button className={s.shareActionBtn} onClick={copyLink}>
                  {copied ? '✓ הועתק!' : '📋 העתק קישור'}
                </button>
                <button className={s.shareActionBtn} onClick={shareWhatsApp}>
                  💬 וואטסאפ
                </button>
                <button className={s.shareActionBtn} onClick={shareEmail}>
                  📧 מייל
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Add share dialog CSS to `TakamCalculator.module.css`**

Add after the history panel styles:

```css
/* ── Share Dialog ── */
.shareDialog {
  position: fixed; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  background: var(--surface); border-radius: 16px;
  width: 420px; max-width: 90vw;
  z-index: 401; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  animation: fadeInScale 0.2s ease;
}
@keyframes fadeInScale {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
.shareDialogHeader {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 20px 16px; border-bottom: 1px solid var(--border);
}
.shareDialogTitle { font-size: 18px; font-weight: 800; color: var(--text); margin: 0; }
.shareDialogBody { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.shareDialogLabel { font-size: 13px; font-weight: 600; color: var(--text2); margin-bottom: 6px; }
.shareDialogNote { font-size: 14px; color: var(--amber); text-align: center; }
.shareDialogHint { font-size: 11px; color: var(--text3); margin-top: 6px; }
.sharePermPicker { display: flex; flex-direction: column; gap: 8px; }
.shareLinkBox { display: flex; gap: 8px; }
.shareLinkBox .input { direction: ltr; font-size: 12px; }
.shareActions { display: flex; gap: 8px; }
.shareActionBtn {
  flex: 1; padding: 10px 8px; border-radius: 9px;
  background: var(--bg); border: 1.5px solid var(--border);
  font-size: 12px; font-weight: 600; color: var(--text2);
  cursor: pointer; font-family: Heebo, sans-serif;
  text-align: center; transition: all 0.15s;
}
.shareActionBtn:hover { border-color: var(--teal); color: var(--teal); }
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/takam-calculator/ShareDialog.tsx src/modules/takam-calculator/TakamCalculator.module.css
git commit -m "feat(takam): add ShareDialog component with permission toggle"
```

---

## Task 6: Wire Up TakamCalculator — History Button & Share Token Loading

**Files:**
- Modify: `src/modules/takam-calculator/TakamCalculator.tsx`

- [ ] **Step 1: Update TakamCalculator.tsx**

Replace the full content of `TakamCalculator.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCalculator } from './useCalculator'
import { useAuth } from '../../hooks/useAuth'
import { useCalculationHistory } from './useCalculationHistory'
import { Step1Setup }       from './Step1Setup'
import { Step2Roles }       from './Step2Roles'
import { Step3Mix }         from './Step3Mix'
import { Step4Results }     from './Step4Results'
import { AiAdvisorModal }   from './AiAdvisorModal'
import { HistoryPanel }     from './HistoryPanel'
import { ROLES_DATA }       from './data'
import type { MixEntry, Level } from './types'
import s from './TakamCalculator.module.css'

const STEP_NAMES = ['הגדרת פרויקט', 'בחירת תפקידים', 'רמות ומשרות', 'תוצאות']

export function TakamCalculator() {
  const [state, dispatch] = useCalculator()
  const { user } = useAuth()
  const history = useCalculationHistory(user?.id)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  // Load from share token on mount
  useEffect(() => {
    const token = searchParams.get('share')
    if (!token) return

    history.loadByToken(token).then(result => {
      if (!result) return
      const { calculation: calc, permission } = result
      dispatch({
        type: 'LOAD_CALCULATION',
        payload: {
          calculationId: calc.id,
          project: { name: calc.name, ministry: calc.ministry },
          period: calc.period as 6 | 12 | 24,
          matchingOn: calc.matching_on,
          matchingPct: calc.matching_pct,
          riskPct: calc.risk_pct,
          hoursMultiplier: calc.hours_multiplier,
          mix: calc.mix as MixEntry[],
        },
      })
      if (permission === 'view') {
        dispatch({ type: 'SET_VIEW_ONLY', payload: true })
      }
      setSearchParams({}, { replace: true })
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Legacy URL hash loading (backwards compatibility)
  useEffect(() => {
    if (searchParams.get('share')) return
    const raw = decodeURIComponent(location.hash.slice(1))
    if (!raw.startsWith('v1|')) return
    try {
      const parts = Object.fromEntries(raw.split('|').slice(1).map(p => p.split('=')))
      const period = [6, 12, 24].includes(+parts.period) ? +parts.period as 6 | 12 | 24 : 12
      dispatch({ type: 'SET_PERIOD', payload: period })
      if (parts.matching === '0') dispatch({ type: 'TOGGLE_MATCHING' })
      dispatch({ type: 'SET_MATCHING_PCT', payload: Math.min(100, Math.max(1, +parts.pct || 30)) })
      if (parts.roles) {
        const mix: MixEntry[] = parts.roles.split(',').map((r: string) => {
          const [id, level, scope] = r.split(':')
          return { id, level: level as Level, scope: +scope }
        }).filter((m: MixEntry) => ROLES_DATA.find(r => r.id === m.id))
        mix.forEach(m => dispatch({ type: 'TOGGLE_ROLE', payload: m.id }))
        mix.forEach((m, i) => {
          dispatch({ type: 'SET_LEVEL', payload: { index: i, level: m.level } })
          dispatch({ type: 'SET_SCOPE', payload: { index: i, scope: m.scope } })
        })
        if (mix.length > 0) {
          dispatch({ type: 'SET_VIEW_ONLY', payload: true })
          dispatch({ type: 'GO_STEP', payload: 4 })
        }
      }
    } catch { /* invalid hash */ }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function tryGoStep(n: 1 | 2 | 3 | 4) {
    if (!state.viewOnly && n < state.currentStep) dispatch({ type: 'GO_STEP', payload: n })
  }

  function handleLoadCalculation(calc: import('./useCalculationHistory').SavedCalculation) {
    dispatch({
      type: 'LOAD_CALCULATION',
      payload: {
        calculationId: calc.id,
        project: { name: calc.name, ministry: calc.ministry },
        period: calc.period as 6 | 12 | 24,
        matchingOn: calc.matching_on,
        matchingPct: calc.matching_pct,
        riskPct: calc.risk_pct,
        hoursMultiplier: calc.hours_multiplier,
        mix: calc.mix as MixEntry[],
      },
    })
    setHistoryOpen(false)
  }

  const isResultsStep = state.currentStep === 4

  return (
    <div className={s.page}>
      {/* Page Header */}
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>מחשבון תכ"ם</h1>
          <p className={s.pageSub}>חישוב עלויות כוח אדם וענן לפרויקט</p>
        </div>
        {user && (
          <button className={s.historyBtn} onClick={() => setHistoryOpen(true)}>
            📋 החישובים שלי
            {history.calculations.length > 0 && (
              <span className={s.historyBadge}>{history.calculations.length}</span>
            )}
          </button>
        )}
      </div>

      {/* Step Progress */}
      <div className={s.wizardProgress}>
        <div className={s.steps}>
          {STEP_NAMES.map((name, i) => {
            const n = (i + 1) as 1 | 2 | 3 | 4
            const cls = n < state.currentStep ? s.stepDone : n === state.currentStep ? s.stepActive : s.stepFuture
            return (
              <div key={n} className={`${s.step} ${cls}`} onClick={() => tryGoStep(n)}>
                <div className={s.stepNum}>{n < state.currentStep ? '✓' : String(n)}</div>
                <div className={s.stepInfo}>
                  <span className={s.stepLabel}>שלב {n}</span>
                  <span className={s.stepName}>{name}</span>
                </div>
                {i < 3 && <span className={s.stepSep}>›</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className={isResultsStep ? s.mainWide : s.main}>
        {state.currentStep === 1 && <Step1Setup state={state} dispatch={dispatch} />}
        {state.currentStep === 2 && <Step2Roles state={state} dispatch={dispatch} />}
        {state.currentStep === 3 && <Step3Mix   state={state} dispatch={dispatch} />}
        {state.currentStep === 4 && (
          <Step4Results
            state={state}
            dispatch={dispatch}
            history={history}
          />
        )}
      </div>

      {!state.viewOnly && <AiAdvisorModal state={state} dispatch={dispatch} />}

      {/* History Panel */}
      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        calculations={history.calculations}
        loading={history.loading}
        onLoad={handleLoadCalculation}
        onDelete={history.deleteCalculation}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/takam-calculator/TakamCalculator.tsx
git commit -m "feat(takam): wire history panel and share token loading"
```

---

## Task 7: Update Step4Results — Save Button & Share Dialog

**Files:**
- Modify: `src/modules/takam-calculator/Step4Results.tsx`

- [ ] **Step 1: Update Step4Results.tsx**

Replace the full content of `Step4Results.tsx`:

```tsx
import { useRef, useState } from 'react'
import type { CalcState, CalcAction } from './types'
import type { useCalculationHistory } from './useCalculationHistory'
import { LEVEL_LABELS, HOURS_PER_MONTH } from './data'
import { calcTotalCost, fmtCurrency } from './calc'
import { ShareDialog } from './ShareDialog'
import s from './TakamCalculator.module.css'

interface Props {
  state: CalcState
  dispatch: React.Dispatch<CalcAction>
  history: ReturnType<typeof useCalculationHistory>
}

const PERIOD_LABELS: Record<number, string> = { 6: '6 חודשים', 12: 'שנה', 24: 'שנתיים' }
const VAT_RATE = 0.17
const OVERHEAD_RATE = 0.10
const CONTINGENCY_RATE = 0.05

export function Step4Results({ state, dispatch, history }: Props) {
  const { mix, period, matchingOn, matchingPct, riskPct, rolesData, hoursMultiplier, viewOnly } = state
  const printRef = useRef<HTMLDivElement>(null)

  const { net: netManpower, matching, monthlyPerRole } = calcTotalCost(mix, period, matchingOn, matchingPct, rolesData, hoursMultiplier)
  const riskAmt      = Math.round(netManpower * riskPct / 100)
  const manpowerTotal = netManpower + riskAmt
  const overhead      = Math.round(manpowerTotal * OVERHEAD_RATE)
  const contingency   = Math.round((manpowerTotal + overhead) * CONTINGENCY_RATE)
  const subtotalPreVAT = manpowerTotal + overhead + contingency
  const vatAmt        = Math.round(subtotalPreVAT * VAT_RATE)
  const grandTotal    = subtotalPreVAT + vatAmt

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  async function handleSave() {
    setSaving(true)
    const id = await history.saveCalculation(state)
    if (id) {
      dispatch({ type: 'SET_CALCULATION_ID', payload: id })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  async function downloadPDF() {
    if (!printRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const html2pdf = (await import('html2pdf.js' as any)).default
    html2pdf().set({
      margin: 10,
      filename: `takam-${state.project.name || 'report'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).from(printRef.current).save()
  }

  return (
    <div ref={printRef}>
      <div className={s.twoCol}>
        {/* ── LEFT: Input tables ── */}
        <div className={s.leftPanel}>
          {/* Manpower table */}
          <div className={s.panel}>
            <div className={s.panelHeader}>
              <span className={s.panelTitle}>כוח אדם</span>
              {!viewOnly && (
                <button className={s.editBtn} onClick={() => dispatch({ type: 'GO_STEP', payload: 3 })}>
                  ✏️ ערוך
                </button>
              )}
            </div>
            <div className={s.tableWrap}>
              <table className={s.dataTable}>
                <thead>
                  <tr>
                    <th>תפקיד</th>
                    <th>רמה</th>
                    <th>משרה</th>
                    <th>שעות/חודש</th>
                    <th>תעריף ₪/שעה</th>
                    <th>סה״כ ₪</th>
                  </tr>
                </thead>
                <tbody>
                  {mix.map((m, i) => {
                    const role = rolesData.find(r => r.id === m.id)
                    if (!role) return null
                    const rate  = role.rates[m.level] ?? 0
                    const base  = m.customHours ?? Math.round(HOURS_PER_MONTH * m.scope / 100)
                    const hours = m.customHours ? base : Math.round(base * hoursMultiplier)
                    const total = monthlyPerRole[i] * period
                    return (
                      <tr key={m.id}>
                        <td>{role.name}{role.custom && <span style={{ marginRight: 4, opacity: 0.6 }}>✱</span>}</td>
                        <td><span className={s.levelBadge}>{LEVEL_LABELS[m.level]}</span></td>
                        <td>{m.scope}%</td>
                        <td>{hours}</td>
                        <td>{rate.toLocaleString('he-IL')} ₪</td>
                        <td className={s.costCell}>{fmtCurrency(total, true)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {mix.length === 0 && (
              <p className={s.emptyMsg}>לא נוספו תפקידים. <button className={s.linkBtn} onClick={() => dispatch({ type: 'GO_STEP', payload: 2 })}>הוסף תפקיד ←</button></p>
            )}
          </div>

          {/* Matching + Risk controls */}
          {!viewOnly && (
          <div className={s.panel}>
            <div className={s.panelHeader}>
              <span className={s.panelTitle}>הגדרות חישוב</span>
            </div>
            <div className={s.controlsGrid}>
              <div className={s.controlItem}>
                <label className={s.controlLabel}>מאצ'ינג מהמערך</label>
                <div className={s.controlRow}>
                  <button
                    className={`${s.sw} ${matchingOn ? s.swOn : ''}`}
                    onClick={() => dispatch({ type: 'TOGGLE_MATCHING' })}
                    aria-label="toggle matching"
                  />
                  {matchingOn && (
                    <input
                      type="number"
                      className={s.numInput}
                      min={1} max={100}
                      value={matchingPct}
                      onChange={e => dispatch({ type: 'SET_MATCHING_PCT', payload: Math.min(100, Math.max(1, +e.target.value || 30)) })}
                    />
                  )}
                  {matchingOn && <span className={s.unit}>%</span>}
                </div>
              </div>
              <div className={s.controlItem}>
                <label className={s.controlLabel}>תוספת סיכון: {riskPct}%</label>
                <input
                  type="range"
                  min={0} max={50} step={1}
                  value={riskPct}
                  onChange={e => dispatch({ type: 'SET_RISK_PCT', payload: +e.target.value })}
                  style={{ accentColor: 'var(--amber)', width: '100%' }}
                />
              </div>
              <div className={s.controlItem}>
                <label className={s.controlLabel}>תקופה</label>
                <div className={s.seg}>
                  {([6, 12, 24] as const).map(p => (
                    <button
                      key={p}
                      className={`${s.segBtn} ${period === p ? s.segBtnActive : ''}`}
                      onClick={() => dispatch({ type: 'SET_PERIOD', payload: p })}
                    >
                      {PERIOD_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* ── RIGHT: Cost Summary ── */}
        <div className={s.rightPanel}>
          <div className={s.summaryCard}>
            <div className={s.summaryTitle}>עלות כוללת לפרויקט</div>
            <div className={s.summaryGrand}>{fmtCurrency(grandTotal)}</div>

            <div className={s.summaryBreakdown}>
              <div className={s.summaryRow}>
                <span>כוח אדם (נטו)</span>
                <span>{fmtCurrency(manpowerTotal, true)}</span>
              </div>
              {matchingOn && (
                <div className={s.summaryRow} style={{ color: 'rgba(255,255,255,0.65)' }}>
                  <span>חיסכון מאצ'ינג מהמערך {matchingPct}%</span>
                  <span>−{fmtCurrency(matching, true)}</span>
                </div>
              )}
              {riskPct > 0 && (
                <div className={s.summaryRow} style={{ color: 'rgba(255,255,255,0.65)' }}>
                  <span>סיכון {riskPct}%</span>
                  <span>+{fmtCurrency(riskAmt, true)}</span>
                </div>
              )}
              <div className={s.summaryRow}>
                <span>תקורה ({Math.round(OVERHEAD_RATE * 100)}%)</span>
                <span>{fmtCurrency(overhead, true)}</span>
              </div>
              <div className={s.summaryRow}>
                <span>מרווח ({Math.round(CONTINGENCY_RATE * 100)}%)</span>
                <span>{fmtCurrency(contingency, true)}</span>
              </div>
            </div>

            <div className={s.summaryDivider} />

            <div className={s.summaryVAT}>
              <span>מע"מ 17%</span>
              <span>{fmtCurrency(vatAmt, true)}</span>
            </div>
            <div className={s.summaryTotal}>
              <span>סה״כ כולל מע"מ</span>
              <span>{fmtCurrency(grandTotal, true)}</span>
            </div>

            <div className={s.summaryActions}>
              {!viewOnly && (
                <button className={s.summaryBtn} onClick={handleSave} disabled={saving}>
                  {saving ? '💾 שומר...' : saved ? '✓ נשמר!' : '💾 שמור חישוב'}
                </button>
              )}
              <button className={s.summaryBtn} onClick={downloadPDF}>📥 ייצוא PDF</button>
              {!viewOnly && (
                <button className={s.summaryBtnGhost} onClick={() => setShareOpen(true)} style={{ width: '100%' }}>
                  🔗 שתף
                </button>
              )}
              {!viewOnly && (
                <button className={s.summaryBtnGhost} onClick={() => dispatch({ type: 'RESET' })}>🔄 איפוס</button>
              )}
            </div>
          </div>

          {/* Period comparison */}
          <div className={s.panel} style={{ marginTop: 16 }}>
            <div className={s.panelHeader}>
              <span className={s.panelTitle}>השוואת תקופות</span>
            </div>
            {([6, 12, 24] as const).map(p => {
              const { net: n } = calcTotalCost(mix, p, matchingOn, matchingPct, rolesData, hoursMultiplier)
              const ra = Math.round(n * riskPct / 100)
              const oh = Math.round((n + ra) * OVERHEAD_RATE)
              const cg = Math.round((n + ra + oh) * CONTINGENCY_RATE)
              const sp = n + ra + oh + cg
              const vt = Math.round(sp * VAT_RATE)
              const total = sp + vt
              return (
                <div key={p} className={`${s.periodRow} ${p === period ? s.periodRowActive : ''}`}
                  onClick={() => !viewOnly && dispatch({ type: 'SET_PERIOD', payload: p })}
                  style={viewOnly ? { cursor: 'default' } : undefined}>
                  <span className={s.periodLabel}>{PERIOD_LABELS[p]}</span>
                  <span className={s.periodVal}>{fmtCurrency(total, true)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Back button */}
      {!viewOnly && (
        <div style={{ marginTop: 16 }}>
          <button className={s.btnBack} onClick={() => dispatch({ type: 'GO_STEP', payload: 3 })}>→ חזור לעריכה</button>
        </div>
      )}

      {/* Share Dialog */}
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        calculationId={state.calculationId}
        grandTotal={grandTotal}
        onCreateShare={async (permission) => {
          if (!state.calculationId) {
            const id = await history.saveCalculation(state)
            if (id) dispatch({ type: 'SET_CALCULATION_ID', payload: id })
            else return null
            return history.createShare(id, permission)
          }
          return history.createShare(state.calculationId, permission)
        }}
        formatCurrency={fmtCurrency}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/takam-calculator/Step4Results.tsx
git commit -m "feat(takam): add save button and share dialog to Step4Results"
```

---

## Task 8: Dashboard — Recent Calculations Card

**Files:**
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/pages/Dashboard.module.css`

- [ ] **Step 1: Add recent calculations card to Dashboard.tsx**

Import `useCalculationHistory` and `Link` at the top of `Dashboard.tsx`. Add the card to the `bottomGrid`:

After the existing imports, add:

```typescript
import { useCalculationHistory } from '../modules/takam-calculator/useCalculationHistory'
import { fmtCurrency } from '../modules/takam-calculator/calc'
```

Inside the `Dashboard` component, after `const firstName = ...`, add:

```typescript
const calcHistory = useCalculationHistory(user?.id)
```

In the JSX, inside `<div className={styles.bottomGrid}>`, add a third card AFTER the "Cluster Distribution" card:

```tsx
        {/* Recent Calculations */}
        {calcHistory.calculations.length > 0 && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>חישובי תכ"ם אחרונים</h2>
              <Link to="/calculator" className={styles.viewAll}>הצג הכל ←</Link>
            </div>
            <div className={styles.calcList}>
              {calcHistory.calculations.slice(0, 5).map(calc => (
                <Link
                  key={calc.id}
                  to={`/calculator?share=${calc.id}`}
                  className={styles.calcItem}
                >
                  <div className={styles.calcItemLeft}>
                    <span className={styles.calcItemName}>{calc.name || 'ללא שם'}</span>
                    <span className={styles.calcItemMinistry}>{calc.ministry}</span>
                  </div>
                  <div className={styles.calcItemRight}>
                    <span className={styles.calcItemTotal}>{fmtCurrency(calc.grand_total, true)}</span>
                    <span className={styles.calcItemDate}>
                      {new Date(calc.updated_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
```

- [ ] **Step 2: Update `bottomGrid` CSS to support 3 columns**

The current `bottomGrid` uses a 2-column grid. We need it to handle an optional third card. In `Dashboard.module.css`, update:

```css
.bottomGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
```

This doesn't need to change — the third card will span the full width on the next row. But add styles for the calc items:

```css
/* Recent calculations card */
.calcList {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.calcItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 8px;
  text-decoration: none;
  transition: background 0.15s;
}
.calcItem:hover {
  background: var(--bg);
}
.calcItemLeft {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.calcItemName {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}
.calcItemMinistry {
  font-size: 11px;
  color: var(--text3);
}
.calcItemRight {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}
.calcItemTotal {
  font-size: 14px;
  font-weight: 700;
  color: var(--primary);
}
.calcItemDate {
  font-size: 11px;
  color: var(--text3);
}
```

- [ ] **Step 3: Fix Dashboard link to load calculation directly**

Note: the Dashboard links use `?share=CALC_ID` but this won't work because the share token is different from the calculation ID. Instead, we should navigate directly and pass the calculation ID. Update the Link's `to` prop:

Change from `to={`/calculator?share=${calc.id}`}` to a proper approach. Since the user owns these calculations, we can use a `?load=CALC_ID` query param.

In `TakamCalculator.tsx`, add handling for `?load=` param after the `?share=` handling:

```typescript
  // Load own calculation by ID
  useEffect(() => {
    const loadId = searchParams.get('load')
    if (!loadId || !user) return

    const calc = history.calculations.find(c => c.id === loadId)
    if (calc) {
      dispatch({
        type: 'LOAD_CALCULATION',
        payload: {
          calculationId: calc.id,
          project: { name: calc.name, ministry: calc.ministry },
          period: calc.period as 6 | 12 | 24,
          matchingOn: calc.matching_on,
          matchingPct: calc.matching_pct,
          riskPct: calc.risk_pct,
          hoursMultiplier: calc.hours_multiplier,
          mix: calc.mix as MixEntry[],
        },
      })
      setSearchParams({}, { replace: true })
    }
  }, [history.calculations, searchParams, user]) // eslint-disable-line react-hooks/exhaustive-deps
```

And fix the Dashboard link:

```tsx
<Link to={`/calculator?load=${calc.id}`} className={styles.calcItem}>
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/Dashboard.tsx src/pages/Dashboard.module.css src/modules/takam-calculator/TakamCalculator.tsx
git commit -m "feat(dashboard): add recent calculations card with direct load links"
```

---

## Task 9: Supabase Anon Access for View Tokens

**Files:**
- Modify: `src/modules/takam-calculator/useCalculationHistory.ts`

- [ ] **Step 1: Update `loadByToken` to work without auth**

The `loadByToken` function needs to work for unauthenticated users (view-only). Since RLS policy allows anonymous SELECT on `calculation_shares` where `shared_with IS NULL AND permission = 'view'`, the anon key should suffice. However, we need a Supabase RPC or a more direct approach since the anon user also needs to read the linked `calculations` row.

Create a Supabase RPC function for public token access:

```sql
CREATE OR REPLACE FUNCTION get_calculation_by_token(share_token text)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'calculation', row_to_json(c),
    'permission', cs.permission
  ) INTO result
  FROM calculation_shares cs
  JOIN calculations c ON c.id = cs.calculation_id
  WHERE cs.token = share_token;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Update `loadByToken` in the hook:

```typescript
  async function loadByToken(token: string): Promise<{ calculation: SavedCalculation; permission: 'view' | 'edit' } | null> {
    const { data, error } = await supabase.rpc('get_calculation_by_token', { share_token: token })
    if (error || !data) return null
    return {
      calculation: data.calculation as SavedCalculation,
      permission: data.permission as 'view' | 'edit',
    }
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/takam-calculator/useCalculationHistory.ts
git commit -m "feat(takam): use RPC for public token access to support anon view"
```

---

## Task 10: Final Integration Test & Cleanup

- [ ] **Step 1: Run TypeScript check**

```bash
cd digitek-platform && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 2: Run dev server and verify**

```bash
cd digitek-platform && npm run dev
```

Test the following flows:
1. Log in → go to calculator → create a calculation → click "שמור חישוב" → verify save confirmation
2. Click "החישובים שלי" → verify history panel opens with the saved calculation
3. Click "שתף" → select "צפייה בלבד" → generate link → copy → open in incognito → verify view-only mode
4. Click "שתף" → select "עריכה" → generate link → open in another logged-in session → verify edit mode
5. Go to dashboard → verify "חישובי תכ"ם אחרונים" card shows → click a calculation → verify it loads
6. Delete a calculation from history panel → verify removal
7. Test mobile responsiveness of history panel and share dialog

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix(takam): integration fixes for calculation history"
```

- [ ] **Step 4: Update CLAUDE.md history table**

Add a row:

```
| 19.04.2026 | היסטוריית חישובים ושיתוף עם הרשאות — שמירה/טעינה/מחיקה, פאנל היסטוריה, דיאלוג שיתוף עם view/edit, כרטיסייה בדשבורד |
```

- [ ] **Step 5: Final commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with calculation history feature"
```
