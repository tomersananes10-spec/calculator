import { Outlet } from 'react-router-dom'
import { Topbar } from './Topbar'
import s from './AppLayout.module.css'

export function AppLayout() {
  return (
    <div className={s.layout}>
      <Topbar />
      <main className={s.main}>
        <Outlet />
      </main>
    </div>
  )
}
