import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { CalcState, MixEntry } from './types'
import { calcTotalCost } from './calc'

export interface SavedCalculation {
  id: string
  name: string
  ministry: string
  period: number
  matching_on: boolean
  matching_pct: number
  risk_pct: number
  hours_multiplier: number
  mix: MixEntry[]
  grand_total: number
  created_at: string
  updated_at: string
}

export interface ShareRecord {
  id: string
  calculation_id: string
  permission: 'view' | 'edit'
  token: string
  created_at: string
}

export function useCalculationHistory(userId: string | undefined) {
  const [calculations, setCalculations] = useState<SavedCalculation[]>([])
  const [loading, setLoading] = useState(false)

  const fetchCalculations = useCallback(async () => {
    if (!userId) { setCalculations([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('calculations')
      .select('*')
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false })
    setCalculations((data as SavedCalculation[]) ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchCalculations() }, [fetchCalculations])

  async function saveCalculation(state: CalcState): Promise<string | null> {
    if (!userId) return null
    const { net } = calcTotalCost(state.mix, state.period, state.matchingOn, state.matchingPct, state.rolesData, state.hoursMultiplier)
    const riskAmt = Math.round(net * state.riskPct / 100)
    const manpowerTotal = net + riskAmt
    const overhead = Math.round(manpowerTotal * 0.10)
    const contingency = Math.round((manpowerTotal + overhead) * 0.05)
    const subtotal = manpowerTotal + overhead + contingency
    const vat = Math.round(subtotal * 0.17)
    const grandTotal = subtotal + vat

    const row = {
      owner_id: userId,
      name: state.project.name,
      ministry: state.project.ministry,
      period: state.period,
      matching_on: state.matchingOn,
      matching_pct: state.matchingPct,
      risk_pct: state.riskPct,
      hours_multiplier: state.hoursMultiplier,
      mix: state.mix.map(m => ({ id: m.id, level: m.level, scope: m.scope, customHours: m.customHours })),
      grand_total: grandTotal,
    }

    if (state.calculationId) {
      const { error } = await supabase
        .from('calculations')
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq('id', state.calculationId)
      if (error) return null
      await fetchCalculations()
      return state.calculationId
    } else {
      const { data, error } = await supabase
        .from('calculations')
        .insert(row)
        .select('id')
        .single()
      if (error || !data) return null
      await fetchCalculations()
      return data.id
    }
  }

  async function deleteCalculation(id: string) {
    await supabase.from('calculations').delete().eq('id', id)
    await fetchCalculations()
  }

  async function createShare(calculationId: string, permission: 'view' | 'edit'): Promise<string | null> {
    const { data, error } = await supabase
      .from('calculation_shares')
      .insert({ calculation_id: calculationId, permission, shared_with: null })
      .select('token')
      .single()
    if (error || !data) return null
    return data.token
  }

  async function loadByToken(token: string): Promise<{ calculation: SavedCalculation; permission: 'view' | 'edit' } | null> {
    const { data, error } = await supabase.rpc('get_calculation_by_token', { share_token: token })
    if (error || !data) return null
    return {
      calculation: data.calculation as SavedCalculation,
      permission: data.permission as 'view' | 'edit',
    }
  }

  return {
    calculations,
    loading,
    saveCalculation,
    deleteCalculation,
    createShare,
    loadByToken,
    refresh: fetchCalculations,
  }
}
