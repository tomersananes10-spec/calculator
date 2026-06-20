import { STAGES } from '../data/stagesBaseline'
import type { Tender, TenderStage } from '../types'
import styles from './StageMap.module.css'

interface Props {
  tender: Tender
}

type State = 'done' | 'current' | 'future' | 'terminal'

export function StageMap({ tender }: Props) {
  const currentIdx = STAGES.findIndex(s => s.code === tender.current_stage)
  const isTerminal = tender.current_stage === 'closed' || tender.current_stage === 'cancelled'

  function stageState(stageCode: TenderStage): State {
    const idx = STAGES.findIndex(s => s.code === stageCode)
    if (idx < 0) return 'future'
    if (isTerminal) return idx <= currentIdx ? 'done' : 'future'
    if (idx < currentIdx) return 'done'
    if (idx === currentIdx) return 'current'
    return 'future'
  }

  return (
    <aside className={styles.map}>
      <div className={styles.title}>מפת תהליך</div>
      <div className={styles.flatList}>
        {STAGES.map(stage => {
          const state = stageState(stage.code)
          return (
            <div key={stage.code} className={`${styles.item} ${styles[state]}`}>
              <span className={styles.num}>{stage.stageNumber}</span>
              <span className={styles.label}>{stage.shortLabel}</span>
              {stage.pingpong && state !== 'future' && <span className={styles.pingpong} title="שלב תומך גרסאות ובקשות תיקון">↺</span>}
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
