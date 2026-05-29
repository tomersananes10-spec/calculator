export type RequirementCategory =
  | 'education'
  | 'professional_exp'
  | 'team_management'
  | 'budget_management'
  | 'certification'
  | 'custom'

export interface YearsByTrack {
  bachelor: number
  master: number
  practicalEngineer: number
  technician: number
}

export interface Requirement {
  id: string
  category: RequirementCategory
  label: string
  description: string
  keywords: string[]
  acceptedEvidence?: string[]
  minScore: number
  hardRule: boolean
  weight: number
  yearsByTrack?: YearsByTrack
  minYears?: number
  minBudgetNis?: number
}

export interface RoleTemplate {
  id: string
  name: string
  takamCode?: string
  source?: string
  description: string
  requirements: Requirement[]
  isActive: boolean
}

export type RequirementStatus = 'pass' | 'fail' | 'requires_review'

export interface KeywordMatch {
  keyword: string
  found: boolean
  context: string
  position: number
}

export interface YearDetection {
  raw: string
  years: number
  startYear?: number
  endYear?: number
  confidence: number
}

export interface RequirementResult {
  requirementId: string
  requirement: Requirement
  status: RequirementStatus
  score: number
  confidence: number
  keywordMatches: KeywordMatch[]
  yearDetections: YearDetection[]
  keywordScore: number
  summary: string
}

export interface CheckResult {
  overallStatus: RequirementStatus
  overallScore: number
  estimatedYears: number
  results: RequirementResult[]
  metadata: {
    engineVersion: string
    analyzedAt: string
    cvLength: number
    processingTimeMs: number
  }
}

export type HumanDecision = 'approved' | 'requires_docs' | 'rejected'

export interface RequirementDecision {
  requirementId: string
  decision: HumanDecision
  notes: string
}

export type CvSource = 'text' | 'pdf' | 'docx'

export interface CheckWizardState {
  currentStep: 1 | 2 | 3
  candidateName: string
  candidateCompany: string
  roleTemplateId: string
  cvText: string
  cvSource: CvSource
  cvFileName: string | null
  cvPageCount: number | null
  isParsing: boolean
  checkResult: CheckResult | null
  decisions: Record<string, HumanDecision>
  decisionNotes: string
  isRunning: boolean
  error: string | null
}
