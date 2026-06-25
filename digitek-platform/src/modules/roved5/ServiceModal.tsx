import type { Roved5Service } from './types'
import styles from './Roved5.module.css'

interface Props {
  service: Roved5Service
  onClose: () => void
}

function formatDiscount(d: Roved5Service['discount']): { kind: 'pct'; value: number } | { kind: 'na' } | { kind: 'none' } {
  if (typeof d === 'number' && d > 0) return { kind: 'pct', value: Math.round(d * 100) }
  if (typeof d === 'string' && d.trim() && d.trim() !== '0') {
    const s = d.trim().toLowerCase()
    if (s.includes('לא רלוונטי') || s.includes('n/a')) return { kind: 'na' }
    const n = parseFloat(d)
    if (!isNaN(n) && n > 0) return { kind: 'pct', value: n > 1 ? Math.round(n) : Math.round(n * 100) }
  }
  return { kind: 'none' }
}

function isRealUrl(s: string): boolean {
  return /^(https?:\/\/|www\.)/i.test(s.trim())
}

export function ServiceModal({ service, onClose }: Props) {
  const emailMatch = service.contact.match(/[\w.+-]+@[\w-]+\.[a-z.]+/i)
  const email = emailMatch?.[0]
  const contactName = service.contact
    .replace(/\|?\s*[\w.+-]+@[\w-]+\.[a-z.]+/gi, '')
    .replace(/\|/g, '')
    .trim()

  const discount = formatDiscount(service.discount)
  const hasNotes = service.notes && service.notes.trim().length > 0
  const priceLinkIsUrl = service.priceLink && isRealUrl(service.priceLink)

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose} aria-label="סגור">✕</button>

        {/* Hero — thin sticky */}
        <div className={styles.modalHero}>
          <div className={styles.modalBadges}>
            <span className={`${styles.badge} ${service.cloud === 'GCP' ? styles.badgeCloudGCP : styles.badgeCloudAWS}`}>
              {service.cloud}
            </span>
            <span className={`${styles.badge} ${service.type === 'SaaS' ? styles.badgeTypeSaaS : styles.badgeTypeNonSaaS}`}>
              {service.type}
            </span>
            <span className={`${styles.badge} ${service.psServices === 'כלול' ? styles.badgePsYes : styles.badgePsNo}`}>
              PS: {service.psServices}
            </span>
          </div>
          <h2 className={styles.modalTitle}>{service.name}</h2>
          <div className={styles.modalMeta}>
            <span className={styles.modalMetaMfg}>{service.manufacturer}</span>
            <span className={styles.modalMetaSep}>·</span>
            <span className={styles.modalMetaProvider}>{service.provider}</span>
          </div>
        </div>

        {/* Description strip */}
        {service.description && (
          <div className={styles.modalDescBar}>{service.description}</div>
        )}

        {/* Two columns: Business / Tech */}
        <div className={styles.modalColumns}>
          {/* Business */}
          <div className={styles.modalCol}>
            <div className={styles.modalColLabel}>💼 כלכלי</div>

            {discount.kind === 'pct' && (
              <div className={styles.discountRow}>
                <span className={styles.discountPct}>{discount.value}%</span>
                <span className={styles.discountLabel}>הנחה ממחיר רשמי</span>
              </div>
            )}
            {discount.kind === 'na' && (
              <div className={styles.discountRowNeutral}>
                <span className={styles.discountNa}>הנחה לא רלוונטית</span>
                <span className={styles.discountSub}>מודל BYOL / לפי רישיון</span>
              </div>
            )}
            {discount.kind === 'none' && (
              <div className={styles.discountRowNeutral}>
                <span className={styles.discountNa}>ללא הנחה ייעודית</span>
              </div>
            )}

            {priceLinkIsUrl && (
              <a className={styles.priceBtn} href={service.priceLink} target="_blank" rel="noopener noreferrer">
                📋 צפה במחירון מלא
              </a>
            )}

            <div className={styles.modalColLabel} style={{ marginTop: 18 }}>📞 איש קשר</div>
            <div className={styles.contactMini}>
              {contactName && <div className={styles.contactName}>{contactName}</div>}
              {email && <div className={styles.contactEmail}>{email}</div>}
              {email && (
                <a className={styles.emailBtn} href={`mailto:${email}`}>✉ שלח מייל</a>
              )}
              {!contactName && !email && (
                <div className={styles.contactEmpty}>אין פרטי קשר זמינים</div>
              )}
            </div>
          </div>

          {/* Tech */}
          <div className={`${styles.modalCol} ${styles.modalColTech}`}>
            <div className={styles.modalColLabel}>⚙️ טכני</div>
            <div className={styles.techGrid}>
              <div className={styles.techRow}>
                <span className={styles.techLabel}>מק"ט</span>
                <span className={styles.techValue}>{service.id}</span>
              </div>
              <div className={styles.techRow}>
                <span className={styles.techLabel}>ספק רשמי</span>
                <span className={styles.techValue}>{service.provider || '—'}</span>
              </div>
              <div className={styles.techRow}>
                <span className={styles.techLabel}>יצרן</span>
                <span className={styles.techValue}>{service.manufacturer || '—'}</span>
              </div>
              <div className={styles.techRow}>
                <span className={styles.techLabel}>ענן</span>
                <span className={styles.techValue}>{service.cloud === 'GCP' ? 'Google Cloud (GCP)' : 'AWS'}</span>
              </div>
              <div className={styles.techRow}>
                <span className={styles.techLabel}>סוג שירות</span>
                <span className={styles.techValue}>{service.type}</span>
              </div>
              <div className={styles.techRow}>
                <span className={styles.techLabel}>מועד אישור</span>
                <span className={styles.techValue}>{service.approvalDate || '—'}</span>
              </div>
              <div className={styles.techRow}>
                <span className={styles.techLabel}>שירותי מומחים (PS)</span>
                <span className={styles.techValue}>{service.psServices}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes — full width bottom */}
        {hasNotes && (
          <div className={styles.modalNotesSection}>
            <div className={styles.modalNotesLabel}>⚠️ כללים והנחיות פרטניים לרכישה</div>
            <div className={styles.modalNotesCallout}>{service.notes}</div>
          </div>
        )}
      </div>
    </div>
  )
}
