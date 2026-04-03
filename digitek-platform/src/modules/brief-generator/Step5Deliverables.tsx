import { useEffect } from "react"
import type { WizardState, DeliverableRow } from "./types"
import { getClusterDeliverables } from "./briefData"
import s from "./BriefWizard.module.css"

interface Props {
  state: WizardState
  onChangeDeliverables: (rows: DeliverableRow[]) => void
  onNext: () => void
  onBack: () => void
  onSave: () => void
}

export function Step5Deliverables({ state, onChangeDeliverables, onNext, onBack, onSave }: Props) {
  const clusterId = state.identification.selectedCluster?.id ?? ""

  useEffect(() => {
    if (state.deliverables.length === 0 && clusterId) {
      onChangeDeliverables(getClusterDeliverables(clusterId))
    }
  }, [clusterId])

  const rows = state.deliverables
  const isEmpty = rows.length === 0

  function updateRow(id: string, field: keyof DeliverableRow, value: unknown) {
    onChangeDeliverables(rows.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  function addRow() {
    const newRow: DeliverableRow = {
      id: "custom-" + Date.now(),
      name: "",
      selected: true,
      quantity: 1,
      notes: "",
    }
    onChangeDeliverables([...rows, newRow])
  }

  function removeRow(id: string) {
    onChangeDeliverables(rows.filter(r => r.id !== id))
  }

  const hasSelected = rows.some(r => r.selected)

  return (
    <div>
      <div className={s.stepHeader}>
        <h2>חבילות עבודה - תוצרים</h2>
        <p>בחר את התוצרים הנדרשים והגדר כמויות</p>
      </div>

      {isEmpty && (
        <div className={s.emptyNote}>
          לאשכול זה אין תוצרים מוגדרים מראש. הוסף שורות ידנית.
        </div>
      )}

      {rows.length > 0 && (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th style={{ width: 40 }}>בחר</th>
                <th>שם התוצר</th>
                <th style={{ width: 80 }}>כמות</th>
                <th>הערות</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className={row.selected ? "" : s.rowDimmed}>
                  <td>
                    <input type="checkbox" checked={row.selected}
                      onChange={e => updateRow(row.id, "selected", e.target.checked)} />
                  </td>
                  <td>
                    <input className={s.tableInput} value={row.name}
                      onChange={e => updateRow(row.id, "name", e.target.value)} />
                  </td>
                  <td>
                    <input className={s.tableInputSm} type="number" min={1} value={row.quantity}
                      onChange={e => updateRow(row.id, "quantity", Number(e.target.value))} />
                  </td>
                  <td>
                    <input className={s.tableInput} value={row.notes}
                      placeholder="הערה אופציונלית..."
                      onChange={e => updateRow(row.id, "notes", e.target.value)} />
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

      <button className={s.addRowBtn} onClick={addRow}>+ הוסף תוצר</button>

      <div className={s.navBtns}>
        <button className={s.btnSecondary} onClick={onBack}>חזרה</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={s.btnSecondary} onClick={onSave}>שמור</button>
          <button className={s.btnPrimary} onClick={onNext} disabled={!hasSelected && rows.length > 0}>המשך</button>
        </div>
      </div>
    </div>
  )
}
