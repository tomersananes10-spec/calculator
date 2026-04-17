import { useState, useEffect, useRef } from 'react'
import type { CalcState, CalcAction } from './types'
import s from './TakamCalculator.module.css'

interface Props {
  state: CalcState
  dispatch: React.Dispatch<CalcAction>
}

const PERIOD_LABELS: Record<number, string> = { 6: '6 חודשים', 12: 'שנה', 24: 'שנתיים' }

export function Step1Setup({ state, dispatch }: Props) {
  const [nameError, setNameError] = useState(false)
  const [ministryError, setMinistryError] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const showHint = state.aiNeedsFill

  useEffect(() => {
    if (showHint) nameRef.current?.focus()
  }, [showHint])

  useEffect(() => {
    if (showHint && state.project.name.trim() && state.project.ministry.trim()) {
      dispatch({ type: 'SET_AI_NEEDS_FILL', payload: false })
      dispatch({ type: 'GO_STEP', payload: 3 })
    }
  }, [showHint, state.project.name, state.project.ministry, dispatch])

  function proceed() {
    const missingName = !state.project.name.trim()
    const missingMinistry = !state.project.ministry.trim()
    setNameError(missingName)
    setMinistryError(missingMinistry)
    if (missingName || missingMinistry) return

    if (showHint) dispatch({ type: 'SET_AI_NEEDS_FILL', payload: false })
    dispatch({ type: 'GO_STEP', payload: state.selectedIds.size > 0 ? 3 : 2 })
  }

  return (
    <div>
      <div className={s.stepHeader}>
        <h2>הגדרת פרויקט</h2>
        <p>מלא את פרטי הפרויקט לפני שמתחילים לבחור תפקידים</p>
      </div>

      {showHint && (
        <div className={s.aiHintBanner}>
          <span>✨</span>
          <span>היועץ בחר תפקידים! נשאר רק למלא את הפרטים למטה ונמשיך אוטומטית</span>
        </div>
      )}

      <div className={s.cardBox}>
        <div className={s.field}>
          <label className={s.fieldLabel}>
            שם הפרויקט <span className={s.required}>*</span>
          </label>
          <input
            ref={nameRef}
            className={`${s.input} ${(nameError || (showHint && !state.project.name.trim())) ? s.inputError : ''}`}
            placeholder="לדוגמה: פרויקט דיגיטציה 2025"
            value={state.project.name}
            onChange={e => {
              dispatch({ type: 'SET_PROJECT', payload: { ...state.project, name: e.target.value } })
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
            className={`${s.input} ${(ministryError || (showHint && !state.project.ministry.trim())) ? s.inputError : ''}`}
            placeholder="לדוגמה: משרד הפנים"
            value={state.project.ministry}
            onChange={e => {
              dispatch({ type: 'SET_PROJECT', payload: { ...state.project, ministry: e.target.value } })
              if (e.target.value.trim()) setMinistryError(false)
            }}
            onKeyDown={e => e.key === 'Enter' && proceed()}
          />
          {ministryError && <span className={s.fieldError}>משרד / גוף מזמין הוא שדה חובה</span>}
        </div>
      </div>

      <div className={s.cardBox}>
        <div className={s.field}>
          <label className={s.fieldLabel}>תקופת התקשרות</label>
          <div className={s.seg} id="periodSeg">
            {([6, 12, 24] as const).map(p => (
              <button
                key={p}
                className={`${s.segBtn} ${state.period === p ? s.segBtnOn : ''}`}
                onClick={() => dispatch({ type: 'SET_PERIOD', payload: p })}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

      </div>

      <div className={s.navRow}>
        <span className={s.stepBadge}>שלב 1 מתוך 4</span>
        <div className={s.navSpacer} />
        <button className={`${s.btn} ${s.btnPrimary}`} onClick={proceed}>
          {state.selectedIds.size > 0 ? 'המשך לרמות ומשרות ←' : 'בחר תפקידים ←'}
        </button>
      </div>
    </div>
  )
}
