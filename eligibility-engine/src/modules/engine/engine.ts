import type { RoleTemplate, CheckResult, RequirementResult } from './types'
import { analyzeRequirement, detectYears, getTotalYears } from './keywordEngine'

export function runEligibilityCheck(cvText: string, template: RoleTemplate): CheckResult {
  const startTime = Date.now()
  const yearDetections = detectYears(cvText)
  const estimatedYears = getTotalYears(yearDetections)

  const results: RequirementResult[] = template.requirements.map(req =>
    analyzeRequirement(cvText, req)
  )

  const totalWeight = results.reduce((sum, r) => sum + r.requirement.weight, 0)
  const weightedScore = totalWeight > 0
    ? results.reduce((sum, r) => sum + r.score * r.requirement.weight, 0) / totalWeight
    : 0
  const overallScore = Math.round(weightedScore)

  const hasHardFail = results.some(r => r.status === 'fail' && r.requirement.hardRule)
  const hasAnyFail = results.some(r => r.status === 'fail')
  const hasReview = results.some(r => r.status === 'requires_review')

  const overallStatus = hasHardFail || hasAnyFail
    ? 'fail'
    : hasReview
      ? 'requires_review'
      : 'pass'

  return {
    overallStatus,
    overallScore,
    estimatedYears,
    results,
    metadata: {
      engineVersion: 'keyword-v1',
      analyzedAt: new Date().toISOString(),
      cvLength: cvText.length,
      processingTimeMs: Date.now() - startTime,
    },
  }
}
