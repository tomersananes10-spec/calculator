import type { WizardState } from "./types"
import s from "./BriefWizard.module.css"

interface Props {
  state: WizardState
  onChange: (field: string, value: unknown) => void
  onNext: () => void
  onBack: () => void
}

const WEIGHT_ITEMS = [
  { key: "vendorQuality", label: "דירוג ספק (איכות עבר)" },
  { key: "proposalQuality", label: "איכות ההצעה" },
  { key: "price", label: "מחיר" },
]

export function Step9Goals({ state, onChange, onNext, onBack }: Props) {
  const { goals } = state
  const total = goals.evaluationWeights.vendorQuality +
                goals.evaluationWeights.proposalQuality +
                goals.evaluationWeights.price
  const weightsValid = total === 100

  return (
    <div>
      <div className={s.stepHeader}>
        <h2>מטרות, KPIs ותקציב</h2>
        <p>הגדר כיצד תימדד הצלחת הפרויקט ומה התקציב המשוער</p>
      </div>

      <div className={s.cardBox}>
        <div className={s.field}>
          <label className={s.fieldLabel}>מדדי הצלחה (KPIs)</label>
          <textarea className={s.textarea}
            placeholder="1. עלייה לאוויר במועד שנקבע&#10;2. שיפור של 30% בשביעות רצון&#10;3. ..."
            value={goals.kpis}
            onChange={e => onChange("goals.kpis", e.target.value)} />
        </div>
        <div className={s.field}>
          <label className={s.fieldLabel}>קריטריוני הצלחה</label>
          <textarea className={s.textarea}
            placeholder="כיצד תדעו שהפרויקט הצליח?..."
            value={goals.successCriteria}
            onChange={e => onChange("goals.successCriteria", e.target.value)} />
        </div>
      </div>

      <div className={s.cardBox}>
        <h3 className={s.cardTitle}>קריטריוני הערכת הצעות</h3>
        <p className={s.cardNote}>סכום המשקלות חייב להיות 100%. ברירת מחדל: 20 / 50 / 30.</p>
        <div className={s.fieldRow}>
          {WEIGHT_ITEMS.map(({ key, label }) => (
            <div key={key} className={s.field}>
              <label className={s.fieldLabel}>{label} (%)</label>
              <input className={s.input} type="number" min={0} max={100}
                value={goals.evaluationWeights[key as keyof typeof goals.evaluationWeights]}
                onChange={e => onChange("goals.evaluationWeights", {
                  ...goals.evaluationWeights,
                  [key]: Number(e.target.value),
                })} />
            </div>
          ))}
        </div>
        {!weightsValid && (
          <div className={s.weightError}>
            סכום: {total}% - חייב להיות 100%
          </div>
        )}
      </div>

      <div className={s.cardBox}>
        <div className={s.fieldRow}>
          <div className={s.field}>
            <label className={s.fieldLabel}>הערכת עלות (שח כולל מעמ)</label>
            <input className={s.input} type="number" min={0}
              value={goals.budgetEstimateNIS || ""}
              onChange={e => onChange("goals.budgetEstimateNIS", Number(e.target.value))}
              placeholder="0" />
          </div>
        </div>
        <div className={s.field}>
          <label className={s.fieldLabel}>אבני דרך לתשלום</label>
          <textarea className={s.textarea}
            value={goals.paymentMilestones}
            onChange={e => onChange("goals.paymentMilestones", e.target.value)} />
        </div>
      </div>

      <div className={s.navBtns}>
        <button className={s.btnSecondary} onClick={onBack}>חזרה</button>
        <button className={s.btnPrimary} onClick={onNext}>המשך</button>
      </div>
    </div>
  )
}
