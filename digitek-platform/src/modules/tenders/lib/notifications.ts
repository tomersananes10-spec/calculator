// התראות — abstraction בלבד בפאזה 2
// המימוש הנוכחי: הוספה ל-tender_notifications_queue עם status='pending'
// dispatch אמיתי (Email/SMS/Push) יקרה בפאזה 5 דרך Vercel function שתעבד את התור.

import { supabase } from '../../../lib/supabase'
import type { NotificationChannel } from '../types'

export interface NotificationPayload {
  notification_type: string
  tender_id?: string | null
  data: Record<string, unknown>
}

export interface EnqueueOptions {
  userId: string
  channel: NotificationChannel
  payload: NotificationPayload
  scheduledFor?: Date
}

export async function enqueueNotification(opts: EnqueueOptions): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { userId, channel, payload, scheduledFor } = opts
  const { data, error } = await supabase
    .from('tender_notifications_queue')
    .insert({
      user_id: userId,
      tender_id: payload.tender_id ?? null,
      notification_type: payload.notification_type,
      channel,
      payload: payload.data,
      scheduled_for: (scheduledFor ?? new Date()).toISOString(),
      status: 'pending',
    })
    .select('id')
    .single()
  if (error) return { ok: false, error: error.message }
  return { ok: true, id: data.id as string }
}

/** עזר נפוץ — התראה על SLA שעומד להסתיים. */
export async function notifySlaApproaching(opts: {
  userId: string
  tenderId: string
  approvalRequestId: string
  hoursRemaining: number
}): Promise<void> {
  await enqueueNotification({
    userId: opts.userId,
    channel: 'in_app',
    payload: {
      notification_type: 'sla_approaching',
      tender_id: opts.tenderId,
      data: {
        approval_request_id: opts.approvalRequestId,
        hours_remaining: opts.hoursRemaining,
        message: `SLA יסתיים בעוד ${opts.hoursRemaining} שעות`,
      },
    },
  })
}

/** עזר נפוץ — התראה על חריגת SLA. */
export async function notifySlaBreached(opts: {
  userId: string
  tenderId: string
  approvalRequestId: string
  daysOverdue: number
}): Promise<void> {
  await enqueueNotification({
    userId: opts.userId,
    channel: 'email',
    payload: {
      notification_type: 'sla_breached',
      tender_id: opts.tenderId,
      data: {
        approval_request_id: opts.approvalRequestId,
        days_overdue: opts.daysOverdue,
        message: `SLA חרג ב-${opts.daysOverdue} ימי עבודה`,
      },
    },
  })
}
