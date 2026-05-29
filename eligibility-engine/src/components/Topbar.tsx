import { Link, useLocation } from 'react-router-dom'
import s from './Topbar.module.css'

const NAV_ITEMS = [
  { href: '/', label: 'דשבורד' },
  { href: '/check/new', label: 'בדיקה' },
  { href: '/history', label: 'היסטוריה' },
  { href: '/settings', label: 'הגדרות' },
]

export function Topbar() {
  const { pathname } = useLocation()

  return (
    <header className={s.topbar}>
      <div className={s.right}>
        <span className={s.brand}>✦ Eligibility</span>
        <nav className={s.nav}>
          {NAV_ITEMS.map(item => {
            const isActive = item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                to={item.href}
                className={isActive ? s.navItemActive : s.navItem}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
      <div className={s.avatar}>מ</div>
    </header>
  )
}
