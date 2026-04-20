import { NavLink } from 'react-router-dom'
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
  { href: '/suppliers',  label: 'ספקים זוכים - LIBA', icon: '🏢' },
  // { href: '/projects',   label: 'פרויקטים',   icon: '📊' },
]

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: Props) {
  const { user } = useAuth()
  const fullName = user?.user_metadata?.full_name ?? user?.email ?? 'משתמש'
  const avatarUrl = user?.user_metadata?.avatar_url
  const initial = fullName[0]?.toUpperCase() ?? '?'

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
      {/* Mobile close button */}
      <button className={styles.closeBtn} onClick={onClose} aria-label="סגור תפריט">
        ✕
      </button>

      {/* Org / Brand */}
      <NavLink to="/" className={styles.brand} onClick={onClose}>
        <div className={styles.brandIcon}>🏛️</div>
        <div className={styles.brandText}>
          <div className={styles.brandName}>LIBA</div>
          <div className={styles.brandSub}>מערכת ממשלתית</div>
        </div>
      </NavLink>

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
        <NavLink to="/profile" className={styles.userSection} onClick={onClose}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className={styles.userAvatarImg} />
          ) : (
            <div className={styles.userAvatar}>{initial}</div>
          )}
          <div className={styles.userInfo}>
            <div className={styles.userName}>{fullName}</div>
          </div>
        </NavLink>
      </div>
    </aside>
  )
}
