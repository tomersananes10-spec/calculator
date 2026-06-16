// 12 שלבים + 10 אבני דרך (מבוסס על גליון "סיכום שלבים" + "גאנט מפורט")

import type { TenderStage } from '../types'

export interface MilestoneDef {
  code: string  // M1..M10
  label: string
}

export interface StageDefinition {
  code: TenderStage
  stageNumber: number  // 0..12
  label: string
  durationDays: number
  primaryOwnerRole: string
  endsWithMilestone?: MilestoneDef
  isCriticalPath: boolean
  isGate: boolean
  isOptional: boolean
  optionalReason?: string
  description: string
}

export const STAGES: StageDefinition[] = [
  {
    code: 'S0_preconditions',
    stageNumber: 0,
    label: 'שלב מקדים (חד-פעמי, מחוץ ל-Baseline)',
    durationDays: 1,
    primaryOwnerRole: 'admin',
    isCriticalPath: false,
    isGate: true,
    isOptional: false,
    description: 'תנאי סף לשימוש במערכת: הסכם מסגרת, רישום, כרטיס חכם, הדרכה. חסר כזה יחסום פתיחת הליך.',
  },
  {
    code: 'S1_initiation_budget',
    stageNumber: 1,
    label: 'ייזום ותקצוב',
    durationDays: 14,
    primaryOwnerRole: 'process_manager',
    endsWithMilestone: { code: 'M1', label: 'בריף ותקציב מאושרים' },
    isCriticalPath: true,
    isGate: false,
    isOptional: false,
    description: 'בקשת אישור תקציבי, מספר תיחור, כתיבת בריף, סקירה פנימית.',
  },
  {
    code: 'S2_olma_approval',
    stageNumber: 2,
    label: 'אישור מינהל הרכש (מעל 5M)',
    durationDays: 8,
    primaryOwnerRole: 'procurement_manager',
    endsWithMilestone: { code: 'M2', label: 'אישור מינהל הרכש' },
    isCriticalPath: true,
    isGate: false,
    isOptional: true,
    optionalReason: 'רלוונטי רק לסכום > 5M (Gateway G1)',
    description: 'אישור מנהל הרכש.',
  },
  {
    code: 'S3_committee_outbound',
    stageNumber: 3,
    label: 'ועדת מכרזים — יציאה לתיחור',
    durationDays: 16,
    primaryOwnerRole: 'tender_committee_member',
    endsWithMilestone: { code: 'M3', label: 'אישור יציאה לתיחור' },
    isCriticalPath: true,
    isGate: true,
    isOptional: true,
    optionalReason: 'מדלגים בתרחיש עד 200K + מחיר בלבד (Gateway G1)',
    description: 'הכנת פרוטוקול, הגשה, דיון, החלטה (אישור/החזרה/דחיה).',
  },
  {
    code: 'S4_system_input_review',
    stageNumber: 4,
    label: 'הזנה ובדיקה במערכת התיחורים',
    durationDays: 7,
    primaryOwnerRole: 'procurement_professional',
    endsWithMilestone: { code: 'M4', label: 'אישור הגורם המקצועי' },
    isCriticalPath: true,
    isGate: true,
    isOptional: false,
    description: 'הזנת הפרויקט במערכת התיחורים, בדיקה ע"י גורם מקצועי (SLA 3 ימים).',
  },
  {
    code: 'S5_distribution_response',
    stageNumber: 5,
    label: 'הפצה ומענה לספקים',
    durationDays: 25,
    primaryOwnerRole: 'process_manager',
    endsWithMilestone: { code: 'M5', label: 'סגירת תיבת מכרזים' },
    isCriticalPath: true,
    isGate: false,
    isOptional: false,
    description: 'הפצה לספקים, שאלות הבהרה, תקופת הגשה (14 ימי עבודה).',
  },
  {
    code: 'S6_proposal_evaluation',
    stageNumber: 6,
    label: 'בדיקת הצעות ובחירה',
    durationDays: 13,
    primaryOwnerRole: 'subcommittee_member',
    endsWithMilestone: { code: 'M6', label: 'זוכה מועדף (טרם אישור ועדה)' },
    isCriticalPath: true,
    isGate: false,
    isOptional: false,
    description: 'פתיחת תיבה, בדיקת איכות, ראיונות, ניקוד, דירוג.',
  },
  {
    code: 'S7_committee_winner',
    stageNumber: 7,
    label: 'ועדת מכרזים — אישור זכיה',
    durationDays: 16,
    primaryOwnerRole: 'tender_committee_member',
    endsWithMilestone: { code: 'M7', label: 'זוכה רשמי' },
    isCriticalPath: true,
    isGate: true,
    isOptional: true,
    optionalReason: 'נדרש רק מעל 200K או באיכות+מחיר (Gateway G7)',
    description: 'פרוטוקול, דיון, אישור זוכה במערכת התיחורים.',
  },
  {
    code: 'S8_contract',
    stageNumber: 8,
    label: 'התקשרות והסכם',
    durationDays: 22,
    primaryOwnerRole: 'legal_professional',
    endsWithMilestone: { code: 'M8', label: 'הסכם בתוקף' },
    isCriticalPath: true,
    isGate: true,
    isOptional: false,
    description: 'בחירת תבנית, שליחה לספק, חתימה, ערבות+ביטוח, חתימת מורשי חתימה.',
  },
  {
    code: 'S9_purchase_order',
    stageNumber: 9,
    label: 'הקמת הזמנת רכש',
    durationDays: 7,
    primaryOwnerRole: 'procurement_team',
    endsWithMilestone: { code: 'M9', label: 'Go-Live (הזמנה לספק)' },
    isCriticalPath: true,
    isGate: true,
    isOptional: false,
    description: 'דרישת רכש, הקמה ב-ERP, שליחה לפורטל ספקים.',
  },
  {
    code: 'S10_execution_m1',
    stageNumber: 10,
    label: 'ביצוע אבן דרך 1',
    durationDays: 39,
    primaryOwnerRole: 'vendor',
    isCriticalPath: true,
    isGate: false,
    isOptional: false,
    description: 'ביצוע ע"י הספק, חשבונית, בדיקת תוצרים, אישור לתשלום.',
  },
  {
    code: 'S11_execution_m2',
    stageNumber: 11,
    label: 'ביצוע אבן דרך 2',
    durationDays: 38,
    primaryOwnerRole: 'vendor',
    isCriticalPath: false,
    isGate: false,
    isOptional: true,
    optionalReason: 'יכול להתחיל במקביל אם הוגדר בבריף',
    description: 'אבני דרך נוספות (אופציונלי במקביל).',
  },
  {
    code: 'S12_closure_evaluation',
    stageNumber: 12,
    label: 'סגירה והערכה',
    durationDays: 3,
    primaryOwnerRole: 'process_manager',
    endsWithMilestone: { code: 'M10', label: 'סגירת הליך' },
    isCriticalPath: true,
    isGate: true,
    isOptional: false,
    description: 'הזנת מועד סיום, הערכת ספק (חובה), סגירה.',
  },
]

export const STAGES_MAP: Record<TenderStage, StageDefinition | undefined> = STAGES.reduce(
  (acc, s) => ({ ...acc, [s.code]: s }),
  {} as Record<TenderStage, StageDefinition | undefined>,
)

export function getStage(code: TenderStage): StageDefinition | undefined {
  return STAGES_MAP[code]
}

// סה"כ ימי עבודה
export const TOTAL_DAYS_GO_LIVE = 129  // עד M9
export const TOTAL_DAYS_FULL = 209     // עד M10

// ───────── שלבי-על ─────────
// 12 השלבים הרשמיים מקובצים ל-2 שלבי-על המשקפים את הזרימה האמיתית:
//   שלב א' (pre-tender)  = ייזום + תקצוב + ועדה ליציאה + הזנה למינהל הרכש
//   שלב ב' (execution)    = הפצה + בחירה + זכייה + חוזה + ביצוע + סגירה
//
// ה-DB ממשיך לעבוד עם 12 הקודים (S0..S12) — קיבוץ ויזואלי בלבד ל-UI.

export type StageGroup = 'A_pre_tender' | 'B_execution'

export interface StageGroupDef {
  code: StageGroup
  label: string
  shortLabel: string
  description: string
  stageCodes: TenderStage[]
}

export const STAGE_GROUPS: StageGroupDef[] = [
  {
    code: 'A_pre_tender',
    label: 'שלב א\' — הכנה והגשה למינהל הרכש',
    shortLabel: 'שלב א\'',
    description: 'בריף + פרוטוקול + אישור תקציבי + ועדת מכרזים + העברה למינהל הרכש',
    stageCodes: [
      'S0_preconditions',
      'S1_initiation_budget',
      'S2_olma_approval',
      'S3_committee_outbound',
      'S4_system_input_review',
    ],
  },
  {
    code: 'B_execution',
    label: 'שלב ב\' — ביצוע התיחור',
    shortLabel: 'שלב ב\'',
    description: 'הפצה, בחירת ספק, חוזה, ביצוע אבני דרך, סגירה',
    stageCodes: [
      'S5_distribution_response',
      'S6_proposal_evaluation',
      'S7_committee_winner',
      'S8_contract',
      'S9_purchase_order',
      'S10_execution_m1',
      'S11_execution_m2',
      'S12_closure_evaluation',
    ],
  },
]

export function getStageGroup(stage: TenderStage): StageGroupDef | null {
  for (const g of STAGE_GROUPS) {
    if (g.stageCodes.includes(stage)) return g
  }
  return null
}

/** מספר הסידורי של השלב בתוך השלב-העל שלו (1-based) */
export function getStageIndexInGroup(stage: TenderStage): number {
  const group = getStageGroup(stage)
  if (!group) return 0
  return group.stageCodes.indexOf(stage) + 1
}
