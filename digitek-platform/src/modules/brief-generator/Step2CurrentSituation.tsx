import type { WizardState } from "./types"
import s from "./BriefWizard.module.css"

interface Props {
  state: WizardState
  onChange: (field: string, value: string) => void
  onNext: () => void
  onBack: () => void
}

export function Step2CurrentSituation({ state, onChange, onNext, onBack }: Props) {
  const { currentSituation } = state
  const canContinue = currentSituation.businessProblem.trim().length > 0

  return (
    <div>
      <div className={s.stepHeader}>
        <h2>המצב הקיים</h2>
        <p>תאר את הבעיה, המערכות הקיימות והפערים שיש לתת להם מענה</p>
      </div>

      <div className={s.cardBox}>
        <div className={s.field}>
          <label className={s.fieldLabel}>הצורך העסקי / הבעיה *</label>
          <textarea className={s.textarea}
            placeholder="תאר את הצורך העסקי, הבעיה או הפגיעה שאותה הפרויקט אמור לפתור..."
            value={currentSituation.businessProblem}
            onChange={e => onChange("currentSituation.businessProblem", e.target.value)} />
        </div>

        <div className={s.field}>
          <label className={s.fieldLabel}>מערכות ותהליכים קיימים</label>
          <textarea className={s.textarea}
            placeholder="פרט את המערכות, הכלים והתהליכים הקיימים כיום..."
            value={currentSituation.existingSystems}
            onChange={e => onChange("currentSituation.existingSystems", e.target.value)} />
        </div>

        <div className={s.field}>
          <label className={s.fieldLabel}>תשתית ורכיבים</label>
          <textarea className={s.textarea}
            placeholder="לדוגמה: GCP, 200 שרתים, Oracle 19, מערכת X On-Prem..."
            value={currentSituation.infrastructure}
            onChange={e => onChange("currentSituation.infrastructure", e.target.value)} />
        </div>

        <div className={s.fieldRow}>
          <div className={s.field}>
            <label className={s.fieldLabel}>נפחי מידע</label>
            <input className={s.input}
              placeholder="לדוגמה: 1PB, 500,000 רשומות, 30 מקורות נתונים"
              value={currentSituation.dataVolumes}
              onChange={e => onChange("currentSituation.dataVolumes", e.target.value)} />
          </div>
        </div>

        <div className={s.field}>
          <label className={s.fieldLabel}>פערים עיקריים</label>
          <textarea className={s.textarea}
            placeholder="מה חסר? מה לא עובד? מה צריך לשפר?..."
            value={currentSituation.mainGaps}
            onChange={e => onChange("currentSituation.mainGaps", e.target.value)} />
        </div>
      </div>

      <div className={s.navBtns}>
        <button className={s.btnSecondary} onClick={onBack}>חזרה</button>
        <button className={s.btnPrimary} onClick={onNext} disabled={!canContinue}>המשך</button>
      </div>
    </div>
  )
}
