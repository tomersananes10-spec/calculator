import type { AimlState, AimlSize } from './types'
import type { AimlDispatch } from './useAimlCalculator'
import { AIML_ITEMS, AIML_SIZE_LABELS } from './data'
import { fmtCurrency, grandTotal, rowTotal, countSelected } from './calc'
import s from '../takam-calculator/TakamCalculator.module.css'
import aiml from './AimlCalculator.module.css'

interface Props {
  state: AimlState
  dispatch: AimlDispatch
}

const SIZES: AimlSize[] = ['small', 'medium', 'large']

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
        <p>קבע לכל תוצר את הגודל (קטן / בינוני / גדול) ואת הכמות הנדרשת</p>
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

              <div className={aiml.sizePills}>
                {SIZES.map(size => (
                  <button
                    key={size}
                    className={`${aiml.sizePill} ${entry.size === size ? aiml.sizePillOn : ''}`}
                    onClick={() => dispatch({ type: 'SET_SIZE', payload: { itemId: item.id, size } })}
                  >
                    {AIML_SIZE_LABELS[size]} · {fmtCurrency(item.prices[size])}
                  </button>
                ))}
              </div>

              <div className={aiml.itemScope}>{item.scope[entry.size]}</div>

              <div className={aiml.qtyRow}>
                <div className={aiml.qtyField}>
                  <label className={aiml.qtyLabel}>כמות בסיס</label>
                  <input
                    type="number"
                    min={0}
                    className={aiml.qtyInput}
                    value={entry.baseQty}
                    onChange={e =>
                      dispatch({ type: 'SET_BASE_QTY', payload: { itemId: item.id, qty: +e.target.value || 0 } })
                    }
                  />
                </div>
                <div className={aiml.qtyField}>
                  <label className={aiml.qtyLabel}>כמות נוספת</label>
                  <input
                    type="number"
                    min={0}
                    className={aiml.qtyInput}
                    value={entry.extraQty}
                    onChange={e =>
                      dispatch({ type: 'SET_EXTRA_QTY', payload: { itemId: item.id, qty: +e.target.value || 0 } })
                    }
                  />
                </div>
              </div>

              <div className={aiml.sizingFooter}>
                <span className={aiml.sizingPrice}>
                  ({entry.baseQty + entry.extraQty}) × {fmtCurrency(item.prices[entry.size])}
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
