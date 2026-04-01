import { useState } from 'react'
import type { CalcState, CalcAction } from './types'
import s from './TakamCalculator.module.css'

interface Props {
  state: CalcState
  dispatch: React.Dispatch<CalcAction>
}

const PERIOD_LABELS: Record<number, string> = { 6: '6 חודשים', 12: 'שנה', 24: 'שנתיים' }

export function Step1Setup({ state, dispatch }: Props) {
  const [nameError, setNameError] = useState(false)

  function proceed() {
    if (!state.project.name.trim()) {
      setNameError(true)
      return
    }
    setNameError(false)
    dispatch({ type: 'GO_STEP', payload: 2 })
  }

  return (
    <div>
      <div className={s.stepHeader}>
        <h2>הגדרת פרויקט</h2>
        <p>מלא את פרטי הפרויקט לפני שמתחילים לבחור תפקידים</p>
      </div>

      <div className={s.cardBox}>
        <div className={s.field}>
          <label className={s.fieldLabel}>שם הפרויקט *</label>
          <input
            className={s.input}
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
          <label className={s.fieldLabel}>משרד / גוף מזמין</label>
          <input
            className={s.input}
            placeholder="לדוגמה: משרד הפנים"
            value={state.project.ministry}
            onChange={e => dispatch({ type: 'SET_PROJECT', payload: { ...state.project, ministry: e.target.value } })}
          />
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
          בחר תפקידים ←
        </button>
      </div>
    </div>
  )
}
