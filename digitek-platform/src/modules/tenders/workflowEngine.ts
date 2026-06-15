// Workflow Engine — הגדרות זרימת אישורים פר שלב
// תומך ב-Sequential / Parallel / Conditional לפי M05 באפיון

import type { ApprovalRequestType, PersonaRole, TenderStage } from './types'

export type WorkflowStepKind = 'sequential' | 'parallel' | 'conditional'

export interface WorkflowStep {
  id: string
  /** סוג הצומת. sequential = ממתינים לפעולה. parallel = יוצרים כמה בקשות במקביל. conditional = בורר מסלול לפי tender state. */
  kind: WorkflowStepKind
  /** סוג בקשת האישור שיוצרים. */
  requestType: ApprovalRequestType
  /** תפקיד שצריך לקבל את הבקשה. */
  assigneeRole: PersonaRole
  /** מזהי השלבים הבאים. אם יותר מאחד — היחיד הראשון שיענה ימשיך. */
  nextOnApprove?: string[]
  /** מזהה שלב חלופי במקרה של דחיה/החזרה. */
  nextOnReject?: string
  /** מזהה שלב במקרה של "החזרה לתיקון". */
  nextOnReturn?: string
  /** אם kind='conditional' — פונקציה שמחזירה את ה-step הבא לפי tender state. */
  conditionalSelector?: (tenderState: { is_simple_path: boolean; requires_olma: boolean }) => string | null
  /** תיאור לתצוגה. */
  description: string
}

export interface WorkflowDefinition {
  stage: TenderStage
  /** השלב הראשון בזרימה. */
  initialStepId: string
  steps: Record<string, WorkflowStep>
  /** תיאור הזרימה לתצוגה. */
  description: string
}

// =====================================================
// Workflows per stage
// =====================================================

const WORKFLOW_S1: WorkflowDefinition = {
  stage: 'S1_initiation_budget',
  initialStepId: 'budget_request',
  description: 'ייזום ותקצוב — בקשת תקציב + סקירה פנימית של בריף',
  steps: {
    budget_request: {
      id: 'budget_request',
      kind: 'sequential',
      requestType: 'budget_approval',
      assigneeRole: 'budget_officer',
      nextOnApprove: ['internal_review'],
      nextOnReject: 'budget_request',
      description: 'אישור תקציבי מתקציבן המערך',
    },
    internal_review: {
      id: 'internal_review',
      kind: 'sequential',
      requestType: 'other',
      assigneeRole: 'professional_manager',
      description: 'סקירה פנימית של הבריף (מנהל מקצועי + יועמ"ש משרדי)',
    },
  },
}

const WORKFLOW_S2: WorkflowDefinition = {
  stage: 'S2_olma_approval',
  initialStepId: 'olma_request',
  description: 'אישור מינהל הרכש דרך אלמ"ה (מעל 5M בלבד)',
  steps: {
    olma_request: {
      id: 'olma_request',
      kind: 'sequential',
      requestType: 'olma_approval',
      assigneeRole: 'procurement_manager',
      nextOnReject: 'olma_request',
      description: 'אישור אלמ"ה ע"י מנהל הרכש',
    },
  },
}

const WORKFLOW_S3: WorkflowDefinition = {
  stage: 'S3_committee_outbound',
  initialStepId: 'committee_decision',
  description: 'ועדת מכרזים — יציאה לתיחור',
  steps: {
    committee_decision: {
      id: 'committee_decision',
      kind: 'sequential',
      requestType: 'committee_outbound',
      assigneeRole: 'tender_committee_member',
      nextOnReturn: 'committee_decision',
      description: 'דיון והחלטת ועדת מכרזים (G3)',
    },
  },
}

const WORKFLOW_S4: WorkflowDefinition = {
  stage: 'S4_system_input_review',
  initialStepId: 'professional_review',
  description: 'בדיקת גורם מקצועי במינהל הרכש (SLA 3 ימים)',
  steps: {
    professional_review: {
      id: 'professional_review',
      kind: 'sequential',
      requestType: 'professional_review',
      assigneeRole: 'procurement_professional',
      nextOnReturn: 'professional_review',
      description: 'בדיקת הפרויקט במערכת התיחורים',
    },
  },
}

const WORKFLOW_S7: WorkflowDefinition = {
  stage: 'S7_committee_winner',
  initialStepId: 'winner_decision',
  description: 'ועדת מכרזים — אישור זוכה',
  steps: {
    winner_decision: {
      id: 'winner_decision',
      kind: 'sequential',
      requestType: 'committee_winner',
      assigneeRole: 'tender_committee_member',
      nextOnReject: 'winner_decision',
      nextOnReturn: 'winner_decision',
      description: 'דיון והחלטת ועדת מכרזים (G8)',
    },
  },
}

const WORKFLOW_S8: WorkflowDefinition = {
  stage: 'S8_contract',
  initialStepId: 'contract_signature',
  description: 'התקשרות והסכם — חתימה, ערבות, ביטוח, חתימת מורשי חתימה',
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
      description: 'בדיקת ערבות (G10)',
    },
    insurance_verification: {
      id: 'insurance_verification',
      kind: 'parallel',
      requestType: 'insurance_verification',
      assigneeRole: 'legal_professional',
      nextOnApprove: ['signatory_sign'],
      nextOnReject: 'contract_signature',
      description: 'בדיקת ביטוח (G10)',
    },
    signatory_sign: {
      id: 'signatory_sign',
      kind: 'sequential',
      requestType: 'contract_signature',
      assigneeRole: 'signatory',
      description: 'חתימת מורשי החתימה (סיום שלב 8)',
    },
  },
}

const WORKFLOW_S10: WorkflowDefinition = {
  stage: 'S10_execution_m1',
  initialStepId: 'milestone_acceptance',
  description: 'ביצוע אבן דרך 1 — בדיקת תוצרים + אישור חשבונית',
  steps: {
    milestone_acceptance: {
      id: 'milestone_acceptance',
      kind: 'sequential',
      requestType: 'milestone_acceptance',
      assigneeRole: 'professional_manager',
      nextOnApprove: ['invoice_approval'],
      nextOnReject: 'milestone_acceptance',
      description: 'בדיקת תוצרים ע"י מנהל מקצועי',
    },
    invoice_approval: {
      id: 'invoice_approval',
      kind: 'sequential',
      requestType: 'invoice_approval',
      assigneeRole: 'process_manager',
      description: 'אישור חשבונית לתשלום',
    },
  },
}

const WORKFLOW_S12: WorkflowDefinition = {
  stage: 'S12_closure_evaluation',
  initialStepId: 'vendor_evaluation',
  description: 'סגירה — הערכת ספק (bloker)',
  steps: {
    vendor_evaluation: {
      id: 'vendor_evaluation',
      kind: 'sequential',
      requestType: 'vendor_evaluation',
      assigneeRole: 'process_manager',
      description: 'הערכת ספק חובה לפני סגירת הליך (סיכון #11)',
    },
  },
}

export const WORKFLOWS: Partial<Record<TenderStage, WorkflowDefinition>> = {
  S1_initiation_budget: WORKFLOW_S1,
  S2_olma_approval: WORKFLOW_S2,
  S3_committee_outbound: WORKFLOW_S3,
  S4_system_input_review: WORKFLOW_S4,
  S7_committee_winner: WORKFLOW_S7,
  S8_contract: WORKFLOW_S8,
  S10_execution_m1: WORKFLOW_S10,
  S11_execution_m2: WORKFLOW_S10, // אותה זרימה כמו S10
  S12_closure_evaluation: WORKFLOW_S12,
}

export function getWorkflow(stage: TenderStage): WorkflowDefinition | undefined {
  return WORKFLOWS[stage]
}

/** מחזיר את ה-step הבא בזרימה לפי החלטה (approve/reject/return). */
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
