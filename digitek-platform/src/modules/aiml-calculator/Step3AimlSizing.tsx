import type { AimlQty, AimlSize, AimlState } from './types'
import type { AimlDispatch } from './useAimlCalculator'
import { AIML_ITEMS, AIML_SIZE_LABELS } from './data'
import { AIML_SIZES, computeBreakdown, fmtCurrency, rowTotal, countSelected, entryTotalQty, sizeQtyTotal } from './calc'
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
  const b = computeBreakdown(state, AIML_ITEMS)
  const totalUnits = selected.reduce((sum, item) => sum + entryTotalQty(state.entries[item.id]), 0)

  const budget = state.budgetTarget
  const overBudget = budget > 0 && b.beforeVat > budget
  const budgetPct = budget > 0 ? Math.min(100, (b.beforeVat / budget) * 100) : 0

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

      <div className={s.twoCol}>
        {/* LEFT: item cards */}
        <div className={s.leftPanel}>
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

        {/* RIGHT: sticky live summary (mockup C) */}
        <div className={`${s.rightPanel} ${aiml.sideCol}`}>
          <div className={s.summaryCard}>
            <div className={s.summaryTitle}>סה"כ עלות מוערכת</div>
            <div className={s.summaryGrand}>
              <span key={b.beforeVat} className={aiml.pulseVal}>{fmtCurrency(b.beforeVat)}</span>
            </div>

            <div className={`${s.summaryBreakdown} ${aiml.sideDetail}`}>
              <div className={s.summaryRow}>
                <span>תוצרים נבחרים</span>
                <span>{countSelected(state)}</span>
              </div>
              <div className={s.summaryRow}>
                <span>יחידות</span>
                <span>{totalUnits}</span>
              </div>
              <div className={s.summaryRow}>
                <span>מע"מ (18%)</span>
                <span>{fmtCurrency(b.vat)}</span>
              </div>
              <div className={s.summaryRow}>
                <span>סה"כ כולל מע"מ</span>
                <span>{fmtCurrency(b.withVat)}</span>
              </div>
            </div>

            <div className={`${s.summaryDivider} ${aiml.sideDetail}`} />

            <div className={aiml.budgetBlock}>
              <label className={s.summaryTitle} htmlFor="aimlBudget">תקציב יעד (אלפי ₪)</label>
              <input
                id="aimlBudget"
                type="number"
                min={0}
                className={aiml.budgetInput}
                placeholder="למשל 500"
                value={budget > 0 ? Math.round(budget / 1000) : ''}
                onChange={e => dispatch({ type: 'SET_BUDGET_TARGET', payload: (+e.target.value || 0) * 1000 })}
              />
              {budget > 0 && (
                <>
                  <div className={aiml.budgetBarWrap}>
                    <div
                      className={`${aiml.budgetBarFill} ${overBudget ? aiml.budgetOver : budgetPct > 85 ? aiml.budgetWarn : ''}`}
                      style={{ width: `${budgetPct}%` }}
                    />
                  </div>
                  <div className={aiml.budgetStatus}>
                    {overBudget
                      ? `⚠ חריגה של ${fmtCurrency(b.beforeVat - budget)}`
                      : `✓ ${Math.round(budgetPct)}% מהתקציב — נותרו ${fmtCurrency(budget - b.beforeVat)}`}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
