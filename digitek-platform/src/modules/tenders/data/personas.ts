// 13 פרסונות (לפי גליון "פרסונות והרשאות" ב-Excel האפיון)

import type { PersonaRole } from '../types'

export interface PersonaDefinition {
  role: PersonaRole
  number: number
  label: string
  shortLabel: string
  description: string
  mainActions: string[]
  mainScreens: string[]
  permissions: string
  notifications: string[]
  kpi: string
  category: 'internal_ministry' | 'procurement' | 'committee' | 'external' | 'admin'
}

export const PERSONAS: PersonaDefinition[] = [
  {
    role: 'process_manager',
    number: 1,
    label: 'מנהל הליך (משרד מזמין)',
    shortLabel: 'מנהל הליך',
    description: 'המשתמש הראשי ב-CRM. אחראי על ניהול ההליך מקצה לקצה.',
    mainActions: ['פתיחת הליך', 'מילוי בריף', 'ניתוב לאישורים', 'ניהול מסמכים', 'מענה לשאלות', 'אישור חשבוניות', 'הערכת ספק'],
    mainScreens: ['תיק הליך', 'רשימת משימות אישית', 'יומן ועדות', 'פורטל ספקים פנימי'],
    permissions: 'Full CRUD על הליכים שבבעלותו; Read-only על הליכים של אחרים במחלקתו',
    notifications: ['תזכורות SLA', 'החזרות מועדה', 'שאלות הבהרה חדשות', 'חשבונית להמתנה'],
    kpi: '% הליכים שמסתיימים בזמן יעד; מס\' החזרות מועדות מכרזים',
    category: 'internal_ministry',
  },
  {
    role: 'budget_officer',
    number: 2,
    label: 'תקציבן המערך',
    shortLabel: 'תקציבן',
    description: 'אחראי על אישור תקציבי והקצאת מספר תיחור.',
    mainActions: ['מתן אישור תקציבי', 'הקצאת מספר תיחור', 'ניטור תקציב פר הליך'],
    mainScreens: ['תור בקשות אישור', 'דשבורד תקציב'],
    permissions: 'Read on Tender, Create/Update on Budget Approval & Tender Number',
    notifications: ['בקשה חדשה לאישור', 'חריגה תקציבית'],
    kpi: 'זמן ממוצע למתן אישור (יעד: ≤3 ימי עבודה)',
    category: 'internal_ministry',
  },
  {
    role: 'procurement_professional',
    number: 3,
    label: 'גורם מקצועי – מינהל הרכש',
    shortLabel: 'גורם מקצועי',
    description: 'בודק את הפרויקט במערכת התיחורים תוך 3 ימי עבודה.',
    mainActions: ['בדיקת פרויקט', 'אישור/דחיה', 'מתן הערות'],
    mainScreens: ['תור בדיקות', 'פירוט פרויקט', 'ממשק להערות'],
    permissions: 'Read on Tender; Approve/Reject + comments',
    notifications: ['פרויקט חדש לבדיקה', 'מתקרב לסיום SLA'],
    kpi: '% עמידה ב-SLA של 3 ימי עבודה',
    category: 'procurement',
  },
  {
    role: 'procurement_manager',
    number: 4,
    label: 'מנהל הרכש',
    shortLabel: 'מנהל רכש',
    description: 'מאשר מכרזים מעל 5,000,000 ₪.',
    mainActions: ['אישור/דחיה', 'צפיה במגמות'],
    mainScreens: ['תור אישורים מערכתי', 'דשבורד ניהולי'],
    permissions: 'Read on Tender; Approve via integration',
    notifications: ['בקשה חדשה לאישור מעל 5M'],
    kpi: 'זמן ממוצע לאישור (יעד: ≤7 ימי עבודה)',
    category: 'procurement',
  },
  {
    role: 'tender_committee_member',
    number: 5,
    label: 'חבר ועדת מכרזים',
    shortLabel: 'חבר ועדה',
    description: 'מאשר יציאה לתיחור ואישור זוכה.',
    mainActions: ['צפיה בפרוטוקול', 'הצבעה', 'החלטה', 'רישום הסתייגויות'],
    mainScreens: ['אג\'נדת ישיבה', 'חבילת ישיבה (Read)', 'פרוטוקול ההצבעה'],
    permissions: 'Read on submitted bundle; Vote/Comment',
    notifications: ['תזכורת לישיבה', 'פריטים חדשים לאג\'נדה'],
    kpi: 'Throughput ישיבה (פריטים לישיבה)',
    category: 'committee',
  },
  {
    role: 'exceptions_committee_member',
    number: 6,
    label: 'ועדת חריגים',
    shortLabel: 'ועדת חריגים',
    description: 'מאשרת לפני אישור תקציב מדינה.',
    mainActions: ['אישור חריגה זמנית'],
    mainScreens: ['אג\'נדה', 'חבילת ישיבה'],
    permissions: 'Read; Vote',
    notifications: ['פריט להחלטת חריגים'],
    kpi: 'שיעור אישורים מול דחיות',
    category: 'committee',
  },
  {
    role: 'subcommittee_member',
    number: 7,
    label: 'ועדת משנה (בודקת איכות)',
    shortLabel: 'ועדת משנה',
    description: 'בודקת איכות הצעות + ראיונות עם ספקים.',
    mainActions: ['צפיה בהצעות', 'ניקוד', 'ראיון', 'סיכום ניקוד'],
    mainScreens: ['השוואת הצעות', 'טופס ניקוד', 'יומן ראיונות'],
    permissions: 'Read on Proposals; Create Scoring',
    notifications: ['ראיון מתוזמן', 'הצעות חדשות לבדיקה'],
    kpi: 'סטיית תקן בין מעריכים; זמן לסיום ניקוד',
    category: 'committee',
  },
  {
    role: 'legal_professional',
    number: 8,
    label: 'יחידה מקצועית (משפטית/חוזים)',
    shortLabel: 'משפטית',
    description: 'כותבת את ההסכם לפי תבנית.',
    mainActions: ['הפקת הסכם מתוך תבניות', 'החתמה פנימית'],
    mainScreens: ['ספריית תבניות', 'ממשק הפקת הסכם'],
    permissions: 'Read on Tender; Create/Update on Contract',
    notifications: ['בקשה חדשה להסכם'],
    kpi: 'זמן ממוצע להפקת הסכם',
    category: 'internal_ministry',
  },
  {
    role: 'procurement_team',
    number: 9,
    label: 'צוות הרכש',
    shortLabel: 'צוות רכש',
    description: 'מנהל את הקמת ההזמנה ושליחת הסכם לספק.',
    mainActions: ['שליחת הסכם', 'בדיקת ערבות/ביטוח', 'הקמת הזמנה', 'שליחה לפורטל'],
    mainScreens: ['תור פעולות רכש', 'ממשק ערבויות/ביטוח', 'ממשק PO'],
    permissions: 'Update on Contract status; Create PO',
    notifications: ['הסכם חתום ממתין לבדיקה', 'ערבות פגה'],
    kpi: 'מספר עיכובים בתפר הזמנה→ביצוע',
    category: 'procurement',
  },
  {
    role: 'vendor',
    number: 10,
    label: 'ספק (חיצוני)',
    shortLabel: 'ספק',
    description: 'מגיש הצעות, חותם הסכם, מבצע אבני דרך.',
    mainActions: ['הגשת הצעה', 'חתימת הסכם', 'הגשת חשבונית'],
    mainScreens: ['פורטל ספקים', 'מסך הצעות', 'מסך חשבוניות'],
    permissions: 'Read תיחורים פתוחים; Create הצעה/חשבונית',
    notifications: ['תיחור חדש פתוח', 'הזמנה התקבלה'],
    kpi: 'ציון הערכה ממוצע; זמן תגובה ממוצע',
    category: 'external',
  },
  {
    role: 'professional_manager',
    number: 11,
    label: 'מנהל מקצועי (במשרד)',
    shortLabel: 'מנהל מקצועי',
    description: 'בודק תוצרים ומאשר אבני דרך.',
    mainActions: ['בדיקת תוצרים', 'אישור אבן דרך', 'מתן ציון הערכה'],
    mainScreens: ['מסך אבני דרך', 'ממשק בדיקת תוצרים'],
    permissions: 'Read; Approve milestones; Create evaluation',
    notifications: ['תוצרים הוגשו', 'ממתינים להחלטה'],
    kpi: '% אבני דרך שאושרו ללא הערות',
    category: 'internal_ministry',
  },
  {
    role: 'signatory',
    number: 12,
    label: 'מורשי חתימה',
    shortLabel: 'מורשה חתימה',
    description: 'חותמים על הסכם וכל מסמך פיננסי.',
    mainActions: ['חתימה דיגיטלית', 'אישור פיננסי'],
    mainScreens: ['תור מסמכים לחתימה'],
    permissions: 'Sign (digital signature)',
    notifications: ['מסמך ממתין לחתימה'],
    kpi: 'זמן ממוצע לחתימה',
    category: 'internal_ministry',
  },
  {
    role: 'admin',
    number: 13,
    label: 'מנהל מערכת (Admin)',
    shortLabel: 'אדמין',
    description: 'ניהול תבניות, הרשאות, אינטגרציות.',
    mainActions: ['ניהול משתמשים', 'ניהול תבניות', 'ניטור אינטגרציות'],
    mainScreens: ['פאנל ניהול', 'לוג אינטגרציות', 'לוג ביקורת'],
    permissions: 'Full CRUD',
    notifications: ['כשל באינטגרציה', 'פעולה חריגה'],
    kpi: 'זמינות מערכת (Uptime)',
    category: 'admin',
  },
]

export const PERSONA_MAP: Record<PersonaRole, PersonaDefinition> = PERSONAS.reduce(
  (acc, p) => ({ ...acc, [p.role]: p }),
  {} as Record<PersonaRole, PersonaDefinition>,
)

export function getPersona(role: PersonaRole): PersonaDefinition {
  return PERSONA_MAP[role]
}
