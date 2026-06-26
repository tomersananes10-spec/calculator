import { useNavigate } from 'react-router-dom'
import { useJourney } from './hooks/useJourney'
import { MODULE_HE_LABEL, MODULE_ICON, urlForStep } from './lib/stepActions'
import type { JourneyStep } from './types'
import styles from './JourneyResultView.module.css'

interface Props {
  journeyId: string
}

export function JourneyResultView({ journeyId }: Props) {
  const { journey, loading, error } = useJourney(journeyId)
  const navigate = useNavigate()

  if (loading) return <div className={styles.loading}>טוען מסע…</div>
  if (error) return <div className={styles.error}>שגיאה: {error}</div>
  if (!journey) return <div className={styles.error}>המסע לא נמצא</div>

  const done = journey.steps.filter(s => s.status === 'done' || s.status === 'skipped').length
  const total = journey.steps.length
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)

  return (
    <div className={styles.wrap}>
      <div className={styles.wishCard}>
        <div className={styles.wishLabel}>החזון שלך</div>
        <div className={styles.wishText}>{journey.wish_text}</div>
        {journey.ai_summary && (
          <div className={styles.aiSummary}>{journey.ai_summary}</div>
        )}
        {journey.ai_tags.length > 0 && (
          <div className={styles.tags}>
            {journey.ai_tags.map(t => <span key={t} className={styles.tag}>{t}</span>)}
          </div>
        )}
      </div>

      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>המסע שלך — {total} {total === 1 ? 'שלב' : 'שלבים'}</h2>
          <p className={styles.subtitle}>התקדמות: {done}/{total}</p>
        </div>
      </div>

      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${pct}%` }} />
      </div>

      <div className={styles.steps}>
        {journey.steps.map((step, idx) => (
          <StepCard
            key={step.id}
            step={step}
            order={idx + 1}
            onOpen={() => navigate(urlForStep(step))}
          />
        ))}
      </div>
    </div>
  )
}

interface StepCardProps {
  step: JourneyStep
  order: number
  onOpen: () => void
}

function StepCard({ step, order, onOpen }: StepCardProps) {
  const isDone = step.status === 'done'
  const isSkipped = step.status === 'skipped'

  return (
    <div className={`${styles.step} ${isDone ? styles.stepDone : ''} ${isSkipped ? styles.stepSkipped : ''}`}>
      <div className={styles.stepNum}>{isDone ? '✓' : order}</div>
      <div className={styles.stepBody}>
        <div className={styles.stepHead}>
          <h3 className={styles.stepTitle}>{step.title}</h3>
          <span className={styles.stepBadge}>
            {MODULE_ICON[step.module_key]} {MODULE_HE_LABEL[step.module_key]}
          </span>
        </div>
        {step.description && (
          <p className={styles.stepDesc}>{step.description}</p>
        )}
        {!isDone && !isSkipped && (
          <button type="button" className={styles.openBtn} onClick={onOpen}>
            פתח עם הקשר מועבר ←
          </button>
        )}
        {isDone && step.linked_entity_id && (
          <div className={styles.doneNote}>✓ הושלם — נשמר במערכת</div>
        )}
      </div>
    </div>
  )
}
