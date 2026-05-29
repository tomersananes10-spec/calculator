import type { Requirement, RequirementStatus } from './types'

export interface AiRequirementResult {
  status: RequirementStatus
  score: number
  confidence: number
  estimatedYears: number
  evidence: string[]
  reasoning: string
  missingInfo?: string
}

export async function analyzeRequirementWithAI(
  cvText: string,
  requirement: Requirement
): Promise<AiRequirementResult> {
  const res = await fetch('/api/eligibility-ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cvText,
      requirementLabel: requirement.label,
      requirementDescription: requirement.description,
      keywords: requirement.keywords,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `AI API error ${res.status}`)
  }

  const data = await res.json()

  return {
    status: validateStatus(data.status),
    score: clamp(data.score ?? 0, 0, 100),
    confidence: clamp(data.confidence ?? 0.5, 0, 1),
    estimatedYears: data.estimatedYears ?? 0,
    evidence: Array.isArray(data.evidence) ? data.evidence : [],
    reasoning: data.reasoning ?? '',
    missingInfo: data.missingInfo,
  }
}

function validateStatus(s: string): RequirementStatus {
  if (s === 'pass' || s === 'fail' || s === 'requires_review') return s
  return 'requires_review'
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}
