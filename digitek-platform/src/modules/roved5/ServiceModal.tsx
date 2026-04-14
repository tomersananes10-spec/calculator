import type { Roved5Service } from './types'
import styles from './Roved5.module.css'

interface Props {
  service: Roved5Service
  onClose: () => void
}

function Row({ label, value }: { label: string; value: string | number }) {
  if (!value || value === '' || value === 'לא רלוונטי') return null
  return (
    <div className={styles.modalRow}>
      <span className={styles.modalLabel}>{label}</span>
      <span className={styles.modalValue}>{String(value)}</span>
    </div>
  )
}

export function ServiceModal({ service, onClose }: Props) {
  const emailMatch = service.contact.match(/[\w.+-]+@[\w-]+\.[a-z.]+/i)
  const email = emailMatch?.[0]
  const contactName = service.contact.replace(/\|?\s*[\w.+-]+@[\w-]+\.[a-z.]+/gi, '').replace(/\|/g, '').trim()

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose}>✕</button>

        <div className={styles.modalTop}>
          <div className={styles.modalBadges}>
            <span className={`${styles.cloudBadge} ${styles[`cloud${service.cloud}`]}`}>{service.cloud}</span>
            <span className={`${styles.typeBadge} ${service.type === 'SaaS' ? styles.typeSaaS : styles.typeNonSaaS}`}>{service.type}</span>
          </div>
          <h2 className={styles.modalTitle}>{service.name}</h2>
          <p className={styles.modalManufacturer}>{service.manufacturer}</p>
        </div>

        <div className={styles.modalBody}>
          {service.description && (
            <div className={styles.modalSection}>
              <div className={styles.modalSectionLabel}>תיאור השירות</div>
              <p className={styles.modalDesc}>{service.description}</p>
            </div>
          )}

          <div className={styles.modalGrid}>
            <Row label='מק"ט' value={service.id} />
            <Row label="שם הספק" value={service.provider} />
            <Row label="יצרן השירות" value={service.manufacturer} />
            <Row label="סוג שירות" value={service.type} />
            <Row label="ענן" value={service.cloud} />
            <Row label="מועד אישור" value={service.approvalDate} />
            <Row label="שירותי מומחים (PS)" value={service.psServices} />
          </div>

          {service.notes && (
            <div className={styles.modalSection}>
              <div className={styles.modalSectionLabel}>כללים והנחיות</div>
              <p className={styles.modalNotes}>{service.notes}</p>
            </div>
          )}

          {service.contact && (
            <div className={styles.modalContact}>
              <div className={styles.modalSectionLabel}>פרטי איש קשר</div>
              {contactName && <p className={styles.modalContactName}>{contactName}</p>}
              {email && (
                <a className={styles.modalEmailBtn} href={`mailto:${email}`}>
                  ✉ שלח מייל
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
