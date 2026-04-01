import type { WizardState } from './types'
import s from './BriefWizard.module.css'

interface Props {
  state: WizardState
  onChange: (field: keyof WizardState['projectDetails'], value: string | number) => void
  onNext: () => void
  onBack: () => void
}

export function Step3Details({ state, onChange, onNext, onBack }: Props) {
  const { projectDetails, selectedSpecialization } = state
  const threshold = selectedSpecialization?.projectSizeThreshold ?? 200000
  const isLarge = projectDetails.estimatedBudget > threshold

  const canContinue =
    projectDetails.name.trim().length > 0 &&
    projectDetails.ministry.trim().length > 0 &&
    projectDetails.estimatedBudget > 0

  return (
    <div>
      <div className={s.stepHeader}>
        <h2>פרטי הפרויקט</h2>
        <p>מלא את פרטי הפרויקט הבסיסיים</p>
      </div>

      <div className={s.cardBox}>
        <div className={s.field}>
          <label className={s.fieldLabel}>שם הפרויקט *</label>
          <input
            className={s.input}
            placeholder="לדוגמה: פיתוח פורטל שירות לאזרחים"
            value={projectDetails.name}
            onChange={e => onChange('name', e.target.value)}
          />
        </div>

        <div className={s.field}>
          <label className={s.fieldLabel}>משרד / גוף מזמין *</label>
          <input
            className={s.input}
            placeholder="לדוגמה: משרד הפנים"
            value={projectDetails.ministry}
            onChange={e => onChange('ministry', e.target.value)}
          />
        </div>

        <div className={s.field}>
          <label className={s.fieldLabel}>היקף כספי משוער (₪) *</label>
          <input
            className={s.input}
            type="number"
            placeholder="0"
            min={0}
            value={projectDetails.estimatedBudget || ''}
            onChange={e => onChange('estimatedBudget', Number(e.target.value))}
          />
          {projectDetails.estimatedBudget > 0 && (
            <div style={{ marginTop: 10 }}>
              <span className={`${s.sizeBadge} ${isLarge ? s.sizeBadgeLarge : s.sizeBadgeSmall}`}>
                {isLarge ? '⚠️ פרויקט גדול' : '✓ פרויקט קטן'}
              </span>
              {isLarge && (
                <div className={s.sizeNote}>
                  פרויקט גדול (מעל {threshold.toLocaleString('he-IL')} ₪) מחייב ועדת מכרזים + כנס ספקים
                </div>
              )}
            </div>
          )}
        </div>

        <div className={s.field}>
          <label className={s.fieldLabel}>ספק מועדף (אופציונלי)</label>
          <div className={s.fieldSub}>שם ספק ספציפי אם קיים, אחרת השאר ריק</div>
          <input
            className={s.input}
            placeholder="שם הספק"
            value={projectDetails.preferredVendor}
            onChange={e => onChange('preferredVendor', e.target.value)}
          />
        </div>
      </div>

      <div className={s.navBtns}>
        <button className={s.btnSecondary} onClick={onBack}>‹ חזרה</button>
        <button className={s.btnPrimary} onClick={onNext} disabled={!canContinue}>
          המשך לתיאור הצורך ›
        </button>
      </div>
    </div>
  )
}
