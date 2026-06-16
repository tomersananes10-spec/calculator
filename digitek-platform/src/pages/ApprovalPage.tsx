import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import styles from './ApprovalPage.module.css'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ACCEPTED_TYPES = '.pdf,.doc,.docx,.png,.jpg,.jpeg'

const REQUEST_TYPE_LABELS: Record<string, string> = {
  budget_approval: 'אישור תקציבי',
  olma_approval: 'אישור אלמ"ה',
  professional_review: 'בדיקת גורם מקצועי',
  committee_outbound: 'אישור ועדה ליציאה לתיחור',
  committee_winner: 'אישור ועדה לזוכה',
  contract_signature: 'חתימה על הסכם',
  guarantee_verification: 'אימות ערבות',
  insurance_verification: 'אימות ביטוח',
  invoice_approval: 'אישור חשבונית',
  milestone_acceptance: 'אישור אבן דרך',
  vendor_evaluation: 'הערכת ספק',
  other: 'בקשת אישור',
}

interface RedeemedRequest {
  request_id: string
  tender_id: string
  tender_title: string | null
  tender_number: string | null
  request_type: string
  status: string
  requested_role: string | null
  sla_due_at: string | null
  metadata: Record<string, unknown> | null
  recipient_email: string
  is_used: boolean
  is_expired: boolean
  used_at: string | null
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

export function ApprovalPage() {
  const { requestId } = useParams<{ requestId: string }>()
  const [params] = useSearchParams()
  const token = params.get('t') ?? ''

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<RedeemedRequest | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Form state
  const [comments, setComments] = useState('')
  const [signatureName, setSignatureName] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState<null | 'approved' | 'rejected'>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Admin/owner view-only mode — נכנס בלי token. רואה את כל הפרטים אבל לא יכול להחליט.
  const [adminMode, setAdminMode] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      // Path 1 — Token (לקוח חיצוני / מאשר עם הקישור מהמייל)
      if (token) {
        const { data: rows, error } = await supabase.rpc('redeem_approval_token', { p_token: token })
        if (cancelled) return
        if (error) {
          setLoadError(error.message)
        } else if (!rows || rows.length === 0) {
          setLoadError('Token לא תקין. ייתכן שהקישור פג תוקף או שכבר נעשה בו שימוש.')
        } else {
          const row = rows[0] as RedeemedRequest
          if (requestId && row.request_id !== requestId) {
            setLoadError('Token לא תואם לבקשה המבוקשת.')
          } else {
            setData(row)
          }
        }
        setLoading(false)
        return
      }

      // Path 2 — No token: try admin/owner direct access via RLS
      if (!requestId) {
        setLoadError('חסר מזהה בקשה.')
        setLoading(false)
        return
      }

      const { data: userData } = await supabase.auth.getUser()
      const user = userData?.user
      if (!user) {
        setLoadError('חסר token בכתובת. השתמש בקישור שקיבלת במייל, או היכנס למערכת כדי לצפות.')
        setLoading(false)
        return
      }

      // Authenticated — fetch the request directly. RLS allows tender owner + admin only.
      const { data: reqRow, error: reqErr } = await supabase
        .from('tender_approval_requests')
        .select('id, tender_id, request_type, status, requested_role, sla_due_at, metadata')
        .eq('id', requestId)
        .maybeSingle()
      if (cancelled) return
      if (reqErr || !reqRow) {
        setLoadError(reqErr?.message ?? 'בקשה לא נמצאה או שאין לך הרשאה לצפות בה.')
        setLoading(false)
        return
      }
      const { data: tenderRow } = await supabase
        .from('tenders')
        .select('title, tender_number')
        .eq('id', reqRow.tender_id)
        .maybeSingle()

      setAdminMode(true)
      setData({
        request_id: reqRow.id,
        tender_id: reqRow.tender_id,
        tender_title: tenderRow?.title ?? null,
        tender_number: tenderRow?.tender_number ?? null,
        request_type: reqRow.request_type,
        status: reqRow.status,
        requested_role: reqRow.requested_role,
        sla_due_at: reqRow.sla_due_at,
        metadata: reqRow.metadata ?? null,
        recipient_email: user.email ?? '',
        is_used: false,
        is_expired: false,
        used_at: null,
      })
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [token, requestId])

  function handleFiles(incoming: FileList | File[]) {
    const arr = Array.from(incoming)
    const accepted: File[] = []
    for (const f of arr) {
      if (f.size > MAX_FILE_SIZE) continue
      if (files.some(x => x.name === f.name && x.size === f.size)) continue
      accepted.push(f)
    }
    if (accepted.length) setFiles([...files, ...accepted])
  }

  async function submit(decision: 'approved' | 'rejected') {
    setSubmitError(null)

    if (!signatureName.trim()) {
      setSubmitError('יש להזין שם מלא לחתימה')
      return
    }
    if (!acknowledged) {
      setSubmitError('יש לסמן את אישור ההחלטה')
      return
    }
    if (decision === 'rejected' && !comments.trim()) {
      setSubmitError('בדחיה — יש לפרט את הסיבה בשדה ההערות')
      return
    }
    if (!data) return

    setSubmitting(true)

    // Upload optional attachments. Anonymous users can upload to the tender-documents
    // bucket only if RLS allows — for tokens we'll skip the storage step entirely if
    // it fails and just decide without attachments.
    const attachmentPaths: string[] = []
    for (const file of files) {
      const safeName = file.name.replace(/[^\w.\-א-ת ]/g, '_')
      const path = `${data.tender_id}/approval-${data.request_id}-decision-${Date.now()}-${safeName}`
      const { error: upErr } = await supabase.storage
        .from('tender-documents')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (!upErr) attachmentPaths.push(path)
      else console.warn('attachment upload failed:', upErr.message)
    }

    const { error: rpcErr } = await supabase.rpc('tender_approval_decide_by_token', {
      p_token: token,
      p_decision: decision,
      p_comments: comments.trim() || null,
      p_signature_name: signatureName.trim(),
      p_signature_image_path: null,
      p_attachment_paths: attachmentPaths.length ? attachmentPaths : null,
    })

    setSubmitting(false)
    if (rpcErr) {
      setSubmitError(rpcErr.message)
      return
    }
    setSubmitted(decision)
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.brand}>
          <span>LIBA — מכרזים</span>
          <span className={styles.brandTag}>מערכת ניהול רכש דיגיטק</span>
        </div>

        <div className={styles.card}>
          {loading && <div className={styles.loading}>טוען את פרטי הבקשה…</div>}

          {!loading && loadError && (
            <>
              <h1 className={styles.title}>שגיאה בטעינה</h1>
              <div className={styles.error}>{loadError}</div>
            </>
          )}

          {!loading && !loadError && data && submitted && (
            <div className={styles.successCard}>
              <div className={styles.successIcon}>
                {submitted === 'approved' ? '✓' : '✕'}
              </div>
              <div className={styles.successTitle}>
                {submitted === 'approved' ? 'הבקשה אושרה' : 'הבקשה נדחתה'}
              </div>
              <div className={styles.successText}>
                ההחלטה נשמרה במערכת ונשלחה הודעה למבקש. ניתן לסגור חלון זה.
              </div>
            </div>
          )}

          {!loading && !loadError && data && !submitted && (
            <>
              <h1 className={styles.title}>
                {REQUEST_TYPE_LABELS[data.request_type] ?? 'בקשת אישור'}
              </h1>
              <div className={styles.subtitle}>
                {data.tender_title ? `הליך: ${data.tender_title}` : ''}
                {data.tender_number ? ` · ${data.tender_number}` : ''}
              </div>

              {data.is_used && (
                <div className={styles.notice}>
                  הקישור הזה כבר נוצל ב-{new Date(data.used_at ?? '').toLocaleString('he-IL')}. החלטה חדשה לא תישמר.
                </div>
              )}
              {data.is_expired && !data.is_used && (
                <div className={styles.notice}>
                  הקישור פג תוקף. צור קשר עם מבקש האישור לקבלת קישור חדש.
                </div>
              )}
              {data.status !== 'pending' && data.status !== 'in_review' && !data.is_used && (
                <div className={styles.notice}>
                  הבקשה כבר בסטטוס "{data.status}" — לא ניתן לשנות.
                </div>
              )}

              <div className={styles.meta}>
                <span className={styles.metaLabel}>תפקיד נמען:</span>
                <span className={styles.metaValue}>{data.requested_role ?? '—'}</span>

                <span className={styles.metaLabel}>נשלח אל:</span>
                <span className={styles.metaValue} style={{ direction: 'ltr', textAlign: 'right' }}>
                  {data.recipient_email}
                </span>

                {data.metadata?.amount != null && (
                  <>
                    <span className={styles.metaLabel}>סכום מבוקש:</span>
                    <span className={`${styles.metaValue} ${styles.amount}`}>
                      {new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(Number(data.metadata.amount))}
                    </span>
                  </>
                )}

                {data.sla_due_at && (
                  <>
                    <span className={styles.metaLabel}>SLA יסתיים:</span>
                    <span className={styles.metaValue}>
                      {new Date(data.sla_due_at).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </>
                )}
              </div>

              {data.metadata?.body && (
                <div className={styles.section}>
                  <div className={styles.sectionTitle}>פרטי הבקשה</div>
                  <div style={{ background: 'var(--bg)', padding: '12px 14px', borderRadius: 8, fontSize: 13.5, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {String(data.metadata.body)}
                  </div>
                </div>
              )}

              {/* כל החלקים מתחת — שדות הקלט והכפתורים — מוצגים רק למאשר עצמו
                  (מי שנכנס עם token חוקי). משתמשים מורשים אחרים (admin, owner)
                  רואים את הפרטים אבל לא יכולים להחליט מכאן. */}
              {!adminMode && (
                <>
                  <div className={styles.section}>
                    <label className={styles.label}>הערות {' '}<span style={{ fontWeight: 400, color: 'var(--text3)' }}>(חובה בדחיה)</span></label>
                    <textarea
                      className={styles.textarea}
                      value={comments}
                      onChange={e => setComments(e.target.value)}
                      placeholder="הוסף הערות, תנאים, נימוקים…"
                      disabled={data.is_used || data.is_expired}
                    />
                  </div>

                  <div className={styles.section}>
                    <div className={styles.sectionTitle}>מסמכים מצורפים (אופציונלי)</div>
                    <div
                      className={styles.fileDrop}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.preventDefault(); if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files) }}
                    >
                      <div className={styles.fileDropText}>לחץ או גרור מסמך חתום</div>
                      <div className={styles.fileDropHint}>PDF / Word / תמונה · עד 10MB</div>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept={ACCEPTED_TYPES}
                      onChange={e => { if (e.target.files) handleFiles(e.target.files); if (fileInputRef.current) fileInputRef.current.value = '' }}
                      style={{ display: 'none' }}
                    />
                    {files.length > 0 && (
                      <div className={styles.fileList}>
                        {files.map((f, i) => (
                          <div key={`${f.name}-${i}`} className={styles.fileItem}>
                            <span className={styles.fileItemName}>📎 {f.name}</span>
                            <span className={styles.fileItemSize}>{formatBytes(f.size)}</span>
                            <button
                              type="button"
                              className={styles.fileItemRemove}
                              onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                              aria-label={`הסר ${f.name}`}
                            >×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={styles.section}>
                    <label className={`${styles.label} ${styles.required}`}>שם מלא (חתימה)</label>
                    <input
                      className={styles.input}
                      type="text"
                      value={signatureName}
                      onChange={e => setSignatureName(e.target.value)}
                      placeholder="ישראל ישראלי"
                      disabled={data.is_used || data.is_expired}
                    />
                    <div className={styles.hint}>השם שלך יישמר באודיט כראיה לחתימה אלקטרונית.</div>

                    <div className={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        id="ack"
                        checked={acknowledged}
                        onChange={e => setAcknowledged(e.target.checked)}
                        disabled={data.is_used || data.is_expired}
                      />
                      <label htmlFor="ack">
                        אני מאשר/ת כי בחנתי את הבקשה ואני מקבל/ת אחריות על החלטתי. ההחלטה תישמר במערכת עם חותמת זמן ושמי.
                      </label>
                    </div>
                  </div>

                  {submitError && <div className={styles.error}>{submitError}</div>}

                  <div className={styles.actions}>
                    <button
                      className={`${styles.btn} ${styles.btnReject}`}
                      disabled={submitting || data.is_used || data.is_expired}
                      onClick={() => submit('rejected')}
                    >
                      ❌ דחה
                    </button>
                    <button
                      className={`${styles.btn} ${styles.btnApprove}`}
                      disabled={submitting || data.is_used || data.is_expired}
                      onClick={() => submit('approved')}
                    >
                      ✓ אשר
                    </button>
                  </div>
                </>
              )}

              {adminMode && (
                <div className={styles.viewOnlyPanel}>
                  <div className={styles.viewOnlyTitle}>בקשה ממתינה להחלטה</div>
                  <div className={styles.viewOnlyText}>
                    החלטה זו תתקבל ע״י <strong>{data.requested_role ?? 'המאשר המוגדר'}</strong>.
                    הקישור לחתימה נשלח במייל ל-<strong style={{ direction: 'ltr', display: 'inline-block' }}>{data.recipient_email}</strong>.
                  </div>
                  <div className={styles.viewOnlyText} style={{ marginTop: 8, fontSize: 12.5, color: 'var(--text3)' }}>
                    ההחלטה תופיע כאן אוטומטית ברגע שתתקבל.
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
