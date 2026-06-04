import { useState } from 'react'
import { useAimlCalculator } from './useAimlCalculator'
import { AIML_ITEMS } from './data'
import { fmtCurrency, grandTotal, rowTotal, countSelected } from './calc'
import type { AimlItem, AimlSize } from './types'
import s from './AimlCalculator.module.css'

interface TipState {
  item: AimlItem
  top: number
  left: number
}

export function AimlCalculator() {
  const [state, dispatch] = useAimlCalculator()
  const [tip, setTip] = useState<TipState | null>(null)

  const total = grandTotal(state, AIML_ITEMS)
  const selected = countSelected(state)

  function openTip(e: React.MouseEvent<HTMLButtonElement>, item: AimlItem) {
    const rect = e.currentTarget.getBoundingClientRect()
    setTip({ item, top: rect.bottom + 8, left: Math.max(10, rect.left - 200) })
  }

  function resetAll() {
    if (confirm('לאפס את כל הבחירות?')) dispatch({ type: 'RESET' })
  }

  return (
    <div className={s.wrap}>
      <div className={s.topbar}>
        <h1 className={s.title}>
          מחשבון AI/ML
          <span className={s.subtitle}> · 3.16 ייעוץ ויישום AI/ML בענן · {AIML_ITEMS.length} תוצרים</span>
        </h1>
        <div className={s.totalPill}>
          {selected > 0 ? `${selected} נבחרו · ` : ''}סה"כ: {fmtCurrency(total)}
        </div>
      </div>

      <div className={s.panel}>
        <div className={s.projectRow}>
          <label>
            <span>שם פרויקט</span>
            <input
              type="text"
              placeholder="פלטפורמת AI/ML משרדית"
              value={state.project.name}
              onChange={e => dispatch({ type: 'SET_PROJECT_NAME', payload: e.target.value })}
            />
          </label>
          <label>
            <span>משרד / יחידה</span>
            <input
              type="text"
              placeholder="משרד הביטחון"
              value={state.project.ministry}
              onChange={e => dispatch({ type: 'SET_MINISTRY', payload: e.target.value })}
            />
          </label>
        </div>

        <table className={s.table}>
          <thead>
            <tr>
              <th className={s.ck}></th>
              <th>תוצר</th>
              <th>גודל</th>
              <th>כמות בסיס</th>
              <th>+ נוספת</th>
              <th>מחיר ליחידה</th>
              <th>סה"כ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {AIML_ITEMS.map(item => {
              const entry = state.entries[item.id]
              const total = rowTotal(entry, item)
              return (
                <tr key={item.id} className={entry.checked ? s.checked : s.unchecked}>
                  <td className={s.ck}>
                    <input
                      type="checkbox"
                      checked={entry.checked}
                      onChange={() => dispatch({ type: 'TOGGLE_CHECK', payload: item.id })}
                      aria-label={`בחר ${item.name}`}
                    />
                  </td>
                  <td className={s.name}>
                    {item.icon} {item.name}
                  </td>
                  <td>
                    <select
                      value={entry.size}
                      onChange={e =>
                        dispatch({ type: 'SET_SIZE', payload: { itemId: item.id, size: e.target.value as AimlSize } })
                      }
                    >
                      <option value="small">קטן</option>
                      <option value="medium">בינוני</option>
                      <option value="large">גדול</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      value={entry.baseQty}
                      onChange={e =>
                        dispatch({ type: 'SET_BASE_QTY', payload: { itemId: item.id, qty: +e.target.value || 0 } })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      value={entry.extraQty}
                      onChange={e =>
                        dispatch({ type: 'SET_EXTRA_QTY', payload: { itemId: item.id, qty: +e.target.value || 0 } })
                      }
                    />
                  </td>
                  <td className={s.price}>{fmtCurrency(item.prices[entry.size])}</td>
                  <td className={s.rowTotal}>{entry.checked ? fmtCurrency(total) : '—'}</td>
                  <td>
                    <button
                      type="button"
                      className={s.infoBtn}
                      onMouseEnter={e => openTip(e, item)}
                      onMouseLeave={() => setTip(null)}
                      onFocus={e => openTip(e as unknown as React.MouseEvent<HTMLButtonElement>, item)}
                      onBlur={() => setTip(null)}
                      title="תיאור תכולה"
                      aria-label={`תיאור תכולה — ${item.name}`}
                    >
                      ℹ
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className={s.grand}>
          <span className={s.grandLabel}>סה"כ עלות הפרויקט</span>
          <span className={s.grandAmount}>{fmtCurrency(total)}</span>
        </div>

        <div className={s.actions}>
          <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={resetAll}>
            איפוס
          </button>
        </div>
      </div>

      {tip && (
        <div className={s.tip} style={{ top: tip.top, left: tip.left }}>
          <div className={s.tipSize}>קטן · {fmtCurrency(tip.item.prices.small)}</div>
          {tip.item.scope.small}
          <div className={s.tipSize}>בינוני · {fmtCurrency(tip.item.prices.medium)}</div>
          {tip.item.scope.medium}
          <div className={s.tipSize}>גדול · {fmtCurrency(tip.item.prices.large)}</div>
          {tip.item.scope.large}
        </div>
      )}
    </div>
  )
}
