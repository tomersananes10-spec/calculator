import { useState } from 'react'
import { STAGE_REQUIREMENTS, isRequirementDone, type ActionId, type RequirementStatus, type StageRequirement } from '../data/stageRequirements'
import { getStage } from '../data/stagesBaseline'
import type { TenderDetailData } from '../hooks/useTender'
import type { DocumentType, TenderApprovalRequest } from '../types'
import { RequirementDetailPanel } from './RequirementDetailPanel'
import styles from './StageRequirementsTab.module.css'

// דרישות מבוססות-העלאה: ה-id של ה-requirement → doc_type ב-DB.
// כשהדרישה מסומנת כ"הושלם" — נציג את שם הקובץ והתאריך במקום ההסבר הסטטי.
const UPLOAD_REQ_DOC_TYPE: Record<string, DocumentType> = {
  brief_uploaded: 'brief',
  initial_protocol_uploaded: 'protocol_initial',
  winner_protocol_uploaded: 'winner_protocol',
}

function relativeDate(iso: string): string {
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const days = Math.floor(diffMs / 86_400_000)
  if (days < 1) return 'היום'
  if (days === 1) return 'אתמול'
  if (days < 7) return `לפני ${days} ימים`
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

interface Props {
  detail: TenderDetailData
  onAction: (action: ActionId) => void
  onRefresh?: () => void | Promise<void>
  onResubmit?: (request: TenderApprovalRequest) => void
}

const ACTION_BUTTON_LABEL: Record<ActionId, string> = {
  create_budget_approval: 'בקש אישור תקציבי',
  set_tender_number: 'הזן מספר תיחור',
  create_olma_approval: 'בקש אישור מינהל הרכש',
  create_committee_outbound_protocol: 'הכן פרוטוקול ועדה',
  create_professional_review: 'בקש בדיקת גורם מקצועי',
  create_committee_winner_protocol: 'הכן פרוטוקול זכיה',
  distribute_to_vendors: 'הפץ לספקים',
  register_proposal: 'רשום הצעה',
  select_winner: 'בחר זוכה',
  draft_contract: 'צור חוזה',
  verify_guarantee: 'אמת ערבות',
  verify_insurance: 'אמת ביטוח',
  sign_contract_internal: 'חתום פנימית',
  create_purchase_order: 'הקם PO',
  create_milestone: 'הגדר אבן דרך',
  approve_milestone: 'אשר אבן דרך',
  approve_invoice: 'אשר חשבונית',
  evaluate_vendor: 'הערך ספק',
  advance_stage: 'המשך לשלב הבא',
}

function statusPillFor(state: RequirementStatus['state']) {
  switch (state) {
    case 'satisfied':
    case 'approved':
      return { label: '✓ הושלם', className: styles.statusDone }
    case 'awaiting':
      return { label: 'ממתין למאשר', className: styles.statusAwaiting }
    case 'returned':
      return { label: '↩ הוחזר לתיקונים', className: styles.statusReturned }
    case 'rejected':
      return { label: '❌ נדחה', className: styles.statusRejected }
    case 'not_started':
    default:
      return { label: 'ממתין', className: styles.statusPending }
  }
}

/**
 * מחזיר תוכן UI לשורת ה-summary כשהדרישה הושלמה.
 * - לדרישות העלאה: מחפש את הקובץ האחרון מהסוג המתאים ומציג שם + תאריך
 * - אחרת: "הושלם בהצלחה" כללי
 */
function satisfiedSummaryEl(req: StageRequirement, detail: TenderDetailData): React.ReactNode {
  const docType = UPLOAD_REQ_DOC_TYPE[req.id]
  if (docType) {
    const latest = detail.documents
      .filter(d => d.doc_type === docType)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
    if (latest) {
      return (
        <>
          <span>📄</span>
          <span className={styles.descriptionDoneFile}>{latest.title}</span>
          <span>· הועלה {relativeDate(latest.created_at)}</span>
        </>
      )
    }
  }
  return <span>✓ הושלם בהצלחה</span>
}

function summaryFor(status: RequirementStatus, fallbackDescription?: string): string | null {
  if (status.state === 'awaiting') {
    const meta = status.request.metadata as Record<string, unknown>
    const recipients = Array.isArray(meta?.recipients) ? meta.recipients as string[] : []
    const firstRecipient = recipients[0]
    const date = new Date(status.request.created_at)
    const days = Math.floor((Date.now() - date.getTime()) / 86_400_000)
    const dayLabel = days < 1 ? 'היום' : days === 1 ? 'אתמול' : `לפני ${days} ימים`
    const recipientText = firstRecipient
      ? `נשלחה ל-${firstRecipient}${recipients.length > 1 ? ` (+${recipients.length - 1})` : ''}`
      : `נשלחה ל${status.request.requested_role ?? 'מאשר'}`
    return `${recipientText} · ${dayLabel}`
  }
  if (status.state === 'approved' && status.request.decided_at) {
    const sig = (status.request.metadata as Record<string, unknown>)?.signature_name
    const sigStr = typeof sig === 'string' ? ` ע״י ${sig}` : ''
    return `אושרה${sigStr} · ${new Date(status.request.decided_at).toLocaleDateString('he-IL')}`
  }
  if (status.state === 'rejected' && status.request.decided_at) {
    const sig = (status.request.metadata as Record<string, unknown>)?.signature_name
    const sigStr = typeof sig === 'string' ? ` ע״י ${sig}` : ''
    return `נדחתה${sigStr} · ${new Date(status.request.decided_at).toLocaleDateString('he-IL')}`
  }
  if (status.state === 'returned' && status.request.decided_at) {
    const sig = (status.request.metadata as Record<string, unknown>)?.signature_name
    const sigStr = typeof sig === 'string' ? ` ע״י ${sig}` : ''
    return `הוחזרה לתיקונים${sigStr} · ${new Date(status.request.decided_at).toLocaleDateString('he-IL')}`
  }
  return fallbackDescription ?? null
}

export function StageRequirementsTab({ detail, onAction, onRefresh, onResubmit }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const tender = detail.tender
  if (!tender) return null

  const def = STAGE_REQUIREMENTS[tender.current_stage]
  if (!def) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyOk}>אין דרישות מובנות לשלב זה</div>
        <div>פעולות בשלב {tender.current_stage} יתווספו בפאזות הבאות</div>
      </div>
    )
  }

  // האם כל הדרישות הושלמו? (או שאין דרישות כלל). אם כן — מציגים CTA למעבר לשלב הבא.
  const allDone = def.requirements.every(r => isRequirementDone(r.getStatus(detail)))
  const nextStageDef = getStage(def.nextStage)

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>דרישות לסיום השלב הנוכחי</div>

      {def.requirements.length === 0 && (
        <div className={styles.advanceEmptyState}>
          <div className={styles.advanceEmptyIcon}>✓</div>
          <div className={styles.advanceEmptyTitle}>אין דרישות לשלב הזה</div>
          <div className={styles.advanceEmptyText}>
            השלב המקדים הוא חד-פעמי. ניתן להמשיך ישירות לשלב הבא.
          </div>
        </div>
      )}

      {def.requirements.map(req => {
        const status = req.getStatus(detail)
        const done = isRequirementDone(status)
        const isBlocker = req.blocker !== false && !done
        const isExpanded = expandedId === req.id
        const canExpand =
          status.state === 'awaiting' || status.state === 'approved' || status.state === 'rejected' || status.state === 'returned'

        const pill = statusPillFor(status.state)
        const summary = summaryFor(status, req.description)
        const stateClass =
          status.state === 'awaiting' ? styles.awaiting
          : status.state === 'returned' ? styles.returned
          : status.state === 'rejected' ? styles.rejected
          : done ? styles.done
          : isBlocker ? styles.blocker
          : ''

        // Determine action button per state
        let actionEl: React.ReactNode = null
        if (status.state === 'not_started' && req.action) {
          actionEl = (
            <button
              className={styles.actionBtn}
              onClick={(e) => { e.stopPropagation(); onAction(req.action!) }}
            >
              {ACTION_BUTTON_LABEL[req.action]}
            </button>
          )
        } else if (status.state === 'rejected' && req.action) {
          actionEl = (
            <button
              className={styles.actionBtn}
              onClick={(e) => { e.stopPropagation(); onAction(req.action!) }}
            >
              פתח בקשה חדשה
            </button>
          )
        }

        return (
          <div key={req.id} className={`${styles.req} ${stateClass} ${isExpanded ? styles.expanded : ''}`}>
            <div
              className={`${styles.reqRow} ${canExpand ? styles.clickable : ''}`}
              onClick={() => canExpand && setExpandedId(isExpanded ? null : req.id)}
              role={canExpand ? 'button' : undefined}
              tabIndex={canExpand ? 0 : undefined}
              onKeyDown={canExpand ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setExpandedId(isExpanded ? null : req.id)
                }
              } : undefined}
            >
              <div className={`${styles.status} ${pill.className}`}>{pill.label}</div>
              <div className={styles.body}>
                <div className={`${styles.label} ${done ? styles.done : ''}`}>{req.label}</div>
                {done ? (
                  <div className={styles.descriptionDone}>{satisfiedSummaryEl(req, detail)}</div>
                ) : (
                  summary && <div className={styles.description}>{summary}</div>
                )}
              </div>
              {actionEl}
              {canExpand && (
                <div className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ''}`} aria-hidden="true">
                  ▾
                </div>
              )}
            </div>
            {isExpanded && canExpand && (
              <RequirementDetailPanel status={status} detail={detail} onRefresh={onRefresh} onResubmit={onResubmit} />
            )}
          </div>
        )
      })}

      {allDone && nextStageDef && (
        <button
          type="button"
          className={styles.advanceBtn}
          onClick={() => onAction('advance_stage')}
        >
          <span>המשך לשלב הבא</span>
          <span className={styles.advanceBtnNext}>{nextStageDef.label}</span>
          <span className={styles.advanceBtnArrow}>←</span>
        </button>
      )}
    </div>
  )
}
