import type { AimlEntry, AimlItem, AimlState } from './types'

export function rowTotal(entry: AimlEntry, item: AimlItem): number {
  if (!entry.checked) return 0
  return (entry.baseQty + entry.extraQty) * item.prices[entry.size]
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

export function fmtCurrency(n: number): string {
  return '₪ ' + n.toLocaleString('he-IL')
}
