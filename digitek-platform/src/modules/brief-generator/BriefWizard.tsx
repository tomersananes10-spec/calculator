import { useState } from 'react'
import { clusters } from '../../data/clusters'
import type { WizardState, Milestone } from './types'
import { INITIAL_STATE } from './types'
import { Step1Cluster } from './Step1Cluster'
import { Step2Specialization } from './Step2Specialization'
import { Step3Details } from './Step3Details'
import { Step4Description } from './Step4Description'
import { Step5Activities } from './Step5Activities'
import { Step6Timeline } from './Step6Timeline'
import { Step7Requirements } from './Step7Requirements'
import { Step8Preview } from './Step8Preview'
import s from './BriefWizard.module.css'

const STEP_NAMES = [
  'בחירת אשכול',
  'בחירת התמחות',
  'פרטי פרויקט',
  'תיאור הצורך',
  'פעילויות',
  'לוח זמנים',
  'דרישות נוספות',
  'תצוגה מקדימה',
]

export function BriefWizard() {
  const [state, setState] = useState<WizardState>(INITIAL_STATE)

  function goStep(n: number) {
    setState(s => ({ ...s, currentStep: n }))
  }

  function next() {
    setState(s => ({ ...s, currentStep: Math.min(8, s.currentStep + 1) }))
  }

  function back() {
    setState(s => ({ ...s, currentStep: Math.max(1, s.currentStep - 1) }))
  }

  function selectCluster(clusterId: string) {
    const cluster = clusters.find(c => c.id === clusterId) ?? null
    setState(s => ({
      ...s,
      selectedCluster: cluster,
      selectedSpecialization: null,
      selectedActivities: [],
    }))
  }

  function selectSpecialization(specId: string) {
    const spec = state.selectedCluster?.specializations.find(sp => sp.id === specId) ?? null
    setState(s => ({
      ...s,
      selectedSpecialization: spec,
      selectedActivities: [],
    }))
  }

  function changeDetails(field: keyof WizardState['projectDetails'], value: string | number) {
    setState(s => {
      const budget = field === 'estimatedBudget' ? (value as number) : s.projectDetails.estimatedBudget
      const threshold = s.selectedSpecialization?.projectSizeThreshold ?? 200000
      return {
        ...s,
        projectDetails: {
          ...s.projectDetails,
          [field]: value,
          projectSize: budget > threshold ? 'large' : 'small',
        },
      }
    })
  }

  function changeDescription(field: keyof WizardState['projectDescription'], value: string) {
    setState(s => ({
      ...s,
      projectDescription: { ...s.projectDescription, [field]: value },
    }))
  }

  function toggleActivity(activityId: string) {
    setState(s => ({
      ...s,
      selectedActivities: s.selectedActivities.includes(activityId)
        ? s.selectedActivities.filter(id => id !== activityId)
        : [...s.selectedActivities, activityId],
    }))
  }

  function selectAllMandatory() {
    const spec = state.selectedSpecialization
    if (!spec) return
    const mandatoryIds = spec.activities
      .filter(a => a.deliverables.some(d => d.required === 'mandatory'))
      .map(a => a.id)
    setState(s => ({
      ...s,
      selectedActivities: Array.from(new Set([...s.selectedActivities, ...mandatoryIds])),
    }))
  }

  function changeTimeline(field: keyof WizardState['timeline'], value: string | number | Milestone[]) {
    setState(s => ({
      ...s,
      timeline: { ...s.timeline, [field]: value },
    }))
  }

  function changeRequirements(field: keyof WizardState['requirements'], value: boolean | string | number) {
    setState(s => ({
      ...s,
      requirements: { ...s.requirements, [field]: value },
    }))
  }

  function saveDraft() {
    localStorage.setItem('brief_draft', JSON.stringify(state))
    alert('הטיוטה נשמרה בהצלחה!')
  }

  const step = state.currentStep

  return (
    <>
      <div className={s.wizardProgress}>
        <div className={s.steps}>
          {STEP_NAMES.map((name, i) => {
            const n = i + 1
            const cls = n < step ? s.stepDone : n === step ? s.stepActive : s.stepFuture
            return (
              <div
                key={n}
                className={`${s.step} ${cls}`}
                onClick={() => n < step && goStep(n)}
              >
                <div className={s.stepNum}>{n < step ? '✓' : String(n)}</div>
                <div className={s.stepInfo}>
                  <span className={s.stepLabel}>שלב {n}</span>
                  <span className={s.stepName}>{name}</span>
                </div>
                {i < 7 && <span className={s.stepSep}>›</span>}
              </div>
            )
          })}
        </div>
      </div>

      <div className={s.main}>
        {step === 1 && (
          <Step1Cluster state={state} onSelect={selectCluster} onNext={next} />
        )}
        {step === 2 && (
          <Step2Specialization state={state} onSelect={selectSpecialization} onNext={next} onBack={back} />
        )}
        {step === 3 && (
          <Step3Details state={state} onChange={changeDetails} onNext={next} onBack={back} />
        )}
        {step === 4 && (
          <Step4Description state={state} onChange={changeDescription} onNext={next} onBack={back} />
        )}
        {step === 5 && (
          <Step5Activities
            state={state}
            onToggleActivity={toggleActivity}
            onSelectAllMandatory={selectAllMandatory}
            onNext={next}
            onBack={back}
          />
        )}
        {step === 6 && (
          <Step6Timeline state={state} onChangeTimeline={changeTimeline} onNext={next} onBack={back} />
        )}
        {step === 7 && (
          <Step7Requirements state={state} onChange={changeRequirements} onNext={next} onBack={back} />
        )}
        {step === 8 && (
          <Step8Preview state={state} onBack={back} onSaveDraft={saveDraft} />
        )}
      </div>
    </>
  )
}
