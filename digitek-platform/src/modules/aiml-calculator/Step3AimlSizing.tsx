import type { AimlQty, AimlSize, AimlState } from './types'
import type { AimlDispatch } from './useAimlCalculator'
import { AIML_ITEMS, AIML_SIZE_LABELS } from './data'
import { AIML_SIZES, fmtCurrency, grandTotal, rowTotal, countSelected, entryTotalQty, sizeQtyTotal } from './calc'
import s from '../takam-calculator/TakamCalculator.module.css'
import aiml from './AimlCalculator.module.css'

interface Props {
  state: AimlState
  dispatch: AimlDispatch
}

interface StepperProps {
  value: number
  onChange: (qty: number) => void
  ariaLabel: string
  shortLabel: string
}

function QtyStepper({ value, onChange, ariaLabel, shortLabel }: StepperProps) {
  return (
    <div className={aiml.qtyStepper} data-label={shortLabel}>
      <button
        className={aiml.qtyStepBtn}
        onClick={() => onChange(value - 1)}
        disabled={value === 0}
        aria-label={`הפחת ${ariaLabel}`}
      >
        −
      </button>
      <input
        type="number"
        min={0}
        className={aiml.qtyInput}
        value={value}
        onChange={e => onChange(+e.target.value || 0)}
        aria-label={ariaLabel}
      />
      <button className={aiml.qtyStepBtn} onClick={() => onChange(value + 1)} aria-label={`הוסף ${ariaLabel}`}>
        +
      </button>
    </div>
  )
}

export function Step3AimlSizing({ state, dispatch }: Props) {
  const selected = AIML_ITEMS.filter(item => state.entries[item.id].checked)
  const total = grandTotal(state, AIML_ITEMS)

  function setQty(itemId: string, size: AimlSize, field: keyof AimlQty, qty: number) {
    dispatch({ type: 'SET_QTY', payload: { itemId, size, field, qty } })
  }

  function proceed() {
    dispatch({ type: 'GO_STEP', payload: 4 })
  }

  return (
    <div>
      <div className={s.stepHeader}>
        <h2>גודל וכמויות</h2>
        <p>קבע לכל תוצר כמה יחידות נדרשות מכל גודל — כמות בסיס + כמות אפשרית נוספת. אפשר לשלב גדלים שונים באותו תוצר</p>
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
          const activeSizes = AIML_SIZES.filter(sz => sizeQtyTotal(entry, sz) > 0)
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
                <div className={aiml.sizeQtyHeader}>
                  <span />
                  <span className={aiml.sizeQtyColLabel}>כמות בסיס</span>
                  <span className={aiml.sizeQtyColLabel}>כמות נוספת</span>
                  <span className={aiml.sizeQtyColLabel}>סה"כ</span>
                </div>
                {AIML_SIZES.map(size => {
                  const q = entry.qty[size]
                  const sizeTotal = q.base + q.extra
                  return (
                    <div key={size} className={`${aiml.sizeQtyRow} ${sizeTotal > 0 ? aiml.sizeQtyRowOn : ''}`}>
                      <div className={aiml.sizeQtyInfo}>
                        <span className={aiml.sizeQtyName}>{AIML_SIZE_LABELS[size]}</span>
                        <span className={aiml.sizeQtyPrice}>{fmtCurrency(item.prices[size])} / יח'</span>
                      </div>
                      <QtyStepper
                        value={q.base}
                        onChange={qty => setQty(item.id, size, 'base', qty)}
                        ariaLabel={`כמות בסיס — ${AIML_SIZE_LABELS[size]}`}
                        shortLabel="בסיס"
                      />
                      <QtyStepper
                        value={q.extra}
                        onChange={qty => setQty(item.id, size, 'extra', qty)}
                        ariaLabel={`כמות נוספת — ${AIML_SIZE_LABELS[size]}`}
                        shortLabel="נוספת"
                      />
                      <span className={aiml.sizeQtyLineTotal}>
                        {sizeTotal > 0 ? fmtCurrency(sizeTotal * item.prices[size]) : '—'}
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
                  {activeSizes.length > 0
                    ? ` · ${activeSizes.map(sz => `${sizeQtyTotal(entry, sz)} ${AIML_SIZE_LABELS[sz]}`).join(' + ')}`
                    : ''}
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
