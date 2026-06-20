// 9 שלבים (T0..T8) — המודל שמשקף את הזרימה האמיתית של LIBA.
// החליף את 12 השלבים הישנים (S0..S12) שהיו פירוט פרוצדורלי של תכ"ם 16.2.19
// ולא תאמו את העבודה בפועל. אין יותר STAGE_GROUPS — 9 פלאט מספיק.

import type { TenderStage } from '../types'

export interface MilestoneDef {
  code: string
  label: string
}

export interface StageDefinition {
  code: TenderStage
  stageNumber: number  // 0..8
  label: string
  shortLabel: string
  /** האם השלב כולל "פינגפונג" — מעגל גרסאות/תיקונים עד אישור סופי */
  pingpong: boolean
  description: string
}

export const STAGES: StageDefinition[] = [
  {
    code: 'T0_brief_protocol',
    stageNumber: 0,
    label: 'העלאת בריף + פרוטוקול',
    shortLabel: 'בריף ופרוטוקול',
    pingpong: false,
    description: 'פתיחת ההליך מצריכה בריף + פרוטוקול ראשוני. הבריף ניתן לבחירה מתוך /briefs או העלאה ידנית. הפרוטוקול מועלה ידנית עד שמודול הפרוטוקולים ייבנה.',
  },
  {
    code: 'T1_budget_approval',
    stageNumber: 1,
    label: 'בקשת אישור תקציבי',
    shortLabel: 'אישור תקציבי',
    pingpong: true,
    description: 'בקשה לתקציבן המערך — אישור / דחייה / החזרה לתיקון. תומך בגרסאות ובסבבי בקשות שינוי עד אישור סופי.',
  },
  {
    code: 'T2_committee_outbound',
    stageNumber: 2,
    label: 'קביעת ועדת מכרזים (יציאה)',
    shortLabel: 'ועדת יציאה',
    pingpong: true,
    description: 'מנהלת ועדת מכרזים מזמנת. נוכחים: כותב הבריף + מי מטעמו, מחלקה משפטית, חשב, מנהלת הוועדה, סמנכ"ל אחראי תורן. מציגים פרוטוקול + בריף + אישור תקציבי. תומך בסבבי תיקונים.',
  },
  {
    code: 'T3_signatures_outbound',
    stageNumber: 3,
    label: 'חתימה לפי סדר',
    shortLabel: 'חתימות יציאה',
    pingpong: false,
    description: 'משפטן → חשב → סמנכ"ל. החתימות על הגרסה האחרונה של המסמכים שאושרו בוועדה.',
  },
  {
    code: 'T4_minhal_rechesh',
    stageNumber: 4,
    label: 'מינהל הרכש',
    shortLabel: 'מינהל הרכש',
    pingpong: false,
    description: 'קופסה שחורה — ל-LIBA אין חלק. במינהל הרכש מערכת משלהם שמקבלת את המסמכים ובוחרת ספק זוכה. ה-UI מציג "ממתין" + כפתור ידני להתקדם כשבוחרים ספק.',
  },
  {
    code: 'T5_winner_protocol_upload',
    stageNumber: 5,
    label: 'פרוטוקול זכייה',
    shortLabel: 'פרוטוקול זכייה',
    pingpong: false,
    description: 'לאחר שמינהל הרכש בחר ספק — מעלים פרוטוקול זכייה. כיום upload ידני; בעתיד מודול פרוטוקולים ייתן לבחור מהמערכת.',
  },
  {
    code: 'T6_committee_winner',
    stageNumber: 6,
    label: 'כינוס ועדה לפרוטוקול זכייה',
    shortLabel: 'ועדת זכייה',
    pingpong: true,
    description: 'אותו פורום של שלב 2: כותב הבריף + מטעמו, משפטי, חשב, מנהלת ועדה, סמנכ"ל. דנים בפרוטוקול הזכייה. תומך בסבבי תיקונים.',
  },
  {
    code: 'T7_signatures_winner',
    stageNumber: 7,
    label: 'חתימה על פרוטוקול זכייה',
    shortLabel: 'חתימות זכייה',
    pingpong: false,
    description: 'משפטן → חשב → סמנכ"ל חותמים על פרוטוקול הזכייה הסופי.',
  },
  {
    code: 'T8_engagement',
    stageNumber: 8,
    label: 'התקשרות + אבני דרך + תחילת עבודה',
    shortLabel: 'התקשרות',
    pingpong: false,
    description: 'יצירת חוזה, ערבות, ביטוח, הזמנת רכש, הגדרת אבני דרך לתשלום. תחילת העבודה מול הספק.',
  },
]

export const STAGES_MAP: Record<TenderStage, StageDefinition | undefined> = STAGES.reduce(
  (acc, s) => ({ ...acc, [s.code]: s }),
  {} as Record<TenderStage, StageDefinition | undefined>,
)

export function getStage(code: TenderStage): StageDefinition | undefined {
  return STAGES_MAP[code]
}

/** סדרת השלבים (ללא terminal states), לפי מספר השלב. */
export const STAGE_ORDER: TenderStage[] = STAGES.map(s => s.code)

/** האינדקס של שלב בתוך הזרימה. -1 ל-terminal/לא קיים. */
export function getStageIndex(code: TenderStage): number {
  return STAGE_ORDER.indexOf(code)
}

/** השלב הבא בזרימה. null כשמדובר בשלב האחרון או terminal. */
export function getNextStage(code: TenderStage): TenderStage | null {
  const idx = getStageIndex(code)
  if (idx < 0 || idx >= STAGE_ORDER.length - 1) return null
  return STAGE_ORDER[idx + 1]
}

/** השלב הקודם בזרימה. null כשמדובר בשלב הראשון או terminal. */
export function getPrevStage(code: TenderStage): TenderStage | null {
  const idx = getStageIndex(code)
  if (idx <= 0) return null
  return STAGE_ORDER[idx - 1]
}
