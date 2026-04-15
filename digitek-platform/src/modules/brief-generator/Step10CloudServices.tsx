import type { WizardState, CloudServiceItem } from './types'
import s from './BriefWizard.module.css'

interface Props {
  state: WizardState
  onChangeCloudServices: (items: CloudServiceItem[]) => void
  onNext: () => void
  onBack: () => void
  onSave: () => void
}

const UNIT_LABELS: Record<CloudServiceItem['unitType'], string> = {
  per_month: 'לחודש',
  per_hour:  'לשעה',
  per_gb:    'לGB',
  per_user:  'למשתמש',
}

function newItem(): CloudServiceItem {
  return {
    id: crypto.randomUUID(),
    serviceId: '',
    serviceName: '',
    provider: 'GCP',
    unitType: 'per_month',
    quantity: 1,
    months: 12,
    discountPct: 0,
    monthlyCost: 0,
  }
}

function calcTotal(item: CloudServiceItem): number {
  const base = item.monthlyCost * item.quantity * item.months
  return base * (1 - item.discountPct / 100)
}

export function Step10CloudServices({ state, onChangeCloudServices, onNext, onBack, onSave }: Props) {
  const items = state.cloudServices

  function addItem() {
    onChangeCloudServices([...items, newItem()])
  }

  function updateItem(id: string, patch: Partial<CloudServiceItem>) {
    onChangeCloudServices(items.map(item => item.id === id ? { ...item, ...patch } : item))
  }

  function removeItem(id: string) {
    onChangeCloudServices(items.filter(item => item.id !== id))
  }

  const grandTotal = items.reduce((sum, item) => sum + calcTotal(item), 0)

  return (
    <div>
      <div className={s.stepHeader}>
        <h2>שירותי ענן</h2>
        <p>בחר שירותי ענן מרובד 5 לשילוב בבריף. שלב זה אופציונלי.</p>
      </div>

      {/* Info box */}
      <div className={s.cloudInfoBox}>
        <span>☁️</span>
        <span>
          לחיפוש שירותים בקטלוג, בקר ב
          <a href="/layer5" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-light)', marginRight: 4 }}>
            רובד 5 ←
          </a>
        </span>
      </div>

      {/* Table */}
      {items.length > 0 && (
        <div className={s.tableWrap}>
          <table className={s.cloudTable}>
            <thead>
              <tr>
                <th>שם שירות</th>
                <th>ספק</th>
                <th>סוג יחידה</th>
                <th>כמות</th>
                <th>חודשים</th>
                <th>הנחה %</th>
                <th>עלות חודשית ₪</th>
                <th>סה״כ ₪</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td>
                    <input
                      className={s.tableInput}
                      value={item.serviceName}
                      onChange={e => updateItem(item.id, { serviceName: e.target.value })}
                      placeholder="שם השירות"
                    />
                  </td>
                  <td>
                    <select
                      className={s.tableInput}
                      style={{ width: 80 }}
                      value={item.provider}
                      onChange={e => updateItem(item.id, { provider: e.target.value as 'GCP' | 'AWS' })}
                    >
                      <option value="GCP">GCP</option>
                      <option value="AWS">AWS</option>
                    </select>
                  </td>
                  <td>
                    <select
                      className={s.tableInput}
                      style={{ width: 110 }}
                      value={item.unitType}
                      onChange={e => updateItem(item.id, { unitType: e.target.value as CloudServiceItem['unitType'] })}
                    >
                      {(Object.keys(UNIT_LABELS) as CloudServiceItem['unitType'][]).map(k => (
                        <option key={k} value={k}>{UNIT_LABELS[k]}</option>
                      ))}
                    </select>
                  </td>
                  <td><input className={s.tableInputSm} type="number" min={1} value={item.quantity} onChange={e => updateItem(item.id, { quantity: +e.target.value })} /></td>
                  <td><input className={s.tableInputSm} type="number" min={1} max={60} value={item.months} onChange={e => updateItem(item.id, { months: +e.target.value })} /></td>
                  <td><input className={s.tableInputSm} type="number" min={0} max={100} value={item.discountPct} onChange={e => updateItem(item.id, { discountPct: +e.target.value })} /></td>
                  <td><input className={s.tableInputSm} type="number" min={0} value={item.monthlyCost} onChange={e => updateItem(item.id, { monthlyCost: +e.target.value })} /></td>
                  <td style={{ fontWeight: 600, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                    {calcTotal(item).toLocaleString('he-IL', { maximumFractionDigits: 0 })} ₪
                  </td>
                  <td><button className={s.removeBtn} onClick={() => removeItem(item.id)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {items.length === 0 && (
        <div className={s.emptyNote}>
          ☁️ לא נוספו שירותי ענן — ניתן לדלג לשלב הבא
        </div>
      )}

      <button className={s.addRowBtn} onClick={addItem}>+ הוסף שירות ענן</button>

      {items.length > 0 && (
        <div className={s.cloudTotal}>
          <span>סה״כ שירותי ענן:</span>
          <strong>{grandTotal.toLocaleString('he-IL', { maximumFractionDigits: 0 })} ₪</strong>
        </div>
      )}

      {/* Navigation */}
      <div className={s.navBtns}>
        <button className={s.btnSecondary} onClick={onBack}>→ הקודם</button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className={s.btnSecondary} onClick={onSave}>שמור טיוטה</button>
          <button className={s.btnPrimary} onClick={onNext}>הבא ←</button>
        </div>
      </div>
    </div>
  )
}
