import { useState } from 'react'
import { STAGES, STAGE_GROUPS, getStageGroup, type StageGroupDef } from '../data/stagesBaseline'
import { shouldSkipStage } from '../data/gateways'
import type { Tender, TenderStage } from '../types'
import styles from './StageMap.module.css'

interface Props {
  tender: Tender
}

type State = 'done' | 'current' | 'future' | 'skipped' | 'terminal'

export function StageMap({ tender }: Props) {
  const currentIdx = STAGES.findIndex(s => s.code === tender.current_stage)
  const isTerminal = tender.current_stage === 'closed' || tender.current_stage === 'cancelled'
  const currentGroup = getStageGroup(tender.current_stage)

  // אופציה לפתוח/לסגור קבוצה. כברירת מחדל — הקבוצה הנוכחית פתוחה.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const out: Record<string, boolean> = {}
    for (const g of STAGE_GROUPS) {
      out[g.code] = g.code === currentGroup?.code
    }
    return out
  })

  function stageState(stageCode: TenderStage): State {
    const idx = STAGES.findIndex(s => s.code === stageCode)
    const stage = STAGES[idx]
    if (!stage) return 'future'
    const skip = shouldSkipStage(stage.code, {
      amount: tender.estimated_amount,
      selection: tender.selection_type,
    })
    if (isTerminal) return idx <= currentIdx ? 'done' : 'future'
    if (skip.skip) return 'skipped'
    if (idx < currentIdx) return 'done'
    if (stage.code === tender.current_stage) return 'current'
    return 'future'
  }

  function groupSummary(group: StageGroupDef): { done: number; total: number; isCurrent: boolean; isDone: boolean } {
    const total = group.stageCodes.length
    const done = group.stageCodes.filter(c => stageState(c) === 'done').length
    const isCurrent = group.stageCodes.includes(tender.current_stage)
    const isDone = done === total && !isCurrent
    return { done, total, isCurrent, isDone }
  }

  return (
    <aside className={styles.map}>
      <div className={styles.title}>מפת תהליך</div>
      <div className={styles.list}>
        {STAGE_GROUPS.map(group => {
          const summary = groupSummary(group)
          const isOpen = openGroups[group.code] ?? false
          const groupCls =
            summary.isCurrent ? styles.groupCurrent :
            summary.isDone ? styles.groupDone :
            styles.groupFuture

          return (
            <div key={group.code} className={styles.groupBlock}>
              <button
                type="button"
                className={`${styles.groupHeader} ${groupCls}`}
                onClick={() => setOpenGroups(s => ({ ...s, [group.code]: !s[group.code] }))}
              >
                <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>▾</span>
                <span className={styles.groupLabel}>{group.label}</span>
                <span className={styles.groupCount}>{summary.done}/{summary.total}</span>
              </button>

              {isOpen && (
                <div className={styles.subStages}>
                  {group.stageCodes.map(code => {
                    const stage = STAGES.find(s => s.code === code)
                    if (!stage) return null
                    const state = stageState(code)
                    const skip = shouldSkipStage(code, {
                      amount: tender.estimated_amount,
                      selection: tender.selection_type,
                    })
                    return (
                      <div
                        key={code}
                        className={`${styles.item} ${styles[state]}`}
                        title={skip.skip ? skip.reason : undefined}
                      >
                        <span className={styles.dot} />
                        <span className={styles.subLabel}>{stage.label}</span>
                      </div>
                    )
                  })}
                </div>
              )}
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
