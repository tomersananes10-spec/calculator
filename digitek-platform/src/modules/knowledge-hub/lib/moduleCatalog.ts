// Module catalog sent to Gemini so it can pick which LIBA modules are
// relevant for a user wish and build prefill_params correctly.

export const BRIEF_CLUSTERS = [
  { id: '1',  name: 'עיצוב שירות' },
  { id: '2',  name: 'תוכן' },
  { id: '3',  name: 'שינוי תהליכים' },
  { id: '4',  name: 'ניהול מוצר' },
  { id: '5',  name: 'דאטה' },
  { id: '6',  name: 'תשתיות והגירה לענן' },
  { id: '7',  name: 'הדרכה והטמעה' },
  { id: '8',  name: 'ניתוח ופיתוח' },
  { id: '9',  name: 'בסיסי נתונים' },
  { id: '10', name: 'חדשנות טכנולוגית' },
  { id: '11', name: 'אבטחת מידע' },
  { id: '12', name: 'אינטגרציה של פתרונות צד ג לענן (נימבוס)' },
] as const

export const AIML_ITEMS = [
  'spec', 'ml', 'dl', 'speech', 'nlp', 'cv', 'expert', 'ipa',
  'recommend', 'genai', 'rl', 'llm', 'anomaly', 'finops', 'mlops', 'ui',
] as const

export const ROVED5_CATEGORIES = [
  'security', 'database', 'storage', 'compute', 'ai_ml', 'analytics',
] as const

export const SUPPLIER_CLUSTERS = [
  'planning-analysis-development',
  'infra-cloud-migration',
  'tech-innovation',
  'third-party-cloud-integration',
  'training',
  'infosec',
  'databases',
] as const

export interface ModuleDescriptor {
  key: 'brief' | 'takam' | 'aiml' | 'tenders' | 'roved5' | 'suppliers'
  he_name: string
  purpose: string
  when_to_use: string
  prefill_schema: string
}

export const MODULE_CATALOG: ModuleDescriptor[] = [
  {
    key: 'brief',
    he_name: 'מחולל בריפים',
    purpose: 'יצירת מסמך דרישה ממשלתי (בריף) בן 10 שלבים — אפיון פרויקט מקצה לקצה.',
    when_to_use: 'תמיד כאשר יש כוונה לצאת לפרויקט/מכרז. הבריף הוא מסמך הבסיס לכל הליך רכש.',
    prefill_schema: 'params: { title, cluster_id (1-12), background, ministry }. cluster_id מהרשימה: ' +
      BRIEF_CLUSTERS.map(c => `${c.id}=${c.name}`).join(', '),
  },
  {
    key: 'takam',
    he_name: 'מחשבון תכ"ם (שעות אדם)',
    purpose: 'חישוב עלות פרויקט לפי שעות אדם — תפקידים מקצועיים, רמות, תקופה, מאצ\'ינג.',
    when_to_use: 'לפרויקטי פיתוח/אפיון/ניתוח/אינטגרציה שמחושבים לפי שעות (לא AI/ML).',
    prefill_schema: 'params: { name, ministry }',
  },
  {
    key: 'aiml',
    he_name: 'מחשבון AI/ML (תכ"ם 3.16)',
    purpose: 'חישוב עלות פרויקט AI/ML לפי תוצרים (16 פריטים × 3 גדלים).',
    when_to_use: 'פרויקטי AI/ML/Computer Vision/NLP/Deep Learning/GenAI/RAG/LLM.',
    prefill_schema: 'params: { name, ministry }. ייפתח אוטומטית במצב AI',
  },
  {
    key: 'tenders',
    he_name: 'מורשי חתימה (הליך מכרז)',
    purpose: 'ניהול הליך מכרז דיגיטק 9 שלבים: בריף → תקציב → ועדות → חתימות → התקשרות.',
    when_to_use: 'אחרי שיש בריף + חישוב תקציבי, פותחים הליך פורמלי. רק כש-הכוונה לרכש דרך מכרז דיגיטק.',
    prefill_schema: 'params: { name, brief_id, calculation_id }',
  },
  {
    key: 'roved5',
    he_name: 'רובד 5 (קטלוג שירותי ענן)',
    purpose: '327 שירותי ענן AWS+GCP מאושרים לרכישה ישירה ללא מכרז (מסלול מקוצר).',
    when_to_use: 'לרכישת שירות ענן ספציפי שכבר אושר. תמיד שווה לבדוק לפני יציאה למכרז.',
    prefill_schema: `params: { category, search }. category מהרשימה: ${ROVED5_CATEGORIES.join(', ')}`,
  },
  {
    key: 'suppliers',
    he_name: 'ספקים זוכים דיגיטק',
    purpose: '148 ספקים שזכו במכרז דיגיטק 07/2023 — מסונן לפי אשכול שירותים.',
    when_to_use: 'כדי לדעת מי הספקים שניתן להזמין הצעות מהם בהליך מכרז דיגיטק.',
    prefill_schema: `params: { cluster, specialization }. cluster מהרשימה: ${SUPPLIER_CLUSTERS.join(', ')}`,
  },
]
