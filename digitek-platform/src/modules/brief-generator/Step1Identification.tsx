import type { WizardState } from "./types"
import s from "./BriefWizard.module.css"

interface Props {
  state: WizardState
  onChange: (field: string, value: unknown) => void
  onNext: () => void
  onBack: () => void
  onSave: () => void
}

export function Step1Identification({ state, onChange, onNext, onBack, onSave }: Props) {
  const { identification } = state
  const selectedCluster = identification.selectedCluster

  const canContinue =
    identification.projectName.trim() &&
    identification.ministry.trim() &&
    identification.selectedCluster &&
    identification.selectedSpecialization

  return (
    <div>
      <div className={s.stepHeader}>
        <h2>זיהוי הפרויקט</h2>
        <p>פרטי הפרויקט, האשכול וההתמחות</p>
      </div>

      <div className={s.cardBox}>
        <div className={s.fieldRow}>
          <div className={s.field}>
            <label className={s.fieldLabel}>שם הפרויקט *</label>
            <input className={s.input} value={identification.projectName}
              onChange={e => onChange("identification.projectName", e.target.value)}
              placeholder="לדוגמה: מאגר מסמכים דיגיטלי" />
          </div>
          <div className={s.field}>
            <label className={s.fieldLabel}>משרד / גוף מזמין *</label>
            <input className={s.input} value={identification.ministry}
              onChange={e => onChange("identification.ministry", e.target.value)}
              placeholder="לדוגמה: משרד הבריאות" />
          </div>
        </div>

        <div className={s.fieldRow}>
          <div className={s.field}>
            <label className={s.fieldLabel}>מספר תיחור</label>
            <input className={s.input} value={identification.tenderNumber}
              onChange={e => onChange("identification.tenderNumber", e.target.value)}
              placeholder="אופציונלי" />
          </div>
          <div className={s.field}>
            <label className={s.fieldLabel}>תאריך כתיבה</label>
            <input className={s.input} type="date" value={identification.writtenDate}
              onChange={e => onChange("identification.writtenDate", e.target.value)} />
            {identification.writtenDate && (
              <span style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3, display: 'block' }}>
                {identification.writtenDate.split('-').reverse().join('/')}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className={s.cardBox}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <label className={s.fieldLabel}>אשכול והתמחות</label>
          <button
            type="button"
            onClick={onBack}
            style={{ background: 'none', border: '1px solid var(--border2)', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--text2)', fontFamily: 'inherit' }}
          >
            שנה ←
          </button>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {selectedCluster && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'var(--teal-pale)', border: '1.5px solid var(--teal)',
              borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 700, color: 'var(--teal)'
            }}>
              {selectedCluster.icon} {selectedCluster.name}
            </span>
          )}
          {identification.selectedSpecialization && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'var(--teal-pale)', border: '1.5px solid var(--teal)',
              borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 700, color: 'var(--teal)'
            }}>
              {identification.selectedSpecialization.name}
            </span>
          )}
        </div>
      </div>

      <div className={s.cardBox}>
        <div className={s.fieldRow}>
          <div className={s.field}>
            <label className={s.fieldLabel}>הערכת תקציב (שח)</label>
            <input className={s.input} type="number" value={identification.estimatedBudget || ""}
              onChange={e => {
                const val = Number(e.target.value)
                onChange("identification.estimatedBudget", val)
                onChange("identification.projectSize", val > 200000 ? 'large' : 'small')
              }}
              placeholder="0" />
          </div>
          <div className={s.field}>
            <label className={s.fieldLabel}>גודל פרויקט</label>
            <select className={s.select}
              value={identification.projectSize}
              onChange={e => onChange("identification.projectSize", e.target.value)}>
              <option value="small">קטן (עד 200,000 שח)</option>
              <option value="large">גדול (מעל 200,000 שח)</option>
            </select>
          </div>
        </div>
      </div>

      <div className={s.navBtns}>
        <button className={s.btnSecondary} onClick={onBack}>
          ← חזרה
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={s.btnSecondary} onClick={onSave}>שמור</button>
          <button className={s.btnPrimary} onClick={onNext} disabled={!canContinue}>המשך</button>
        </div>
      </div>
    </div>
  )
}
