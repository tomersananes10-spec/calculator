// FSM — 12 שלבים + מעברים מותרים + ולידציות

import type { SelectionType, Tender, TenderStage } from './types'
import { shouldSkipStage } from './data/gateways'

export interface TransitionRule {
  from: TenderStage
  to: TenderStage
  /** רשימת דרישות שצריכות להיות מסומנות לפני המעבר */
  requirements?: TransitionRequirement[]
}

export type TransitionRequirement =
  | 'budget_approved'           // M1
  | 'olma_approved'              // M2
  | 'committee_outbound_approved' // M3
  | 'professional_review_approved' // M4
  | 'distribution_closed'         // M5
  | 'winner_selected'             // M6
  | 'winner_committee_approved'   // M7
  | 'contract_signed'             // M8
  | 'po_issued'                   // M9
  | 'all_milestones_accepted'     // M10
  | 'vendor_evaluated'            // closure blocker

// המעברים העיקריים. מעברי "חזרה" (loops) נכתבים בנפרד.
export const FORWARD_TRANSITIONS: TransitionRule[] = [
  { from: 'S0_preconditions',       to: 'S1_initiation_budget' },
  { from: 'S1_initiation_budget',   to: 'S2_olma_approval', requirements: ['budget_approved'] },
  { from: 'S1_initiation_budget',   to: 'S3_committee_outbound', requirements: ['budget_approved'] }, // skip S2 if amount ≤ 5M
  { from: 'S2_olma_approval',       to: 'S3_committee_outbound', requirements: ['olma_approved'] },
  { from: 'S3_committee_outbound',  to: 'S4_system_input_review', requirements: ['committee_outbound_approved'] },
  { from: 'S1_initiation_budget',   to: 'S4_system_input_review', requirements: ['budget_approved'] }, // simple path (G1)
  { from: 'S4_system_input_review', to: 'S5_distribution_response', requirements: ['professional_review_approved'] },
  { from: 'S5_distribution_response', to: 'S6_proposal_evaluation', requirements: ['distribution_closed'] },
  { from: 'S6_proposal_evaluation', to: 'S7_committee_winner', requirements: ['winner_selected'] },
  { from: 'S6_proposal_evaluation', to: 'S8_contract', requirements: ['winner_selected'] }, // skip S7 (G7)
  { from: 'S7_committee_winner',    to: 'S8_contract', requirements: ['winner_committee_approved'] },
  { from: 'S8_contract',            to: 'S9_purchase_order', requirements: ['contract_signed'] },
  { from: 'S9_purchase_order',      to: 'S10_execution_m1', requirements: ['po_issued'] },
  { from: 'S10_execution_m1',       to: 'S11_execution_m2' },
  { from: 'S10_execution_m1',       to: 'S12_closure_evaluation', requirements: ['all_milestones_accepted'] },
  { from: 'S11_execution_m2',       to: 'S12_closure_evaluation', requirements: ['all_milestones_accepted'] },
  { from: 'S12_closure_evaluation', to: 'closed', requirements: ['vendor_evaluated'] },
]

// מעברי חזרה — Gateway החזרות
export const RETURN_TRANSITIONS: TransitionRule[] = [
  { from: 'S3_committee_outbound',  to: 'S1_initiation_budget' }, // G3=returned
  { from: 'S4_system_input_review', to: 'S4_system_input_review' }, // G4 corrections (loop)
  { from: 'S7_committee_winner',    to: 'S6_proposal_evaluation' }, // G8=rejected
  { from: 'S8_contract',            to: 'S8_contract' }, // G10 guarantee/insurance loop
]

export interface AdvanceContext {
  amount: number
  selection: SelectionType
  satisfied: Set<TransitionRequirement>
}

export interface AdvanceResult {
  ok: boolean
  reasons: string[]
}

export function canAdvance(
  tender: Pick<Tender, 'current_stage' | 'estimated_amount' | 'selection_type'>,
  targetStage: TenderStage,
  satisfied: TransitionRequirement[] = [],
): AdvanceResult {
  const ctx: AdvanceContext = {
    amount: tender.estimated_amount,
    selection: tender.selection_type,
    satisfied: new Set(satisfied),
  }

  const rule = FORWARD_TRANSITIONS.find(t => t.from === tender.current_stage && t.to === targetStage)
  if (!rule) {
    return { ok: false, reasons: [`לא קיים מעבר ישיר מ-${tender.current_stage} ל-${targetStage}`] }
  }

  // Skip-rules (G1/G7) — אם השלב צריך להיות מדולג, מאפשרים את המעבר אליו עד השלב הבא
  const skip = shouldSkipStage(targetStage, { amount: ctx.amount, selection: ctx.selection })
  if (skip.skip) {
    return { ok: false, reasons: [`שלב ${targetStage} מדולג: ${skip.reason}`] }
  }

  // Validate requirements
  const reasons: string[] = []
  for (const req of rule.requirements ?? []) {
    if (!ctx.satisfied.has(req)) reasons.push(`דרישה לא מולאה: ${req}`)
  }

  return { ok: reasons.length === 0, reasons }
}

export function nextStages(currentStage: TenderStage): TenderStage[] {
  return FORWARD_TRANSITIONS.filter(t => t.from === currentStage).map(t => t.to)
}

export function isTerminal(stage: TenderStage): boolean {
  return stage === 'closed' || stage === 'cancelled'
}
