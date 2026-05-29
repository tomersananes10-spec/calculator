import { Link, useLocation } from 'react-router-dom'
import s from './Sidebar.module.css'

const NAV_ITEMS = [
  { href: '/', label: 'דשבורד', icon: '🏠' },
  { href: '/check/new', label: 'בדיקה חדשה', icon: '🔍' },
  { href: '/history', label: 'היסטוריה', icon: '📋' },
  { href: '/settings', label: 'הגדרות', icon: '⚙️' },
]

export function Sidebar() {
  const { pathname } = useLocation()

  return (
    <aside className={s.sidebar}>
      <div className={s.brand}>
        <div className={s.brandTitle}>AI Eligibility Engine</div>
        <div className={s.brandSub}>בדיקת תנאי סף · תכ"ם</div>
      </div>

      <nav className={s.nav}>
        {NAV_ITEMS.map(item => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`${s.navItem} ${isActive ? s.navItemActive : ''}`}
            >
              <span className={s.navIcon}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className={s.footer}>
        מנוע בדיקת זכאות · MVP v1.0
      </div>
    </aside>
  )
}
