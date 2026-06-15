// Webhook receiver עבור מערכת אלמ"ה. Stub עם אימות bearer.

const MAX_BODY_BYTES = 64 * 1024

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const secret = process.env.WEBHOOK_SECRET ?? process.env.CRON_SECRET
  if (!secret) return res.status(503).json({ ok: false, error: 'Webhook not configured' })
  const auth = req.headers?.authorization ?? ''
  if (auth !== `Bearer ${secret}`) return res.status(401).json({ ok: false, error: 'Unauthorized' })

  const payloadStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})
  if (payloadStr.length > MAX_BODY_BYTES) {
    return res.status(413).json({ ok: false, error: 'Payload too large' })
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (supabaseUrl && serviceRoleKey) {
    await fetch(`${supabaseUrl}/rest/v1/tender_audit_log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        entity_type: 'integration_webhook',
        action: 'olma_call',
        notes: 'authenticated webhook (stub)',
        after_state: { payload_preview: payloadStr.slice(0, 1024) },
      }),
    })
  }

  return res.status(200).json({
    ok: true,
    note: 'Olma webhook stub — real verification when integration approved.',
  })
}
