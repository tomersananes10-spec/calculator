// SLA Engine — חישוב due_at, breach detection, escalations
// SLA-ים מבוססים על הוראת תכ"ם 16.2.19 + סעיף 11 באפיון (סיכונים והקלות)

import type { ApprovalRequestType, PersonaRole } from './types'
import { addBusinessDays } from './lib/slaCalc'

export interface SlaDefinition {
  requestType: ApprovalRequestType
  businessDays: number
  /** כמה ימים לפני breach לשלוח התראה מקדימה */
  warningDays: number
  /** כמה ימים מעבר ל-SLA מבצעים escalation אוטומטי */
  escalationAfterDays: number
  /** תפקיד שמקבל את ה-escalation */
  escalateTo: PersonaRole
  /** תיאור קצר */
  description: string
}

// טבלת SLA-ים — לפי האפיון
// סיכון #3: גורם מקצועי 3 ימים, escalation אחרי D+5 לפי [riskMatrix]
// סיכון #4: ספק 10 ימים, תזכורות D+5 ו-D+8
export const SLA_DEFINITIONS: Record<ApprovalRequestType, SlaDefinition> = {
  budget_approval: {
    requestType: 'budget_approval',
    businessDays: 3,
    warningDays: 1,
    escalationAfterDays: 5,
    escalateTo: 'procurement_manager',
    description: 'אישור תקציבי מתקציבן המערך (KPI: ≤3 ימים)',
  },
  olma_approval: {
    requestType: 'olma_approval',
    businessDays: 7,
    warningDays: 2,
    escalationAfterDays: 10,
    escalateTo: 'admin',
    description: 'אישור אלמ"ה למכרזים מעל 5M (KPI: ≤7 ימים)',
  },
  committee_outbound: {
    requestType: 'committee_outbound',
    businessDays: 14,
    warningDays: 3,
    escalationAfterDays: 21,
    escalateTo: 'admin',
    description: 'דיון ועדת מכרזים — יציאה לתיחור',
  },
  professional_review: {
    requestType: 'professional_review',
    businessDays: 3,
    warningDays: 1,
    escalationAfterDays: 5,
    escalateTo: 'procurement_manager',
    description: 'בדיקת גורם מקצועי במינהל הרכש (KPI: ≥90% עמידה ב-3 ימים)',
  },
  committee_winner: {
    requestType: 'committee_winner',
    businessDays: 14,
    warningDays: 3,
    escalationAfterDays: 21,
    escalateTo: 'admin',
    description: 'דיון ועדת מכרזים — אישור זוכה',
  },
  contract_signature: {
    requestType: 'contract_signature',
    businessDays: 10,
    warningDays: 2,
    escalationAfterDays: 15,
    escalateTo: 'procurement_manager',
    description: 'חתימת ספק על הסכם (KPI: ≤10 ימים)',
  },
  guarantee_verification: {
    requestType: 'guarantee_verification',
    businessDays: 3,
    warningDays: 1,
    escalationAfterDays: 5,
    escalateTo: 'procurement_manager',
    description: 'בדיקת ערבות ע"י יועמ"ש + רכש',
  },
  insurance_verification: {
    requestType: 'insurance_verification',
    businessDays: 3,
    warningDays: 1,
    escalationAfterDays: 5,
    escalateTo: 'procurement_manager',
    description: 'בדיקת ביטוח ע"י יועמ"ש + רכש',
  },
  invoice_approval: {
    requestType: 'invoice_approval',
    businessDays: 7,
    warningDays: 2,
    escalationAfterDays: 10,
    escalateTo: 'process_manager',
    description: 'אישור חשבונית לתשלום',
  },
  milestone_acceptance: {
    requestType: 'milestone_acceptance',
    businessDays: 5,
    warningDays: 1,
    escalationAfterDays: 7,
    escalateTo: 'process_manager',
    description: 'בדיקת תוצרים ואישור אבן דרך ע"י מנהל מקצועי',
  },
  vendor_evaluation: {
    requestType: 'vendor_evaluation',
    businessDays: 7,
    warningDays: 2,
    escalationAfterDays: 14,
    escalateTo: 'admin',
    description: 'הערכת ספק (bloker סגירת הליך — סיכון #11)',
  },
  other: {
    requestType: 'other',
    businessDays: 7,
    warningDays: 2,
    escalationAfterDays: 10,
    escalateTo: 'admin',
    description: 'אישור גנרי',
  },
}

/** מחשב את התאריך בו ה-SLA יסתיים, מתוך תאריך התחלה (כברירת מחדל: עכשיו). */
export function computeDueAt(requestType: ApprovalRequestType, startDate: Date = new Date()): Date {
  const def = SLA_DEFINITIONS[requestType]
  return addBusinessDays(startDate, def.businessDays)
}

export interface SlaStatus {
  state: 'on_track' | 'approaching' | 'breached' | 'escalated'
  hoursRemaining: number
  daysOverdue: number
  shouldEscalate: boolean
  shouldWarn: boolean
}

/** מחזיר את מצב ה-SLA הנוכחי לפי due_at ו-now. */
export function evaluateSlaStatus(
  requestType: ApprovalRequestType,
  dueAt: Date,
  now: Date = new Date(),
): SlaStatus {
  const def = SLA_DEFINITIONS[requestType]
  const diffMs = dueAt.getTime() - now.getTime()
  const hoursRemaining = Math.floor(diffMs / (1000 * 60 * 60))
  const daysOverdue = diffMs < 0 ? Math.floor(-diffMs / (1000 * 60 * 60 * 24)) : 0

  if (daysOverdue >= def.escalationAfterDays) {
    return { state: 'escalated', hoursRemaining, daysOverdue, shouldEscalate: true, shouldWarn: false }
  }
  if (diffMs < 0) {
    return { state: 'breached', hoursRemaining, daysOverdue, shouldEscalate: false, shouldWarn: false }
  }
  const warningThresholdMs = def.warningDays * 24 * 60 * 60 * 1000
  if (diffMs <= warningThresholdMs) {
    return { state: 'approaching', hoursRemaining, daysOverdue: 0, shouldEscalate: false, shouldWarn: true }
  }
  return { state: 'on_track', hoursRemaining, daysOverdue: 0, shouldEscalate: false, shouldWarn: false }
}

/** מחזיר אחוז התקדמות מ-SLA (0=זה עתה התחיל, 1=חרג). */
export function slaProgress(requestType: ApprovalRequestType, createdAt: Date, now: Date = new Date()): number {
  const def = SLA_DEFINITIONS[requestType]
  const totalMs = def.businessDays * 24 * 60 * 60 * 1000
  const elapsedMs = now.getTime() - createdAt.getTime()
  return Math.max(0, Math.min(1, elapsedMs / totalMs))
}
