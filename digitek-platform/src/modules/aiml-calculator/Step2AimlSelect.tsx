import { useState } from 'react'
import type { AimlState, AimlItem } from './types'
import type { AimlDispatch } from './useAimlCalculator'
import { AIML_ITEMS, AIML_SIZE_LABELS } from './data'
import { fmtCurrency, countSelected } from './calc'
import s from '../takam-calculator/TakamCalculator.module.css'
import aiml from './AimlCalculator.module.css'

interface Props {
  state: AimlState
  dispatch: AimlDispatch
}

interface TipState {
  visible: boolean
  item: AimlItem | null
  x: number
  y: number
}

function getPriceRange(item: AimlItem): string {
  const vals = Object.values(item.prices)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  return `${fmtCurrency(min)} – ${fmtCurrency(max)}`
}

export function Step2AimlSelect({ state, dispatch }: Props) {
  const [tip, setTip] = useState<TipState>({ visible: false, item: null, x: 0, y: 0 })

  function showInfo(e: React.MouseEvent, item: AimlItem) {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setTip({ visible: true, item, x: rect.left, y: rect.bottom + 6 })
  }

  function hideInfo() {
    setTip(t => ({ ...t, visible: false }))
  }

  function proceed() {
    if (countSelected(state) === 0) return
    dispatch({ type: 'GO_STEP', payload: 3 })
  }

  const selectedCount = countSelected(state)

  return (
    <div onClick={hideInfo}>
      <div className={s.stepHeader}>
        <h2>בחירת תוצרי AI/ML</h2>
        <p>בחר את התוצרים הרלוונטיים לפרויקט שלך — לפי סעיף 3.16 (16 תוצרים זמינים)</p>
      </div>

      <div className={s.rolesGrid}>
        {AIML_ITEMS.map(item => {
          const entry = state.entries[item.id]
          const selected = entry.checked
          return (
            <div
              key={item.id}
              className={`${s.roleCard} ${selected ? s.roleCardSelected : ''}`}
              onClick={() => dispatch({ type: 'TOGGLE_CHECK', payload: item.id })}
            >
              <div className={s.roleCardTop}>
                <div className={s.roleCheckbox}>{selected ? '✓' : ''}</div>
                <span className={s.roleName}>{item.icon} {item.name}</span>
                <button
                  type="button"
                  className={s.roleInfoBtn}
                  onClick={e => showInfo(e, item)}
                  aria-label="תיאור תכולה"
                >
                  ℹ
                </button>
              </div>
              <span className={s.rolePriceRange}>{getPriceRange(item)}</span>
            </div>
          )
        })}
      </div>

      <div className={s.navRow}>
        <button className={s.btnBack} onClick={() => dispatch({ type: 'GO_STEP', payload: 1 })}>
          → חזרה
        </button>
        <span className={s.stepBadge}>שלב 2 מתוך 4</span>
        <div className={s.navSpacer} />
        <button
          className={`${s.btn} ${s.btnPrimary}`}
          onClick={proceed}
          disabled={selectedCount === 0}
        >
          {selectedCount === 0 ? 'בחר לפחות תוצר אחד' : `המשך עם ${selectedCount} תוצרים ←`}
        </button>
      </div>

      {tip.visible && tip.item && (
        <div
          className={aiml.scopeTip}
          style={{ left: tip.x, top: tip.y }}
        >
          <div className={aiml.scopeTipSize}>
            {AIML_SIZE_LABELS.small} · {fmtCurrency(tip.item.prices.small)}
          </div>
          {tip.item.scope.small}
          <div className={aiml.scopeTipSize}>
            {AIML_SIZE_LABELS.medium} · {fmtCurrency(tip.item.prices.medium)}
          </div>
          {tip.item.scope.medium}
          <div className={aiml.scopeTipSize}>
            {AIML_SIZE_LABELS.large} · {fmtCurrency(tip.item.prices.large)}
          </div>
          {tip.item.scope.large}
        </div>
      )}
    </div>
  )
}
