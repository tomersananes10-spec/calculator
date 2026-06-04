import { useAimlCalculator } from './useAimlCalculator'
import { Step1AimlSetup } from './Step1AimlSetup'
import { Step2AimlSelect } from './Step2AimlSelect'
import { Step3AimlSizing } from './Step3AimlSizing'
import { Step4AimlResults } from './Step4AimlResults'
import type { AimlStep } from './types'
import s from '../takam-calculator/TakamCalculator.module.css'

const STEP_NAMES = ['הגדרת פרויקט', 'בחירת תוצרים', 'גודל וכמויות', 'תוצאות']

export function AimlCalculator() {
  const [state, dispatch] = useAimlCalculator()

  function tryGoStep(n: AimlStep) {
    if (n < state.currentStep) dispatch({ type: 'GO_STEP', payload: n })
  }

  const isResultsStep = state.currentStep === 4

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>מחשבון AI/ML</h1>
          <p className={s.pageSub}>חישוב עלויות תוצרי AI/ML לפי סעיף 3.16</p>
        </div>
      </div>

      <div className={s.wizardProgress}>
        <div className={s.stepsRow}>
          <div className={s.steps}>
            {STEP_NAMES.map((name, i) => {
              const n = (i + 1) as AimlStep
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
      </div>

      <div className={isResultsStep ? s.mainWide : s.main}>
        {state.currentStep === 1 && <Step1AimlSetup state={state} dispatch={dispatch} />}
        {state.currentStep === 2 && <Step2AimlSelect state={state} dispatch={dispatch} />}
        {state.currentStep === 3 && <Step3AimlSizing state={state} dispatch={dispatch} />}
        {state.currentStep === 4 && <Step4AimlResults state={state} dispatch={dispatch} />}
      </div>
    </div>
  )
}
