import styles from './StubPage.module.css'

const PROJECTS = [
  { id: 'PRJ-2026-0008', title: 'מערכת BI ממשרדית',  supplier: 'מטריקס IT',       status: 'בביצוע',  budget: '₪850K',  progress: 65 },
  { id: 'PRJ-2026-0007', title: 'שידרוג תשתית ענן',   supplier: 'Accenture Israel', status: 'בביצוע',  budget: '₪1.2M',  progress: 40 },
  { id: 'PRJ-2026-0006', title: 'פלטפורמת AI פנימית', supplier: 'אלביט מערכות',     status: 'בהקמה',   budget: '₪2.5M',  progress: 15 },
  { id: 'PRJ-2026-0005', title: 'מערכת ניהול תיקים', supplier: 'Amdocs',            status: 'הושלם',   budget: '₪320K',  progress: 100 },
]

const STATUS_COLORS: Record<string, string> = {
  'בביצוע': 'blue',
  'בהקמה':  'amber',
  'הושלם':  'green',
  'עצור':   'red',
}

export function ProjectsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>פרויקטים פעילים</h1>
        <p className={styles.sub}>{PROJECTS.length} פרויקטים · 3 פעילים</p>
      </div>

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>מספר</th>
              <th>כותרת</th>
              <th>ספק</th>
              <th>סטטוס</th>
              <th>תקציב</th>
              <th>התקדמות</th>
            </tr>
          </thead>
          <tbody>
            {PROJECTS.map(p => (
              <tr key={p.id} className={styles.tableRow}>
                <td><code className={styles.briefId}>{p.id}</code></td>
                <td className={styles.briefTitle}>{p.title}</td>
                <td>{p.supplier}</td>
                <td>
                  <span className={`${styles.statusBadge} ${styles['badge_' + (STATUS_COLORS[p.status] ?? 'gray')]}`}>
                    {p.status}
                  </span>
                </td>
                <td>{p.budget}</td>
                <td>
                  <div className={styles.progressWrap}>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: `${p.progress}%` }} />
                    </div>
                    <span className={styles.progressPct}>{p.progress}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.comingSoonNote}>
        ניהול מלאכת מחשבת, לוח זמנים, תוצרים וחשבוניות — בקרוב
      </div>
    </div>
  )
}
