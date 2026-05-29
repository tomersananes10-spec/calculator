import type { RoleTemplate, CheckResult, RequirementResult, RequirementStatus } from './types'
import { analyzeRequirement, detectYears, getTotalYears } from './keywordEngine'
import { analyzeRequirementWithAI } from './aiEngine'

export function runEligibilityCheck(cvText: string, template: RoleTemplate): CheckResult {
  const startTime = Date.now()
  const yearDetections = detectYears(cvText)
  const estimatedYears = getTotalYears(yearDetections)

  const results: RequirementResult[] = template.requirements.map(req =>
    analyzeRequirement(cvText, req)
  )

  return buildCheckResult(results, estimatedYears, cvText.length, startTime, 'keyword-v1')
}

export async function runEligibilityCheckWithAI(cvText: string, template: RoleTemplate): Promise<CheckResult> {
  const startTime = Date.now()
  const yearDetections = detectYears(cvText)
  const estimatedYears = getTotalYears(yearDetections)

  const keywordResults = template.requirements.map(req =>
    analyzeRequirement(cvText, req)
  )

  const aiResults = await Promise.allSettled(
    template.requirements.map(req => analyzeRequirementWithAI(cvText, req))
  )

  const results: RequirementResult[] = keywordResults.map((kwResult, i) => {
    const aiSettled = aiResults[i]
    if (aiSettled.status !== 'fulfilled') return kwResult

    const ai = aiSettled.value
    const mergedScore = Math.round(kwResult.score * 0.4 + ai.score * 0.6)
    const mergedConfidence = Math.min(0.99, kwResult.confidence * 0.3 + ai.confidence * 0.7)

    let mergedStatus: RequirementStatus
    if (kwResult.status === 'fail' && ai.status === 'pass') {
      mergedStatus = 'requires_review'
    } else if (kwResult.status === 'pass' && ai.status === 'fail') {
      mergedStatus = 'requires_review'
    } else {
      mergedStatus = ai.status
    }

    return {
      ...kwResult,
      score: mergedScore,
      confidence: mergedConfidence,
      status: mergedStatus,
      summary: ai.reasoning || kwResult.summary,
      ai,
    }
  })

  return buildCheckResult(results, estimatedYears, cvText.length, startTime, 'keyword+ai-v1')
}

function buildCheckResult(
  results: RequirementResult[],
  estimatedYears: number,
  cvLength: number,
  startTime: number,
  engineVersion: string,
): CheckResult {
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
      engineVersion,
      analyzedAt: new Date().toISOString(),
      cvLength,
      processingTimeMs: Date.now() - startTime,
    },
  }
}
