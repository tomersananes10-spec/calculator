import type { ReactNode } from 'react'
import s from './Card.module.css'

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={`${s.card} ${className ?? ''}`}>
      <div className={s.cardBody}>{children}</div>
    </div>
  )
}
