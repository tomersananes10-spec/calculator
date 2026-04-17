import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import styles from './AppLayout.module.css'

interface Props {
  children: ReactNode
}

export function AppLayout({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

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

        <main className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  )
}
