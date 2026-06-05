// Notification dispatcher — עובר על tender_notifications_queue ושולח (mock).
// בעתיד יתחבר ל-SendGrid/Twilio/FCM אמיתיים. כרגע רק מעדכן status=sent.
// משתמש ב-Supabase REST API ישיר.

const BATCH_SIZE = 50

async function supaFetch(url: string, key: string, init: RequestInit) {
  return fetch(url, {
    ...init,
    headers: {
      ...init.headers,
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
  })
}

export default async function handler(req: any, res: any) {
  const expectedSecret = process.env.CRON_SECRET
  const authHeader = req.headers?.authorization ?? ''
  if (!expectedSecret) return res.status(500).json({ ok: false, error: 'CRON_SECRET not configured' })
  if (authHeader !== `Bearer ${expectedSecret}`) return res.status(401).json({ ok: false, error: 'Unauthorized' })

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ ok: false, error: 'Supabase env not configured' })
  }

  const nowIso = new Date().toISOString()
  // Filter: status=eq.pending AND scheduled_for<=now
  const queueUrl = `${supabaseUrl}/rest/v1/tender_notifications_queue`
    + `?select=id,user_id,channel,notification_type,payload`
    + `&status=eq.pending&scheduled_for=lte.${encodeURIComponent(nowIso)}`
    + `&order=scheduled_for.asc&limit=${BATCH_SIZE}`

  try {
    const queueRes = await supaFetch(queueUrl, serviceRoleKey, { method: 'GET' })
    if (!queueRes.ok) {
      const errBody = await queueRes.text()
      return res.status(queueRes.status).json({ ok: false, error: errBody })
    }
    const queue: Array<{ id: string }> = await queueRes.json()
    if (queue.length === 0) {
      return res.status(200).json({ ok: true, dispatched: 0, message: 'queue empty' })
    }

    let sentOk = 0
    const errors: string[] = []
    for (const n of queue) {
      const updateUrl = `${supabaseUrl}/rest/v1/tender_notifications_queue?id=eq.${n.id}`
      const updRes = await supaFetch(updateUrl, serviceRoleKey, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'sent', sent_at: new Date().toISOString() }),
      })
      if (!updRes.ok) {
        errors.push(`${n.id}: ${updRes.status}`)
      } else {
        sentOk++
      }
    }
    return res.status(200).json({
      ok: true,
      dispatched: sentOk,
      failed: queue.length - sentOk,
      errors: errors.length > 0 ? errors : undefined,
      note: 'mock dispatch — real email/SMS in future iteration',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return res.status(502).json({ ok: false, error: msg })
  }
}
