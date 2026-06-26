import { buildGeminiPayload } from './promptBuilder'
import type { AdvisorResponse } from '../types'

export async function fetchAdvisorResponse(wish: string, signal?: AbortSignal): Promise<AdvisorResponse> {
  const trimmed = wish.trim()
  if (!trimmed) {
    throw new Error('בקשה ריקה')
  }

  const payload = buildGeminiPayload(trimmed)

  const res = await fetch('/api/ai-advisor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Gemini error ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = await res.json()

  // Gemini structured-output returns text in candidates[0].content.parts[0].text
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error('תגובה ריקה מ-Gemini')
  }

  try {
    const parsed = JSON.parse(text) as AdvisorResponse
    if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      throw new Error('Gemini החזיר 0 שלבים')
    }
    return parsed
  } catch (err) {
    throw new Error(`לא הצלחתי לפענח JSON מ-Gemini: ${(err as Error).message}`)
  }
}
