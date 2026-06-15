// 11 Gateways (G1-G11) — נקודות החלטה לפי טבלת §5 באפיון

import type { AmountBand, GatewayCode, SelectionType, TenderStage } from '../types'

export interface GatewayDefinition {
  code: GatewayCode
  label: string
  location: string
  options: string[]
  description: string
}

export const GATEWAY_DEFS: Record<GatewayCode, GatewayDefinition> = {
  G1: {
    code: 'G1',
    label: 'סכום הפרויקט',
    location: 'לפני שלב 2',
    options: ['עד 200K (מחיר בלבד)', 'עד 200K עם איכות', '200K-1M', '1M-5M', 'מעל 5M'],
    description: 'מעל 5M → אישור אלמ"ה; עד 200K + מחיר בלבד → דלג לפרסום ללא ועדה; אחרת → ועדת מכרזים',
  },
  G2: {
    code: 'G2',
    label: 'סוג שירות (נימבוס/ניהול מוצר)',
    location: 'לפני שלב 3',
    options: ['כן', 'לא'],
    description: 'אם כן — חובה אישור עורך מכרז לפני יציאה לתיחור (פעולה נוספת)',
  },
  G3: {
    code: 'G3',
    label: 'החלטת ועדת מכרזים (יציאה)',
    location: 'סוף שלב 3',
    options: ['אושר', 'החזרה', 'דחיה'],
    description: 'החזרה = חזרה ל-3.1 לעדכון; CRM שומר היסטוריית גרסאות',
  },
  G4: {
    code: 'G4',
    label: 'החלטת גורם מקצועי',
    location: 'שלב 4',
    options: ['אושר', 'נדרשים תיקונים'],
    description: 'תיקונים = חזרה ל-4.1; הגורם המקצועי בודק שוב תוך 3 ימי עבודה',
  },
  G5: {
    code: 'G5',
    label: 'מפגש ספקים נדרש?',
    location: 'תוך שלב 5',
    options: ['כן', 'לא'],
    description: 'אופציונלי בפרויקטים מורכבים; CRM מנהל הזמנות ופרוטוקול',
  },
  G6: {
    code: 'G6',
    label: 'אופן בחירה',
    location: 'תחילת שלב 6',
    options: ['מחיר בלבד', 'איכות+מחיר'],
    description: 'איכות+מחיר → בדיקה+ראיונות+ניקוד; אחרת דירוג אוטומטי בלבד',
  },
  G7: {
    code: 'G7',
    label: 'חובה לאישור זכיה ע"י ועדה?',
    location: 'סוף שלב 6',
    options: ['כן (מעל 200K או איכות+מחיר)', 'לא'],
    description: 'כן → שלב 7 מלא; לא → מדלגים ישירות להתקשרות',
  },
  G8: {
    code: 'G8',
    label: 'החלטת ועדה (זכיה)',
    location: 'סוף שלב 7',
    options: ['אושר', 'השלמה', 'דחיה'],
    description: 'השלמה = חזרה לעריכת פרוטוקול 7.1; דחיה = חזרה ל-6',
  },
  G9: {
    code: 'G9',
    label: 'סוג הסכם',
    location: 'תחילת שלב 8',
    options: ['מעל 1M', 'עד 1M עם ביטוח', 'עד 1M ללא ערבות וביטוח'],
    description: 'CRM יבחר תבנית אוטומטית לפי שדות סכום + דרישת ערבות + דרישת ביטוח',
  },
  G10: {
    code: 'G10',
    label: 'ערבות+ביטוח תקינים?',
    location: 'שלב 8.4',
    options: ['תקין', 'לא תקין'],
    description: 'לא תקין = חזרה ל-8.3 לתיקון ע"י הספק; CRM מציג מד SLA',
  },
  G11: {
    code: 'G11',
    label: 'אבן דרך אחרונה?',
    location: 'בלולאת ביצוע',
    options: ['כן', 'לא'],
    description: 'כן → שלב 12 (סגירה); לא → אבן דרך הבאה',
  },
}

// ---------- Pure-logic gateway evaluators (client-side) ----------

export interface G1Result {
  band: AmountBand
  requiresOlma: boolean
  skipCommittee: boolean
  isSimplePath: boolean
}

export function evaluateG1_Amount(amount: number, selection: SelectionType): G1Result {
  const band: AmountBand =
    amount < 200000 ? 'lt_200k' :
    amount < 1000000 ? '200k_1m' :
    amount <= 5000000 ? '1m_5m' : 'gt_5m'
  const isSimplePath = amount < 200000 && selection === 'price_only'
  return {
    band,
    requiresOlma: amount > 5000000,
    skipCommittee: isSimplePath,
    isSimplePath,
  }
}

export interface G2Result {
  isSpecialCluster: boolean
  requiresTenderEditor: boolean
}

export function evaluateG2_ServiceCluster(serviceCluster: string | null): G2Result {
  const isSpecial = serviceCluster === 'nimbus' || serviceCluster === 'product_mgmt'
  return { isSpecialCluster: isSpecial, requiresTenderEditor: isSpecial }
}

export interface G6Result {
  needsQualityCommittee: boolean
  automaticRanking: boolean
}

export function evaluateG6_Selection(selection: SelectionType): G6Result {
  return {
    needsQualityCommittee: selection === 'quality_price',
    automaticRanking: selection === 'price_only',
  }
}

export interface G7Result {
  requiresWinnerCommittee: boolean
  reason: string
}

export function evaluateG7_WinnerApproval(amount: number, selection: SelectionType): G7Result {
  const required = amount >= 200000 || selection === 'quality_price'
  return {
    requiresWinnerCommittee: required,
    reason: amount >= 200000
      ? 'סכום מעל 200K'
      : selection === 'quality_price' ? 'בחירה איכות+מחיר' : 'דילוג ישיר להתקשרות',
  }
}

export interface G9Result {
  requiresGuarantee: boolean
  requiresInsurance: boolean
  templateCode: 'over_1m_full' | 'under_1m_with_insurance' | 'under_1m_minimal'
}

export function evaluateG9_ContractTemplate(amount: number): G9Result {
  if (amount > 1000000) {
    return { requiresGuarantee: true, requiresInsurance: true, templateCode: 'over_1m_full' }
  }
  // Default for under 1M
  return { requiresGuarantee: false, requiresInsurance: true, templateCode: 'under_1m_with_insurance' }
}

// ---------- Decision helpers for FSM ----------

export function shouldSkipStage(
  stage: TenderStage,
  context: { amount: number; selection: SelectionType },
): { skip: boolean; reason?: string } {
  if (stage === 'S2_olma_approval') {
    const g1 = evaluateG1_Amount(context.amount, context.selection)
    if (!g1.requiresOlma) return { skip: true, reason: 'סכום מתחת ל-5M — אישור אלמ"ה לא נדרש' }
  }
  if (stage === 'S3_committee_outbound' || stage === 'S7_committee_winner') {
    const g1 = evaluateG1_Amount(context.amount, context.selection)
    if (g1.skipCommittee) {
      return { skip: true, reason: 'תרחיש פשוט (עד 200K + מחיר בלבד) — מדלגים על ועדה' }
    }
    if (stage === 'S7_committee_winner') {
      const g7 = evaluateG7_WinnerApproval(context.amount, context.selection)
      if (!g7.requiresWinnerCommittee) return { skip: true, reason: g7.reason }
    }
  }
  return { skip: false }
}
