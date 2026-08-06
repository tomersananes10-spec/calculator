export type AimlSize = 'small' | 'medium' | 'large'
export type AimlStep = 1 | 2 | 3 | 4
export type AimlPeriod = 6 | 12 | 24

export interface AimlItem {
  id: string
  icon: string
  name: string
  prices: Record<AimlSize, number>
  scope: Record<AimlSize, string>
}

export interface AimlQty {
  base: number
  extra: number
}

export interface AimlEntry {
  itemId: string
  checked: boolean
  qty: Record<AimlSize, AimlQty>
}

export interface AimlState {
  project: { name: string; ministry: string }
  entries: Record<string, AimlEntry>
  currentStep: AimlStep
  period: AimlPeriod
  matchingOn: boolean
  matchingPct: number
  riskPct: number
  budgetTarget: number
  calculationId: string | null
}

export interface SavedAimlCalculation {
  id: string
  name: string
  ministry: string
  period: AimlPeriod
  entries: Record<string, AimlEntry>
  matchingOn: boolean
  matchingPct: number
  riskPct: number
  budgetTarget?: number
  grandTotal: number
  createdAt: number
  updatedAt: number
}
