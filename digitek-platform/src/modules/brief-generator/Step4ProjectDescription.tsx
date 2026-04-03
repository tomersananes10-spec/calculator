import type { WizardState } from "./types"
import s from "./BriefWizard.module.css"

interface Props {
  state: WizardState
  onChange: (field: string, value: string) => void
  onNext: () => void
  onBack: () => void
  onSave: () => void
}

export function Step4ProjectDescription({ state, onChange, onNext, onBack, onSave }: Props) {
  const { projectDescription } = state
  const canContinue = projectDescription.general.trim().length > 0

  return (
    <div>
      <div className={s.stepHeader}>
        <h2>תיאור הפרויקט המבוקש</h2>
        <p>מה אתם מבקשים לבנות ומה הצפי מהספק</p>
      </div>

      <div className={s.cardBox}>
        <div className={s.field}>
          <label className={s.fieldLabel}>תיאור כללי של הפרויקט *</label>
          <textarea className={s.textarea}
            placeholder="תאר מה הפרויקט עושה, מה מטרתו ומה הוא אמור להביא לארגון..."
            value={projectDescription.general}
            onChange={e => onChange("projectDescription.general", e.target.value)} />
        </div>

        <div className={s.field}>
          <label className={s.fieldLabel}>תיאור התוצרים והשירותים המבוקשים</label>
          <textarea className={s.textarea}
            placeholder="רשימה של מה שהספק צריך לספק - מודולים, מסכים, אינטגרציות, דשבורדים..."
            value={projectDescription.requestedDeliverables}
            onChange={e => onChange("projectDescription.requestedDeliverables", e.target.value)} />
        </div>

        <div className={s.field}>
          <label className={s.fieldLabel}>מאפיינים טכנולוגיים</label>
          <textarea className={s.textarea}
            placeholder="Stack נדרש, תקנים, נגישות (WCAG AA), ריבוי שפות, Nimbus/ענן..."
            value={projectDescription.technicalCharacteristics}
            onChange={e => onChange("projectDescription.technicalCharacteristics", e.target.value)} />
        </div>

        <div className={s.field}>
          <label className={s.fieldLabel}>תועלות הצפויות</label>
          <textarea className={s.textarea}
            placeholder="מה ישתפר? כמה? לדוגמה: חיסכון של 30% בזמן עיבוד, שיפור שביעות רצון..."
            value={projectDescription.expectedBenefits}
            onChange={e => onChange("projectDescription.expectedBenefits", e.target.value)} />
        </div>

        <div className={s.fieldRow}>
          <div className={s.field}>
            <label className={s.fieldLabel}>קהל יעד</label>
            <input className={s.input}
              placeholder="לדוגמה: עובדי משרד, אזרחים, ספקים חיצוניים"
              value={projectDescription.targetAudience}
              onChange={e => onChange("projectDescription.targetAudience", e.target.value)} />
          </div>
          <div className={s.field}>
            <label className={s.fieldLabel}>מספר משתמשים משוער</label>
            <input className={s.input}
              placeholder="לדוגמה: 250 פנימיים, 2,000 חיצוניים"
              value={projectDescription.usersCount}
              onChange={e => onChange("projectDescription.usersCount", e.target.value)} />
          </div>
        </div>
      </div>

      <div className={s.navBtns}>
        <button className={s.btnSecondary} onClick={onBack}>חזרה</button>
        <button className={s.btnPrimary} onClick={onNext} disabled={!canContinue}>המשך</button>
      </div>
    </div>
  )
}
