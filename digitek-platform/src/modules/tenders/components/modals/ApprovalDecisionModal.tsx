// אישור/דחיית בקשות approval פתוחות. הכרחי כדי שזרימת השלבים תוכל להתקדם.

import { useState } from 'react'
import { Modal, modalStyles as s } from '../Modal'
import { decideApproval } from '../../hooks/useTender'
import type { TenderApprovalRequest } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
  approvals: TenderApprovalRequest[]  // הבקשות הפתוחות
  onSubmitted: () => void
}

const TYPE_LABEL: Record<string, string> = {
  budget_approval: 'אישור תקציבי',
  olma_approval: 'אישור אלמ"ה',
  professional_review: 'בדיקת גורם מקצועי',
  committee_outbound: 'ועדה ליציאה לתיחור',
  committee_winner: 'ועדה לאישור זוכה',
  contract_signature: 'חתימת הסכם',
  guarantee_verification: 'אימות ערבות',
  insurance_verification: 'אימות ביטוח',
  invoice_approval: 'אישור חשבונית',
  milestone_acceptance: 'אישור אבן דרך',
  vendor_evaluation: 'הערכת ספק',
  other: 'אחר',
}

export function ApprovalDecisionModal({ open, onClose, approvals, onSubmitted }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [comments, setComments] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pending = approvals.filter(a => a.status === 'pending' || a.status === 'in_review')
  const active = activeId ? pending.find(a => a.id === activeId) : null

  async function decide(decision: 'approved' | 'rejected' | 'returned') {
    if (!active) return
    setSubmitting(true)
    setError(null)
    const r = await decideApproval(active.id, decision, comments.trim() || undefined)
    setSubmitting(false)
    if (!r.ok) {
      setError(r.error ?? 'שגיאה')
      return
    }
    setActiveId(null)
    setComments('')
    onSubmitted()
  }

  function handleClose() {
    setActiveId(null); setComments(''); setError(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="אישור בקשות פתוחות">
      {active ? (
        <>
          <div className={s.summary}>
            <div><strong>סוג בקשה:</strong> {TYPE_LABEL[active.request_type] ?? active.request_type}</div>
            <div><strong>תפקיד נמען:</strong> {active.requested_role ?? '—'}</div>
            {active.sla_due_at && <div><strong>SLA יסתיים:</strong> {new Date(active.sla_due_at).toLocaleDateString('he-IL')}</div>}
          </div>
          <div className={s.formGroup}>
            <label className={s.label}>הערות (אופציונלי)</label>
            <textarea
              className={s.textarea}
              value={comments}
              onChange={e => setComments(e.target.value)}
              placeholder="נימוקים שיירשמו ב-audit log"
            />
          </div>
          {error && <div className={s.error}>{error}</div>}
          <div className={s.foot}>
            <button className={`${s.btn} ${s.btnSecondary}`} onClick={() => setActiveId(null)}>חזור לרשימה</button>
            <button className={`${s.btn} ${s.btnDanger}`} disabled={submitting} onClick={() => decide('rejected')}>✗ דחה</button>
            <button className={`${s.btn} ${s.btnSecondary}`} disabled={submitting} onClick={() => decide('returned')}>↩ החזר</button>
            <button className={`${s.btn} ${s.btnSuccess}`} disabled={submitting} onClick={() => decide('approved')}>✓ אשר</button>
          </div>
        </>
      ) : pending.length === 0 ? (
        <>
          <div className={s.info}>אין בקשות פתוחות לאישור</div>
          <div className={s.foot}>
            <button className={`${s.btn} ${s.btnSecondary}`} onClick={handleClose}>סגור</button>
          </div>
        </>
      ) : (
        <>
          <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--text2)' }}>
            {pending.length} בקשות ממתינות. בחר אחת כדי לאשר/לדחות.
          </div>
          {pending.map(a => (
            <div
              key={a.id}
              style={{ background: 'var(--bg)', padding: '10px 14px', borderRadius: 8, marginBottom: 8, cursor: 'pointer' }}
              onClick={() => setActiveId(a.id)}
            >
              <div style={{ fontWeight: 700, fontSize: 13 }}>{TYPE_LABEL[a.request_type] ?? a.request_type}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text3)' }}>
                {a.requested_role ?? '—'} · נוצר {new Date(a.created_at).toLocaleDateString('he-IL')}
              </div>
            </div>
          ))}
          <div className={s.foot}>
            <button className={`${s.btn} ${s.btnSecondary}`} onClick={handleClose}>סגור</button>
          </div>
        </>
      )}
    </Modal>
  )
}
