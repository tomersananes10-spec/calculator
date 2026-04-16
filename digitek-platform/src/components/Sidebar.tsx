import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import styles from './Sidebar.module.css'

interface NavItem {
  href: string
  label: string
  icon: string
  badge?: number
}

const NAV_ITEMS: NavItem[] = [
  { href: '/',           label: 'בית',        icon: '🏠' },
  { href: '/briefs',     label: 'בריפים',     icon: '📋', badge: 24 },
  { href: '/calculator', label: 'מחשבון תכ"ם', icon: '🧮' },
  { href: '/layer5',     label: 'רובד 5',      icon: '⚖️' },
  { href: '/approvals',  label: 'מורשי חתימה', icon: '✅', badge: 5 },
  { href: '/suppliers',  label: 'ספקים זוכים - דיגיטק', icon: '🏢' },
  // { href: '/projects',   label: 'פרויקטים',   icon: '📊' },
]

const BOTTOM_ITEMS: NavItem[] = [
  { href: '/admin', label: 'הגדרות', icon: '⚙️' },
]

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: Props) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const fullName = user?.user_metadata?.full_name ?? user?.email ?? 'משתמש'
  const initial = fullName[0]?.toUpperCase() ?? '?'

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
      {/* Mobile close button */}
      <button className={styles.closeBtn} onClick={onClose} aria-label="סגור תפריט">
        ✕
      </button>

      {/* Org / Brand */}
      <div className={styles.brand}>
        <div className={styles.brandIcon}>🏛️</div>
        <div className={styles.brandText}>
          <div className={styles.brandName}>Digitek</div>
          <div className={styles.brandSub}>מערכת ממשלתית</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === '/'}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
            onClick={onClose}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
            {item.badge !== undefined && (
              <span className={styles.navBadge}>{item.badge}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className={styles.bottom}>
        {BOTTOM_ITEMS.map(item => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
            onClick={onClose}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
          </NavLink>
        ))}

        {/* User */}
        <div className={styles.userSection}>
          <div className={styles.userAvatar}>{initial}</div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{fullName}</div>
          </div>
          <button className={styles.signOutBtn} onClick={handleSignOut} title="יציאה">
            ⏏
          </button>
        </div>
      </div>
    </aside>
  )
}
