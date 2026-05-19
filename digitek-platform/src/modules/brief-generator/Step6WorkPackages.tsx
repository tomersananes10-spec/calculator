import { useEffect } from "react"
import type { WizardState, TemplateShush } from "./types"
import { getTemplateShush } from "./briefTemplateData"
import s from "./BriefWizard.module.css"

interface Props {
  state: WizardState
  onChangeShush: (rows: TemplateShush[]) => void
  onNext: () => void
  onBack: () => void
  onSave: () => void
}

export function Step6WorkPackages({ state, onChangeShush, onNext, onBack, onSave }: Props) {
  const clusterId = state.identification.selectedCluster?.id ?? ""
  const specId = state.identification.selectedSpecialization?.id

  useEffect(() => {
    if (state.templateShush.length === 0 && clusterId) {
      onChangeShush(getTemplateShush(clusterId, specId ?? undefined))
    }
  }, [clusterId, specId])

  const rows = state.templateShush

  function updateRow(id: string, field: keyof TemplateShush, value: unknown) {
    onChangeShush(rows.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  function addRow() {
    onChangeShush([...rows, {
      id: "custom-shush-" + Date.now(),
      contentArea: "",
      complexity: "פשוט",
      quantitativeMetrics: "",
      workDescription: "",
      quantity: 0,
    }])
  }

  function removeRow(id: string) {
    onChangeShush(rows.filter(r => r.id !== id))
  }

  return (
    <div>
      <div className={s.stepHeader}>
        <h2>שו"שים — יחידות תמחור</h2>
        <p>הגדר כמויות לכל שו"ש. השו"שים מוגדרים לפי עולם תוכן, מורכבות ומדדים כמותיים.</p>
      </div>

      {rows.length === 0 && (
        <div className={s.emptyNote}>
          לאשכול זה אין שו"שים מוגדרים מראש. הוסף שורות ידנית.
        </div>
      )}

      {rows.length > 0 && (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>עולם תוכן / משפחת שו"ש</th>
                <th style={{ width: 100 }}>מורכבות</th>
                <th>מדדים כמותיים לתימחור</th>
                <th>תיאור השו"ש והעבודה הנדרשת</th>
                <th style={{ width: 70 }}>כמות</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  <td>
                    <input className={s.tableInput} value={row.contentArea}
                      onChange={e => updateRow(row.id, "contentArea", e.target.value)} />
                  </td>
                  <td>
                    <input className={s.tableInput} value={row.complexity}
                      onChange={e => updateRow(row.id, "complexity", e.target.value)}
                      style={{ textAlign: 'center' }} />
                  </td>
                  <td>
                    <input className={s.tableInput} value={row.quantitativeMetrics}
                      onChange={e => updateRow(row.id, "quantitativeMetrics", e.target.value)} />
                  </td>
                  <td>
                    <input className={s.tableInput} value={row.workDescription}
                      onChange={e => updateRow(row.id, "workDescription", e.target.value)} />
                  </td>
                  <td>
                    <input className={s.tableInputSm} type="number" min={0} value={row.quantity}
                      onChange={e => updateRow(row.id, "quantity", Number(e.target.value))} />
                  </td>
                  <td>
                    <button className={s.removeBtn} onClick={() => removeRow(row.id)}>X</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button className={s.addRowBtn} onClick={addRow}>+ הוסף שו"ש</button>

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
