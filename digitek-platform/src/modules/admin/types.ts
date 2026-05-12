export type AdminTab =
  | 'analytics'
  | 'users'
  | 'admins'
  | 'support'
  | 'dev'
  | 'health'
  | 'data-quality'
  | 'security'
  | 'errors'

export interface AdminProfile {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  phone: string | null
  company: string | null
  company_id: string | null
  address: string | null
  specialization: string | null
  created_at: string
  is_admin: boolean
  last_sign_in_at: string | null
  auth_provider: string | null
  calculation_count: number
  brief_count: number
}

export type FilterType = 'all' | 'active' | 'inactive' | 'admin'

export interface SupportTicket {
  id: string
  user_id: string
  user_name: string | null
  user_email: string | null
  user_phone: string | null
  subject: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export interface DevTask {
  id: string
  title: string
  description: string | null
  page: string | null
  priority: 'urgent' | 'normal' | 'low'
  status: 'todo' | 'in_progress' | 'done'
  created_at: string
  updated_at: string
}

export interface AppErrorRecord {
  id: string
  error_type: string
  message: string
  stack: string | null
  context: Record<string, unknown> | null
  user_id: string | null
  created_at: string
}

export type HealthCheckStatus = 'idle' | 'running' | 'pass' | 'warn' | 'fail'

export interface HealthCheckResult {
  id: string
  label: string
  description: string
  status: HealthCheckStatus
  message?: string
  durationMs?: number
  icon: string
}

export type DQCheckStatus = 'pass' | 'fail' | 'warn' | 'error'

export interface DataQualityCheck {
  id: string
  check_name: string
  layer: string
  status: DQCheckStatus
  scope: string
  target_user_id: string | null
  expected: unknown
  actual: unknown
  message: string
  duration_ms: number
  ran_at: string
  batch_id: string
}

export interface AdminAnalytics {
  totalUsers: number
  activeUsers: number
  newUsers: number
  totalCalculations: number
  totalBriefs: number
  adminCount: number
  userGrowth: { date: string; count: number }[]
}
