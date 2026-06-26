import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAimlCalculator } from './useAimlCalculator'
import { useAimlHistory } from './useAimlHistory'
import { AimlHistoryPanel } from './AimlHistoryPanel'
import { Step1AimlSetup } from './Step1AimlSetup'
import { Step2AimlSelect } from './Step2AimlSelect'
import { Step3AimlSizing } from './Step3AimlSizing'
import { Step4AimlResults } from './Step4AimlResults'
import { AimlAiAdvisorModal } from './AimlAiAdvisorModal'
import type { AimlStep, SavedAimlCalculation } from './types'
import { supabase } from '../../lib/supabase'
import s from '../takam-calculator/TakamCalculator.module.css'

const STEP_NAMES = ['הגדרת פרויקט', 'בחירת תוצרים', 'גודל וכמויות', 'תוצאות']

export function AimlCalculator() {
  const [state, dispatch] = useAimlCalculator()
  const history = useAimlHistory()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const journeyStepIdRef = useRef<string | null>(null)

  // Knowledge Hub deep-link: ?journey_step_id=…&name=…&ministry=…
  useEffect(() => {
    const stepId = searchParams.get('journey_step_id')
    if (!stepId) return
    journeyStepIdRef.current = stepId
    const name = searchParams.get('name') ?? ''
    const ministry = searchParams.get('ministry') ?? ''
    if (name) dispatch({ type: 'SET_PROJECT_NAME', payload: name })
    if (ministry) dispatch({ type: 'SET_MINISTRY', payload: ministry })
    const params = new URLSearchParams(searchParams)
    params.delete('journey_step_id')
    params.delete('name')
    params.delete('ministry')
    setSearchParams(params, { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function tryGoStep(n: AimlStep) {
    if (n < state.currentStep) dispatch({ type: 'GO_STEP', payload: n })
  }

  function handleSave() {
    if (!state.project.name.trim()) {
      setSaveMsg('יש למלא שם פרויקט')
      setTimeout(() => setSaveMsg(null), 2500)
      return
    }
    const id = history.saveCalculation(state)
    dispatch({ type: 'SET_CALC_ID', payload: id })
    setSaveMsg('נשמר!')
    setTimeout(() => setSaveMsg(null), 2000)

    // AIML history is local-only; mark journey step as done directly.
    const stepId = journeyStepIdRef.current
    if (stepId) {
      journeyStepIdRef.current = null
      void supabase
        .from('journey_steps')
        .update({
          status: 'done',
          linked_entity_table: 'aiml_local',
          linked_entity_id: null,
          completed_at: new Date().toISOString(),
        })
        .eq('id', stepId)
    }
  }

  function handleLoad(calc: SavedAimlCalculation) {
    dispatch({
      type: 'LOAD',
      payload: {
        project: { name: calc.name, ministry: calc.ministry },
        entries: calc.entries,
        period: calc.period,
        matchingOn: calc.matchingOn,
        matchingPct: calc.matchingPct,
        riskPct: calc.riskPct,
        calculationId: calc.id,
        currentStep: 4,
      },
    })
    setHistoryOpen(false)
  }

  const isResultsStep = state.currentStep === 4

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>מחשבון תוצרי AI/ML</h1>
          <p className={s.pageSub}>תמחור לפי תוצרים — סעיף 3.16 (ייעוץ ויישום AI/ML בענן)</p>
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

          <div className={s.wizardActions}>
            <button className={s.saveHeaderBtn} onClick={handleSave}>
              {saveMsg === 'נשמר!' ? '✓ נשמר!' : saveMsg ? `✕ ${saveMsg}` : '💾 שמור'}
            </button>
            <button className={s.historyBtn} onClick={() => setHistoryOpen(true)}>
              📋 החישובים שלי
              {history.calculations.length > 0 && (
                <span className={s.historyBadge}>{history.calculations.length}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className={isResultsStep ? s.mainWide : s.main}>
        {state.currentStep === 1 && <Step1AimlSetup state={state} dispatch={dispatch} />}
        {state.currentStep === 2 && <Step2AimlSelect state={state} dispatch={dispatch} />}
        {state.currentStep === 3 && <Step3AimlSizing state={state} dispatch={dispatch} />}
        {state.currentStep === 4 && <Step4AimlResults state={state} dispatch={dispatch} />}
      </div>

      <AimlAiAdvisorModal state={state} dispatch={dispatch} />

      <AimlHistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        calculations={history.calculations}
        onLoad={handleLoad}
        onDelete={history.deleteCalculation}
      />
    </div>
  )
}
