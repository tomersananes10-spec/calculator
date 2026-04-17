export type Level = 'a' | 'b' | 'c' | 'd'

export interface Role {
  id: string
  name: string
  cat: string
  rates: Partial<Record<Level, number>>
  desc: string
  custom?: boolean
}

export interface MixEntry {
  id: string
  level: Level
  scope: number
  customHours?: number
}

export interface ProjectInfo {
  name: string
  ministry: string
}

export interface CalcState {
  project: ProjectInfo
  period: 6 | 12 | 24
  matchingOn: boolean
  matchingPct: number
  selectedIds: Set<string>
  mix: MixEntry[]
  hoursMultiplier: number
  riskPct: number
  currentStep: 1 | 2 | 3 | 4
  rolesData: Role[]
  aiNeedsFill: boolean
}

export type CalcAction =
  | { type: 'SET_PROJECT'; payload: ProjectInfo }
  | { type: 'SET_PERIOD'; payload: 6 | 12 | 24 }
  | { type: 'TOGGLE_MATCHING' }
  | { type: 'SET_MATCHING_PCT'; payload: number }
  | { type: 'TOGGLE_ROLE'; payload: string }
  | { type: 'SET_MIX'; payload: MixEntry[] }
  | { type: 'SET_LEVEL'; payload: { index: number; level: Level } }
  | { type: 'SET_SCOPE'; payload: { index: number; scope: number } }
  | { type: 'SET_CUSTOM_HOURS'; payload: { index: number; hours: number | undefined } }
  | { type: 'REMOVE_ROLE'; payload: string }
  | { type: 'SET_HOURS_MULTIPLIER'; payload: number }
  | { type: 'SET_RISK_PCT'; payload: number }
  | { type: 'GO_STEP'; payload: 1 | 2 | 3 | 4 }
  | { type: 'ADD_CUSTOM_ROLE'; payload: Role }
  | { type: 'ADD_AI_ROLE'; payload: { id: string; level: Level; scope: number } }
  | { type: 'SET_AI_NEEDS_FILL'; payload: boolean }
  | { type: 'RESET' }
