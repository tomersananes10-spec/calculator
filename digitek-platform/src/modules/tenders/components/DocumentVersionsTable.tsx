import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import type { TenderDocument } from '../types'
import styles from './StageRequirementsTab.module.css'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ACCEPTED_TYPES = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg'

interface Props {
  requestId: string
  tenderId: string
  documents: TenderDocument[]
  isRecipient: boolean
  canUpload: boolean   // owner / admin / recipient — anyone authorised to upload a new version
  currentUserEmail: string | null
  onRefresh?: () => void | Promise<void>
}

type VersionStatus = 'pending_review' | 'revision_requested' | 'approved' | 'rejected' | 'superseded' | 'draft'

interface VersionRow {
  doc: TenderDocument
  status: VersionStatus
  uploaderEmail: string | null
  comment: string | null
  revisionComment: string | null
  revisionBy: string | null
}

const STATUS_LABEL: Record<VersionStatus, string> = {
  pending_review: 'ממתין לחתימה',
  revision_requested: 'התבקש שינוי',
  approved: '✓ אושר',
  rejected: '❌ נדחה',
  superseded: 'גרסה ישנה',
  draft: 'טיוטה',
}

const STATUS_CLASS: Record<VersionStatus, string> = {
  pending_review: styles.vstatusReview,
  revision_requested: styles.vstatusRevision,
  approved: styles.vstatusApproved,
  rejected: styles.vstatusRejected,
  superseded: styles.vstatusSuperseded,
  draft: styles.vstatusDraft,
}

function formatBytes(b: number | null | undefined): string {
  if (!b) return ''
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'הרגע'
  if (mins < 60) return `לפני ${mins} דק'`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `לפני ${hours} שעות`
  const days = Math.floor(hours / 24)
  if (days < 7) return `לפני ${days} ימים`
  return new Date(iso).toLocaleDateString('he-IL')
}

function readStatus(d: TenderDocument): VersionStatus {
  const m = d.metadata as Record<string, unknown> | undefined
  const s = m?.version_status
  if (typeof s === 'string' && ['pending_review', 'revision_requested', 'approved', 'rejected', 'superseded', 'draft'].includes(s)) {
    return s as VersionStatus
  }
  return 'pending_review'  // default for documents created before versioning was added
}

function readStr(d: TenderDocument, key: string): string | null {
  const m = d.metadata as Record<string, unknown> | undefined
  const v = m?.[key]
  return typeof v === 'string' && v.trim() ? v : null
}

function VersionDownloadLink({ path, label }: { path: string | null; label: string }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    async function go() {
      if (!path) return
      const { data } = await supabase.storage.from('tender-documents').createSignedUrl(path, 3600)
      if (!cancelled) setUrl(data?.signedUrl ?? null)
    }
    void go()
    return () => { cancelled = true }
  }, [path])
  return (
    <a
      href={url ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.vDownload}
      onClick={e => { if (!url) e.preventDefault() }}
    >
      {label}
    </a>
  )
}

export function DocumentVersionsTable({
  requestId, tenderId, documents, isRecipient, canUpload, onRefresh,
}: Props) {
  // Build version list: documents linked to this request_id, sorted DESC by version
  const versions: VersionRow[] = documents
    .filter(d => (d.metadata as Record<string, unknown> | undefined)?.approval_request_id === requestId)
    .sort((a, b) => (b.version ?? 0) - (a.version ?? 0))
    .map(d => ({
      doc: d,
      status: readStatus(d),
      uploaderEmail: readStr(d, 'uploaded_by_email'),
      comment: readStr(d, 'version_comment'),
      revisionComment: readStr(d, 'revision_comment'),
      revisionBy: readStr(d, 'revision_requested_by_email'),
    }))

  const [expandedId, setExpandedId] = useState<string | null>(versions[0]?.doc.id ?? null)
  const [revisionPanelId, setRevisionPanelId] = useState<string | null>(null)
  const [revisionComment, setRevisionComment] = useState('')
  const [revisionSubmitting, setRevisionSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Upload-new-version state
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadComment, setUploadComment] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadSubmitting, setUploadSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const latest = versions[0]
  const latestStatus = latest?.status
  // Allow upload when no versions exist yet (initial v1) OR latest is revision_requested.
  const canUploadNew =
    canUpload && (versions.length === 0 || latestStatus === 'revision_requested')

  async function submitRevision(docId: string) {
    if (!revisionComment.trim()) {
      setActionError('יש לפרט מה לשנות')
      return
    }
    setRevisionSubmitting(true)
    setActionError(null)
    const { error } = await supabase.rpc('tender_document_request_revision', {
      p_document_id: docId,
      p_comment: revisionComment.trim(),
    })
    setRevisionSubmitting(false)
    if (error) {
      setActionError(error.message)
      return
    }
    setRevisionPanelId(null)
    setRevisionComment('')
    if (onRefresh) void onRefresh()
  }

  async function submitNewVersion() {
    if (!uploadFile) {
      setActionError('יש לבחור קובץ')
      return
    }
    if (uploadFile.size > MAX_FILE_SIZE) {
      setActionError('הקובץ חורג מ-10MB')
      return
    }
    setUploadSubmitting(true)
    setActionError(null)

    const safeName = uploadFile.name.replace(/[^\w.\-א-ת ]/g, '_')
    const path = `${tenderId}/approval-${requestId}-v${(latest?.doc.version ?? 0) + 1}-${Date.now()}-${safeName}`
    const { error: upErr } = await supabase.storage
      .from('tender-documents')
      .upload(path, uploadFile, { contentType: uploadFile.type, upsert: false })
    if (upErr) {
      setUploadSubmitting(false)
      setActionError(`העלאת קובץ נכשלה: ${upErr.message}`)
      return
    }

    const { error: rpcErr } = await supabase.rpc('tender_document_upload_version', {
      p_request_id: requestId,
      p_parent_document_id: latest?.doc.id ?? null,
      p_title: uploadFile.name,
      p_file_ref: path,
      p_file_size_bytes: uploadFile.size,
      p_mime_type: uploadFile.type || 'application/octet-stream',
      p_comment: uploadComment.trim() || null,
    })
    setUploadSubmitting(false)
    if (rpcErr) {
      setActionError(rpcErr.message)
      return
    }
    setUploadOpen(false)
    setUploadFile(null)
    setUploadComment('')
    if (onRefresh) void onRefresh()
  }

  return (
    <div className={styles.vWrap}>
      <div className={styles.vHeader}>
        <span className={styles.vHeaderTitle}>📄 גרסאות המסמך</span>
        {versions.length > 0 && (
          <span className={styles.vHeaderCount}>{versions.length} {versions.length === 1 ? 'גרסה' : 'גרסאות'}</span>
        )}
      </div>

      {versions.length === 0 && (
        <div className={styles.vEmpty}>
          <div className={styles.vEmptyIcon}>📄</div>
          <div className={styles.vEmptyTitle}>אין מסמך מצורף לבקשה</div>
          <div className={styles.vEmptyText}>
            {canUpload
              ? 'תוכל להעלות את הגרסה הראשונה (v1) למטה.'
              : 'המעלה עדיין לא צירף את המסמך הראשון.'}
          </div>
        </div>
      )}

      {versions.length > 0 && (
      <table className={styles.vTable}>
        <thead>
          <tr>
            <th style={{ width: 60 }}>גרסה</th>
            <th>קובץ</th>
            <th style={{ width: 130 }}>מעלה</th>
            <th style={{ width: 100 }}>זמן</th>
            <th style={{ width: 130 }}>סטטוס</th>
            <th style={{ width: 36 }}></th>
          </tr>
        </thead>
        <tbody>
          {versions.map(v => {
            const isExpanded = expandedId === v.doc.id
            const isLatest = v.doc.id === latest?.doc.id
            return (
              <>
                <tr
                  key={v.doc.id}
                  className={`${isLatest ? styles.vRowCurrent : ''} ${styles.vRowClickable}`}
                  onClick={() => setExpandedId(isExpanded ? null : v.doc.id)}
                >
                  <td><strong>v{v.doc.version ?? '?'}</strong></td>
                  <td>
                    <span className={styles.vFileIcon}>📄</span>
                    <span className={styles.vFileName}>{v.doc.title}</span>
                    <span className={styles.vFileSize}> · {formatBytes(v.doc.file_size_bytes)}</span>
                  </td>
                  <td>
                    <span className={styles.vUploader}>{v.uploaderEmail ?? '—'}</span>
                  </td>
                  <td>
                    <span className={styles.vTime}>{timeAgo(v.doc.created_at)}</span>
                  </td>
                  <td>
                    <span className={`${styles.vstatus} ${STATUS_CLASS[v.status]}`}>{STATUS_LABEL[v.status]}</span>
                  </td>
                  <td>
                    <span className={`${styles.vChevron} ${isExpanded ? styles.vChevronOpen : ''}`}>▾</span>
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={`${v.doc.id}-expand`} className={styles.vRowExpand}>
                    <td colSpan={6}>
                      {v.comment && (
                        <div className={styles.vCommentBlock}>
                          <span className={styles.vCommentLabel}>הערת המעלה:</span>
                          <span> {v.comment}</span>
                        </div>
                      )}
                      {v.revisionComment && (
                        <div className={`${styles.vCommentBlock} ${styles.vCommentRevision}`}>
                          <span className={styles.vCommentLabel}>↩ בקשת שינוי{v.revisionBy ? ` (${v.revisionBy})` : ''}:</span>
                          <span> {v.revisionComment}</span>
                        </div>
                      )}
                      <div className={styles.vRowActions}>
                        <VersionDownloadLink path={v.doc.file_ref} label="📥 הורד גרסה" />

                        {/* Revision request flow — only on the latest pending_review version, by recipient */}
                        {isLatest && isRecipient && v.status === 'pending_review' && revisionPanelId !== v.doc.id && (
                          <button
                            className={`${styles.vBtn} ${styles.vBtnAmber}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              setRevisionPanelId(v.doc.id)
                              setActionError(null)
                            }}
                          >
                            ↩ בקש שינוי
                          </button>
                        )}
                      </div>

                      {revisionPanelId === v.doc.id && (
                        <div className={styles.vRevisionForm}>
                          <label className={styles.vRevisionLabel}>פרט מה לשנות *</label>
                          <textarea
                            className={styles.vRevisionTextarea}
                            value={revisionComment}
                            onChange={e => setRevisionComment(e.target.value)}
                            placeholder="לדוגמה: 'סעיף 3 דורש פירוט נוסף עם 2 תתי-סעיפים…'"
                          />
                          {actionError && <div className={styles.vError}>{actionError}</div>}
                          <div className={styles.vRowActions}>
                            <button
                              className={`${styles.vBtn} ${styles.vBtnAmber}`}
                              disabled={revisionSubmitting}
                              onClick={(e) => { e.stopPropagation(); void submitRevision(v.doc.id) }}
                            >
                              {revisionSubmitting ? 'שולח…' : 'שלח בקשת שינוי'}
                            </button>
                            <button
                              className={styles.vBtn}
                              onClick={(e) => { e.stopPropagation(); setRevisionPanelId(null); setRevisionComment('') }}
                            >
                              ביטול
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            )
          })}
        </tbody>
      </table>
      )}

      {/* Upload v1 (no versions yet) or new version (when latest is revision_requested) */}
      {canUploadNew && !uploadOpen && (
        <button
          className={`${styles.vBtn} ${styles.vBtnPrimary} ${styles.vUploadTrigger}`}
          onClick={() => setUploadOpen(true)}
        >
          {versions.length === 0
            ? '📤 העלה את המסמך (v1)'
            : `📤 העלה גרסה חדשה (v${(latest?.doc.version ?? 0) + 1})`}
        </button>
      )}

      {canUploadNew && uploadOpen && (
        <div className={styles.vUploadPanel}>
          <div className={styles.vUploadTitle}>העלאת גרסה v{(latest?.doc.version ?? 0) + 1}</div>

          <div
            className={styles.vUploadDrop}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault()
              if (e.dataTransfer.files?.[0]) setUploadFile(e.dataTransfer.files[0])
            }}
          >
            {uploadFile
              ? <span>📎 {uploadFile.name} · {formatBytes(uploadFile.size)}</span>
              : <span>לחץ או גרור קובץ · PDF / Word / Excel / תמונה · עד 10MB</span>}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={e => { if (e.target.files?.[0]) setUploadFile(e.target.files[0]) }}
            style={{ display: 'none' }}
          />

          <label className={styles.vRevisionLabel}>הערת המעלה (אופציונלי)</label>
          <textarea
            className={styles.vRevisionTextarea}
            value={uploadComment}
            onChange={e => setUploadComment(e.target.value)}
            placeholder="הסבר מה שונה בגרסה הזו…"
          />

          {actionError && <div className={styles.vError}>{actionError}</div>}

          <div className={styles.vRowActions}>
            <button
              className={`${styles.vBtn} ${styles.vBtnPrimary}`}
              disabled={uploadSubmitting || !uploadFile}
              onClick={() => void submitNewVersion()}
            >
              {uploadSubmitting ? 'מעלה…' : 'העלה גרסה'}
            </button>
            <button
              className={styles.vBtn}
              onClick={() => { setUploadOpen(false); setUploadFile(null); setUploadComment('') }}
            >
              ביטול
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
