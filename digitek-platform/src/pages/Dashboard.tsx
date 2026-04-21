import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCalculationHistory } from '../modules/takam-calculator/useCalculationHistory'
import { useBriefs } from '../hooks/useBriefs'
import { fmtCurrency } from '../modules/takam-calculator/calc'
import styles from './Dashboard.module.css'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'עכשיו'
  if (mins < 60) return `לפני ${mins} דק׳`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `לפני ${hours} שע׳`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'אתמול'
  return `לפני ${days} ימים`
}

export function Dashboard() {
  const { user } = useAuth()
  const fullName  = user?.user_metadata?.full_name ?? ''
  const firstName = fullName.split(' ')[0] || 'משתמש'
  const calcHistory = useCalculationHistory(user?.id)
  const { briefs, loading: briefsLoading } = useBriefs()

  const lastCalc = calcHistory.calculations[0]
  const draftBriefs = briefs.filter(b => b.status === 'draft').length
  const submittedBriefs = briefs.filter(b => b.status === 'submitted').length

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.greeting}>שלום, {firstName}</h1>
          <p className={styles.headerSub}>סיכום הפעילות שלך במערכת LIBA</p>
        </div>
      </div>

      {/* Quick stats */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.stat_blue}`}>
          <div className={styles.statValue}>{briefs.length}</div>
          <div className={styles.statLabel}>בריפים שלי</div>
          <div className={styles.statTrend}>{draftBriefs} טיוטות · {submittedBriefs} הוגשו</div>
        </div>
        <div className={`${styles.statCard} ${styles.stat_green}`}>
          <div className={styles.statValue}>{calcHistory.calculations.length}</div>
          <div className={styles.statLabel}>חישובי תכ"ם</div>
          <div className={styles.statTrend}>
            {lastCalc ? `אחרון: ${timeAgo(lastCalc.updated_at)}` : 'אין עדיין'}
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.stat_purple}`}>
          <div className={styles.statValue}>—</div>
          <div className={styles.statLabel}>רובד 5</div>
          <div className={styles.statTrend}>בקרוב</div>
        </div>
        <div className={`${styles.statCard} ${styles.stat_amber}`}>
          <div className={styles.statValue}>—</div>
          <div className={styles.statLabel}>מורשי חתימה</div>
          <div className={styles.statTrend}>בקרוב</div>
        </div>
      </div>

      {/* Module activity cards */}
      <div className={styles.modulesGrid}>
        {/* TAKAM Calculator */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>מחשבון תכ"ם</h2>
            <Link to="/calculator" className={styles.viewAll}>פתח מחשבון ←</Link>
          </div>
          {calcHistory.loading ? (
            <div className={styles.emptyState}>טוען...</div>
          ) : calcHistory.calculations.length === 0 ? (
            <div className={styles.emptyState}>
              <p>עדיין לא ביצעת חישובים</p>
              <Link to="/calculator" className={styles.actionLink}>+ חישוב ראשון</Link>
            </div>
          ) : (
            <div className={styles.calcList}>
              {calcHistory.calculations.slice(0, 4).map(calc => (
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
                    <span className={styles.calcItemDate}>{timeAgo(calc.updated_at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Briefs */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>בריפים</h2>
            <Link to="/briefs" className={styles.viewAll}>הצג הכל ←</Link>
          </div>
          {briefsLoading ? (
            <div className={styles.emptyState}>טוען...</div>
          ) : briefs.length === 0 ? (
            <div className={styles.emptyState}>
              <p>עדיין לא יצרת בריפים</p>
              <Link to="/brief-generator" className={styles.actionLink}>+ בריף ראשון</Link>
            </div>
          ) : (
            <div className={styles.briefList}>
              {briefs.slice(0, 4).map(brief => (
                <Link
                  key={brief.id}
                  to={`/brief-generator?id=${brief.id}`}
                  className={styles.briefItem}
                >
                  <div className={styles.briefItemLeft}>
                    <span className={styles.briefItemName}>{brief.title || 'טיוטה ללא שם'}</span>
                    <span className={styles.briefItemCluster}>
                      {brief.state?.identification?.selectedCluster?.name ?? '—'}
                    </span>
                  </div>
                  <div className={styles.briefItemRight}>
                    <span className={`${styles.statusBadge} ${styles['badge_' + (brief.status === 'submitted' ? 'blue' : 'gray')]}`}>
                      {brief.status === 'submitted' ? 'הוגש' : 'טיוטה'}
                    </span>
                    <span className={styles.briefItemDate}>{timeAgo(brief.updated_at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Layer 5 */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>רובד 5</h2>
            <Link to="/layer5" className={styles.viewAll}>פתח ←</Link>
          </div>
          <div className={styles.emptyState}>
            <p>מודול רובד 5 — חישוב עלויות שכבה 5</p>
            <Link to="/layer5" className={styles.actionLink}>כניסה למודול</Link>
          </div>
        </div>

        {/* Approvals */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>מורשי חתימה</h2>
            <Link to="/approvals" className={styles.viewAll}>פתח ←</Link>
          </div>
          <div className={styles.emptyState}>
            <p>מסלולי אישור וועדות — בפיתוח</p>
            <span className={styles.comingSoon}>בקרוב</span>
          </div>
        </div>

        {/* Suppliers */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>ספקים זוכים — LIBA</h2>
            <Link to="/suppliers" className={styles.viewAll}>פתח ←</Link>
          </div>
          <div className={styles.emptyState}>
            <p>ניהול ספקים מוסמכים ומכרזים</p>
            <Link to="/suppliers" className={styles.actionLink}>צפה ברשימה</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
