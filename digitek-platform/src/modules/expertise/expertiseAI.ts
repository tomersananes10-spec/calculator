import type { ExpertiseCluster, ExpertiseAiResponse } from './types'

// בונה את קטלוג האשכולות+ההתמחויות (שמות בלבד) לתוך ה-prompt, כדי ש-Gemini
// יבחר אך ורק מתוך הקטלוג האמיתי ולא ימציא התמחויות.
function catalogText(clusters: ExpertiseCluster[]): string {
  return clusters
    .map(c =>
      `אשכול ${c.cluster_id} — ${c.name}:\n` +
      c.specs.map(s => `  • ${s.name}`).join('\n')
    )
    .join('\n\n')
}

function buildPayload(problem: string, clusters: ExpertiseCluster[]) {
  const system = `אתה יועץ מומחה למכרז דיגיטק (07-2023) של מינהל הרכש הממשלתי. המשתמש יתאר בעיה/צורך/מטרה בשפה חופשית, ותפקידך להתאים לו את ההתמחויות המדויקות ביותר מתוך הקטלוג בלבד.

## קטלוג האשכולות וההתמחויות (בחר אך ורק מתוכו):

${catalogText(clusters)}

## חוקי תפוקה:
1. החזר אך ורק JSON תקין לפי ה-schema. בלי טקסט חופשי, בלי הקדמה.
2. בחר 1-5 התמחויות הרלוונטיות ביותר, ממוינות מהמתאים ביותר. אם רק אחת מתאימה — החזר אחת.
3. cluster_name, spec_name — חייבים להיות זהים בדיוק לשמות מהקטלוג (העתקה מדויקת).
4. cluster_id — המספר של האשכול שאליו שייכת ההתמחות.
5. reason — משפט קצר בעברית שמסביר למה ההתמחות הזו מתאימה לבעיה שתוארה.
6. summary — משפט אחד שמסכם את הצורך של המשתמש.`

  return {
    contents: [{ role: 'user', parts: [{ text: `הבעיה/הצורך של המשתמש:\n"${problem}"` }] }],
    systemInstruction: { parts: [{ text: system }] },
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          summary: { type: 'STRING' },
          hits: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                cluster_id: { type: 'INTEGER' },
                cluster_name: { type: 'STRING' },
                spec_name: { type: 'STRING' },
                reason: { type: 'STRING' },
              },
              required: ['cluster_id', 'cluster_name', 'spec_name', 'reason'],
            },
          },
        },
        required: ['summary', 'hits'],
      },
    },
  }
}

export async function expertiseAiSearch(
  problem: string,
  clusters: ExpertiseCluster[],
  signal?: AbortSignal,
): Promise<ExpertiseAiResponse> {
  const trimmed = problem.trim()
  if (!trimmed) throw new Error('בקשה ריקה')

  const res = await fetch('/api/ai-advisor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildPayload(trimmed, clusters)),
    signal,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`שגיאת AI ${res.status}: ${text.slice(0, 160)}`)
  }

  const data = await res.json()
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('תגובה ריקה מ-Gemini')

  const parsed = JSON.parse(text) as ExpertiseAiResponse
  if (!Array.isArray(parsed.hits)) parsed.hits = []
  return parsed
}
