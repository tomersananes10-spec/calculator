import { HOURS_PER_MONTH, VAT } from './data'
import type { MixEntry, Role } from './types'

export function calcRoleMonthlyCost(
  mixEntry: MixEntry,
  rolesData: Role[],
  hoursMultiplier: number
): number {
  const role = rolesData.find(r => r.id === mixEntry.id)
  if (!role) return 0
  const rate = role.rates[mixEntry.level]
  if (!rate) return 0
  const base = mixEntry.customHours ?? Math.round(HOURS_PER_MONTH * mixEntry.scope / 100)
  const hours = mixEntry.customHours ? base : Math.round(base * hoursMultiplier)
  return Math.round(rate * hours * VAT)
}

export function calcTotalCost(
  mix: MixEntry[],
  months: number,
  matchingOn: boolean,
  matchingPct: number,
  rolesData: Role[],
  hoursMultiplier: number
) {
  const monthlyPerRole = mix.map(m => calcRoleMonthlyCost(m, rolesData, hoursMultiplier))
  const grossMonthly = monthlyPerRole.reduce((s, v) => s + v, 0)
  const gross = grossMonthly * months
  const matching = matchingOn ? Math.round(gross * matchingPct / 100) : 0
  const net = gross - matching
  return { gross, matching, net, monthlyPerRole }
}

export function fmtCurrency(n: number, compact = false): string {
  if (compact) {
    if (n >= 1_000_000) return '₪' + (n / 1_000_000).toFixed(1) + 'M'
    if (n >= 1_000) return '₪' + Math.round(n / 1_000) + 'K'
  }
  return '₪' + n.toLocaleString('he-IL')
}
