import { Link } from 'react-router-dom'
import styles from './Topbar.module.css'

interface TopbarProps {
  title: string
  subtitle?: string
  showHomeLink?: boolean
  badge?: string
  userName?: string
}

export function Topbar({
  title,
  subtitle = 'שירותי מחשוב, דאטה ובינה מלאכותית',
  showHomeLink = false,
  badge,
  userName,
}: TopbarProps) {
  const initial = userName ? userName[0] : null

  return (
    <div className={styles.topbar}>
      <Link to="/" className={styles.logo}>🏛️</Link>
      <span className={styles.title}>{title}</span>
      <div className={styles.sep} />
      <span className={styles.sub}>{subtitle}</span>
      <div className={styles.spacer} />
      {showHomeLink && (
        <Link to="/" className={styles.homeLink}>← דשבורד</Link>
      )}
      {badge && (
        <div className={styles.badge}>
          <div className={styles.badgeDot} />
          {badge}
        </div>
      )}
      {initial && (
        <div className={styles.avatar}>{initial}</div>
      )}
    </div>
  )
}
