import { describe, it, expect } from 'vitest'
import { calcRoleMonthlyCost, calcTotalCost, fmtCurrency } from '../../../modules/takam-calculator/calc'
import { ROLES_DATA } from '../../../modules/takam-calculator/data'

describe('calcRoleMonthlyCost', () => {
  it('returns 0 when role not found', () => {
    const result = calcRoleMonthlyCost({ id: 'NONE', level: 'b', scope: 100 }, ROLES_DATA, 1)
    expect(result).toBe(0)
  })

  it('returns 0 when level not in role rates', () => {
    // Role 1.1 has no level 'a'
    const result = calcRoleMonthlyCost({ id: '1.1', level: 'a', scope: 100 }, ROLES_DATA, 1)
    expect(result).toBe(0)
  })

  it('calculates full-time developer cost correctly', () => {
    // role 2.3 מפתח תוכנה, level b = 192, 100% scope = 180h, *1.17 VAT
    const result = calcRoleMonthlyCost({ id: '2.3', level: 'b', scope: 100 }, ROLES_DATA, 1)
    expect(result).toBe(Math.round(192 * 180 * 1.17))
  })

  it('calculates 50% scope correctly', () => {
    // scope 50% → 90 hours
    const result = calcRoleMonthlyCost({ id: '2.3', level: 'b', scope: 50 }, ROLES_DATA, 1)
    expect(result).toBe(Math.round(192 * 90 * 1.17))
  })

  it('uses customHours when provided, ignoring scope', () => {
    const result = calcRoleMonthlyCost({ id: '2.3', level: 'b', scope: 100, customHours: 100 }, ROLES_DATA, 1)
    expect(result).toBe(Math.round(192 * 100 * 1.17))
  })

  it('applies hoursMultiplier to non-custom hours', () => {
    const result = calcRoleMonthlyCost({ id: '2.3', level: 'b', scope: 100 }, ROLES_DATA, 1.5)
    const baseHours = Math.round(180 * 100 / 100)
    const adjustedHours = Math.round(baseHours * 1.5)
    expect(result).toBe(Math.round(192 * adjustedHours * 1.17))
  })
})

describe('calcTotalCost', () => {
  it('returns zeros for empty mix', () => {
    const result = calcTotalCost([], 12, false, 30, ROLES_DATA, 1)
    expect(result.gross).toBe(0)
    expect(result.net).toBe(0)
    expect(result.matching).toBe(0)
    expect(result.monthlyPerRole).toEqual([])
  })

  it('calculates gross = monthly * months', () => {
    const mix = [{ id: '2.3', level: 'b' as const, scope: 100 }]
    const monthly = Math.round(192 * 180 * 1.17)
    const result = calcTotalCost(mix, 12, false, 30, ROLES_DATA, 1)
    expect(result.gross).toBe(monthly * 12)
    expect(result.net).toBe(monthly * 12)
  })

  it('subtracts matching from gross', () => {
    const mix = [{ id: '2.3', level: 'b' as const, scope: 100 }]
    const monthly = Math.round(192 * 180 * 1.17)
    const gross = monthly * 12
    const result = calcTotalCost(mix, 12, true, 30, ROLES_DATA, 1)
    expect(result.matching).toBe(Math.round(gross * 0.30))
    expect(result.net).toBe(gross - Math.round(gross * 0.30))
  })
})

describe('fmtCurrency', () => {
  it('formats with Hebrew locale when compact=false', () => {
    expect(fmtCurrency(1234)).toContain('₪')
  })

  it('formats millions with M suffix', () => {
    expect(fmtCurrency(1_500_000, true)).toBe('₪1.5M')
  })

  it('formats thousands with K suffix', () => {
    expect(fmtCurrency(50_000, true)).toBe('₪50K')
  })

  it('formats small amounts without suffix', () => {
    expect(fmtCurrency(500, true)).toContain('₪')
    expect(fmtCurrency(500, true)).not.toContain('K')
  })
})
