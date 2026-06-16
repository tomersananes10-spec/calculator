import { useEffect, useRef, useState } from 'react'
import { Modal, StepDots, modalStyles as s } from '../Modal'
import { supabase } from '../../../../lib/supabase'
import { computeDueAt } from '../../slaEngine'
import { enqueueNotification } from '../../lib/notifications'
import { searchEmailContacts, recordEmailContact, type EmailContact } from '../../lib/emailContacts'
import type { ApprovalRequestType } from '../../types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_TYPES = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg'

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

// מיפוי סוג בקשה → doc_type ב-tender_documents (לפי CHECK constraint במיגרציה 006)
const DOC_TYPE_BY_REQUEST: Record<ApprovalRequestType, string> = {
  budget_approval: 'budget_approval',
  olma_approval: 'olma_approval',
  professional_review: 'other',
  committee_outbound: 'committee_request',
  committee_winner: 'committee_request',
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

function fileIcon(mime: string, name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (mime.startsWith('image/')) return '🖼️'
  if (ext === 'pdf') return '📄'
  if (['doc', 'docx'].includes(ext)) return '📝'
  if (['xls', 'xlsx'].includes(ext)) return '📊'
  return '📎'
}

export function ApprovalRequestModal({ open, onClose, tenderId, requestType, estimatedAmount, onSubmitted }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [amount, setAmount] = useState<number>(estimatedAmount ?? 0)
  const [notes, setNotes] = useState('')
  const [emails, setEmails] = useState<string[]>([])
  const [emailDraft, setEmailDraft] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<EmailContact[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightedIdx, setHighlightedIdx] = useState(-1)
  const autocompleteRef = useRef<HTMLDivElement>(null)

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
    setFiles([])
    setDragActive(false)
    setAmount(estimatedAmount ?? 0)
    setSuggestions([])
    setShowSuggestions(false)
    setHighlightedIdx(-1)
  }

  // טוען הצעות autocomplete בעת הקלדה/פוקוס (debounced).
  useEffect(() => {
    if (step !== 2 || !showSuggestions) return
    const t = setTimeout(async () => {
      const results = await searchEmailContacts(emailDraft, emails)
      setSuggestions(results)
      setHighlightedIdx(results.length > 0 ? 0 : -1)
    }, 180)
    return () => clearTimeout(t)
  }, [emailDraft, emails, showSuggestions, step])

  // סגירת dropdown ב-click מחוץ.
  useEffect(() => {
    if (!showSuggestions) return
    function handleClickOutside(e: MouseEvent) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSuggestions])

  function selectSuggestion(contact: EmailContact) {
    if (!emails.includes(contact.email)) {
      setEmails([...emails, contact.email])
    }
    setEmailDraft('')
    setError(null)
    // ה-dropdown יישאר פתוח אם המשתמש רוצה להוסיף עוד; הפוקוס נשאר ב-input
  }

  function handleClose() {
    resetState()
    onClose()
  }

  /** מבצע commit לטיוטת המייל. מחזיר את רשימת המיילים הסופית או null אם הטיוטה לא תקינה. */
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

  function handleEmailKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // ניווט ב-dropdown יש לו עדיפות
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIdx(i => (i + 1) % suggestions.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIdx(i => (i <= 0 ? suggestions.length - 1 : i - 1))
        return
      }
      if (e.key === 'Enter' && highlightedIdx >= 0) {
        e.preventDefault()
        selectSuggestion(suggestions[highlightedIdx])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowSuggestions(false)
        return
      }
    }
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
    const parts = pasted.split(/[\s,;]+/).map(p => p.trim().toLowerCase()).filter(Boolean)
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

  function addFiles(incoming: FileList | File[]) {
    const arr = Array.from(incoming)
    const accepted: File[] = []
    const rejected: string[] = []
    for (const f of arr) {
      if (f.size > MAX_FILE_SIZE) {
        rejected.push(`${f.name} (${formatBytes(f.size)} — חורג מ-10MB)`)
        continue
      }
      if (files.some(existing => existing.name === f.name && existing.size === f.size)) continue
      accepted.push(f)
    }
    if (accepted.length) setFiles([...files, ...accepted])
    if (rejected.length) setError(`קבצים נדחו: ${rejected.join('; ')}`)
    else if (accepted.length) setError(null)
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(e.target.files)
    if (fileInputRef.current) fileInputRef.current.value = '' // אפשר לבחור שוב את אותו קובץ
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  function removeFile(idx: number) {
    setFiles(files.filter((_, i) => i !== idx))
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

    // 3. העלאת קבצים מצורפים → Storage + tender_documents
    type UploadedDoc = { filename: string; path: string; size: number; mime: string }
    const uploadedDocs: UploadedDoc[] = []
    for (const file of files) {
      const safeName = file.name.replace(/[^\w.\-א-ת ]/g, '_')
      const path = `${tenderId}/approval-${approvalRow.id}-${Date.now()}-${safeName}`
      const { error: upErr } = await supabase.storage
        .from('tender-documents')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (upErr) {
        console.warn(`Failed to upload ${file.name}: ${upErr.message}`)
        continue // לא חוסם — הבקשה כבר נוצרה
      }
      const { error: docErr } = await supabase
        .from('tender_documents')
        .insert({
          tender_id: tenderId,
          doc_type: DOC_TYPE_BY_REQUEST[requestType],
          title: file.name,
          file_ref: path,
          file_size_bytes: file.size,
          mime_type: file.type || 'application/octet-stream',
          metadata: { approval_request_id: approvalRow.id, source: 'approval_request_modal' },
        })
      if (docErr) {
        console.warn(`Uploaded but failed to register ${file.name}: ${docErr.message}`)
        continue
      }
      uploadedDocs.push({ filename: file.name, path, size: file.size, mime: file.type })
    }

    // 4. שמירת המיילים למאגר Autofill (non-blocking — לא חוסם את שליחת ההתראות)
    for (const recipientEmail of emails) {
      void recordEmailContact(recipientEmail)
    }

    // 5. הזנת תור התראות — מייל לכל נמען עם רשימת המסמכים בגוף ה-payload
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
            attachments: uploadedDocs,
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

          <div className={s.formGroup}>
            <label className={s.label}>מסמכים תומכים (אופציונלי)</label>
            <div
              className={`${s.fileDrop} ${dragActive ? s.fileDropActive : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragActive(true) }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              role="button"
              tabIndex={0}
            >
              <div className={s.fileDropIcon}>📎</div>
              <div className={s.fileDropText}>לחץ או גרור קבצים לכאן</div>
              <div className={s.fileDropHint}>PDF, Word, Excel, תמונה · עד 10MB לקובץ</div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_TYPES}
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />
            {files.length > 0 && (
              <div className={s.fileList}>
                {files.map((f, i) => (
                  <div key={`${f.name}-${i}`} className={s.fileItem}>
                    <span className={s.fileItemIcon}>{fileIcon(f.type, f.name)}</span>
                    <span className={s.fileItemName} title={f.name}>{f.name}</span>
                    <span className={s.fileItemSize}>{formatBytes(f.size)}</span>
                    <button
                      type="button"
                      className={s.fileItemRemove}
                      onClick={e => { e.stopPropagation(); removeFile(i) }}
                      aria-label={`הסר ${f.name}`}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
            <div className={s.hint}>המסמכים יישמרו בתיק ההליך ויופיעו ב-Tab "מסמכים".</div>
          </div>

          {error && <div className={s.error}>{error}</div>}

          <div className={s.info}>
            ⏱️ SLA: יסתיים ב-{slaDueAt.toLocaleDateString('he-IL')} ({slaDueAt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })})
          </div>
          <div className={s.foot}>
            <button className={`${s.btn} ${s.btnSecondary}`} onClick={handleClose}>ביטול</button>
            <button
              className={`${s.btn} ${s.btnPrimary}`}
              disabled={isBudgetReq && !(amount > 0)}
              onClick={() => { setError(null); setStep(2) }}
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
            <div className={s.autocompleteWrap} ref={autocompleteRef}>
              <div className={s.chipsField} onClick={() => setShowSuggestions(true)}>
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
                  onChange={e => { setEmailDraft(e.target.value); setShowSuggestions(true) }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={handleEmailKeyDown}
                  onPaste={handleEmailPaste}
                  placeholder={emails.length === 0 ? 'name@example.com — ניתן להדביק רשימה' : 'הוסף כתובת נוספת'}
                />
              </div>
              {showSuggestions && suggestions.length > 0 && (
                <div className={s.autocomplete} role="listbox">
                  <div className={s.autocompleteHeader}>
                    {emailDraft.trim() ? 'התאמות מהמאגר' : 'בשימוש לאחרונה'}
                  </div>
                  {suggestions.map((c, idx) => (
                    <div
                      key={c.id}
                      role="option"
                      aria-selected={idx === highlightedIdx}
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
              {showSuggestions && suggestions.length === 0 && emailDraft.trim().length >= 2 && (
                <div className={s.autocomplete}>
                  <div className={s.autocompleteEmpty}>אין התאמות במאגר — הזן Enter כדי להוסיף ידנית</div>
                </div>
              )}
            </div>
            <div className={s.hint}>
              Enter / פסיק / רווח כדי להוסיף. ניתן להדביק רשימה מופרדת בפסיקים. ↑↓ לבחירה מהמאגר.
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
            {files.length > 0 && (
              <div>
                <strong>מסמכים מצורפים ({files.length}):</strong>
                <div className={s.fileList} style={{ marginTop: 6 }}>
                  {files.map((f, i) => (
                    <div key={`r-${f.name}-${i}`} className={s.fileItem}>
                      <span className={s.fileItemIcon}>{fileIcon(f.type, f.name)}</span>
                      <span className={s.fileItemName} title={f.name}>{f.name}</span>
                      <span className={s.fileItemSize}>{formatBytes(f.size)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
