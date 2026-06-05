// Webhook receiver עבור ספקי חתימה דיגיטלית (Comsign / DocuSign). Stub.
//
// אבטחה (פאזה 5 — לפני שיש contract אמיתי מספק):
// דורש Authorization: Bearer <WEBHOOK_SECRET>. כשתינתן הסכמה לספק
// אמיתי (Comsign/DocuSign), נחליף ב-HMAC-SHA256 של ה-raw body מול
// X-DocuSign-Signature / Comsign HMAC scheme, עם crypto.timingSafeEqual.

const MAX_BODY_BYTES = 64 * 1024  // 64KB

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const secret = process.env.WEBHOOK_SECRET ?? process.env.CRON_SECRET
  if (!secret) {
    return res.status(503).json({ ok: false, error: 'Webhook not configured (WEBHOOK_SECRET missing)' })
  }
  const auth = req.headers?.authorization ?? ''
  if (auth !== `Bearer ${secret}`) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' })
  }

  // Cap payload size to avoid abuse
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
        action: 'signature_provider_call',
        notes: 'authenticated webhook (stub)',
        after_state: { provider: 'authenticated', payload_preview: payloadStr.slice(0, 1024) },
      }),
    })
  }

  return res.status(200).json({
    ok: true,
    note: 'Signature webhook stub. Real HMAC verification per provider will replace bearer auth when contract is signed.',
  })
}
