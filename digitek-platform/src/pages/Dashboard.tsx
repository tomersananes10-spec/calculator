import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCalculationHistory } from '../modules/takam-calculator/useCalculationHistory'
import { fmtCurrency } from '../modules/takam-calculator/calc'
import styles from './Dashboard.module.css'

const STATS = [
  { label: 'בריפים פעילים',   value: '24',   trend: '↑12%',  color: 'blue' },
  { label: 'ממתינים לאישור',  value: '5',    trend: '2 דחוף', color: 'amber' },
  { label: 'תקציב מאושר',     value: '₪4.2M', trend: '↑8%',  color: 'green' },
  { label: 'פרויקטים פעילים', value: '8',    trend: '3 חדשים', color: 'purple' },
]

const RECENT_BRIEFS = [
  { id: 'DGTK-2026-0042', title: 'מערכת BI ממשרדית', cluster: 'דאטה', budget: '₪850K',  status: 'ממתין לאישור', updated: 'לפני שעה' },
  { id: 'DGTK-2026-0041', title: 'שידרוג תשתית ענן',  cluster: 'תשתיות', budget: '₪1.2M', status: 'בוועדה',        updated: 'לפני 3 ש׳' },
  { id: 'DGTK-2026-0040', title: 'פלטפורמת AI פנימית', cluster: 'חדשנות', budget: '₪2.5M', status: 'מאושר',         updated: 'אתמול' },
  { id: 'DGTK-2026-0039', title: 'מערכת ניהול תיקים', cluster: 'דאטה',    budget: '₪320K', status: 'טיוטה',         updated: 'לפני 2 ימים' },
]

const PENDING_APPROVALS = [
  { brief: 'DGTK-2026-0042', title: 'מערכת BI',      stage: 'מנהל ישיר',    deadline: 'מחר 17:00' },
  { brief: 'DGTK-2026-0038', title: 'אפליקציית נייד', stage: 'ועדת מכרזים',  deadline: 'בעוד 3 ימים' },
  { brief: 'DGTK-2026-0035', title: 'פורטל שירותים',  stage: 'חתימה דיגיטלית', deadline: 'בעוד שבוע' },
]

const CLUSTER_DIST = [
  { name: 'דאטה ובינה מלאכותית', count: 8, pct: 33 },
  { name: 'תשתיות ומיגרציה',      count: 6, pct: 25 },
  { name: 'חדשנות',                count: 5, pct: 21 },
  { name: 'אבטחת מידע',            count: 3, pct: 12 },
  { name: 'אחר',                   count: 2, pct: 8  },
]

const STATUS_COLORS: Record<string, string> = {
  'ממתין לאישור': 'amber',
  'בוועדה':        'blue',
  'מאושר':         'green',
  'טיוטה':         'gray',
  'בביצוע':        'purple',
}

export function Dashboard() {
  const { user } = useAuth()
  const fullName  = user?.user_metadata?.full_name ?? ''
  const firstName = fullName.split(' ')[0] || 'משתמש'
  const calcHistory = useCalculationHistory(user?.id)

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.greeting}>שלום, {firstName} 👋</h1>
          <p className={styles.headerSub}>סיכום פעילות עדכני</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.notifBtn} title="התראות">🔔</button>
          <Link to="/brief-generator" className={styles.newBriefBtn}>
            + בריף חדש
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        {STATS.map(stat => (
          <div key={stat.label} className={`${styles.statCard} ${styles['stat_' + stat.color]}`}>
            <div className={styles.statValue}>{stat.value}</div>
            <div className={styles.statLabel}>{stat.label}</div>
            <div className={styles.statTrend}>{stat.trend}</div>
          </div>
        ))}
      </div>

      {/* Recent Briefs */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>בריפים אחרונים</h2>
          <Link to="/briefs" className={styles.viewAll}>הצג הכל ←</Link>
        </div>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>מספר בריף</th>
                <th>כותרת</th>
                <th>אשכול</th>
                <th>תקציב</th>
                <th>סטטוס</th>
                <th>עדכון אחרון</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_BRIEFS.map(brief => (
                <tr key={brief.id}>
                  <td><span className={styles.briefId}>{brief.id}</span></td>
                  <td className={styles.briefTitle}>{brief.title}</td>
                  <td><span className={styles.clusterBadge}>{brief.cluster}</span></td>
                  <td>{brief.budget}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles['badge_' + (STATUS_COLORS[brief.status] ?? 'gray')]}`}>
                      {brief.status}
                    </span>
                  </td>
                  <td className={styles.updatedAt}>{brief.updated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two-column bottom */}
      <div className={styles.bottomGrid}>
        {/* Pending Approvals */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>ממתינים לאישורך</h2>
            <Link to="/approvals" className={styles.viewAll}>הצג הכל ←</Link>
          </div>
          <div className={styles.approvalList}>
            {PENDING_APPROVALS.map(item => (
              <div key={item.brief} className={styles.approvalItem}>
                <div className={styles.approvalLeft}>
                  <span className={styles.approvalBrief}>{item.brief}</span>
                  <span className={styles.approvalTitle}>{item.title}</span>
                </div>
                <div className={styles.approvalRight}>
                  <span className={styles.approvalStage}>{item.stage}</span>
                  <span className={styles.approvalDeadline}>⏰ {item.deadline}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cluster Distribution */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>התפלגות לפי אשכול</h2>
          </div>
          <div className={styles.clusterList}>
            {CLUSTER_DIST.map(item => (
              <div key={item.name} className={styles.clusterRow}>
                <div className={styles.clusterMeta}>
                  <span className={styles.clusterName}>{item.name}</span>
                  <span className={styles.clusterCount}>{item.count}</span>
                </div>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${item.pct}%` }} />
                </div>
                <span className={styles.clusterPct}>{item.pct}%</span>
              </div>
            ))}
          </div>
        </div>
        {/* Recent Calculations */}
        {calcHistory.calculations.length > 0 && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>חישובי תכ"ם אחרונים</h2>
              <Link to="/calculator" className={styles.viewAll}>הצג הכל ←</Link>
            </div>
            <div className={styles.calcList}>
              {calcHistory.calculations.slice(0, 5).map(calc => (
                <Link
                  key={calc.id}
                  to={`/calculator?load=${calc.id}`}
                  className={styles.calcItem}
                >
                  <div className={styles.calcItemLeft}>
                    <span className={styles.calcItemName}>{calc.name || 'ללא שם'}</span>
                    <span className={styles.calcItemMinistry}>{calc.ministry}</span>
                  </div>
                  <div className={styles.calcItemRight}>
                    <span className={styles.calcItemTotal}>{fmtCurrency(calc.grand_total, true)}</span>
                    <span className={styles.calcItemDate}>
                      {new Date(calc.updated_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
