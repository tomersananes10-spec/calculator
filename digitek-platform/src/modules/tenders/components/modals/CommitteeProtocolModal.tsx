import { useRef, useState } from 'react'
import { Modal, StepDots, modalStyles as s } from '../Modal'
import { supabase } from '../../../../lib/supabase'
import { safeFileName } from '../../lib/safeFileName'
import type { ProtocolDecision, ProtocolType } from '../../types'

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB — פרוטוקולים סרוקים יכולים להיות גדולים
const ACCEPTED_TYPES = '.pdf,.doc,.docx,.png,.jpg,.jpeg'

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

interface Props {
  open: boolean
  onClose: () => void
  tenderId: string
  protocolType: ProtocolType  // 'outbound_request' | 'winner_approval' | ...
  onSubmitted: () => void
}

const PROTOCOL_TYPE_LABELS: Record<ProtocolType, string> = {
  outbound_request: 'פרוטוקול ועדה — יציאה לתיחור',
  winner_approval: 'פרוטוקול ועדה — אישור זוכה',
  exceptions: 'פרוטוקול ועדת חריגים',
  subcommittee_scoring: 'פרוטוקול ניקוד ועדת משנה',
}

const DECISION_LABELS: Record<ProtocolDecision, string> = {
  approved: 'אושר',
  returned_for_correction: 'הוחזר לתיקון',
  completion_required: 'נדרשת השלמה',
  rejected: 'נדחה',
}

export function CommitteeProtocolModal({ open, onClose, tenderId, protocolType, onSubmitted }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [rationale, setRationale] = useState('')
  const [decision, setDecision] = useState<ProtocolDecision>('approved')
  const [signedNow, setSignedNow] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const title = PROTOCOL_TYPE_LABELS[protocolType]

  function handleClose() {
    setStep(1); setRationale(''); setDecision('approved'); setFile(null); setDragActive(false); setError(null)
    onClose()
  }

  function pickFile(f: File) {
    if (f.size > MAX_FILE_SIZE) {
      setError(`הקובץ ${f.name} חורג מ-25MB`)
      return
    }
    setFile(f)
    setError(null)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragActive(false)
    const f = e.dataTransfer.files?.[0]
    if (f) pickFile(f)
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)

    // 1. העלאת הקובץ ל-storage (אם הועלה) — לפני יצירת הפרוטוקול כדי שיהיה לנו file_ref.
    let fileRef: string | null = null
    if (file) {
      const safeName = safeFileName(file.name)
      const path = `${tenderId}/protocol-${protocolType}-${Date.now()}-${safeName}`
      const { error: upErr } = await supabase.storage
        .from('tender-documents')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (upErr) {
        setSubmitting(false)
        setError(`כשל בהעלאת הקובץ: ${upErr.message}`)
        return
      }
      fileRef = path
    }

    // 2. יצירת רשומת הפרוטוקול עם file_ref
    const { data: protocolRow, error: err } = await supabase
      .from('tender_protocols')
      .insert({
        tender_id: tenderId,
        protocol_type: protocolType,
        decision,
        rationale: rationale.trim() || null,
        signed_at: signedNow ? new Date().toISOString() : null,
        file_ref: fileRef,
      })
      .select('id')
      .single()
    if (err) {
      setSubmitting(false)
      setError(err.message)
      return
    }

    // 3. אם הועלה קובץ — רישום מקביל ב-tender_documents כדי שיופיע בארכיון
    if (file && fileRef) {
      const { error: docErr } = await supabase
        .from('tender_documents')
        .insert({
          tender_id: tenderId,
          doc_type: 'committee_protocol',
          title: file.name,
          file_ref: fileRef,
          file_size_bytes: file.size,
          mime_type: file.type || 'application/octet-stream',
          metadata: { protocol_id: protocolRow.id, protocol_type: protocolType, source: 'committee_protocol_modal' },
        })
      if (docErr) {
        // הפרוטוקול נוצר בהצלחה — נציג אזהרה אבל לא נכשל
        console.warn(`Protocol saved but document index failed: ${docErr.message}`)
      }
    }

    setSubmitting(false)
    onSubmitted()
    handleClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      <StepDots total={3} current={step} label={
        step === 1 ? 'נימוקים ורקע' : step === 2 ? 'החלטה' : 'חתימה'
      } />

      {step === 1 && (
        <>
          <div className={s.formGroup}>
            <label className={s.label}>נימוקים ורקע</label>
            <textarea
              className={s.textarea}
              value={rationale}
              onChange={e => setRationale(e.target.value)}
              placeholder="רקע לבקשה, הצדקה לסכום, נימוקי הבחירה"
              rows={6}
            />
            <div className={s.hint}>תיעוד הנימוקים חיוני — זהו ההסבר הפורמלי שמלווה את החלטת הוועדה.</div>
          </div>
          <div className={s.foot}>
            <button className={`${s.btn} ${s.btnSecondary}`} onClick={handleClose}>ביטול</button>
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setStep(2)}>המשך</button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className={s.formGroup}>
            <label className={s.label}>החלטת הוועדה</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                type="button"
                className={`${s.btn} ${decision === 'approved' ? s.btnSuccess : s.btnSecondary}`}
                onClick={() => setDecision('approved')}
              >✓ אושר</button>
              <button
                type="button"
                className={`${s.btn} ${decision === 'returned_for_correction' ? s.btnPrimary : s.btnSecondary}`}
                onClick={() => setDecision('returned_for_correction')}
              >↩ החזרה לתיקון</button>
              <button
                type="button"
                className={`${s.btn} ${decision === 'completion_required' ? s.btnPrimary : s.btnSecondary}`}
                onClick={() => setDecision('completion_required')}
              >📝 השלמה</button>
              <button
                type="button"
                className={`${s.btn} ${decision === 'rejected' ? s.btnDanger : s.btnSecondary}`}
                onClick={() => setDecision('rejected')}
              >✗ נדחה</button>
            </div>
          </div>
          {decision === 'approved' && (
            <div className={s.info}>החלטה זו תאפשר את המעבר לשלב הבא בהליך.</div>
          )}
          {decision !== 'approved' && (
            <div className={s.warn}>החלטה זו לא תעביר את ההליך לשלב הבא. יידרש פרוטוקול נוסף לאחר התיקון.</div>
          )}
          <div className={s.foot}>
            <button className={`${s.btn} ${s.btnSecondary}`} onClick={() => setStep(1)}>חזור</button>
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setStep(3)}>המשך</button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className={s.summary}>
            <div><strong>סוג פרוטוקול:</strong> {title}</div>
            <div><strong>החלטה:</strong> {DECISION_LABELS[decision]}</div>
            <div><strong>נימוקים:</strong> {rationale || '(ריק)'}</div>
          </div>
          <div className={s.formGroup}>
            <label className={s.label}>קובץ הפרוטוקול <span style={{ fontWeight: 400, color: 'var(--text3)' }}>(אופציונלי)</span></label>
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
              <div className={s.fileDropText}>
                {file ? 'לחץ או גרור כדי להחליף' : 'גרור או לחץ להעלאת הפרוטוקול החתום'}
              </div>
              <div className={s.fileDropHint}>PDF, Word, תמונה · עד 25MB</div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); if (fileInputRef.current) fileInputRef.current.value = '' }}
              style={{ display: 'none' }}
            />
            {file && (
              <div className={s.fileList} style={{ marginTop: 8 }}>
                <div className={s.fileItem}>
                  <span className={s.fileItemIcon}>📄</span>
                  <span className={s.fileItemName} title={file.name}>{file.name}</span>
                  <span className={s.fileItemSize}>{formatBytes(file.size)}</span>
                  <button
                    type="button"
                    className={s.fileItemRemove}
                    onClick={e => { e.stopPropagation(); setFile(null) }}
                    aria-label="הסר קובץ"
                  >×</button>
                </div>
              </div>
            )}
            <div className={s.hint}>הקובץ ייכנס לארכיון ההליך תחת "פרוטוקול ועדה".</div>
          </div>
          <div className={s.formGroup}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={signedNow}
                onChange={e => setSignedNow(e.target.checked)}
              />
              <span style={{ fontSize: 13 }}>סמן כפרוטוקול חתום במעמד זה</span>
            </label>
          </div>
          {error && <div className={s.error}>{error}</div>}
          <div className={s.foot}>
            <button className={`${s.btn} ${s.btnSecondary}`} onClick={() => setStep(2)}>חזור</button>
            <button className={`${s.btn} ${s.btnPrimary}`} disabled={submitting} onClick={handleSubmit}>
              {submitting ? 'שומר…' : 'שמור פרוטוקול'}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
