import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import styles from './AppLayout.module.css'

interface Props {
  children: ReactNode
}

export function AppLayout({ children }: Props) {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.main}>
        {children}
      </main>
    </div>
  )
}
