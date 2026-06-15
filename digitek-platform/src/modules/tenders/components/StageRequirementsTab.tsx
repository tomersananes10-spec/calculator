import { STAGE_REQUIREMENTS, type ActionId } from '../data/stageRequirements'
import type { TenderDetailData } from '../hooks/useTender'
import styles from './StageRequirementsTab.module.css'

interface Props {
  detail: TenderDetailData
  onAction: (action: ActionId) => void
}

const ACTION_BUTTON_LABEL: Record<ActionId, string> = {
  create_budget_approval: 'בקש אישור תקציבי',
  set_tender_number: 'הזן מספר תיחור',
  create_olma_approval: 'בקש אישור אלמ"ה',
  create_committee_outbound_protocol: 'הכן פרוטוקול ועדה',
  create_professional_review: 'בקש בדיקת גורם מקצועי',
  create_committee_winner_protocol: 'הכן פרוטוקול זכיה',
  advance_stage: 'המשך לשלב הבא',
}

export function StageRequirementsTab({ detail, onAction }: Props) {
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

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>דרישות לסיום השלב הנוכחי</div>
      {def.requirements.map(req => {
        const done = req.check(detail)
        const cls = `${styles.req} ${done ? styles.done : ''} ${req.blocker !== false && !done ? styles.blocker : ''}`
        return (
          <div key={req.id} className={cls}>
            <div className={`${styles.status} ${done ? styles.statusDone : styles.statusPending}`}>
              {done ? '✓ הושלם' : 'ממתין'}
            </div>
            <div className={styles.body}>
              <div className={`${styles.label} ${done ? styles.done : ''}`}>{req.label}</div>
              {req.description && <div className={styles.description}>{req.description}</div>}
            </div>
            {!done && req.action && (
              <button className={styles.actionBtn} onClick={() => onAction(req.action!)}>
                {ACTION_BUTTON_LABEL[req.action]}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
