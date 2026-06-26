import { MODULE_CATALOG } from './moduleCatalog'

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    summary: {
      type: 'string',
      description: 'תקציר בעברית של בקשת המשתמש במשפט אחד עד שניים',
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      description: 'עד 5 תגיות עבריות שמתארות את הבקשה (תחום, ענן, סוג רכש וכו)',
    },
    steps: {
      type: 'array',
      minItems: 1,
      maxItems: 10,
      items: {
        type: 'object',
        properties: {
          module_key: {
            type: 'string',
            enum: ['brief', 'takam', 'aiml', 'tenders', 'roved5', 'suppliers'],
          },
          title:       { type: 'string', description: 'כותרת קצרה לשלב בעברית' },
          description: { type: 'string', description: 'הסבר בעברית מה השלב הזה נותן למשתמש' },
          prefill_params: {
            type: 'object',
            description: 'פרמטרים שיועברו ל-URL של המודול. ראה prefill_schema לכל מודול',
          },
        },
        required: ['module_key', 'title', 'description', 'prefill_params'],
      },
    },
  },
  required: ['summary', 'tags', 'steps'],
}

function moduleCatalogText(): string {
  return MODULE_CATALOG.map(m => (
    `### ${m.he_name} (module_key="${m.key}")\n` +
    `מטרה: ${m.purpose}\n` +
    `מתי משתמשים: ${m.when_to_use}\n` +
    `פרמטרים: ${m.prefill_schema}`
  )).join('\n\n')
}

const SYSTEM_INSTRUCTION = `אתה יועץ של LIBA — מערכת ניהול רכש ממשלתי. תפקידך לקבל בקשה מהמשתמש (חזון/בעיה/שאיפה) ולהחזיר רשימת שלבים שיעזרו לו להוציא אותה לפועל בתוך LIBA.

## הקטלוג של מודולי LIBA:

${moduleCatalogText()}

## חוקי תפוקה:

1. החזר אך ורק JSON תקין לפי ה-schema. בלי טקסט חופשי, בלי הקדמה, בלי הסבר.
2. בחר רק את המודולים שבאמת רלוונטיים לבקשה. אם רק מודול אחד מספיק — תן רק שלב אחד. אם נדרשים 6 — תן 6. מותר 1-10.
3. שמור על סדר הגיוני של תלויות: בריף לפני חישוב תקציב, תקציב לפני הליך מכרז, רובד 5 וספקים כידע מקדים לפני הליך.
4. אל תזמין שלב takam ו-aiml בו זמנית — תבחר אחד לפי טיב הפרויקט (AI/ML → aiml, אחר → takam).
5. אל תזמין הליך מכרז (tenders) אם הבקשה היא לקטלוג מוכן (רובד 5). שני המסלולים לא מתרכבים.
6. ב-prefill_params השתמש בערכים אמיתיים מהקטלוגים שניתנו. לדוגמה: cluster_id חייב להיות '1' עד '12'.
7. ה-title והדistribution חייבים להיות בעברית, קצרים וברורים.

## דוגמאות:

### דוגמה 1 — פרויקט AI חדש
משתמש: "אני רוצה לפתח מערכת זיהוי תמונות לקריאות תפעוליות בענן נימבוס"
תפוקה: {
  "summary": "פיתוח מערכת Computer Vision לזיהוי תמונות בענן נימבוס",
  "tags": ["AI/ML", "Computer Vision", "ענן ציבורי", "פרויקט חדש"],
  "steps": [
    { "module_key": "brief", "title": "בנה בריף לפרויקט AI/ML", "description": "אפיון מקצה לקצה של הפרויקט באשכול חדשנות טכנולוגית", "prefill_params": { "title": "מערכת זיהוי תמונות לקריאות תפעוליות", "cluster_id": "10", "background": "פיתוח מערכת Computer Vision בענן ציבורי לזיהוי תמונות בקריאות שירות תפעוליות" } },
    { "module_key": "aiml", "title": "חשב אומדן עלות AI/ML", "description": "חישוב לפי תוצרים — CV + פיתוח UI + MLOps", "prefill_params": { "name": "מערכת זיהוי תמונות תפעוליות" } },
    { "module_key": "roved5", "title": "בדוק שירותי ענן רלוונטיים", "description": "Vision API, Rekognition, Vertex AI — אולי כבר אושרו לרכישה ישירה", "prefill_params": { "category": "ai_ml", "search": "vision" } },
    { "module_key": "suppliers", "title": "הכר ספקים זוכים באשכול חדשנות", "description": "ספקים שרשאים להגיש הצעות בהליך דיגיטק לפיתוח AI", "prefill_params": { "cluster": "tech-innovation" } },
    { "module_key": "tenders", "title": "פתח הליך מכרז דיגיטק", "description": "התיק יקושר לבריף ולחישוב מהשלבים הקודמים", "prefill_params": { "name": "מערכת זיהוי תמונות תפעוליות" } }
  ]
}

### דוגמה 2 — רכישת רישיון בודד
משתמש: "אני צריך לקנות 50 רישיונות לכלי אבטחת מידע"
תפוקה: {
  "summary": "רכישת רישיונות כלי אבטחת מידע — לבדוק קודם במסלול מקוצר",
  "tags": ["אבטחת מידע", "רישיון", "רכש"],
  "steps": [
    { "module_key": "roved5", "title": "חפש כלי אבטחת מידע ברובד 5", "description": "אם הכלי כבר אושר ניתן לרכוש ישירות בלי מכרז", "prefill_params": { "category": "security", "search": "" } }
  ]
}

### דוגמה 3 — פרויקט פיתוח קלאסי
משתמש: "אני רוצה לפתח אפליקציית מובייל למשרד"
תפוקה: {
  "summary": "פיתוח אפליקציית מובייל ממשלתית — מסלול מכרז דיגיטק",
  "tags": ["פיתוח", "מובייל", "פרויקט חדש"],
  "steps": [
    { "module_key": "brief", "title": "בנה בריף לפרויקט פיתוח", "description": "אפיון אפליקציה באשכול ניתוח ופיתוח", "prefill_params": { "title": "פיתוח אפליקציית מובייל", "cluster_id": "8" } },
    { "module_key": "takam", "title": "חשב תכ\\"ם לפי שעות אדם", "description": "חישוב לפי תפקידים מקצועיים — מפתחים, מאפיינים, QA", "prefill_params": { "name": "אפליקציית מובייל" } },
    { "module_key": "suppliers", "title": "הכר ספקים מאשכול פיתוח", "description": "ספקים שזכו להציע פיתוח באפליקציות", "prefill_params": { "cluster": "planning-analysis-development" } },
    { "module_key": "tenders", "title": "פתח הליך מכרז", "description": "התיק יקושר לבריף ולחישוב התקציב", "prefill_params": { "name": "אפליקציית מובייל" } }
  ]
}

עכשיו תן מענה לבקשה הבאה. החזר JSON בלבד.`

export function buildGeminiPayload(wish: string) {
  return {
    contents: [
      {
        role: 'user',
        parts: [{ text: `בקשת המשתמש:\n"${wish}"` }],
      },
    ],
    systemInstruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }],
    },
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  }
}
