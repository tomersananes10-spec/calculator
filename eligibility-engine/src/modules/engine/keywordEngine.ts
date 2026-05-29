import type { Requirement, KeywordMatch, YearDetection, RequirementResult, RequirementStatus } from './types'

const FINAL_LETTER_MAP: Record<string, string> = {
  'ם': 'מ', 'ן': 'נ', 'ץ': 'צ', 'ך': 'כ', 'ף': 'פ',
}

function normalizeHebrew(text: string): string {
  let result = text.replace(/[֑-ׇ]/g, '')
  for (const [final, regular] of Object.entries(FINAL_LETTER_MAP)) {
    result = result.replaceAll(final, regular)
  }
  return result.toLowerCase()
}

function extractContext(text: string, position: number, radius = 60): string {
  const start = Math.max(0, position - radius)
  const end = Math.min(text.length, position + radius)
  let ctx = text.slice(start, end).trim()
  if (start > 0) ctx = '...' + ctx
  if (end < text.length) ctx = ctx + '...'
  return ctx
}

export function findKeywords(text: string, keywords: string[]): KeywordMatch[] {
  const normalized = normalizeHebrew(text)
  return keywords.map(keyword => {
    const normalizedKw = normalizeHebrew(keyword)
    const position = normalized.indexOf(normalizedKw)
    return {
      keyword,
      found: position !== -1,
      context: position !== -1 ? extractContext(text, position) : '',
      position,
    }
  })
}

export function detectYears(text: string): YearDetection[] {
  const detections: YearDetection[] = []
  const currentYear = new Date().getFullYear()

  const rangePattern = /(20\d{2})\s*[-–—]\s*(20\d{2}|היום|כיום|הווה|present)/gi
  for (const match of text.matchAll(rangePattern)) {
    const startYear = Number(match[1])
    const endYear = /היום|כיום|הווה|present/i.test(match[2]) ? currentYear : Number(match[2])
    if (endYear >= startYear && endYear <= currentYear + 1) {
      detections.push({
        raw: match[0],
        years: endYear - startYear,
        startYear,
        endYear,
        confidence: 0.9,
      })
    }
  }

  const directPattern = /(\d{1,2})\s*\+?\s*(שנות|שנים|שנת)\s*(ניסיון|ניהול|עבודה|ותק)/g
  for (const match of text.matchAll(directPattern)) {
    const years = Number(match[1])
    if (years > 0 && years <= 50) {
      detections.push({
        raw: match[0],
        years,
        confidence: 0.75,
      })
    }
  }

  const reversePattern = /ניסיון\s*(של\s*)?(\d{1,2})\s*(שנ|שנות|שנים)/g
  for (const match of text.matchAll(reversePattern)) {
    const years = Number(match[2])
    if (years > 0 && years <= 50) {
      detections.push({
        raw: match[0],
        years,
        confidence: 0.75,
      })
    }
  }

  return detections
}

export function getTotalYears(detections: YearDetection[]): number {
  const rangeDetections = detections.filter(d => d.startYear !== undefined)
  if (rangeDetections.length > 0) {
    return rangeDetections.reduce((sum, d) => sum + d.years, 0)
  }
  const directDetections = detections.filter(d => d.startYear === undefined)
  if (directDetections.length > 0) {
    return Math.max(...directDetections.map(d => d.years))
  }
  return 0
}

function determineStatus(score: number, minScore: number): RequirementStatus {
  if (score >= minScore) {
    return score <= minScore * 1.3 ? 'requires_review' : 'pass'
  }
  return score >= minScore * 0.7 ? 'requires_review' : 'fail'
}

export function analyzeRequirement(text: string, requirement: Requirement): RequirementResult {
  const keywordMatches = findKeywords(text, requirement.keywords)
  const yearDetections = detectYears(text)
  const totalYears = getTotalYears(yearDetections)

  const matchedCount = keywordMatches.filter(m => m.found).length
  const totalKeywords = requirement.keywords.length
  let keywordScore = totalKeywords > 0 ? (matchedCount / totalKeywords) * 100 : 0

  if (requirement.minYears && totalYears >= requirement.minYears) {
    keywordScore = Math.min(100, keywordScore + 15)
  }
  if (requirement.yearsByTrack && totalYears >= requirement.yearsByTrack.bachelor) {
    keywordScore = Math.min(100, keywordScore + 15)
  }

  const score = Math.round(keywordScore)
  const status = determineStatus(score, requirement.minScore)

  const confidence = Math.min(0.98, 0.5 + (matchedCount * 0.08) + (totalYears > 3 ? 0.1 : 0))

  const matchedKeywords = keywordMatches.filter(m => m.found).map(m => m.keyword)
  let summary: string
  if (matchedKeywords.length === 0) {
    summary = 'לא אותרו אינדיקציות ברורות במסמכים שהוזנו'
  } else {
    summary = `נמצאו ${matchedCount}/${totalKeywords} מילות מפתח`
    if (totalYears > 0) {
      summary += `, זוהו ${totalYears} שנות ניסיון`
    }
  }

  return {
    requirementId: requirement.id,
    requirement,
    status,
    score,
    confidence,
    keywordMatches,
    yearDetections,
    keywordScore: score,
    summary,
  }
}
