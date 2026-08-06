import { useEffect, useReducer, type Dispatch } from 'react'
import { AIML_ITEMS } from './data'
import type { AimlEntry, AimlPeriod, AimlQty, AimlSize, AimlState, AimlStep } from './types'

const STORAGE_KEY = 'aimlCalc:v5'

function emptyQty(): Record<AimlSize, AimlQty> {
  return { small: { base: 0, extra: 0 }, medium: { base: 0, extra: 0 }, large: { base: 0, extra: 0 } }
}

function defaultEntry(itemId: string): AimlEntry {
  const qty = emptyQty()
  qty.medium.base = 1
  return { itemId, checked: false, qty }
}

const SIZES: AimlSize[] = ['small', 'medium', 'large']

/**
 * Migrates entries from any older shape to per-size {base, extra}:
 * v3 — { size, baseQty, extraQty }; v4 — { qty: Record<size, number> }.
 */
export function normalizeEntries(raw: unknown): Record<string, AimlEntry> {
  const entries: Record<string, AimlEntry> = {}
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<
    string,
    { checked?: boolean; qty?: Record<AimlSize, number | Partial<AimlQty>>; size?: AimlSize; baseQty?: number; extraQty?: number }
  >
  AIML_ITEMS.forEach(item => {
    const e = src[item.id]
    if (!e) {
      entries[item.id] = defaultEntry(item.id)
      return
    }
    const qty = emptyQty()
    if (e.qty && typeof e.qty === 'object') {
      SIZES.forEach(sz => {
        const v = e.qty![sz]
        if (typeof v === 'number') {
          qty[sz] = { base: Math.max(0, v), extra: 0 } // v4: plain number per size
        } else if (v && typeof v === 'object') {
          qty[sz] = { base: Math.max(0, v.base ?? 0), extra: Math.max(0, v.extra ?? 0) }
        }
      })
    } else {
      // v3: single size + baseQty/extraQty
      const size: AimlSize = e.size && SIZES.includes(e.size) ? e.size : 'medium'
      qty[size] = { base: Math.max(0, e.baseQty ?? 1), extra: Math.max(0, e.extraQty ?? 0) }
    }
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
    budgetTarget: 0,
    calculationId: null,
  }
}

function loadFromStorage(): AimlState {
  try {
    // v5 first; fall back to older keys so in-flight work survives the upgrade
    const raw =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem('aimlCalc:v4') ??
      localStorage.getItem('aimlCalc:v3')
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
      budgetTarget: saved.budgetTarget ?? base.budgetTarget,
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
  | { type: 'SET_QTY'; payload: { itemId: string; size: AimlSize; field: keyof AimlQty; qty: number } }
  | { type: 'GO_STEP'; payload: AimlStep }
  | { type: 'TOGGLE_MATCHING' }
  | { type: 'SET_MATCHING_PCT'; payload: number }
  | { type: 'SET_RISK_PCT'; payload: number }
  | { type: 'SET_BUDGET_TARGET'; payload: number }
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
      // checking an item with zero quantities starts it at 1 medium base unit
      const totalQty = (['small', 'medium', 'large'] as AimlSize[])
        .reduce((sum, sz) => sum + e.qty[sz].base + e.qty[sz].extra, 0)
      const qty = checked && totalQty === 0 ? { ...e.qty, medium: { base: 1, extra: 0 } } : e.qty
      return { ...state, entries: { ...state.entries, [action.payload]: { ...e, checked, qty } } }
    }
    case 'SET_QTY': {
      const { itemId, size, field, qty: value } = action.payload
      const e = state.entries[itemId]
      if (!e) return state
      const sizeQty = { ...e.qty[size], [field]: Math.max(0, Math.floor(value)) }
      const qty = { ...e.qty, [size]: sizeQty }
      return { ...state, entries: { ...state.entries, [itemId]: { ...e, qty } } }
    }
    case 'GO_STEP':
      return { ...state, currentStep: action.payload }
    case 'TOGGLE_MATCHING':
      return { ...state, matchingOn: !state.matchingOn }
    case 'SET_MATCHING_PCT':
      return { ...state, matchingPct: Math.max(0, Math.min(100, action.payload)) }
    case 'SET_RISK_PCT':
      return { ...state, riskPct: Math.max(0, Math.min(100, action.payload)) }
    case 'SET_BUDGET_TARGET':
      return { ...state, budgetTarget: Math.max(0, action.payload) }
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
