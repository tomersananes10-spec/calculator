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

function getPriceRange(item: AimlItem): string {
  const vals = Object.values(item.prices)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  return `${fmtCurrency(min)} – ${fmtCurrency(max)}`
}

export function Step2AimlSelect({ state, dispatch }: Props) {
  const [scopeItem, setScopeItem] = useState<AimlItem | null>(null)

  function openScope(e: React.MouseEvent, item: AimlItem) {
    e.stopPropagation()
    setScopeItem(item)
  }

  function proceed() {
    if (countSelected(state) === 0) return
    dispatch({ type: 'GO_STEP', payload: 3 })
  }

  const selectedCount = countSelected(state)

  return (
    <div>
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
                  onClick={e => openScope(e, item)}
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

      {scopeItem && (
        <>
          <div className={aiml.scopeOverlay} onClick={() => setScopeItem(null)} />
          <div className={aiml.scopeModal} role="dialog" aria-labelledby="scope-title">
            <button
              type="button"
              className={aiml.scopeCloseBtn}
              onClick={() => setScopeItem(null)}
              aria-label="סגור"
              title="סגור"
            >
              ✕
            </button>
            <div className={aiml.scopeModalHead}>
              <span className={aiml.scopeModalIcon}>{scopeItem.icon}</span>
              <h3 id="scope-title" className={aiml.scopeModalTitle}>{scopeItem.name}</h3>
            </div>
            <p className={aiml.scopeModalSub}>תכולת עבודה לכל גודל — לפי סעיף 3.16</p>

            <div className={aiml.scopeModalBody}>
              {(['small', 'medium', 'large'] as const).map(size => (
                <div key={size} className={aiml.scopeSizeBlock}>
                  <div className={aiml.scopeSizeHead}>
                    <span className={aiml.scopeSizeName}>{AIML_SIZE_LABELS[size]}</span>
                    <span className={aiml.scopeSizePrice}>{fmtCurrency(scopeItem.prices[size])}</span>
                  </div>
                  <p className={aiml.scopeSizeText}>{scopeItem.scope[size]}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
