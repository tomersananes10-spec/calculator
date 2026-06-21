import { useEffect, useRef, useState } from 'react'
import { Modal, StepDots, modalStyles as s } from '../Modal'
import { supabase } from '../../../../lib/supabase'
import { computeDueAt } from '../../slaEngine'
import { enqueueNotification } from '../../lib/notifications'
import { searchEmailContacts, recordEmailContact, type EmailContact } from '../../lib/emailContacts'
import { safeFileName } from '../../lib/safeFileName'
import { activeByRole } from '../../lib/signers'
import type { ApprovalRequestType, TenderApprovalRequest, TenderSigner, SignerRole } from '../../types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_TYPES = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg'

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

interface Props {
  open: boolean
  onClose: () => void
  tenderId: string
  /** סוג הבקשה מקבע את ה-SLA והמסך. */
  requestType: ApprovalRequestType
  /**
   * תפקיד המאשר (אופציונלי) — נשמר ב-requested_role.
   * משמש למשל בחתימות (legal_professional/budget_officer/signatory) כדי שמערכת
   * הדרישות תזהה מי חתם.
   */
  requestedRole?: string
  /**
   * תווית כותרת מותאמת אישית (מחליפה את REQUEST_TYPE_LABELS). שימושי כשמשתמשים
   * ב-requestType כללי כמו 'contract_signature' אבל רוצים להציג "חתימת משפטן".
   */
  customTitle?: string
  /** סכום (לבקשת תקציב — יחושב גם budget). */
  estimatedAmount?: number
  onSubmitted: () => void
  /**
   * במצב "שליחה מחדש לאחר תיקון" (resubmit) — הבקשה הקודמת שהוחזרה לתיקונים.
   * אם קיימת, הטופס נטען עם הנתונים שלה + מוצג באנר עם הערות המאשר,
   * ובשליחה נוצרת בקשה חדשה עם `metadata.parent_request_id` המקשרת לאחור.
   */
  resubmitOf?: TenderApprovalRequest
  /**
   * מסמכים מהבקשה הקודמת (כשמדובר ב-resubmit) — מוצגים כקריאה-בלבד בשלב 1
   * כדי שהמשתמש יראה מה היה צמוד קודם ויוכל להעלות גרסה מעודכנת.
   */
  previousDocs?: {
    id: string
    title: string
    file_ref: string | null
    file_size_bytes: number | null
    /** מקור הקובץ: 'approver_returned' = הקובץ שהמאשר ערך והחזיר; אחרת הוא של כותב הבקשה */
    source?: string
    /** מייל המעלה (משמש כ-fallback אם signature_name חסר) */
    uploaded_by_email?: string
  }[]
  /**
   * רשימת חתמים מוגדרים להליך — משמשת לפרה-פיל של כתובת המייל לנמען לפי requestType.
   * אופציונלי; אם לא מועבר, הנמענים מתחילים ריקים (התנהגות קיימת).
   */
  signers?: TenderSigner[]
}

const REQUEST_TYPE_LABELS: Partial<Record<ApprovalRequestType, string>> = {
  budget_approval: 'בקשת אישור תקציבי',
  olma_approval: 'בקשת אישור מינהל הרכש',
  professional_review: 'בקשת בדיקת גורם מקצועי',
  committee_outbound: 'בקשת ועדה ליציאה לתיחור',
  committee_winner: 'בקשת ועדה לאישור זוכה',
  contract_signature: 'בקשת חתימה',
}

const REQUEST_TYPE_ROLE_HINT: Partial<Record<ApprovalRequestType, string>> = {
  budget_approval: 'תקציבן המערך',
  olma_approval: 'מנהל הרכש',
  professional_review: 'גורם מקצועי במינהל הרכש',
  committee_outbound: 'חברי ועדת מכרזים',
  committee_winner: 'חברי ועדת מכרזים',
  contract_signature: 'מורשה חתימה',
}

// מיפוי סוג בקשה → doc_type ב-tender_documents (לפי CHECK constraint במיגרציה 006)
const DOC_TYPE_BY_REQUEST: Partial<Record<ApprovalRequestType, string>> = {
  budget_approval: 'budget_approval',
  olma_approval: 'olma_approval',
  professional_review: 'other',
  committee_outbound: 'committee_request',
  committee_winner: 'committee_request',
  contract_signature: 'contract',
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

export function ApprovalRequestModal({ open, onClose, tenderId, requestType, requestedRole, customTitle, estimatedAmount, onSubmitted, resubmitOf, previousDocs, signers }: Props) {
  const isResubmit = !!resubmitOf

  // טעינה ראשונית של ערכי הטופס. כשמדובר ב-resubmit — שולפים מההיסטוריה של הבקשה הקודמת.
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
  const initialSubject = (): string => {
    if (!resubmitOf) return ''
    const subj = resubmitOf.metadata?.subject
    return typeof subj === 'string' ? subj : ''
  }
  const initialBody = (): string => {
    if (!resubmitOf) return ''
    const b = resubmitOf.metadata?.body
    return typeof b === 'string' ? b : ''
  }
  const initialAmount = (): number => {
    if (resubmitOf) {
      const amt = (resubmitOf.metadata as Record<string, unknown> | null)?.amount
      if (typeof amt === 'number') return amt
    }
    return estimatedAmount ?? 0
  }

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [amount, setAmount] = useState<number>(initialAmount())
  const [resubmitResponse, setResubmitResponse] = useState('')
  const [emails, setEmails] = useState<string[]>(initialEmails())
  const [emailDraft, setEmailDraft] = useState('')
  const [subject, setSubject] = useState<string>(initialSubject())
  const [body, setBody] = useState<string>(initialBody())
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

  const baseTitle = customTitle ?? REQUEST_TYPE_LABELS[requestType] ?? 'בקשת אישור'
  const title = isResubmit ? `📤 גרסה מתוקנת — ${baseTitle}` : baseTitle
  const roleHint = REQUEST_TYPE_ROLE_HINT[requestType] ?? 'בעל תפקיד מתאים'
  const slaDueAt = computeDueAt(requestType)
  const isBudgetReq = requestType === 'budget_approval'

  // הערות המאשר שהחזיר את הבקשה הקודמת לתיקונים — מוצגות כבאנר בראש שלב 1.
  const returnerComments = resubmitOf?.comments?.trim() ?? null
  const returnerName = (() => {
    if (!resubmitOf) return null
    const sig = (resubmitOf.metadata as Record<string, unknown> | null)?.signature_name
    return typeof sig === 'string' && sig.trim() ? sig : null
  })()

  // בעת פתיחת המודאל ב-resubmit mode עם בקשה חדשה — לאתחל מחדש את הטופס מהמטא של הבקשה הקודמת.
  useEffect(() => {
    if (!open || !resubmitOf) return
    setStep(1)
    setError(null)
    setEmails(initialEmails())
    setSubject(initialSubject())
    setBody(initialBody())
    setAmount(initialAmount())
    setEmailDraft('')
    setResubmitResponse('')
    setFiles([])
    setSuggestions([])
    setShowSuggestions(false)
    setHighlightedIdx(-1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resubmitOf?.id])

  function resetState() {
    setStep(1)
    setError(null)
    setEmails([])
    setEmailDraft('')
    setSubject('')
    setBody('')
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

    const effectiveSubject = subject.trim() || baseTitle
    const effectiveBody = body.trim()

    const metadata: Record<string, unknown> = {}
    if (emails.length) metadata.recipients = emails
    if (subject.trim()) metadata.subject = subject.trim()
    if (effectiveBody) metadata.body = effectiveBody
    if (isResubmit && resubmitOf) {
      metadata.parent_request_id = resubmitOf.id
      const prevIter = (resubmitOf.metadata as Record<string, unknown> | null)?.resubmit_iteration
      const prevN = typeof prevIter === 'number' ? prevIter : 1
      metadata.resubmit_iteration = prevN + 1
      if (resubmitResponse.trim()) metadata.resubmit_response = resubmitResponse.trim()
    }

    // 1. צור approval_request
    const { data: approvalRow, error: appErr } = await supabase
      .from('tender_approval_requests')
      .insert({
        tender_id: tenderId,
        request_type: requestType,
        requested_from: null,  // ניתוב לפי תפקיד; בעתיד dropdown של משתמשים
        requested_role: requestedRole ?? roleHint,
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

    // 3. הטבעת approval token לכל נמען — נצרך ע"י ה-dispatcher כדי לבנות לינק ייעודי במייל.
    //    מפה: email → token. מי שאין לו token לא יקבל לינק עם t=... (אבל עדיין יקבל מייל).
    const tokensByEmail: Record<string, string> = {}
    for (const recipientEmail of emails) {
      const { data: token, error: tokenErr } = await supabase.rpc('mint_approval_token', {
        p_request_id: approvalRow.id,
        p_recipient_email: recipientEmail,
      })
      if (tokenErr) {
        console.warn(`Failed to mint token for ${recipientEmail}: ${tokenErr.message}`)
        continue
      }
      tokensByEmail[recipientEmail] = token as string
    }

    // 4. העלאת קבצים מצורפים → Storage + tender_documents
    //    כשל בכל שלב נחשב כשל אמיתי — מציגים שגיאה ולא ממשיכים בשקט.
    //    הבקשה כבר נוצרה ב-DB, אבל המשתמש יקבל הודעה ברורה שמשהו נכשל כדי שיוכל לתקן.
    type UploadedDoc = { filename: string; path: string; size: number; mime: string }
    const uploadedDocs: UploadedDoc[] = []
    const uploadErrors: string[] = []
    for (const file of files) {
      const safeName = safeFileName(file.name)
      const path = `${tenderId}/approval-${approvalRow.id}-${Date.now()}-${safeName}`
      const { error: upErr } = await supabase.storage
        .from('tender-documents')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (upErr) {
        uploadErrors.push(`${file.name}: ${upErr.message}`)
        continue
      }
      const { error: docErr } = await supabase
        .from('tender_documents')
        .insert({
          tender_id: tenderId,
          doc_type: DOC_TYPE_BY_REQUEST[requestType] ?? 'other',
          title: file.name,
          file_ref: path,
          file_size_bytes: file.size,
          mime_type: file.type || 'application/octet-stream',
          metadata: { approval_request_id: approvalRow.id, source: 'approval_request_modal' },
        })
      if (docErr) {
        uploadErrors.push(`${file.name} (נשמר ב-Storage אך לא נרשם): ${docErr.message}`)
        continue
      }
      uploadedDocs.push({ filename: file.name, path, size: file.size, mime: file.type })
    }
    if (uploadErrors.length > 0) {
      setSubmitting(false)
      setError(`הבקשה נוצרה אבל העלאת ${uploadErrors.length} קבצים נכשלה — נסה לפתוח שוב ולצרף את הקובץ. שגיאה: ${uploadErrors.join('; ')}`)
      return
    }
    // הגנה ב-resubmit: אם הגענו לכאן ללא קבצים — שגיאה (לא אמור לקרות בגלל הוולידציה ב-step 1).
    if (isResubmit && uploadedDocs.length === 0) {
      setSubmitting(false)
      setError('שליחה מחדש לאחר תיקון מחייבת לפחות קובץ אחד — חזור לשלב 1 וצרף קובץ מתוקן.')
      return
    }

    // 5. שמירת המיילים למאגר Autofill (non-blocking — לא חוסם את שליחת ההתראות)
    for (const recipientEmail of emails) {
      void recordEmailContact(recipientEmail)
    }

    // 6. הזנת תור התראות — מייל לכל נמען עם token ייעודי וקבצי attachments ב-payload
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
            approval_token: tokensByEmail[recipientEmail] ?? null,
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
          {isResubmit && returnerComments && (
            <div style={{
              background: 'var(--amber-bg)',
              border: '1px solid var(--amber)',
              borderRadius: 10,
              padding: '12px 14px',
              marginBottom: 14,
            }}>
              <div style={{ fontWeight: 700, color: '#78350f', marginBottom: 6, fontSize: 13 }}>
                ↩ הערות {returnerName ?? 'המאשר'} מההחזרה הקודמת:
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                {returnerComments}
              </div>
              <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--text2)' }}>
                💡 תקן את הבקשה לפי ההערות שלעיל. הנתונים של הבקשה הקודמת הועתקו ויש להעלות גרסה מעודכנת של המסמכים.
              </div>
            </div>
          )}
          {isResubmit && previousDocs && previousDocs.length > 0 && (
            <PreviousDocCard doc={previousDocs[0]} returnerName={returnerName} />
          )}
          {isResubmit && (
            <>
              <div className={s.formGroup}>
                <label className={s.label}>תגובה לתיקונים <span style={{ fontWeight: 400, color: 'var(--text3)' }}>(אופציונלי, מומלץ)</span></label>
                <textarea
                  className={s.textarea}
                  value={resubmitResponse}
                  onChange={e => setResubmitResponse(e.target.value)}
                  placeholder='הסבר בקצרה מה תוקן בעקבות הערות המאשר — לדוגמה: "צירפתי חתימת ראש האגף", "עדכנתי את הטבלה בעמ׳ 3" וכו׳'
                />
                <div className={s.hint}>יישמר ב-audit log ויוצג למאשר ככיוון לתיקון.</div>
              </div>
              <div className={s.formGroup}>
                <label className={`${s.label} ${s.required}`}>
                  קובץ מתוקן
                </label>
                <div
                  className={`${s.fileDrop} ${dragActive ? s.fileDropActive : ''}`}
                  style={files.length === 0 ? { borderColor: 'var(--amber)', background: 'var(--amber-bg)' } : undefined}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragActive(true) }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  role="button"
                  tabIndex={0}
                >
                  <div className={s.fileDropIcon}>📎</div>
                  <div className={s.fileDropText}>
                    {files.length === 0 ? 'חובה לצרף לפחות קובץ אחד מתוקן' : 'לחץ או גרור כדי להוסיף עוד קבצים'}
                  </div>
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
                <div className={s.hint}>הקובץ ייכנס לארכיון ההליך כגרסה חדשה.</div>
              </div>
            </>
          )}
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

          {!isResubmit && (
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
          )}

          {error && <div className={s.error}>{error}</div>}

          <div className={s.foot}>
            <button className={`${s.btn} ${s.btnSecondary}`} onClick={handleClose}>ביטול</button>
            <button
              className={`${s.btn} ${s.btnPrimary}`}
              disabled={(isBudgetReq && !(amount > 0)) || (isResubmit && files.length === 0)}
              onClick={() => {
                if (isResubmit && files.length === 0) {
                  setError('חובה לצרף לפחות קובץ אחד מתוקן לפני המשך')
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

// ───────── PreviousDocCard ─────────
// מציג את הגרסה האחרונה של המסמך מהבקשה הקודמת — בדר"כ הקובץ שהמאשר ערך
// והחזיר לתיקונים. כפתור הורדה נותן signed URL ל-bucket tender-documents.
interface PreviousDocCardProps {
  doc: {
    id: string
    title: string
    file_ref: string | null
    file_size_bytes: number | null
    source?: string
    uploaded_by_email?: string
  }
  returnerName: string | null
}

function PreviousDocCard({ doc, returnerName }: PreviousDocCardProps) {
  const [downloading, setDownloading] = useState(false)
  const isApproverFile = doc.source === 'approver_returned'

  // שם המציג: סדר עדיפויות — signature_name של המאשר → אימייל המעלה → "המאשר"
  const displayName = returnerName ?? doc.uploaded_by_email ?? 'המאשר'

  async function handleDownload() {
    if (!doc.file_ref) return
    setDownloading(true)
    const { data, error } = await supabase.storage
      .from('tender-documents')
      .createSignedUrl(doc.file_ref, 3600)
    setDownloading(false)
    if (error || !data?.signedUrl) {
      alert(`כשל בהורדה: ${error?.message ?? 'לא ידוע'}`)
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  return (
    <div style={{
      background: isApproverFile ? 'var(--amber-bg)' : 'var(--bg)',
      border: `1.5px solid ${isApproverFile ? 'var(--amber)' : 'var(--border)'}`,
      borderRadius: 10,
      padding: '12px 14px',
      marginBottom: 14,
      fontSize: 12.5,
    }}>
      <div style={{ fontWeight: 700, color: isApproverFile ? '#78350f' : 'var(--text2)', marginBottom: 8, fontSize: 13 }}>
        {isApproverFile
          ? `📥 הקובץ ש${displayName} ערך והחזיר לתיקונים`
          : '📎 מסמך מהבקשה הקודמת'}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '8px 12px',
      }}>
        <span style={{ fontSize: 16 }}>📄</span>
        <span style={{ flex: 1, fontWeight: 600, color: 'var(--text)', wordBreak: 'break-word' }}>
          {doc.title}
        </span>
        {doc.file_size_bytes ? (
          <span style={{ color: 'var(--text3)', fontSize: 11.5 }}>
            {formatBytes(doc.file_size_bytes)}
          </span>
        ) : null}
        <button
          type="button"
          onClick={handleDownload}
          disabled={!doc.file_ref || downloading}
          style={{
            background: 'var(--primary)',
            color: '#fff',
            border: 'none',
            padding: '6px 14px',
            borderRadius: 7,
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            opacity: !doc.file_ref || downloading ? 0.5 : 1,
          }}
        >
          {downloading ? 'מוריד…' : '⬇ הורד'}
        </button>
      </div>

      {isApproverFile && (
        <div style={{ marginTop: 8, fontSize: 11.5, color: '#78350f' }}>
          הורד את הקובץ, תקן לפי ההערות וההסימונים, ולאחר מכן העלה למטה את הגרסה המעודכנת.
        </div>
      )}
    </div>
  )
}
