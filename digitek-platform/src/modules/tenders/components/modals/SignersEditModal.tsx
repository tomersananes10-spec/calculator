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
