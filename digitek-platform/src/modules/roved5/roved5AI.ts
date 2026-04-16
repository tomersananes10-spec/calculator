import type { Roved5Service, AISearchResult } from './types'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

export async function aiSearch(query: string, services: Roved5Service[]): Promise<AISearchResult[]> {
  const serviceList = services
    .map(s => `[${s.id}] ${s.name} | ${s.manufacturer} | ${s.description} | ${s.cloud} | ${s.type}`)
    .join('\n')

  const prompt = `אתה מומחה לשירותי ענן ממשלתיים ברובד 5.
המשתמש מחפש: "${query}"

מתוך רשימת השירותים הבאה, בחר את השירותים הכי רלוונטיים לצורך המשתמש.
חשוב: הבן את הכוונה גם אם הניסוח לא טכני. לדוגמה, "ניהול קבצים" → שירותי Storage, "שיחות וידאו" → שירותי תקשורת.

רשימת השירותים:
${serviceList}

החזר JSON בלבד ללא טקסט נוסף, ללא markdown, ללא קוד בלוקים:
{"results":[{"id":"מק\"ט","score":8,"reason":"הסבר קצר בעברית מדוע השירות מתאים"}]}

כלול רק שירותים עם score >= 6. מיין לפי score יורד. מקסימום 20 תוצאות.`

  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    })

    const data = await res.json()
    if (!res.ok || data.error) return []

    let raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
    raw = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '')

    const parsed = JSON.parse(raw)
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
