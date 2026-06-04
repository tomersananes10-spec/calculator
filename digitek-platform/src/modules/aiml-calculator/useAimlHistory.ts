import { useCallback, useEffect, useState } from 'react'
import { AIML_ITEMS } from './data'
import { grandTotal } from './calc'
import type { AimlState, SavedAimlCalculation } from './types'

const STORAGE_KEY = 'aimlHistory:v1'

function readAll(): SavedAimlCalculation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as SavedAimlCalculation[]
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function writeAll(items: SavedAimlCalculation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* ignore quota */
  }
}

function newId(): string {
  return 'aiml_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
}

export function useAimlHistory() {
  const [calculations, setCalculations] = useState<SavedAimlCalculation[]>([])

  useEffect(() => {
    setCalculations(readAll())
  }, [])

  const refresh = useCallback(() => {
    setCalculations(readAll())
  }, [])

  const saveCalculation = useCallback((state: AimlState): string => {
    const all = readAll()
    const now = Date.now()
    const grand = grandTotal(state, AIML_ITEMS)
    const existing = state.calculationId ? all.find(c => c.id === state.calculationId) : undefined

    if (existing) {
      const updated: SavedAimlCalculation = {
        ...existing,
        name: state.project.name || 'ללא שם',
        ministry: state.project.ministry || '',
        period: state.period,
        entries: state.entries,
        matchingOn: state.matchingOn,
        matchingPct: state.matchingPct,
        riskPct: state.riskPct,
        grandTotal: grand,
        updatedAt: now,
      }
      const next = all.map(c => (c.id === existing.id ? updated : c))
      writeAll(next)
      setCalculations(next)
      return existing.id
    }

    const id = newId()
    const created: SavedAimlCalculation = {
      id,
      name: state.project.name || 'ללא שם',
      ministry: state.project.ministry || '',
      period: state.period,
      entries: state.entries,
      matchingOn: state.matchingOn,
      matchingPct: state.matchingPct,
      riskPct: state.riskPct,
      grandTotal: grand,
      createdAt: now,
      updatedAt: now,
    }
    const next = [created, ...all]
    writeAll(next)
    setCalculations(next)
    return id
  }, [])

  const deleteCalculation = useCallback((id: string) => {
    const next = readAll().filter(c => c.id !== id)
    writeAll(next)
    setCalculations(next)
  }, [])

  return { calculations, refresh, saveCalculation, deleteCalculation }
}
