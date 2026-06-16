import { useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import type { TenderApprovalRequest } from '../types'
import styles from './StageRequirementsTab.module.css'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ACCEPTED_TYPES = '.pdf,.doc,.docx,.png,.jpg,.jpeg'

interface Props {
  request: TenderApprovalRequest
  tenderId: string
  onDecided: () => void
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

export function InlineApprovalForm({ request, tenderId, onDecided }: Props) {
  const [comments, setComments] = useState('')
  const [signatureName, setSignatureName] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

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

    setSubmitting(true)

    // Upload optional attachments
    const attachmentPaths: string[] = []
    for (const file of files) {
      const safeName = file.name.replace(/[^\w.\-א-ת ]/g, '_')
      const path = `${tenderId}/approval-${request.id}-decision-${Date.now()}-${safeName}`
      const { error: upErr } = await supabase.storage
        .from('tender-documents')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (!upErr) attachmentPaths.push(path)
      else console.warn('attachment upload failed:', upErr.message)
    }

    const { error: rpcErr } = await supabase.rpc('tender_approval_decide_as_recipient', {
      p_request_id: request.id,
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
    onDecided()
  }

  return (
    <div className={styles.inlineForm}>
      <div className={styles.inlineFormTitle}>
        ✓ אתה רשאי לחתום על בקשה זו
      </div>

      <div className={styles.inlineFormField}>
        <label className={styles.inlineLabel}>הערות <span style={{ fontWeight: 400, color: 'var(--text3)' }}>(חובה בדחיה)</span></label>
        <textarea
          className={styles.inlineTextarea}
          value={comments}
          onChange={e => setComments(e.target.value)}
          placeholder="הוסף הערות, תנאים, נימוקים…"
        />
      </div>

      <div className={styles.inlineFormField}>
        <label className={styles.inlineLabel}>מסמכים מצורפים <span style={{ fontWeight: 400, color: 'var(--text3)' }}>(אופציונלי)</span></label>
        <div
          className={styles.inlineFileDrop}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files) }}
        >
          <span>📎 לחץ או גרור מסמך חתום · עד 10MB</span>
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
          <div className={styles.inlineFileList}>
            {files.map((f, i) => (
              <div key={`${f.name}-${i}`} className={styles.inlineFileItem}>
                <span>📎 {f.name}</span>
                <span style={{ color: 'var(--text3)', fontSize: 11.5 }}>{formatBytes(f.size)}</span>
                <button
                  type="button"
                  className={styles.inlineFileRemove}
                  onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                  aria-label={`הסר ${f.name}`}
                >×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.inlineFormField}>
        <label className={styles.inlineLabel}>שם מלא (חתימה) *</label>
        <input
          className={styles.inlineInput}
          type="text"
          value={signatureName}
          onChange={e => setSignatureName(e.target.value)}
          placeholder="ישראל ישראלי"
        />
      </div>

      <label className={styles.inlineCheckbox}>
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={e => setAcknowledged(e.target.checked)}
        />
        <span>אני מאשר/ת כי בחנתי את הבקשה ואני מקבל/ת אחריות על החלטתי. ההחלטה תישמר במערכת עם חותמת זמן ושמי.</span>
      </label>

      {submitError && <div className={styles.inlineError}>{submitError}</div>}

      <div className={styles.inlineActions}>
        <button
          className={`${styles.inlineBtn} ${styles.inlineBtnReject}`}
          disabled={submitting}
          onClick={() => submit('rejected')}
        >
          ❌ דחה
        </button>
        <button
          className={`${styles.inlineBtn} ${styles.inlineBtnApprove}`}
          disabled={submitting}
          onClick={() => submit('approved')}
        >
          {submitting ? 'שולח…' : '✓ אשר'}
        </button>
      </div>
    </div>
  )
}
