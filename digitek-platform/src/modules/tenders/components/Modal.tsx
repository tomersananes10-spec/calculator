import { useEffect, type ReactNode } from 'react'
import styles from './Modal.module.css'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button className={styles.close} onClick={onClose} aria-label="סגור">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

interface StepDotsProps {
  total: number
  current: number  // 1-indexed
  label?: string
}

export function StepDots({ total, current, label }: StepDotsProps) {
  return (
    <>
      <div className={styles.stepDots}>
        {Array.from({ length: total }, (_, i) => {
          const n = i + 1
          const cls = n < current ? styles.done : n === current ? styles.active : ''
          return <div key={n} className={`${styles.stepDot} ${cls}`} />
        })}
      </div>
      {label && <div className={styles.stepLabel}>שלב {current} מתוך {total} · {label}</div>}
    </>
  )
}

// Re-export styles for action modals
export { default as modalStyles } from './Modal.module.css'
