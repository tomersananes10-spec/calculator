// רשימת הליכים שלי + סינון

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import type { Tender, TenderStage } from '../types'

export interface TenderListFilters {
  stage?: TenderStage | 'all'
  search?: string
}

export interface UseTenderListResult {
  tenders: Tender[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useTenderList(filters: TenderListFilters = {}): UseTenderListResult {
  const [tenders, setTenders] = useState<Tender[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    let query = supabase
      .from('tenders')
      .select('*')
      .order('updated_at', { ascending: false })

    if (filters.stage && filters.stage !== 'all') {
      query = query.eq('current_stage', filters.stage)
    }
    if (filters.search) {
      query = query.ilike('title', `%${filters.search}%`)
    }

    const { data, error: err } = await query
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    setTenders((data ?? []) as Tender[])
    setLoading(false)
  }, [filters.stage, filters.search])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { tenders, loading, error, refresh }
}
