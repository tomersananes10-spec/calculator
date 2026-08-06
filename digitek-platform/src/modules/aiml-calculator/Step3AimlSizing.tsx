import type { AimlState } from './types'
import type { AimlDispatch } from './useAimlCalculator'
import { AIML_ITEMS, AIML_SIZE_LABELS } from './data'
import { AIML_SIZES, fmtCurrency, grandTotal, rowTotal, countSelected, entryTotalQty } from './calc'
import s from '../takam-calculator/TakamCalculator.module.css'
import aiml from './AimlCalculator.module.css'

interface Props {
  state: AimlState
  dispatch: AimlDispatch
}

export function Step3AimlSizing({ state, dispatch }: Props) {
  const selected = AIML_ITEMS.filter(item => state.entries[item.id].checked)
  const total = grandTotal(state, AIML_ITEMS)

  function proceed() {
    dispatch({ type: 'GO_STEP', payload: 4 })
  }

  return (
    <div>
      <div className={s.stepHeader}>
        <h2>גודל וכמויות</h2>
        <p>קבע לכל תוצר כמה יחידות נדרשות מכל גודל — אפשר לשלב גדלים שונים באותו תוצר</p>
      </div>

      <div className={aiml.summaryBar}>
        <div className={aiml.summaryItem}>
          <span className={aiml.summaryLabel}>תוצרים שנבחרו</span>
          <span className={aiml.summaryValue}>{countSelected(state)}</span>
        </div>
        <div className={aiml.summaryItem}>
          <span className={aiml.summaryLabel}>סה"כ עלות מוערכת</span>
          <span className={aiml.summaryValue}>{fmtCurrency(total)}</span>
        </div>
      </div>

      {selected.length === 0 ? (
        <div className={s.cardBox} style={{ textAlign: 'center', color: 'var(--text3)' }}>
          לא נבחרו תוצרים. חזור לשלב הקודם ובחר לפחות תוצר אחד.
        </div>
      ) : (
        selected.map(item => {
          const entry = state.entries[item.id]
          const activeSizes = AIML_SIZES.filter(sz => (entry.qty[sz] || 0) > 0)
          return (
            <div key={item.id} className={aiml.sizingCard}>
              <div className={aiml.sizingCardHead}>
                <span className={aiml.sizingCardName}>{item.icon} {item.name}</span>
                <button
                  className={aiml.sizingRemoveBtn}
                  onClick={() => dispatch({ type: 'TOGGLE_CHECK', payload: item.id })}
                  aria-label="הסר תוצר"
                  title="הסר תוצר"
                >
                  ✕
                </button>
              </div>

              <div className={aiml.sizeQtyRows}>
                {AIML_SIZES.map(size => {
                  const qty = entry.qty[size] || 0
                  return (
                    <div key={size} className={`${aiml.sizeQtyRow} ${qty > 0 ? aiml.sizeQtyRowOn : ''}`}>
                      <div className={aiml.sizeQtyInfo}>
                        <span className={aiml.sizeQtyName}>{AIML_SIZE_LABELS[size]}</span>
                        <span className={aiml.sizeQtyPrice}>{fmtCurrency(item.prices[size])} / יח'</span>
                      </div>
                      <div className={aiml.qtyStepper}>
                        <button
                          className={aiml.qtyStepBtn}
                          onClick={() => dispatch({ type: 'SET_QTY', payload: { itemId: item.id, size, qty: qty - 1 } })}
                          disabled={qty === 0}
                          aria-label="הפחת כמות"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={0}
                          className={aiml.qtyInput}
                          value={qty}
                          onChange={e =>
                            dispatch({ type: 'SET_QTY', payload: { itemId: item.id, size, qty: +e.target.value || 0 } })
                          }
                        />
                        <button
                          className={aiml.qtyStepBtn}
                          onClick={() => dispatch({ type: 'SET_QTY', payload: { itemId: item.id, size, qty: qty + 1 } })}
                          aria-label="הוסף כמות"
                        >
                          +
                        </button>
                      </div>
                      <span className={aiml.sizeQtyLineTotal}>
                        {qty > 0 ? fmtCurrency(qty * item.prices[size]) : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>

              {activeSizes.length > 0 && (
                <div className={aiml.scopeBlock}>
                  {activeSizes.map(sz => (
                    <div key={sz}>
                      <span className={aiml.scopeTitle}>תכולת עבודה ({AIML_SIZE_LABELS[sz]}):</span>
                      <p className={aiml.scopeText}>{item.scope[sz]}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className={aiml.sizingFooter}>
                <span className={aiml.sizingPrice}>
                  {entryTotalQty(entry)} יחידות
                  {activeSizes.length > 1 ? ` · ${activeSizes.map(sz => `${entry.qty[sz]} ${AIML_SIZE_LABELS[sz]}`).join(' + ')}` : ''}
                </span>
                <span className={aiml.itemRowTotal}>{fmtCurrency(rowTotal(entry, item))}</span>
              </div>
            </div>
          )
        })
      )}

      <div className={s.navRow}>
        <button className={s.btnBack} onClick={() => dispatch({ type: 'GO_STEP', payload: 2 })}>
          → חזרה
        </button>
        <span className={s.stepBadge}>שלב 3 מתוך 4</span>
        <div className={s.navSpacer} />
        <button
          className={`${s.btn} ${s.btnPrimary}`}
          onClick={proceed}
          disabled={selected.length === 0}
        >
          הצג תוצאות ←
        </button>
      </div>
    </div>
  )
}
