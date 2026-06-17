import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import type { TenderDetailData } from '../hooks/useTender'
import type { TenderApprovalRequest, TenderDocument } from '../types'
import type { RequirementStatus } from '../data/stageRequirements'
import { InlineApprovalForm } from './InlineApprovalForm'
import { DocumentVersionsTable } from './DocumentVersionsTable'
import styles from './StageRequirementsTab.module.css'

interface Props {
  status: RequirementStatus
  detail: TenderDetailData
  onRefresh?: () => void | Promise<void>
  onResubmit?: (request: TenderApprovalRequest) => void
}

function formatBytes(b: number | null | undefined) {
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
  if (days < 30) return `לפני ${days} ימים`
  return new Date(iso).toLocaleDateString('he-IL')
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })
}

function getRecipients(request: TenderApprovalRequest): string[] {
  const rec = request.metadata?.recipients
  if (Array.isArray(rec)) return rec.filter((r): r is string => typeof r === 'string')
  return []
}

function getRequestBody(request: TenderApprovalRequest): string {
  const body = request.metadata?.body
  return typeof body === 'string' ? body : ''
}

function getAmount(request: TenderApprovalRequest): number | null {
  const amt = (request.metadata as Record<string, unknown>)?.amount
  if (typeof amt === 'number') return amt
  return null
}

function getSignatureName(request: TenderApprovalRequest): string | null {
  const sig = (request.metadata as Record<string, unknown>)?.signature_name
  return typeof sig === 'string' && sig.trim() ? sig : null
}

function getDecidedRecipient(request: TenderApprovalRequest): string | null {
  const r = (request.metadata as Record<string, unknown>)?.decided_recipient
  return typeof r === 'string' && r.trim() ? r : null
}

function findRequestDocuments(detail: TenderDetailData, requestId: string): TenderDocument[] {
  return detail.documents.filter(d => {
    const meta = d.metadata as Record<string, unknown> | undefined
    return meta?.approval_request_id === requestId
  })
}

function AttachmentLink({ doc }: { doc: TenderDocument }) {
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
      className={styles.attachmentLink}
      onClick={e => { if (!url) e.preventDefault() }}
    >
      <span className={styles.attachmentName}>📎 {doc.title}</span>
      <span className={styles.attachmentSize}>{formatBytes(doc.file_size_bytes)}</span>
    </a>
  )
}

export function RequirementDetailPanel({ status, detail, onRefresh, onResubmit }: Props) {
  const [currentEmail, setCurrentEmail] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setCurrentEmail(data?.user?.email?.toLowerCase() ?? null)
    })
    return () => { cancelled = true }
  }, [])

  if (status.state === 'not_started' || status.state === 'satisfied') {
    return null
  }

  const request = status.request
  const recipients = getRecipients(request)
  const body = getRequestBody(request)
  const amount = getAmount(request)
  const attachments = findRequestDocuments(detail, request.id)

  const isAwaiting = status.state === 'awaiting'
  const isApproved = status.state === 'approved'
  const isRejected = status.state === 'rejected'
  const isReturned = status.state === 'returned'

  // האם המשתמש המחובר הוא נמען של הבקשה? אם כן — נציג לו טופס פעולה.
  const isRecipient = !!currentEmail && recipients.some(r => r.toLowerCase() === currentEmail)

  // אם הגרסה האחרונה נמצאת במצב "התבקש שינוי", אסור לאשר עד שהוגשה גרסה חדשה.
  const latestVersion = attachments
    .slice()
    .sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0]
  const latestStatusRaw = (latestVersion?.metadata as Record<string, unknown> | undefined)?.version_status
  const isWaitingForNewVersion = latestStatusRaw === 'revision_requested'

  return (
    <div className={styles.detailPanel}>
      {/* AWAITING — מי, מתי, מסמכים */}
      {isAwaiting && (
        <>
          <div className={styles.detailGrid}>
            {recipients.length > 0 && (
              <>
                <div className={styles.detailLabel}>נשלחה ל</div>
                <div className={styles.detailValue}>
                  {recipients.map((r, i) => (
                    <span key={r} className={styles.emailChip}>
                      {r}
                      {i < recipients.length - 1 && <span style={{ color: 'var(--text3)' }}> · </span>}
                    </span>
                  ))}
                </div>
              </>
            )}

            {request.requested_role && (
              <>
                <div className={styles.detailLabel}>תפקיד מאשר</div>
                <div className={styles.detailValue}>{request.requested_role}</div>
              </>
            )}

            <div className={styles.detailLabel}>נשלחה</div>
            <div className={styles.detailValue}>
              {timeAgo(request.created_at)}
              <span style={{ color: 'var(--text3)', marginInlineStart: 8 }}>
                · {formatDateTime(request.created_at)}
              </span>
            </div>

            {amount != null && (
              <>
                <div className={styles.detailLabel}>סכום מבוקש</div>
                <div className={styles.detailValue}>
                  {new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount)}
                </div>
              </>
            )}
          </div>

          {body && (
            <div className={styles.detailSection}>
              <div className={styles.detailLabel}>גוף הבקשה</div>
              <div className={styles.detailBody}>{body}</div>
            </div>
          )}

          <div className={styles.detailSection}>
            <DocumentVersionsTable
              requestId={request.id}
              tenderId={detail.tender?.id ?? request.tender_id}
              documents={detail.documents}
              isRecipient={isRecipient}
              canUpload={true /* RLS enforces server-side; UI surfaces upload only when allowed */}
              currentUserEmail={currentEmail}
              onRefresh={onRefresh}
            />
          </div>

          {isRecipient && !isWaitingForNewVersion && (
            <InlineApprovalForm
              request={request}
              tenderId={detail.tender?.id ?? request.tender_id}
              onDecided={() => { if (onRefresh) void onRefresh() }}
            />
          )}
          {isRecipient && isWaitingForNewVersion && (
            <div className={styles.detailHighlight}>
              ⏳ ביקשת שינוי בגרסה {latestVersion?.version}. ממתינים להעלאת גרסה חדשה.
            </div>
          )}
          {!isRecipient && (
            <div className={styles.detailHighlight}>
              🔒 רק <strong>{request.requested_role ?? 'המאשר'}</strong> יכול להחליט.
              אתה רואה כאן את הסטטוס בלבד עד שתתקבל החלטה.
            </div>
          )}
        </>
      )}

      {/* APPROVED / REJECTED / RETURNED — תיעוד החלטה */}
      {(isApproved || isRejected || isReturned) && (
        <>
          <div className={styles.detailGrid}>
            <div className={styles.detailLabel}>החלטה</div>
            <div className={styles.detailValue}>
              {isApproved && <span style={{ color: 'var(--green)', fontWeight: 700 }}>✓ אושרה</span>}
              {isRejected && <span style={{ color: 'var(--red)', fontWeight: 700 }}>❌ נדחתה</span>}
              {isReturned && <span style={{ color: 'var(--amber)', fontWeight: 700 }}>↩ הוחזרה לתיקונים</span>}
            </div>

            {getSignatureName(request) && (
              <>
                <div className={styles.detailLabel}>חתימה</div>
                <div className={styles.detailValue}>{getSignatureName(request)}</div>
              </>
            )}

            {getDecidedRecipient(request) && (
              <>
                <div className={styles.detailLabel}>אימייל החותם</div>
                <div className={styles.detailValue}>
                  <span className={styles.emailChip}>{getDecidedRecipient(request)}</span>
                </div>
              </>
            )}

            {request.decided_at && (
              <>
                <div className={styles.detailLabel}>תאריך החלטה</div>
                <div className={styles.detailValue}>{formatDateTime(request.decided_at)}</div>
              </>
            )}

            {request.comments && (
              <>
                <div className={styles.detailLabel}>הערות החותם</div>
                <div className={styles.detailValue} style={{ fontStyle: 'italic', color: 'var(--text2)' }}>
                  "{request.comments}"
                </div>
              </>
            )}
          </div>

          {body && (
            <div className={styles.detailSection}>
              <div className={styles.detailLabel}>גוף הבקשה המקורית</div>
              <div className={styles.detailBody}>{body}</div>
            </div>
          )}

          {attachments.length > 0 && (
            <div className={styles.detailSection}>
              <DocumentVersionsTable
                requestId={request.id}
                tenderId={detail.tender?.id ?? request.tender_id}
                documents={detail.documents}
                isRecipient={false /* request already decided — no actions */}
                canUpload={false /* request closed — no more uploads */}
                currentUserEmail={currentEmail}
                onRefresh={onRefresh}
              />
            </div>
          )}

          {isReturned && onResubmit && (
            <div className={styles.resubmitCta}>
              <div className={styles.resubmitText}>
                <strong>{request.requested_role ?? 'המאשר'}</strong> מבקש/ת תיקונים. תקן את הבקשה לפי ההערות שלמעלה ושלח שוב לחתימה.
              </div>
              <button
                type="button"
                className={styles.resubmitBtn}
                onClick={() => onResubmit(request)}
              >
                📤 שלח שוב לאחר תיקון
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
