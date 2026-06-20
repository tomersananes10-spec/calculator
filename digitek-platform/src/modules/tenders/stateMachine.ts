// FSM — 9 שלבים (T0..T8) עם מעברים סדרתיים בלבד.
// קדימה: Tn -> Tn+1 (עם דרישות לכל שלב).
// חזרה: Tn -> Tn-1 (מותר לכל פינגפונג).
// אין יותר Gateway-based skip — הזרימה ישירה.

import type { Tender, TenderStage } from './types'
import { STAGE_ORDER, getStageIndex, getNextStage, getPrevStage } from './data/stagesBaseline'

export interface TransitionRule {
  from: TenderStage
  to: TenderStage
  /** רשימת דרישות שצריכות להיות מסומנות לפני המעבר */
  requirements?: TransitionRequirement[]
}

export type TransitionRequirement =
  | 'brief_and_protocol_uploaded'   // T0 -> T1
  | 'budget_approved'               // T1 -> T2
  | 'committee_outbound_approved'   // T2 -> T3
  | 'outbound_signatures_complete'  // T3 -> T4
  | 'minhal_rechesh_winner_received' // T4 -> T5 (manual click)
  | 'winner_protocol_uploaded'      // T5 -> T6
  | 'committee_winner_approved'     // T6 -> T7
  | 'winner_signatures_complete'    // T7 -> T8
  | 'engagement_started'            // T8 -> closed

const REQ_BY_FROM_STAGE: Partial<Record<TenderStage, TransitionRequirement>> = {
  T0_brief_protocol:         'brief_and_protocol_uploaded',
  T1_budget_approval:        'budget_approved',
  T2_committee_outbound:     'committee_outbound_approved',
  T3_signatures_outbound:    'outbound_signatures_complete',
  T4_minhal_rechesh:         'minhal_rechesh_winner_received',
  T5_winner_protocol_upload: 'winner_protocol_uploaded',
  T6_committee_winner:       'committee_winner_approved',
  T7_signatures_winner:      'winner_signatures_complete',
  T8_engagement:             'engagement_started',
}

// המעברים העיקריים — sequential forward.
export const FORWARD_TRANSITIONS: TransitionRule[] = STAGE_ORDER.map((from, idx) => {
  const to = STAGE_ORDER[idx + 1] ?? 'closed'
  const requirement = REQ_BY_FROM_STAGE[from]
  return {
    from,
    to,
    requirements: requirement ? [requirement] : undefined,
  }
})

// מעברי חזרה — pingpong loops.
// כל שלב יכול לחזור שלב אחד אחורה (בקשת תיקון).
export const RETURN_TRANSITIONS: TransitionRule[] = STAGE_ORDER
  .map((from, idx) => idx === 0 ? null : { from, to: STAGE_ORDER[idx - 1] })
  .filter((r): r is TransitionRule => r !== null)

export interface AdvanceContext {
  satisfied: Set<TransitionRequirement>
}

export interface AdvanceResult {
  ok: boolean
  reasons: string[]
}

export function canAdvance(
  tender: Pick<Tender, 'current_stage'>,
  targetStage: TenderStage,
  satisfied: TransitionRequirement[] = [],
): AdvanceResult {
  // Terminal targets always reachable.
  if (targetStage === 'cancelled' || targetStage === 'closed') {
    return { ok: true, reasons: [] }
  }
  if (tender.current_stage === 'closed' || tender.current_stage === 'cancelled') {
    return { ok: false, reasons: ['ההליך כבר נסגר — לא ניתן להתקדם'] }
  }

  const fromIdx = getStageIndex(tender.current_stage)
  const toIdx = getStageIndex(targetStage)
  if (fromIdx < 0 || toIdx < 0) {
    return { ok: false, reasons: [`קוד שלב לא חוקי: ${targetStage}`] }
  }

  // רק מעבר ישיר קדימה או חזרה אחת.
  if (toIdx === fromIdx - 1) {
    return { ok: true, reasons: [] } // return loop — תמיד מותר
  }
  if (toIdx !== fromIdx + 1) {
    return { ok: false, reasons: [`לא ניתן לקפוץ מ-${tender.current_stage} ל-${targetStage} — רק מעבר לשלב הסמוך`] }
  }

  const ctx: AdvanceContext = { satisfied: new Set(satisfied) }
  const rule = FORWARD_TRANSITIONS.find(t => t.from === tender.current_stage && t.to === targetStage)
  const reasons: string[] = []
  for (const req of rule?.requirements ?? []) {
    if (!ctx.satisfied.has(req)) reasons.push(`דרישה לא מולאה: ${req}`)
  }

  return { ok: reasons.length === 0, reasons }
}

export function nextStages(currentStage: TenderStage): TenderStage[] {
  const next = getNextStage(currentStage)
  return next ? [next] : []
}

export function previousStage(currentStage: TenderStage): TenderStage | null {
  return getPrevStage(currentStage)
}

export function isTerminal(stage: TenderStage): boolean {
  return stage === 'closed' || stage === 'cancelled'
}
