import type { WizardState, SlaRow } from "./types"
import s from "./BriefWizard.module.css"

interface Props {
  state: WizardState
  onChange: (field: string, value: unknown) => void
  onNext: () => void
  onBack: () => void
}

const SLA_LABELS: Record<string, string> = {
  critical: "קריטית - משביתת מערכת",
  severe: "חמורה - משביתת שירות",
  normal: "רגילה - אינה קריטית",
}

const TESTING_ITEMS = [
  { key: "unitTests", label: "בדיקות מסירה (Unit Tests)" },
  { key: "acceptanceTests", label: "בדיקות קבלה" },
  { key: "performanceTests", label: "בדיקות ביצועים ועומסים" },
  { key: "penetrationTests", label: "בדיקות חדירות (Penetration Test)" },
]

export function Step8Management({ state, onChange, onNext, onBack }: Props) {
  const { management } = state

  function updateSla(type: string, field: keyof SlaRow, value: unknown) {
    onChange("management.sla", management.sla.map(r =>
      r.type === type ? { ...r, [field]: value } : r
    ))
  }

  function updateTesting(field: string, value: boolean) {
    onChange("management.testingRequirements", {
      ...management.testingRequirements,
      [field]: value,
    })
  }

  return (
    <div>
      <div className={s.stepHeader}>
        <h2>ניהול, אחריות ו-SLA</h2>
        <p>הגדר את אנשי הקשר, דרישות הבדיקות והסכמי השירות</p>
      </div>

      <div className={s.cardBox}>
        <h3 className={s.cardTitle}>ניהול הפרויקט</h3>
        <div className={s.fieldRow}>
          <div className={s.field}>
            <label className={s.fieldLabel}>שם איש קשר מטעם המשרד</label>
            <input className={s.input} value={management.clientContactName}
              onChange={e => onChange("management.clientContactName", e.target.value)} />
          </div>
          <div className={s.field}>
            <label className={s.fieldLabel}>תפקיד</label>
            <input className={s.input} value={management.clientContactRole}
              onChange={e => onChange("management.clientContactRole", e.target.value)} />
          </div>
        </div>
        <div className={s.fieldRow}>
          <div className={s.field}>
            <label className={s.fieldLabel}>מקום מתן השירות</label>
            <select className={s.select} value={management.serviceLocation}
              onChange={e => onChange("management.serviceLocation", e.target.value)}>
              <option value="vendor">ממשרדי הספק</option>
              <option value="client">ממשרדי המזמין</option>
              <option value="hybrid">היברידי</option>
            </select>
          </div>
          <div className={s.field}>
            <label className={s.fieldLabel}>סיווג ביטחוני נדרש</label>
            <input className={s.input} value={management.securityClassification}
              onChange={e => onChange("management.securityClassification", e.target.value)}
              placeholder="לדוגמה: רמה 5" />
          </div>
        </div>
        <div className={s.checkRow}>
          <label className={s.checkLabel}>
            <input type="checkbox" checked={management.weeklyMeetings}
              onChange={e => onChange("management.weeklyMeetings", e.target.checked)} />
            פגישה שבועית קבועה
          </label>
          <label className={s.checkLabel}>
            <input type="checkbox" checked={management.steeringCommittee}
              onChange={e => onChange("management.steeringCommittee", e.target.checked)} />
            ועדת היגוי חודשית
          </label>
        </div>
      </div>

      <div className={s.cardBox}>
        <h3 className={s.cardTitle}>דרישות בדיקות</h3>
        <div className={s.checkRow}>
          {TESTING_ITEMS.map(({ key, label }) => (
            <label key={key} className={s.checkLabel}>
              <input type="checkbox"
                checked={management.testingRequirements[key as keyof typeof management.testingRequirements]}
                onChange={e => updateTesting(key, e.target.checked)} />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className={s.cardBox}>
        <h3 className={s.cardTitle}>SLA - רמות שירות</h3>
        <table className={s.table}>
          <thead>
            <tr>
              <th>סוג תקלה</th>
              <th style={{ width: 130 }}>זמן תגובה (שעות)</th>
              <th style={{ width: 130 }}>קנס לשעת איחור (שח)</th>
            </tr>
          </thead>
          <tbody>
            {management.sla.map(row => (
              <tr key={row.type}>
                <td>{SLA_LABELS[row.type]}</td>
                <td>
                  <input className={s.tableInputSm} type="number" min={0} step={0.5}
                    value={row.responseHours}
                    onChange={e => updateSla(row.type, "responseHours", Number(e.target.value))} />
                </td>
                <td>
                  <input className={s.tableInputSm} type="number" min={0}
                    value={row.penaltyNIS}
                    onChange={e => updateSla(row.type, "penaltyNIS", Number(e.target.value))} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={s.navBtns}>
        <button className={s.btnSecondary} onClick={onBack}>חזרה</button>
        <button className={s.btnPrimary} onClick={onNext}>המשך</button>
      </div>
    </div>
  )
}
