// Vercel cron endpoint — sweep ל-SLA breaches.
// מופעל ע"י GitHub Action כל שעה (לא דרך vercel.json cron שנשבר בעבר).
// דורש header Authorization: Bearer <CRON_SECRET>.
// משתמש ב-Supabase REST API ישיר כדי להימנע מ-dependency על SDK (api/ ב-root).

export default async function handler(req: any, res: any) {
  const expectedSecret = process.env.CRON_SECRET
  const authHeader = req.headers?.authorization ?? ''
  if (!expectedSecret) {
    return res.status(500).json({ ok: false, error: 'CRON_SECRET not configured' })
  }
  if (authHeader !== `Bearer ${expectedSecret}`) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' })
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({
      ok: false,
      error: 'Supabase env not configured (need SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)',
    })
  }

  try {
    const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/tender_check_sla_breaches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({}),
    })
    const data = await rpcRes.json()
    if (!rpcRes.ok) {
      return res.status(rpcRes.status).json({ ok: false, error: data })
    }
    return res.status(200).json({
      ok: true,
      marked_breached: data.marked_breached,
      escalated: data.escalated,
      checked_at: data.checked_at,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return res.status(502).json({ ok: false, error: msg })
  }
}
