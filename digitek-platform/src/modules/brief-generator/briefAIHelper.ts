import type { Specialization } from '../../data/clusters'

export async function generateBriefSuggestion(
  specialization: Specialization,
  projectDetails: { name: string; ministry: string; estimatedBudget: number }
): Promise<{ general: string; currentSituation: string; goals: string }> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `אתה עוזר לכתוב בריפים לפניות פרטניות במכרז LIBA הממשלתי.

ההתמחות: ${specialization.name}
תיאור ההתמחות: ${specialization.description}
שם הפרויקט: ${projectDetails.name}
המשרד/גוף: ${projectDetails.ministry}
היקף משוער: ${projectDetails.estimatedBudget.toLocaleString('he-IL')} ₪

כתוב הצעה לשלושה חלקים של הבריף בעברית:
1. תיאור כללי של הפרויקט (2-3 פסקאות)
2. המצב הקיים / הבעיה (2-3 פסקאות)
3. מטרות הפרויקט (3-5 נקודות)

החזר JSON בלבד בפורמט:
{"general": "...", "currentSituation": "...", "goals": "..."}`,
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  const data = await response.json()
  const text: string = data.content[0].text
  return JSON.parse(text.replace(/```json|```/g, '').trim())
}
