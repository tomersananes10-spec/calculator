import { useState } from 'react'
import { Modal, StepDots, modalStyles as s } from '../Modal'
import { supabase } from '../../../../lib/supabase'
import { computeDueAt } from '../../slaEngine'
import type { ApprovalRequestType } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
  tenderId: string
  /** סוג הבקשה מקבע את ה-SLA והמסך. */
  requestType: ApprovalRequestType
  /** סכום (לבקשת תקציב — יחושב גם budget). */
  estimatedAmount?: number
  onSubmitted: () => void
}

const REQUEST_TYPE_LABELS: Partial<Record<ApprovalRequestType, string>> = {
  budget_approval: 'בקשת אישור תקציבי',
  olma_approval: 'בקשת אישור אלמ"ה',
  professional_review: 'בקשת בדיקת גורם מקצועי',
  committee_outbound: 'בקשת ועדה ליציאה לתיחור',
  committee_winner: 'בקשת ועדה לאישור זוכה',
}

const REQUEST_TYPE_ROLE_HINT: Partial<Record<ApprovalRequestType, string>> = {
  budget_approval: 'תקציבן המערך',
  olma_approval: 'מנהל הרכש (דרך אלמ"ה)',
  professional_review: 'גורם מקצועי במינהל הרכש',
  committee_outbound: 'חברי ועדת מכרזים',
  committee_winner: 'חברי ועדת מכרזים',
}

export function ApprovalRequestModal({ open, onClose, tenderId, requestType, estimatedAmount, onSubmitted }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [amount, setAmount] = useState<number>(estimatedAmount ?? 0)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const title = REQUEST_TYPE_LABELS[requestType] ?? 'בקשת אישור'
  const roleHint = REQUEST_TYPE_ROLE_HINT[requestType] ?? 'בעל תפקיד מתאים'
  const slaDueAt = computeDueAt(requestType)
  const isBudgetReq = requestType === 'budget_approval'

  function handleClose() {
    setStep(1)
    setError(null)
    onClose()
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)

    // 1. צור approval_request
    const { data: approvalRow, error: appErr } = await supabase
      .from('tender_approval_requests')
      .insert({
        tender_id: tenderId,
        request_type: requestType,
        requested_from: null,  // ניתוב לפי תפקיד; בעתיד dropdown של משתמשים
        requested_role: roleHint,
        status: 'pending',
        sla_due_at: slaDueAt.toISOString(),
        metadata: notes ? { notes } : {},
      })
      .select('id')
      .single()

    if (appErr) {
      setSubmitting(false)
      setError(appErr.message)
      return
    }

    // 2. אם בקשת תקציב — צור גם budget pending
    if (isBudgetReq && amount > 0) {
      const { error: budgetErr } = await supabase
        .from('tender_budgets')
        .insert({
          tender_id: tenderId,
          amount,
          status: 'pending',
          notes: `נוצר אוטומטית מבקשת אישור ${approvalRow.id}`,
        })
      if (budgetErr) {
        setSubmitting(false)
        setError(`בקשת אישור נוצרה אבל יצירת רשומת תקציב נכשלה: ${budgetErr.message}`)
        return
      }
    }

    setSubmitting(false)
    onSubmitted()
    handleClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      <StepDots total={3} current={step} label={
        step === 1 ? 'פרטי הבקשה' : step === 2 ? 'נמען' : 'סקירה ושליחה'
      } />

      {step === 1 && (
        <>
          {isBudgetReq && (
            <div className={s.formGroup}>
              <label className={`${s.label} ${s.required}`}>סכום מבוקש (₪)</label>
              <input
                className={s.input}
                type="number"
                min={0}
                value={amount || ''}
                onChange={e => setAmount(Number(e.target.value))}
              />
              <div className={s.hint}>הסכום שעבורו מבוקש האישור התקציבי</div>
            </div>
          )}
          <div className={s.formGroup}>
            <label className={s.label}>הערות לבקשה</label>
            <textarea
              className={s.textarea}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="פרטים נוספים שיוצגו למאשר"
            />
          </div>
          <div className={s.info}>
            ⏱️ SLA: יסתיים ב-{slaDueAt.toLocaleDateString('he-IL')} ({slaDueAt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })})
          </div>
          <div className={s.foot}>
            <button className={`${s.btn} ${s.btnSecondary}`} onClick={handleClose}>ביטול</button>
            <button
              className={`${s.btn} ${s.btnPrimary}`}
              disabled={isBudgetReq && !(amount > 0)}
              onClick={() => setStep(2)}
            >המשך</button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className={s.formGroup}>
            <label className={s.label}>תפקיד נמען</label>
            <input className={s.input} value={roleHint} disabled />
            <div className={s.hint}>
              הבקשה תופיע ב"תור האישורים" של כל בעל תפקיד זה במשרד.
              בעתיד תוכל להפנות גם למשתמש ספציפי.
            </div>
          </div>
          <div className={s.foot}>
            <button className={`${s.btn} ${s.btnSecondary}`} onClick={() => setStep(1)}>חזור</button>
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setStep(3)}>המשך</button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className={s.summary}>
            <div><strong>סוג בקשה:</strong> {title}</div>
            <div><strong>נמען:</strong> {roleHint}</div>
            {isBudgetReq && <div><strong>סכום:</strong> {new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount)}</div>}
            <div><strong>SLA יסתיים:</strong> {slaDueAt.toLocaleDateString('he-IL')}</div>
            {notes && <div><strong>הערות:</strong> {notes}</div>}
          </div>
          {error && <div className={s.error}>{error}</div>}
          <div className={s.foot}>
            <button className={`${s.btn} ${s.btnSecondary}`} onClick={() => setStep(2)}>חזור</button>
            <button className={`${s.btn} ${s.btnPrimary}`} disabled={submitting} onClick={handleSubmit}>
              {submitting ? 'שולח…' : 'שלח בקשה'}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
