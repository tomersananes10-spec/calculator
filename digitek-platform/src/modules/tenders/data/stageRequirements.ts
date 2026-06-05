// הגדרות דרישות (checklist) לכל שלב — מבוסס על workflowEngine + state machine
// כל requirement הוא predicate על TenderDetailData. הפעולה (action) מצביעה לאיזה modal להציג.

import type { TenderDetailData } from '../hooks/useTender'
import type { TenderStage } from '../types'

export type ActionId =
  | 'create_budget_approval'
  | 'set_tender_number'
  | 'create_olma_approval'
  | 'create_committee_outbound_protocol'
  | 'create_professional_review'
  | 'create_committee_winner_protocol'
  | 'advance_stage'

export interface StageRequirement {
  id: string
  label: string
  description?: string
  /** האם הדרישה מולאה. */
  check: (detail: TenderDetailData) => boolean
  /** ה-action שיוצר את הדרישה (מצביע ל-modal). */
  action?: ActionId
  /** דרישה בלוקר — חוסם המשך אם לא מולא. */
  blocker?: boolean
}

export interface StageRequirementsDef {
  stage: TenderStage
  /** השלב הבא ב-FSM (לאחר השלמת requirements). */
  nextStage: TenderStage
  requirements: StageRequirement[]
}

const REQ_BUDGET_APPROVED: StageRequirement = {
  id: 'budget_approved',
  label: 'אישור תקציבי',
  description: 'אישור תקציב ע"י תקציבן המערך + הקצאת מספר תיחור',
  check: d => d.budget?.status === 'approved',
  action: 'create_budget_approval',
  blocker: true,
}

const REQ_TENDER_NUMBER: StageRequirement = {
  id: 'tender_number',
  label: 'מספר תיחור פנימי',
  description: 'מספר ייחודי לזיהוי ההליך',
  check: d => Boolean(d.tender?.tender_number),
  action: 'set_tender_number',
  blocker: true,
}

const REQ_OLMA_APPROVAL: StageRequirement = {
  id: 'olma_approved',
  label: 'אישור אלמ"ה (מעל 5M)',
  description: 'אישור מנהל הרכש דרך מערכת אלמ"ה',
  check: d =>
    !d.tender?.requires_olma
    || d.auditLog.some(a => a.entity_type === 'approval_request'
      && a.action === 'decided'
      && (a.after_state as { decision?: string } | null)?.decision === 'approved'
      && d.tender !== null), // simplification — בעתיד נצא לטבלת approvals
  action: 'create_olma_approval',
  blocker: true,
}

const REQ_COMMITTEE_OUTBOUND: StageRequirement = {
  id: 'committee_outbound_approved',
  label: 'אישור ועדת מכרזים — יציאה לתיחור',
  description: 'פרוטוקול חתום של ועדת מכרזים המאשר יציאה לתיחור (G3=approved)',
  check: d => d.protocols.some(p => p.protocol_type === 'outbound_request' && p.decision === 'approved'),
  action: 'create_committee_outbound_protocol',
  blocker: true,
}

const REQ_TENDER_NUMBER_EXTERNAL: StageRequirement = {
  id: 'tender_number_external',
  label: 'מספר תיחור חיצוני',
  description: 'מספר ההליך במערכת התיחורים הדיגיטלית',
  check: d => Boolean(d.tender?.tender_number_external),
  action: 'set_tender_number',
  blocker: true,
}

const REQ_PROFESSIONAL_REVIEW: StageRequirement = {
  id: 'professional_review_approved',
  label: 'אישור גורם מקצועי במינהל הרכש',
  description: 'בדיקה ואישור הפרויקט תוך SLA של 3 ימי עבודה',
  check: d => d.auditLog.some(a =>
    a.entity_type === 'approval_request'
    && a.action === 'decided'
    && (a.after_state as { decision?: string } | null)?.decision === 'approved'),
  action: 'create_professional_review',
  blocker: true,
}

export const STAGE_REQUIREMENTS: Partial<Record<TenderStage, StageRequirementsDef>> = {
  S1_initiation_budget: {
    stage: 'S1_initiation_budget',
    nextStage: 'S2_olma_approval', // יוכרע ע"י Gateway G1 — אם requires_olma=false נדלג ל-S3
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
    // שלב ללא requirements מוגדרים (S0, S5-S12, terminal)
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

  const pending = def.requirements.filter(r => !r.check(detail))
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
