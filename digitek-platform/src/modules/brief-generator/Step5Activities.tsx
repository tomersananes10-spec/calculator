import type { WizardState } from './types'
import s from './BriefWizard.module.css'

interface Props {
  state: WizardState
  onToggleActivity: (activityId: string) => void
  onSelectAllMandatory: () => void
  onNext: () => void
  onBack: () => void
}

export function Step5Activities({ state, onToggleActivity, onSelectAllMandatory, onNext, onBack }: Props) {
  const spec = state.selectedSpecialization
  if (!spec) return null

  const reqLabel = (r: string) => {
    if (r === 'mandatory') return { label: 'חובה', cls: s.reqMandatory }
    if (r === 'recommended') return { label: 'מומלץ', cls: s.reqRecommended }
    return { label: 'אפשרי', cls: s.reqOptional }
  }

  const mandatoryCount = spec.activities
    .flatMap(a => a.deliverables)
    .filter(d => d.required === 'mandatory').length

  return (
    <div>
      <div className={s.stepHeader}>
        <h2>פעילויות ותוצרים</h2>
        <p>בחר את הפעילויות והתוצרים לבריף</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: 'var(--text3)' }}>
          נבחרו {state.selectedActivities.length} פעילויות
        </div>
        <button className={s.btnOutline} onClick={onSelectAllMandatory}>
          ✓ בחר הכל חובה ({mandatoryCount})
        </button>
      </div>

      <div className={s.cardBox} style={{ padding: 0, overflow: 'hidden' }}>
        <table className={s.activitiesTable}>
          <thead>
            <tr>
              <th style={{ width: 40 }}></th>
              <th>פעילות</th>
              <th>תוצרים</th>
              <th style={{ width: 80 }}>סטטוס</th>
            </tr>
          </thead>
          <tbody>
            {spec.activities.map(activity => {
              const isSelected = state.selectedActivities.includes(activity.id)
              const firstDeliverable = activity.deliverables[0]
              const req = reqLabel(firstDeliverable?.required ?? 'optional')

              return (
                <tr
                  key={activity.id}
                  className={s.activityRow}
                  onClick={() => onToggleActivity(activity.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      className={s.activityCheck}
                      checked={isSelected}
                      onChange={() => onToggleActivity(activity.id)}
                      onClick={e => e.stopPropagation()}
                    />
                  </td>
                  <td style={{ fontWeight: isSelected ? 600 : 400 }}>{activity.name}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {activity.deliverables.map(d => (
                        <div key={d.id} style={{ fontSize: 12, color: 'var(--text2)' }}>
                          • {d.name}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className={`${s.reqBadge} ${req.cls}`}>{req.label}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className={s.navBtns}>
        <button className={s.btnSecondary} onClick={onBack}>‹ חזרה</button>
        <button
          className={s.btnPrimary}
          onClick={onNext}
          disabled={state.selectedActivities.length === 0}
        >
          המשך ללוח זמנים ›
        </button>
      </div>
    </div>
  )
}
