import { useState } from 'react'
import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import styles from './AppLayout.module.css'

interface Props {
  children: ReactNode
}

export function AppLayout({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className={styles.layout}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

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
          <span className={styles.mobileTitle}>Digitek</span>
        </header>

        <main className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  )
}
