// הגדרות דרישות (checklist) לכל שלב — מבוסס על workflowEngine + state machine
// כל requirement מחזיר RequirementStatus עשיר (לא רק boolean) כדי שה-UI יוכל
// להציג מצב פעיל של בקשה ממתינה: למי נשלחה, מתי, SLA, וכו'.

import type { TenderDetailData } from '../hooks/useTender'
import type { ApprovalRequestType, TenderApprovalRequest, TenderStage } from '../types'

export type ActionId =
  | 'create_budget_approval'
  | 'set_tender_number'
  | 'create_olma_approval'
  | 'create_committee_outbound_protocol'
  | 'create_professional_review'
  | 'create_committee_winner_protocol'
  | 'distribute_to_vendors'
  | 'register_proposal'
  | 'select_winner'
  | 'draft_contract'
  | 'verify_guarantee'
  | 'verify_insurance'
  | 'sign_contract_internal'
  | 'create_purchase_order'
  | 'create_milestone'
  | 'approve_milestone'
  | 'approve_invoice'
  | 'evaluate_vendor'
  | 'advance_stage'

export type RequirementStatus =
  | { state: 'not_started' }
  | { state: 'awaiting'; request: TenderApprovalRequest }
  | { state: 'approved'; request: TenderApprovalRequest }
  | { state: 'rejected'; request: TenderApprovalRequest }
  | { state: 'satisfied' }

export interface StageRequirement {
  id: string
  label: string
  description?: string
  getStatus: (detail: TenderDetailData) => RequirementStatus
  action?: ActionId
  blocker?: boolean
  /** מיפוי תיעודי לסוג בקשת אישור — לרכיבי UI שצריכים לדעת לאיזה סוג בקשה היא קשורה. */
  approvalRequestType?: ApprovalRequestType
}

export interface StageRequirementsDef {
  stage: TenderStage
  nextStage: TenderStage
  requirements: StageRequirement[]
}

// ───────── helpers ─────────

/** דרישה מבוססת approval_request — מחזירה state לפי הבקשה האחרונה מהסוג המבוקש. */
function approvalBasedStatus(
  type: ApprovalRequestType,
  alreadySatisfied?: (d: TenderDetailData) => boolean,
): (d: TenderDetailData) => RequirementStatus {
  return (d) => {
    if (alreadySatisfied?.(d)) return { state: 'satisfied' }

    const matching = d.approvalRequests
      .filter(r => r.request_type === type)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
    const latest = matching[0]
    if (!latest) return { state: 'not_started' }

    if (latest.status === 'approved') return { state: 'approved', request: latest }
    if (latest.status === 'rejected' || latest.status === 'returned' || latest.status === 'cancelled') {
      return { state: 'rejected', request: latest }
    }
    // pending / in_review / escalated
    return { state: 'awaiting', request: latest }
  }
}

/** דרישה מבוססת שדה ב-DB — בינארית: מולאה או לא. */
function fieldBasedStatus(check: (d: TenderDetailData) => boolean): (d: TenderDetailData) => RequirementStatus {
  return (d) => (check(d) ? { state: 'satisfied' } : { state: 'not_started' })
}

const hasApprovedProtocol = (d: TenderDetailData, type: string) =>
  d.protocols.some(p => p.protocol_type === type && p.decision === 'approved')

// ───────── requirement definitions ─────────

const REQ_BUDGET_APPROVED: StageRequirement = {
  id: 'budget_approved',
  label: 'אישור תקציבי',
  description: 'אישור תקציב ע"י תקציבן המערך',
  approvalRequestType: 'budget_approval',
  getStatus: approvalBasedStatus('budget_approval', d => d.budget?.status === 'approved'),
  action: 'create_budget_approval',
  blocker: true,
}

const REQ_TENDER_NUMBER: StageRequirement = {
  id: 'tender_number',
  label: 'מספר תיחור פנימי',
  description: 'מספר ייחודי לזיהוי ההליך',
  getStatus: fieldBasedStatus(d => Boolean(d.tender?.tender_number)),
  action: 'set_tender_number',
  blocker: true,
}

const REQ_OLMA_APPROVAL: StageRequirement = {
  id: 'olma_approved',
  label: 'אישור אלמ"ה (מעל 5M)',
  description: 'אישור מנהל הרכש דרך מערכת אלמ"ה',
  approvalRequestType: 'olma_approval',
  getStatus: approvalBasedStatus('olma_approval', d => !d.tender?.requires_olma),
  action: 'create_olma_approval',
  blocker: true,
}

const REQ_COMMITTEE_OUTBOUND: StageRequirement = {
  id: 'committee_outbound_approved',
  label: 'אישור ועדת מכרזים — יציאה לתיחור',
  description: 'פרוטוקול חתום של ועדת מכרזים המאשר יציאה לתיחור (G3=approved)',
  getStatus: fieldBasedStatus(d => hasApprovedProtocol(d, 'outbound_request')),
  action: 'create_committee_outbound_protocol',
  blocker: true,
}

const REQ_TENDER_NUMBER_EXTERNAL: StageRequirement = {
  id: 'tender_number_external',
  label: 'מספר תיחור חיצוני',
  description: 'מספר ההליך במערכת התיחורים הדיגיטלית',
  getStatus: fieldBasedStatus(d => Boolean(d.tender?.tender_number_external)),
  action: 'set_tender_number',
  blocker: true,
}

const REQ_PROFESSIONAL_REVIEW: StageRequirement = {
  id: 'professional_review_approved',
  label: 'אישור גורם מקצועי במינהל הרכש',
  description: 'בדיקה ואישור הפרויקט תוך SLA של 3 ימי עבודה',
  approvalRequestType: 'professional_review',
  getStatus: approvalBasedStatus('professional_review'),
  action: 'create_professional_review',
  blocker: true,
}

// S5
const REQ_DISTRIBUTION: StageRequirement = {
  id: 'vendors_invited',
  label: 'הפצת הפניה לספקים',
  description: 'בחר לפחות 3 ספקים והפץ אליהם את הפניה',
  getStatus: fieldBasedStatus(d => d.proposals.length >= 3 || d.proposals.some(p => p.status !== 'draft')),
  action: 'distribute_to_vendors',
  blocker: true,
}

const REQ_QA_CLOSED: StageRequirement = {
  id: 'qa_closed',
  label: 'תקופת הגשת ההצעות נסגרה',
  description: 'יש לסגור את תיבת ההצעות לפני מעבר לשלב הבחירה',
  getStatus: fieldBasedStatus(d => d.proposals.some(p => p.status === 'submitted' || p.status === 'qualified' || p.status === 'winner')),
  action: 'register_proposal',
  blocker: true,
}

// S6
const REQ_PROPOSALS_REGISTERED: StageRequirement = {
  id: 'proposals_registered',
  label: 'הצעות נרשמו במערכת',
  description: 'יש לרשום לפחות הצעה אחת',
  getStatus: fieldBasedStatus(d => d.proposals.length > 0 && d.proposals.some(p => p.price != null)),
  action: 'register_proposal',
  blocker: true,
}

const REQ_WINNER_SELECTED: StageRequirement = {
  id: 'winner_selected',
  label: 'בחירת ספק מועדף',
  description: 'יש לסמן ספק כ-"winner" לפני אישור הועדה',
  getStatus: fieldBasedStatus(d => d.proposals.some(p => p.status === 'winner')),
  action: 'select_winner',
  blocker: true,
}

// S7
const REQ_COMMITTEE_WINNER: StageRequirement = {
  id: 'committee_winner_approved',
  label: 'אישור ועדת מכרזים — זכיה',
  description: 'פרוטוקול חתום של ועדת מכרזים המאשר את הזוכה (G8=approved)',
  getStatus: fieldBasedStatus(d => hasApprovedProtocol(d, 'winner_approval')),
  action: 'create_committee_winner_protocol',
  blocker: true,
}

// S8
const REQ_CONTRACT_DRAFTED: StageRequirement = {
  id: 'contract_drafted',
  label: 'טיוטת הסכם נוצרה',
  description: 'בחירת תבנית הסכם וקישור לספק זוכה',
  getStatus: fieldBasedStatus(d => d.contracts.length > 0),
  action: 'draft_contract',
  blocker: true,
}

const REQ_VENDOR_SIGNED: StageRequirement = {
  id: 'vendor_signed',
  label: 'הספק חתם על ההסכם',
  description: 'הסכם הוחזר חתום מהספק',
  getStatus: fieldBasedStatus(d => d.contracts.some(c =>
    c.signature_status === 'vendor_signed'
    || c.signature_status === 'pending_internal_review'
    || c.signature_status === 'pending_signatory'
    || c.signature_status === 'fully_signed')),
  action: 'sign_contract_internal',
  blocker: true,
}

const REQ_GUARANTEE: StageRequirement = {
  id: 'guarantee_verified',
  label: 'ערבות אומתה',
  description: 'נדרשת רק במכרזים מעל 1M (G9)',
  getStatus: fieldBasedStatus(d => {
    const needsGuarantee = (d.tender?.estimated_amount ?? 0) > 1000000
    if (!needsGuarantee) return true
    return d.guarantees.some(g => g.status === 'verified')
  }),
  action: 'verify_guarantee',
  blocker: true,
}

const REQ_INSURANCE: StageRequirement = {
  id: 'insurance_verified',
  label: 'ביטוח אומת',
  description: 'נדרש במרבית התבניות',
  getStatus: fieldBasedStatus(d => {
    const needsInsurance = (d.tender?.estimated_amount ?? 0) > 1000000
    if (!needsInsurance) return true
    return d.insurance.some(i => i.status === 'verified')
  }),
  action: 'verify_insurance',
  blocker: true,
}

const REQ_SIGNATORY: StageRequirement = {
  id: 'signatory_signed',
  label: 'מורשי החתימה חתמו',
  description: 'חתימת המזמין — שלב 8.5 באפיון. סוף שלב ההתקשרות.',
  getStatus: fieldBasedStatus(d => d.contracts.some(c => c.signature_status === 'fully_signed')),
  action: 'sign_contract_internal',
  blocker: true,
}

// S9
const REQ_PO: StageRequirement = {
  id: 'po_issued',
  label: 'הזמנת רכש (PO) הוקמה',
  description: 'הקמה ב-ERP ושליחה לפורטל הספקים',
  getStatus: fieldBasedStatus(d => d.purchaseOrders.some(po => po.status === 'sent_to_vendor' || po.status === 'acknowledged')),
  action: 'create_purchase_order',
  blocker: true,
}

// S10
const REQ_MILESTONE_DEFINED: StageRequirement = {
  id: 'milestone1_defined',
  label: 'אבן דרך 1 הוגדרה',
  description: 'הגדרת אבן הדרך הראשונה לביצוע',
  getStatus: fieldBasedStatus(d => d.milestones.length >= 1),
  action: 'create_milestone',
  blocker: true,
}

const REQ_MILESTONE1_ACCEPTED: StageRequirement = {
  id: 'milestone1_accepted',
  label: 'אבן דרך 1 התקבלה',
  description: 'תוצרים אושרו ע"י המנהל המקצועי + חשבונית אושרה',
  getStatus: fieldBasedStatus(d => {
    const m1 = d.milestones.find(m => m.sequence_no === 1)
    if (!m1) return false
    return m1.status === 'accepted' || m1.status === 'partially_accepted'
  }),
  action: 'approve_milestone',
  blocker: true,
}

// S11
const REQ_MILESTONE2_ACCEPTED: StageRequirement = {
  id: 'milestone2_accepted',
  label: 'אבן דרך 2 התקבלה',
  description: 'אבן הדרך השנייה התקבלה',
  getStatus: fieldBasedStatus(d => {
    const m2 = d.milestones.find(m => m.sequence_no === 2)
    if (!m2) return true  // אם אין m2 — לא חוסם
    return m2.status === 'accepted' || m2.status === 'partially_accepted'
  }),
  action: 'approve_milestone',
  blocker: true,
}

// S12
const REQ_VENDOR_EVALUATION: StageRequirement = {
  id: 'vendor_evaluated',
  label: 'הערכת ספק (חובה)',
  description: 'סיכון #11: לא ניתן לסגור הליך ללא הערכת ספק',
  getStatus: fieldBasedStatus(d => d.vendorEvaluations.length > 0),
  action: 'evaluate_vendor',
  blocker: true,
}

export const STAGE_REQUIREMENTS: Partial<Record<TenderStage, StageRequirementsDef>> = {
  S0_preconditions: {
    stage: 'S0_preconditions',
    nextStage: 'S1_initiation_budget',
    requirements: [],
  },
  S1_initiation_budget: {
    stage: 'S1_initiation_budget',
    nextStage: 'S2_olma_approval',
    requirements: [REQ_BUDGET_APPROVED, REQ_TENDER_NUMBER],
  },
  S2_olma_approval: {
    stage: 'S2_olma_approval',
    nextStage: 'S3_committee_outbound',
    requirements: [REQ_OLMA_APPROVAL],
  },
  S3_committee_outbound: {
    stage: 'S3_committee_outbound',
    nextStage: 'S4_system_input_review',
    requirements: [REQ_COMMITTEE_OUTBOUND],
  },
  S4_system_input_review: {
    stage: 'S4_system_input_review',
    nextStage: 'S5_distribution_response',
    requirements: [REQ_TENDER_NUMBER_EXTERNAL, REQ_PROFESSIONAL_REVIEW],
  },
  S5_distribution_response: {
    stage: 'S5_distribution_response',
    nextStage: 'S6_proposal_evaluation',
    requirements: [REQ_DISTRIBUTION, REQ_QA_CLOSED],
  },
  S6_proposal_evaluation: {
    stage: 'S6_proposal_evaluation',
    nextStage: 'S7_committee_winner',
    requirements: [REQ_PROPOSALS_REGISTERED, REQ_WINNER_SELECTED],
  },
  S7_committee_winner: {
    stage: 'S7_committee_winner',
    nextStage: 'S8_contract',
    requirements: [REQ_COMMITTEE_WINNER],
  },
  S8_contract: {
    stage: 'S8_contract',
    nextStage: 'S9_purchase_order',
    requirements: [REQ_CONTRACT_DRAFTED, REQ_VENDOR_SIGNED, REQ_GUARANTEE, REQ_INSURANCE, REQ_SIGNATORY],
  },
  S9_purchase_order: {
    stage: 'S9_purchase_order',
    nextStage: 'S10_execution_m1',
    requirements: [REQ_PO],
  },
  S10_execution_m1: {
    stage: 'S10_execution_m1',
    nextStage: 'S11_execution_m2',
    requirements: [REQ_MILESTONE_DEFINED, REQ_MILESTONE1_ACCEPTED],
  },
  S11_execution_m2: {
    stage: 'S11_execution_m2',
    nextStage: 'S12_closure_evaluation',
    requirements: [REQ_MILESTONE2_ACCEPTED],
  },
  S12_closure_evaluation: {
    stage: 'S12_closure_evaluation',
    nextStage: 'closed',
    requirements: [REQ_VENDOR_EVALUATION],
  },
}

/** דרישה נחשבת "הושלמה" כשהיא satisfied או approved. */
export function isRequirementDone(status: RequirementStatus): boolean {
  return status.state === 'satisfied' || status.state === 'approved'
}

export interface StageRequirementsResult {
  stage: TenderStage
  nextStage: TenderStage | null
  total: number
  done: number
  pending: StageRequirement[]
  blockingPending: StageRequirement[]
  canAdvance: boolean
  progressPct: number
}

export function evaluateStageRequirements(detail: TenderDetailData): StageRequirementsResult {
  const tender = detail.tender
  if (!tender) {
    return { stage: 'S0_preconditions', nextStage: null, total: 0, done: 0, pending: [], blockingPending: [], canAdvance: false, progressPct: 0 }
  }

  const def = STAGE_REQUIREMENTS[tender.current_stage]
  if (!def) {
    return {
      stage: tender.current_stage,
      nextStage: null,
      total: 0,
      done: 0,
      pending: [],
      blockingPending: [],
      canAdvance: true,
      progressPct: 100,
    }
  }

  const pending = def.requirements.filter(r => !isRequirementDone(r.getStatus(detail)))
  const blockingPending = pending.filter(r => r.blocker !== false)
  const done = def.requirements.length - pending.length

  return {
    stage: tender.current_stage,
    nextStage: def.nextStage,
    total: def.requirements.length,
    done,
    pending,
    blockingPending,
    canAdvance: blockingPending.length === 0,
    progressPct: def.requirements.length === 0 ? 100 : Math.round((done / def.requirements.length) * 100),
  }
}
