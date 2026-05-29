import { useCheck } from './useCheck'
import { Step1Intake } from './Step1Intake'
import { Step2Results } from './Step2Results'
import { Step3Decision } from './Step3Decision'
import s from './CheckWizard.module.css'

const STEP_LABELS = ['קליטת מועמד', 'תוצאות ניתוח', 'החלטת רכזת']

export function CheckWizard() {
  const { state, dispatch, runCheck, exportJson, submitDecision, saving, handleFile } = useCheck()

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div className={s.headerLabel}>בדיקת תנאי סף</div>
        <h1 className={s.title}>
          {state.candidateName || 'מועמד/ת חדש/ה'}
        </h1>
        <p className={s.subtitle}>כלי תומך החלטה לרכזת המיון — חילוץ אינדיקציות, בדיקת תנאי סף, נימוק והחלטה</p>
      </div>

      <div className={s.steps}>
        {STEP_LABELS.map((label, i) => {
          const stepNum = (i + 1) as 1 | 2 | 3
          const cls = stepNum === state.currentStep
            ? s.stepActive
            : stepNum < state.currentStep
              ? s.stepDone
              : s.step
          return (
            <div key={stepNum} className={cls}>
              <span className={s.stepNum}>{stepNum}</span>
              {label}
            </div>
          )
        })}
      </div>

      {state.currentStep === 1 && (
        <Step1Intake state={state} dispatch={dispatch} onRun={runCheck} onFile={handleFile} />
      )}

      {state.currentStep === 2 && state.checkResult && (
        <Step2Results
          result={state.checkResult}
          onNext={() => dispatch({ type: 'GO_TO_STEP', payload: 3 })}
          onBack={() => dispatch({ type: 'GO_TO_STEP', payload: 1 })}
        />
      )}

      {state.currentStep === 3 && state.checkResult && (
        <Step3Decision
          state={state}
          result={state.checkResult}
          dispatch={dispatch}
          onExport={exportJson}
          onSubmit={submitDecision}
          saving={saving}
          onBack={() => dispatch({ type: 'GO_TO_STEP', payload: 2 })}
        />
      )}
    </div>
  )
}
