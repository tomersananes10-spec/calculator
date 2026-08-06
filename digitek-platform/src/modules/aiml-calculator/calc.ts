import type { AimlEntry, AimlItem, AimlSize, AimlState } from './types'

export const VAT_RATE = 0.18

export const AIML_SIZES: AimlSize[] = ['small', 'medium', 'large']

export function entryTotalQty(entry: AimlEntry): number {
  return AIML_SIZES.reduce((sum, sz) => sum + (entry.qty[sz] || 0), 0)
}

export function rowTotal(entry: AimlEntry, item: AimlItem): number {
  if (!entry.checked) return 0
  return AIML_SIZES.reduce((sum, sz) => sum + (entry.qty[sz] || 0) * item.prices[sz], 0)
}

export function grandTotal(state: AimlState, items: AimlItem[]): number {
  return items.reduce((sum, item) => {
    const entry = state.entries[item.id]
    return entry ? sum + rowTotal(entry, item) : sum
  }, 0)
}

export function countSelected(state: AimlState): number {
  return Object.values(state.entries).filter(e => e.checked).length
}

export interface AimlBreakdown {
  subtotal: number
  matchingDelta: number
  riskDelta: number
  beforeVat: number
  vat: number
  withVat: number
  perMonth: number
}

export function computeBreakdown(state: AimlState, items: AimlItem[]): AimlBreakdown {
  const subtotal = grandTotal(state, items)
  const matchingDelta = state.matchingOn ? subtotal * (state.matchingPct / 100) : 0
  const riskDelta = (subtotal + matchingDelta) * (state.riskPct / 100)
  const beforeVat = subtotal + matchingDelta + riskDelta
  const vat = beforeVat * VAT_RATE
  const withVat = beforeVat + vat
  const perMonth = state.period > 0 ? beforeVat / state.period : 0
  return { subtotal, matchingDelta, riskDelta, beforeVat, vat, withVat, perMonth }
}

export function fmtCurrency(n: number): string {
  return '₪ ' + Math.round(n).toLocaleString('he-IL')
}
