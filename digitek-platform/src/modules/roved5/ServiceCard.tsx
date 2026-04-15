import type { Roved5Service, AISearchResult } from './types'
import styles from './Roved5.module.css'

interface Props {
  service: Roved5Service
  aiResult?: AISearchResult
  onClick: () => void
  animationDelay?: number
}

export function ServiceCard({ service, aiResult, onClick, animationDelay }: Props) {
  const cloudClass = service.cloud === 'AWS' ? styles.cardAWS : styles.cardGCP

  return (
    <div
      className={`${styles.card} ${cloudClass}`}
      onClick={onClick}
      style={animationDelay !== undefined ? { animationDelay: `${animationDelay}ms` } : undefined}
    >
      <div className={styles.cardHeader}>
        <span className={`${styles.cloudBadge} ${styles[`cloud${service.cloud}`]}`}>
          {service.cloud}
        </span>
        <span className={`${styles.typeBadge} ${service.type === 'SaaS' ? styles.typeSaaS : styles.typeNonSaaS}`}>
          {service.type}
        </span>
      </div>

      <h3 className={styles.cardName}>{service.name}</h3>
      <p className={styles.cardManufacturer}>{service.manufacturer}</p>
      <p className={styles.cardDesc}>{service.description || '—'}</p>

      <div className={styles.cardFooter}>
        <span className={styles.cardProvider}>{service.provider}</span>
        {service.approvalDate && (
          <span className={styles.cardDate}>אושר: {service.approvalDate}</span>
        )}
      </div>

      {aiResult && (
        <div className={styles.aiReason}>
          <span className={styles.aiIcon}>✨</span>
          {aiResult.reason}
        </div>
      )}
    </div>
  )
}
