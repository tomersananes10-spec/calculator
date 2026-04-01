import { useEffect } from 'react'
import { useCalculator } from './useCalculator'
import { Step1Setup }       from './Step1Setup'
import { Step2Roles }       from './Step2Roles'
import { Step3Mix }         from './Step3Mix'
import { Step4Results }     from './Step4Results'
import { AiAdvisorModal }   from './AiAdvisorModal'
import { ROLES_DATA }       from './data'
import type { MixEntry, Level } from './types'
import s from './TakamCalculator.module.css'

const STEP_NAMES = ['הגדרת פרויקט', 'בחירת תפקידים', 'רמות ומשרות', 'תוצאות']

export function TakamCalculator() {
  const [state, dispatch] = useCalculator()

  // Load from URL hash on mount (share feature)
  useEffect(() => {
    const raw = decodeURIComponent(location.hash.slice(1))
    if (!raw.startsWith('v1|')) return
    try {
      const parts = Object.fromEntries(raw.split('|').slice(1).map(p => p.split('=')))
      const period = [6, 12, 24].includes(+parts.period) ? +parts.period as 6 | 12 | 24 : 12
      dispatch({ type: 'SET_PERIOD', payload: period })
      if (parts.matching === '0') dispatch({ type: 'TOGGLE_MATCHING' })
      dispatch({ type: 'SET_MATCHING_PCT', payload: Math.min(100, Math.max(1, +parts.pct || 30)) })
      if (parts.roles) {
        const mix: MixEntry[] = parts.roles.split(',').map((r: string) => {
          const [id, level, scope] = r.split(':')
          return { id, level: level as Level, scope: +scope }
        }).filter((m: MixEntry) => ROLES_DATA.find(r => r.id === m.id))
        mix.forEach(m => dispatch({ type: 'TOGGLE_ROLE', payload: m.id }))
        mix.forEach((m, i) => {
          dispatch({ type: 'SET_LEVEL', payload: { index: i, level: m.level } })
          dispatch({ type: 'SET_SCOPE', payload: { index: i, scope: m.scope } })
        })
        if (mix.length > 0) dispatch({ type: 'GO_STEP', payload: 4 })
      }
    } catch { /* invalid hash */ }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function tryGoStep(n: 1 | 2 | 3 | 4) {
    if (n < state.currentStep) dispatch({ type: 'GO_STEP', payload: n })
  }

  return (
    <>
      <div className={s.wizardProgress}>
        <div className={s.steps}>
          {STEP_NAMES.map((name, i) => {
            const n = (i + 1) as 1 | 2 | 3 | 4
            const cls = n < state.currentStep ? s.stepDone : n === state.currentStep ? s.stepActive : s.stepFuture
            return (
              <div key={n} className={`${s.step} ${cls}`} onClick={() => tryGoStep(n)}>
                <div className={s.stepNum}>{n < state.currentStep ? '✓' : String(n)}</div>
                <div className={s.stepInfo}>
                  <span className={s.stepLabel}>שלב {n}</span>
                  <span className={s.stepName}>{name}</span>
                </div>
                {i < 3 && <span className={s.stepSep}>›</span>}
              </div>
            )
          })}
        </div>
      </div>

      <div className={s.main}>
        {state.currentStep === 1 && <Step1Setup state={state} dispatch={dispatch} />}
        {state.currentStep === 2 && <Step2Roles state={state} dispatch={dispatch} />}
        {state.currentStep === 3 && <Step3Mix   state={state} dispatch={dispatch} />}
        {state.currentStep === 4 && <Step4Results state={state} dispatch={dispatch} />}
      </div>

      <AiAdvisorModal state={state} dispatch={dispatch} />
    </>
  )
}
