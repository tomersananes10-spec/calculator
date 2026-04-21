import { useEffect, useState, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCalculator } from './useCalculator'
import { useAuth } from '../../hooks/useAuth'
import { useCalculationHistory } from './useCalculationHistory'
import { Step1Setup }       from './Step1Setup'
import { Step2Roles }       from './Step2Roles'
import { Step3Mix }         from './Step3Mix'
import { Step4Results }     from './Step4Results'
import { AiAdvisorModal }   from './AiAdvisorModal'
import { HistoryPanel }     from './HistoryPanel'
import { ROLES_DATA }       from './data'
import type { MixEntry, Level } from './types'
import type { SavedCalculation } from './useCalculationHistory'
import s from './TakamCalculator.module.css'

const STEP_NAMES = ['הגדרת פרויקט', 'בחירת תפקידים', 'רמות ומשרות', 'תוצאות']

export function TakamCalculator() {
  const [state, dispatch] = useCalculator()
  const { user } = useAuth()
  const history = useCalculationHistory(user?.id)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  // Load from share token on mount
  useEffect(() => {
    const token = searchParams.get('share')
    if (!token) return

    history.loadByToken(token).then(result => {
      if (!result) return
      const { calculation: calc, permission } = result
      dispatch({
        type: 'LOAD_CALCULATION',
        payload: {
          calculationId: calc.id,
          project: { name: calc.name, ministry: calc.ministry },
          period: calc.period as 6 | 12 | 24,
          matchingOn: calc.matching_on,
          matchingPct: calc.matching_pct,
          riskPct: calc.risk_pct,
          hoursMultiplier: calc.hours_multiplier,
          mix: calc.mix as MixEntry[],
        },
      })
      if (permission === 'view') {
        dispatch({ type: 'SET_VIEW_ONLY', payload: true })
      }
      setSearchParams({}, { replace: true })
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load own calculation by ID (from dashboard)
  useEffect(() => {
    const loadId = searchParams.get('load')
    if (!loadId || !user) return

    const calc = history.calculations.find(c => c.id === loadId)
    if (calc) {
      dispatch({
        type: 'LOAD_CALCULATION',
        payload: {
          calculationId: calc.id,
          project: { name: calc.name, ministry: calc.ministry },
          period: calc.period as 6 | 12 | 24,
          matchingOn: calc.matching_on,
          matchingPct: calc.matching_pct,
          riskPct: calc.risk_pct,
          hoursMultiplier: calc.hours_multiplier,
          mix: calc.mix as MixEntry[],
        },
      })
      setSearchParams({}, { replace: true })
    }
  }, [history.calculations, searchParams, user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Legacy URL hash loading (backwards compatibility)
  useEffect(() => {
    if (searchParams.get('share') || searchParams.get('load')) return
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
        if (mix.length > 0) {
          dispatch({ type: 'SET_VIEW_ONLY', payload: true })
          dispatch({ type: 'GO_STEP', payload: 4 })
        }
      }
    } catch { /* invalid hash */ }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save draft
  const draftTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const stateRef = useRef(state)
  stateRef.current = state

  const saveDraftNow = useCallback(async () => {
    const s = stateRef.current
    if (!user || s.viewOnly) return
    const hasContent = s.project.name || s.project.ministry || s.mix.length > 0
    if (!hasContent) return
    const id = await history.saveDraft(s)
    if (id && !s.calculationId) {
      dispatch({ type: 'SET_CALCULATION_ID', payload: id })
    }
  }, [user, history, dispatch])

  useEffect(() => {
    if (!user || state.viewOnly) return
    clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(saveDraftNow, 3000)
    return () => clearTimeout(draftTimerRef.current)
  }, [state.currentStep, state.project, state.mix, state.period, state.matchingOn, state.matchingPct, state.riskPct, state.hoursMultiplier]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleBeforeUnload = () => {
      const s = stateRef.current
      if (!user || s.viewOnly) return
      const hasContent = s.project.name || s.project.ministry || s.mix.length > 0
      if (!hasContent) return
      navigator.sendBeacon?.('/api/noop', '')
      history.saveDraft(s)
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  function tryGoStep(n: 1 | 2 | 3 | 4) {
    if (!state.viewOnly && n < state.currentStep) dispatch({ type: 'GO_STEP', payload: n })
  }

  async function handleSave() {
    clearTimeout(draftTimerRef.current)
    setSaving(true)
    setSaveMsg(null)
    try {
      const id = await history.saveCalculation(state)
      if (id) {
        dispatch({ type: 'SET_CALCULATION_ID', payload: id })
        setSaveMsg('נשמר!')
        setTimeout(() => setSaveMsg(null), 2500)
      } else {
        setSaveMsg('שגיאה בשמירה')
        setTimeout(() => setSaveMsg(null), 3000)
      }
    } catch (err) {
      console.error('handleSave error:', err)
      setSaveMsg('שגיאה בשמירה')
      setTimeout(() => setSaveMsg(null), 3000)
    }
    setSaving(false)
  }

  function handleLoadCalculation(calc: SavedCalculation) {
    dispatch({
      type: 'LOAD_CALCULATION',
      payload: {
        calculationId: calc.id,
        project: { name: calc.name, ministry: calc.ministry },
        period: calc.period as 6 | 12 | 24,
        matchingOn: calc.matching_on,
        matchingPct: calc.matching_pct,
        riskPct: calc.risk_pct,
        hoursMultiplier: calc.hours_multiplier,
        mix: calc.mix as MixEntry[],
        targetStep: calc.is_draft ? (calc.current_step as 1 | 2 | 3 | 4) : 4,
        isDraft: calc.is_draft,
      },
    })
    setHistoryOpen(false)
  }

  const isResultsStep = state.currentStep === 4

  return (
    <div className={s.page}>
      {/* Page Header */}
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>מחשבון תכ"ם</h1>
          <p className={s.pageSub}>חישוב עלויות כוח אדם וענן לפרויקט</p>
        </div>
      </div>

      {/* Step Progress + Actions */}
      <div className={s.wizardProgress}>
        <div className={s.stepsRow}>
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
          {user && !state.viewOnly && (
            <div className={s.wizardActions}>
              <button
                className={s.saveHeaderBtn}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? '💾 שומר...' : saveMsg === 'נשמר!' ? '✓ נשמר!' : saveMsg === 'שגיאה בשמירה' ? '✕ שגיאה' : '💾 שמור'}
              </button>
              <button className={s.historyBtn} onClick={() => setHistoryOpen(true)}>
                📋 החישובים שלי
                {history.calculations.length > 0 && (
                  <span className={s.historyBadge}>{history.calculations.length}</span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={isResultsStep ? s.mainWide : s.main}>
        {state.currentStep === 1 && <Step1Setup state={state} dispatch={dispatch} />}
        {state.currentStep === 2 && <Step2Roles state={state} dispatch={dispatch} />}
        {state.currentStep === 3 && <Step3Mix   state={state} dispatch={dispatch} />}
        {state.currentStep === 4 && (
          <Step4Results
            state={state}
            dispatch={dispatch}
            history={history}
            onSave={handleSave}
            saving={saving}
            saveMsg={saveMsg}
          />
        )}
      </div>

      {!state.viewOnly && <AiAdvisorModal state={state} dispatch={dispatch} />}

      {/* History Panel */}
      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        calculations={history.calculations}
        loading={history.loading}
        onLoad={handleLoadCalculation}
        onDelete={history.deleteCalculation}
      />
    </div>
  )
}
