// Webhook receiver עבור מערכת אלמ"ה. Stub.

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

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
        notes: 'mock webhook received',
        after_state: { payload: req.body },
      }),
    })
  }

  return res.status(200).json({
    ok: true,
    note: 'Olma webhook stub. Integration pending אלמ"ה team approval.',
  })
}
