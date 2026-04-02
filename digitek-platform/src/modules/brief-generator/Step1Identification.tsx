import { clusters } from "../../data/clusters"
import type { WizardState } from "./types"
import s from "./BriefWizard.module.css"

interface Props {
  state: WizardState
  onChange: (field: string, value: unknown) => void
  onNext: () => void
}

export function Step1Identification({ state, onChange, onNext }: Props) {
  const { identification } = state
  const selectedCluster = identification.selectedCluster
  const specs = selectedCluster?.specializations ?? []

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
          </div>
        </div>
      </div>

      <div className={s.cardBox}>
        <label className={s.fieldLabel}>בחר אשכול *</label>
        <div className={s.clusterGrid}>
          {clusters.map(c => (
            <button
              key={c.id}
              className={c.id === selectedCluster?.id ? s.clusterCardActive : s.clusterCard}
              onClick={() => onChange("identification.selectedCluster", c)}
              type="button"
            >
              <span className={s.clusterIcon}>{c.icon}</span>
              <span className={s.clusterName}>{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {specs.length > 0 && (
        <div className={s.cardBox}>
          <label className={s.fieldLabel}>בחר התמחות *</label>
          <div className={s.specList}>
            {specs.map(sp => (
              <button
                key={sp.id}
                className={sp.id === identification.selectedSpecialization?.id ? s.specCardActive : s.specCard}
                onClick={() => onChange("identification.selectedSpecialization", sp)}
                type="button"
              >
                <div className={s.specName}>{sp.name}</div>
                <div className={s.specDesc}>{(sp as any).description ?? ""}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={s.cardBox}>
        <div className={s.fieldRow}>
          <div className={s.field}>
            <label className={s.fieldLabel}>הערכת תקציב (שח)</label>
            <input className={s.input} type="number" value={identification.estimatedBudget || ""}
              onChange={e => onChange("identification.estimatedBudget", Number(e.target.value))}
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
        <div />
        <button className={s.btnPrimary} onClick={onNext} disabled={!canContinue}>
          המשך
        </button>
      </div>
    </div>
  )
}
