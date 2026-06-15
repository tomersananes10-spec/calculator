// 11 סיכונים — מבוסס על §11 באפיון + גליון "סיכונים והקלות"

export type Probability = 'L' | 'M' | 'H'
export type Impact = 'L' | 'M' | 'H'

export interface RiskDefinition {
  id: number
  title: string
  affectedStages: number[]  // S1, S3, S8 וכו'
  probability: Probability
  impact: Impact
  mitigationInCrm: string
  notificationOrSla: string
}

export const RISKS: RiskDefinition[] = [
  {
    id: 1,
    title: 'בריף לא מספיק מפורט → החזרה מועדה/גורם מקצועי',
    affectedStages: [1],
    probability: 'M',
    impact: 'H',
    mitigationInCrm: 'Wizard לכתיבת בריף עם שדות חובה, ספריית בריפים מאושרים, בדיקת AI לפני הגשה',
    notificationOrSla: 'התראת "חסר שדה" לפני "שלח לאישור"',
  },
  {
    id: 2,
    title: 'עיכוב בלו"ז ועדת מכרזים',
    affectedStages: [3, 7],
    probability: 'H',
    impact: 'H',
    mitigationInCrm: 'שיבוץ אוטומטי לסלוט הוועדה הקרוב + הזמנת סלוט מוקדם כשפותחים הליך מעל 1M',
    notificationOrSla: 'התראה 14 ימים לפני סלוט אחרון לדדליין רצוי',
  },
  {
    id: 3,
    title: 'דחיית הגורם המקצועי במינהל הרכש (חריגה מ-3 ימים)',
    affectedStages: [4],
    probability: 'M',
    impact: 'M',
    mitigationInCrm: 'מד SLA חי, אסקלציה אוטומטית למנהל המינהל לאחר 3 ימי עבודה',
    notificationOrSla: 'התראה ב-D+2 לפני סיום SLA',
  },
  {
    id: 4,
    title: 'ספק לא חוזר עם הסכם חתום / ערבות פגומה',
    affectedStages: [8],
    probability: 'H',
    impact: 'H',
    mitigationInCrm: 'תזכורות אוטומטיות (D+5, D+8), צ\'קליסט ערבות/ביטוח עם ולידציה לפני "אישור הסכם"',
    notificationOrSla: 'התראה ל-D+10 על איחור; הסלמה ל-D+15',
  },
  {
    id: 5,
    title: 'התנגשות מועדי ביצוע בבריף עם מועד התקשרות בועדה',
    affectedStages: [1, 8],
    probability: 'M',
    impact: 'H',
    mitigationInCrm: 'ולידציה: "מועד ביצוע בבריף" חייב להיות > "מועד התקשרות פר ועדה"',
    notificationOrSla: 'בלוקר לא ניתן לעקיפה',
  },
  {
    id: 6,
    title: 'השלמות לאחר סגירת תיבה → פסילת מועמדים',
    affectedStages: [5, 6],
    probability: 'M',
    impact: 'M',
    mitigationInCrm: 'Wizard "הגשת הצעה" עם בדיקות אוטומטיות; תזכורת לספק 48 שעות לפני סגירת תיבה',
    notificationOrSla: 'התראת SLA לספק + למנהל ההליך',
  },
  {
    id: 7,
    title: 'שירותי "אשכול ניהול מוצר" / "נימבוס" ללא אישור עורך מכרז',
    affectedStages: [1, 2],
    probability: 'L',
    impact: 'H',
    mitigationInCrm: 'סימון שדה "סוג שירות" → ניתוב חובה לאישור עורך מכרז לפני יציאה לתיחור',
    notificationOrSla: 'התראה אוטומטית לעורך המכרז',
  },
  {
    id: 8,
    title: 'נתק באינטגרציה מול מערכת התיחורים / ERP',
    affectedStages: [],
    probability: 'L',
    impact: 'H',
    mitigationInCrm: 'Outbox/Retry, התראת אדמין, מסך לוג אינטגרציות, נפילה רכה (Graceful)',
    notificationOrSla: 'התראה למנהל מערכת ב-T+5 דקות',
  },
  {
    id: 9,
    title: 'הזנת מס\' תיחור עם שנה (טעות נפוצה)',
    affectedStages: [4],
    probability: 'M',
    impact: 'L',
    mitigationInCrm: 'ולידציה: שדה "מס\' תיחור" רגקס מספרי בלבד, שנה בשדה נפרד',
    notificationOrSla: 'התראת ולידציה בשלב הזנה',
  },
  {
    id: 10,
    title: 'חוסר תיעוד בהחלטות ועדה',
    affectedStages: [3, 7],
    probability: 'L',
    impact: 'H',
    mitigationInCrm: 'מודול פרוטוקול חכם – שדות חובה (נימוקים, הצבעה, הסתייגויות), חתימה דיגיטלית',
    notificationOrSla: 'התראה אם "נימוק" חסר לפני סגירה',
  },
  {
    id: 11,
    title: 'הערכת ספק שאינה מבוצעת',
    affectedStages: [12],
    probability: 'H',
    impact: 'M',
    mitigationInCrm: 'בלוקר: לא ניתן "לסגור הליך" ללא הערכת ספק. תזכורת D+7 ו-D+14 אחרי תאריך סיום',
    notificationOrSla: 'מסכים מסומנים באדום + Notification',
  },
]

export const RISK_LEVEL_SCORE: Record<Probability, number> = { L: 1, M: 2, H: 3 }

export function riskScore(risk: RiskDefinition): number {
  return RISK_LEVEL_SCORE[risk.probability] * RISK_LEVEL_SCORE[risk.impact]
}
