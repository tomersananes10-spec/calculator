import type { WizardState } from "./types"
import s from "./BriefWizard.module.css"

interface Props {
  state: WizardState
  onChange: (field: string, value: string) => void
  onNext: () => void
  onBack: () => void
}

const TECHNICAL_CLUSTERS = new Set(["5", "6", "8", "9", "10", "12"])

export function shouldShowArchitectureStep(state: WizardState): boolean {
  const cid = state.identification.selectedCluster?.id ?? ""
  return TECHNICAL_CLUSTERS.has(cid)
}

export function Step3Architecture({ state, onChange, onNext, onBack }: Props) {
  const { existingArchitecture } = state

  return (
    <div>
      <div className={s.stepHeader}>
        <h2>ארכיטקטורה ומבנה קיים</h2>
        <p>תאר את הסביבה הטכנולוגית הנוכחית</p>
      </div>

      <div className={s.cardBox}>
        <div className={s.fieldRow}>
          <div className={s.field}>
            <label className={s.fieldLabel}>ספק ענן</label>
            <select className={s.select} value={existingArchitecture.cloudProvider}
              onChange={e => onChange("existingArchitecture.cloudProvider", e.target.value)}>
              <option value="">בחר...</option>
              <option value="GCP (Nimbus)">GCP (Nimbus)</option>
              <option value="AWS">AWS</option>
              <option value="Azure">Azure</option>
              <option value="On-Prem">On-Premise</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </div>
        </div>

        <div className={s.field}>
          <label className={s.fieldLabel}>Tech Stack נוכחי</label>
          <textarea className={s.textarea}
            placeholder="שפות תכנות, Frameworks, כלים עיקריים..."
            value={existingArchitecture.techStack}
            onChange={e => onChange("existingArchitecture.techStack", e.target.value)} />
        </div>

        <div className={s.field}>
          <label className={s.fieldLabel}>בסיסי נתונים</label>
          <input className={s.input}
            placeholder="לדוגמה: Oracle 19, SQL Server 2019, BigQuery, MongoDB"
            value={existingArchitecture.databases}
            onChange={e => onChange("existingArchitecture.databases", e.target.value)} />
        </div>

        <div className={s.field}>
          <label className={s.fieldLabel}>ממשקים חיצוניים</label>
          <textarea className={s.textarea}
            placeholder="מערכות חיצוניות שיש לתקשר איתן, APIs קיימים..."
            value={existingArchitecture.externalInterfaces}
            onChange={e => onChange("existingArchitecture.externalInterfaces", e.target.value)} />
        </div>

        <div className={s.field}>
          <label className={s.fieldLabel}>הערות נוספות</label>
          <textarea className={s.textarea}
            placeholder="אילוצים, הנחות יסוד, מידע נוסף..."
            value={existingArchitecture.notes}
            onChange={e => onChange("existingArchitecture.notes", e.target.value)} />
        </div>
      </div>

      <div className={s.navBtns}>
        <button className={s.btnSecondary} onClick={onBack}>חזרה</button>
        <button className={s.btnPrimary} onClick={onNext}>המשך</button>
      </div>
    </div>
  )
}
