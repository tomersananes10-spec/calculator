import { useEffect } from "react"
import type { WizardState, TemplateDeliverable } from "./types"
import { getTemplateDeliverables } from "./briefTemplateData"
import s from "./BriefWizard.module.css"

interface Props {
  state: WizardState
  onChangeDeliverables: (rows: TemplateDeliverable[]) => void
  onNext: () => void
  onBack: () => void
  onSave: () => void
}

const SIZE_OPTIONS = [
  { value: "small", label: "קטן" },
  { value: "medium", label: "בינוני" },
  { value: "large", label: "גדול" },
]

export function Step5Deliverables({ state, onChangeDeliverables, onNext, onBack, onSave }: Props) {
  const clusterId = state.identification.selectedCluster?.id ?? ""
  const specId = state.identification.selectedSpecialization?.id

  useEffect(() => {
    if (state.templateDeliverables.length === 0 && clusterId) {
      onChangeDeliverables(getTemplateDeliverables(clusterId, specId ?? undefined))
    }
  }, [clusterId, specId])

  const rows = state.templateDeliverables
  const isEmpty = rows.length === 0

  function updateRow(id: string, field: keyof TemplateDeliverable, value: unknown) {
    onChangeDeliverables(rows.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  function addRow() {
    onChangeDeliverables([...rows, {
      id: "custom-" + Date.now(),
      name: "",
      description: "",
      selected: true,
    }])
  }

  function removeRow(id: string) {
    onChangeDeliverables(rows.filter(r => r.id !== id))
  }

  const hasSelected = rows.some(r => r.selected)

  return (
    <div>
      <div className={s.stepHeader}>
        <h2>תפוקות — תוצרים נדרשים</h2>
        <p>בחר את התפוקות הרלוונטיות לפרויקט. ניתן לערוך את התיאורים.</p>
      </div>

      {isEmpty && (
        <div className={s.emptyNote}>
          לאשכול זה אין תפוקות מוגדרות מראש. הוסף שורות ידנית.
        </div>
      )}

      {rows.map(row => (
        <div key={row.id} className={s.deliverableCard} style={{
          opacity: row.selected ? 1 : 0.5,
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '16px',
          marginBottom: '12px',
          background: row.selected ? 'var(--surface)' : 'transparent',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <input
              type="checkbox"
              checked={row.selected}
              onChange={e => updateRow(row.id, "selected", e.target.checked)}
              style={{ marginTop: 4 }}
            />
            <div style={{ flex: 1 }}>
              <input
                className={s.tableInput}
                value={row.name}
                onChange={e => updateRow(row.id, "name", e.target.value)}
                style={{ fontWeight: 'bold', fontSize: '1rem', width: '100%', marginBottom: 8 }}
                placeholder="שם התפוקה"
              />
              <textarea
                className={s.tableInput}
                value={row.description}
                onChange={e => updateRow(row.id, "description", e.target.value)}
                rows={4}
                style={{ width: '100%', resize: 'vertical', lineHeight: 1.6 }}
                placeholder="תיאור חבילת העבודה..."
              />
              {row.sizeCategory !== undefined && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text2)' }}>גודל:</span>
                  {SIZE_OPTIONS.map(opt => (
                    <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.875rem' }}>
                      <input
                        type="radio"
                        name={`size-${row.id}`}
                        checked={row.sizeCategory === opt.value}
                        onChange={() => updateRow(row.id, "sizeCategory", opt.value)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <button className={s.removeBtn} onClick={() => removeRow(row.id)} title="הסר">X</button>
          </div>
        </div>
      ))}

      <button className={s.addRowBtn} onClick={addRow}>+ הוסף תפוקה</button>

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
