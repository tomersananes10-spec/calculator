import { clusters } from '../../data/clusters'
import type { WizardState } from './types'
import s from './BriefWizard.module.css'

interface Props {
  state: WizardState
  onSelect: (clusterId: string) => void
  onNext: () => void
}

export function Step1Cluster({ state, onSelect, onNext }: Props) {
  const digital = clusters.filter(c => c.type === 'digital')
  const tech = clusters.filter(c => c.type === 'tech')

  return (
    <div>
      <div className={s.stepHeader}>
        <h2>בחירת אשכול</h2>
        <p>בחר את האשכול המתאים לצורך הפרויקט שלך</p>
      </div>

      <div className={s.sectionTitle}>אשכולות דיגיטל</div>
      <div className={s.clusterGrid}>
        {digital.map(c => (
          <div
            key={c.id}
            className={`${s.clusterCard} ${state.selectedCluster?.id === c.id ? s.clusterCardSelected : ''}`}
            onClick={() => onSelect(c.id)}
          >
            <div className={s.clusterIcon}>{c.icon}</div>
            <div className={s.clusterName}>{c.name}</div>
          </div>
        ))}
      </div>

      <div className={s.sectionTitle}>אשכולות טק</div>
      <div className={s.clusterGrid}>
        {tech.map(c => (
          <div
            key={c.id}
            className={`${s.clusterCard} ${state.selectedCluster?.id === c.id ? s.clusterCardSelected : ''}`}
            onClick={() => onSelect(c.id)}
          >
            <div className={s.clusterIcon}>{c.icon}</div>
            <div className={s.clusterName}>{c.name}</div>
          </div>
        ))}
      </div>

      <div className={s.navBtns}>
        <div />
        <button
          className={s.btnPrimary}
          onClick={onNext}
          disabled={!state.selectedCluster}
        >
          המשך לבחירת התמחות ›
        </button>
      </div>
    </div>
  )
}
