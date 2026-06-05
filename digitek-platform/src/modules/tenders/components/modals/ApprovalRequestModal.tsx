import { useState } from 'react'
import { Modal, StepDots, modalStyles as s } from '../Modal'
import { supabase } from '../../../../lib/supabase'
import { computeDueAt } from '../../slaEngine'
import { enqueueNotification } from '../../lib/notifications'
import type { ApprovalRequestType } from '../../types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
  const [emails, setEmails] = useState<string[]>([])
  const [emailDraft, setEmailDraft] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const title = REQUEST_TYPE_LABELS[requestType] ?? 'בקשת אישור'
  const roleHint = REQUEST_TYPE_ROLE_HINT[requestType] ?? 'בעל תפקיד מתאים'
  const slaDueAt = computeDueAt(requestType)
  const isBudgetReq = requestType === 'budget_approval'

  function resetState() {
    setStep(1)
    setError(null)
    setEmails([])
    setEmailDraft('')
    setSubject('')
    setBody('')
    setNotes('')
    setAmount(estimatedAmount ?? 0)
  }

  function handleClose() {
    resetState()
    onClose()
  }

  /** מבצע commit לטיוטת המייל. מחזיר את רשימת המיילים הסופית או null אם הטיוטה לא תקינה. */
  function commitEmailDraft(): string[] | null {
    const raw = emailDraft.trim().replace(/[,;\s]+$/, '')
    if (!raw) return emails
    if (!EMAIL_RE.test(raw)) {
      setError(`כתובת לא תקינה: ${raw}`)
      return null
    }
    setEmailDraft('')
    if (emails.includes(raw)) return emails
    const next = [...emails, raw]
    setEmails(next)
    setError(null)
    return next
  }

  function handleEmailKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';' || e.key === ' ') {
      e.preventDefault()
      commitEmailDraft()
    } else if (e.key === 'Backspace' && emailDraft === '' && emails.length > 0) {
      setEmails(emails.slice(0, -1))
    }
  }

  function handleEmailPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text')
    if (!/[\s,;]/.test(pasted)) return
    e.preventDefault()
    const parts = pasted.split(/[\s,;]+/).map(p => p.trim()).filter(Boolean)
    const valid: string[] = []
    const invalid: string[] = []
    for (const p of parts) {
      if (EMAIL_RE.test(p) && !emails.includes(p) && !valid.includes(p)) valid.push(p)
      else if (!EMAIL_RE.test(p)) invalid.push(p)
    }
    if (valid.length) setEmails([...emails, ...valid])
    if (invalid.length) setError(`כתובות לא תקינות דולגו: ${invalid.join(', ')}`)
    else setError(null)
  }

  function removeEmail(addr: string) {
    setEmails(emails.filter(e => e !== addr))
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)

    const effectiveSubject = subject.trim() || title
    const effectiveBody = body.trim()

    const metadata: Record<string, unknown> = {}
    if (notes.trim()) metadata.notes = notes.trim()
    if (emails.length) metadata.recipients = emails
    if (subject.trim()) metadata.subject = subject.trim()
    if (effectiveBody) metadata.body = effectiveBody

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
        metadata,
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

    // 3. הזנת תור התראות — מייל לכל נמען. אם dispatcher נכשל, לא חוסם את הבקשה.
    for (const recipientEmail of emails) {
      const enqRes = await enqueueNotification({
        recipientEmail,
        subject: effectiveSubject,
        channel: 'email',
        payload: {
          notification_type: 'approval_request',
          tender_id: tenderId,
          data: {
            approval_request_id: approvalRow.id,
            request_type: requestType,
            role_hint: roleHint,
            body: effectiveBody,
            sla_due_at: slaDueAt.toISOString(),
          },
        },
      })
      if (!enqRes.ok) {
        // log only — לא מבטל את הבקשה שכבר נוצרה
        console.warn(`Failed to enqueue email to ${recipientEmail}: ${enqRes.error}`)
      }
    }

    setSubmitting(false)
    onSubmitted()
    handleClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      <StepDots total={3} current={step} label={
        step === 1 ? 'פרטי הבקשה' : step === 2 ? 'נמענים והודעה' : 'סקירה ושליחה'
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
            </div>
          </div>

          <div className={s.formGroup}>
            <label className={`${s.label} ${emails.length === 0 ? s.required : ''}`}>
              כתובות מייל לנמענים
            </label>
            <div className={s.chipsField}>
              {emails.map(addr => (
                <span key={addr} className={s.chip}>
                  {addr}
                  <button
                    type="button"
                    className={s.chipRemove}
                    onClick={() => removeEmail(addr)}
                    aria-label={`הסר ${addr}`}
                  >×</button>
                </span>
              ))}
              <input
                className={s.chipInput}
                type="email"
                value={emailDraft}
                onChange={e => setEmailDraft(e.target.value)}
                onKeyDown={handleEmailKeyDown}
                onPaste={handleEmailPaste}
                onBlur={() => commitEmailDraft()}
                placeholder={emails.length === 0 ? 'name@example.com — ניתן להדביק רשימה' : 'הוסף כתובת נוספת'}
              />
            </div>
            <div className={s.hint}>
              Enter / פסיק / רווח כדי להוסיף. ניתן להדביק רשימה מופרדת בפסיקים. Backspace מוחק את האחרון.
            </div>
          </div>

          <div className={s.formGroup}>
            <label className={s.label}>נושא ההודעה</label>
            <input
              className={s.input}
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder={title}
              maxLength={120}
            />
            <div className={s.hint}>אם לא מולא, ייעשה שימוש בכותרת ברירת המחדל: "{title}".</div>
          </div>

          <div className={s.formGroup}>
            <label className={s.label}>תיאור</label>
            <textarea
              className={s.textarea}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="גוף ההודעה שיישלח לנמענים — פרטי הבקשה, קישור להליך, מועדי SLA וכו'."
            />
          </div>

          {error && <div className={s.error}>{error}</div>}

          <div className={s.foot}>
            <button className={`${s.btn} ${s.btnSecondary}`} onClick={() => setStep(1)}>חזור</button>
            <button
              className={`${s.btn} ${s.btnPrimary}`}
              disabled={emails.length === 0 && emailDraft.trim() === ''}
              onClick={() => {
                const finalList = commitEmailDraft()
                if (finalList === null) return
                if (finalList.length === 0) {
                  setError('יש להוסיף לפחות נמען אחד')
                  return
                }
                setStep(3)
              }}
            >המשך</button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className={s.summary}>
            <div><strong>סוג בקשה:</strong> {title}</div>
            <div><strong>תפקיד נמען:</strong> {roleHint}</div>
            <div><strong>נמענים במייל ({emails.length}):</strong> <span style={{ direction: 'ltr', display: 'inline-block' }}>{emails.join(', ')}</span></div>
            <div><strong>נושא:</strong> {subject.trim() || title}</div>
            {body.trim() && <div><strong>תיאור:</strong> {body.trim()}</div>}
            {isBudgetReq && <div><strong>סכום:</strong> {new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount)}</div>}
            <div><strong>SLA יסתיים:</strong> {slaDueAt.toLocaleDateString('he-IL')}</div>
            {notes && <div><strong>הערות פנימיות:</strong> {notes}</div>}
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
