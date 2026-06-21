// דרישות פר-שלב (9 שלבים T0..T8).
// כל requirement מחזיר RequirementStatus עשיר (לא רק boolean) כדי שה-UI יוכל
// להציג מצב של בקשה ממתינה: למי נשלחה, מתי, וכו'.

import type { TenderDetailData } from '../hooks/useTender'
import type { ApprovalRequestType, TenderApprovalRequest, TenderStage } from '../types'
import { getNextStage } from './stagesBaseline'

export type ActionId =
  // T0
  | 'upload_brief'
  | 'upload_initial_protocol'
  // T1
  | 'create_budget_approval'
  // T2 + T6 — ועדה
  | 'schedule_committee_outbound'
  | 'create_committee_outbound_protocol'
  | 'schedule_committee_winner'
  | 'create_committee_winner_protocol'
  // T3 + T7 — חתימות
  | 'request_signature_legal'
  | 'request_signature_treasurer'
  | 'request_signature_vp'
  // T4 — מינהל הרכש
  | 'minhal_rechesh_winner_received'
  // T5 — פרוטוקול זכייה
  | 'upload_winner_protocol'
  // T8 — התקשרות
  | 'draft_contract'
  | 'verify_guarantee'
  | 'verify_insurance'
  | 'sign_contract_internal'
  | 'create_purchase_order'
  | 'create_milestone'
  // generic
  | 'advance_stage'

export type RequirementStatus =
  | { state: 'not_started' }
  | { state: 'awaiting'; request: TenderApprovalRequest }
  | { state: 'approved'; request: TenderApprovalRequest }
  | { state: 'rejected'; request: TenderApprovalRequest }
  | { state: 'returned'; request: TenderApprovalRequest }
  | { state: 'satisfied' }

export interface StageRequirement {
  id: string
  label: string
  description?: string
  getStatus: (detail: TenderDetailData) => RequirementStatus
  action?: ActionId
  blocker?: boolean
  approvalRequestType?: ApprovalRequestType
}

export interface StageRequirementsDef {
  stage: TenderStage
  nextStage: TenderStage
  requirements: StageRequirement[]
}

// ───────── helpers ─────────

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
    if (latest.status === 'returned') return { state: 'returned', request: latest }
    if (latest.status === 'rejected' || latest.status === 'cancelled') {
      return { state: 'rejected', request: latest }
    }
    return { state: 'awaiting', request: latest }
  }
}

function approvalBasedByRole(
  type: ApprovalRequestType,
  role: string,
): (d: TenderDetailData) => RequirementStatus {
  return (d) => {
    const matching = d.approvalRequests
      .filter(r => r.request_type === type && r.requested_role === role)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
    const latest = matching[0]
    if (!latest) return { state: 'not_started' }

    if (latest.status === 'approved') return { state: 'approved', request: latest }
    if (latest.status === 'returned') return { state: 'returned', request: latest }
    if (latest.status === 'rejected' || latest.status === 'cancelled') {
      return { state: 'rejected', request: latest }
    }
    return { state: 'awaiting', request: latest }
  }
}

function fieldBasedStatus(check: (d: TenderDetailData) => boolean): (d: TenderDetailData) => RequirementStatus {
  return (d) => (check(d) ? { state: 'satisfied' } : { state: 'not_started' })
}

const hasDocument = (d: TenderDetailData, docType: string) =>
  d.documents.some(doc => doc.doc_type === docType)

const hasApprovedProtocol = (d: TenderDetailData, type: string) =>
  d.protocols.some(p => p.protocol_type === type && p.decision === 'approved')

// ───────── requirement definitions ─────────

// T0 — בריף + פרוטוקול ראשוני
const REQ_BRIEF: StageRequirement = {
  id: 'brief_uploaded',
  label: 'בריף הליך',
  description: 'בחירה ממודול הבריפים או העלאה ידנית',
  getStatus: fieldBasedStatus(d => Boolean(d.tender?.brief_id) || hasDocument(d, 'brief')),
  action: 'upload_brief',
  blocker: true,
}

const REQ_INITIAL_PROTOCOL: StageRequirement = {
  id: 'initial_protocol_uploaded',
  label: 'פרוטוקול ראשוני',
  description: 'העלאה ידנית. מודול פרוטוקולים ייבנה בעתיד.',
  getStatus: fieldBasedStatus(d => hasDocument(d, 'protocol_initial')),
  action: 'upload_initial_protocol',
  blocker: true,
}

// T1 — אישור תקציבי (פינגפונג)
const REQ_BUDGET_APPROVED: StageRequirement = {
  id: 'budget_approved',
  label: 'אישור תקציבי',
  description: 'אישור תקציב ע"י תקציבן המערך. תומך בסבבי תיקונים.',
  approvalRequestType: 'budget_approval',
  getStatus: approvalBasedStatus('budget_approval', d => d.budget?.status === 'approved'),
  action: 'create_budget_approval',
  blocker: true,
}

// T2 — ועדת מכרזים (יציאה) — פינגפונג
const REQ_COMMITTEE_OUTBOUND_SCHEDULED: StageRequirement = {
  id: 'committee_outbound_scheduled',
  label: 'דיון ועדת מכרזים נקבע',
  description: 'מנהלת הוועדה מזמנת דיון עם הנוכחים הקבועים',
  // "נקבע" = יש לפחות דיון אחד בטבלת ועדות. דיון נוסף לסבב פינגפונג עדיין יעבור את הבדיקה.
  getStatus: fieldBasedStatus(d => d.committeeMeetings.length >= 1),
  action: 'schedule_committee_outbound',
  blocker: false,
}

const REQ_COMMITTEE_OUTBOUND_APPROVED: StageRequirement = {
  id: 'committee_outbound_approved',
  label: 'אישור ועדה — יציאה לתיחור',
  description: 'בקשה נשלחת למנהלת הוועדה. תומך בסבבי תיקונים עד אישור סופי.',
  approvalRequestType: 'committee_outbound',
  getStatus: approvalBasedStatus('committee_outbound', d => hasApprovedProtocol(d, 'outbound_request')),
  action: 'create_committee_outbound_protocol',
  blocker: true,
}

// T3 — חתימות (משפטן → חשב → סמנכ"ל)
const REQ_SIGNATURE_LEGAL_OUTBOUND: StageRequirement = {
  id: 'signature_legal_outbound',
  label: 'חתימת משפטן',
  description: 'משפטן חותם על הגרסה האחרונה של המסמכים שאושרו בוועדה',
  approvalRequestType: 'contract_signature',
  getStatus: approvalBasedByRole('contract_signature', 'legal_professional'),
  action: 'request_signature_legal',
  blocker: true,
}

const REQ_SIGNATURE_TREASURER_OUTBOUND: StageRequirement = {
  id: 'signature_treasurer_outbound',
  label: 'חתימת חשב',
  description: 'חשב חותם אחרי המשפטן',
  approvalRequestType: 'contract_signature',
  getStatus: approvalBasedByRole('contract_signature', 'treasurer'),
  action: 'request_signature_treasurer',
  blocker: true,
}

const REQ_SIGNATURE_VP_OUTBOUND: StageRequirement = {
  id: 'signature_vp_outbound',
  label: 'חתימת סמנכ"ל',
  description: 'סמנכ"ל חותם אחרון על מסמכי היציאה',
  approvalRequestType: 'contract_signature',
  getStatus: approvalBasedByRole('contract_signature', 'signatory'),
  action: 'request_signature_vp',
  blocker: true,
}

// T4 — מינהל הרכש (קופסה שחורה)
const REQ_MINHAL_RECHESH_DONE: StageRequirement = {
  id: 'minhal_rechesh_done',
  label: 'התקבל ספק זוכה ממינהל הרכש',
  description: 'במינהל הרכש בחרו ספק. סמן כאן כדי להמשיך לפרוטוקול הזכייה.',
  getStatus: fieldBasedStatus(d => Boolean(d.tender?.tender_number_external)),
  action: 'minhal_rechesh_winner_received',
  blocker: true,
}

// T5 — פרוטוקול זכייה (upload ידני)
const REQ_WINNER_PROTOCOL_UPLOADED: StageRequirement = {
  id: 'winner_protocol_uploaded',
  label: 'פרוטוקול זכייה הועלה',
  description: 'העלאה ידנית של פרוטוקול הזכייה. בעתיד יישלף ממודול הפרוטוקולים.',
  getStatus: fieldBasedStatus(d => hasDocument(d, 'winner_protocol')),
  action: 'upload_winner_protocol',
  blocker: true,
}

// T6 — ועדת זכייה (פינגפונג)
const REQ_COMMITTEE_WINNER_SCHEDULED: StageRequirement = {
  id: 'committee_winner_scheduled',
  label: 'דיון ועדה לפרוטוקול זכייה',
  description: 'אותו פורום של ועדת היציאה',
  // הוועדה של היציאה כבר תוזמנה ב-T2 (לפחות אחת). הזכייה דורשת דיון נוסף — סה"כ >= 2.
  getStatus: fieldBasedStatus(d => d.committeeMeetings.length >= 2),
  action: 'schedule_committee_winner',
  blocker: false,
}

const REQ_COMMITTEE_WINNER_APPROVED: StageRequirement = {
  id: 'committee_winner_approved',
  label: 'אישור ועדה — זכייה',
  description: 'בקשה למנהלת הוועדה לאשר את הזוכה. תומך בסבבי תיקונים.',
  approvalRequestType: 'committee_winner',
  getStatus: approvalBasedStatus('committee_winner', d => hasApprovedProtocol(d, 'winner_approval')),
  action: 'create_committee_winner_protocol',
  blocker: true,
}

// T7 — חתימות זכייה
const REQ_SIGNATURE_LEGAL_WINNER: StageRequirement = {
  id: 'signature_legal_winner',
  label: 'חתימת משפטן',
  description: 'משפטן חותם על פרוטוקול הזכייה',
  approvalRequestType: 'contract_signature',
  getStatus: approvalBasedByRole('contract_signature', 'legal_professional'),
  action: 'request_signature_legal',
  blocker: true,
}

const REQ_SIGNATURE_TREASURER_WINNER: StageRequirement = {
  id: 'signature_treasurer_winner',
  label: 'חתימת חשב',
  description: 'חשב חותם אחרי המשפטן',
  approvalRequestType: 'contract_signature',
  getStatus: approvalBasedByRole('contract_signature', 'treasurer'),
  action: 'request_signature_treasurer',
  blocker: true,
}

const REQ_SIGNATURE_VP_WINNER: StageRequirement = {
  id: 'signature_vp_winner',
  label: 'חתימת סמנכ"ל',
  description: 'סמנכ"ל חותם אחרון',
  approvalRequestType: 'contract_signature',
  getStatus: approvalBasedByRole('contract_signature', 'signatory'),
  action: 'request_signature_vp',
  blocker: true,
}

// T8 — התקשרות + אבני דרך
const REQ_CONTRACT_DRAFTED: StageRequirement = {
  id: 'contract_drafted',
  label: 'טיוטת הסכם נוצרה',
  description: 'בחירת תבנית הסכם וקישור לספק הזוכה',
  getStatus: fieldBasedStatus(d => d.contracts.length > 0),
  action: 'draft_contract',
  blocker: true,
}

const REQ_CONTRACT_SIGNED: StageRequirement = {
  id: 'contract_signed',
  label: 'הסכם נחתם סופית',
  description: 'הספק חתם, ערבות וביטוח אומתו, מורשי החתימה חתמו',
  getStatus: fieldBasedStatus(d => d.contracts.some(c => c.signature_status === 'fully_signed')),
  action: 'sign_contract_internal',
  blocker: true,
}

const REQ_PO_ISSUED: StageRequirement = {
  id: 'po_issued',
  label: 'הזמנת רכש (PO) הוקמה',
  description: 'הקמה ב-ERP ושליחה לפורטל הספקים',
  getStatus: fieldBasedStatus(d => d.purchaseOrders.some(po => po.status === 'sent_to_vendor' || po.status === 'acknowledged')),
  action: 'create_purchase_order',
  blocker: true,
}

const REQ_MILESTONES_DEFINED: StageRequirement = {
  id: 'milestones_defined',
  label: 'אבני דרך לתשלום הוגדרו',
  description: 'לפחות אבן דרך אחת מוגדרת לתחילת העבודה',
  getStatus: fieldBasedStatus(d => d.milestones.length >= 1),
  action: 'create_milestone',
  blocker: true,
}

// ───────── per-stage map ─────────

export const STAGE_REQUIREMENTS: Partial<Record<TenderStage, StageRequirementsDef>> = {
  T0_brief_protocol: {
    stage: 'T0_brief_protocol',
    nextStage: 'T1_budget_approval',
    requirements: [REQ_BRIEF, REQ_INITIAL_PROTOCOL],
  },
  T1_budget_approval: {
    stage: 'T1_budget_approval',
    nextStage: 'T2_committee_outbound',
    requirements: [REQ_BUDGET_APPROVED],
  },
  T2_committee_outbound: {
    stage: 'T2_committee_outbound',
    nextStage: 'T3_signatures_outbound',
    requirements: [REQ_COMMITTEE_OUTBOUND_SCHEDULED, REQ_COMMITTEE_OUTBOUND_APPROVED],
  },
  T3_signatures_outbound: {
    stage: 'T3_signatures_outbound',
    nextStage: 'T4_minhal_rechesh',
    requirements: [REQ_SIGNATURE_LEGAL_OUTBOUND, REQ_SIGNATURE_TREASURER_OUTBOUND, REQ_SIGNATURE_VP_OUTBOUND],
  },
  T4_minhal_rechesh: {
    stage: 'T4_minhal_rechesh',
    nextStage: 'T5_winner_protocol_upload',
    requirements: [REQ_MINHAL_RECHESH_DONE],
  },
  T5_winner_protocol_upload: {
    stage: 'T5_winner_protocol_upload',
    nextStage: 'T6_committee_winner',
    requirements: [REQ_WINNER_PROTOCOL_UPLOADED],
  },
  T6_committee_winner: {
    stage: 'T6_committee_winner',
    nextStage: 'T7_signatures_winner',
    requirements: [REQ_COMMITTEE_WINNER_SCHEDULED, REQ_COMMITTEE_WINNER_APPROVED],
  },
  T7_signatures_winner: {
    stage: 'T7_signatures_winner',
    nextStage: 'T8_engagement',
    requirements: [REQ_SIGNATURE_LEGAL_WINNER, REQ_SIGNATURE_TREASURER_WINNER, REQ_SIGNATURE_VP_WINNER],
  },
  T8_engagement: {
    stage: 'T8_engagement',
    nextStage: 'closed',
    requirements: [REQ_CONTRACT_DRAFTED, REQ_CONTRACT_SIGNED, REQ_PO_ISSUED, REQ_MILESTONES_DEFINED],
  },
}

export function isRequirementDone(status: RequirementStatus): boolean {
  return status.state === 'satisfied' || status.state === 'approved'
}

export interface MetadataBlocker {
  id: string
  label: string
  action: ActionId
}

export interface StageRequirementsResult {
  stage: TenderStage
  nextStage: TenderStage | null
  total: number
  done: number
  pending: StageRequirement[]
  blockingPending: StageRequirement[]
  metadataBlockers: MetadataBlocker[]
  canAdvance: boolean
  progressPct: number
}

// אין יותר metadata blockers — מספרי תיחור פנימי/חיצוני אינם חוסמים את הזרימה החדשה.
function getMetadataBlockers(_detail: TenderDetailData): MetadataBlocker[] {
  return []
}

export function evaluateStageRequirements(detail: TenderDetailData): StageRequirementsResult {
  const tender = detail.tender
  if (!tender) {
    return {
      stage: 'T0_brief_protocol',
      nextStage: null,
      total: 0,
      done: 0,
      pending: [],
      blockingPending: [],
      metadataBlockers: [],
      canAdvance: false,
      progressPct: 0,
    }
  }

  const metadataBlockers = getMetadataBlockers(detail)
  const def = STAGE_REQUIREMENTS[tender.current_stage]
  if (!def) {
    return {
      stage: tender.current_stage,
      nextStage: getNextStage(tender.current_stage),
      total: 0,
      done: 0,
      pending: [],
      blockingPending: [],
      metadataBlockers,
      canAdvance: metadataBlockers.length === 0,
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
    metadataBlockers,
    canAdvance: blockingPending.length === 0 && metadataBlockers.length === 0,
    progressPct: def.requirements.length === 0 ? 100 : Math.round((done / def.requirements.length) * 100),
  }
}
