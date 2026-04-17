import { useReducer } from 'react'
import { ROLES_DATA } from './data'
import type { CalcState, CalcAction, Level } from './types'

export const INITIAL_STATE: CalcState = {
  project: { name: '', ministry: '' },
  period: 12,
  matchingOn: true,
  matchingPct: 30,
  selectedIds: new Set(),
  mix: [],
  hoursMultiplier: 1,
  riskPct: 18,
  currentStep: 1,
  rolesData: ROLES_DATA,
  aiNeedsFill: false,
  viewOnly: false,
}

function reducer(state: CalcState, action: CalcAction): CalcState {
  switch (action.type) {
    case 'SET_PROJECT':
      return { ...state, project: action.payload }
    case 'SET_PERIOD':
      return { ...state, period: action.payload }
    case 'TOGGLE_MATCHING':
      return { ...state, matchingOn: !state.matchingOn }
    case 'SET_MATCHING_PCT':
      return { ...state, matchingPct: action.payload }
    case 'TOGGLE_ROLE': {
      const id = action.payload
      const newIds = new Set(state.selectedIds)
      if (newIds.has(id)) {
        newIds.delete(id)
        return {
          ...state,
          selectedIds: newIds,
          mix: state.mix.filter(m => m.id !== id),
        }
      } else {
        newIds.add(id)
        const role = state.rolesData.find(r => r.id === id)
        const defaultLevel = (Object.keys(role?.rates ?? {})[0] ?? 'b') as Level
        return {
          ...state,
          selectedIds: newIds,
          mix: [...state.mix, { id, level: defaultLevel, scope: 100 }],
        }
      }
    }
    case 'SET_LEVEL': {
      const mix = state.mix.map((m, i) =>
        i === action.payload.index ? { ...m, level: action.payload.level } : m
      )
      return { ...state, mix }
    }
    case 'SET_SCOPE': {
      const mix = state.mix.map((m, i) =>
        i === action.payload.index ? { ...m, scope: action.payload.scope } : m
      )
      return { ...state, mix }
    }
    case 'SET_CUSTOM_HOURS': {
      const mix = state.mix.map((m, i) =>
        i === action.payload.index ? { ...m, customHours: action.payload.hours } : m
      )
      return { ...state, mix }
    }
    case 'REMOVE_ROLE': {
      const newIds = new Set(state.selectedIds)
      newIds.delete(action.payload)
      return {
        ...state,
        selectedIds: newIds,
        mix: state.mix.filter(m => m.id !== action.payload),
      }
    }
    case 'SET_HOURS_MULTIPLIER':
      return { ...state, hoursMultiplier: action.payload }
    case 'SET_RISK_PCT':
      return { ...state, riskPct: action.payload }
    case 'GO_STEP':
      return { ...state, currentStep: action.payload }
    case 'ADD_CUSTOM_ROLE':
      return { ...state, rolesData: [...state.rolesData, action.payload] }
    case 'ADD_AI_ROLE': {
      const { id, level, scope } = action.payload
      const newIds = new Set(state.selectedIds)
      if (newIds.has(id)) {
        // update existing entry
        return {
          ...state,
          mix: state.mix.map(m => m.id === id ? { ...m, level, scope } : m),
        }
      }
      newIds.add(id)
      return {
        ...state,
        selectedIds: newIds,
        mix: [...state.mix, { id, level, scope }],
      }
    }
    case 'SET_AI_NEEDS_FILL':
      return { ...state, aiNeedsFill: action.payload }
    case 'SET_VIEW_ONLY':
      return { ...state, viewOnly: action.payload }
    case 'RESET':
      return { ...INITIAL_STATE, rolesData: ROLES_DATA }
    default:
      return state
  }
}

export function useCalculator() {
  return useReducer(reducer, INITIAL_STATE)
}
