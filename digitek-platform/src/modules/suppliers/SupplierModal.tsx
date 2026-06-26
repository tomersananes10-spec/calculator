import { useEffect } from 'react'
import type { SupplierSummary } from './types'
import styles from './Suppliers.module.css'

export function SupplierModal({ supplier, onClose }: { supplier: SupplierSummary; onClose: () => void }) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [onClose])

  // Group qualifications by cluster
  const byCluster = supplier.quals.reduce((acc, q) => {
    if (!acc[q.cluster_name]) acc[q.cluster_name] = []
    acc[q.cluster_name].push(q)
    return acc
  }, {} as Record<string, typeof supplier.quals>)

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <header className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>{supplier.name}</h2>
            <div className={styles.modalSub}>
              {supplier.agreement_name ?? `הסכם ${supplier.sigma_agreement_no ?? '—'}`}
            </div>
          </div>
          <button className={styles.modalClose} onClick={onClose} aria-label="סגור">×</button>
        </header>

        <div className={styles.modalBody}>
          <dl className={styles.detailGrid}>
            <div className={styles.detailCell}>
              <dt>מספר מנו"ף</dt><dd>{supplier.manof_number ?? '—'}</dd>
            </div>
            <div className={styles.detailCell}>
              <dt>מספר ספק סיגמה</dt><dd>{supplier.sigma_supplier_no ?? '—'}</dd>
            </div>
            <div className={styles.detailCell}>
              <dt>מספר הסכם סיגמה</dt><dd>{supplier.sigma_agreement_no ?? '—'}</dd>
            </div>
            <div className={styles.detailCell}>
              <dt>תוקף ההסכם</dt>
              <dd>{formatDate(supplier.valid_from)} — {formatDate(supplier.valid_to)}</dd>
            </div>
            <div className={styles.detailCell}>
              <dt>סה"כ הרשאות</dt><dd>{supplier.quals.length}</dd>
            </div>
            <div className={styles.detailCell}>
              <dt>אשכולות פעילים</dt><dd>{supplier.clusters.length}</dd>
            </div>
          </dl>

          <div className={styles.sectionH}>
            ההתמחויות של הספק ({supplier.specCount})
          </div>

          {Object.entries(byCluster).map(([cluster, quals]) => (
            <div key={cluster} className={styles.qualGroup}>
              <h5 className={styles.qualGroupTitle}>
                <span>{cluster}</span>
                <span className={styles.qualGroupCount}>{quals.length} הרשאות</span>
              </h5>
              <div className={styles.qualList}>
                {quals.map(q => (
                  <div key={q.qualification_id} className={styles.qualRow}>
                    <span className={styles.qualName}>{q.specialization_name}</span>
                    <span className={`${styles.sizePill} ${
                      q.size === 'גדול' ? styles.sizePillLarge
                      : q.size === 'קטן'  ? styles.sizePillSmall
                                          : styles.sizePillNone
                    }`}>
                      {q.size ?? 'לא מוגדר'}
                    </span>
                    <span className={styles.qualSku}>{q.catalog_number ?? '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  const x = new Date(d)
  return `${x.getDate()}/${x.getMonth() + 1}/${x.getFullYear()}`
}
