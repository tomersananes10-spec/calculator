import styles from './StubPage.module.css'

const STATS = [
  { label: 'ממתינים לאישור', value: '5',  color: 'amber' },
  { label: 'בוועדות',         value: '3',  color: 'blue' },
  { label: 'אושרו החודש',     value: '12', color: 'green' },
  { label: 'נדחו',             value: '1',  color: 'red' },
]

const ITEMS = [
  { id: 'DGTK-2026-0042', title: 'מערכת BI ממשרדית',  stage: 'מנהל ישיר',      budget: '₪850K',  cluster: 'דאטה',    deadline: 'מחר 17:00', urgent: true  },
  { id: 'DGTK-2026-0038', title: 'אפליקציית נייד',     stage: 'ועדת מכרזים',    budget: '₪1.2M',  cluster: 'חדשנות',  deadline: 'בעוד 3 ימים', urgent: false },
  { id: 'DGTK-2026-0035', title: 'פורטל שירותים',      stage: 'חתימה דיגיטלית', budget: '₪2.5M',  cluster: 'תשתיות',  deadline: 'בעוד שבוע', urgent: false },
]

export function ApprovalsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>מסלולי אישור</h1>
        <p className={styles.sub}>5 בריפים ממתינים לאישורך</p>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        {STATS.map(s => (
          <div key={s.label} className={`${styles.statCard} ${styles['stat_' + s.color]}`}>
            <div className={styles.statValue}>{s.value}</div>
            <div className={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Approval items */}
      <div className={styles.itemList}>
        {ITEMS.map(item => (
          <div key={item.id} className={`${styles.approvalCard} ${item.urgent ? styles.urgent : ''}`}>
            <div className={styles.approvalBody}>
              <div className={styles.approvalMeta}>
                <code className={styles.briefId}>{item.id}</code>
                <span className={styles.clusterBadge}>{item.cluster}</span>
                {item.urgent && <span className={styles.urgentBadge}>דחוף</span>}
              </div>
              <div className={styles.approvalTitle}>{item.title}</div>
              <div className={styles.approvalDetails}>
                <span>שלב: {item.stage}</span>
                <span>תקציב: {item.budget}</span>
                <span className={styles.deadline}>⏰ {item.deadline}</span>
              </div>
            </div>
            <div className={styles.approvalActions}>
              <button className={styles.approveBtn}>✓ אשר</button>
              <button className={styles.rejectBtn}>✗ דחה</button>
              <button className={styles.viewBtn}>👁️ צפה</button>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.comingSoonNote}>
        פונקציונליות מלאה בקרוב — DB schema ו-API בפיתוח
      </div>
    </div>
  )
}
