import { useEffect, useReducer, type Dispatch } from 'react'
import { AIML_ITEMS } from './data'
import type { AimlEntry, AimlPeriod, AimlSize, AimlState, AimlStep } from './types'

const STORAGE_KEY = 'aimlCalc:v4'

function emptyQty(): Record<AimlSize, number> {
  return { small: 0, medium: 0, large: 0 }
}

function defaultEntry(itemId: string): AimlEntry {
  return { itemId, checked: false, qty: { small: 0, medium: 1, large: 0 } }
}

/** Migrates entries from the pre-v4 shape ({ size, baseQty, extraQty }) to per-size qty. */
export function normalizeEntries(raw: unknown): Record<string, AimlEntry> {
  const entries: Record<string, AimlEntry> = {}
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, Partial<AimlEntry> & { size?: AimlSize; baseQty?: number; extraQty?: number }>
  AIML_ITEMS.forEach(item => {
    const e = src[item.id]
    if (!e) {
      entries[item.id] = defaultEntry(item.id)
      return
    }
    if (e.qty && typeof e.qty === 'object') {
      entries[item.id] = {
        itemId: item.id,
        checked: !!e.checked,
        qty: { ...emptyQty(), ...e.qty },
      }
      return
    }
    // legacy shape — collapse baseQty+extraQty into the single chosen size
    const size: AimlSize = e.size && ['small', 'medium', 'large'].includes(e.size) ? e.size : 'medium'
    const total = Math.max(0, (e.baseQty ?? 1) + (e.extraQty ?? 0))
    const qty = emptyQty()
    qty[size] = total
    entries[item.id] = { itemId: item.id, checked: !!e.checked, qty }
  })
  return entries
}

function initialState(): AimlState {
  const entries: Record<string, AimlEntry> = {}
  AIML_ITEMS.forEach(item => {
    entries[item.id] = defaultEntry(item.id)
  })
  return {
    project: { name: '', ministry: '' },
    entries,
    currentStep: 1,
    period: 12,
    matchingOn: false,
    matchingPct: 10,
    riskPct: 0,
    calculationId: null,
  }
}

function loadFromStorage(): AimlState {
  try {
    // v4 first; fall back to the old v3 key so in-flight work survives the upgrade
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('aimlCalc:v3')
    if (!raw) return initialState()
    const saved = JSON.parse(raw) as Partial<AimlState>
    const base = initialState()
    return {
      project: { ...base.project, ...(saved.project || {}) },
      entries: normalizeEntries(saved.entries),
      currentStep: 1,
      period: (saved.period as AimlPeriod) ?? base.period,
      matchingOn: saved.matchingOn ?? base.matchingOn,
      matchingPct: saved.matchingPct ?? base.matchingPct,
      riskPct: saved.riskPct ?? base.riskPct,
      calculationId: saved.calculationId ?? base.calculationId,
    }
  } catch {
    return initialState()
  }
}

export type AimlAction =
  | { type: 'SET_PROJECT_NAME'; payload: string }
  | { type: 'SET_MINISTRY'; payload: string }
  | { type: 'SET_PERIOD'; payload: AimlPeriod }
  | { type: 'TOGGLE_CHECK'; payload: string }
  | { type: 'SET_QTY'; payload: { itemId: string; size: AimlSize; qty: number } }
  | { type: 'GO_STEP'; payload: AimlStep }
  | { type: 'TOGGLE_MATCHING' }
  | { type: 'SET_MATCHING_PCT'; payload: number }
  | { type: 'SET_RISK_PCT'; payload: number }
  | { type: 'SET_CALC_ID'; payload: string | null }
  | { type: 'LOAD'; payload: Omit<AimlState, 'currentStep'> & { currentStep?: AimlStep } }
  | { type: 'RESET' }

function reducer(state: AimlState, action: AimlAction): AimlState {
  switch (action.type) {
    case 'SET_PROJECT_NAME':
      return { ...state, project: { ...state.project, name: action.payload } }
    case 'SET_MINISTRY':
      return { ...state, project: { ...state.project, ministry: action.payload } }
    case 'SET_PERIOD':
      return { ...state, period: action.payload }
    case 'TOGGLE_CHECK': {
      const e = state.entries[action.payload]
      if (!e) return state
      const checked = !e.checked
      // checking an item with zero quantities starts it at 1 medium unit
      const totalQty = e.qty.small + e.qty.medium + e.qty.large
      const qty = checked && totalQty === 0 ? { ...e.qty, medium: 1 } : e.qty
      return { ...state, entries: { ...state.entries, [action.payload]: { ...e, checked, qty } } }
    }
    case 'SET_QTY': {
      const e = state.entries[action.payload.itemId]
      if (!e) return state
      const qty = { ...e.qty, [action.payload.size]: Math.max(0, Math.floor(action.payload.qty)) }
      return { ...state, entries: { ...state.entries, [action.payload.itemId]: { ...e, qty } } }
    }
    case 'GO_STEP':
      return { ...state, currentStep: action.payload }
    case 'TOGGLE_MATCHING':
      return { ...state, matchingOn: !state.matchingOn }
    case 'SET_MATCHING_PCT':
      return { ...state, matchingPct: Math.max(0, Math.min(100, action.payload)) }
    case 'SET_RISK_PCT':
      return { ...state, riskPct: Math.max(0, Math.min(100, action.payload)) }
    case 'SET_CALC_ID':
      return { ...state, calculationId: action.payload }
    case 'LOAD':
      return {
        ...action.payload,
        entries: normalizeEntries(action.payload.entries),
        currentStep: action.payload.currentStep ?? 4,
      }
    case 'RESET':
      return initialState()
  }
}

export function useAimlCalculator() {
  const [state, dispatch] = useReducer(reducer, undefined, loadFromStorage)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* localStorage quota or disabled — skip persistence */
    }
  }, [state])

  return [state, dispatch] as const
}

export type AimlDispatch = Dispatch<AimlAction>
