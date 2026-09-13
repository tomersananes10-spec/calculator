import { buildGeminiPayload } from './promptBuilder'
import { SUPPLIER_CLUSTERS } from './moduleCatalog'
import { EXPERTISE_TO_SUPPLIER_CLUSTER, domainLabel } from '../../expertise/clusterMapping'
import type { AdvisorResponse } from '../types'

const VALID_SUPPLIER_SLUGS = new Set<string>(SUPPLIER_CLUSTERS.map(c => c.slug))

// Gemini לא תמיד בוחר את אשכול הספקים הנכון (הוא נטה להעתיק אשכול מדוגמה).
// מיישרים דטרמיניסטית: אם יש שלב brief/expertise עם cluster_id, אשכול הספקים
// (וגם הכותרת/תיאור) נגזרים ממנו דרך המיפוי אשכול→אשכול. כך היעד תמיד תואם
// לאשכול שהמשתמש באמת ביקש.
function normalizeSupplierClusters(resp: AdvisorResponse): AdvisorResponse {
  const hintStep = resp.steps.find(
    s => (s.module_key === 'brief' || s.module_key === 'expertise') &&
         s.prefill_params?.cluster_id != null,
  )
  const hintId = hintStep ? Number(hintStep.prefill_params.cluster_id) : null
  const mapped = hintId ? EXPERTISE_TO_SUPPLIER_CLUSTER[hintId] : null

  for (const step of resp.steps) {
    if (step.module_key !== 'suppliers') continue
    const p = step.prefill_params ?? (step.prefill_params = {})
    if (mapped) {
      p.cluster = mapped.clusterSlug
      step.title = `הכר ספקים זוכים באשכול ${mapped.clusterName}`
      step.description = `ספקים שזכו באשכול ${mapped.clusterName} (${domainLabel(mapped.domain)}) במכרז דיגיטק 07/2023`
    } else if (typeof p.cluster === 'string' && !VALID_SUPPLIER_SLUGS.has(p.cluster)) {
      // slug לא תקין מה-AI — עדיף להציג את כל הספקים מאשר לשלוח לאשכול שגוי
      delete p.cluster
    }
    // כשיש אשכול מדויק, search/specialization מהמשאלה רק מסננים יתר על המידה
    // (טקסט חופשי כמו "מנהל מוצר" לא תואם לשמות הספקים → 0 תוצאות). האשכול מספיק.
    if (typeof p.cluster === 'string' && VALID_SUPPLIER_SLUGS.has(p.cluster)) {
      delete p.search
      delete p.specialization
    }
  }
  return resp
}

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
    return normalizeSupplierClusters(parsed)
  } catch (err) {
    throw new Error(`לא הצלחתי לפענח JSON מ-Gemini: ${(err as Error).message}`)
  }
}
