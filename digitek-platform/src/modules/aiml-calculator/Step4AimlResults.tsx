import type { AimlState } from './types'
import type { AimlDispatch } from './useAimlCalculator'
import { AIML_ITEMS, AIML_SIZE_LABELS } from './data'
import { fmtCurrency, grandTotal, rowTotal, countSelected } from './calc'
import s from '../takam-calculator/TakamCalculator.module.css'

interface Props {
  state: AimlState
  dispatch: AimlDispatch
}

const VAT_RATE = 0.18

export function Step4AimlResults({ state, dispatch }: Props) {
  const selected = AIML_ITEMS.filter(item => state.entries[item.id].checked)
  const subtotal = grandTotal(state, AIML_ITEMS)
  const vat = subtotal * VAT_RATE
  const totalWithVat = subtotal + vat

  return (
    <div className={s.twoCol}>
      {/* LEFT: detailed breakdown */}
      <div className={s.leftPanel}>
        <div className={s.stepHeader}>
          <h2>תוצאות החישוב</h2>
          <p>פירוט מלא לפי תוצרים, גדלים וכמויות — סעיף 3.16</p>
        </div>

        <div className={s.panel}>
          <div className={s.panelHeader}>
            <h3 className={s.panelTitle}>פירוט תוצרי AI/ML</h3>
            <button
              className={s.editBtn}
              onClick={() => dispatch({ type: 'GO_STEP', payload: 3 })}
            >
              ערוך
            </button>
          </div>

          {selected.length === 0 ? (
            <div className={s.emptyMsg}>לא נבחרו תוצרים</div>
          ) : (
            <div className={s.tableWrap}>
              <table className={s.dataTable}>
                <thead>
                  <tr>
                    <th>תוצר</th>
                    <th>גודל</th>
                    <th>כמות</th>
                    <th>מחיר ליחידה</th>
                    <th>סה"כ</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.map(item => {
                    const entry = state.entries[item.id]
                    const qty = entry.baseQty + entry.extraQty
                    return (
                      <tr key={item.id}>
                        <td>{item.icon} {item.name}</td>
                        <td>
                          <span className={s.levelBadge}>{AIML_SIZE_LABELS[entry.size]}</span>
                        </td>
                        <td>{qty}</td>
                        <td>{fmtCurrency(item.prices[entry.size])}</td>
                        <td className={s.costCell}>{fmtCurrency(rowTotal(entry, item))}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: summary card */}
      <div className={s.rightPanel}>
        <div className={s.summaryCard}>
          <div className={s.summaryTitle}>סה"כ עלות הפרויקט</div>
          <div className={s.summaryGrand}>{fmtCurrency(subtotal)}</div>

          <div className={s.summaryBreakdown}>
            <div className={s.summaryRow}>
              <span>תוצרים</span>
              <span>{countSelected(state)}</span>
            </div>
            <div className={s.summaryRow}>
              <span>סך-הכל יחידות</span>
              <span>
                {selected.reduce((sum, item) => {
                  const entry = state.entries[item.id]
                  return sum + entry.baseQty + entry.extraQty
                }, 0)}
              </span>
            </div>
          </div>

          <div className={s.summaryDivider} />

          <div className={s.summaryVAT}>
            <span>מע"מ (18%)</span>
            <span>{fmtCurrency(vat)}</span>
          </div>
          <div className={s.summaryTotal}>
            <span>סה"כ כולל מע"מ</span>
            <span>{fmtCurrency(totalWithVat)}</span>
          </div>

          <div className={s.summaryActions}>
            <button
              className={s.summaryBtn}
              onClick={() => dispatch({ type: 'GO_STEP', payload: 3 })}
            >
              ערוך גדלים וכמויות
            </button>
            <button
              className={s.summaryBtnGhost}
              onClick={() => {
                if (confirm('לאפס את כל הבחירות?')) {
                  dispatch({ type: 'RESET' })
                  dispatch({ type: 'GO_STEP', payload: 1 })
                }
              }}
            >
              חישוב חדש
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
