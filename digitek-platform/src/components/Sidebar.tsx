import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import styles from './Sidebar.module.css'

interface NavItem {
  href: string
  label: string
  icon: string
  badgeKey?: 'briefs'
}

const NAV_ITEMS: NavItem[] = [
  { href: '/',           label: 'בית',        icon: '🏠' },
  { href: '/briefs',     label: 'בריפים',     icon: '📋', badgeKey: 'briefs' },
  { href: '/calculator', label: 'מחשבון',     icon: '🧮' },
  { href: '/layer5',     label: 'רובד 5',      icon: '⚖️' },
  { href: '/tenders',    label: 'מורשי חתימה', icon: '✅' },
  { href: '/suppliers',  label: 'ספקים זוכים - LIBA', icon: '🏢' },
  // { href: '/projects',   label: 'פרויקטים',   icon: '📊' },
]

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: Props) {
  const { user, isAdmin } = useAuth()
  const fullName = user?.user_metadata?.full_name ?? user?.email ?? 'משתמש'
  const avatarUrl = user?.user_metadata?.avatar_url
  const initial = fullName[0]?.toUpperCase() ?? '?'

  const [briefsCount, setBriefsCount] = useState<number | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    supabase
      .from('briefs')
      .select('*', { count: 'exact', head: true })
      .then(({ count }) => {
        if (!cancelled) setBriefsCount(count ?? 0)
      })
    return () => { cancelled = true }
  }, [user])

  const badges: Record<NonNullable<NavItem['badgeKey']>, number | null> = {
    briefs: briefsCount,
  }

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
        </div>
      </NavLink>

      {/* Navigation */}
      <nav className={styles.nav}>
        {NAV_ITEMS.map(item => {
          const badge = item.badgeKey ? badges[item.badgeKey] : null
          return (
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
              {badge !== null && badge > 0 && (
                <span className={styles.navBadge}>{badge}</span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Admin link — only for admins */}
      {isAdmin && (
        <NavLink
          to="/admin"
          className={({ isActive }) =>
            `${styles.navItem} ${styles.adminLink} ${isActive ? styles.navItemActive : ''}`
          }
          onClick={onClose}
        >
          <span className={styles.navIcon}>🛡️</span>
          <span className={styles.navLabel}>ניהול מערכת</span>
        </NavLink>
      )}

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
