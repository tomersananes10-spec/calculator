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
