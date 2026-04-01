import type { WizardState } from './types'
import s from './BriefWizard.module.css'

interface Props {
  state: WizardState
  onSelect: (specId: string) => void
  onNext: () => void
  onBack: () => void
}

export function Step2Specialization({ state, onSelect, onNext, onBack }: Props) {
  const cluster = state.selectedCluster
  if (!cluster) return null

  return (
    <div>
      <div className={s.stepHeader}>
        <h2>בחירת התמחות</h2>
        <p>אשכול: {cluster.icon} {cluster.name} — בחר את ההתמחות הרלוונטית</p>
      </div>

      <div className={s.specList}>
        {cluster.specializations.map(spec => {
          const isSelected = state.selectedSpecialization?.id === spec.id
          const requiresProcurement =
            spec.notes?.includes('עורך המכרז') || false

          return (
            <div
              key={spec.id}
              className={`${s.specCard} ${isSelected ? s.specCardSelected : ''}`}
              onClick={() => onSelect(spec.id)}
            >
              <div className={s.specRadio}>
                {isSelected && <div className={s.specRadioDot} />}
              </div>
              <div className={s.specContent}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div className={s.specName}>{spec.id}. {spec.name}</div>
                  {requiresProcurement && (
                    <span className={s.specBadge}>דרך עורך המכרז בלבד</span>
                  )}
                </div>
                <div className={s.specDesc}>{spec.description}</div>
                {spec.notes && !requiresProcurement && (
                  <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 4, fontWeight: 600 }}>
                    ⚠️ {spec.notes}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className={s.navBtns}>
        <button className={s.btnSecondary} onClick={onBack}>‹ חזרה</button>
        <button
          className={s.btnPrimary}
          onClick={onNext}
          disabled={!state.selectedSpecialization}
        >
          המשך לפרטי הפרויקט ›
        </button>
      </div>
    </div>
  )
}
