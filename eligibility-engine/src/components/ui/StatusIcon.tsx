import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import type { RequirementStatus } from '../../modules/engine/types'

interface StatusIconProps {
  status: RequirementStatus
  size?: number
}

const config = {
  pass: { Icon: CheckCircle2, color: 'var(--green)' },
  fail: { Icon: XCircle, color: 'var(--red)' },
  requires_review: { Icon: AlertTriangle, color: 'var(--amber)' },
} as const

export function StatusIcon({ status, size = 20 }: StatusIconProps) {
  const { Icon, color } = config[status]
  return <Icon size={size} color={color} />
}

export function statusLabel(status: RequirementStatus): string {
  if (status === 'pass') return 'עומד/ת בתנאי הסף'
  if (status === 'requires_review') return 'נדרשת בדיקה אנושית'
  return 'לא עומד/ת בתנאי הסף'
}

export function reqStatusLabel(status: RequirementStatus): string {
  if (status === 'pass') return 'עומד'
  if (status === 'requires_review') return 'לבדיקה'
  return 'לא עומד'
}
