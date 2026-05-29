import type { ReactNode } from 'react'
import s from './Badge.module.css'

type BadgeVariant = 'pass' | 'fail' | 'review' | 'neutral'

interface BadgeProps {
  variant: BadgeVariant
  children: ReactNode
}

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span className={`${s.badge} ${s[variant]}`}>
      {children}
    </span>
  )
}
