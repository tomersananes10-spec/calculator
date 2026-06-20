import { useRef, useState } from 'react'
import { Modal, modalStyles as s } from '../Modal'
import { supabase } from '../../../../lib/supabase'
import { safeFileName } from '../../lib/safeFileName'
import type { DocumentType } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
  tenderId: string
  docType: DocumentType
  title: string
  /** הסבר קצר על המסמך — מוצג מעל ה-dropzone */
  description?: string
  onSubmitted: () => void
}

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

/**
 * Generic upload modal — משמש ל:
 * - T0: בריף + פרוטוקול ראשוני
 * - T5: פרוטוקול זכייה
 *
 * מטפל ב-storage upload + רשומת tender_documents.
 * עתידית — מודולי בריפים ופרוטוקולים יוכלו לבחור מ-DB במקום upload.
 */
export function UploadDocumentModal({ open, onClose, tenderId, docType, title, description, onSubmitted }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setFile(null)
    setNotes('')
    setError(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function pickFile(f: File | null) {
    if (!f) return
    if (f.size > MAX_FILE_SIZE) {
      setError(`קובץ גדול מדי (${(f.size / 1024 / 1024).toFixed(1)}MB). מקסימום 25MB.`)
      return
    }
    setError(null)
    setFile(f)
  }

  async function handleUpload() {
    if (!file) {
      setError('יש לבחור קובץ')
      return
    }
    setSubmitting(true)
    setError(null)

    const safeName = safeFileName(file.name)
    const path = `${tenderId}/${docType}-${Date.now()}-${safeName}`
    const { error: upErr } = await supabase.storage
      .from('tender-documents')
      .upload(path, file, { contentType: file.type, upsert: false })

    if (upErr) {
      setSubmitting(false)
      setError(`כשל בהעלאה: ${upErr.message}`)
      return
    }

    const { error: docErr } = await supabase
      .from('tender_documents')
      .insert({
        tender_id: tenderId,
        doc_type: docType,
        title: file.name,
        file_ref: path,
        file_size_bytes: file.size,
        mime_type: file.type || 'application/octet-stream',
        metadata: { source: 'upload_document_modal', notes: notes.trim() || null },
      })

    setSubmitting(false)
    if (docErr) {
      setError(`הקובץ הועלה ל-Storage אבל הרישום ב-DB נכשל: ${docErr.message}`)
      return
    }
    onSubmitted()
    handleClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      {description && <div className={s.info}>{description}</div>}

      <div
        className={`${s.fileDrop} ${file ? s.fileDropActive : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault()
          pickFile(e.dataTransfer.files[0] ?? null)
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
          style={{ display: 'none' }}
          onChange={e => pickFile(e.target.files?.[0] ?? null)}
        />
        <div className={s.fileDropIcon}>📎</div>
        <div className={s.fileDropText}>
          {file ? file.name : 'גרור קובץ או לחץ לבחירה'}
        </div>
        <div className={s.fileDropHint}>
          {file
            ? `${(file.size / 1024).toFixed(0)} KB`
            : 'PDF, Word, Excel, תמונות · עד 25MB'}
        </div>
      </div>

      <div className={s.formGroup} style={{ marginTop: 14 }}>
        <label className={s.label}>הערה / תיאור (אופציונלי)</label>
        <textarea
          className={s.textarea}
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="לדוגמה: בריף סופי לאחר הערות יועמ״ש"
        />
      </div>

      {error && <div className={s.error}>{error}</div>}

      <div className={s.foot}>
        <button className={`${s.btn} ${s.btnSecondary}`} onClick={handleClose}>ביטול</button>
        <button className={`${s.btn} ${s.btnPrimary}`} disabled={submitting || !file} onClick={handleUpload}>
          {submitting ? 'מעלה…' : '📤 העלה'}
        </button>
      </div>
    </Modal>
  )
}
