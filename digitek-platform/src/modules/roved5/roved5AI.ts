import type { Roved5Service, AISearchResult } from './types'

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

export async function aiSearch(query: string, services: Roved5Service[]): Promise<AISearchResult[]> {
  if (!API_KEY) return []

  const serviceList = services
    .map(s => `[${s.id}] ${s.name} | ${s.manufacturer} | ${s.description} | ${s.cloud} | ${s.type}`)
    .join('\n')

  const body = {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `אתה מומחה לשירותי ענן ממשלתיים ברובד 5.
המשתמש מחפש: "${query}"

מתוך רשימת השירותים הבאה, בחר את השירותים הכי רלוונטיים לצורך המשתמש.
חשוב: הבן את הכוונה גם אם הניסוח לא טכני. לדוגמה, "ניהול קבצים" → שירותי Storage, "שיחות וידאו" → שירותי תקשורת.

רשימת השירותים:
${serviceList}

החזר JSON בדיוק בפורמט הבא ואין דבר אחר:
{"results":[{"id":"מק\\"ט","score":8,"reason":"הסבר קצר בעברית מדוע השירות מתאים"}]}

כלול רק שירותים עם score >= 6. מיין לפי score יורד. מקסימום 20 תוצאות.`,
      },
    ],
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerous-request-allowlist': 'allow-all',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) return []

    const data = await res.json()
    const text = data.content?.[0]?.text || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return []

    const parsed = JSON.parse(jsonMatch[0])
    return parsed.results || []
  } catch {
    return []
  }
}

export function keywordSearch(query: string, services: Roved5Service[]): Roved5Service[] {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  if (!terms.length) return services

  return services.filter(s => {
    const haystack = `${s.name} ${s.description} ${s.manufacturer} ${s.provider}`.toLowerCase()
    return terms.some(t => haystack.includes(t))
  })
}
