export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('[keep-alive] Missing Supabase env vars')
    return res.status(500).json({ error: 'Supabase env vars not configured' })
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id&limit=1`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    })

    console.log(`[keep-alive] Ping OK — status=${response.status} at ${new Date().toISOString()}`)

    return res.status(200).json({
      ok: response.ok,
      status: response.status,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[keep-alive] Failed to reach Supabase:', err)
    return res.status(502).json({ error: 'Failed to reach Supabase' })
  }
}
