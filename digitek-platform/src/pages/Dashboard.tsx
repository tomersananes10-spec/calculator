import { Link } from 'react-router-dom'
import { Topbar } from '../components/Topbar'
import { useAuth } from '../hooks/useAuth'
import styles from './Dashboard.module.css'

interface Module {
  id: string
  name: string
  desc: string
  icon: string
  iconBg: string
  href: string
  active: boolean
}

const MODULES: Module[] = [
  {
    id: 'calculator',
    name: 'מחשבון תכ"ם',
    desc: 'חישוב עלויות פרויקט — כוח אדם, תשתיות וחומרה',
    icon: '🧮',
    iconBg: '#f0fdfa',
    href: '/calculator',
    active: true,
  },
  {
    id: 'briefs',
    name: 'מחולל בריפים',
    desc: 'יצירת בריף פרויקט אוטומטי',
    icon: '📄',
    iconBg: '#eff6ff',
    href: '/briefs',
    active: false,
  },
  {
    id: 'layer5',
    name: 'רובד 5',
    desc: 'ניהול תקציב ורמות אישור',
    icon: '⚖️',
    iconBg: '#faf5ff',
    href: '/layer5',
    active: false,
  },
  {
    id: 'committees',
    name: 'ועדות משפטיות',
    desc: 'מסלול העלאת בריף עם ועדות',
    icon: '🏛️',
    iconBg: '#fffbeb',
    href: '/committees',
    active: false,
  },
  {
    id: 'signatories',
    name: 'מורשי חתימה',
    desc: 'ניהול הרשאות חתימה',
    icon: '✍️',
    iconBg: '#fff1f2',
    href: '/signatories',
    active: false,
  },
  {
    id: 'vendors',
    name: 'ספקים זוכים',
    desc: 'רשימת ספקים זוכים — דיגיטק',
    icon: '🏆',
    iconBg: '#f0fdf4',
    href: '/vendors',
    active: false,
  },
]

const activeCount = MODULES.filter(m => m.active).length

export function Dashboard() {
  const { user, signOut } = useAuth()
  const fullName = user?.user_metadata?.full_name ?? ''
  const firstName = fullName.split(' ')[0] || 'משתמש'

  return (
    <>
      <Topbar
        title="[שם המערכת]"
        badge="Beta"
        userName={fullName}
      />
      <div className={styles.main}>
        <div className={styles.welcome}>
          <div className={styles.greeting}>שלום {firstName} 👋</div>
          <div className={styles.welcomeSub}>בחר מודול להתחיל</div>
        </div>

        <div className={styles.secHeader}>
          <span className={styles.secTitle}>מודולים</span>
          <span className={styles.secCount}>{MODULES.length} מודולים · {activeCount} פעיל</span>
        </div>

        <div className={styles.grid}>
          {MODULES.map(mod =>
            mod.active ? (
              <Link key={mod.id} to={mod.href} className={styles.card}>
                <div className={styles.icon} style={{ background: mod.iconBg }}>{mod.icon}</div>
                <div className={styles.name}>{mod.name}</div>
                <div className={styles.desc}>{mod.desc}</div>
                <div className={styles.arrow}>←</div>
              </Link>
            ) : (
              <div key={mod.id} className={`${styles.card} ${styles.soon}`}>
                <div className={styles.soonBadge}>בקרוב</div>
                <div className={styles.icon} style={{ background: mod.iconBg }}>{mod.icon}</div>
                <div className={styles.name}>{mod.name}</div>
                <div className={styles.desc}>{mod.desc}</div>
              </div>
            )
          )}
        </div>

        <div className={styles.footer}>מערכת בפיתוח פעיל · גרסה 0.1 · 2026</div>
      </div>
    </>
  )
}
