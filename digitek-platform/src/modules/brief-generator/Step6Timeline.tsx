import type { WizardState, Milestone } from './types'
import s from './BriefWizard.module.css'

interface Props {
  state: WizardState
  onChangeTimeline: (field: keyof WizardState['timeline'], value: string | number | Milestone[]) => void
  onNext: () => void
  onBack: () => void
}

export function Step6Timeline({ state, onChangeTimeline, onNext, onBack }: Props) {
  const { timeline } = state

  const totalPercent = timeline.milestones.reduce((sum, m) => sum + (m.paymentPercent || 0), 0)
  const percentOk = totalPercent === 100

  function addMilestone() {
    onChangeTimeline('milestones', [
      ...timeline.milestones,
      { name: '', date: '', paymentPercent: 0 },
    ])
  }

  function updateMilestone(index: number, field: keyof Milestone, value: string | number) {
    const updated = timeline.milestones.map((m, i) =>
      i === index ? { ...m, [field]: value } : m
    )
    onChangeTimeline('milestones', updated)
  }

  function removeMilestone(index: number) {
    onChangeTimeline('milestones', timeline.milestones.filter((_, i) => i !== index))
  }

  const canContinue = timeline.estimatedStartDate.length > 0 && timeline.contractDuration > 0

  return (
    <div>
      <div className={s.stepHeader}>
        <h2>לוח זמנים ואבני דרך</h2>
        <p>הגדר את לוח הזמנים ואבני הדרך לתשלום</p>
      </div>

      <div className={s.cardBox}>
        <div className={s.field}>
          <label className={s.fieldLabel}>מועד התחלה משוער *</label>
          <input
            className={s.input}
            type="date"
            value={timeline.estimatedStartDate}
            onChange={e => onChangeTimeline('estimatedStartDate', e.target.value)}
            style={{ maxWidth: 220 }}
          />
        </div>

        <div className={s.field}>
          <label className={s.fieldLabel}>תקופת התקשרות (חודשים) *</label>
          <div className={s.fieldSub}>מקסימום 24 חודשים</div>
          <input
            className={s.input}
            type="number"
            min={1}
            max={24}
            value={timeline.contractDuration}
            onChange={e => onChangeTimeline('contractDuration', Math.min(24, Math.max(1, Number(e.target.value))))}
            style={{ maxWidth: 120 }}
          />
        </div>
      </div>

      <div className={s.cardBox}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>אבני דרך לתשלום</div>
          {timeline.milestones.length > 0 && (
            <div className={`${s.percentTotal} ${percentOk ? s.percentOk : s.percentErr}`}>
              סה"כ: {totalPercent}% {percentOk ? '✓' : '— חייב להגיע ל-100%'}
            </div>
          )}
        </div>

        {timeline.milestones.length > 0 && (
          <table className={s.milestonesTable}>
            <thead>
              <tr>
                <th>שם אבן הדרך</th>
                <th style={{ width: 150 }}>תאריך</th>
                <th style={{ width: 100 }}>% תשלום</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {timeline.milestones.map((m, i) => (
                <tr key={i}>
                  <td>
                    <input
                      className={s.tableInput}
                      placeholder="לדוגמה: מסירת מסמך אפיון"
                      value={m.name}
                      onChange={e => updateMilestone(i, 'name', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className={s.tableInput}
                      type="date"
                      value={m.date}
                      onChange={e => updateMilestone(i, 'date', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className={s.tableInput}
                      type="number"
                      min={0}
                      max={100}
                      placeholder="0"
                      value={m.paymentPercent || ''}
                      onChange={e => updateMilestone(i, 'paymentPercent', Number(e.target.value))}
                    />
                  </td>
                  <td>
                    <button className={s.removeBtn} onClick={() => removeMilestone(i)} title="הסר">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <button className={s.addRowBtn} onClick={addMilestone}>
          + הוסף אבן דרך
        </button>
      </div>

      <div className={s.navBtns}>
        <button className={s.btnSecondary} onClick={onBack}>‹ חזרה</button>
        <button className={s.btnPrimary} onClick={onNext} disabled={!canContinue}>
          המשך לדרישות נוספות ›
        </button>
      </div>
    </div>
  )
}
