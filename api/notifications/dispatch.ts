// Notification dispatcher — atomic claim ולאחר מכן dispatch (mock).
// בעתיד יתחבר ל-SendGrid/Twilio/FCM. כרגע ה-"dispatch" הוא רק עדכון status.
//
// אטומיות: PATCH עם תנאי `status=eq.pending` + `id=in.(...)` הוא
// אטומי ב-PostgREST. רק worker אחד יכול לקדם שורה מ-pending ל-sent.
// אם dispatch אמיתי ייכשל בעתיד — נצטרך 'processing' state ביניים +
// watchdog. כרגע אין real dispatch אז זה מספיק.

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

  try {
    // 1. שלוף candidate IDs (לא מבטיח אטומיות עדיין — זה רק בחירה)
    const candidatesUrl = `${supabaseUrl}/rest/v1/tender_notifications_queue`
      + `?select=id`
      + `&status=eq.pending&scheduled_for=lte.${encodeURIComponent(nowIso)}`
      + `&order=scheduled_for.asc&limit=${BATCH_SIZE}`
    const candRes = await supaFetch(candidatesUrl, serviceRoleKey, { method: 'GET' })
    if (!candRes.ok) {
      return res.status(candRes.status).json({ ok: false, error: await candRes.text() })
    }
    const candidates: Array<{ id: string }> = await candRes.json()
    if (candidates.length === 0) {
      return res.status(200).json({ ok: true, dispatched: 0, message: 'queue empty' })
    }

    // 2. Atomic claim — PATCH עם `status=eq.pending` כתנאי + `id=in.(...)`.
    //    רק שורות שעדיין pending יעודכנו. אחרים תפס אותם worker אחר.
    //    Prefer: return=representation מחזיר את השורות שעודכנו בפועל.
    const ids = candidates.map(c => c.id)
    const claimUrl = `${supabaseUrl}/rest/v1/tender_notifications_queue`
      + `?id=in.(${ids.join(',')})&status=eq.pending`
    const claimRes = await fetch(claimUrl, {
      method: 'PATCH',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ status: 'sent', sent_at: new Date().toISOString() }),
    })

    if (!claimRes.ok) {
      return res.status(claimRes.status).json({ ok: false, error: await claimRes.text() })
    }
    const claimed: Array<{ id: string }> = await claimRes.json()

    return res.status(200).json({
      ok: true,
      candidates: candidates.length,
      dispatched: claimed.length,
      skipped: candidates.length - claimed.length,  // נתפסו ע"י worker אחר
      note: 'mock dispatch — real email/SMS in future iteration',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return res.status(502).json({ ok: false, error: msg })
  }
}
