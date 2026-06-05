// Webhook receiver עבור ספקי חתימה דיגיטלית (Comsign / DocuSign).
// Stub בלבד — מתעד את הקריאה דרך REST API ישיר ל-Supabase.

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
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
        notes: 'mock webhook received',
        after_state: {
          provider: req.headers['user-agent'] ?? 'unknown',
          payload: req.body,
        },
      }),
    })
  }

  return res.status(200).json({
    ok: true,
    note: 'Signature webhook stub. Real integration (Comsign/DocuSign) pending product approval.',
  })
}
