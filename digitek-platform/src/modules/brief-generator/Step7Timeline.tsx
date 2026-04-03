import type { WizardState, TimelinePhase } from "./types"
import s from "./BriefWizard.module.css"

interface Props {
  state: WizardState
  onChange: (field: string, value: unknown) => void
  onNext: () => void
  onBack: () => void
  onSave: () => void
}

export function Step7Timeline({ state, onChange, onNext, onBack, onSave }: Props) {
  const { timeline } = state

  function updatePhase(id: string, field: keyof TimelinePhase, value: unknown) {
    onChange("timeline.phases", timeline.phases.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    ))
  }

  function addPhase() {
    const newPhase: TimelinePhase = {
      id: "p-" + Date.now(),
      name: "",
      startWeek: 1,
      durationWeeks: 2,
      keyDeliverable: "",
      completionCriteria: "",
    }
    onChange("timeline.phases", [...timeline.phases, newPhase])
  }

  function removePhase(id: string) {
    onChange("timeline.phases", timeline.phases.filter(p => p.id !== id))
  }

  return (
    <div>
      <div className={s.stepHeader}>
        <h2>תוכנית עבודה ולוחות זמנים</h2>
        <p>הגדר את שלבי הפרויקט ומשך כל שלב</p>
      </div>

      <div className={s.cardBox}>
        <div className={s.fieldRow}>
          <div className={s.field}>
            <label className={s.fieldLabel}>מועד התחלה משוער</label>
            <input className={s.input} type="date" value={timeline.estimatedStartDate}
              onChange={e => onChange("timeline.estimatedStartDate", e.target.value)} />
          </div>
          <div className={s.field}>
            <label className={s.fieldLabel}>משך פרויקט כולל (חודשים)</label>
            <input className={s.input} type="number" min={1} value={timeline.totalDurationMonths}
              onChange={e => onChange("timeline.totalDurationMonths", Number(e.target.value))} />
          </div>
          <div className={s.field}>
            <label className={s.fieldLabel}>תקופת אחריות (חודשים)</label>
            <input className={s.input} type="number" min={0} value={timeline.warrantyMonths}
              onChange={e => onChange("timeline.warrantyMonths", Number(e.target.value))} />
          </div>
          <div className={s.field}>
            <label className={s.fieldLabel}>תחזוקה אופציונלית (חודשים)</label>
            <input className={s.input} type="number" min={0} value={timeline.maintenanceMonths}
              onChange={e => onChange("timeline.maintenanceMonths", Number(e.target.value))} />
          </div>
        </div>
      </div>

      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>שלב</th>
              <th style={{ width: 90 }}>תחילה (T+ שבועות)</th>
              <th style={{ width: 90 }}>משך (שבועות)</th>
              <th>משימה / תוצר מרכזי</th>
              <th>קריטריוני השלמה</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {timeline.phases.map(phase => (
              <tr key={phase.id}>
                <td>
                  <input className={s.tableInput} value={phase.name}
                    onChange={e => updatePhase(phase.id, "name", e.target.value)} />
                </td>
                <td>
                  <input className={s.tableInputSm} type="number" min={1} value={phase.startWeek}
                    onChange={e => updatePhase(phase.id, "startWeek", Number(e.target.value))} />
                </td>
                <td>
                  <input className={s.tableInputSm} type="number" min={1} value={phase.durationWeeks}
                    onChange={e => updatePhase(phase.id, "durationWeeks", Number(e.target.value))} />
                </td>
                <td>
                  <input className={s.tableInput} value={phase.keyDeliverable}
                    onChange={e => updatePhase(phase.id, "keyDeliverable", e.target.value)} />
                </td>
                <td>
                  <input className={s.tableInput} value={phase.completionCriteria}
                    onChange={e => updatePhase(phase.id, "completionCriteria", e.target.value)} />
                </td>
                <td>
                  <button className={s.removeBtn} onClick={() => removePhase(phase.id)}>X</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className={s.addRowBtn} onClick={addPhase}>+ הוסף שלב</button>

      <div className={s.navBtns}>
        <button className={s.btnSecondary} onClick={onBack}>חזרה</button>
        <div style={{ display: "flex", gap: 8 }}>
          <button className={s.btnSecondary} onClick={onSave}>שמור</button>
          <button className={s.btnPrimary} onClick={onNext}>המשך</button>
        </div>
      </div>
    </div>
  )
}
