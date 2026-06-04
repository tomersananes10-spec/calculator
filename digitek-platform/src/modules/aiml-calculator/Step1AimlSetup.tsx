import { useState } from 'react'
import type { AimlState } from './types'
import type { AimlDispatch } from './useAimlCalculator'
import s from '../takam-calculator/TakamCalculator.module.css'

interface Props {
  state: AimlState
  dispatch: AimlDispatch
}

export function Step1AimlSetup({ state, dispatch }: Props) {
  const [nameError, setNameError] = useState(false)
  const [ministryError, setMinistryError] = useState(false)

  function proceed() {
    const missingName = !state.project.name.trim()
    const missingMinistry = !state.project.ministry.trim()
    setNameError(missingName)
    setMinistryError(missingMinistry)
    if (missingName || missingMinistry) return
    dispatch({ type: 'GO_STEP', payload: 2 })
  }

  return (
    <div>
      <div className={s.stepHeader}>
        <h2>הגדרת פרויקט</h2>
        <p>מלא את פרטי הפרויקט לפני שמתחילים לבחור תוצרי AI/ML</p>
      </div>

      <div className={s.cardBox}>
        <div className={s.field}>
          <label className={s.fieldLabel}>
            שם הפרויקט <span className={s.required}>*</span>
          </label>
          <input
            className={`${s.input} ${nameError ? s.inputError : ''}`}
            placeholder="לדוגמה: פלטפורמת AI/ML משרדית"
            value={state.project.name}
            onChange={e => {
              dispatch({ type: 'SET_PROJECT_NAME', payload: e.target.value })
              if (e.target.value.trim()) setNameError(false)
            }}
            onKeyDown={e => e.key === 'Enter' && proceed()}
          />
          {nameError && <span className={s.fieldError}>שם פרויקט הוא שדה חובה</span>}
        </div>
        <div className={s.field}>
          <label className={s.fieldLabel}>
            משרד / גוף מזמין <span className={s.required}>*</span>
          </label>
          <input
            className={`${s.input} ${ministryError ? s.inputError : ''}`}
            placeholder="לדוגמה: משרד הביטחון"
            value={state.project.ministry}
            onChange={e => {
              dispatch({ type: 'SET_MINISTRY', payload: e.target.value })
              if (e.target.value.trim()) setMinistryError(false)
            }}
            onKeyDown={e => e.key === 'Enter' && proceed()}
          />
          {ministryError && <span className={s.fieldError}>משרד / גוף מזמין הוא שדה חובה</span>}
        </div>
      </div>

      <div className={s.navRow}>
        <span className={s.stepBadge}>שלב 1 מתוך 4</span>
        <div className={s.navSpacer} />
        <button className={`${s.btn} ${s.btnPrimary}`} onClick={proceed}>
          בחר תוצרים ←
        </button>
      </div>
    </div>
  )
}
