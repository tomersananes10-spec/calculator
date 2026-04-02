import { useEffect } from "react"
import type { WizardState, WorkPackageRow } from "./types"
import { getClusterWorkPackages } from "./briefData"
import s from "./BriefWizard.module.css"

interface Props {
  state: WizardState
  onChangeWorkPackages: (rows: WorkPackageRow[]) => void
  onNext: () => void
  onBack: () => void
}

const SIZE_LABEL: Record<string, string> = {
  small: "קטן", medium: "בינוני", large: "גדול", fixed: "קבוע",
}

export function Step6WorkPackages({ state, onChangeWorkPackages, onNext, onBack }: Props) {
  const clusterId = state.identification.selectedCluster?.id ?? ""

  useEffect(() => {
    if (state.workPackages.length === 0 && clusterId) {
      onChangeWorkPackages(getClusterWorkPackages(clusterId))
    }
  }, [clusterId])

  const rows = state.workPackages

  function updateQty(id: string, qty: number) {
    onChangeWorkPackages(rows.map(r => r.id === id ? { ...r, quantity: qty } : r))
  }

  function addRow() {
    onChangeWorkPackages([...rows, {
      id: "custom-wp-" + Date.now(),
      name: "",
      size: "fixed" as const,
      description: "",
      quantity: 1,
    }])
  }

  function updateRow(id: string, field: keyof WorkPackageRow, value: unknown) {
    onChangeWorkPackages(rows.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  function removeRow(id: string) {
    onChangeWorkPackages(rows.filter(r => r.id !== id))
  }

  return (
    <div>
      <div className={s.stepHeader}>
        <h2>שו"שים - יחידות תמחור</h2>
        <p>הגדר כמה יחידות מכל סוג שו"ש נדרשות</p>
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
                <th>שם השו"ש</th>
                <th style={{ width: 70 }}>גודל</th>
                <th>תיאור / קריטריונים</th>
                <th style={{ width: 80 }}>כמות</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  <td>
                    <input className={s.tableInput} value={row.name}
                      onChange={e => updateRow(row.id, "name", e.target.value)} />
                  </td>
                  <td>
                    <span className={s.sizeBadge}>{SIZE_LABEL[row.size]}</span>
                  </td>
                  <td>
                    <input className={s.tableInput} value={row.description}
                      onChange={e => updateRow(row.id, "description", e.target.value)} />
                  </td>
                  <td>
                    <input className={s.tableInputSm} type="number" min={0} value={row.quantity}
                      onChange={e => updateQty(row.id, Number(e.target.value))} />
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
        <button className={s.btnPrimary} onClick={onNext}>המשך</button>
      </div>
    </div>
  )
}
