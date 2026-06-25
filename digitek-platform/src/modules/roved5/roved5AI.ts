import type { Roved5Service, AISearchResult } from './types'

export type ServiceCategory = 'security' | 'database' | 'storage' | 'compute' | 'ai_ml' | 'analytics'

const CATEGORY_PATTERNS: Record<ServiceCategory, RegExp> = {
  security: /WAF|firewall|security|אבטח|הצפנה|הגנה|XDR|SIEM|vulnerability|threat|antivirus|malware|cyber|CASB|ZTNA|endpoint|DLP|SOAR|Cortex|חולשות|סריקה|הלבנה|SecuPi|Memcyco|SpecterX/i,
  database: /database|DB|redis|mongo|couchbase|SQL|postgres|elastic|search|data.*base|נתונים|Aerospike|illumex|סמנטי/i,
  storage: /backup|storage|גיבוי|אחסון|archive|blob|S3|file|NAS|recovery|CTERA|שחזור|סנכרון|קבצים|העברה|Flux|Commvault.*Node|Zerto|המשכיות עסקית/i,
  compute: /compute|VM|virtual|container|kubernetes|docker|serverless|ECS|fargate|lambda|instance|DaaS|desktop|מחשב מרוחק|IoT|load.balanc|עומסים|איזון|ADC|Alteon|delivery.controller|Citrix|Spot.*NetApp|ייעול.*עלויות/i,
  ai_ml: /\bAI\b|ML|machine.learning|deep.learning|NLP|GPT|vision|neural|בינה|למידה|Confidential.Computing|מוצפן|Modelyo/i,
  analytics: /analytics|monitoring|observ|log|dashboard|BI|visualization|Grafana|ניתוח|מעקב|דוחות|Datadog|Coralogix|Splunk|SnapLogic|ETL|ELT|integra|data.*platform|ERP|ניהול|ניטור|תפעול|CRM|ServiceNow|LowCode|low.code|פיתוח|Pub.Sub|מסרים|Kafka|Confluent|Foundry|OpsRamp|אוטומציה|Audity|בקרה|וידאו|Pexip|תקשורת|PortX|iConduct|FADDOM|מיפוי|Toonimo|הדרכ|InterSystems|רפואי/i,
}

export function categorizeService(service: Roved5Service): ServiceCategory | null {
  const text = `${service.name} ${service.description} ${service.manufacturer}`
  for (const [cat, regex] of Object.entries(CATEGORY_PATTERNS)) {
    if (regex.test(text)) return cat as ServiceCategory
  }
  return null
}

const HEBREW_STOP_WORDS = new Set([
  'אני', 'אתה', 'את', 'הוא', 'היא', 'אנחנו', 'הם', 'הן',
  'של', 'על', 'עם', 'אל', 'מן', 'בין', 'לפי', 'כמו', 'עד',
  'רוצה', 'צריך', 'צריכה', 'רוצים', 'מחפש', 'מחפשת', 'מחפשים',
  'לי', 'לו', 'לה', 'לנו', 'להם', 'שלי', 'שלו', 'שלה', 'שלנו',
  'זה', 'זו', 'זאת', 'אלה', 'אלו', 'הזה', 'הזאת',
  'יש', 'אין', 'היה', 'היתה', 'יהיה', 'כל', 'כמה', 'הרבה', 'מאוד',
  'גם', 'או', 'אם', 'כי', 'אבל', 'לא', 'כן', 'רק', 'עוד', 'כבר',
  'שעוזרת', 'שעוזר', 'שיכול', 'שיכולה', 'שמאפשר', 'שמאפשרת',
  'טוב', 'טובה', 'הכי', 'ביותר', 'יותר', 'פחות',
  'כלי', 'כלים', 'מערכת', 'מערכות', 'שירות', 'שירותים', 'פתרון', 'פתרונות', 'מוצר', 'מוצרים', 'תוכנה', 'תוכנות', 'פלטפורמה',
  'the', 'a', 'an', 'is', 'are', 'for', 'and', 'or', 'to', 'in', 'with', 'that', 'this',
  'i', 'we', 'need', 'want', 'looking', 'tool', 'tools', 'system', 'service', 'solution', 'platform',
])

function stemHebrew(word: string): string[] {
  const results = [word]
  let w = word

  const prefixes = /^(וב|וה|וכ|ול|ומ|וש|שב|שה|שכ|של|שמ|לב|לה|לכ|למ|ב|ה|ו|כ|ל|מ|ש)/
  if (w.length > 3) {
    const stripped = w.replace(prefixes, '')
    if (stripped.length >= 2) { w = stripped; results.push(w) }
  }

  const suffixes = /(?:ים|ות|ית|ת|ה|ן|ם)$/
  if (w.length > 3) {
    const stripped = w.replace(suffixes, '')
    if (stripped.length >= 2) results.push(stripped)
  }

  return [...new Set(results)]
}

// מילון נרדפות — מאחד מונחי תחום בעברית ובאנגלית כדי שחיפוש keyword
// יהיה רחב יותר. כל ערך = קבוצת מונחים שמרחיבים זה את זה. כשהמשתמש
// מקליד "אבטחה" — נחפש גם security, firewall, WAF, הצפנה, וכו'.
const SYNONYMS: string[][] = [
  ['אבטחה', 'אבטח', 'security', 'firewall', 'waf', 'הצפנה', 'הגנה', 'cyber', 'siem', 'xdr', 'דלף', 'dlp'],
  ['גיבוי', 'backup', 'recovery', 'שחזור', 'archive', 'אחסון', 'storage', 'נאס', 'nas', 'blob'],
  ['בסיס נתונים', 'database', 'db', 'sql', 'nosql', 'redis', 'mongo', 'postgres', 'נתונים'],
  ['ai', 'ml', 'בינה', 'machine learning', 'למידה', 'nlp', 'gpt', 'neural', 'מלאכותית'],
  ['וידאו', 'video', 'שיחות', 'תקשורת', 'voip', 'meeting', 'conference', 'ועידה'],
  ['ניטור', 'monitoring', 'observability', 'log', 'logs', 'מעקב', 'splunk', 'datadog', 'grafana', 'alerts'],
  ['אנליטיקה', 'analytics', 'bi', 'dashboard', 'ניתוח', 'דוחות', 'reports', 'visualization'],
  ['מחשוב', 'compute', 'vm', 'virtual', 'container', 'kubernetes', 'docker', 'k8s'],
  ['serverless', 'lambda', 'function', 'cloud function'],
  ['load balancer', 'איזון', 'עומסים', 'adc', 'cdn', 'מאזן'],
  ['erp', 'sap', 'מערכת ניהול', 'ניהול משאבים'],
  ['crm', 'ניהול לקוחות', 'שירות לקוחות', 'salesforce', 'servicenow'],
  ['etl', 'אינטגרציה', 'integration', 'pipeline', 'data pipeline'],
  ['קבצים', 'files', 'file', 'אחסון קבצים', 'מסמכים', 'documents'],
  ['מסרים', 'messaging', 'kafka', 'pub sub', 'queue', 'topic', 'תורים'],
  ['identity', 'identification', 'sso', 'oauth', 'זהות', 'הזדהות', 'iam'],
  ['email', 'מייל', 'דואל', 'דואר', 'mail'],
  ['compliance', 'עמידה', 'תקינה', 'iso', 'gdpr', 'audit', 'ביקורת'],
]

// אינדקס: מילה → קבוצת הנרדפות שלה
const SYNONYM_INDEX = new Map<string, Set<string>>()
for (const group of SYNONYMS) {
  const set = new Set(group.map(s => s.toLowerCase()))
  for (const term of group) SYNONYM_INDEX.set(term.toLowerCase(), set)
}

function expandWithSynonyms(term: string): string[] {
  const lower = term.toLowerCase()
  const group = SYNONYM_INDEX.get(lower)
  return group ? [...group] : []
}

function expandTerms(term: string): string[] {
  const variants = stemHebrew(term)

  if (term.length >= 6) {
    for (let i = 3; i <= term.length - 3; i++) {
      variants.push(...stemHebrew(term.slice(0, i)))
      variants.push(...stemHebrew(term.slice(i)))
    }
  }

  // נרדפות תחומיות (אבטחה ↔ security ↔ WAF וכו')
  variants.push(...expandWithSynonyms(term))

  return [...new Set(variants)]
}

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
{"results":[{"id":"מק\\"ט","score":8,"reason":"הסבר קצר בעברית מדוע השירות מתאים"}]}

כלול רק שירותים עם score >= 6. מיין לפי score יורד. מקסימום 20 תוצאות.`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const res = await fetch('/api/ai-advisor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!res.ok) return []
    const data = await res.json()
    if (data.error) return []

    let raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
    raw = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '')

    const parsed = JSON.parse(raw)
    return parsed.results || []
  } catch {
    clearTimeout(timeoutId)
    return []
  }
}

export function keywordSearch(query: string, services: Roved5Service[]): Roved5Service[] {
  const cleanTerms = query.toLowerCase().trim().split(/\s+/)
    .filter(t => t.length >= 2 && !HEBREW_STOP_WORDS.has(t))

  if (!cleanTerms.length) return []

  const termVariants = cleanTerms.map(expandTerms)

  return services
    .map(s => {
      const haystack = `${s.name} ${s.description} ${s.manufacturer} ${s.provider}`.toLowerCase()
      const matchCount = termVariants.filter(variants =>
        variants.some(v => haystack.includes(v))
      ).length
      return { service: s, score: matchCount / termVariants.length }
    })
    .filter(r => r.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .map(r => r.service)
}
