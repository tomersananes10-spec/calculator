import { useState, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import styles from './AppLayout.module.css'

interface Props {
  children: ReactNode
}

export function AppLayout({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const [resetCounter, setResetCounter] = useState(0)
  const lastHandledKey = useRef<string | null>(null)

  // Sidebar click → remount module content so internal state (wizard step,
  // search, filters, open modals) resets back to the module's home view.
  useEffect(() => {
    const state = location.state as { fromSidebar?: boolean } | null
    if (!state?.fromSidebar) return
    if (lastHandledKey.current === location.key) return
    lastHandledKey.current = location.key
    setResetCounter(c => c + 1)
  }, [location.key, location.state])

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  return (
    <div className={styles.layout}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={styles.mainWrapper}>
        {/* Mobile top bar */}
        <header className={styles.mobileTopbar}>
          <button
            className={styles.hamburger}
            onClick={() => setSidebarOpen(true)}
            aria-label="פתח תפריט"
          >
            ☰
          </button>
          <span className={styles.mobileTitle}>LIBA</span>
        </header>

        <main className={styles.main} key={resetCounter}>
          {children}
        </main>
      </div>
    </div>
  )
}
