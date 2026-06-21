import { useEffect, useMemo, useState } from 'react'
import { Modal, StepDots, modalStyles as s } from '../Modal'
import { supabase } from '../../../../lib/supabase'
import { searchEmailContacts, recordEmailContact, type EmailContact } from '../../lib/emailContacts'
import type { TenderDetailData } from '../../hooks/useTender'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface Props {
  open: boolean
  onClose: () => void
  detail: TenderDetailData
  onScheduled: () => void
}

const COMMITTEE_TYPE_LABELS: Record<string, string> = {
  tenders: 'ועדת מכרזים',
  subcommittee_quality: 'תת-ועדת איכות',
  exceptions: 'ועדת חריגים',
}

function defaultScheduledAt(): string {
  // Default: tomorrow 10:00
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(10, 0, 0, 0)
  // datetime-local format: YYYY-MM-DDTHH:MM
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function CommitteeScheduleModal({ open, onClose, detail, onScheduled }: Props) {
  const tender = detail.tender
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [committeeType, setCommitteeType] = useState<'tenders' | 'subcommittee_quality' | 'exceptions'>('tenders')
  const [scheduledAt, setScheduledAt] = useState(defaultScheduledAt())
  const [agenda, setAgenda] = useState('')
  const [emails, setEmails] = useState<string[]>([])
  const [emailDraft, setEmailDraft] = useState('')

  const [suggestions, setSuggestions] = useState<EmailContact[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightedIdx, setHighlightedIdx] = useState(-1)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pre-requisites (soft gate)
  const hasBudgetApproved = useMemo(() =>
    detail.budget?.status === 'approved'
      || detail.approvalRequests.some(r => r.request_type === 'budget_approval' && r.status === 'approved'),
    [detail.budget?.status, detail.approvalRequests]
  )
  const hasBrief = !!detail.tender?.brief_id
  // Protocol is part of the future Protocol Writer module — for now we can't gate on it
  const hasProtocol = false  // placeholder for Protocol Writer integration

  function resetState() {
    setStep(1)
    setError(null)
    setEmails([])
    setEmailDraft('')
    setAgenda('')
    setSuggestions([])
    setShowSuggestions(false)
    setHighlightedIdx(-1)
    setScheduledAt(defaultScheduledAt())
  }
  function handleClose() {
    resetState()
    onClose()
  }

  // Email chips logic
  function commitEmailDraft(): string[] | null {
    const raw = emailDraft.trim().replace(/[,;\s]+$/, '').toLowerCase()
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
  function removeEmail(addr: string) { setEmails(emails.filter(e => e !== addr)) }

  function handleEmailKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIdx(i => (i + 1) % suggestions.length); return }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlightedIdx(i => (i <= 0 ? suggestions.length - 1 : i - 1)); return }
      if (e.key === 'Enter' && highlightedIdx >= 0) {
        e.preventDefault()
        selectSuggestion(suggestions[highlightedIdx])
        return
      }
      if (e.key === 'Escape') { e.preventDefault(); setShowSuggestions(false); return }
    }
    if (e.key === 'Enter' || e.key === ',' || e.key === ';' || e.key === ' ') {
      e.preventDefault(); commitEmailDraft()
    } else if (e.key === 'Backspace' && emailDraft === '' && emails.length > 0) {
      setEmails(emails.slice(0, -1))
    }
  }
  function selectSuggestion(c: EmailContact) {
    if (!emails.includes(c.email)) setEmails([...emails, c.email])
    setEmailDraft('')
    setError(null)
  }
  useEffect(() => {
    if (step !== 2 || !showSuggestions) return
    const t = setTimeout(async () => {
      const r = await searchEmailContacts(emailDraft, emails)
      setSuggestions(r)
      setHighlightedIdx(r.length > 0 ? 0 : -1)
    }, 180)
    return () => clearTimeout(t)
  }, [emailDraft, emails, showSuggestions, step])

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    if (!tender) {
      setSubmitting(false)
      setError('פרטי הליך חסרים')
      return
    }
    const finalEmails = commitEmailDraft()
    if (finalEmails === null) { setSubmitting(false); return }
    if (finalEmails.length === 0) {
      setSubmitting(false)
      setError('נדרש לפחות נמען אחד')
      return
    }
    const scheduledDate = new Date(scheduledAt)
    if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
      setSubmitting(false)
      setError('יש לבחור תאריך עתידי')
      return
    }

    const { error: rpcErr } = await supabase.rpc('tender_schedule_committee_meeting', {
      p_tender_id: tender.id,
      p_committee_type: committeeType,
      p_scheduled_at: scheduledDate.toISOString(),
      p_attendee_emails: finalEmails,
      p_agenda: agenda.trim(),
      p_duration_minutes: 120,
    })
    if (rpcErr) {
      setSubmitting(false)
      setError(rpcErr.message)
      return
    }

    // Record contacts for autofill
    for (const em of finalEmails) {
      void recordEmailContact(em)
    }

    setSubmitting(false)
    onScheduled()
    handleClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="קביעת ועדת מכרזים">
      <StepDots total={3} current={step} label={
        step === 1 ? 'פרטי דיון' : step === 2 ? 'משתתפים' : 'סקירה ושליחה'
      } />

      {/* Soft gate — prerequisites */}
      {step === 1 && (
        <div className={s.info} style={{ marginBottom: 14 }}>
          <strong>תנאי סף לדיון:</strong>
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span>{hasBrief ? '✓' : '⚠'} בריף מקושר {!hasBrief && '(לא חובה — אפשר לקשר מאוחר יותר)'}</span>
            <span>{hasProtocol ? '✓' : '⚠'} פרוטוקול מקושר (מודול בעתיד — לא חוסם כרגע)</span>
            <span>{hasBudgetApproved ? '✓' : '⚠'} אישור תקציבי חתום {!hasBudgetApproved && '(מומלץ לפני דיון)'}</span>
          </div>
        </div>
      )}

      {step === 1 && (
        <>
          <div className={s.formGroup}>
            <label className={`${s.label} ${s.required}`}>סוג ועדה</label>
            <select
              className={s.select}
              value={committeeType}
              onChange={e => setCommitteeType(e.target.value as 'tenders' | 'subcommittee_quality' | 'exceptions')}
            >
              <option value="tenders">{COMMITTEE_TYPE_LABELS.tenders} (יציאה לתיחור)</option>
              <option value="subcommittee_quality">{COMMITTEE_TYPE_LABELS.subcommittee_quality}</option>
              <option value="exceptions">{COMMITTEE_TYPE_LABELS.exceptions}</option>
            </select>
          </div>

          <div className={s.formGroup}>
            <label className={`${s.label} ${s.required}`}>תאריך ושעת הדיון</label>
            <input
              className={s.input}
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
            />
            <div className={s.hint}>חייב להיות בעתיד</div>
          </div>

          <div className={s.formGroup}>
            <label className={`${s.label} ${s.required}`}>אגנדת הדיון / מהות הפניה</label>
            <textarea
              className={s.textarea}
              value={agenda}
              onChange={e => setAgenda(e.target.value)}
              placeholder="לדוגמה: 'אישור יציאה לתיחור לפרויקט BI ממשרדי, סקירת הבריף + הפרוטוקול + תקציב מאושר'"
            />
            <div className={s.hint}>זה יישלח כגוף המייל לחברי הוועדה.</div>
          </div>

          {error && <div className={s.error}>{error}</div>}

          <div className={s.foot}>
            <button className={`${s.btn} ${s.btnSecondary}`} onClick={handleClose}>ביטול</button>
            <button
              className={`${s.btn} ${s.btnPrimary}`}
              onClick={() => {
                if (!scheduledAt) {
                  setError('יש לבחור תאריך ושעת דיון')
                  return
                }
                if (new Date(scheduledAt).getTime() <= Date.now()) {
                  setError('תאריך הדיון חייב להיות בעתיד')
                  return
                }
                if (agenda.trim().length < 4) {
                  setError('יש לכתוב את אגנדת הדיון (לפחות 4 תווים)')
                  return
                }
                setError(null)
                setStep(2)
              }}
            >המשך</button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className={s.formGroup}>
            <label className={`${s.label} ${emails.length === 0 ? s.required : ''}`}>
              חברי הוועדה — כתובות מייל
            </label>
            <div className={s.autocompleteWrap}>
              <div className={s.chipsField} onClick={() => setShowSuggestions(true)}>
                {emails.map(addr => (
                  <span key={addr} className={s.chip}>
                    {addr}
                    <button type="button" className={s.chipRemove} onClick={() => removeEmail(addr)} aria-label={`הסר ${addr}`}>×</button>
                  </span>
                ))}
                <input
                  className={s.chipInput}
                  type="email"
                  value={emailDraft}
                  onChange={e => { setEmailDraft(e.target.value); setShowSuggestions(true) }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={handleEmailKeyDown}
                  placeholder={emails.length === 0 ? 'יועץ משפטי, חשב המערך, מנהלת ועדה...' : 'הוסף משתתף נוסף'}
                />
              </div>
              {showSuggestions && suggestions.length > 0 && (
                <div className={s.autocomplete} role="listbox">
                  <div className={s.autocompleteHeader}>{emailDraft.trim() ? 'התאמות מהמאגר' : 'בשימוש לאחרונה'}</div>
                  {suggestions.map((c, idx) => (
                    <div
                      key={c.id}
                      className={`${s.autocompleteItem} ${idx === highlightedIdx ? s.autocompleteItemActive : ''}`}
                      onMouseDown={e => { e.preventDefault(); selectSuggestion(c) }}
                      onMouseEnter={() => setHighlightedIdx(idx)}
                    >
                      <span className={s.autocompleteEmail}>{c.email}</span>
                      <span className={s.autocompleteMeta}>{c.use_count}×</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className={s.hint}>
              בדרך כלל: <strong>מנהלת ועדה</strong>, <strong>יועץ משפטי</strong>, <strong>חשב המערך</strong>. לכל אחד יישלח זימון במייל עם פרטי הדיון.
            </div>
          </div>

          {error && <div className={s.error}>{error}</div>}

          <div className={s.foot}>
            <button className={`${s.btn} ${s.btnSecondary}`} onClick={() => setStep(1)}>חזור</button>
            <button
              className={`${s.btn} ${s.btnPrimary}`}
              disabled={emails.length === 0 && emailDraft.trim() === ''}
              onClick={() => {
                const final = commitEmailDraft()
                if (final === null) return
                if (final.length === 0) { setError('נדרש לפחות נמען אחד'); return }
                setStep(3)
              }}
            >המשך</button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className={s.summary}>
            <div><strong>סוג ועדה:</strong> {COMMITTEE_TYPE_LABELS[committeeType]}</div>
            <div><strong>תאריך:</strong> {new Date(scheduledAt).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}</div>
            <div><strong>משך:</strong> 120 דקות</div>
            <div><strong>משתתפים ({emails.length}):</strong> <span style={{ direction: 'ltr', display: 'inline-block' }}>{emails.join(', ')}</span></div>
            <div><strong>אגנדה:</strong> {agenda}</div>
          </div>
          {error && <div className={s.error}>{error}</div>}
          <div className={s.foot}>
            <button className={`${s.btn} ${s.btnSecondary}`} onClick={() => setStep(2)}>חזור</button>
            <button className={`${s.btn} ${s.btnPrimary}`} disabled={submitting} onClick={handleSubmit}>
              {submitting ? 'שולח זימונים…' : '📅 קבע דיון ושלח זימונים'}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
