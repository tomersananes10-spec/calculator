import type { AimlState } from './types'
import type { AimlDispatch } from './useAimlCalculator'
import { AIML_ITEMS, AIML_SIZE_LABELS } from './data'
import { computeBreakdown, fmtCurrency, rowTotal, countSelected } from './calc'
import s from '../takam-calculator/TakamCalculator.module.css'

interface Props {
  state: AimlState
  dispatch: AimlDispatch
}

export function Step4AimlResults({ state, dispatch }: Props) {
  const selected = AIML_ITEMS.filter(item => state.entries[item.id].checked)
  const b = computeBreakdown(state, AIML_ITEMS)

  function bumpRisk(delta: number) {
    dispatch({ type: 'SET_RISK_PCT', payload: state.riskPct + delta })
  }
  function bumpMatching(delta: number) {
    dispatch({ type: 'SET_MATCHING_PCT', payload: state.matchingPct + delta })
  }

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

        {/* Matching + Risk controls */}
        <div className={s.panel}>
          <div className={s.panelHeader}>
            <h3 className={s.panelTitle}>תוספות חישוב</h3>
          </div>

          <div className={s.controlsGrid}>
            <div className={s.toggleRow}>
              <div className={s.toggleInfo}>
                <span className={s.toggleName}>מאצ'ינג מערך</span>
                <span className={s.toggleSub}>תוספת אחוז לכיסוי תקורות / רכש משלים</span>
              </div>
              <button
                type="button"
                className={`${s.sw} ${state.matchingOn ? s.swOn : ''}`}
                onClick={() => dispatch({ type: 'TOGGLE_MATCHING' })}
                aria-label="הפעל מאצ'ינג"
              />
            </div>

            {state.matchingOn && (
              <div className={s.controlItem}>
                <span className={s.controlLabel}>אחוז מאצ'ינג</span>
                <div className={s.pctStepper}>
                  <button className={s.stepBtn} onClick={() => bumpMatching(-5)} aria-label="הפחת">−</button>
                  <div className={s.pctInputWrap}>
                    <input
                      className={s.pctInput}
                      type="number"
                      min={0}
                      max={100}
                      value={state.matchingPct}
                      onChange={e => dispatch({ type: 'SET_MATCHING_PCT', payload: +e.target.value || 0 })}
                    />
                    <span className={s.pctSign}>%</span>
                  </div>
                  <button className={s.stepBtn} onClick={() => bumpMatching(5)} aria-label="הוסף">+</button>
                </div>
              </div>
            )}

            <div className={s.controlItem}>
              <span className={s.controlLabel}>תוספת סיכון</span>
              <div className={s.pctStepper}>
                <button className={s.stepBtn} onClick={() => bumpRisk(-5)} aria-label="הפחת">−</button>
                <div className={s.pctInputWrap}>
                  <input
                    className={s.pctInput}
                    type="number"
                    min={0}
                    max={100}
                    value={state.riskPct}
                    onChange={e => dispatch({ type: 'SET_RISK_PCT', payload: +e.target.value || 0 })}
                  />
                  <span className={s.pctSign}>%</span>
                </div>
                <button className={s.stepBtn} onClick={() => bumpRisk(5)} aria-label="הוסף">+</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: summary card */}
      <div className={s.rightPanel}>
        <div className={s.summaryCard}>
          <div className={s.summaryTitle}>סה"כ עלות הפרויקט</div>
          <div className={s.summaryGrand}>{fmtCurrency(b.beforeVat)}</div>

          <div className={s.summaryBreakdown}>
            <div className={s.summaryRow}>
              <span>תוצרים נבחרים</span>
              <span>{countSelected(state)}</span>
            </div>
            <div className={s.summaryRow}>
              <span>סכום בסיס</span>
              <span>{fmtCurrency(b.subtotal)}</span>
            </div>
            {state.matchingOn && b.matchingDelta > 0 && (
              <div className={s.summaryRow}>
                <span>מאצ'ינג ({state.matchingPct}%)</span>
                <span>+{fmtCurrency(b.matchingDelta)}</span>
              </div>
            )}
            {b.riskDelta > 0 && (
              <div className={s.summaryRow}>
                <span>סיכון ({state.riskPct}%)</span>
                <span>+{fmtCurrency(b.riskDelta)}</span>
              </div>
            )}
            <div className={s.summaryRow}>
              <span>פריסה ל-{state.period} חודשים</span>
              <span>{fmtCurrency(b.perMonth)} / חודש</span>
            </div>
          </div>

          <div className={s.summaryDivider} />

          <div className={s.summaryVAT}>
            <span>מע"מ (18%)</span>
            <span>{fmtCurrency(b.vat)}</span>
          </div>
          <div className={s.summaryTotal}>
            <span>סה"כ כולל מע"מ</span>
            <span>{fmtCurrency(b.withVat)}</span>
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
