import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import type { TenderDocument } from '../types'
import {
  DOC_TYPE_ORDER,
  docTypeLabel,
  docTypeIcon,
  groupDocumentsByType,
  type DocTypeGroup,
} from '../lib/documentGrouping'
import styles from './DocumentArchive.module.css'

interface Props {
  open: boolean
  onClose: () => void
  documents: TenderDocument[]
  tenderTitle?: string
}

function formatBytes(b: number | null | undefined): string {
  if (!b) return ''
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })
}

function versionStatus(d: TenderDocument): string | null {
  const v = (d.metadata as Record<string, unknown> | null)?.version_status
  return typeof v === 'string' ? v : null
}

function uploadedByEmail(d: TenderDocument): string | null {
  const v = (d.metadata as Record<string, unknown> | null)?.uploaded_by_email
  return typeof v === 'string' ? v : null
}

interface DownloadBtnProps { doc: TenderDocument }
function DownloadBtn({ doc }: DownloadBtnProps) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    async function fetchUrl() {
      if (!doc.file_ref) return
      const { data } = await supabase.storage
        .from('tender-documents')
        .createSignedUrl(doc.file_ref, 3600)
      if (!cancelled && data?.signedUrl) setUrl(data.signedUrl)
    }
    void fetchUrl()
    return () => { cancelled = true }
  }, [doc.file_ref])

  return (
    <a
      href={url ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.download}
      onClick={e => { if (!url) e.preventDefault() }}
    >
      ⬇ הורד
    </a>
  )
}

interface VersionRowProps {
  doc: TenderDocument
  isLatestInGroup: boolean
}
function VersionRow({ doc, isLatestInGroup }: VersionRowProps) {
  const vStatus = versionStatus(doc)
  const email = uploadedByEmail(doc)

  // Visual state — only the latest version is "current"; older are superseded.
  // If latest is in revision_requested, mark it amber (visual cue).
  const isRevision = vStatus === 'revision_requested' && isLatestInGroup
  const rowClass = isRevision ? styles.revision : isLatestInGroup ? styles.current : ''

  let pill: { label: string; cls: string } = isLatestInGroup
    ? { label: '✓ עדכני', cls: styles.pillCurrent }
    : { label: 'גרסה ישנה', cls: styles.pillSuperseded }

  if (vStatus === 'revision_requested') pill = { label: '↩ התבקש שינוי', cls: styles.pillRevision }
  else if (vStatus === 'pending_review' && isLatestInGroup) pill = { label: 'ממתין לבדיקה', cls: styles.pillPending }
  else if (vStatus === 'approved') pill = { label: '✓ אושר', cls: styles.pillCurrent }
  else if (vStatus === 'rejected') pill = { label: '❌ נדחה', cls: styles.pillRejected }

  const versionLabel = doc.version != null ? `v${doc.version}` : 'v1'

  return (
    <div className={`${styles.versionRow} ${rowClass}`}>
      <div className={styles.verBadge}>{versionLabel}</div>
      <div className={styles.vInfo}>
        <div className={styles.vName} title={doc.title}>{doc.title}</div>
        <div className={styles.vMeta}>
          {email && <span className={styles.vMetaItem}>{email}</span>}
          <span className={styles.vMetaItem}>{formatDateTime(doc.created_at)}</span>
          {doc.file_size_bytes != null && (
            <span className={styles.vMetaItem}>{formatBytes(doc.file_size_bytes)}</span>
          )}
        </div>
      </div>
      <span className={`${styles.pill} ${pill.cls}`}>{pill.label}</span>
      <DownloadBtn doc={doc} />
    </div>
  )
}

export function DocumentArchive({ open, onClose, documents, tenderTitle }: Props) {
  const groups = groupDocumentsByType(documents)
  const groupMap = new Map<string, DocTypeGroup>()
  for (const g of groups) groupMap.set(g.docType, g)

  // ברירת מחדל: הקבוצה הראשונה שיש בה תוכן (לפי DOC_TYPE_ORDER).
  const firstWithContent = groups[0]?.docType ?? null
  const [selected, setSelected] = useState<string | null>(firstWithContent)

  useEffect(() => {
    if (open) setSelected(firstWithContent)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, firstWithContent])

  // ESC לסגירה
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const totalDocs = documents.length
  const totalVersions = documents.length

  // קבוצות ריקות — לפי DOC_TYPE_ORDER, כל סוג שלא הופיע
  const presentTypes = new Set(groups.map(g => g.docType))
  const emptyTypes = DOC_TYPE_ORDER.filter(t => !presentTypes.has(t))

  const selectedGroup = selected ? groupMap.get(selected) : null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.head}>
          <div>
            <div className={styles.headTitle}>📚 תיקיית מסמכי ההליך</div>
            <div className={styles.headSub}>
              {tenderTitle ? `${tenderTitle} · ` : ''}
              {totalDocs} מסמכים · {totalVersions} גרסאות
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="סגור">✕</button>
        </div>

        <div className={styles.body}>
          {/* Sidebar — סוגי המסמכים */}
          <div className={styles.side}>
            {groups.map(g => (
              <div
                key={g.docType}
                className={`${styles.sideItem} ${selected === g.docType ? styles.active : ''}`}
                onClick={() => setSelected(g.docType)}
              >
                <div className={styles.sideItemLabel}>
                  <span>{docTypeIcon(g.docType)}</span>
                  <span>{docTypeLabel(g.docType)}</span>
                </div>
                <span className={styles.sideCount}>{g.documents.length}</span>
              </div>
            ))}

            {emptyTypes.length > 0 && groups.length > 0 && <div className={styles.sideDivider} />}

            {emptyTypes.map(t => (
              <div key={t} className={`${styles.sideItem} ${styles.empty}`}>
                <div className={styles.sideItemLabel}>
                  <span style={{ opacity: 0.5 }}>{docTypeIcon(t)}</span>
                  <span>{docTypeLabel(t)}</span>
                </div>
                <span className={styles.sideCount}>0</span>
              </div>
            ))}
          </div>

          {/* Main — גרסאות של הסוג הנבחר */}
          <div className={styles.main}>
            {!selectedGroup && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📭</div>
                <div>אין עדיין מסמכים להליך זה.</div>
                <div style={{ fontSize: 12.5, marginTop: 6 }}>
                  מסמכים יתווספו אוטומטית כשתבקש אישורים ותעלה גרסאות.
                </div>
              </div>
            )}

            {selectedGroup && (
              <>
                <div className={styles.mainHead}>
                  <div className={styles.mainTitle}>
                    {docTypeIcon(selectedGroup.docType)} {docTypeLabel(selectedGroup.docType)}
                  </div>
                  <div className={styles.mainSub}>
                    {selectedGroup.documents.length === 1 ? 'גרסה יחידה' : `${selectedGroup.documents.length} גרסאות · החדשה בראש`}
                  </div>
                </div>

                {selectedGroup.documents.map((doc, idx) => (
                  <VersionRow
                    key={doc.id}
                    doc={doc}
                    isLatestInGroup={idx === 0}
                  />
                ))}
              </>
            )}
          </div>
        </div>

        <div className={styles.foot}>
          <span>💡 הארכיון מציג את כל המסמכים שהועלו להליך, לפי סוג. הגרסה האחרונה היא תמיד בראש כל קטגוריה.</span>
        </div>
      </div>
    </div>
  )
}
