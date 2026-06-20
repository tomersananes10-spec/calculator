// Workflow Engine — הגדרות זרימת אישורים פר-שלב (9 שלבים T0..T8).
// אחרי redesign — workflows קיימים רק לשלבים שבהם יש בקשת אישור / חתימה רשמית.

import type { ApprovalRequestType, PersonaRole, TenderStage } from './types'

export type WorkflowStepKind = 'sequential' | 'parallel' | 'conditional'

export interface WorkflowStep {
  id: string
  kind: WorkflowStepKind
  requestType: ApprovalRequestType
  assigneeRole: PersonaRole
  nextOnApprove?: string[]
  nextOnReject?: string
  nextOnReturn?: string
  description: string
}

export interface WorkflowDefinition {
  stage: TenderStage
  initialStepId: string
  steps: Record<string, WorkflowStep>
  description: string
}

// T1 — בקשת אישור תקציבי
const WORKFLOW_T1: WorkflowDefinition = {
  stage: 'T1_budget_approval',
  initialStepId: 'budget_request',
  description: 'בקשת אישור תקציבי — פינגפונג עד אישור סופי',
  steps: {
    budget_request: {
      id: 'budget_request',
      kind: 'sequential',
      requestType: 'budget_approval',
      assigneeRole: 'budget_officer',
      nextOnReject: 'budget_request',
      nextOnReturn: 'budget_request',
      description: 'אישור תקציבי מתקציבן המערך',
    },
  },
}

// T2 — ועדת מכרזים (יציאה) — פינגפונג
const WORKFLOW_T2: WorkflowDefinition = {
  stage: 'T2_committee_outbound',
  initialStepId: 'committee_decision',
  description: 'ועדת מכרזים — יציאה לתיחור (תומך בסבבי תיקונים)',
  steps: {
    committee_decision: {
      id: 'committee_decision',
      kind: 'sequential',
      requestType: 'committee_outbound',
      assigneeRole: 'tender_committee_member',
      nextOnReject: 'committee_decision',
      nextOnReturn: 'committee_decision',
      description: 'דיון והחלטת ועדת מכרזים',
    },
  },
}

// T3 — חתימות יציאה (משפטן → חשב → סמנכ"ל)
const WORKFLOW_T3: WorkflowDefinition = {
  stage: 'T3_signatures_outbound',
  initialStepId: 'sig_legal',
  description: 'חתימות יציאה — משפטן → חשב → סמנכ"ל',
  steps: {
    sig_legal: {
      id: 'sig_legal',
      kind: 'sequential',
      requestType: 'contract_signature',
      assigneeRole: 'legal_professional',
      nextOnApprove: ['sig_treasurer'],
      description: 'חתימת משפטן',
    },
    sig_treasurer: {
      id: 'sig_treasurer',
      kind: 'sequential',
      requestType: 'contract_signature',
      assigneeRole: 'budget_officer',
      nextOnApprove: ['sig_vp'],
      description: 'חתימת חשב',
    },
    sig_vp: {
      id: 'sig_vp',
      kind: 'sequential',
      requestType: 'contract_signature',
      assigneeRole: 'signatory',
      description: 'חתימת סמנכ"ל',
    },
  },
}

// T6 — ועדת זכייה — פינגפונג
const WORKFLOW_T6: WorkflowDefinition = {
  stage: 'T6_committee_winner',
  initialStepId: 'winner_decision',
  description: 'ועדת מכרזים — אישור זכייה (תומך בסבבי תיקונים)',
  steps: {
    winner_decision: {
      id: 'winner_decision',
      kind: 'sequential',
      requestType: 'committee_winner',
      assigneeRole: 'tender_committee_member',
      nextOnReject: 'winner_decision',
      nextOnReturn: 'winner_decision',
      description: 'דיון והחלטה על פרוטוקול הזכייה',
    },
  },
}

// T7 — חתימות זכייה
const WORKFLOW_T7: WorkflowDefinition = {
  stage: 'T7_signatures_winner',
  initialStepId: 'sig_legal',
  description: 'חתימות פרוטוקול זכייה — משפטן → חשב → סמנכ"ל',
  steps: {
    sig_legal: {
      id: 'sig_legal',
      kind: 'sequential',
      requestType: 'contract_signature',
      assigneeRole: 'legal_professional',
      nextOnApprove: ['sig_treasurer'],
      description: 'חתימת משפטן',
    },
    sig_treasurer: {
      id: 'sig_treasurer',
      kind: 'sequential',
      requestType: 'contract_signature',
      assigneeRole: 'budget_officer',
      nextOnApprove: ['sig_vp'],
      description: 'חתימת חשב',
    },
    sig_vp: {
      id: 'sig_vp',
      kind: 'sequential',
      requestType: 'contract_signature',
      assigneeRole: 'signatory',
      description: 'חתימת סמנכ"ל',
    },
  },
}

// T8 — התקשרות (חוזה + ערבות + ביטוח + מורשי חתימה)
const WORKFLOW_T8: WorkflowDefinition = {
  stage: 'T8_engagement',
  initialStepId: 'contract_signature',
  description: 'התקשרות — חתימה, ערבות, ביטוח, חתימת מורשי חתימה',
  steps: {
    contract_signature: {
      id: 'contract_signature',
      kind: 'sequential',
      requestType: 'contract_signature',
      assigneeRole: 'vendor',
      nextOnApprove: ['guarantee_verification', 'insurance_verification'],
      description: 'חתימת ספק על הסכם',
    },
    guarantee_verification: {
      id: 'guarantee_verification',
      kind: 'parallel',
      requestType: 'guarantee_verification',
      assigneeRole: 'legal_professional',
      nextOnApprove: ['signatory_sign'],
      nextOnReject: 'contract_signature',
      description: 'בדיקת ערבות',
    },
    insurance_verification: {
      id: 'insurance_verification',
      kind: 'parallel',
      requestType: 'insurance_verification',
      assigneeRole: 'legal_professional',
      nextOnApprove: ['signatory_sign'],
      nextOnReject: 'contract_signature',
      description: 'בדיקת ביטוח',
    },
    signatory_sign: {
      id: 'signatory_sign',
      kind: 'sequential',
      requestType: 'contract_signature',
      assigneeRole: 'signatory',
      description: 'חתימת מורשי החתימה',
    },
  },
}

export const WORKFLOWS: Partial<Record<TenderStage, WorkflowDefinition>> = {
  T1_budget_approval: WORKFLOW_T1,
  T2_committee_outbound: WORKFLOW_T2,
  T3_signatures_outbound: WORKFLOW_T3,
  T6_committee_winner: WORKFLOW_T6,
  T7_signatures_winner: WORKFLOW_T7,
  T8_engagement: WORKFLOW_T8,
}

export function getWorkflow(stage: TenderStage): WorkflowDefinition | undefined {
  return WORKFLOWS[stage]
}

export function getNextStep(
  workflow: WorkflowDefinition,
  currentStepId: string,
  decision: 'approve' | 'reject' | 'return',
): WorkflowStep | WorkflowStep[] | null {
  const current = workflow.steps[currentStepId]
  if (!current) return null

  if (decision === 'approve') {
    const nextIds = current.nextOnApprove ?? []
    if (nextIds.length === 0) return null
    if (nextIds.length === 1) return workflow.steps[nextIds[0]] ?? null
    return nextIds.map(id => workflow.steps[id]).filter((s): s is WorkflowStep => Boolean(s))
  }
  if (decision === 'reject' && current.nextOnReject) {
    return workflow.steps[current.nextOnReject] ?? null
  }
  if (decision === 'return' && current.nextOnReturn) {
    return workflow.steps[current.nextOnReturn] ?? null
  }
  return null
}
