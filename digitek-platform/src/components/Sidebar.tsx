import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import roved5Services from '../data/roved5Services.json'
import styles from './Sidebar.module.css'

type BadgeKey = 'briefs' | 'calculator' | 'layer5' | 'tenders' | 'suppliers'

interface NavItem {
  href: string
  label: string
  icon: string
  badgeKey?: BadgeKey
}

const NAV_ITEMS: NavItem[] = [
  { href: '/',           label: 'בית',        icon: '🏠' },
  { href: '/briefs',     label: 'בריפים',     icon: '📋', badgeKey: 'briefs' },
  { href: '/calculator', label: 'מחשבון',     icon: '🧮', badgeKey: 'calculator' },
  { href: '/layer5',     label: 'רובד 5',      icon: '⚖️', badgeKey: 'layer5' },
  { href: '/tenders',    label: 'מורשי חתימה', icon: '✅', badgeKey: 'tenders' },
  { href: '/suppliers',  label: 'ספקים זוכים - LIBA', icon: '🏢', badgeKey: 'suppliers' },
  // { href: '/projects',   label: 'פרויקטים',   icon: '📊' },
]

// Static counts for modules that aren't DB-backed
const LAYER5_COUNT = (roved5Services as unknown[]).length
const SUPPLIERS_COUNT = 6

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
  const [calcCount, setCalcCount] = useState<number | null>(null)
  const [tendersCount, setTendersCount] = useState<number | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    const fetchCount = async (table: string, setter: (n: number) => void) => {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      if (!cancelled && !error) setter(count ?? 0)
      else if (!cancelled) setter(0)
    }

    fetchCount('briefs', setBriefsCount)
    fetchCount('calculations', setCalcCount)
    fetchCount('tenders', setTendersCount)

    return () => { cancelled = true }
  }, [user])

  const badges: Record<BadgeKey, number | null> = {
    briefs: briefsCount,
    calculator: calcCount,
    tenders: tendersCount,
    layer5: LAYER5_COUNT,
    suppliers: SUPPLIERS_COUNT,
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
              {badge !== null && (
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
