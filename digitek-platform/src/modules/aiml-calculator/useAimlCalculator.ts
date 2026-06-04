import { useEffect, useReducer } from 'react'
import { AIML_ITEMS } from './data'
import type { AimlEntry, AimlSize, AimlState } from './types'

const STORAGE_KEY = 'aimlCalc:v1'

function initialState(): AimlState {
  const entries: Record<string, AimlEntry> = {}
  AIML_ITEMS.forEach(item => {
    entries[item.id] = { itemId: item.id, checked: false, size: 'medium', baseQty: 1, extraQty: 0 }
  })
  return { project: { name: '', ministry: '' }, entries }
}

function loadFromStorage(): AimlState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState()
    const saved = JSON.parse(raw) as Partial<AimlState>
    const base = initialState()
    return {
      project: { ...base.project, ...(saved.project || {}) },
      entries: { ...base.entries, ...(saved.entries || {}) },
    }
  } catch {
    return initialState()
  }
}

type Action =
  | { type: 'SET_PROJECT_NAME'; payload: string }
  | { type: 'SET_MINISTRY'; payload: string }
  | { type: 'TOGGLE_CHECK'; payload: string }
  | { type: 'SET_SIZE'; payload: { itemId: string; size: AimlSize } }
  | { type: 'SET_BASE_QTY'; payload: { itemId: string; qty: number } }
  | { type: 'SET_EXTRA_QTY'; payload: { itemId: string; qty: number } }
  | { type: 'RESET' }

function reducer(state: AimlState, action: Action): AimlState {
  switch (action.type) {
    case 'SET_PROJECT_NAME':
      return { ...state, project: { ...state.project, name: action.payload } }
    case 'SET_MINISTRY':
      return { ...state, project: { ...state.project, ministry: action.payload } }
    case 'TOGGLE_CHECK': {
      const e = state.entries[action.payload]
      if (!e) return state
      return { ...state, entries: { ...state.entries, [action.payload]: { ...e, checked: !e.checked } } }
    }
    case 'SET_SIZE': {
      const e = state.entries[action.payload.itemId]
      if (!e) return state
      return { ...state, entries: { ...state.entries, [action.payload.itemId]: { ...e, size: action.payload.size, checked: true } } }
    }
    case 'SET_BASE_QTY': {
      const e = state.entries[action.payload.itemId]
      if (!e) return state
      return { ...state, entries: { ...state.entries, [action.payload.itemId]: { ...e, baseQty: Math.max(0, action.payload.qty) } } }
    }
    case 'SET_EXTRA_QTY': {
      const e = state.entries[action.payload.itemId]
      if (!e) return state
      return { ...state, entries: { ...state.entries, [action.payload.itemId]: { ...e, extraQty: Math.max(0, action.payload.qty) } } }
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
