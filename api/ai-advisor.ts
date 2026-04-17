import type { VercelRequest, VercelResponse } from '@vercel/node'

const GEMINI_MODEL = 'gemini-2.5-flash'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server' })
  }

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      }
    )

    const data = await geminiRes.json()

    if (!geminiRes.ok) {
      return res.status(geminiRes.status).json(data)
    }

    return res.status(200).json(data)
  } catch {
    return res.status(502).json({ error: 'Failed to reach Gemini API' })
  }
}
