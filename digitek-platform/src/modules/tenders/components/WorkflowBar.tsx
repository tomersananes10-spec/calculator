import { getStage } from '../data/stagesBaseline'
import type { StageRequirementsResult } from '../data/stageRequirements'
import type { Tender } from '../types'
import styles from './WorkflowBar.module.css'

interface Props {
  tender: Tender
  requirements: StageRequirementsResult
  onAdvance: () => void
}

function nextActionLabel(req: StageRequirementsResult): string {
  if (req.canAdvance && req.nextStage) {
    const def = getStage(req.nextStage)
    return def ? `המשך לשלב ${def.stageNumber}. ${def.label}` : 'המשך לשלב הבא'
  }
  if (req.pending.length > 0) {
    return `נדרש: ${req.pending[0].label}`
  }
  return 'אין פעולות פתוחות'
}

export function WorkflowBar({ tender, requirements, onAdvance }: Props) {
  const stageDef = getStage(tender.current_stage)
  const isTerminal = tender.current_stage === 'closed' || tender.current_stage === 'cancelled'
  const inGate = requirements.blockingPending.length > 0 && requirements.total > 0

  let mode = ''
  if (isTerminal) mode = styles.terminal
  else if (inGate) mode = styles.gate

  return (
    <div className={`${styles.bar} ${mode}`}>
      <div className={styles.left}>
        <div className={styles.stage}>
          📍 שלב נוכחי: {stageDef ? `${stageDef.stageNumber}. ${stageDef.label}` : tender.current_stage}
        </div>
        <div className={styles.action}>
          {isTerminal
            ? tender.current_stage === 'closed' ? 'ההליך הסתיים בהצלחה' : 'ההליך בוטל'
            : nextActionLabel(requirements)
          }
        </div>
        {!isTerminal && requirements.total > 0 && (
          <div className={styles.meta}>
            דרישות פתוחות: <strong>{requirements.pending.length}</strong> מתוך {requirements.total}
            {tender.planned_go_live_date && (
              <> · יעד Go-Live: <strong>{new Date(tender.planned_go_live_date).toLocaleDateString('he-IL')}</strong></>
            )}
          </div>
        )}
        {!isTerminal && requirements.total > 0 && (
          <div className={styles.progress}>
            <div className={styles.progressFill} style={{ width: `${requirements.progressPct}%` }} />
          </div>
        )}
      </div>
      {!isTerminal && (
        <div className={styles.right}>
          <button
            className={styles.btn}
            disabled={!requirements.canAdvance}
            onClick={onAdvance}
            title={requirements.canAdvance ? undefined : 'יש להשלים את כל דרישות החובה'}
          >
            {requirements.canAdvance ? 'המשך לפעולה ←' : 'דרישות פתוחות'}
          </button>
        </div>
      )}
    </div>
  )
}
