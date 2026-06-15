import { STAGES } from '../data/stagesBaseline'
import { shouldSkipStage } from '../data/gateways'
import type { Tender } from '../types'
import styles from './StageMap.module.css'

interface Props {
  tender: Tender
}

type State = 'done' | 'current' | 'future' | 'skipped' | 'terminal'

export function StageMap({ tender }: Props) {
  const currentIdx = STAGES.findIndex(s => s.code === tender.current_stage)
  const isTerminal = tender.current_stage === 'closed' || tender.current_stage === 'cancelled'

  return (
    <aside className={styles.map}>
      <div className={styles.title}>מפת תהליך</div>
      <div className={styles.list}>
        {STAGES.map((stage, idx) => {
          const skip = shouldSkipStage(stage.code, {
            amount: tender.estimated_amount,
            selection: tender.selection_type,
          })
          let state: State
          if (isTerminal) {
            state = idx <= currentIdx ? 'done' : 'future'
          } else if (skip.skip) {
            state = 'skipped'
          } else if (idx < currentIdx) {
            state = 'done'
          } else if (stage.code === tender.current_stage) {
            state = 'current'
          } else {
            state = 'future'
          }

          return (
            <div
              key={stage.code}
              className={`${styles.item} ${styles[state]}`}
              title={skip.skip ? skip.reason : undefined}
            >
              <span className={styles.dot} />
              <span className={styles.num}>{stage.stageNumber}.</span>
              <span>{stage.label}</span>
            </div>
          )
        })}
      </div>
      {isTerminal && (
        <div className={styles.footer}>
          {tender.current_stage === 'closed' ? '✓ ההליך נסגר' : '✗ ההליך בוטל'}
        </div>
      )}
    </aside>
  )
}
