import { useState, useEffect, useRef } from 'react'
import type { WizardState, DeliverableRow, WorkPackageRow } from './types'
import { INITIAL_STATE } from './types'
import { shouldShowArchitectureStep } from './Step3Architecture'
import { useBriefs } from '../../hooks/useBriefs'
import { Step1Identification } from './Step1Identification'
import { Step2CurrentSituation } from './Step2CurrentSituation'
import { Step3Architecture } from './Step3Architecture'
import { Step4ProjectDescription } from './Step4ProjectDescription'
import { Step5Deliverables } from './Step5Deliverables'
import { Step6WorkPackages } from './Step6WorkPackages'
import { Step7Timeline } from './Step7Timeline'
import { Step8Management } from './Step8Management'
import { Step9Goals } from './Step9Goals'
import Step10Preview from './Step10Preview'
import s from './BriefWizard.module.css'
const ALL_STEPS = [
  { n: 1,  label: 'זיהוי' },
  { n: 2,  label: 'מצב קיים' },
  { n: 3,  label: 'ארכיטקטורה' },
  { n: 4,  label: 'תיאור' },
  { n: 5,  label: 'תוצרים' },
  { n: 6,  label: 'שו"שים' },
  { n: 7,  label: 'לוח זמנים' },
  { n: 8,  label: 'ניהול' },
  { n: 9,  label: 'יעדים' },
  { n: 10, label: 'תצוגה מקדימה' },
]

interface Props {
  briefId: string
  onClose: () => void
}

function setPath(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const keys = path.split('.')
  if (keys.length === 1) return { ...obj, [keys[0]]: value }
  const key = keys[0]
  return {
    ...obj,
    [key]: setPath((obj[key] as Record<string, unknown>) ?? {}, keys.slice(1).join('.'), value),
  }
}

export function BriefWizard({ briefId, onClose }: Props) {
  const [state, setState] = useState<WizardState>(INITIAL_STATE)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [toast, setToast] = useState(false)
  const [ready, setReady] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { saveBrief, loadBrief } = useBriefs()

  useEffect(() => {
    loadBrief(briefId).then(record => {
      if (record?.state?.currentStep) setState(record.state)
      setReady(true)
    })
  }, [briefId])

  useEffect(() => {
    if (!ready) return
    setSaveStatus('saving')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        await saveBrief(briefId, state, state.identification.projectName || 'טיוטה ללא שם')
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('idle')
      }
    }, 500)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [state])

  const showArch = shouldShowArchitectureStep(state)
  const activeSteps = ALL_STEPS.filter(st => st.n !== 3 || showArch)
  const step = state.currentStep

  function goStep(n: number) { setState(prev => ({ ...prev, currentStep: n })) }
  function next() {
    const idx = activeSteps.findIndex(st => st.n === step)
    if (idx < activeSteps.length - 1) goStep(activeSteps[idx + 1].n)
  }
  function back() {
    const idx = activeSteps.findIndex(st => st.n === step)
    if (idx > 0) goStep(activeSteps[idx - 1].n)
  }

  function onChange(path: string, value: unknown) {
    setState(prev => setPath(prev as unknown as Record<string, unknown>, path, value) as unknown as WizardState)
  }
  function onChangeDeliverables(rows: DeliverableRow[]) {
    setState(prev => ({ ...prev, deliverables: rows }))
  }
  function onChangeWorkPackages(rows: WorkPackageRow[]) {
    setState(prev => ({ ...prev, workPackages: rows }))
  }

  async function handleSaveNow() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setSaveStatus('saving')
    try {
      await saveBrief(briefId, state, state.identification.projectName || 'טיוטה ללא שם')
      setSaveStatus('saved')
      setToast(true)
      setTimeout(() => { setSaveStatus('idle'); setToast(false) }, 2500)
    } catch {
      setSaveStatus('idle')
    }
  }

  async function handleSubmit() {
    setSaveStatus('saving')
    try {
      await saveBrief(briefId, state, state.identification.projectName || 'טיוטה ללא שם')
      setSaveStatus('saved')
      setTimeout(() => { setSaveStatus('idle'); onClose() }, 1000)
    } catch {
      setSaveStatus('idle')
    }
  }

  if (!ready) {
    return <div style={{ padding: 40, color: 'var(--text3)', textAlign: 'center' }}>טוען...</div>
  }

  const visIdx = activeSteps.findIndex(st => st.n === step)

  return (
    <>
      <div className={s.wizardProgress}>
        <div className={s.steps}>
          {activeSteps.map((st, i) => {
            const isDone = i < visIdx
            const isActive = st.n === step
            const cls = isDone ? s.stepDone : isActive ? s.stepActive : s.stepFuture
            return (
              <div key={st.n} className={s.step + ' ' + cls} onClick={() => isDone && goStep(st.n)}>
                <div className={s.stepNum}>{isDone ? '✓' : String(i + 1)}</div>
                <div className={s.stepInfo}>
                  <span className={s.stepName}>{st.label}</span>
                </div>
                {i < activeSteps.length - 1 && <span className={s.stepSep}>›</span>}
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 16 }}>
          {saveStatus === 'saving' && <span style={{ fontSize: 12, color: 'var(--text3)' }}>שומר...</span>}
          {saveStatus === 'saved'  && <span style={{ fontSize: 12, color: 'var(--green)' }}>נשמר ✓</span>}
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', fontSize: 13, color: 'var(--text2)' }}>
            חזרה לרשימה ←
          </button>
        </div>
      </div>

      <div className={s.main}>
        {step === 1  && <Step1Identification state={state} onChange={onChange} onNext={next} onBack={onClose} onSave={handleSaveNow} />}
        {step === 2  && <Step2CurrentSituation state={state} onChange={onChange} onNext={next} onBack={back} onSave={handleSaveNow} />}
        {step === 3  && <Step3Architecture state={state} onChange={onChange} onNext={next} onBack={back} onSave={handleSaveNow} />}
        {step === 4  && <Step4ProjectDescription state={state} onChange={onChange} onNext={next} onBack={back} onSave={handleSaveNow} />}
        {step === 5  && <Step5Deliverables state={state} onChangeDeliverables={onChangeDeliverables} onNext={next} onBack={back} onSave={handleSaveNow} />}
        {step === 6  && <Step6WorkPackages state={state} onChangeWorkPackages={onChangeWorkPackages} onNext={next} onBack={back} onSave={handleSaveNow} />}
        {step === 7  && <Step7Timeline state={state} onChange={onChange} onNext={next} onBack={back} onSave={handleSaveNow} />}
        {step === 8  && <Step8Management state={state} onChange={onChange} onNext={next} onBack={back} onSave={handleSaveNow} />}
        {step === 9  && <Step9Goals state={state} onChange={onChange} onNext={next} onBack={back} onSave={handleSaveNow} />}
        {step === 10 && <Step10Preview state={state} onBack={back} onSubmit={handleSubmit} saving={saveStatus === 'saving'} />}
      </div>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          background: '#1a1a2e', color: '#fff', borderRadius: 12,
          padding: '12px 24px', fontSize: 14, fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          display: 'flex', alignItems: 'center', gap: 10,
          zIndex: 9999, animation: 'fadeInUp 0.25s ease',
        }}>
          <span style={{ fontSize: 18 }}>✓</span>
          הבריף נשמר בהצלחה
        </div>
      )}
    </>
  )
}
